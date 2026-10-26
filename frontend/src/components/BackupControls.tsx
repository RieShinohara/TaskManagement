import { useRef, useState, type ChangeEvent } from 'react'
import { fetchBackup, restoreBackup } from '../api/client'
import type { BackupFile } from '../api/types'
import {
  BACKUP_TOO_LARGE_MESSAGE,
  BACKUP_UNREADABLE_MESSAGE,
  BACKUP_UNSUPPORTED_VERSION_MESSAGE,
  backupFileName,
  isBackupTooLarge,
  isSupportedBackupVersion,
  parseBackupText,
  saveJsonFile,
} from '../lib/backup'
import { ConfirmDialog } from './ConfirmDialog'

type Props = {
  onRestored: () => void // 読み込めたとき（ボードの取り直しに使う）
}

// いま出している窓。確認（読み込んでよいか）か、お知らせ（読み込めない、失敗した）
type Dialog = { kind: 'confirm'; file: BackupFile } | { kind: 'notice'; message: string }

const CONFIRM_MESSAGE = '現在のデータは、すべて置き換わります。よろしいですか？'

// 「バックアップ」（ファイルに保存）と「読み込み」（ファイルから元に戻す）のボタン
export function BackupControls({ onRestored }: Props) {
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [busy, setBusy] = useState(false) // 通信中
  const [done, setDone] = useState<string | null>(null) // 成功のお知らせ
  const fileInput = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false) // 二重に押されるのを防ぐ

  async function handleBackup() {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setDone(null)
    try {
      saveJsonFile(await fetchBackup(), backupFileName())
    } catch (e) {
      setDialog({ kind: 'notice', message: e instanceof Error ? e.message : 'バックアップに失敗しました' })
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  // ファイルが選ばれたら、大きさを調べ、読んで、軽く調べる。読めなければお知らせ、読めれば確認を出す
  async function handleFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const chosen = input.files?.[0]
    input.value = '' // 同じファイルを、もう一度選べるように
    if (!chosen) return
    setDone(null)
    // 大きすぎるファイルは、全部読むと画面が固まるので、読む前に断る
    if (isBackupTooLarge(chosen)) return setDialog({ kind: 'notice', message: BACKUP_TOO_LARGE_MESSAGE })
    const file = parseBackupText(await chosen.text().catch(() => ''))
    if (!file) return setDialog({ kind: 'notice', message: BACKUP_UNREADABLE_MESSAGE })
    if (!isSupportedBackupVersion(file))
      return setDialog({ kind: 'notice', message: BACKUP_UNSUPPORTED_VERSION_MESSAGE })
    setDialog({ kind: 'confirm', file })
  }

  async function handleRestore(file: BackupFile) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await restoreBackup(file)
      setDialog(null)
      setDone('バックアップを読み込みました。')
      onRestored()
    } catch (e) {
      setDialog({ kind: 'notice', message: e instanceof Error ? e.message : '読み込みに失敗しました' })
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const buttonClass =
    'rounded-lg border border-[#d5dbe8] bg-white px-3 py-1.5 hover:bg-[#f1f4fa] disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => void handleBackup()} disabled={busy} className={buttonClass}>
        バックアップ
      </button>
      <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className={buttonClass}>
        読み込み
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        aria-label="バックアップファイルを選ぶ"
        className="hidden"
        onChange={(e) => void handleFileChosen(e)}
      />

      {dialog?.kind === 'confirm' && (
        <ConfirmDialog
          title="読み込みの確認"
          message={CONFIRM_MESSAGE}
          busy={busy}
          onClose={() => setDialog(null)}
          buttons={[
            { label: 'キャンセル', onClick: () => setDialog(null), autoFocus: true },
            { label: '読み込む', tone: 'danger', onClick: () => void handleRestore(dialog.file) },
          ]}
        />
      )}
      {dialog?.kind === 'notice' && (
        <ConfirmDialog
          title="お知らせ"
          message={dialog.message}
          onClose={() => setDialog(null)}
          buttons={[{ label: '閉じる', tone: 'primary', onClick: () => setDialog(null), autoFocus: true }]}
        />
      )}
      {/* 入れ物は、いつも画面に置く。中身が変わると、読み上げソフトが知らせてくれる（出るときに入れ物ごと作ると、読まれないことがある） */}
      <div role="status">
        {done && (
          <p className="fixed right-4 bottom-4 z-40 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-green-800 shadow">
            {done}
            <button type="button" onClick={() => setDone(null)} className="text-sm underline">
              閉じる
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
