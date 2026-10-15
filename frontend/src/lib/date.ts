// 日付は 'YYYY-MM-DD' の文字列のまま扱う（時差でずれるのを避けるため）

export function todayString(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

// 「期限 10月15日」。年は、今年と違うときだけ付ける
export function formatDue(dueDate: string, today: string): string {
  const [year, month, day] = dueDate.split('-').map(Number)
  const thisYear = Number(today.slice(0, 4))
  const md = `${month}月${day}日`
  return `期限 ${year === thisYear ? md : `${year}年${md}`}`
}

// 同じ形の文字列は、そのまま比べると日付の順になる
export function isOverdue(dueDate: string, today: string): boolean {
  return dueDate < today
}
