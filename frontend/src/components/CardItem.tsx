import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../api/types'
import { CARD_BG } from '../lib/cardColors'
import { formatDue } from '../lib/date'
import { cardDragId } from '../lib/dragIds'

type Props = {
  card: Card
  today: string
  overdue: boolean
  onOpen: (card: Card) => void // カードを押したとき（編集のモーダルを開く）
  dragDisabled: boolean // true のあいだは、つかんで動かせない（検索で絞り込み中）
}

// カードの中身（タイトル・期限・説明の目印）。一覧のカードと、ドラッグ中に持ち上げて見せるカードで、共通
export function CardFace({ card, today, overdue }: Pick<Props, 'card' | 'today' | 'overdue'>) {
  return (
    <>
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
    </>
  )
}

export function CardItem({ card, today, overdue, onOpen, dragDisabled }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cardDragId(card.id),
    disabled: dragDisabled,
  })
  // つかむ操作（listeners）は、中のボタンに付ける。li に付けると、リストの項目という役割が変わってしまうため。
  // 絞り込み中は、何も付けない（つかめない）
  const dragProps = dragDisabled ? {} : { ...attributes, ...listeners }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // ドラッグ中、元の場所に残るカードは半透明にする（持ち上げたカードは、DragOverlay が別に描く）
      className={`${CARD_BG[card.color] ?? CARD_BG.none} relative rounded-lg shadow-sm transition hover:shadow-md ${isDragging ? 'opacity-40' : ''}`}
    >
      {isDragging && (
        // 落とす場所を示す青い線。元の場所のカード（いまの落とし先の場所に、動いてくる）の、上のすき間に出す
        <span
          aria-hidden="true"
          data-testid="drop-indicator"
          className="pointer-events-none absolute inset-x-0 -top-[5.5px] h-[3px] rounded-full bg-blue-500"
        />
      )}
      <button
        type="button"
        onClick={() => onOpen(card)}
        {...dragProps}
        className={`block w-full p-3 text-left ${dragDisabled ? 'cursor-pointer' : 'cursor-grab'}`}
      >
        <CardFace card={card} today={today} overdue={overdue} />
      </button>
    </li>
  )
}
