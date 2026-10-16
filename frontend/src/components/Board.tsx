import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useRef, useState } from 'react'
import { moveCard as moveCardApi, sortColumnByDue } from '../api/client'
import type { Card, Column } from '../api/types'
import { CARD_BG } from '../lib/cardColors'
import { isOverdue, todayString } from '../lib/date'
import { parseCardDragId, parseColumnDropId } from '../lib/dragIds'
import { cardsOfColumn, moveCard, positionOf } from '../lib/moveCard'
import { BoardColumn } from './BoardColumn'
import { CardFace } from './CardItem'
import { CardModal } from './CardModal'

const DONE_COLUMN_NAME = '完了'

type Props = {
  columns: Column[]
  cards: Card[]
  onCardCreated: () => void
  onCardUpdated: () => void
  onCardMoved: () => void // 動かして、保存できたとき（ボードの取り直しに使う）
  dragDisabled: boolean // true のあいだは、カードを動かせない（検索で絞り込み中）
}

// 動かしている最中・保存を待っている間の並び。base は、どの cards をもとにしたか。
// 親から新しい cards（取り直した結果）が届いたら、base と違うので、自然に使われなくなる
type Pending = { base: Card[]; cards: Card[] }

export function Board({ columns, cards, onCardCreated, onCardUpdated, onCardMoved, dragDisabled }: Props) {
  const today = todayString()
  const sortedColumns = [...columns].sort((a, b) => a.sortOrder - b.sortOrder)
  const [editing, setEditing] = useState<Card | null>(null) // 編集のモーダルで開いているカード
  const [pending, setPending] = useState<Pending | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null) // いま、つかんでいるカード
  const [moveError, setMoveError] = useState<string | null>(null) // 動かす・並べ替えの失敗
  const [sortingColumnId, setSortingColumnId] = useState<number | null>(null) // 期限順に並べ直している列
  const justDraggedRef = useRef(false) // ドラッグの直後に、「押した」と誤って受け取らないため

  // 画面に出す並び。動かした直後は、保存の結果を待たずに、先に動かした状態を見せる
  const shownCards = pending && pending.base === cards ? pending.cards : cards
  const activeCard = activeId === null ? null : (shownCards.find((c) => c.id === activeId) ?? null)

  const sensors = useSensors(
    // 5px 動くまでは「押した」扱い（モーダルが開く）。それ以上動かしたら「つかんだ」扱い
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // キーボード：スペースでつかむ・置く、矢印で動かす、Esc で取り消す（Enter は、モーダルを開くために空けておく）
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )

  function openCard(card: Card) {
    if (!justDraggedRef.current) setEditing(card)
  }

  function finishDrag() {
    setActiveId(null)
    justDraggedRef.current = true
    setTimeout(() => (justDraggedRef.current = false), 100)
  }

  // 落とした先（カードの上、または列の上）が、「どの列の何番目」かを調べる
  function targetOf(over: NonNullable<DragEndEvent['over']>): { columnId: number; index: number } | null {
    const overCardId = parseCardDragId(over.id)
    if (overCardId !== null) return positionOf(shownCards, overCardId)
    const columnId = parseColumnDropId(over.id)
    if (columnId === null) return null
    return { columnId, index: cardsOfColumn(shownCards, columnId).length } // 列の上なら、一番下
  }

  function handleDragStart({ active }: DragStartEvent) {
    setMoveError(null)
    setActiveId(parseCardDragId(active.id))
  }

  // 別の列の上に来たら、その列に入れて見せる（列の中の並びの入れ替えは、dnd-kit に任せる）
  function handleDragOver({ active, over }: DragOverEvent) {
    const id = parseCardDragId(active.id)
    const current = id === null ? null : positionOf(shownCards, id)
    const target = over ? targetOf(over) : null
    if (id === null || !current || !target || target.columnId === current.columnId) return
    setPending({ base: cards, cards: moveCard(shownCards, id, target.columnId, target.index) })
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    finishDrag()
    const id = parseCardDragId(active.id)
    const target = over ? targetOf(over) : null
    // どこの上でもないとき（closestCorners では、まず起こらない）は、元の位置に戻す。
    // 列の外で離したときは、いちばん近い列に入る。つかんでいる間の Esc は、onDragCancel で取り消す
    if (id === null || !target) {
      setPending(null)
      return
    }
    const next = moveCard(shownCards, id, target.columnId, target.index)
    const start = positionOf(cards, id)
    const end = positionOf(next, id)
    if (!start || !end || (start.columnId === end.columnId && start.index === end.index)) {
      setPending(null) // 元の場所に置いたので、何もしない
      return
    }
    setPending({ base: cards, cards: next })
    try {
      await moveCardApi(id, end)
      onCardMoved()
    } catch (e) {
      setPending(null) // 保存できなかったので、元の並びに戻す
      setMoveError(e instanceof Error ? e.message : 'カードを動かせませんでした')
      onCardMoved()
    }
  }

  // 「期限順」ボタン：サーバーに並べ直して保存してもらい、できたらボードを取り直す
  // （絞り込み中でも、取り直すときに、同じ絞り込みの結果になる）
  async function handleSortByDue(columnId: number) {
    if (sortingColumnId !== null) return
    setSortingColumnId(columnId)
    setMoveError(null)
    try {
      await sortColumnByDue(columnId)
      onCardMoved()
    } catch (e) {
      setMoveError(e instanceof Error ? e.message : '並べ替えに失敗しました')
    } finally {
      setSortingColumnId(null)
    }
  }

  function handleDragCancel() {
    finishDrag()
    setPending(null)
  }

  const titleOf = (id: unknown) => shownCards.find((c) => c.id === parseCardDragId(id))?.title ?? 'カード'
  const announcements: Announcements = {
    onDragStart: ({ active }) => `「${titleOf(active.id)}」をつかみました`,
    onDragOver: ({ active, over }) => {
      if (!over) return undefined
      const column = columns.find((c) => c.id === parseColumnDropId(over.id))
      return column
        ? `「${titleOf(active.id)}」が列「${column.name}」の上にあります`
        : `「${titleOf(active.id)}」が「${titleOf(over.id)}」の位置にあります`
    },
    onDragEnd: ({ active }) => `「${titleOf(active.id)}」を置きました`,
    onDragCancel: ({ active }) => `「${titleOf(active.id)}」の移動を取り消しました`,
  }

  const columnOfCard = (card: Card) => columns.find((c) => c.id === card.columnId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={(event) => void handleDragEnd(event)}
      onDragCancel={handleDragCancel}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'スペースキーでカードをつかみ、矢印キーで動かして、もう一度スペースキーで置きます。Escキーで取り消します。',
        },
      }}
    >
      {moveError && (
        <p role="alert" className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          {moveError}
        </p>
      )}
      <div className="flex items-start gap-4 overflow-x-auto p-6">
        {sortedColumns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            cards={shownCards.filter((card) => card.columnId === column.id)}
            today={today}
            onCardCreated={onCardCreated}
            onCardOpen={openCard}
            dragDisabled={dragDisabled}
            onSortByDue={(id) => void handleSortByDue(id)}
            sorting={sortingColumnId !== null}
          />
        ))}
        {editing && (
          <CardModal
            // カードが変わったら、入力の状態を作り直す
            key={editing.id}
            card={editing}
            onSaved={onCardUpdated}
            onClose={() => setEditing(null)}
          />
        )}
      </div>
      {/* つかんで動かしているカード（マウスについてくる）。元の場所のカードは、半透明で残る */}
      <DragOverlay>
        {activeCard && (
          <div className={`${CARD_BG[activeCard.color] ?? CARD_BG.none} cursor-grabbing rounded-lg p-3 shadow-lg`}>
            <CardFace
              card={activeCard}
              today={today}
              overdue={
                columnOfCard(activeCard)?.name !== DONE_COLUMN_NAME &&
                !!activeCard.dueDate &&
                isOverdue(activeCard.dueDate, today)
              }
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
