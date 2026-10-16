import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'
import type { Card, Column } from './api/types'

// カードを押して開く、編集のモーダルのテスト（画面全体を、通信をモックして動かす）

const columns: Column[] = [
  { id: 1, name: 'ToDo', sortOrder: 0 },
  { id: 2, name: '作業中', sortOrder: 1 },
  { id: 3, name: '完了', sortOrder: 2 },
]

const cards: Card[] = [
  { id: 1, title: '牛乳を買う', description: '2パック', color: 'none', dueDate: '2000-01-01', columnId: 1, position: 1 },
  { id: 2, title: '部屋の掃除', description: null, color: 'blue', dueDate: null, columnId: 1, position: 0 },
]

// PUT を受けると、そのカードを書き換えて、次の GET から返すモック（failPut が true なら、PUT は 400 を返す）
function mockApi(failPut = false) {
  const stored = cards.map((c) => ({ ...c }))
  const fn = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      if (failPut) return Promise.resolve({ ok: false, status: 400 } as Response)
      const id = Number(url.split('/').pop())
      const index = stored.findIndex((c) => c.id === id)
      stored[index] = { ...stored[index], ...JSON.parse(init.body as string) }
      return Promise.resolve({ ok: true, json: async () => stored[index] } as Response)
    }
    return Promise.resolve({
      ok: true,
      json: async () => (url.startsWith('/api/columns') ? columns : stored),
    } as Response)
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const putCalls = (fn: ReturnType<typeof mockApi>) => fn.mock.calls.filter(([, init]) => init?.method === 'PUT')

async function openMilkCard(failPut = false) {
  const fn = mockApi(failPut)
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })
  await user.click(screen.getByRole('button', { name: /牛乳を買う/ }))
  return { fn, user }
}

afterEach(() => vi.unstubAllGlobals())

test('説明文のあるカードにだけ、目印が出る', async () => {
  mockApi()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })
  const items = screen.getAllByRole('listitem')
  const milk = items.find((li) => li.textContent?.includes('牛乳を買う'))!
  const clean = items.find((li) => li.textContent?.includes('部屋の掃除'))!
  expect(within(milk).getByRole('img', { name: '説明あり' })).toBeInTheDocument()
  expect(within(clean).queryByRole('img', { name: '説明あり' })).not.toBeInTheDocument()
})

test('カードを押すとモーダルが開き、今の内容が入っている', async () => {
  await openMilkCard()

  const dialog = screen.getByRole('dialog', { name: 'カードを編集' })
  expect(within(dialog).getByLabelText('タイトル')).toHaveValue('牛乳を買う')
  expect(within(dialog).getByLabelText('説明文')).toHaveValue('2パック')
  expect(within(dialog).getByRole('button', { name: '期限 2000年1月1日' })).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: '色なし' })).toHaveAttribute('aria-pressed', 'true')
})

test('編集して保存すると、PUT で送られ、ボードに反映される', async () => {
  const { fn, user } = await openMilkCard()

  const title = screen.getByLabelText('タイトル')
  await user.clear(title)
  await user.type(title, '牛乳と卵を買う')
  const description = screen.getByLabelText('説明文')
  await user.clear(description)
  await user.type(description, 'スーパーで')
  await user.click(screen.getByRole('button', { name: '青' }))
  await user.click(screen.getByRole('button', { name: '期限 2000年1月1日' }))
  await user.click(screen.getByRole('button', { name: '期限を外す' }))
  expect(screen.getByRole('button', { name: '期限なし' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '保存' }))

  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'カードを編集' })).not.toBeInTheDocument())
  const [url, init] = putCalls(fn)[0]
  expect(url).toBe('/api/cards/1')
  expect(JSON.parse(init!.body as string)).toEqual({
    title: '牛乳と卵を買う',
    description: 'スーパーで',
    color: 'blue',
    dueDate: null,
  })
  const item = (await screen.findByRole('button', { name: /牛乳と卵を買う/ })).closest('li')!
  expect(item).toHaveClass('bg-[#dfeafd]')
  expect(item).not.toHaveTextContent('期限')
})

test('説明文を空にして保存すると、説明文はなし（null）で送られる', async () => {
  const { fn, user } = await openMilkCard()

  await user.clear(screen.getByLabelText('説明文'))
  await user.click(screen.getByRole('button', { name: '保存' }))

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(JSON.parse(putCalls(fn)[0][1]!.body as string).description).toBeNull()
})

test('変更がなければ、保存を押しても通信せずに閉じる', async () => {
  const { fn, user } = await openMilkCard()

  await user.click(screen.getByRole('button', { name: '保存' }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(putCalls(fn)).toHaveLength(0)
})

test('キャンセル・Esc・窓の外では、変更を捨てて閉じる', async () => {
  const { fn, user } = await openMilkCard()

  await user.type(screen.getByLabelText('タイトル'), ' 変更1')
  await user.click(screen.getByRole('button', { name: 'キャンセル' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /牛乳を買う/ }))
  await user.type(screen.getByLabelText('タイトル'), ' 変更2')
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /牛乳を買う/ }))
  await user.type(screen.getByLabelText('タイトル'), ' 変更3')
  await user.pointer({ keys: '[MouseLeft]', target: screen.getByRole('dialog').parentElement! })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

  expect(putCalls(fn)).toHaveLength(0)
  // タイトルは元のまま（開き直すと、元の内容が入っている）
  await user.click(screen.getByRole('button', { name: /牛乳を買う/ }))
  expect(screen.getByLabelText('タイトル')).toHaveValue('牛乳を買う')
})

test('タイトルが空のあいだは、保存できない', async () => {
  const { fn, user } = await openMilkCard()

  await user.clear(screen.getByLabelText('タイトル'))

  expect(screen.getByRole('button', { name: '保存' })).toBeDisabled()
  expect(screen.getByText('タイトルを入力してください')).toBeInTheDocument()
  await user.keyboard('{Enter}')
  expect(putCalls(fn)).toHaveLength(0)
})

test('保存に失敗したら、エラーを表示して、モーダルは開いたまま', async () => {
  const { user } = await openMilkCard(true)

  await user.type(screen.getByLabelText('タイトル'), ' 変更')
  await user.click(screen.getByRole('button', { name: '保存' }))

  const dialog = screen.getByRole('dialog')
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('入力内容を確認してください')
  expect(within(dialog).getByLabelText('タイトル')).toHaveValue('牛乳を買う 変更')
  expect(within(dialog).getByRole('button', { name: '保存' })).toBeEnabled()
})
