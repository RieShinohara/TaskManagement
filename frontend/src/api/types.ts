// バックエンドの ColumnResponse / CardResponse と同じ形
export type Column = {
  id: number
  name: string
  sortOrder: number
}

export const CARD_COLORS = ['none', 'red', 'blue', 'green', 'yellow', 'gray'] as const
export type CardColor = (typeof CARD_COLORS)[number]

export type Card = {
  id: number
  title: string
  description: string | null
  color: CardColor
  dueDate: string | null // 'YYYY-MM-DD'
  columnId: number
  position: number
}

// 検索の条件。空文字は「指定なし」
export type CardSearch = {
  keyword: string
  dueBefore: string
}

export const EMPTY_SEARCH: CardSearch = { keyword: '', dueBefore: '' }

// カード更新のお願いで送る内容（バックエンドの CardUpdateRequest と同じ形）。
// 編集できる4項目を、いつもまとめて送る。description と dueDate は、null で「なくす」
export type CardUpdateInput = {
  title: string
  description: string | null
  color: CardColor
  dueDate: string | null // 'YYYY-MM-DD'
}

// カード追加のお願いで送る内容（バックエンドの CardCreateRequest と同じ形）
export type CardCreateInput = {
  title: string
  columnId: number
  color: CardColor
  dueDate: string | null // 'YYYY-MM-DD'
}
