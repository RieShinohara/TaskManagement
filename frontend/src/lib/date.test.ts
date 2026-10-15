import { describe, expect, test } from 'vitest'
import { formatDue, isOverdue, todayString } from './date'

describe('formatDue', () => {
  test('今年の期限は、年を付けない', () => {
    expect(formatDue('2026-10-05', '2026-10-15')).toBe('期限 10月5日')
  })
  test('今年と違う年は、年を付ける', () => {
    expect(formatDue('2027-01-02', '2026-10-15')).toBe('期限 2027年1月2日')
  })
})

describe('isOverdue', () => {
  test('今日より前は期限切れ、今日と先は期限切れではない', () => {
    expect(isOverdue('2026-10-14', '2026-10-15')).toBe(true)
    expect(isOverdue('2026-10-15', '2026-10-15')).toBe(false)
    expect(isOverdue('2026-10-16', '2026-10-15')).toBe(false)
  })
})

test('todayString は YYYY-MM-DD の形', () => {
  expect(todayString(new Date(2026, 0, 5))).toBe('2026-01-05')
})
