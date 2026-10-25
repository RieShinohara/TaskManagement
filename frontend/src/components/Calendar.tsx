import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { endOfWeek, monthGrid, shiftDate, shiftMonthOfDate, startOfWeek, yearMonthOf } from '../lib/calendar'
import { wrapTabFocus } from '../lib/focusTrap'

type Props = {
  value: string // 選択中の日付 'YYYY-MM-DD'。未設定は ''
  today: string
  onSelect: (date: string) => void
  onClear: () => void // 「期限を外す」
  onEscape: () => void // Esc キー（カレンダーだけを閉じる）
  ready?: boolean // 見える状態になった（この時点で、フォーカスを、いまの日付に移す）。省略すると、すぐ
  focusOnOpen?: boolean // 開いたとき、フォーカスを、いまの日付に移すか。キーボードで開いたときだけ true（マウスで開いたときは、入力欄のフォーカスを奪わない）
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

// 曜日の色：日曜は赤、土曜は青
function weekdayColor(index: number): string {
  if (index === 0) return 'text-red-600'
  if (index === 6) return 'text-blue-600'
  return 'text-gray-800'
}

// 日付のマスの上で押したキーに応じて、動いた先の日付を返す（動かないキーは null）
function movedDate(key: string, date: string): string | null {
  switch (key) {
    case 'ArrowLeft':
      return shiftDate(date, -1)
    case 'ArrowRight':
      return shiftDate(date, 1)
    case 'ArrowUp':
      return shiftDate(date, -7)
    case 'ArrowDown':
      return shiftDate(date, 7)
    case 'Home':
      return startOfWeek(date) // その週の日曜
    case 'End':
      return endOfWeek(date) // その週の土曜
    case 'PageUp':
      return shiftMonthOfDate(date, -1)
    case 'PageDown':
      return shiftMonthOfDate(date, 1)
    default:
      return null
  }
}

// 月のカレンダー。日付を押すと、すぐに選ばれる（確定のボタンはない）。
// キーボードだけでも使える（WAI-ARIA の日付ピッカーの作り方）：
//   開くと、いまの日付にフォーカスが移る。矢印キーで動かし、Enter か Space で選ぶ。
//   Tab の止まる日付は、いまの1つだけ（ローヴィング tabindex）。Tab は、カレンダーの中を回る
export function Calendar({ value, today, onSelect, onClear, onEscape, ready = true, focusOnOpen = true }: Props) {
  // キーボードで動かす「いまの日付」。Tab が止まる日付も、表示する月も、これで決まる
  const [focusedDate, setFocusedDate] = useState(value || today)
  const shown = yearMonthOf(focusedDate)
  const weeks = Array.from({ length: 6 }, (_, i) => monthGrid(shown).slice(i * 7, i * 7 + 7))
  const rootRef = useRef<HTMLDivElement>(null)
  const moveFocusRef = useRef(focusOnOpen) // 次に描いたあと、いまの日付にフォーカスを移す（開いたときと、矢印キーのあと）

  // 描いたあとで、フォーカスを、いまの日付に移す。見える状態になる前（ready が false）は、移せないので待つ
  useEffect(() => {
    if (!ready || !moveFocusRef.current) return
    moveFocusRef.current = false
    rootRef.current?.querySelector<HTMLElement>(`[data-date="${focusedDate}"]`)?.focus()
  })

  // Esc キーは、カレンダーが先に受け取る（親のモーダルや入力欄まで届かせず、カレンダーだけを閉じる）
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      e.preventDefault() // 外側のモーダル（<dialog>）が、Esc で一緒に閉じないようにする
      onEscape()
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [onEscape])

  // 日付のマスの上での矢印キーなど
  function handleGridKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const next = movedDate(e.key, focusedDate)
    if (!next) return
    e.preventDefault() // 画面のスクロールなどを止める
    moveFocusRef.current = true
    setFocusedDate(next)
  }

  const navButton = 'rounded px-2 py-1 text-gray-600 hover:bg-gray-100'

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- 中を押しても、入力欄などからフォーカスを奪わないための処理と、Tab を中で回すための処理
    <div
      ref={rootRef}
      role="dialog"
      aria-label="期限日を選ぶ"
      // 中を押しても、入力欄などからフォーカスを奪わない
      onMouseDown={(e) => e.preventDefault()}
      onKeyDown={(e) => wrapTabFocus(e, rootRef.current)} // Tab は、カレンダーの中を回す（外には出ない）
      className="w-64 rounded-lg border border-[#d5dbe8] bg-white p-3 shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="前の月"
          onClick={() => setFocusedDate(shiftMonthOfDate(focusedDate, -1))}
          className={navButton}
        >
          ＜
        </button>
        {/* 月が変わったら、読み上げソフトに知らせる（aria-live） */}
        <span aria-live="polite" className="font-semibold">
          {shown.year}年{shown.month}月
        </span>
        <button
          type="button"
          aria-label="次の月"
          onClick={() => setFocusedDate(shiftMonthOfDate(focusedDate, 1))}
          className={navButton}
        >
          ＞
        </button>
      </div>

      <div
        role="grid"
        aria-label={`${shown.year}年${shown.month}月`}
        tabIndex={-1} // Tab では止まらない（止まるのは、中の、いまの日付）。grid が、キーボード操作を受ける部品であることを示す
        onKeyDown={handleGridKeyDown}
        className="text-center text-sm"
      >
        <div role="row" className="grid grid-cols-7">
          {WEEKDAYS.map((w, i) => (
            <span key={w} role="columnheader" className={`py-1 font-semibold ${weekdayColor(i)}`}>
              {w}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0]} role="row" className="grid grid-cols-7">
            {week.map((date, column) => {
              // column：0 = 日曜 … 6 = 土曜（通し番号ではなく、列の位置で、曜日を決める）
              const [y, m, d] = date.split('-').map(Number)
              const inMonth = m === shown.month
              const selected = date === value
              const isToday = date === today
              return (
                <div key={date} role="gridcell" aria-selected={selected}>
                  <button
                    type="button"
                    data-date={date}
                    aria-label={`${y}年${m}月${d}日`}
                    aria-current={isToday ? 'date' : undefined}
                    tabIndex={date === focusedDate ? 0 : -1}
                    onClick={() => onSelect(date)}
                    className={`m-0.5 w-[calc(100%-0.25rem)] rounded py-1 ${
                      selected ? 'bg-blue-600 font-semibold text-white' : `${weekdayColor(column)} hover:bg-gray-100`
                    } ${inMonth || selected ? '' : 'opacity-40'} ${isToday ? 'border border-gray-500' : 'border border-transparent'}`}
                  >
                    {d}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="mt-2 border-t border-[#e3e8f2] pt-2 text-center">
        <button type="button" onClick={onClear} className="text-sm text-gray-600 underline hover:text-gray-900">
          期限を外す
        </button>
      </div>
    </div>
  )
}
