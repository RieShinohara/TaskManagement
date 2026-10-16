import { useState } from 'react'
import type { Card, Column } from '../api/types'
import { todayString } from '../lib/date'
import { BoardColumn } from './BoardColumn'
import { CardModal } from './CardModal'

type Props = {
  columns: Column[]
  cards: Card[]
  onCardCreated: () => void
  onCardUpdated: () => void
}

export function Board({ columns, cards, onCardCreated, onCardUpdated }: Props) {
  const today = todayString()
  const sortedColumns = [...columns].sort((a, b) => a.sortOrder - b.sortOrder)
  const [editing, setEditing] = useState<Card | null>(null) // 編集のモーダルで開いているカード
  return (
    <div className="flex items-start gap-4 overflow-x-auto p-6">
      {sortedColumns.map((column) => (
        <BoardColumn
          key={column.id}
          column={column}
          cards={cards.filter((card) => card.columnId === column.id)}
          today={today}
          onCardCreated={onCardCreated}
          onCardOpen={setEditing}
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
  )
}
