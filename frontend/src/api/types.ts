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

// カード移動のお願いで送る内容（バックエンドの CardMoveRequest と同じ形）。
// 動かした先の列と、その列の中での位置（0が一番上）。position の数値は、サーバーが決める
export type CardMoveInput = {
  columnId: number
  index: number
}

// バックアップファイルの形（バックエンドの BackupFile と同じ）。列は左から順、カードは上から順。
// 中身は、画面では作り変えない（そのまま保存し、そのまま送る）ので、細かい型は付けていない
export type BackupFile = {
  app: string
  version: number
  exportedAt?: string
  columns: unknown[]
}
