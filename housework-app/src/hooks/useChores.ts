import { orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { choresCollection } from '../lib/choreService'
import { subscribeWithRetry } from '../lib/subscribeWithRetry'
import type { Chore } from '../types'

export function useChores(householdId: string | null) {
  const [chores, setChores] = useState<Chore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) {
      setChores([])
      return
    }
    setLoading(true)
    const q = query(choresCollection(householdId), orderBy('order', 'asc'))
    const unsubscribe = subscribeWithRetry(q, (snap) => {
      setChores(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Chore))
      setLoading(false)
    })
    return unsubscribe
  }, [householdId])

  return { chores, loading }
}
