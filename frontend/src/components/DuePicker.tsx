import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatDue } from '../lib/date'
import { Calendar } from './Calendar'

type Props = {
  value: string // 'YYYY-MM-DD'。未設定は ''
  today: string
  onChange: (date: string) => void // '' は「期限を外す」
}

const GAP = 4 // 欄とカレンダーの間
const MARGIN = 8 // 画面の端との間

// 期限の欄。押すと、すぐ下にカレンダーが開く。下に入らないときは、上に開く。
// カレンダーは、画面に固定して（fixed）、body の直下に出す。列やモーダルの枠で、切り取られないようにするため
export function DuePicker({ value, today, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // カレンダーを置く位置を決める。画面からはみ出さないようにする
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !popoverRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const { width, height } = popoverRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - trigger.bottom - GAP - MARGIN
    const spaceAbove = trigger.top - GAP - MARGIN
    // 下に入らず、上のほうが広いときだけ、上に出す
    const placeAbove = height > spaceBelow && spaceAbove > spaceBelow
    const wantedTop = placeAbove ? trigger.top - GAP - height : trigger.bottom + GAP
    const top = Math.max(MARGIN, Math.min(wantedTop, window.innerHeight - height - MARGIN))
    const left = Math.max(MARGIN, Math.min(trigger.left, window.innerWidth - width - MARGIN))
    setPosition({ top, left })
  }, [])

  // 開いたとき（描く前）に位置を決める。開いている間に、画面の大きさやスクロールが変わったら、決め直す
  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  // カレンダーの外を押したら、何も選ばずに閉じる（期限の欄を押したときは、欄の側で開け閉めする）
  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  function close() {
    setOpen(false)
    setPosition(null)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        // 押しても、入力欄からフォーカスを外さない
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? close() : setOpen(true))}
        className={`rounded border border-[#d5dbe8] bg-white px-2 py-0.5 text-sm hover:bg-gray-50 ${
          value ? 'text-gray-800' : 'text-gray-500'
        }`}
      >
        {value ? formatDue(value, today) : '期限なし'}
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            // 位置が決まるまでは、見えないようにしておく（一瞬、ずれた場所に出るのを防ぐ）
            style={{ position: 'fixed', top: position?.top ?? 0, left: position?.left ?? 0 }}
            className={`z-[60] ${position ? '' : 'invisible'}`}
          >
            <Calendar
              value={value}
              today={today}
              onSelect={(date) => {
                onChange(date)
                close()
              }}
              onClear={() => {
                onChange('')
                close()
              }}
              onEscape={close}
            />
          </div>,
          document.body,
        )}
    </>
  )
}
