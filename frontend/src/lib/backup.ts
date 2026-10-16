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

// 選んだファイルの中身が、バックアップファイルらしいかを、軽く調べる（確認メッセージを出す前の関門）。
// 読めなければ null。細かい検査（色や日付など）は、サーバーがもう一度行う
export function parseBackupText(text: string): BackupFile | null {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null) return null
  const file = value as Partial<BackupFile>
  if (file.app !== 'taskboard' || !Array.isArray(file.columns)) return null
  return file as BackupFile
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
