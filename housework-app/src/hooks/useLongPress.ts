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

  /**
   * Eats the single `click` the browser emits when the finger lifts after a
   * long-press. By then the long-press has usually mounted something (a sheet)
   * right under the finger, and that click would land on whatever is now
   * there — on the home rows it hit a preset button inside the freshly opened
   * QuickTimeSheet, recording a bogus entry and closing it again, which read
   * as "the long-press does nothing". Capture phase, so it never reaches
   * React's root listener.
   */
  function swallowNextClick() {
    const onCapture = (e: MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      window.clearTimeout(giveUp)
    }
    document.addEventListener('click', onCapture, { capture: true, once: true })
    // If no click follows (gesture cancelled, click never dispatched), don't
    // leave the listener armed to eat an unrelated tap later on.
    const giveUp = window.setTimeout(() => {
      document.removeEventListener('click', onCapture, { capture: true })
    }, 400)
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
    // Armed on release rather than when the timer fires, because the press can
    // be held for any length of time and the click follows the release.
    if (firedRef.current) swallowNextClick()
  }

  function onPointerLeave() {
    clear()
  }

  /**
   * Fired when the browser takes the gesture over (scroll started, iOS
   * selection/callout kicked in). No pointerup follows, so the pending
   * timer has to be dropped here or it would fire mid-scroll.
   */
  function onPointerCancel() {
    clear()
  }

  /** Long-press on touch also raises contextmenu; the app owns that gesture. */
  function onContextMenu(e: { preventDefault: () => void }) {
    e.preventDefault()
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
    onPointerCancel,
    onContextMenu,
    onClick,
  }
}
