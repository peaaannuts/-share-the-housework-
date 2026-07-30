import { useEffect, useRef } from 'react'
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
  const disarmRef = useRef<(() => void) | null>(null)

  // Only the pending press is dropped on unmount. An armed click swallow is
  // deliberately left in place: the row is usually unmounted *by* its own
  // long-press (the chore menu closes as it opens the time sheet), and the
  // click it has to eat has not arrived yet. Those listeners always take
  // themselves off — on the click, or shortly after the finger lifts.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  function clear() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  /**
   * Eats the single `click` the browser emits when the finger lifts after a
   * long-press. By then the long-press has mounted something (a sheet) right
   * under the finger, and that click lands on whatever is now there — a preset
   * button inside the freshly opened QuickTimeSheet, say, which records a
   * bogus entry and closes the sheet again. That read as "the long-press does
   * nothing", and it only bit on some rows, because whether it broke anything
   * depended on what happened to sit under that screen position.
   *
   * Everything hangs off `document`, and it is armed the moment the press
   * fires rather than on the element's own pointerup: the pressed element is
   * often unmounted by the long-press itself (the chore menu closes as it
   * opens the time sheet), and an unmounted element never sees pointerup.
   */
  function armClickSwallow() {
    disarmRef.current?.()

    const swallow = (e: MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      disarm()
    }
    // The click is dispatched right after pointerup, so a short grace period
    // past the release is enough — and it makes sure a later, unrelated tap
    // is never eaten no matter how long the press was held.
    const onRelease = () => {
      window.clearTimeout(graceTimer)
      graceTimer = window.setTimeout(disarm, 400)
    }
    let graceTimer = 0

    function disarm() {
      window.clearTimeout(graceTimer)
      document.removeEventListener('click', swallow, true)
      document.removeEventListener('pointerup', onRelease, true)
      document.removeEventListener('pointercancel', onRelease, true)
      if (disarmRef.current === disarm) disarmRef.current = null
    }

    document.addEventListener('click', swallow, true)
    document.addEventListener('pointerup', onRelease, true)
    document.addEventListener('pointercancel', onRelease, true)
    disarmRef.current = disarm
  }

  function onPointerDown(e: ReactPointerEvent) {
    // Only the primary button/touch/pen contact starts a press.
    if (e.button !== undefined && e.button !== 0) return
    firedRef.current = false
    startRef.current = { x: e.clientX, y: e.clientY }
    clear()
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      armClickSwallow()
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
