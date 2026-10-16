import { describe, expect, test } from 'vitest'
import { monthGrid, parseYearMonth, shiftMonth } from './calendar'

describe('monthGrid', () => {
  test('6週間分（42日）で、日曜から始まる', () => {
    // 2026年10月1日は木曜。前の月の 9/27（日）から始まる
    const grid = monthGrid({ year: 2026, month: 10 })
    expect(grid).toHaveLength(42)
    expect(grid[0]).toBe('2026-09-27')
    expect(grid[4]).toBe('2026-10-01')
    expect(grid[41]).toBe('2026-11-07')
  })

  test('1日が日曜の月は、その日から始まる', () => {
    // 2026年3月1日は日曜
    expect(monthGrid({ year: 2026, month: 3 })[0]).toBe('2026-03-01')
  })

  test('うるう日を含む', () => {
    expect(monthGrid({ year: 2028, month: 2 })).toContain('2028-02-29')
    expect(monthGrid({ year: 2026, month: 2 })).not.toContain('2026-02-29')
  })

  test('年をまたぐ', () => {
    const grid = monthGrid({ year: 2026, month: 12 })
    expect(grid).toContain('2026-12-31')
    expect(grid).toContain('2027-01-01')
  })
})

describe('shiftMonth', () => {
  test('前の月・次の月', () => {
    expect(shiftMonth({ year: 2026, month: 10 }, 1)).toEqual({ year: 2026, month: 11 })
    expect(shiftMonth({ year: 2026, month: 10 }, -1)).toEqual({ year: 2026, month: 9 })
  })

  test('年をまたぐ', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
  })
})

test('parseYearMonth は、日付から年と月を取り出す', () => {
  expect(parseYearMonth('2026-10-15')).toEqual({ year: 2026, month: 10 })
})
