#!/usr/bin/env node
/**
 * GitHub Actions 用: FIREBASE_PROJECT_ID / FIREBASE_TOKEN の2つの環境変数だけから
 * .env.production.local を生成する（非対話）。ビルド前に実行する想定。
 *
 * これにより、リポジトリ側に Firebase の Web SDK 設定値（apiKey 等）を
 * 個別の secret として6つも登録する必要がなくなる。
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getSdkConfig, sdkConfigToEnvBody } from './firebase-cli.mjs'

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

const projectId = process.env.FIREBASE_PROJECT_ID
const token = process.env.FIREBASE_TOKEN

if (!projectId || !token) {
  console.error(
    '✖ FIREBASE_PROJECT_ID と FIREBASE_TOKEN の両方が環境変数として必要です。\n' +
      '  (GitHub Actions の場合は repository secrets から渡してください)',
  )
  process.exit(1)
}

const sdkConfig = getSdkConfig(projectId, { cwd: APP_DIR, extraArgs: ['--token', token] })
if (!sdkConfig) {
  console.error('✖ Firebase SDK 設定の取得に失敗しました（プロジェクトID/トークンを確認してください）。')
  process.exit(1)
}

writeFileSync(
  join(APP_DIR, '.env.production.local'),
  sdkConfigToEnvBody(sdkConfig, projectId, { header: '# CI (scripts/ci-write-env.mjs) が生成' }),
)
console.log('✓ .env.production.local を生成しました')
