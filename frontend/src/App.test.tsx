import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App'
import type { Card, Column } from './api/types'

const columns: Column[] = [
  { id: 2, name: '作業中', sortOrder: 1 },
  { id: 1, name: 'ToDo', sortOrder: 0 },
  { id: 3, name: '完了', sortOrder: 2 },
]

const cards: Card[] = [
  { id: 1, title: '牛乳を買う', color: 'none', dueDate: '2000-01-01', columnId: 1, position: 1 },
  { id: 2, title: '部屋の掃除', color: 'blue', dueDate: null, columnId: 1, position: 0 },
  { id: 3, title: '銀行で記帳する', color: 'gray', dueDate: '2000-01-01', columnId: 3, position: 0 },
]

function mockApi(cardsToReturn: Card[] = cards) {
  const fn = vi.fn((url: string) =>
    Promise.resolve({
      ok: true,
      json: async () => (url.startsWith('/api/columns') ? columns : cardsToReturn),
    } as Response),
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => mockApi())
afterEach(() => vi.unstubAllGlobals())

test('列が表示順に並び、カードは列ごとに position 順で表示される', async () => {
  render(<App />)
  const todo = await screen.findByRole('region', { name: 'ToDo' })

  const names = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
  expect(names).toEqual(['ToDo', '作業中', '完了'])

  const titles = within(todo).getAllByRole('listitem').map((li) => li.textContent)
  expect(titles[0]).toContain('部屋の掃除')
  expect(titles[1]).toContain('牛乳を買う')
  expect(within(screen.getByRole('region', { name: '作業中' })).getByText('カードがありません')).toBeInTheDocument()
})

test('期限切れは赤文字。ただし完了列のカードは赤くしない', async () => {
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })
  const overdue = within(screen.getByRole('region', { name: 'ToDo' })).getByText('期限 2000年1月1日')
  const done = within(screen.getByRole('region', { name: '完了' })).getByText('期限 2000年1月1日')
  expect(overdue).toHaveClass('text-red-600')
  expect(done).not.toHaveClass('text-red-600')
})

test('カードの色が背景に付く（色なしは白）', async () => {
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })
  const items = screen.getAllByRole('listitem')
  expect(items.find((li) => li.textContent?.includes('部屋の掃除'))).toHaveClass('bg-[#dfeafd]')
  expect(items.find((li) => li.textContent?.includes('牛乳を買う'))).toHaveClass('bg-white')
})

test('検索ボタンで、条件つきで取り直す', async () => {
  const fn = mockApi([cards[0]])
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })

  await user.type(screen.getByLabelText('キーワード'), '牛乳')
  await user.click(screen.getByRole('button', { name: '検索' }))

  await screen.findByText('牛乳を買う')
  expect(screen.queryByText('部屋の掃除')).not.toBeInTheDocument()
  expect(fn).toHaveBeenLastCalledWith(`/api/cards?keyword=${encodeURIComponent('牛乳')}`)
})

test('サーバーに接続できないときは、エラーを表示する', async () => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
  render(<App />)
  expect(await screen.findByRole('alert')).toHaveTextContent('サーバーに接続できません')
})

// POST を受けると、カードを一番上（position が最小）に足して、次の GET から返すモック
function mockApiWithCreate() {
  const stored = [...cards]
  const fn = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      const body = JSON.parse(init.body as string)
      const created: Card = { id: 99, ...body, position: -1 }
      stored.push(created)
      return Promise.resolve({ ok: true, status: 201, json: async () => created } as Response)
    }
    return Promise.resolve({
      ok: true,
      json: async () => (url.startsWith('/api/columns') ? columns : stored),
    } as Response)
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

test('「＋」から入力して Enter を押すと、列の一番上にカードが追加される', async () => {
  const fn = mockApiWithCreate()
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })

  await user.click(screen.getByRole('button', { name: 'ToDoにカードを追加' }))
  await user.type(screen.getByPlaceholderText('タイトルを入力してください'), '新しいカード')
  await user.click(screen.getByRole('button', { name: '赤' }))
  await user.type(screen.getByLabelText('期限'), '2030-05-01')
  await user.keyboard('{Enter}')

  const post = fn.mock.calls.find(([, init]) => init?.method === 'POST')
  expect(JSON.parse(post![1]!.body as string)).toEqual({
    title: '新しいカード',
    columnId: 1,
    color: 'red',
    dueDate: '2030-05-01',
  })
  await waitFor(() => {
    const titles = within(screen.getByRole('region', { name: 'ToDo' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(titles[0]).toContain('新しいカード')
  })
  expect(screen.queryByPlaceholderText('タイトルを入力してください')).not.toBeInTheDocument()
})

test('Esc で入力欄を閉じる。空のタイトルは送信しない', async () => {
  const fn = mockApiWithCreate()
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })

  await user.click(screen.getByRole('button', { name: 'ToDoにカードを追加' }))
  await user.keyboard('{Escape}')
  expect(screen.queryByPlaceholderText('タイトルを入力してください')).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'ToDoにカードを追加' }))
  await user.keyboard('{Enter}')
  expect(screen.queryByPlaceholderText('タイトルを入力してください')).not.toBeInTheDocument()
  expect(fn.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
})

test('追加に失敗したら、エラーを表示して入力欄を残す', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) =>
      Promise.resolve(
        init?.method === 'POST'
          ? ({ ok: false, status: 400 } as Response)
          : ({ ok: true, json: async () => (url.startsWith('/api/columns') ? columns : cards) } as Response),
      ),
    ),
  )
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })

  await user.click(screen.getByRole('button', { name: 'ToDoにカードを追加' }))
  await user.type(screen.getByPlaceholderText('タイトルを入力してください'), 'だめなカード{Enter}')

  expect(await screen.findByRole('alert')).toHaveTextContent('入力内容を確認してください')
  expect(screen.getByPlaceholderText('タイトルを入力してください')).toHaveValue('だめなカード')
})
