import type { Card, CardColor } from '../api/types'
import { formatDue } from '../lib/date'

// 色の名前 → 背景色（prototype/style.css の淡い色に合わせる）
const BG: Record<CardColor, string> = {
  none: 'bg-white',
  red: 'bg-[#fde4e4]',
  blue: 'bg-[#dfeafd]',
  green: 'bg-[#dff5e6]',
  yellow: 'bg-[#fdf4cf]',
  gray: 'bg-[#e7e9ee]',
}

type Props = {
  card: Card
  today: string
  overdue: boolean
}

export function CardItem({ card, today, overdue }: Props) {
  return (
    <li
      className={`${BG[card.color] ?? BG.none} rounded-lg p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
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
