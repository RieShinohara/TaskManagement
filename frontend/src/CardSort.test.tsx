import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'
import type { Card, Column } from './api/types'

// 列の「期限順」ボタンのテスト（画面全体を、通信をモックして動かす）

const columns: Column[] = [
  { id: 1, name: 'ToDo', sortOrder: 0 },
  { id: 2, name: '作業中', sortOrder: 1 },
  { id: 3, name: '完了', sortOrder: 2 },
]

function card(id: number, title: string, columnId: number, position: number, dueDate: string | null): Card {
  return { id, title, description: null, color: 'none', dueDate, columnId, position }
}

// ToDo は、上から「期限なし」「3月」「1月」の順。作業中にも、期限の順になっていないカードを入れておく
const cards: Card[] = [
  card(1, '期限なしの用事', 1, 0, null),
  card(2, '三月の用事', 1, 1, '2030-03-01'),
  card(3, '一月の用事', 1, 2, '2030-01-01'),
  card(4, '作業中の遅い用事', 2, 0, '2030-12-01'),
  card(5, '作業中の早い用事', 2, 1, '2030-02-01'),
]

// POST /sort-by-due を受けると、その列を期限順（期限なしは末尾）に並べ直して、次の GET から返すモック
function mockApi(failSort = false) {
  const stored = cards.map((c) => ({ ...c }))
  const fn = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'POST' && url.endsWith('/sort-by-due')) {
      if (failSort) return Promise.resolve({ ok: false, status: 500 } as Response)
      const columnId = Number(url.split('/')[3])
      const inColumn = stored.filter((c) => c.columnId === columnId).sort((a, b) => a.position - b.position)
      inColumn.sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
      inColumn.forEach((c, i) => (c.position = i))
      return Promise.resolve({ ok: true, json: async () => inColumn } as Response)
    }
    const keyword = new URL(url, 'http://localhost').searchParams.get('keyword')
    return Promise.resolve({
      ok: true,
      json: async () =>
        url.startsWith('/api/columns') ? columns : stored.filter((c) => !keyword || c.title.includes(keyword)),
    } as Response)
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const sortCalls = (fn: ReturnType<typeof mockApi>) =>
  fn.mock.calls.filter(([url, init]) => init?.method === 'POST' && String(url).endsWith('/sort-by-due'))

const titlesIn = (name: string) =>
  within(screen.getByRole('region', { name }))
    .queryAllByRole('listitem')
    .map((li) => li.textContent)

async function setup(failSort = false) {
  const fn = mockApi(failSort)
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })
  return { fn, user }
}

afterEach(() => vi.unstubAllGlobals())

test('各列に「期限順」ボタンがある', async () => {
  await setup()
  for (const name of ['ToDo', '作業中', '完了']) {
    expect(within(screen.getByRole('region', { name })).getByRole('button', { name: `${name}を期限順に並べ替え` })).toBeInTheDocument()
  }
})

test('「期限順」を押すと、その列のカードが期限の早い順に並び、期限なしは末尾になる', async () => {
  const { fn, user } = await setup()
  expect(titlesIn('ToDo')[0]).toContain('期限なしの用事')

  await user.click(screen.getByRole('button', { name: 'ToDoを期限順に並べ替え' }))

  await waitFor(() => expect(titlesIn('ToDo')[0]).toContain('一月の用事'))
  const titles = titlesIn('ToDo')
  expect(titles[1]).toContain('三月の用事')
  expect(titles[2]).toContain('期限なしの用事')
  expect(sortCalls(fn)).toHaveLength(1)
  expect(sortCalls(fn)[0][0]).toBe('/api/columns/1/sort-by-due')
})

test('押した列だけが並び直り、ほかの列は変わらない', async () => {
  const { user } = await setup()

  await user.click(screen.getByRole('button', { name: 'ToDoを期限順に並べ替え' }))

  await waitFor(() => expect(titlesIn('ToDo')[0]).toContain('一月の用事'))
  expect(titlesIn('作業中')[0]).toContain('作業中の遅い用事')
})

test('確認のメッセージは出さずに、すぐ並び直る', async () => {
  const { user } = await setup()

  await user.click(screen.getByRole('button', { name: '作業中を期限順に並べ替え' }))

  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  await waitFor(() => expect(titlesIn('作業中')[0]).toContain('作業中の早い用事'))
})

test('並び替えに失敗したら、エラーを表示して、並びはそのまま', async () => {
  const { user } = await setup(true)

  await user.click(screen.getByRole('button', { name: 'ToDoを期限順に並べ替え' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('サーバーからエラーが返りました')
  expect(titlesIn('ToDo')[0]).toContain('期限なしの用事')
  expect(screen.getByRole('button', { name: 'ToDoを期限順に並べ替え' })).toBeEnabled()
})

test('通信している間は、ボタンが押せない', async () => {
  const { fn, user } = await setup()
  let finish!: (r: Response) => void
  const original = fn.getMockImplementation()!
  fn.mockImplementation((url, init) =>
    init?.method === 'POST' ? new Promise<Response>((resolve) => (finish = resolve)) : original(url, init),
  )

  await user.click(screen.getByRole('button', { name: 'ToDoを期限順に並べ替え' }))

  expect(screen.getByRole('button', { name: 'ToDoを期限順に並べ替え' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '作業中を期限順に並べ替え' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'ToDoを期限順に並べ替え' }))
  expect(sortCalls(fn)).toHaveLength(1)

  finish({ ok: true, json: async () => [] } as Response)
  await waitFor(() => expect(screen.getByRole('button', { name: 'ToDoを期限順に並べ替え' })).toBeEnabled())
})

test('絞り込み中でも押せて、並び直したあとも、絞り込んだ結果が出る', async () => {
  const { fn, user } = await setup()
  await user.type(screen.getByLabelText('キーワード'), '用事')
  await user.click(screen.getByRole('button', { name: '検索' }))
  await screen.findByText(/絞り込み中のため/)
  await screen.findByRole('region', { name: 'ToDo' })

  await user.click(screen.getByRole('button', { name: 'ToDoを期限順に並べ替え' }))

  await waitFor(() => expect(sortCalls(fn)).toHaveLength(1))
  await waitFor(() => expect(titlesIn('ToDo')[0]).toContain('一月の用事'))
  expect(screen.getByText(/絞り込み中のため/)).toBeInTheDocument()
  // 取り直しは、絞り込みの条件を付けたまま行われる
  expect(fn.mock.calls.some(([url]) => String(url).includes('keyword='))).toBe(true)
})
