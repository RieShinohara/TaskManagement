import type { Background } from '../api/types'

// 背景まわりの、画面を使わない関数

// 実際に画面に出す背景の「場面」。自動（auto）は、時間帯で、青空・夕焼け・星空のどれかになる
export type Scene = 'plain' | 'sky' | 'sunset' | 'night'

// 列や文字の色合い。plain：背景なし（今までどおり）、light：明るい背景（列を少し透けさせる）、dark：暗い背景（列を暗い紺色に）
export type Tone = 'plain' | 'light' | 'dark'

// 選択の窓に並べる、5つの選択肢（この順番で表示する）
export const BACKGROUND_OPTIONS: { value: Background; label: string }[] = [
  { value: 'plain', label: '無地' },
  { value: 'sky', label: '青空' },
  { value: 'sunset', label: '夕焼け' },
  { value: 'night', label: '星空' },
  { value: 'auto', label: '自動（時間帯）' },
]

// 自動の時刻を見直す間隔（ミリ秒）。画面を開いたままでも、時間が来たら切り替わる
export const AUTO_CHECK_INTERVAL_MS = 30_000

export function isBackground(value: unknown): value is Background {
  return BACKGROUND_OPTIONS.some((option) => option.value === value)
}

// 自動（時間帯）：5時〜16時は青空、16時〜18時は夕焼け、18時〜翌5時は星空（5:00 は青空、16:00 は夕焼け、18:00 は星空）
export function sceneAt(now: Date): Exclude<Scene, 'plain'> {
  const hour = now.getHours()
  if (hour >= 5 && hour < 16) return 'sky'
  if (hour >= 16 && hour < 18) return 'sunset'
  return 'night'
}

// 選んだ背景から、いま出す場面を決める
export function resolveScene(background: Background, now: Date): Scene {
  return background === 'auto' ? sceneAt(now) : background
}

export function toneOf(scene: Scene): Tone {
  if (scene === 'plain') return 'plain'
  return scene === 'night' ? 'dark' : 'light'
}
