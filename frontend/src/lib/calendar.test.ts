import { describe, expect, test } from 'vitest'
import {
  endOfWeek,
  monthGrid,
  parseYearMonth,
  shiftDate,
  shiftMonthOfDate,
  startOfWeek,
  yearMonthOf,
  shiftMonth,
} from './calendar'

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

// ---------- キーボードで、日付を動かす（矢印キー、Home / End、PageUp / PageDown） ----------

describe('shiftDate', () => {
  test('1日、1週間、前後に動かす', () => {
    expect(shiftDate('2026-10-15', 1)).toBe('2026-10-16')
    expect(shiftDate('2026-10-15', -1)).toBe('2026-10-14')
    expect(shiftDate('2026-10-15', 7)).toBe('2026-10-22')
    expect(shiftDate('2026-10-15', -7)).toBe('2026-10-08')
  })

  test('月・年をまたぐ。うるう日も正しく数える', () => {
    expect(shiftDate('2026-10-31', 1)).toBe('2026-11-01')
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftDate('2027-01-01', -1)).toBe('2026-12-31')
    expect(shiftDate('2028-02-28', 1)).toBe('2028-02-29')
    expect(shiftDate('2026-02-28', 1)).toBe('2026-03-01')
  })
})

describe('shiftMonthOfDate', () => {
  test('同じ日のまま、前の月・次の月に動く', () => {
    expect(shiftMonthOfDate('2026-10-15', 1)).toBe('2026-11-15')
    expect(shiftMonthOfDate('2026-10-15', -1)).toBe('2026-09-15')
  })

  test('その日がない月は、その月の最後の日にする', () => {
    expect(shiftMonthOfDate('2026-10-31', 1)).toBe('2026-11-30')
    expect(shiftMonthOfDate('2026-03-31', -1)).toBe('2026-02-28')
    expect(shiftMonthOfDate('2028-03-31', -1)).toBe('2028-02-29')
  })

  test('年をまたぐ', () => {
    expect(shiftMonthOfDate('2026-12-15', 1)).toBe('2027-01-15')
    expect(shiftMonthOfDate('2026-01-15', -1)).toBe('2025-12-15')
  })
})

describe('startOfWeek / endOfWeek', () => {
  test('その週の日曜と土曜（週は日曜から始まる）', () => {
    // 2026年10月15日は木曜
    expect(startOfWeek('2026-10-15')).toBe('2026-10-11')
    expect(endOfWeek('2026-10-15')).toBe('2026-10-17')
  })

  test('日曜は、その日が週の初め。土曜は、その日が週の終わり', () => {
    expect(startOfWeek('2026-10-11')).toBe('2026-10-11')
    expect(endOfWeek('2026-10-17')).toBe('2026-10-17')
    expect(endOfWeek('2026-10-11')).toBe('2026-10-17')
    expect(startOfWeek('2026-10-17')).toBe('2026-10-11')
  })

  test('月をまたぐ週', () => {
    // 2026年10月1日は木曜。その週の日曜は 9/27
    expect(startOfWeek('2026-10-01')).toBe('2026-09-27')
    expect(endOfWeek('2026-10-29')).toBe('2026-10-31')
  })
})

describe('yearMonthOf', () => {
  test('日付から、年と月を取り出す', () => {
    expect(yearMonthOf('2026-10-15')).toEqual({ year: 2026, month: 10 })
  })
})
