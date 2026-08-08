# housework-app — 引き継ぎメモ

夫婦・カップル2人で家事の分担を記録して見える化する Web PWA。

> **注意**: このリポジトリのルートには**まったく無関係な社労士試験の学習アプリ**が
> 同居しています。この `housework-app/` ディレクトリだけが家事分担アプリです。
> ルートの `README.md` やソースは別アプリのものなので混同しないこと。

## 基本情報

| 項目 | 値 |
| --- | --- |
| 公開URL | https://housework-app-64a8b.web.app |
| Firebaseプロジェクト | `housework-app-64a8b` |
| 作業ブランチ | `claude/housework-sharing-app-hz8goj`（**mainには出していない**） |
| デプロイ | 上記ブランチにpushすると GitHub Actions が自動でビルド＆デプロイ |
| ワークフロー | `.github/workflows/deploy-housework-app.yml`（パスフィルタ `housework-app/**`） |
| 必要なシークレット | `HOUSEWORK_FIREBASE_PROJECT_ID` / `HOUSEWORK_FIREBASE_TOKEN`（登録済み） |
| エミュレータのproject id | `demo-housework-app` |

技術構成: React + TypeScript + Vite + Tailwind CSS v4 / Firebase (Auth匿名 +
Firestore + Hosting) / vite-plugin-pwa。

## 開発と検証の進め方（このプロジェクトの流儀）

毎回この手順で進めてきたので踏襲すること。

```bash
cd housework-app
npx tsc -b && npm run build          # 型とビルド
npx firebase emulators:start --project demo-housework-app &
npx vite --port 5183 --strictPort &
# Playwrightで実際に操作して確認（下記）
```

- **Playwrightで必ず実機確認する**。`/opt/pw-browsers/chromium` を
  `executablePath` に指定して使う。スクショはライト/ダーク両方見る。
- 検証スクリプトは scratchpad に置き、**リポジトリには入れない**。
- 家事の行を掴むセレクタ（むらぐらし版のホームで有効）:
  `xpath=//span[contains(@class,"font-bold") and contains(text(),"夕食作り")]/ancestor::div[1]`
- 2人での挙動は**ブラウザコンテキストを2つ**作り、設定画面から招待コードを
  読み取って参加させる（`共有してください\s*\n\s*([A-Z0-9]{6})` で抽出できる）。
- push前に `firestore-debug.log` などを消し、`git status` を確認してから
  コミットする。コミットメッセージは日本語で「何を・なぜ・どう検証したか」を
  書く（既存のログを参照）。ハーネスが求める `Co-Authored-By` と
  `Claude-Session` のトレーラーを付ける。
- push後は `mcp__github__actions_list` で当該コミットのrunを確認し、
  **Build と Deploy の両ステップが `success`**（`skipped` でない）ことを
  見てからユーザーに報告する。結果が大きすぎるので `python3` でJSONを
  パースして必要な項目だけ取り出すこと。

## データモデル（Firestore）

```
users/{uid}                     → { householdId, nickname }
inviteCodes/{CODE}              → { householdId, createdAt }   6文字の招待コード
households/{id}                 → Household
households/{id}/chores/{id}     → Chore     家事マスタ
households/{id}/logs/{id}       → ChoreLog  実施記録
```

`src/types.ts` が正。`Household` には `tipsUnlocked?: string[]` と
`cloversSpent?: number`（ガチャ用）が乗っている。

**スコアの原則**: `score = minutes × loadFactor` を**記録時に確定させて保存**する。
あとから家事マスタの負荷係数を変えても過去の記録は動かない。`addLog` は渡された
chore から `minutes`/`score` を導出するので、所要時間を上書きしたいときは
`{ ...chore, minutes }` を渡せばよい（`logService` を変える必要はない）。

## 画面と主要ファイル

- `screens/HomeTab.tsx` — むらぐらし風のホーム。いえもりカード、きょうの
  おてつだいボード、家事一覧、ガチャ入口。
  **自分とパートナーのログを別々に持つ**（`selfInfoByChore` /
  `partnerInfoByChore`、各々 `{ latest, count }`）ので、片方が記録済みでも
  もう片方が記録できる。ボタンは常に「やった！」で、同じ人が同じ家事を
  今日すでに記録していても押すたびに新しい記録が追加される（1日に何度も
  やる家事を想定）。2回目以降は行に「本日N回」と出す。取り消しは
  記録直後のトースト（`ToastContext`、4秒間「取り消す」が出る）と、
  `HistoryTab.tsx` での個別編集/削除で行う（ホームに常設の「とりけす」
  ボタンはない）。行の長押し → `home/QuickTimeSheet.tsx`（時刻＋所要時間を
  決めて記録）。
- `screens/DashboardTab.tsx` + `screens/dashboard/*` — 分担比率、目標比率、
  カテゴリ別、週次推移、家事別累計。recharts使用。
- `screens/HistoryTab.tsx` — 日付ごとに区切った履歴。行タップで編集シート
  （家事の変更・日時・所要時間）。CSV書き出しあり。
- `screens/SettingsTab.tsx` + `screens/settings/*` — 世帯/招待コード、
  メール連携、家事マスタの編集。
- `screens/gacha/GachaScreen.tsx` — 🍀を消費して家事のTIPSを開放（後述）。

共通: `lib/categoryStyle.ts`（カテゴリの絵文字と色）、`lib/chartColors.ts`
（自分=テラコッタ / パートナー=オリーブ）、`lib/date.ts`（日付書式一式）、
`hooks/useLongPress.ts`、`lib/subscribeWithRetry.ts`。

## デザイン

「むらぐらし風」＝丸ゴシック（Zen Maru Gothic）、太い白フチ、押すと沈む3D
ボタン、空〜草のグラデーション。背景は `src/index.css` の body に一本化して
あり、**全タブで共有**している（画面ごとに背景を持たせないこと）。

- 自分／パートナーの識別色は `memberColor()` のテラコッタ `#c2683f` /
  オリーブ `#8a9963`。この2色はCVDの分離基準を単体では満たさないが、
  **必ずニックネームのラベルと併記される**ことを根拠に採用している
  （`lib/chartColors.ts` のコメント参照）。ラベルなしで色だけに意味を
  持たせる使い方はしないこと。
- キャラクター「いえもり」（フルネーム: **いえもり しげる**、UIには出さない）。
  画像は `public/iemori.png`。吹き出しの台詞は20種で、うち2種は
  「どちらが多く動いているか」「時間帯」で変わる。

## ガチャと家事のTIPS

🍀を消費して家事のTIPSを1つずつ開放していく仕組み。

- **残高 = 累計獲得（全ログの `minutes × 10`）− `cloversSpent`**。獲得側を
  都度計算にしているので、記録の取り消しや分数編集に自動追従する。表示は
  マイナスを0で丸める（判定には実値を使う）。
- 1回 `SPIN_COST = 500`。**未開放のものだけ**排出（重複なし）。
- 抽選と残高検証は `lib/gachaService.ts` の**トランザクション内**で行う。
  2人が同時に回しても二重消費しない（検証済み）。
- ホーム右上の🍀ピルは**今日の分**、使える残高は**ガチャ画面のみ**。これは
  起動時に全ログを読まないための意図的な切り分け。
- **回転演出**（`GachaScreen.tsx`）: `spinning` 中は画面全体に `SpinOverlay`
  を出し、`CHORE_CATEGORIES` の絵文字を90msごとに切り替えてスロット風に見せる
  （`reelTick` state + `setInterval`）。`handleSpin` の待機は固定600msではなく
  `MIN_SPIN_MS = 900` からトランザクション時間を差し引いた残りだけ待つ方式。
  当選時は `popIn` で弾ませ、`Confetti`（`key={burst}`）で🍀✨🌿⭐️を放射状に
  飛ばす。外部の画像・音声は使っていない（絵文字＋CSSキーフレームのみ）。

### TIPSのイラスト（未着手・次にやること）

`src/data/houseworkTips.ts` に16件。`image` は**任意項目**で、未設定なら
カテゴリ絵文字で表示される。`public/tips/xxx.webp` を置いて `image` に
パスを書けば差し替わる。**WebP・長辺800px・1枚40〜60KB**を目安に。

Figmaコネクタはアカウントに接続済み。会話によってオフのことがあるので、
使うならチャットのコネクタ設定で有効化してもらう。フラットなベクター絵は
作れるが、いえもり（写実的な鳥）とは画風が変わる点は要相談。

## 落とし穴（実際に踏んで解決したもの。壊さないこと）

1. **PWAのプリキャッシュに画像を入れない**
   `vite.config.ts` の `globPatterns` は dist 配下の png を全部拾う。TIPSの絵は
   `globIgnores: ['tips/**']` で除外し、CacheFirst のランタイムキャッシュに
   回している。これを外すと、絵を足すたびにインストール時と更新のたびに
   全部ダウンロードされ、**起動が重くなる**（ユーザーが最も気にしている点）。
   現状の実測: 初期JS 1,283.78 kB / プリキャッシュ11件 1,604 KiB。
   ガチャ画面とTIPS本文は `React.lazy` で別チャンク（11.9 kB）。

2. **セキュリティルールで `get()` を使わない**
   `firestore.rules` の chores/logs は `isSignedIn()` だけで判定している。
   親ドキュメントを `get()` で参照するルールにすると、リスナーを解除→再購読
   （タブ切り替えなど）した瞬間に**そのリスナーが永久に壊れる**事象を
   エミュレータで再現した。世帯IDが推測困難な20文字のauto-idであることを
   根拠にした割り切り。ルール内のコメントに経緯あり。

3. **Blobダウンロードのファイル名は必ずASCII**
   `blob:` URL のダウンロードでファイル名に日本語を入れると、Chromiumが
   拡張子ごと捨てて `download` にしてしまう（Playwrightの都合ではなく実挙動）。
   CSVは中身は日本語、ファイル名は `housework-log_YYYY-MM-DD.csv` にしている。

4. **世帯ドキュメントへのフィールド追加はルール変更不要**
   既存ルールで「メンバーは `members` 以外を更新可」になっている。

5. **長押しの直後に来る click を飲み込む**（`useLongPress` の `armClickSwallow`）
   長押しで何かをその場に出す（`QuickTimeSheet`）と、指を離したときの `click`
   が**今まさに指の下に現れた要素**に当たる。開いたシートのプリセットボタン
   （「さっき」）を勝手に押して記録＋即クローズ → 「長押しが効かない」に見える。
   タチが悪いのは、**壊れるかどうかが押した行の画面上のY座標で決まる**点。
   クリックが説明文の上に落ちた行だけ動くので、症状が飛び飛びに出る。

   仕掛けるタイミングが肝で、**長押しが成立した瞬間に `document` へ付ける**こと。
   要素側の pointerup では駄目 —「すべての家事」シートは長押しと同時に自分を
   閉じる（`onClose()`）ので、押していた行はその時点でアンマウントされ
   pointerup を受け取らない。解除も `document` の pointerup/pointercancel＋
   猶予で行う。行のアンマウントでは**解除しない**（まだ飲み込むべき click が
   来ていない）。

   併せて、自前の長押しを持つ行には `.long-pressable`（`index.css`）を付ける。
   素の `<div>` だと iOS Safari が自前のテキスト選択・コールアウトの
   長押しジェスチャを始めて press を奪う（`<button>` は既定で除外される）。

   **長押しする行の中にボタンを置くときは、そのボタンに独立した `onClick` を
   持たせないこと。** ホームの「やった！」がそうなっていて、行の長押しには
   pointerdown のバブリングで"たまたま"参加している一方、タップの処理だけは
   自前で持つ、という二重経路になっていた。`useLongPress` を実タップ付きで作り
   （`useLongPress(() => onTap(chore), …)`）、ボタンの `onClick` は
   `press.onClick` に流して、tap / long-press の判定を1か所に寄せる。
   検証も行の本体だけでなく**行の中のボタンを押す経路**を必ず通すこと
   （ここが長らく穴になっていた）。

6. **ボトムシートの高さは `dvh`、`vh` は使わない**（`.sheet-overlay` / `.sheet-panel`）
   iOS Safari の `vh` は「ツールバーが隠れている状態」のビューポートを指す。
   `fixed inset-0` に `vh` 上限のシートを下端揃えで置くと、シート下部が
   ツールバーの下に潜り込み、スクロールする一覧の最後のほうの行が画面外に
   取り残されて**タップできなくなる**。`.sheet-overlay`（`100dvh`）と
   `.sheet-panel`（`overscroll-contain` ＋ `env(safe-area-inset-bottom)` 分の
   下パディング）に寄せてあるので、新しいシートも素の `fixed inset-0` ＋
   `max-h-[NNvh]` ではなくこの2クラスを使うこと。

7. **固定 `TabBar` とスクロールする行の重なり**（`ChoreVillageRow` の
   `relative z-[45]`）
   `TabBar.tsx` は `fixed bottom-0 z-40`、`pointer-events` 制限なし、実測で
   高さ約55〜89px（ホームインジケータ込み）。この帯にホームのお気に入り行が
   来ると、行は `position` 指定なし（static）なので**その行への
   `pointerdown` はTabBarに奪われて一切発火しない**——長押しどころか
   タップも死ぬ。さらに悪いことに、4つのタブボタンは `flex-1` で画面幅
   いっぱいを占めるので、たまたま行の位置がどこかのタブボタンの上に
   重なると**そのタブへ勝手に切り替わる**（`elementFromPoint` で確認済み。
   `pointer-events` をnav外側だけに制限する対策は、ボタン自体が全幅を
   占めるため実質効果なし）。

   これはお気に入りが多い世帯だけの話ではない——**お気に入りが9件の初期
   状態でも、上の行が「〇〇がやってくれた・本日N回」で2行に伸びるだけで
   4番目の行がこの帯に届く**。日常的に使っていれば普通に起きる。

   対策は「行が可視化した瞬間、TabBarの帯と重ならない座標に来る」を保証
   しようとする（余白を増やす、pointer-events分割）のではなく、**重なった
   ときに行が勝つようにする**方針にした: `ChoreVillageRow` に
   `relative z-[45]`（TabBarの40より上、シート類の50より下）を付けるだけ。
   `position: relative` はオフセットなしなのでレイアウトは変わらない。
   これで見えているもの（行）が押せるようになる。トレードオフとして、
   行がその帯に乗っている間はTabBarのそのボタンが一時的に押せなくなるが、
   少しでもスクロールすれば即解消するので、記録が勝手に化けたり無反応に
   なるより実害はずっと小さい。scroll-snapや `AppShell` のレイアウト
   再構成（TabBarを非fixedにして専用スクロール領域を確保する、より
   根本的だが影響範囲の大きい手）は今回は見送った。

   検証は `scrollTo` でページ全体のスクロール範囲を細かく掃引し、各行の
   ボタン中心で `elementFromPoint` がその行自身を指すか（`insideNav` に
   なっていないか）を確認する方式が有効（`scrollIntoViewIfNeeded()` は
   要素を都合よく中央寄せしてしまうため、実際に「スクロールで下端から
   現れた直後」を再現できず、この種のバグを一度見逃した）。

8. **`TabBar` を `position: fixed` にしない**（`App.tsx` の flex 構造 /
   `TabBar.tsx`）
   以前は `TabBar` が `fixed bottom-0` で、`HomeTab` 側は `body`/`html` の
   スクロールに乗る作りだった。iOS Safari/WebKitには、`position: fixed`
   要素のコンポジットレイヤーが「そのとき点」のドキュメント座標に貼り付いて
   しまう既知の不具合があり、初回ペイント後にページの高さが伸びると
   （`HomeTab` はFirestoreの購読で非同期にデータを受け取り後からコンテンツが
   伸びる）、TabBarが正しくビューポート追従せず、開いた直後は非表示、または
   一覧の途中に挟まって表示される、という2種類の壊れ方を実機で確認した
   （`will-change: transform` で早期レイヤー昇格を促す対処を最初に試したが、
   むしろ「早い段階の座標に貼り付く」タイミングを固定してしまい、一覧の
   途中に挟まる症状の方を悪化させたと考えられる）。

   根治策として `position: fixed` 自体をやめた。`App.tsx` の `AppShell` を
   `flex h-dvh flex-col overflow-hidden` にし、タブのコンテンツ領域を
   `min-h-0 flex-1 overflow-y-auto overscroll-contain` で**独立してスクロール
   する箱**にした上で、`TabBar` はその下に並ぶ**ただの flex 兄弟**
   （`shrink-0`、`position` 指定なし）にした。`body`/`html` 自体はもう
   スクロールしない。これで TabBar は常にコンテンツ領域の外側・flexレイアウト
   の末尾にあり、ビューポート座標の計算をブラウザに委ねる必要がなくなる
   ——このクラスの不具合が構造的に起こり得ない。

   副作用として、`ChoreVillageRow` の `relative z-[45]`
   （TabBarとの重なり対策、上記7番）は**もう起こり得ない状況への保険**に
   なった。実害はないのでそのまま残してある。

   **この不具合クラス自体（WebKitのコンポジット挙動）はChromiumベースの
   検証環境では再現できない。** Playwrightでの確認は「TabBarが常にビュー
   ポート下端＝`getBoundingClientRect().bottom === innerHeight` であること」
   「お気に入りを13件に増やして非同期にコンテンツが伸びても崩れないこと」
   「シートがTabBarより手前に来ること」「4タブすべてで独立してスクロール
   できること」に留まる。`window.scrollTo` を使う既存の検証スクリプトは
   もう機能しない（スクロールする箱が `body` ではなくなったため）——
   `document.querySelectorAll('div')).find(d => getComputedStyle(d).overflowY
   === 'auto')` でスクロールコンテナを探して `el.scrollTo(...)` する必要が
   ある。

9. **ダッシュボードのマネーフォワード風レイアウト＋月スワイプ**
   （`DashboardTab.tsx`/`dashboard/*`/`hooks/useSwipe.ts`）
   ユーザー共有のマネーフォワード家計簿画面を参考に刷新。「今週/今月」の
   ピルトグルを廃止し、**選択中の月（Date、月初）を1つのstate**で持つ方式に
   変更（初期値は常に当月）。`getMonthRange(selectedMonth)`（`lib/date.ts`、
   任意の基準日を受け取れる既存関数）にそのまま渡すだけで期間フィルタが
   できる。`週次推移`（直近6週間固定）・`家事別実績`（累計）はこの月選択と
   無関係なので変更なし。

   月移動は `‹`/`›` タップに加えて**横スワイプ**（左スワイプ＝前月、
   右スワイプ＝次月）にも対応。`useSwipe.ts`（新規）は `useLongPress.ts` と
   同じPointer Events方式で、水平方向優位・40px以上の移動でのみ発火する
   （縦スクロールや `TargetRatioEditor` のスライダーの横ドラッグと
   衝突しないよう、スワイプ判定は月ヘッダーのカードだけに限定している——
   スライダーは横ドラッグそのものなので、もし同じ領域に入れると全体スワイプ
   として誤検出される）。ヘッダーには `select-none` と
   `[touch-action:pan-y]` を付けている。これがないと実機で「スワイプした
   つもりがテキスト選択のポップアップが出る」「縦スクロール中のブラウザの
   横方向ジェスチャに横取りされてpointerupが飛んでこない」が起こり得る
   （テキスト選択の方はこのPlaywright検証で実際に再現・確認済み——
   マウスドラッグでのスワイプ検証時に取れたスクショに選択ハイライトが
   写り込んでいた）。

   `CategoryPie.tsx` はドーナツの穴に世帯合計（🍀）を表示し、セグメントには
   カテゴリ名のみラベル。下のリストは絵文字アイコン（`categoryEmoji`）＋
   バッジ枠にセグメント色（`categoryColor`）を使ってドーナツと対応付け、
   カテゴリ名・🍀合計・％・シェブロン（見た目のみ、タップでは何も起きない
   ——将来ドリルダウンを足す余地として置いてある）を横並びにした。

   `SplitRatioBar`/`TargetRatioEditor`/`WeeklyTrend`/`ChoreBreakdown` の
   カード様式も、旧来のフラットな `rounded-2xl bg-white ... ring-1
   ring-neutral-200` から `HomeTab.tsx` と同じむらぐらし様式
   （`rounded-[28px] border-4 border-white bg-[#fffdf5] ...
   shadow-[0_6px_0_rgba(120,140,90,0.28)]`）に統一した。目標比率スライダー
   の `accent-blue-600` は今回のスコープ外として残っている（下記）。

## 残っている検討事項

- **目標比率スライダーの `accent-blue-600` と、履歴タブの「CSVで書き出す」
  文字色に青いアクセントが残っている**。背景を村の配色に統一したことで
  浮いて見える。テラコッタ系に寄せるか未決（ユーザーに投げた状態）。
  ダッシュボードの「今週/今月」トグル自体は月ナビゲーション刷新に伴い廃止
  したので、この青アクセントの指摘対象からは外れている。
- TIPSのイラスト（上記）。
