#!/usr/bin/env node
/**
 * 対話式 Firebase セットアップ。
 *
 * やること:
 *   1. firebase-tools（CLI）とログイン状態を確認
 *   2. プロジェクトを選択（既存 or 新規作成）
 *   3. Web アプリを登録（無ければ作成）し、その SDK 設定を取得
 *   4. .env.production.local を自動生成
 *   5. Firestore ルールをデプロイ
 *   6. 希望すれば GitHub Actions 自動デプロイ用の CI トークンを発行
 *   7. 残る手作業（Auth プロバイダの有効化）を案内
 *
 * これで、ユーザーが手で Firebase コンソールの設定値をコピーして
 * .env に貼り付ける…という一番面倒な工程が無くなる。
 */
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { runFirebase as runFirebaseRaw, getSdkConfig as getSdkConfigRaw, sdkConfigToEnvBody } from './firebase-cli.mjs'

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const runFirebase = (args, opts) => runFirebaseRaw(args, { ...opts, cwd: APP_DIR })
const getSdkConfig = (projectId) => getSdkConfigRaw(projectId, { cwd: APP_DIR })

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
}

function fail(message) {
  console.error(c.red(`\n✖ ${message}`))
  process.exit(1)
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout })
  const ask = async (q) => (await rl.question(q)).trim()

  console.log(c.bold('\n🏠 家事分担アプリ — Firebase セットアップ\n'))

  // 1. CLI 確認（未インストールでも npx が取得するので、初回は少し時間がかかる）
  console.log(c.dim('firebase-tools を確認中…（初回は取得に少し時間がかかります）'))
  const version = runFirebase(['--version'], { capture: true })
  if (version.status !== 0) {
    rl.close()
    fail(
      'firebase-tools を起動できませんでした。\n' +
        '  ネット接続を確認するか、`npm install -g firebase-tools` で事前インストールしてください。',
    )
  }
  console.log(c.dim(`firebase-tools ${String(version.stdout).trim()}`))

  // 2. ログイン確認
  const loginList = runFirebase(['login:list'], { capture: true })
  if (loginList.status !== 0 || /No authorized accounts/i.test(String(loginList.stdout))) {
    console.log(c.yellow('\nFirebase にログインしていません。ブラウザでログインします…\n'))
    const login = runFirebase(['login'])
    if (login.status !== 0) {
      rl.close()
      fail('ログインに失敗しました。')
    }
  }

  // 3. プロジェクト選択 / 作成
  console.log(c.bold('\n▸ プロジェクトの選択'))
  console.log(
    c.dim('  既存プロジェクトの ID を入力するか、空欄のまま Enter で新規作成します。'),
  )
  let projectId = await ask('  プロジェクト ID: ')

  if (!projectId) {
    const suggested = `housework-${Math.random().toString(36).slice(2, 8)}`
    const inputId = (await ask(`  新規プロジェクト ID [${suggested}]: `)) || suggested
    const displayName = (await ask('  表示名 [家事分担アプリ]: ')) || '家事分担アプリ'
    console.log(c.dim(`\n  プロジェクト "${inputId}" を作成中…`))
    const create = runFirebase(['projects:create', inputId, '--display-name', displayName])
    if (create.status !== 0) {
      rl.close()
      fail('プロジェクト作成に失敗しました。ID が既に使われている可能性があります。')
    }
    projectId = inputId
  }

  // .firebaserc を書いて以降のコマンドで --project 省略可に
  writeFileSync(
    join(APP_DIR, '.firebaserc'),
    JSON.stringify({ projects: { default: projectId } }, null, 2) + '\n',
  )
  console.log(c.green(`  ✓ プロジェクト: ${projectId}`))

  // 4. Web アプリの取得 or 作成 → SDK 設定
  console.log(c.bold('\n▸ Web アプリの設定を取得'))
  let sdkConfig = getSdkConfig(projectId)
  if (!sdkConfig) {
    console.log(c.dim('  Web アプリが無いので作成します…'))
    const created = runFirebase(['apps:create', 'WEB', '家事分担アプリ', '--project', projectId])
    if (created.status !== 0) {
      rl.close()
      fail('Web アプリの作成に失敗しました。')
    }
    sdkConfig = getSdkConfig(projectId)
  }
  if (!sdkConfig) {
    rl.close()
    fail('SDK 設定の取得に失敗しました。')
  }

  // 5. .env.production.local を書き出し
  const envPath = join(APP_DIR, '.env.production.local')
  writeFileSync(
    envPath,
    sdkConfigToEnvBody(sdkConfig, projectId, {
      header: '# `npm run firebase:setup` により自動生成。手で編集しても構いません。',
    }),
  )
  console.log(c.green(`  ✓ .env.production.local を生成しました`))

  // 6. Firestore ルールをデプロイ
  console.log(c.bold('\n▸ Firestore セキュリティルールをデプロイ'))
  const rulesDeploy = runFirebase(['deploy', '--only', 'firestore:rules', '--project', projectId])
  if (rulesDeploy.status !== 0) {
    console.log(
      c.yellow(
        '  ⚠ ルールのデプロイに失敗しました。Firestore データベースが未作成かもしれません。\n' +
          '    コンソールで Firestore を作成後、`npm run deploy` で再度デプロイされます。',
      ),
    )
  } else {
    console.log(c.green('  ✓ ルールをデプロイしました'))
  }

  // 7. GitHub Actions 自動デプロイ（任意）
  console.log(c.bold('\n▸ GitHub Actions での自動デプロイ（任意）'))
  console.log(c.dim('  main への push で自動的にビルド・公開されるようになります。'))
  const wantCi = (await ask('  設定しますか？ [y/N]: ')).trim().toLowerCase()
  let ciToken = null
  if (wantCi === 'y' || wantCi === 'yes') {
    console.log(c.dim('\n  CI 用トークンを発行します。ブラウザで認証してください…'))
    const ciLogin = runFirebase(['login:ci'], { capture: true })
    if (ciLogin.status === 0 && ciLogin.stdout) {
      const lines = String(ciLogin.stdout).trim().split('\n').filter(Boolean)
      const last = lines[lines.length - 1]?.trim()
      if (last) ciToken = last
    }
    if (!ciToken) {
      console.log(
        c.yellow(
          '  ⚠ トークン発行に失敗、または出力から読み取れませんでした。\n' +
            '    後で手動で `npx firebase-tools login:ci` を実行して設定できます。',
        ),
      )
    }
  }

  rl.close()

  // 完了案内 — 残る手作業は「Auth プロバイダの有効化」1つだけ
  const consoleUrl = `https://console.firebase.google.com/project/${projectId}`
  console.log(c.bold('\n✅ ほぼ完了です。あと1手順だけ手作業が必要です。\n'))
  console.log('  1) 認証プロバイダを有効化（コンソールで各1トグル）:')
  console.log(c.dim(`     ${consoleUrl}/authentication/providers`))
  console.log('       - 「匿名」を有効化（必須）')
  console.log('       - 「メール/パスワード」を有効化（任意・機種変更時のデータ引き継ぎ用）')
  console.log('  2) Firestore Database を未作成なら作成:')
  console.log(c.dim(`     ${consoleUrl}/firestore`))

  if (ciToken) {
    console.log(c.bold('\n  3) GitHub リポジトリに Secrets を2つ追加してください:'))
    console.log(c.dim('     Settings → Secrets and variables → Actions → New repository secret\n'))
    console.log(`     ${c.bold('HOUSEWORK_FIREBASE_PROJECT_ID')} = ${projectId}`)
    console.log(`     ${c.bold('HOUSEWORK_FIREBASE_TOKEN')} = ${ciToken}`)
    console.log(
      c.dim(
        '\n  これで housework-app/ の変更を main にマージするだけで自動デプロイされます\n' +
          '  （手動で公開したい場合は npm run deploy も引き続き使えます）。',
      ),
    )
  } else {
    console.log(c.bold('\n  そのあと、公開はこの1コマンドだけ:\n'))
    console.log(c.green('     npm run deploy\n'))
    console.log(
      c.dim(
        '  ※ GitHub Actions での自動デプロイは後からでも設定できます。\n' +
          '     `npx firebase-tools login:ci` でトークンを発行し、README の\n' +
          '     「自動デプロイ（GitHub Actions）」を参照してください。',
      ),
    )
  }
}

main().catch((err) => {
  console.error(c.red(`\n✖ 予期しないエラー: ${err?.message ?? err}`))
  process.exit(1)
})
