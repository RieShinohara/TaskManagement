import { describe, expect, test } from 'vitest'
import { DONE_COLUMN_NAME, isCardOverdue } from './cardRules'

describe('isCardOverdue', () => {
  const today = '2026-10-15'

  test('完了列でなく、期限が今日より前なら、期限切れ', () => {
    expect(isCardOverdue('2026-10-14', 'やること', today)).toBe(true)
  })
  test('期限が今日か先なら、期限切れではない', () => {
    expect(isCardOverdue('2026-10-15', 'やること', today)).toBe(false)
    expect(isCardOverdue('2026-10-16', 'やること', today)).toBe(false)
  })
  test('期限がなければ、期限切れではない', () => {
    expect(isCardOverdue(null, 'やること', today)).toBe(false)
  })
  test('完了列のカードは、期限が過ぎていても期限切れにしない', () => {
    expect(isCardOverdue('2026-10-14', DONE_COLUMN_NAME, today)).toBe(false)
  })
  test('列が見つからないとき(undefined)は、完了列ではないとして判定する', () => {
    expect(isCardOverdue('2026-10-14', undefined, today)).toBe(true)
  })
})
