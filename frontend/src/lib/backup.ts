import type { BackupFile } from '../api/types'

// バックアップファイルまわりの、画面を使わない関数

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// 保存するファイルの名前。保存した日時が付く（例：taskboard-backup-20261016-123456.json）
export function backupFileName(now: Date = new Date()): string {
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `taskboard-backup-${date}-${time}.json`
}

// 読み込めるファイルの大きさの上限（20MB）。ふつうのバックアップは、数KB〜数MB。
// 大きすぎるものは、全部読むと画面が固まるので、読む前に断る
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024

// 20MBを「超える」ものが、大きすぎる（ちょうど20MBは、読める）
export function isBackupTooLarge(file: { size: number }): boolean {
  return file.size > MAX_BACKUP_BYTES
}

// 対応しているバックアップの版（サーバーの BackupFile.VERSION と同じ）
export const BACKUP_VERSION = 1

export function isSupportedBackupVersion(file: { version?: unknown }): boolean {
  return file.version === BACKUP_VERSION
}

export const BACKUP_UNREADABLE_MESSAGE = 'このファイルは読み込めません。'
export const BACKUP_TOO_LARGE_MESSAGE = 'ファイルが大きすぎます（20MBまで）。'
export const BACKUP_UNSUPPORTED_VERSION_MESSAGE = 'このバックアップは、対応していないバージョンです。'

// 選んだファイルの中身が、バックアップファイルらしいかを、軽く調べる（確認メッセージを出す前の関門）。
// 読めなければ null。細かい検査（色や日付など）は、サーバーがもう一度行う
export function parseBackupText(text: string): BackupFile | null {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  return isBackupFile(value) ? value : null
}

function isBackupFile(value: unknown): value is BackupFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    'app' in value &&
    value.app === 'taskboard' &&
    'columns' in value &&
    Array.isArray(value.columns)
  )
}

// データをJSONファイルとして保存する（ブラウザのダウンロードとして）
export function saveJsonFile(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
