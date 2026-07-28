import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { db } from '../lib/firebase'
import { createHousehold, joinHousehold } from '../lib/householdService'
import { subscribeDocWithRetry } from '../lib/subscribeWithRetry'
import type { Household } from '../types'
import { useAuth } from './AuthContext'

interface HouseholdContextValue {
  loading: boolean
  household: Household | null
  myNickname: string
  partnerUid: string | null
  create: (nickname: string) => Promise<void>
  join: (code: string, nickname: string) => Promise<void>
  setTargetRatio: (uid: string, percent: number) => Promise<void>
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null)

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [loading, setLoading] = useState(true)
  const everHadHouseholdId = useRef(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        const id = snap.exists() ? (snap.data().householdId as string | undefined) : undefined
        if (id) {
          everHadHouseholdId.current = true
          setHouseholdId(id)
          return
        }
        // The Firestore Watch stream (emulator and, occasionally, prod) can
        // redeliver a spurious "not found" for an unrelated doc when a
        // sibling listener target is added/removed on the same connection.
        // Users docs are never deleted, so once we've seen a real
        // householdId, ignore a later "not found" for this same doc.
        if (!everHadHouseholdId.current) {
          setHouseholdId(null)
          setLoading(false)
        }
      },
      (err) => {
        console.error('failed to watch user doc', err)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [user])

  useEffect(() => {
    if (!householdId) {
      setHousehold(null)
      return
    }
    const unsubscribe = subscribeDocWithRetry(doc(db, 'households', householdId), (snap) => {
      // Households are never deleted (see firestore.rules), so a
      // momentary "not found" here is just this client's own just-created
      // household doc not having synced from the server yet — keep
      // whatever we last had instead of bouncing the UI back to onboarding.
      if (snap.exists()) {
        setHousehold({ id: snap.id, ...snap.data() } as Household)
        setLoading(false)
      }
    })
    return unsubscribe
  }, [householdId])

  async function create(nickname: string) {
    if (!user) return
    await createHousehold(user.uid, nickname)
  }

  async function join(code: string, nickname: string) {
    if (!user) return
    await joinHousehold(user.uid, code, nickname)
  }

  async function setTargetRatio(uid: string, percent: number) {
    if (!household) return
    const other = household.members.find((m) => m !== uid)
    const next: Record<string, number> = { [uid]: percent }
    if (other) next[other] = 100 - percent
    await updateDoc(doc(db, 'households', household.id), { targetRatio: next })
  }

  const partnerUid = household && user ? household.members.find((m) => m !== user.uid) ?? null : null
  const myNickname = household && user ? household.nicknames?.[user.uid] ?? '' : ''

  return (
    <HouseholdContext.Provider
      value={{ loading, household, myNickname, partnerUid, create, join, setTargetRatio }}
    >
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider')
  return ctx
}
