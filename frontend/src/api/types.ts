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

// 選べる背景。plain：無地、sky：青空、sunset：夕焼け、night：星空、auto：自動（時間帯）
export type Background = 'plain' | 'sky' | 'sunset' | 'night' | 'auto'

// 設定（バックエンドの SettingResponse と同じ形）
export type Settings = {
  background: Background
}

// 自分の画像を割り当てられる背景（無地と自動には、割り当てない）
export const USER_IMAGE_SLOTS = ['sky', 'sunset', 'night'] as const
export type UserImageSlot = (typeof USER_IMAGE_SLOTS)[number]

// 登録済みの自分の画像（バックエンドの BackgroundImageResponse と同じ形）。画像のデータそのものは入らない
export type UserImage = {
  slot: UserImageSlot
  updatedAt: string // 登録（置き換え）した日時。画像を取り直すかどうかの目印にする
}
