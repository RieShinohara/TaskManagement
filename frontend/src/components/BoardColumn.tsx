import type { Card, Column } from '../api/types'
import { isOverdue } from '../lib/date'
import { CardItem } from './CardItem'

const DONE_COLUMN_NAME = '完了'

type Props = {
  column: Column
  cards: Card[]
  today: string
}

export function BoardColumn({ column, cards, today }: Props) {
  const sorted = [...cards].sort((a, b) => a.position - b.position)
  return (
    <section
      aria-label={column.name}
      className="w-80 shrink-0 rounded-xl border border-[#d8dfed] bg-[#e9edf5] p-3"
    >
      <h2 className="mb-3 px-1 text-base font-bold text-gray-800">{column.name}</h2>
      {sorted.length === 0 ? (
        <p className="px-1 py-4 text-sm text-gray-500">カードがありません</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              today={today}
              // 完了列のカードは、期限が過ぎていても赤くしない
              overdue={column.name !== DONE_COLUMN_NAME && !!card.dueDate && isOverdue(card.dueDate, today)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
