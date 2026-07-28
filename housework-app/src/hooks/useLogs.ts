import { limit, orderBy, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { logsCollection } from '../lib/logService'
import { subscribeWithRetry } from '../lib/subscribeWithRetry'
import type { ChoreLog } from '../types'

export function useLogsInRange(householdId: string | null, start: Date, end: Date) {
  const [logs, setLogs] = useState<ChoreLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) {
      setLogs([])
      return
    }
    setLoading(true)
    const q = query(
      logsCollection(householdId),
      where('doneAt', '>=', start.getTime()),
      where('doneAt', '<', end.getTime()),
      orderBy('doneAt', 'desc'),
    )
    const unsubscribe = subscribeWithRetry(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChoreLog))
      setLoading(false)
    })
    return unsubscribe
  }, [householdId, start.getTime(), end.getTime()])

  return { logs, loading }
}

/** All logs ever recorded, unfiltered — for all-time cumulative (累計) stats. */
export function useAllLogs(householdId: string | null) {
  const [logs, setLogs] = useState<ChoreLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) {
      setLogs([])
      return
    }
    setLoading(true)
    const q = query(logsCollection(householdId))
    const unsubscribe = subscribeWithRetry(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChoreLog))
      setLoading(false)
    })
    return unsubscribe
  }, [householdId])

  return { logs, loading }
}

export function useRecentLogs(householdId: string | null, max = 200) {
  const [logs, setLogs] = useState<ChoreLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) {
      setLogs([])
      return
    }
    setLoading(true)
    const q = query(logsCollection(householdId), orderBy('doneAt', 'desc'), limit(max))
    const unsubscribe = subscribeWithRetry(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChoreLog))
      setLoading(false)
    })
    return unsubscribe
  }, [householdId, max])

  return { logs, loading }
}
