// ドラッグ＆ドロップで使う、目印（ID）。カードのIDと列のIDは、同じ数字になることがある（どちらも 1 から始まる）。
// そのまま使うと、どちらを指しているか分からなくなるので、前に文字を付けて区別する

const CARD_PREFIX = 'card-'
const COLUMN_PREFIX = 'column-'

export const cardDragId = (cardId: number) => `${CARD_PREFIX}${cardId}`
export const columnDropId = (columnId: number) => `${COLUMN_PREFIX}${columnId}`

// 目印から、数字のIDを取り出す。違う種類の目印（や知らない値）のときは null
function parse(prefix: string, id: unknown): number | null {
  if (typeof id !== 'string' || !id.startsWith(prefix)) return null
  const n = Number(id.slice(prefix.length))
  return Number.isInteger(n) ? n : null
}

export const parseCardDragId = (id: unknown) => parse(CARD_PREFIX, id)
export const parseColumnDropId = (id: unknown) => parse(COLUMN_PREFIX, id)
