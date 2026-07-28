/** firebase-setup.mjs と ci-write-env.mjs で共有する Firebase CLI 呼び出しヘルパー。 */
import { spawnSync } from 'node:child_process'

/**
 * Firebase CLI（firebase-tools）を呼び出す。
 *
 * - パッケージ名は必ず `firebase-tools`。`firebase` はクライアントSDKで、
 *   このプロジェクトの依存に入っているため `npx firebase` だとそちらを
 *   拾って CLI が見つからず失敗する（グローバル未インストール環境で顕在化）。
 * - `--yes` を付けているので、グローバル/ローカルに未インストールでも npx が
 *   一時取得して実行する（インストール済みならそれを使う）。
 * - Windows で `spawnSync('npx', …)` は `npx.cmd` を解決できないことがあるため、
 *   `shell: true` + コマンド文字列で実行する（スペースを含む引数はクォート）。
 */
export function runFirebase(args, { capture = false, cwd } = {}) {
  const quoted = args.map((a) => (/[\s"']/.test(a) ? JSON.stringify(a) : a)).join(' ')
  const command = `npx --yes firebase-tools ${quoted}`
  return spawnSync(command, {
    cwd,
    encoding: 'utf8',
    shell: true,
    stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
  })
}

/** `firebase apps:sdkconfig WEB --json` を叩いて sdkConfig を返す（無ければ null）。 */
export function getSdkConfig(projectId, opts = {}) {
  const res = runFirebase(['apps:sdkconfig', 'WEB', '--project', projectId, ...(opts.extraArgs ?? []), '--json'], {
    capture: true,
    cwd: opts.cwd,
  })
  if (res.status !== 0 || !res.stdout) return null
  try {
    const parsed = JSON.parse(res.stdout)
    const config = parsed?.result?.sdkConfig
    return config && config.apiKey ? config : null
  } catch {
    return null
  }
}

export function sdkConfigToEnvBody(sdkConfig, projectId, { header } = {}) {
  return [
    header ?? '',
    `VITE_FIREBASE_API_KEY=${sdkConfig.apiKey ?? ''}`,
    `VITE_FIREBASE_AUTH_DOMAIN=${sdkConfig.authDomain ?? ''}`,
    `VITE_FIREBASE_PROJECT_ID=${sdkConfig.projectId ?? projectId}`,
    `VITE_FIREBASE_STORAGE_BUCKET=${sdkConfig.storageBucket ?? ''}`,
    `VITE_FIREBASE_MESSAGING_SENDER_ID=${sdkConfig.messagingSenderId ?? ''}`,
    `VITE_FIREBASE_APP_ID=${sdkConfig.appId ?? ''}`,
    'VITE_USE_EMULATOR=false',
    '',
  ]
    .filter((l, i) => i > 0 || l !== '')
    .join('\n')
}
