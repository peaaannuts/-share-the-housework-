import {
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type FirestoreError,
  type Query,
  type Unsubscribe,
} from 'firebase/firestore'

const DEFAULT_RETRIES = 8
const DEFAULT_DELAY_MS = 500

/**
 * Wraps onSnapshot with a few retries on 'permission-denied'.
 *
 * Household creation writes several documents in one batch. The local cache
 * echoes them optimistically before the server round-trip completes, so a
 * listener opened on a subcollection (which checks membership via a rule
 * that reads the parent household doc) can briefly race an as-yet-uncommitted
 * write and see a transient permission error. The Firestore Watch stream
 * (emulator and, occasionally, prod) can also glitch when a sibling listener
 * target is added/removed on the same connection. Both self-heal a moment
 * later, so we retry instead of surfacing them as fatal — and reset the
 * budget after any successful snapshot so a long-lived listener stays
 * resilient across occasional hiccups for its whole lifetime.
 */
export function subscribeWithRetry<T = DocumentData>(
  query: Query<T>,
  onNext: (snap: import('firebase/firestore').QuerySnapshot<T>) => void,
  retries = DEFAULT_RETRIES,
  delayMs = DEFAULT_DELAY_MS,
): Unsubscribe {
  let unsubscribe: Unsubscribe = () => {}
  let attemptsLeft = retries
  let stopped = false

  function start() {
    unsubscribe = onSnapshot(
      query,
      (snap) => {
        attemptsLeft = retries
        onNext(snap)
      },
      (err: FirestoreError) => {
        if (stopped) return
        // Retry on any error code: besides 'permission-denied' from the
        // as-yet-uncommitted-write race, the Watch stream glitch above can
        // surface as a rule *evaluation* error (an internal "Null value"
        // crash reading a resource that's momentarily unavailable) rather
        // than a clean denial, so we don't filter by code.
        if (attemptsLeft > 0) {
          attemptsLeft--
          setTimeout(start, delayMs)
        } else {
          console.error('onSnapshot failed', err)
        }
      },
    )
  }

  start()
  return () => {
    stopped = true
    unsubscribe()
  }
}

export function subscribeDocWithRetry<T = DocumentData>(
  ref: DocumentReference<T>,
  onNext: (snap: import('firebase/firestore').DocumentSnapshot<T>) => void,
  retries = DEFAULT_RETRIES,
  delayMs = DEFAULT_DELAY_MS,
): Unsubscribe {
  let unsubscribe: Unsubscribe = () => {}
  let attemptsLeft = retries
  let stopped = false

  function start() {
    unsubscribe = onSnapshot(
      ref,
      (snap) => {
        attemptsLeft = retries
        onNext(snap)
      },
      (err: FirestoreError) => {
        if (stopped) return
        // Retry on any error code: besides 'permission-denied' from the
        // as-yet-uncommitted-write race, the Watch stream glitch above can
        // surface as a rule *evaluation* error (an internal "Null value"
        // crash reading a resource that's momentarily unavailable) rather
        // than a clean denial, so we don't filter by code.
        if (attemptsLeft > 0) {
          attemptsLeft--
          setTimeout(start, delayMs)
        } else {
          console.error('onSnapshot failed', err)
        }
      },
    )
  }

  start()
  return () => {
    stopped = true
    unsubscribe()
  }
}
