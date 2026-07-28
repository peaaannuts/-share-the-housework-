import { useState } from 'react'
import type { Household } from '../../types'

export function HouseholdCard({ household, myUid }: { household: Household; myUid: string }) {
  const [copied, setCopied] = useState(false)
  const hasPartner = household.members.length >= 2

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(household.inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API unavailable; user can still read/select the code manually
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
      <h3 className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">世帯</h3>
      <ul className="mb-3 flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-200">
        {household.members.map((uid) => (
          <li key={uid}>
            {household.nicknames?.[uid] ?? '（未設定）'}
            {uid === myUid ? '（あなた）' : ''}
          </li>
        ))}
      </ul>
      {!hasPartner && (
        <div>
          <p className="mb-2 text-sm text-neutral-500 dark:text-neutral-400">
            この招待コードをパートナーに共有してください
          </p>
          <div className="flex items-center gap-2">
            <span className="flex-1 rounded-lg bg-neutral-100 px-3 py-2 text-center text-lg font-bold tracking-widest text-neutral-900 dark:bg-neutral-800 dark:text-white">
              {household.inviteCode}
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white active:bg-blue-700"
            >
              {copied ? 'コピー済み' : 'コピー'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
