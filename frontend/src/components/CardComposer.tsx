import { useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { createCard } from '../api/client'
import { CARD_COLORS, type CardColor } from '../api/types'
import { CARD_BG, CARD_COLOR_LABEL } from '../lib/cardColors'

type Props = {
  columnId: number
  onCreated: () => void // 追加できたとき（ボードの取り直しに使う）
  onClose: () => void // 入力欄を閉じる
}

// 列の一番上に出る、カード追加用の入力欄
export function CardComposer({ columnId, onCreated, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [color, setColor] = useState<CardColor>('none')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const submitting = useRef(false) // 二重送信を防ぐ

  async function submit() {
    if (submitting.current) return
    if (title.trim() === '') {
      onClose() // 空のときは、何も追加せずに閉じる
      return
    }
    submitting.current = true
    setError(null)
    try {
      await createCard({ title: title.trim(), columnId, color, dueDate: dueDate || null })
      onCreated()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '追加に失敗しました')
    } finally {
      submitting.current = false
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // 日本語入力の変換を確定する Enter では、追加しない
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void submit()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  // 入力欄の外に出たとき：入力があれば追加、空なら閉じる（色や期限の操作では閉じない）
  function handleBlur(e: FocusEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget)) return
    void submit()
  }

  return (
    <div onBlur={handleBlur} className={`${CARD_BG[color]} rounded-lg p-3 shadow-md`}>
      <input
        autoFocus
        type="text"
        value={title}
        maxLength={255}
        aria-label="タイトル"
        placeholder="タイトルを入力してください"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full rounded border border-[#d5dbe8] bg-white px-2 py-1 outline-none focus:border-blue-400"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="色" className="flex gap-1">
          {CARD_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={CARD_COLOR_LABEL[c]}
              aria-pressed={color === c}
              // ボタンを押しても、入力欄からフォーカスを外さない
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setColor(c)}
              className={`${CARD_BG[c]} h-5 w-5 rounded-full border ${
                color === c ? 'border-2 border-gray-700' : 'border-gray-300'
              }`}
            />
          ))}
        </div>
        <input
          type="date"
          aria-label="期限"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          onKeyDown={handleKeyDown}
          className="rounded border border-[#d5dbe8] bg-white px-1 text-sm"
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">Enterで追加　Escで取り消し</p>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
