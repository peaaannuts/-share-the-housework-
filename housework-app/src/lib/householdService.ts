import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { CHORE_PRESETS } from '../data/chorePresets'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid confusion

function generateInviteCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

export async function createHousehold(uid: string, nickname: string): Promise<string> {
  const householdRef = doc(collection(db, 'households'))
  const inviteCode = generateInviteCode()

  // A plain batch (not a transaction): the chores subcollection rule checks
  // membership on the household doc via get(), and Firestore only resolves
  // cross-document get() calls within a transaction against the
  // pre-transaction state — so writing the household doc and its chores in
  // the same transaction would deny the chores write. A batch's per-write
  // rule evaluation doesn't have that restriction.
  const batch = writeBatch(db)
  batch.set(householdRef, {
    members: [uid],
    nicknames: { [uid]: nickname },
    inviteCode,
    targetRatio: { [uid]: 50 },
    createdAt: serverTimestamp(),
    createdBy: uid,
  })
  batch.set(doc(db, 'inviteCodes', inviteCode), {
    householdId: householdRef.id,
    createdAt: serverTimestamp(),
  })
  batch.set(doc(db, 'users', uid), {
    householdId: householdRef.id,
    nickname,
  })
  CHORE_PRESETS.forEach((preset, index) => {
    const choreRef = doc(collection(db, 'households', householdRef.id, 'chores'))
    batch.set(choreRef, {
      ...preset,
      order: index,
      createdAt: serverTimestamp(),
    })
  })

  await batch.commit()
  return householdRef.id
}

export async function joinHousehold(
  uid: string,
  rawCode: string,
  nickname: string,
): Promise<string> {
  const code = rawCode.trim().toUpperCase()
  const inviteSnap = await getDoc(doc(db, 'inviteCodes', code))
  if (!inviteSnap.exists()) {
    throw new Error('招待コードが見つかりませんでした。もう一度確認してください。')
  }
  const householdId = inviteSnap.data().householdId as string
  const householdRef = doc(db, 'households', householdId)

  await runTransaction(db, async (tx) => {
    const householdSnap = await tx.get(householdRef)
    if (!householdSnap.exists()) {
      throw new Error('世帯が見つかりませんでした。')
    }
    const data = householdSnap.data()
    const members: string[] = data.members ?? []
    if (members.includes(uid)) {
      return // already a member; nothing to do
    }
    if (members.length >= 2) {
      throw new Error('この世帯にはすでに2人参加しています。')
    }
    const nextTargetRatio = { ...(data.targetRatio ?? {}) }
    const existingUid = members[0]
    if (existingUid) {
      nextTargetRatio[existingUid] = nextTargetRatio[existingUid] ?? 50
    }
    nextTargetRatio[uid] = 100 - (nextTargetRatio[existingUid] ?? 50)

    tx.update(householdRef, {
      members: arrayUnion(uid),
      [`nicknames.${uid}`]: nickname,
      targetRatio: nextTargetRatio,
    })
  })

  await setDoc(doc(db, 'users', uid), { householdId, nickname })
  return householdId
}
