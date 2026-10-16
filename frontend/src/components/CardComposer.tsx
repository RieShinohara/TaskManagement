import { useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { createCard } from '../api/client'
import type { CardColor } from '../api/types'
import { CARD_BG } from '../lib/cardColors'
import { todayString } from '../lib/date'
import { ColorPicker } from './ColorPicker'
import { DuePicker } from './DuePicker'

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
  const today = todayString()

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
    }
  }

  // Esc は、入力欄でも期限のボタンでも、取り消す（カレンダーを開いているときは、カレンダーが先に受け取る）
  function handleContainerKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') onClose()
  }

  // 入力欄の外に出たとき：入力があれば追加、空なら閉じる（色や期限の操作では閉じない）
  function handleBlur(e: FocusEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget)) return
    void submit()
  }

  return (
    <div onBlur={handleBlur} onKeyDown={handleContainerKeyDown} className={`${CARD_BG[color]} rounded-lg p-3 shadow-md`}>
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
        <ColorPicker value={color} onChange={setColor} />
        <DuePicker value={dueDate} today={today} onChange={setDueDate} />
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
