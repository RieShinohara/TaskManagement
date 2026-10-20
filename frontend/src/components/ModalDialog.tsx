import { useEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  onDismiss: () => void // Esc キーや、窓の外（暗い部分）を押したとき
  role?: 'dialog' | 'alertdialog'
  label?: string // 読み上げ用の名前（見出しがないときに使う）
  labelledBy?: string // 名前になる見出しの id
  describedBy?: string // 説明になる文の id
  className?: string // 窓の幅などの指定
  children: ReactNode
}

// 画面の中央に出す、モーダル（後ろの画面を操作できなくする窓）の共通部分。
// HTML 標準の <dialog> を、showModal() で開く。ブラウザが、次のことを自動でしてくれる：
//   ・フォーカスを窓の中に閉じ込める（Tab が、後ろの画面に出ない）
//   ・後ろの画面を、操作できない状態（inert）にする
//   ・暗い背景（::backdrop）を出す
// 閉じるときに、フォーカスを、開く前の場所（押したカードなど）に戻す
export function ModalDialog({ onDismiss, role, label, labelledBy, describedBy, className = '', children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // 開く前にフォーカスがあった場所。描く前に覚える（中の autoFocus が、先にフォーカスを奪うため）
  const [opener] = useState(() => document.activeElement)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    return () => {
      dialog.close()
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [opener])

  return (
    // 窓の外（暗い背景）を押したら閉じる。dialog 自身が押されたとき＝背景を押したとき（中身は、内側の div が覆っている）
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- 外側を押して閉じるのはマウス向けの補助。キーボードは Esc で閉じる
    <dialog
      ref={dialogRef}
      role={role}
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      // Esc は、そのまま閉じさせず、onDismiss に任せる（通信中は閉じない、など。閉じるかどうかは、呼ぶ側が決める）
      onCancel={(e) => {
        e.preventDefault()
        onDismiss()
      }}
      // ブラウザの都合で、閉じられてしまったとき（Esc を続けて押したときなど）は、開き直す
      onClose={(e) => {
        if (!e.currentTarget.open) e.currentTarget.showModal()
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss()
      }}
      className={`m-auto bg-transparent p-0 text-gray-800 backdrop:bg-black/40 ${className}`}
    >
      <div className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl bg-white p-5 shadow-xl">{children}</div>
    </dialog>
  )
}
