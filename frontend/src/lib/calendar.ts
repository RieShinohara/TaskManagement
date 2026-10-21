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

// ---------- キーボードで、日付を動かす計算 ----------

function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function yearMonthOf(date: string): YearMonth {
  return parseYearMonth(date)
}

// days 日あとの日付（前なら、マイナス）。月・年をまたいでも、うるう日があっても、正しく数える
export function shiftDate(date: string, days: number): string {
  return toDateString(new Date(parseDate(date).getTime() + days * DAY_MS))
}

// 同じ日のまま、前の月（delta = -1）・次の月（delta = 1）の日付。その日がない月（31日 → 30日の月など）は、その月の最後の日
export function shiftMonthOfDate(date: string, delta: number): string {
  const day = Number(date.split('-')[2])
  const { year, month } = shiftMonth(yearMonthOf(date), delta)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return toDateString(new Date(Date.UTC(year, month - 1, Math.min(day, lastDay))))
}

// その週の日曜（週の初め）と土曜（週の終わり）
export function startOfWeek(date: string): string {
  return shiftDate(date, -parseDate(date).getUTCDay())
}

export function endOfWeek(date: string): string {
  return shiftDate(date, 6 - parseDate(date).getUTCDay())
}
