import { Suspense, lazy, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { useToast } from '../contexts/ToastContext'
import { useChores } from '../hooks/useChores'
import { useIemoriVoice } from '../hooks/useIemoriVoice'
import { useLogsInRange } from '../hooks/useLogs'
import { useLongPress } from '../hooks/useLongPress'
import { categoryChipColor, categoryEmoji } from '../lib/categoryStyle'
import { memberColor } from '../lib/chartColors'
import { formatDayHeading, formatTime, formatVillageDate } from '../lib/date'
import { addLog, deleteLog } from '../lib/logService'
import { useIsDark } from '../lib/theme'
import type { Chore, ChoreLog } from '../types'
import { QuickTimeSheet } from './home/QuickTimeSheet'

// The gacha screen and its tip data load only when opened, so neither the
// tips nor their artwork weigh on the initial bundle.
const GachaScreen = lazy(() =>
  import('./gacha/GachaScreen').then((m) => ({ default: m.GachaScreen })),
)

/**
 * おうちの管理人「いえもり」。フルネームは「いえもり しげる」。
 *
 * フルネームはキャラクター設定として控えているだけで、UIには出さない
 * （吹き出し・名札・alt はすべて「いえもり」のまま）。台詞を書き足す
 * ときの人物像の目安として置いてある。
 */
interface IemoriContext {
  remain: number
  thanksToday: number
  meCount: number
  youCount: number
  selfName: string
  partnerName: string
}

/**
 * 表示する台詞。`key` は音声ファイル名（`public/voices/{key}.mp3`）にも
 * 使う安定id。`hasVoice: false` は、台詞の中に可変値（残数・🍀合計・
 * ニックネーム）が埋め込まれていて事前収録の音声を当てられない行——
 * ComfyUIで手作業生成する都合上、こういう行は無音のまま（テキストのみ）に
 * 割り切っている。時間帯による分岐（朝/昼/夜）のように、選ばれ方は動的でも
 * 結果の文言自体は固定のものは `hasVoice: true` にできる。
 */
interface IemoriLine {
  key: string
  text: string
  hasVoice: boolean
}

function iemoriLines({
  remain,
  thanksToday,
  meCount,
  youCount,
  selfName,
  partnerName,
}: IemoriContext): IemoriLine[] {
  const hour = new Date().getHours()
  return [
    remain === 0
      ? { key: 'allDone', text: 'きょうの家事はぜんぶ片づきましたなぁ。お茶でも飲みましょう。', hasVoice: true }
      : { key: 'remain', text: `のこりは ${remain}こ。急がずまいりましょう。`, hasVoice: false },
    { key: 'together', text: 'ふたりで分けると、家はずいぶん軽くなるものですねぇ。', hasVoice: true },
    {
      key: 'thanksToday',
      text: `きょうは 🍀 が ${thanksToday.toLocaleString('ja-JP')} たまりましたよ。えらい。`,
      hasVoice: false,
    },
    { key: 'noRush', text: '無理はしなくてよろしい。あしたの分は、あしたの家が持ちます。', hasVoice: true },
    meCount === youCount
      ? { key: 'evenHands', text: 'ふたりの手が、ちょうど同じだけ動いておりますなぁ。', hasVoice: true }
      : meCount > youCount
        ? {
            key: 'selfMore',
            text: `きょうは ${selfName}さんがよく動いておられる。ひと休みも仕事のうちですよ。`,
            hasVoice: false,
          }
        : {
            key: 'partnerMore',
            text: `${partnerName}さんがよく動いておられますなぁ。ひとこと伝えると、きっと喜びます。`,
            hasVoice: false,
          },
    hour < 11
      ? { key: 'morning', text: '朝のうちにひとつ片づけておくと、夜がずいぶん楽になりますよ。', hasVoice: true }
      : hour < 17
        ? { key: 'afternoon', text: '昼下がりですなぁ。根を詰めずに、ゆっくりまいりましょう。', hasVoice: true }
        : { key: 'evening', text: '日も暮れました。のこりは明日にまわしても、罰は当たりません。', hasVoice: true },
    { key: 'thanksSameDay', text: '「ありがとう」は、ためこまずにその日のうちに渡すのがよろしい。', hasVoice: true },
    { key: 'rememberPartner', text: 'やった家事の数より、やってくれた相手のほうを覚えておきなさい。', hasVoice: true },
    { key: 'notPerfect', text: '完璧でなくてよいのです。だいたい片づけば、家はちゃんと回ります。', hasVoice: true },
    {
      key: 'shareChores',
      text: '気づいた人がやる、で回していると、いつか片方が疲れます。分けましょうな。',
      hasVoice: true,
    },
    { key: 'happyTwo', text: 'きれいな部屋より、機嫌のよいふたりのほうが、家は嬉しいものですよ。', hasVoice: true },
    { key: 'sleepFirst', text: '洗いものは逃げませんが、眠気には勝てません。先に寝てもよろしい。', hasVoice: true },
    { key: 'differentEffort', text: '同じ家事でも、やる人が違えば手間も違う。そこを見てあげなさい。', hasVoice: true },
    {
      key: 'giveOneChore',
      text: 'たまには家事をひとつ、まるごと相手にゆずってみるのもよいものです。',
      hasVoice: true,
    },
    { key: 'notBlame', text: 'この記録は、責めるためではなく、ねぎらうためにつけるものですよ。', hasVoice: true },
    { key: 'oneWhenFree', text: '手が空いたときにひとつだけ。それだけで、ずいぶん違うものです。', hasVoice: true },
    { key: 'takeoutOk', text: '疲れた日は、買ってきたごはんで済ませるのも立派な家事です。', hasVoice: true },
    {
      key: 'tiredDayOk',
      text: '「きょうは疲れた」と言えるのも、ふたり暮らしのよいところですなぁ。',
      hasVoice: true,
    },
    { key: 'supportedMore', text: 'この家は、ふたりが思うよりずっと、ふたりに支えられております。', hasVoice: true },
    { key: 'hereForYou', text: 'わたしはここにおりますから。また明日も、のんびりまいりましょう。', hasVoice: true },
  ]
}

function IemoriCard(ctx: IemoriContext) {
  const [lineIndex, setLineIndex] = useState(0)
  const lines = iemoriLines(ctx)
  const { play, muted, toggleMuted } = useIemoriVoice()

  function handleTap() {
    const next = (lineIndex + 1) % lines.length
    setLineIndex(next)
    play(lines[next])
  }

  return (
    <div className="mt-4 flex items-end gap-3">
      <div className="relative h-[72px] w-[72px] shrink-0">
        <img
          src="/iemori.png"
          alt="いえもり"
          className="h-full w-full rounded-full border-[3px] border-white bg-[#eaf3d8] object-cover shadow-[0_3px_0_rgba(120,140,90,0.25)] dark:border-neutral-700"
        />
        <span className="absolute -bottom-1 -left-1 rounded-full border-2 border-white bg-[#fffdf5] px-2 py-0.5 text-[10.5px] font-bold text-[#6f7a4e] shadow-[0_2px_0_rgba(120,140,90,0.25)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-[#a3d17a]">
          いえもり
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleMuted()
          }}
          aria-label={muted ? '音声をオンにする' : '音声をオフにする'}
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#fffdf5] text-[11px] shadow-[0_2px_0_rgba(120,140,90,0.25)] dark:border-neutral-700 dark:bg-neutral-900"
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
      <button
        type="button"
        onClick={handleTap}
        className="min-w-0 flex-1 rounded-[22px_22px_22px_6px] border-4 border-white bg-[#fffdf5] px-4 py-3.5 text-left shadow-[0_5px_0_rgba(120,140,90,0.26)] transition active:translate-y-0.5 active:shadow-[0_3px_0_rgba(120,140,90,0.26)] dark:border-neutral-700 dark:bg-neutral-900"
      >
        <p className="text-[13.5px] font-bold leading-relaxed text-[#4e5c35] dark:text-neutral-200">
          {lines[lineIndex].text}
        </p>
        <p className="mt-2 text-[10.5px] font-medium text-[#adb493] dark:text-neutral-500">
          タップでもうひとこと
        </p>
      </button>
    </div>
  )
}

interface BoardDot {
  selfDone: boolean
  partnerDone: boolean
  selfColor: string
  partnerColor: string
}

/** Latest log + how many times that person recorded this chore today. */
interface ChoreDoneInfo {
  latest: ChoreLog
  count: number
}

function TodayBoardCard({
  doneCount,
  total,
  dots,
}: {
  doneCount: number
  total: number
  dots: BoardDot[]
}) {
  const progressW = total > 0 ? Math.round((doneCount / total) * 100) : 0

  return (
    <div className="mt-4 rounded-[28px] border-4 border-white bg-[#fffdf5] px-[18px] pb-4 pt-4 shadow-[0_6px_0_rgba(120,140,90,0.28)] dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-baseline justify-between">
        <span className="text-[14.5px] font-bold text-[#4e5c35] dark:text-neutral-200">
          きょうのおてつだいボード
        </span>
        <span className="text-xs font-bold text-[#8a9470] dark:text-neutral-400">
          {doneCount} / {total}
        </span>
      </div>
      <div className="mt-3 h-4 overflow-hidden rounded-full border-2 border-[#e2ebd0] bg-[#eef2e2] dark:border-neutral-700 dark:bg-neutral-800">
        <div
          className="h-full transition-[width] duration-300 ease-out"
          style={{ width: `${progressW}%`, background: 'linear-gradient(180deg,#a8ce6e,#7fa84c)' }}
        />
      </div>
      {dots.length > 0 && (
        <div className="mt-3 flex gap-1.5">
          {dots.map((d, i) => (
            <span
              key={i}
              className="flex h-3 flex-1 overflow-hidden rounded-full bg-[#eef2e2] dark:bg-neutral-800"
            >
              {d.selfDone && <span className="h-full flex-1" style={{ backgroundColor: d.selfColor }} />}
              {d.partnerDone && (
                <span className="h-full flex-1" style={{ backgroundColor: d.partnerColor }} />
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function GachaEntryCard({
  unlockedCount,
  onOpen,
}: {
  unlockedCount: number
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-4 flex w-full items-center gap-3 rounded-[26px] border-4 border-white bg-[#fffdf5]/90 px-[18px] py-4 text-left shadow-[0_5px_0_rgba(120,140,90,0.2)] transition active:translate-y-0.5 dark:border-neutral-700 dark:bg-neutral-900/90"
    >
      <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border-2 border-[#f7dcc0] bg-[#fdeede] text-xl dark:border-neutral-700 dark:bg-neutral-800">
        🎁
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold leading-snug text-[#4e4133] dark:text-white">
          たまった 🍀 で家事のTIPSをひく
        </p>
        <p className="mt-0.5 text-[11.5px] text-[#9a9781] dark:text-neutral-400">
          {unlockedCount > 0
            ? `あつめた TIPS ${unlockedCount}こ`
            : 'まだ1つも開放していません'}
        </p>
      </div>
      <span className="shrink-0 text-[#c3ab94]">›</span>
    </button>
  )
}

function ChoreVillageRow({
  chore,
  selfInfo,
  partnerInfo,
  selfName,
  partnerName,
  isDark,
  onTap,
  onLongPress,
}: {
  chore: Chore
  selfInfo: ChoreDoneInfo | null
  partnerInfo: ChoreDoneInfo | null
  selfName: string
  partnerName: string
  isDark: boolean
  onTap: (chore: Chore) => void
  onLongPress: (chore: Chore) => void
}) {
  // One gesture for the whole row. The 「やった！」 button sits inside it, so a
  // press that starts on the button is the same press — routing its click back
  // through the hook keeps "tap records / long-press opens the sheet" decided
  // in one place instead of the button having a second, independent opinion.
  const press = useLongPress(
    () => onTap(chore),
    () => onLongPress(chore),
  )
  const selfColor = memberColor(true, isDark)
  const partnerColor = memberColor(false, isDark)

  return (
    <div
      onPointerDown={press.onPointerDown}
      onPointerMove={press.onPointerMove}
      onPointerUp={press.onPointerUp}
      onPointerLeave={press.onPointerLeave}
      onPointerCancel={press.onPointerCancel}
      onContextMenu={press.onContextMenu}
      // relative + z-[45]: the fixed TabBar (z-40) sits over the bottom of the
      // viewport at every scroll position. Once favorites don't all fit on one
      // screen, scrolling a row to rest in that band leaves it geometrically
      // under the nav — a static element never wins a hit-test against a fixed,
      // higher-stacked one, so the row's own pointerdown/click never fires
      // (worse: the touch can land on an actual nav button and silently switch
      // tabs). Outranking the nav here (still well under the z-50 sheets, which
      // must keep covering everything including the nav) makes the row win
      // wherever they visually overlap, matching what's actually on screen.
      className="long-pressable relative z-[45] flex items-center gap-3 rounded-[24px] border-4 border-white bg-[#fffdf5] px-3 py-3 shadow-[0_5px_0_rgba(120,140,90,0.22)] dark:border-neutral-700 dark:bg-neutral-900"
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-white/90 text-xl dark:border-neutral-800"
        style={{ backgroundColor: categoryChipColor(chore.category, isDark) }}
      >
        {categoryEmoji(chore.category)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-[#4e4133] dark:text-white">
          {chore.name}
        </span>
        {selfInfo || partnerInfo ? (
          <span className="mt-0.5 flex flex-col gap-0.5">
            {selfInfo && (
              <span className="block text-[11.5px] font-bold" style={{ color: selfColor }}>
                {selfName}がやってくれた ・ {formatTime(selfInfo.latest.doneAt)}
                {selfInfo.count > 1 && ` ・ 本日${selfInfo.count}回`}
              </span>
            )}
            {partnerInfo && (
              <span className="block text-[11.5px] font-bold" style={{ color: partnerColor }}>
                {partnerName}がやってくれた ・ {formatTime(partnerInfo.latest.doneAt)}
                {partnerInfo.count > 1 && ` ・ 本日${partnerInfo.count}回`}
              </span>
            )}
          </span>
        ) : (
          <span className="mt-0.5 block text-[11.5px] text-[#a8ad92] dark:text-neutral-500">
            めやす {chore.minutes}分 ・ 🍀{chore.minutes * 10}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          press.onClick(e)
        }}
        className="long-pressable shrink-0 rounded-full border-[3px] border-white px-4 py-2.5 text-[12.5px] font-bold text-[#6b4a17] shadow-[0_4px_0_rgba(180,130,40,0.45)] transition active:translate-y-[3px] active:shadow-[0_1px_0_rgba(180,130,40,0.45)] dark:border-neutral-800"
        style={{ background: 'linear-gradient(180deg,#ffd166,#f3b23f)' }}
      >
        やった！
      </button>
    </div>
  )
}

function AllChoresRow({
  chore,
  isDark,
  onTap,
  onLongPress,
}: {
  chore: Chore
  isDark: boolean
  onTap: (chore: Chore) => void
  onLongPress: (chore: Chore) => void
}) {
  const press = useLongPress(
    () => onTap(chore),
    () => onLongPress(chore),
  )
  return (
    <button
      type="button"
      {...press}
      className="long-pressable flex items-center gap-3 rounded-2xl bg-neutral-50 px-3 py-3 text-left active:bg-neutral-100 dark:bg-neutral-800 dark:active:bg-neutral-700"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl"
        style={{ backgroundColor: categoryChipColor(chore.category, isDark) }}
      >
        {categoryEmoji(chore.category)}
      </span>
      <span className="min-w-0 flex-1 break-words font-medium text-neutral-900 dark:text-white">
        {chore.name}
      </span>
      <span className="shrink-0 text-xs text-neutral-400">{chore.minutes}分</span>
    </button>
  )
}

function AllChoresSheet({
  chores,
  isDark,
  onSelect,
  onLongPress,
  onClose,
}: {
  chores: Chore[]
  isDark: boolean
  onSelect: (chore: Chore) => void
  onLongPress: (chore: Chore) => void
  onClose: () => void
}) {
  return (
    <div className="sheet-overlay z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="sheet-panel max-h-[75dvh] w-full rounded-t-3xl bg-white p-4 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">すべての家事</h3>
          <button type="button" onClick={onClose} className="text-sm font-medium text-neutral-400">
            閉じる
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {chores.map((chore) => (
            <AllChoresRow
              key={chore.id}
              chore={chore}
              isDark={isDark}
              onTap={(c) => {
                onSelect(c)
                onClose()
              }}
              onLongPress={(c) => {
                onLongPress(c)
                onClose()
              }}
            />
          ))}
          {chores.length === 0 && (
            <p className="py-6 text-center text-sm text-neutral-400">
              登録されている家事がありません
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function HomeTab() {
  const { user } = useAuth()
  const { household, myNickname, partnerUid } = useHousehold()
  const { chores } = useChores(household?.id ?? null)
  const { show } = useToast()
  const isDark = useIsDark()
  const [showAll, setShowAll] = useState(false)
  const [showGacha, setShowGacha] = useState(false)
  const [pickingTimeFor, setPickingTimeFor] = useState<Chore | null>(null)

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)
  const { logs: todayLogs } = useLogsInRange(household?.id ?? null, todayStart, todayEnd)

  const favorites = chores.filter((c) => c.isFavorite)
  const selfName = myNickname || 'あなた'
  const partnerName = (partnerUid ? household?.nicknames?.[partnerUid] : undefined) || 'パートナー'

  // Latest log + today's count per chore, tracked separately per person — so
  // one person having already logged a chore never blocks the other from
  // recording their own instance of it (each person's row state is their
  // own, not "whoever logged it last"), and repeating the same chore today
  // just increments that person's own count instead of hiding the button.
  const selfInfoByChore = new Map<string, ChoreDoneInfo>()
  const partnerInfoByChore = new Map<string, ChoreDoneInfo>()
  for (const log of todayLogs) {
    const byMap = log.userId === user?.uid ? selfInfoByChore : partnerInfoByChore
    const existing = byMap.get(log.choreId)
    if (existing) existing.count++
    else byMap.set(log.choreId, { latest: log, count: 1 })
  }

  const selfColor = memberColor(true, isDark)
  const partnerColor = memberColor(false, isDark)
  let meCount = 0
  let youCount = 0
  let doneCount = 0
  const dots: BoardDot[] = []
  for (const chore of favorites) {
    const selfDone = selfInfoByChore.has(chore.id)
    const partnerDone = partnerInfoByChore.has(chore.id)
    if (selfDone) meCount++
    if (partnerDone) youCount++
    if (selfDone || partnerDone) doneCount++
    dots.push({ selfDone, partnerDone, selfColor, partnerColor })
  }
  const total = favorites.length
  const remain = total - doneCount
  // Reward points: sum over EVERY log recorded today (not just favorites),
  // so any chore worked on today contributes — this is a total-effort
  // reward metric, distinct from the favorites-only board tally above.
  const thanksToday = todayLogs.reduce((sum, log) => sum + log.minutes * 10, 0)
  // Comes straight off the already-subscribed household doc — no extra read.
  const unlockedTipCount = household?.tipsUnlocked?.length ?? 0

  function recordAt(chore: Chore, doneAt: number, minutes: number = chore.minutes) {
    if (!household || !user) return
    // addLog derives minutes/score from the chore it is handed, so a chore
    // with an overridden duration records that duration (score stays
    // minutes × loadFactor, frozen at record time as always).
    const logId = addLog(household.id, { ...chore, minutes }, user.uid, doneAt)
    const isNow = Math.abs(Date.now() - doneAt) < 5000
    const parts: string[] = []
    if (!isNow) parts.push(`${formatDayHeading(doneAt)} ${formatTime(doneAt)}`)
    if (minutes !== chore.minutes) parts.push(`${minutes}分`)
    const detail = parts.length > 0 ? `（${parts.join('・')}）` : ''
    show(`「${chore.name}」${detail}を記録しました`, () => {
      deleteLog(household.id, logId)
    })
  }

  function handleTap(chore: Chore) {
    recordAt(chore, Date.now())
  }

  function handleLongPress(chore: Chore) {
    setPickingTimeFor(chore)
  }

  // Backdrop comes from the shared body gradient in index.css.
  return (
    <div className="min-h-full px-4 pb-28 pt-6 font-['Zen_Maru_Gothic']">
      <div className="flex items-center justify-between gap-2.5">
        <div
          className="rounded-[20px] border-[3px] border-[#fffdf5] px-4 py-2.5 shadow-[0_4px_0_rgba(120,84,44,0.35)]"
          style={{ background: 'linear-gradient(180deg,#d9a86c,#c08d55)' }}
        >
          <p
            className="text-[15px] font-bold leading-tight text-[#fffdf5]"
            style={{ textShadow: '0 1px 0 rgba(120,84,44,0.4)' }}
          >
            ふたりのおうち
          </p>
          <p className="mt-0.5 text-[10.5px] font-medium leading-none text-[#fdf1dc]">
            {formatVillageDate(Date.now())}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border-[3px] border-[#f5e2b8] bg-[#fffdf5] px-3.5 py-2 shadow-[0_3px_0_rgba(160,120,60,0.25)] dark:border-neutral-700 dark:bg-neutral-900">
          <span className="text-sm">🍀</span>
          <span className="text-sm font-bold text-[#5d7a3a] dark:text-[#a3d17a]">
            {thanksToday.toLocaleString('ja-JP')}
          </span>
        </div>
      </div>

      <IemoriCard
        remain={remain}
        thanksToday={thanksToday}
        meCount={meCount}
        youCount={youCount}
        selfName={selfName}
        partnerName={partnerName}
      />

      <TodayBoardCard doneCount={doneCount} total={total} dots={dots} />

      <p className="mb-1 mt-4 text-[11px] text-[#7a8a63] dark:text-neutral-500">
        🕐 長押しすると、やった時刻とかかった時間を決めて記録できます
      </p>

      <div className="mt-2 flex flex-col gap-2.5">
        {favorites.map((chore) => (
          <ChoreVillageRow
            key={chore.id}
            chore={chore}
            selfInfo={selfInfoByChore.get(chore.id) ?? null}
            partnerInfo={partnerInfoByChore.get(chore.id) ?? null}
            selfName={selfName}
            partnerName={partnerName}
            isDark={isDark}
            onTap={handleTap}
            onLongPress={handleLongPress}
          />
        ))}
      </div>

      {favorites.length === 0 && (
        <div className="mt-4 rounded-[26px] border-4 border-white bg-[#fffdf5]/80 p-8 text-center shadow-[0_5px_0_rgba(120,140,90,0.2)] dark:border-neutral-700 dark:bg-neutral-900/70">
          <p className="text-3xl">⭐️</p>
          <p className="mt-2 text-sm text-[#6b5a49] dark:text-neutral-400">
            お気に入りの家事がまだありません。
            <br />
            設定から追加すると、ここにボードが並びます。
          </p>
        </div>
      )}

      <GachaEntryCard unlockedCount={unlockedTipCount} onOpen={() => setShowGacha(true)} />

      <button
        type="button"
        onClick={() => setShowAll(true)}
        className="mt-4 w-full rounded-[22px] border-[3px] border-dashed border-[#b4825a80] bg-[#fffdf580] py-3.5 text-sm font-bold text-[#a67a56] active:bg-white dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400"
      >
        ＋ その他の家事から選ぶ
      </button>

      {showAll && (
        <AllChoresSheet
          chores={chores}
          isDark={isDark}
          onSelect={handleTap}
          onLongPress={handleLongPress}
          onClose={() => setShowAll(false)}
        />
      )}

      {showGacha && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
              <p className="rounded-2xl bg-[#fffdf5] px-5 py-3 text-sm font-bold text-[#6b5a49] dark:bg-neutral-900 dark:text-neutral-200">
                よみこみ中…
              </p>
            </div>
          }
        >
          <GachaScreen onClose={() => setShowGacha(false)} />
        </Suspense>
      )}

      {pickingTimeFor && (
        <QuickTimeSheet
          chore={pickingTimeFor}
          onPick={(doneAt, minutes) => {
            recordAt(pickingTimeFor, doneAt, minutes)
            setPickingTimeFor(null)
          }}
          onClose={() => setPickingTimeFor(null)}
        />
      )}
    </div>
  )
}
