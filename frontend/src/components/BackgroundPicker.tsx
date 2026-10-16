import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Background } from '../api/types'
import { usePopover } from '../hooks/usePopover'
import { BACKGROUND_OPTIONS } from '../lib/background'

type Props = {
  value: Background | null // いまの背景。まだ分からないときは null
  onSelect: (background: Background) => void
}

// ヘッダーの「背景」ボタン。押すと、すぐ下に、見本つきの選択肢が開く。
// 選ぶと、すぐに切り替わって閉じる。窓の外・Esc では、何も選ばずに閉じる
export function BackgroundPicker({ value, onSelect }: Props) {
  const { open, setOpen, close, position, triggerRef, popoverRef } = usePopover()

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, close])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className="rounded-lg border border-[#d5dbe8] bg-white px-3 py-1.5 hover:bg-[#f1f4fa]"
      >
        背景
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="背景を選ぶ"
            // 位置が決まるまでは、見えないようにしておく
            style={{ position: 'fixed', top: position?.top ?? 0, left: position?.left ?? 0 }}
            className={`z-[60] w-64 rounded-xl border border-[#d5dbe8] bg-white p-2 shadow-xl ${position ? '' : 'invisible'}`}
          >
            <div role="radiogroup" aria-label="背景" className="flex flex-col gap-1">
              {BACKGROUND_OPTIONS.map((option) => {
                const selected = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      onSelect(option.value)
                      close()
                    }}
                    className={`flex items-center gap-3 rounded-lg border px-2 py-1.5 text-left ${
                      selected ? 'border-[#4f7cff] bg-[#eef2fb]' : 'border-transparent hover:bg-[#f1f4fa]'
                    }`}
                  >
                    {/* 見本：背景と同じ見た目の小さな四角 */}
                    <span
                      aria-hidden="true"
                      className={`bg-scene-${option.value} block h-9 w-14 flex-none rounded-md border border-black/15`}
                    />
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
