import { useEffect, useRef, useState } from 'react'

const MUTE_KEY = 'iemoriVoiceMuted'

/**
 * いえもりの吹き出しの音声再生。台詞は `public/voices/{key}.mp3` に
 * 事前収録された音声ファイル（任意・ComfyUI等で生成）を想定している——
 * ファイルが無い/読み込めない場合は黙って無視し、テキスト表示は今まで
 * 通り動く（音声は "あれば鳴る" 追加要素で、無くても壊れない）。
 *
 * ミュート設定は世帯間で同期する Firestore のデータではなく、あくまで
 * 「この端末で鳴らすかどうか」なので localStorage に device-local で持つ。
 */
export function useIemoriVoice() {
  const [muted, setMuted] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(MUTE_KEY) === '1'
  })
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio()
    // Ignore load/decode errors: a 404 or undecodable file just means no
    // recording exists yet for this line — the tap still switches text.
    // Logged (not surfaced to the UI) so a real problem is still visible
    // in devtools instead of silently vanishing.
    audio.addEventListener('error', () => {
      console.warn('[iemori voice] failed to load/decode', audio.src, audio.error)
    })
    audioRef.current = audio
    return () => {
      audio.pause()
      audioRef.current = null
    }
  }, [])

  function play(line: { key: string; hasVoice: boolean }) {
    if (!line.hasVoice || muted) return
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.src = `/voices/${line.key}.mp3`
    // iOS Safari/WebKit doesn't reliably pick up a new `src` on a reused
    // <audio> element unless load() is called explicitly — play() can
    // resolve without error yet produce no sound. load() also resets
    // currentTime to 0, so no need to set it separately.
    audio.load()
    audio.play().catch(() => {})
  }

  function toggleMuted() {
    setMuted((m) => {
      const next = !m
      window.localStorage.setItem(MUTE_KEY, next ? '1' : '0')
      if (next) audioRef.current?.pause()
      return next
    })
  }

  // Warms the CacheFirst runtime cache (vite.config.ts) for every voiced
  // line up front, in the background. Without this, tapping through lines
  // faster than the network fetch of the *previous* tap's mp3 finishes
  // aborts that fetch (pause() cancels the in-flight play()) — the line's
  // audio never gets a chance to play even though nothing errors. Once
  // these are cached, playback starts from disk instead of the network, so
  // normal-speed tapping no longer races the fetch. Fire-and-forget: a
  // failed prefetch just means that tap falls back to the old (still
  // correct, just slower) live-fetch behavior.
  function prefetch(lines: { key: string; hasVoice: boolean }[]) {
    const keys = new Set(lines.filter((l) => l.hasVoice).map((l) => l.key))
    for (const key of keys) {
      fetch(`/voices/${key}.mp3`, { cache: 'force-cache' }).catch(() => {})
    }
  }

  return { play, muted, toggleMuted, prefetch }
}
