import { useEffect } from 'react'

export type DialogButton = {
  label: string
  onClick: () => void
  tone?: 'primary' | 'danger' // 省略すると、ふつうのボタン
  autoFocus?: boolean
}

type Props = {
  title: string // 読み上げ用の名前（画面には出さない）
  message: string
  buttons: DialogButton[]
  busy?: boolean // 通信中（ボタンを押せず、Esc・窓の外でも閉じない）
  onClose: () => void // Esc や窓の外を押したとき
}

const TONE_CLASS = {
  primary: 'border-[#4f7cff] bg-[#4f7cff] text-white hover:bg-[#3f68e0]',
  danger: 'border-red-600 bg-red-600 text-white hover:bg-red-700',
  default: 'border-[#d5dbe8] bg-white text-gray-700 hover:bg-gray-50',
}

// 画面の中央に出す、小さな確認・お知らせの窓（メッセージと、いくつかのボタン）
export function ConfirmDialog({ title, message, buttons, busy = false, onClose }: Props) {
  // Esc キーで閉じる（通信中は閉じない）
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  return (
    // 窓の外（暗い部分）を押したら閉じる
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- 外側を押して閉じるのはマウス向けの補助。キーボードは Esc で閉じる
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
      >
        <p id="confirm-dialog-message" className="text-gray-800">
          {message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          {buttons.map((button) => (
            <button
              key={button.label}
              type="button"
              autoFocus={button.autoFocus}
              onClick={button.onClick}
              disabled={busy}
              className={`rounded border px-4 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 ${TONE_CLASS[button.tone ?? 'default']}`}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
