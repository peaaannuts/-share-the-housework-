import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

const SWIPE_MIN_PX = 40

/**
 * Horizontal swipe detection via Pointer Events (touch/mouse/pen alike),
 * modeled after `useLongPress`'s start/track/release shape.
 *
 * Only fires when the gesture is horizontally dominant (|dx| > |dy|) and past
 * a minimum distance — a normal vertical scroll on the page never triggers
 * it, since a scroll's own dy will outweigh any incidental dx.
 */
export function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const startRef = useRef<{ x: number; y: number } | null>(null)

  function onPointerDown(e: ReactPointerEvent) {
    if (e.button !== undefined && e.button !== 0) return
    startRef.current = { x: e.clientX, y: e.clientY }
  }

  function onPointerUp(e: ReactPointerEvent) {
    const start = startRef.current
    startRef.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy)) return
    // Finger moved left (dx < 0) = swipe left; moved right (dx > 0) = swipe right.
    if (dx < 0) onSwipeLeft()
    else onSwipeRight()
  }

  function onPointerCancel() {
    startRef.current = null
  }

  return { onPointerDown, onPointerUp, onPointerCancel }
}
