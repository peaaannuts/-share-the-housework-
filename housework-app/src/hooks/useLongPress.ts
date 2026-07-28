import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

const LONG_PRESS_MS = 500
const MOVE_CANCEL_PX = 10

/**
 * Distinguishes a tap from a long-press on the same element using Pointer
 * Events (covers touch, mouse, and pen uniformly).
 *
 * After a long-press fires, the subsequent synthetic `click` that the
 * browser dispatches on pointerup is suppressed so callers don't get both
 * `onTap` and `onLongPress` for the same gesture.
 */
export function useLongPress(onTap: () => void, onLongPress: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firedRef = useRef(false)
  const startRef = useRef<{ x: number; y: number } | null>(null)

  function clear() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function onPointerDown(e: ReactPointerEvent) {
    // Only the primary button/touch/pen contact starts a press.
    if (e.button !== undefined && e.button !== 0) return
    firedRef.current = false
    startRef.current = { x: e.clientX, y: e.clientY }
    clear()
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      onLongPress()
    }, LONG_PRESS_MS)
  }

  function onPointerMove(e: ReactPointerEvent) {
    const start = startRef.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) clear()
  }

  function onPointerUp() {
    clear()
  }

  function onPointerLeave() {
    clear()
  }

  function onClick(e: { preventDefault: () => void }) {
    if (firedRef.current) {
      // Suppress the tap that follows a long-press.
      e.preventDefault()
      firedRef.current = false
      return
    }
    onTap()
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onClick,
  }
}
