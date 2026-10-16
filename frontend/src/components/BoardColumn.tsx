import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useState } from 'react'
import type { Card, Column } from '../api/types'
import { isOverdue } from '../lib/date'
import { cardDragId, columnDropId } from '../lib/dragIds'
import { CardComposer } from './CardComposer'
import { CardItem } from './CardItem'

const DONE_COLUMN_NAME = '完了'

type Props = {
  column: Column
  cards: Card[]
  today: string
  onCardCreated: () => void
  onCardOpen: (card: Card) => void
  dragDisabled: boolean
  onSortByDue: (columnId: number) => void // 「期限順」ボタンを押したとき
  sorting: boolean // この列を並び直している最中（ボタンを押せなくする）
}

export function BoardColumn({
  column,
  cards,
  today,
  onCardCreated,
  onCardOpen,
  dragDisabled,
  onSortByDue,
  sorting,
}: Props) {
  const [adding, setAdding] = useState(false)
  const sorted = [...cards].sort((a, b) => a.position - b.position)
  // 列全体を、カードを落とせる場所にする（カードが1枚もない列にも、落とせるように）
  const { setNodeRef } = useDroppable({ id: columnDropId(column.id), disabled: dragDisabled })
  return (
    <section
      ref={setNodeRef}
      aria-label={column.name}
      className="w-80 shrink-0 rounded-xl border border-[#d8dfed] bg-[#e9edf5] p-3"
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-gray-800">{column.name}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`${column.name}を期限順に並べ替え`}
            onClick={() => onSortByDue(column.id)}
            disabled={sorting}
            className="rounded border border-[#d5dbe8] bg-white px-2 py-0.5 text-sm text-gray-600 hover:bg-[#f1f4fa] hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            期限順
          </button>
          <button
            type="button"
            aria-label={`${column.name}にカードを追加`}
            onClick={() => setAdding(true)}
            className="rounded px-2 text-xl leading-none text-gray-600 hover:bg-white hover:text-blue-600"
          >
            ＋
          </button>
        </div>
      </div>
      {adding && (
        <div className="mb-2">
          <CardComposer columnId={column.id} onCreated={onCardCreated} onClose={() => setAdding(false)} />
        </div>
      )}
      <SortableContext items={sorted.map((card) => cardDragId(card.id))} strategy={verticalListSortingStrategy}>
        {sorted.length === 0 ? (
          <p className="px-1 py-4 text-sm text-gray-500">カードがありません</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sorted.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                today={today}
                onOpen={onCardOpen}
                dragDisabled={dragDisabled}
                // 完了列のカードは、期限が過ぎていても赤くしない
                overdue={column.name !== DONE_COLUMN_NAME && !!card.dueDate && isOverdue(card.dueDate, today)}
              />
            ))}
          </ul>
        )}
      </SortableContext>
    </section>
  )
}
