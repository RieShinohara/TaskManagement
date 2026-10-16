import { useState } from 'react'
import type { Card, Column } from '../api/types'
import { isOverdue } from '../lib/date'
import { CardComposer } from './CardComposer'
import { CardItem } from './CardItem'

const DONE_COLUMN_NAME = '完了'

type Props = {
  column: Column
  cards: Card[]
  today: string
  onCardCreated: () => void
  onCardOpen: (card: Card) => void
}

export function BoardColumn({ column, cards, today, onCardCreated, onCardOpen }: Props) {
  const [adding, setAdding] = useState(false)
  const sorted = [...cards].sort((a, b) => a.position - b.position)
  return (
    <section
      aria-label={column.name}
      className="w-80 shrink-0 rounded-xl border border-[#d8dfed] bg-[#e9edf5] p-3"
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-gray-800">{column.name}</h2>
        <button
          type="button"
          aria-label={`${column.name}にカードを追加`}
          onClick={() => setAdding(true)}
          className="rounded px-2 text-xl leading-none text-gray-600 hover:bg-white hover:text-blue-600"
        >
          ＋
        </button>
      </div>
      {adding && (
        <div className="mb-2">
          <CardComposer columnId={column.id} onCreated={onCardCreated} onClose={() => setAdding(false)} />
        </div>
      )}
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
              // 完了列のカードは、期限が過ぎていても赤くしない
              overdue={column.name !== DONE_COLUMN_NAME && !!card.dueDate && isOverdue(card.dueDate, today)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
