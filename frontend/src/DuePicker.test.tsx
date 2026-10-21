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
  expect(within(calendar).getByRole('gridcell', { selected: true })).toContainElement(
    within(calendar).getByRole('button', { name: '2027年1月15日' }),
  )
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

// ---------- キーボードだけで使える（品質チェック F6。WAI-ARIA の日付ピッカーの作り方） ----------

const focusedDay = () => document.activeElement?.getAttribute('aria-label')
const triggerButton = () => screen.getByRole('button', { name: /^期限/ })

async function openByKeyboard(user: ReturnType<typeof userEvent.setup>) {
  triggerButton().focus()
  await user.keyboard('{Enter}')
}

test('Enter で開くと、フォーカスが、選択中の日付に移る（未設定なら、今日）', async () => {
  const user = userEvent.setup()
  const { unmount } = render(<Harness initial="2027-01-15" />)
  await openByKeyboard(user)
  expect(screen.getByRole('dialog', { name: '期限日を選ぶ' })).toBeInTheDocument()
  expect(focusedDay()).toBe('2027年1月15日')
  unmount()

  render(<Harness />)
  await openByKeyboard(user)
  expect(focusedDay()).toBe('2026年10月15日')
})

test('矢印キーで、1日・1週間ずつ動き、Home / End で、週の初め・終わりに動く', async () => {
  const user = userEvent.setup()
  render(<Harness />) // 今日は 2026年10月15日（木）
  await openByKeyboard(user)

  await user.keyboard('{ArrowRight}')
  expect(focusedDay()).toBe('2026年10月16日')
  await user.keyboard('{ArrowDown}')
  expect(focusedDay()).toBe('2026年10月23日')
  await user.keyboard('{ArrowLeft}')
  expect(focusedDay()).toBe('2026年10月22日')
  await user.keyboard('{ArrowUp}')
  expect(focusedDay()).toBe('2026年10月15日')
  await user.keyboard('{Home}')
  expect(focusedDay()).toBe('2026年10月11日') // 日曜
  await user.keyboard('{End}')
  expect(focusedDay()).toBe('2026年10月17日') // 土曜
})

test('月の端を越えて動くと、表示する月も変わる。PageUp / PageDown で、月ごとに動く', async () => {
  const user = userEvent.setup()
  render(<Harness initial="2026-10-31" />)
  await openByKeyboard(user)
  const calendar = screen.getByRole('dialog', { name: '期限日を選ぶ' })
  expect(within(calendar).getByText('2026年10月')).toBeInTheDocument()

  await user.keyboard('{ArrowRight}') // 11月1日
  expect(focusedDay()).toBe('2026年11月1日')
  expect(within(calendar).getByText('2026年11月')).toBeInTheDocument()

  await user.keyboard('{PageUp}') // 前の月の、同じ日
  expect(focusedDay()).toBe('2026年10月1日')
  await user.keyboard('{PageDown}{PageDown}')
  expect(focusedDay()).toBe('2026年12月1日')
})

test('Tab の止まる場所は、日付は、いまの1つだけ。カレンダーの中を回って、外には出ない', async () => {
  const user = userEvent.setup()
  render(
    <div>
      <Harness />
      <button type="button">カレンダーの外のボタン</button>
    </div>,
  )
  await openByKeyboard(user)
  const calendar = screen.getByRole('dialog', { name: '期限日を選ぶ' })
  const days = within(calendar).getAllByRole('button', { name: /^\d+年\d+月\d+日$/ })
  expect(days.filter((day) => day.tabIndex === 0)).toHaveLength(1)

  await user.tab() // 日付 → 「期限を外す」
  expect(document.activeElement).toBe(within(calendar).getByRole('button', { name: '期限を外す' }))
  await user.tab() // いちばん後ろから、いちばん前（「前の月」）に戻る
  expect(document.activeElement).toBe(within(calendar).getByRole('button', { name: '前の月' }))
  await user.tab({ shift: true }) // いちばん前から、いちばん後ろ（「期限を外す」）に戻る
  expect(document.activeElement).toBe(within(calendar).getByRole('button', { name: '期限を外す' }))
  expect(screen.getByRole('button', { name: 'カレンダーの外のボタン' })).not.toHaveFocus()
})

test('Enter か Space で日付を選ぶと、カレンダーが閉じて、フォーカスが、期限のボタンに戻る', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  await openByKeyboard(user)
  await user.keyboard('{ArrowRight}{Enter}')

  expect(screen.queryByRole('dialog', { name: '期限日を選ぶ' })).not.toBeInTheDocument()
  expect(value()).toBe('2026-10-16')
  expect(triggerButton()).toHaveFocus()

  await user.keyboard('{Enter}') // 開き直す。選択中の 10/16 にフォーカス
  expect(focusedDay()).toBe('2026年10月16日')
  await user.keyboard('{ArrowDown} ') // Space で選ぶ
  expect(value()).toBe('2026-10-23')
  expect(triggerButton()).toHaveFocus()
})

test('Esc で閉じると、何も選ばず、フォーカスが、期限のボタンに戻る', async () => {
  const user = userEvent.setup()
  render(<Harness initial="2026-10-20" />)
  await openByKeyboard(user)
  await user.keyboard('{ArrowRight}{Escape}')

  expect(screen.queryByRole('dialog', { name: '期限日を選ぶ' })).not.toBeInTheDocument()
  expect(value()).toBe('2026-10-20')
  expect(triggerButton()).toHaveFocus()
})

test('「期限を外す」も、キーボードで押せる。外したあと、フォーカスは、期限のボタンに戻る', async () => {
  const user = userEvent.setup()
  render(<Harness initial="2026-10-20" />)
  await openByKeyboard(user)
  await user.tab() // 日付 → 「期限を外す」
  await user.keyboard('{Enter}')

  expect(value()).toBe('')
  expect(triggerButton()).toHaveFocus()
})

test('カレンダーは、表（grid）として読み上げられる。月の名前が、表の名前になる', async () => {
  const user = userEvent.setup()
  render(<Harness initial="2026-10-20" />)
  await openByKeyboard(user)

  const grid = screen.getByRole('grid', { name: '2026年10月' })
  expect(within(grid).getAllByRole('columnheader')).toHaveLength(7)
  expect(within(grid).getAllByRole('row')).toHaveLength(7) // 曜日の行 + 6週間
  expect(within(grid).getAllByRole('gridcell')).toHaveLength(42)
  expect(within(grid).getByRole('gridcell', { selected: true })).toHaveTextContent('20')
  expect(within(grid).getByRole('button', { name: '2026年10月15日' })).toHaveAttribute('aria-current', 'date') // 今日
})
