import type { Card } from '../api/types'
import { CARD_BG } from '../lib/cardColors'
import { formatDue } from '../lib/date'

type Props = {
  card: Card
  today: string
  overdue: boolean
  onOpen: (card: Card) => void // カードを押したとき（編集のモーダルを開く）
}

export function CardItem({ card, today, overdue, onOpen }: Props) {
  return (
    <li
      className={`${CARD_BG[card.color] ?? CARD_BG.none} rounded-lg shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <button type="button" onClick={() => onOpen(card)} className="block w-full cursor-pointer p-3 text-left">
        <span className="block break-words whitespace-pre-wrap">{card.title}</span>
        {card.dueDate && (
          <span className={`mt-1 block text-sm ${overdue ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
            {formatDue(card.dueDate, today)}
          </span>
        )}
        {card.description && (
          // 説明文があるカードの目印（三本線）。本文は、一覧には出さない
          <svg
            role="img"
            aria-label="説明あり"
            viewBox="0 0 16 16"
            className="mt-1 h-4 w-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M2 4h12M2 8h12M2 12h8" />
          </svg>
        )}
      </button>
    </li>
  )
}
