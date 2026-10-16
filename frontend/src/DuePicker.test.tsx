import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import App from './App'
import type { Card, Column } from './api/types'
import { DuePicker } from './components/DuePicker'

// 期限の欄とカレンダーのテスト

const TODAY = '2026-10-15'

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <div>
      <DuePicker value={value} today={TODAY} onChange={setValue} />
      <p data-testid="value">{value}</p>
    </div>
  )
}

const value = () => screen.getByTestId('value').textContent

test('期限が未設定のときは「期限なし」。押すと、今月のカレンダーが開く', async () => {
  const user = userEvent.setup()
  render(<Harness />)

  await user.click(screen.getByRole('button', { name: '期限なし' }))

  const calendar = screen.getByRole('dialog', { name: '期限日を選ぶ' })
  expect(within(calendar).getByText('2026年10月')).toBeInTheDocument()
  // 日付は6週間分（42日）
  expect(within(calendar).getAllByRole('button', { name: /^\d+年\d+月\d+日$/ })).toHaveLength(42)
  // 今日は枠線、曜日は日曜が赤・土曜が青
  expect(within(calendar).getByRole('button', { name: '2026年10月15日' })).toHaveClass('border-gray-500')
  expect(within(calendar).getByText('日')).toHaveClass('text-red-600')
  expect(within(calendar).getByText('土')).toHaveClass('text-blue-600')
})

test('設定済みの期限は「期限 ○月○日」。カレンダーは、その月で開き、選択済みになる', async () => {
  const user = userEvent.setup()
  render(<Harness initial="2027-01-15" />)

  await user.click(screen.getByRole('button', { name: '期限 2027年1月15日' }))

  const calendar = screen.getByRole('dialog', { name: '期限日を選ぶ' })
  expect(within(calendar).getByText('2027年1月')).toBeInTheDocument()
  expect(within(calendar).getByRole('button', { name: '2027年1月15日' })).toHaveAttribute('aria-pressed', 'true')
})

test('日付を押すと、すぐに選ばれてカレンダーが閉じる', async () => {
  const user = userEvent.setup()
  render(<Harness />)

  await user.click(screen.getByRole('button', { name: '期限なし' }))
  await user.click(screen.getByRole('button', { name: '2026年10月20日' }))

  expect(value()).toBe('2026-10-20')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '期限 10月20日' })).toBeInTheDocument()
})

test('＜＞で月を移れる（年をまたぐ）。前後の月の日付も選べる', async () => {
  const user = userEvent.setup()
  render(<Harness initial="2026-12-10" />)

  await user.click(screen.getByRole('button', { name: /^期限/ }))
  await user.click(screen.getByRole('button', { name: '次の月' }))
  expect(screen.getByText('2027年1月')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '前の月' }))
  await user.click(screen.getByRole('button', { name: '前の月' }))
  expect(screen.getByText('2026年11月')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '次の月' })) // 12月に戻る
  await user.click(screen.getByRole('button', { name: '2027年1月2日' })) // 12月の表示に出ている、翌月の日付
  expect(value()).toBe('2027-01-02')
})

test('「期限を外す」で期限がなくなる', async () => {
  const user = userEvent.setup()
  render(<Harness initial="2026-10-20" />)

  await user.click(screen.getByRole('button', { name: /^期限/ }))
  await user.click(screen.getByRole('button', { name: '期限を外す' }))

  expect(value()).toBe('')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '期限なし' })).toBeInTheDocument()
})

test('カレンダーの外を押すか、Esc を押すと、何も選ばずに閉じる', async () => {
  const user = userEvent.setup()
  render(<Harness initial="2026-10-20" />)

  await user.click(screen.getByRole('button', { name: /^期限/ }))
  await user.click(document.body)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /^期限/ }))
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(value()).toBe('2026-10-20')
})

test('欄をもう一度押すと、カレンダーが閉じる', async () => {
  const user = userEvent.setup()
  render(<Harness />)

  await user.click(screen.getByRole('button', { name: '期限なし' }))
  await user.click(screen.getByRole('button', { name: '期限なし' }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('日付の数字も、全ての週で、日曜は赤・土曜は青・平日は黒', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('button', { name: '期限なし' }))

  // 2026年10月：4日・11日・25日は日曜、10日・17日・31日は土曜、7日・14日・28日は平日
  for (const day of [4, 11, 25]) {
    expect(screen.getByRole('button', { name: `2026年10月${day}日` })).toHaveClass('text-red-600')
  }
  for (const day of [10, 17, 31]) {
    expect(screen.getByRole('button', { name: `2026年10月${day}日` })).toHaveClass('text-blue-600')
  }
  for (const day of [7, 14, 28]) {
    expect(screen.getByRole('button', { name: `2026年10月${day}日` })).toHaveClass('text-gray-800')
  }
})

// ---- カレンダーを出す位置（画面の端で、はみ出さない） ----

// jsdom には画面の大きさが無いので、欄とカレンダーの大きさを、決め打ちで返す
function stubLayout(trigger: { top: number; bottom: number; left: number }, innerHeight: number) {
  const calendarSize = { width: 256, height: 200 }
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const isTrigger = this.getAttribute('aria-haspopup') === 'dialog'
    const r = isTrigger ? { ...trigger, width: 80, height: trigger.bottom - trigger.top } : { top: 0, bottom: 0, left: 0, ...calendarSize }
    return { x: r.left, y: r.top, right: r.left + r.width, ...r, toJSON: () => ({}) } as DOMRect
  })
  vi.stubGlobal('innerHeight', innerHeight)
  vi.stubGlobal('innerWidth', 1024)
}

function popoverOf(calendar: HTMLElement) {
  return calendar.parentElement as HTMLElement
}

test('下に入るときは、欄のすぐ下に出る', async () => {
  stubLayout({ top: 100, bottom: 120, left: 40 }, 800)
  const user = userEvent.setup()
  render(<Harness />)

  await user.click(screen.getByRole('button', { name: '期限なし' }))

  const style = popoverOf(screen.getByRole('dialog', { name: '期限日を選ぶ' })).style
  expect(style.top).toBe('124px') // 欄の下端 + すき間 4px
  expect(style.left).toBe('40px')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('下に入らず、上のほうが広いときは、欄のすぐ上に出る', async () => {
  stubLayout({ top: 250, bottom: 270, left: 40 }, 300)
  const user = userEvent.setup()
  render(<Harness />)

  await user.click(screen.getByRole('button', { name: '期限なし' }))

  const style = popoverOf(screen.getByRole('dialog', { name: '期限日を選ぶ' })).style
  expect(style.top).toBe('46px') // 欄の上端 - すき間 4px - カレンダーの高さ 200px
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('上にも下にも入らないときは、画面の中に収まる位置にずらす', async () => {
  stubLayout({ top: 100, bottom: 120, left: 40 }, 180) // 画面の高さが、カレンダー（200px）より低い
  const user = userEvent.setup()
  render(<Harness />)

  await user.click(screen.getByRole('button', { name: '期限なし' }))

  const style = popoverOf(screen.getByRole('dialog', { name: '期限日を選ぶ' })).style
  expect(style.top).toBe('8px') // 画面の上端（余白 8px）まで
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('右端からはみ出さない', async () => {
  stubLayout({ top: 100, bottom: 120, left: 900 }, 800)
  const user = userEvent.setup()
  render(<Harness />)

  await user.click(screen.getByRole('button', { name: '期限なし' }))

  const style = popoverOf(screen.getByRole('dialog', { name: '期限日を選ぶ' })).style
  expect(style.left).toBe('760px') // 画面の幅 1024 - カレンダーの幅 256 - 余白 8
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ---- 編集のモーダルの中で ----

const columns: Column[] = [{ id: 1, name: 'ToDo', sortOrder: 0 }]
const cards: Card[] = [
  { id: 1, title: '牛乳を買う', description: null, color: 'none', dueDate: '2026-10-20', columnId: 1, position: 0 },
]

test('モーダルでカレンダーを開いて Esc を押すと、カレンダーだけが閉じる（もう一度押すと、モーダルが閉じる）', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve({ ok: true, json: async () => (url.startsWith('/api/columns') ? columns : cards) } as Response),
    ),
  )
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })

  await user.click(screen.getByRole('button', { name: /牛乳を買う/ }))
  await user.click(within(screen.getByRole('dialog', { name: 'カードを編集' })).getByRole('button', { name: /^期限/ }))
  expect(screen.getByRole('dialog', { name: '期限日を選ぶ' })).toBeInTheDocument()

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog', { name: '期限日を選ぶ' })).not.toBeInTheDocument()
  expect(screen.getByRole('dialog', { name: 'カードを編集' })).toBeInTheDocument()

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  vi.unstubAllGlobals()
})
