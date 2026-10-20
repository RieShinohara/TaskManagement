import { useEffect, useState } from 'react'
import { monthGrid, parseYearMonth, shiftMonth, type YearMonth } from '../lib/calendar'

type Props = {
  value: string // 選択中の日付 'YYYY-MM-DD'。未設定は ''
  today: string
  onSelect: (date: string) => void
  onClear: () => void // 「期限を外す」
  onEscape: () => void // Esc キー（カレンダーだけを閉じる）
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

// 曜日の色：日曜は赤、土曜は青
function weekdayColor(index: number): string {
  if (index === 0) return 'text-red-600'
  if (index === 6) return 'text-blue-600'
  return 'text-gray-800'
}

// 月のカレンダー。日付を押すと、すぐに選ばれる（確定のボタンはない）
export function Calendar({ value, today, onSelect, onClear, onEscape }: Props) {
  const [shown, setShown] = useState<YearMonth>(() => parseYearMonth(value || today))
  const grid = monthGrid(shown)

  // Esc キーは、カレンダーが先に受け取る（親のモーダルや入力欄まで届かせず、カレンダーだけを閉じる）
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      e.preventDefault() // 外側のモーダル（<dialog>）が、Esc で一緒に閉じないようにする
      onEscape()
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [onEscape])

  const navButton = 'rounded px-2 py-1 text-gray-600 hover:bg-gray-100'

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- 中を押しても、入力欄などからフォーカスを奪わないための処理
    <div
      role="dialog"
      aria-label="期限日を選ぶ"
      // 中を押しても、入力欄などからフォーカスを奪わない
      onMouseDown={(e) => e.preventDefault()}
      className="w-64 rounded-lg border border-[#d5dbe8] bg-white p-3 shadow-lg"
    >
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="前の月" onClick={() => setShown(shiftMonth(shown, -1))} className={navButton}>
          ＜
        </button>
        <span className="font-semibold">
          {shown.year}年{shown.month}月
        </span>
        <button type="button" aria-label="次の月" onClick={() => setShown(shiftMonth(shown, 1))} className={navButton}>
          ＞
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-sm">
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={`py-1 font-semibold ${weekdayColor(i)}`}>
            {w}
          </span>
        ))}
        {grid.map((date, i) => {
          const [y, m, d] = date.split('-').map(Number)
          const inMonth = m === shown.month
          const selected = date === value
          const isToday = date === today
          const column = i % 7 // 0 = 日曜 … 6 = 土曜（通し番号ではなく、列の位置で、曜日を決める）
          return (
            <button
              key={date}
              type="button"
              aria-label={`${y}年${m}月${d}日`}
              aria-pressed={selected}
              onClick={() => onSelect(date)}
              className={`m-0.5 rounded py-1 ${
                selected ? 'bg-blue-600 font-semibold text-white' : `${weekdayColor(column)} hover:bg-gray-100`
              } ${inMonth || selected ? '' : 'opacity-40'} ${isToday ? 'border border-gray-500' : 'border border-transparent'}`}
            >
              {d}
            </button>
          )
        })}
      </div>

      <div className="mt-2 border-t border-[#e3e8f2] pt-2 text-center">
        <button type="button" onClick={onClear} className="text-sm text-gray-600 underline hover:text-gray-900">
          期限を外す
        </button>
      </div>
    </div>
  )
}
