import type { Card } from '../api/types'
import { CARD_BG } from '../lib/cardColors'
import { formatDue } from '../lib/date'

type Props = {
  card: Card
  today: string
  overdue: boolean
}

export function CardItem({ card, today, overdue }: Props) {
  return (
    <li
      className={`${CARD_BG[card.color] ?? CARD_BG.none} rounded-lg p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <p className="break-words whitespace-pre-wrap">{card.title}</p>
      {card.dueDate && (
        <p className={`mt-1 text-sm ${overdue ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
          {formatDue(card.dueDate, today)}
        </p>
      )}
    </li>
  )
}
