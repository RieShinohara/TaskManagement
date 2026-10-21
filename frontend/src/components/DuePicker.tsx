import { useState } from 'react'
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
  const { open, setOpen, close, closeAndFocusTrigger, position, triggerRef, popoverRef } = usePopover()
  // カレンダーを出す場所。モーダル（<dialog>）の中にあるときは、その中に出す。
  // モーダルが開いている間、モーダルの外は、操作できない状態（inert）になるので、body に出すと、押せなくなる
  const [container, setContainer] = useState<HTMLElement>(document.body)
  // キーボード（Enter / Space）で開いたか。そのときだけ、フォーカスを、カレンダーの中に移す。
  // マウスで開いたときは、入力欄から、フォーカスを奪わない（日付を選んだあと、Enter でカードを追加できるように）
  const [openedByKeyboard, setOpenedByKeyboard] = useState(false)


  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        // 押しても、入力欄からフォーカスを外さない
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          if (open) {
            close()
            return
          }
          setOpenedByKeyboard(e.detail === 0) // Enter / Space で押したときの click は、detail が 0（マウスは 1 以上）
          setContainer(triggerRef.current?.closest('dialog') ?? document.body)
          setOpen(true)
        }}
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
            data-due-popover // 追加の入力欄が、「フォーカスが、欄の外に出た」と間違えないための目印
            // 位置が決まるまでは、見えないようにしておく（一瞬、ずれた場所に出るのを防ぐ）
            style={{ position: 'fixed', top: position?.top ?? 0, left: position?.left ?? 0 }}
            className={`z-[60] ${position ? '' : 'invisible'}`}
          >
            <Calendar
              value={value}
              today={today}
              // 位置が決まって、見える状態になってから、フォーカスを移す（見えない間は、フォーカスできない）
              ready={position !== null}
              focusOnOpen={openedByKeyboard}
              onSelect={(date) => {
                onChange(date)
                closeAndFocusTrigger()
              }}
              onClear={() => {
                onChange('')
                closeAndFocusTrigger()
              }}
              onEscape={closeAndFocusTrigger}
            />
          </div>,
          container,
        )}
    </>
  )
}
