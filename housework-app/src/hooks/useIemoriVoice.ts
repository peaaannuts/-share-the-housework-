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

  return { play, muted, toggleMuted }
}
