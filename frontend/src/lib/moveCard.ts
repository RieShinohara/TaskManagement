import type { Card } from '../api/types'

// カードの並べ替えの計算。画面を使わない「ただの関数」（バックエンドの moveCard と同じ考え方）

// 列のカードを、上から順に返す（position が同じときは、id の順）
export function cardsOfColumn(cards: Card[], columnId: number): Card[] {
  return cards.filter((c) => c.columnId === columnId).sort((a, b) => a.position - b.position || a.id - b.id)
}

// カードの今の場所（列と、列の中の位置。0が一番上）。ないカードは null
export function positionOf(cards: Card[], cardId: number): { columnId: number; index: number } | null {
  const card = cards.find((c) => c.id === cardId)
  if (!card) return null
  return { columnId: card.columnId, index: cardsOfColumn(cards, card.columnId).findIndex((c) => c.id === cardId) }
}

// カードを、指定の列の toIndex 番目へ動かした結果を返す（元の配列は変えない）。
// 動かす前の列と、動かした先の列の position は、0,1,2,… の連番に振り直す（サーバーと同じ）。
// toIndex が大きすぎるときは、一番下に入れる
export function moveCard(cards: Card[], cardId: number, toColumnId: number, toIndex: number): Card[] {
  const card = cards.find((c) => c.id === cardId)
  if (!card) return cards

  const fromColumnId = card.columnId
  const source = cardsOfColumn(cards, fromColumnId).filter((c) => c.id !== cardId)
  const destination = fromColumnId === toColumnId ? source : cardsOfColumn(cards, toColumnId)
  const index = Math.max(0, Math.min(toIndex, destination.length))
  destination.splice(index, 0, { ...card, columnId: toColumnId })

  const renumbered = new Map<number, Card>()
  const renumber = (list: Card[]) => list.forEach((c, i) => renumbered.set(c.id, { ...c, position: i }))
  renumber(destination)
  if (destination !== source) renumber(source)
  return cards.map((c) => renumbered.get(c.id) ?? c)
}
