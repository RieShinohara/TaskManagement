import type { Card, Column } from '../api/types'
import { todayString } from '../lib/date'
import { BoardColumn } from './BoardColumn'

type Props = {
  columns: Column[]
  cards: Card[]
  onCardCreated: () => void
}

export function Board({ columns, cards, onCardCreated }: Props) {
  const today = todayString()
  const sortedColumns = [...columns].sort((a, b) => a.sortOrder - b.sortOrder)
  return (
    <div className="flex items-start gap-4 overflow-x-auto p-6">
      {sortedColumns.map((column) => (
        <BoardColumn
          key={column.id}
          column={column}
          cards={cards.filter((card) => card.columnId === column.id)}
          today={today}
          onCardCreated={onCardCreated}
        />
      ))}
    </div>
  )
}
