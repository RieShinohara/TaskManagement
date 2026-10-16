// カレンダーの計算。日付は 'YYYY-MM-DD' の文字列のまま扱う（時差でずれるのを避けるため、UTC で計算する）

export type YearMonth = { year: number; month: number } // month は 1〜12

export function parseYearMonth(date: string): YearMonth {
  const [year, month] = date.split('-').map(Number)
  return { year, month }
}

// 前の月（delta = -1）、次の月（delta = 1）
export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

function toDateString(date: Date): string {
  const y = String(date.getUTCFullYear()).padStart(4, '0')
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const DAY_MS = 24 * 60 * 60 * 1000

// その月を含む6週間分（42日）の日付。日曜から始まる。月が変わっても、カレンダーの高さが変わらない
export function monthGrid({ year, month }: YearMonth): string[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay() // 0 = 日曜
  const start = Date.UTC(year, month - 1, 1 - firstWeekday)
  return Array.from({ length: 42 }, (_, i) => toDateString(new Date(start + i * DAY_MS)))
}
