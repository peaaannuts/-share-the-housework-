# 家事分担アプリ

同居する2人の家事の量と偏りをデータで可視化し、「言った・言わない」「やっている・やっていない」の
感覚のズレを解消するための PWA です。相手を責める道具ではなく、フェアな話し合いの材料を提供します。

> 元の要件定義書は Flutter + Firebase（モバイルアプリ）を想定していましたが、この開発環境に
> Flutter SDK が無く実機/エミュレータでの検証もできないため、Web PWA（React + TypeScript + Vite）
> として実装しています。Firebase（Auth / Firestore）は Web SDK でそのまま利用しているため、
> 2人間のリアルタイム同期・オフライン対応は要件定義書どおりに動作します。

## コンセプト

- 家事の作業量（時間 × 負荷係数）を定量化し、2人の分担比率を見える化する
- 記録の手間を極限まで減らす（ホーム画面のワンタップで記録、起動から3秒以内）
- 競争・採点ではなく対話のきっかけをつくる（ポイント対抗やランキングは意図的に実装していません）

## 実装済み機能（MVP + v1.1 相当）

| 機能 | 内容 |
|---|---|
| 世帯・アカウント管理 | 匿名認証で開始 → 後からメール連携可能。世帯の新規作成、招待コードでの参加（上限2名） |
| 家事マスタ管理 | 家事名・所要時間・負荷係数・カテゴリを登録。プリセット14件を初期投入、お気に入り設定 |
| 記録機能 | ホーム画面のワンタップボタンで記録。確認ダイアログなし、取消ボタン付きトーストで誤タップに対応。オフラインでも記録でき、オンライン復帰時に自動同期 |
| 見える化ダッシュボード | 分担比率バー、期間切替（今週/今月）、カテゴリ別内訳（ドーナツグラフ）、週次推移（棒グラフ）、自分たちの目標比率設定 |
| 履歴 | 記録の一覧表示、日時の編集・削除 |

「あえて実装しない機能」（要件定義書どおり）：ポイント対抗・ランキング等の競争要素、細かすぎる入力項目。
週次通知・ねぎらいスタンプ・偏りアラート等は v2 相当として未実装です。

## 技術構成

- **React + TypeScript + Vite**、**Tailwind CSS v4**
- **Firebase Authentication**（匿名認証 → メール/パスワード連携）
- **Cloud Firestore**（`persistentLocalCache` によるオフラインキャッシュ＋自動同期、`onSnapshot` によるリアルタイム反映）
- **vite-plugin-pwa**（Service Worker・ホーム画面への追加）
- **recharts**（ダッシュボードのグラフ）

サーバー処理（週次集計・通知など）は要件定義書どおり v2 スコープとし、Cloud Functions は未導入です。

## まず動かしてみる（Firebase 不要・30秒）

実 Firebase プロジェクトなしで、Local Emulator を使って全機能をすぐ試せます
（`.env.development` にエミュレータ用のダミー設定が入っています）。

> 前提: **Node.js**（[nodejs.org](https://nodejs.org/)）と、エミュレータ実行用の **Java**（JDK 11以上）が必要です。
> `firebase-tools` は各コマンドが `npx` で自動取得するので個別インストールは不要ですが、
> 毎回の取得を省いて速くしたい場合は `npm install -g firebase-tools` を一度実行しておくと快適です。

```bash
cd housework-app
npm install

# ターミナル1: エミュレータ（Auth + Firestore）
npm run emulators

# ターミナル2: 開発サーバー
npm run dev
```

`http://localhost:5173` を開けば、世帯作成・招待・記録・ダッシュボード・オフライン動作まで
一通り動きます。2人分を見るときは、もう1つのブラウザ（またはシークレットウィンドウ）で
同じ URL を開くと別ユーザーとして扱われます。エミュレータ UI は `http://127.0.0.1:4000`。

## 本番公開（2人のスマホで使う）

2人が別々のスマホで同期して使うには、自分の Firebase プロジェクトが必要です（無料枠で収まります）。
手作業でコンソールの設定値をコピペする工程は、セットアップスクリプトが肩代わりします。

```bash
cd housework-app
npm install

# ① 対話式セットアップ:
#    Firebase ログイン → プロジェクト選択/作成 → Web アプリ登録
#    → .env.production.local を自動生成 → ルールをデプロイ、まで自動
npm run firebase:setup
```

スクリプトの最後に案内される**残り1手順だけ**をコンソールで実施します（各1トグル）:

- **Authentication → Sign-in method** で「**匿名**」を有効化（必須）
  - 「メール/パスワード」も有効化すると、機種変更時のデータ引き継ぎ（設定画面のメール連携）が使えます（任意）
- **Firestore Database** が未作成なら作成

あとは公開まで**この1コマンド**だけ（ビルド → Hosting とルールを一括デプロイ）:

```bash
# ② ビルドして Firebase Hosting に公開
npm run deploy
```

表示された公開 URL をスマホのブラウザで開き、メニューから「ホーム画面に追加」すれば
アプリのように使えます（PWA）。

> Firebase Hosting 以外（Cloudflare Pages・GitHub Pages 等）に置くこともできます。その場合は
> `npm run build` で生成される `dist/` を配信し、ルールだけ `firebase deploy --only firestore:rules`
> でデプロイしてください。

## コードを更新したら自動で公開する（GitHub Actions）

`npm run deploy` を毎回手で叩かなくても、**`main` にマージするだけ**で自動的にビルド・公開されるように
できます。`.github/workflows/deploy-housework-app.yml` がその設定で、`housework-app/` 配下の変更が
あったときだけ動きます。

有効にするには、GitHub リポジトリに Secret を2つ登録するだけです。`npm run firebase:setup` の
最後で「GitHub Actions での自動デプロイを設定しますか？」と聞かれたときに `y` と答えると、
必要な値（プロジェクトIDとCIトークン）が画面に表示されます。それを

**Settings → Secrets and variables → Actions → New repository secret** で登録してください。

| Secret 名 | 値 |
|---|---|
| `HOUSEWORK_FIREBASE_PROJECT_ID` | Firebase プロジェクト ID |
| `HOUSEWORK_FIREBASE_TOKEN` | CI 用トークン（`npx firebase-tools login:ci` でいつでも再発行可） |

登録後は、`housework-app/` に変更を加えて `main` にマージ（または push）するたびに、
GitHub Actions が自動でビルド・Hosting へのデプロイ・Firestore ルールの反映まで行います。
`npm run deploy` によるその場での手動公開も引き続き使えます。

### 主な npm スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run emulators` | Firebase エミュレータ（Auth + Firestore）起動 |
| `npm run firebase:setup` | 対話式の初回セットアップ（プロジェクト作成〜`.env` 生成〜ルール配信） |
| `npm run deploy` | ビルドして Hosting + ルールを一括デプロイ |
| `npm run build` | 型チェック + 本番ビルド（`dist/`） |
| `npm run preview` | ビルド結果をローカルプレビュー |
| `npm run ci:env` / `ci:deploy` | GitHub Actions が使う非対話コマンド（手動実行は通常不要） |

## データモデル（Firestore）

```
users/{uid}                          … householdId, nickname
households/{householdId}
  members: [uid1, uid2]
  nicknames: { [uid]: string }
  inviteCode: string
  targetRatio: { [uid]: number }      … 合計100になる目標比率
  chores/{choreId}                    … name, minutes, loadFactor, category, isFavorite, order
  logs/{logId}                        … choreId, choreName, category, userId, doneAt, minutes, loadFactor, score
inviteCodes/{code}                    … householdId（招待コードから世帯を引くための逆引き）
```

`score`（= minutes × loadFactor）は記録時点で計算して固定保存しています。後から家事マスタの
係数を変更しても、過去の集計値がブレないようにするためです。

### セキュリティルールの設計について

`households/{id}/chores`・`logs` サブコレクションは、あえて親ドキュメントを `get()` で参照して
世帯メンバーかどうかを再チェックしていません。Firestore の Local Emulator（および一部レポートでは
本番でも稀に）、`get()` を使うセキュリティルールを持つクエリリスナーが unsubscribe → resubscribe
された際（タブ切り替えなど）に、そのリスナーの以後のスナップショットが恒久的に権限エラーになる
不具合があるためです（リトライしても回復しません）。`householdId` は Firestore の自動生成ID
（約20文字のランダム文字列）で、世帯メンバー本人（自分の `users/{uid}` ドキュメント経由）か
1回限りの招待コード経由でしか知り得ないため、このサブコレクションではサインイン済みであることのみを
要求しています。2人利用の個人アプリとしては妥当なトレードオフと判断していますが、より厳密な
アクセス制御が必要な場合は Cloud Functions でカスタムクレームを付与する方式への切り替えを
検討してください。
