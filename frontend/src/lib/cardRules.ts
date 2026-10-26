import { isOverdue } from './date'

// カードの決まり（サーバーの入力チェックと同じ値）
export const TITLE_MAX = 255
export const DESCRIPTION_MAX = 2000

// 期限が過ぎても赤くしない列の名前
export const DONE_COLUMN_NAME = '完了'

// 期限切れの表示（赤）にするか。完了列のカードは、期限が過ぎていても赤くしない。
// columnName は、カードのいる列の名前（見つからないときは undefined）
export function isCardOverdue(dueDate: string | null, columnName: string | undefined, today: string): boolean {
  return columnName !== DONE_COLUMN_NAME && !!dueDate && isOverdue(dueDate, today)
}
