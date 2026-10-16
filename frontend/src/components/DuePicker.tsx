import { createPortal } from 'react-dom'
import { usePopover } from '../hooks/usePopover'
import { formatDue } from '../lib/date'
import { Calendar } from './Calendar'

type Props = {
  value: string // 'YYYY-MM-DD'。未設定は ''
  today: string
  onChange: (date: string) => void // '' は「期限を外す」
}

// 期限の欄。押すと、すぐ下にカレンダーが開く。下に入らないときは、上に開く（位置の決め方は usePopover）。
// カレンダーは、画面に固定して（fixed）、body の直下に出す。列やモーダルの枠で、切り取られないようにするため
export function DuePicker({ value, today, onChange }: Props) {
  const { open, setOpen, close, position, triggerRef, popoverRef } = usePopover()

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
