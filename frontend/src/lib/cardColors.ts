import type { CardColor } from '../api/types'

// 色の名前 → 背景色（prototype/style.css の淡い色に合わせる）
export const CARD_BG: Record<CardColor, string> = {
  none: 'bg-white',
  red: 'bg-[#fde4e4]',
  blue: 'bg-[#dfeafd]',
  green: 'bg-[#dff5e6]',
  yellow: 'bg-[#fdf4cf]',
  gray: 'bg-[#e7e9ee]',
}

export const CARD_COLOR_LABEL: Record<CardColor, string> = {
  none: '色なし',
  red: '赤',
  blue: '青',
  green: '緑',
  yellow: '黄',
  gray: '灰',
}
