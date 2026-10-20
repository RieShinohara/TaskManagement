import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteCard, updateCard } from '../api/client'
import type { Card, CardColor } from '../api/types'
import { todayString } from '../lib/date'
import { ColorPicker } from './ColorPicker'
import { DuePicker } from './DuePicker'

type Props = {
  card: Card
  onSaved: () => void // 保存できたとき（ボードの取り直しに使う）
  onClose: () => void // 閉じる（保存のあとも、取り消しのときも）
}

const TITLE_MAX = 255
const DESCRIPTION_MAX = 2000

// 空白だけの説明文は「なし」として扱う（バックエンドと同じ）
function normalizeDescription(text: string): string | null {
  return text.trim() === '' ? null : text
}

// カードを編集するモーダル（画面の上に重なって開く窓）
export function CardModal({ card, onSaved, onClose }: Props) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [color, setColor] = useState<CardColor>(card.color)
  const [dueDate, setDueDate] = useState(card.dueDate ?? '')
  const [saving, setSaving] = useState(false) // 保存中・削除中（通信中）
  const [confirmingDelete, setConfirmingDelete] = useState(false) // 「本当に削除しますか？」を出している
  const [error, setError] = useState<string | null>(null)
  const savingRef = useRef(false) // 二重送信を防ぐ
  const today = todayString()

  // Esc キーや窓の外で、閉じる。削除の確認を出している間は、確認だけを閉じる。通信中は、閉じない
  const dismiss = useCallback(() => {
    if (savingRef.current) return
    if (confirmingDelete) setConfirmingDelete(false)
    else onClose()
  }, [confirmingDelete, onClose])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [dismiss])

  const trimmedTitle = title.trim()
  const canSave = trimmedTitle !== '' && !saving && !confirmingDelete

  async function handleSave() {
    if (!canSave || savingRef.current) return
    const input = {
      title: trimmedTitle,
      description: normalizeDescription(description),
      color,
      dueDate: dueDate || null,
    }
    const unchanged =
      input.title === card.title &&
      input.description === card.description &&
      input.color === card.color &&
      input.dueDate === card.dueDate
    if (unchanged) {
      onClose() // 変更がなければ、通信せずに閉じる
      return
    }
    savingRef.current = true
    setSaving(true)
    setError(null)
    try {
      await updateCard(card.id, input)
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
      savingRef.current = false
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError(null)
    try {
      await deleteCard(card.id)
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました')
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    // 窓の外（暗い部分）を押したら、変更を捨てて閉じる
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- 外側を押して閉じるのはマウス向けの補助。キーボードは Esc で閉じる
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dismiss()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-modal-heading"
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
      >
        <h2 id="card-modal-heading" className="mb-4 text-lg font-bold text-gray-800">
          カードを編集
        </h2>

        <label className="block text-sm font-semibold text-gray-600" htmlFor="card-title">
          タイトル
        </label>
        <input
          id="card-title"
          autoFocus
          type="text"
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            // 日本語入力の変換を確定する Enter では、保存しない
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void handleSave()
            }
          }}
          className="mt-1 w-full rounded border border-[#d5dbe8] px-2 py-1 outline-none focus:border-blue-400"
        />
        {trimmedTitle === '' && <p className="mt-1 text-sm text-red-600">タイトルを入力してください</p>}

        <label className="mt-4 block text-sm font-semibold text-gray-600" htmlFor="card-description">
          説明文
        </label>
        <textarea
          id="card-description"
          value={description}
          maxLength={DESCRIPTION_MAX}
          rows={5}
          placeholder="説明を入力してください"
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full resize-y rounded border border-[#d5dbe8] px-2 py-1 outline-none focus:border-blue-400"
        />

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <p className="mb-1 text-sm font-semibold text-gray-600">色</p>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold text-gray-600">期限</p>
            <DuePicker value={dueDate} today={today} onChange={setDueDate} />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {confirmingDelete ? (
          // 削除の確認（モーダルの中で、ボタンの部分を入れ替える）
          <div role="alertdialog" aria-label="削除の確認" className="mt-5 rounded border border-red-200 bg-red-50 p-3">
            <p className="font-semibold text-red-800">本当に削除しますか？</p>
            <p className="mt-1 text-sm text-red-700">削除したカードは、元に戻せません。</p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmingDelete(false)}
                disabled={saving}
                className="rounded border border-[#d5dbe8] bg-white px-4 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={saving}
                className="rounded bg-red-600 px-4 py-1.5 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                削除する
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={saving}
              className="rounded border border-red-300 px-4 py-1.5 text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              削除
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded border border-[#d5dbe8] px-4 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!canSave}
                className="rounded bg-blue-600 px-4 py-1.5 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                保存
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
