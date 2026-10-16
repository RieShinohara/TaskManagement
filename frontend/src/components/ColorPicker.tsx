import { CARD_COLORS, type CardColor } from '../api/types'
import { CARD_BG, CARD_COLOR_LABEL } from '../lib/cardColors'

type Props = {
  value: CardColor
  onChange: (color: CardColor) => void
}

// 色見本（6つ）。カードの追加の入力欄と、編集のモーダルで共通に使う
export function ColorPicker({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="色" className="flex gap-1">
      {CARD_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={CARD_COLOR_LABEL[c]}
          aria-pressed={value === c}
          // ボタンを押しても、入力欄からフォーカスを外さない
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange(c)}
          className={`${CARD_BG[c]} h-5 w-5 rounded-full border ${
            value === c ? 'border-2 border-gray-700' : 'border-gray-300'
          }`}
        />
      ))}
    </div>
  )
}
