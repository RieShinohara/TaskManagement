import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  {
    id: 1,
    title: '牛乳を買う',
    description: '2パック',
    color: 'none',
    dueDate: '2000-01-01',
    columnId: 1,
    position: 1,
  },
  { id: 2, title: '部屋の掃除', description: null, color: 'blue', dueDate: null, columnId: 1, position: 0 },
]

// PUT を受けると、そのカードを書き換えて、次の GET から返すモック（failPut が true なら、PUT は 400 を返す）
// DELETE を受けると、そのカードを消して 204 を返す（failDelete が true なら、DELETE は 404 を返す）
function mockApi(failPut = false, failDelete = false) {
  const stored = cards.map((c) => ({ ...c }))
  const fn = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'DELETE') {
      if (failDelete) return Promise.resolve({ ok: false, status: 404 } as Response)
      const index = stored.findIndex((c) => c.id === Number(url.split('/').pop()))
      stored.splice(index, 1)
      return Promise.resolve({ ok: true, status: 204 } as Response)
    }
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

const deleteCalls = (fn: ReturnType<typeof mockApi>) => fn.mock.calls.filter(([, init]) => init?.method === 'DELETE')

async function openMilkCard(failPut = false, failDelete = false) {
  const fn = mockApi(failPut, failDelete)
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
  expect(item).toHaveClass('bg-[#c8dcfc]')
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
  // 暗い背景を押すと、<dialog> 自身が押されたことになる
  await user.pointer({ keys: '[MouseLeft]', target: screen.getByRole('dialog') })
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

test('「削除」を押すと、確認が出る。まだ削除はされない', async () => {
  const { fn, user } = await openMilkCard()

  await user.click(screen.getByRole('button', { name: '削除' }))

  const confirm = screen.getByRole('alertdialog', { name: '削除の確認' })
  expect(within(confirm).getByText('本当に削除しますか？')).toBeInTheDocument()
  expect(within(confirm).getByRole('button', { name: '削除する' })).toBeInTheDocument()
  expect(deleteCalls(fn)).toHaveLength(0)
})

test('確認で「キャンセル」を押すと、削除されず、編集に戻る', async () => {
  const { fn, user } = await openMilkCard()

  await user.click(screen.getByRole('button', { name: '削除' }))
  await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'キャンセル' }))

  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  expect(screen.getByRole('dialog', { name: 'カードを編集' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
  expect(deleteCalls(fn)).toHaveLength(0)
})

test('確認を出している間の Esc は、確認だけを閉じる', async () => {
  const { fn, user } = await openMilkCard()

  await user.click(screen.getByRole('button', { name: '削除' }))
  await user.keyboard('{Escape}')

  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  expect(screen.getByRole('dialog', { name: 'カードを編集' })).toBeInTheDocument()
  expect(deleteCalls(fn)).toHaveLength(0)
})

test('「削除する」を押すと、DELETE が送られ、カードがボードから消える', async () => {
  const { fn, user } = await openMilkCard()

  await user.click(screen.getByRole('button', { name: '削除' }))
  await user.click(screen.getByRole('button', { name: '削除する' }))

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(deleteCalls(fn)).toHaveLength(1)
  expect(deleteCalls(fn)[0][0]).toBe('/api/cards/1')
  await waitFor(() => expect(screen.queryByRole('button', { name: /牛乳を買う/ })).not.toBeInTheDocument())
  expect(screen.getByRole('button', { name: /部屋の掃除/ })).toBeInTheDocument()
})

test('削除に失敗したら、エラーを表示して、確認は出したまま', async () => {
  const { user } = await openMilkCard(false, true)

  await user.click(screen.getByRole('button', { name: '削除' }))
  await user.click(screen.getByRole('button', { name: '削除する' }))

  const dialog = screen.getByRole('dialog')
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('カードが見つかりません')
  expect(within(dialog).getByRole('button', { name: '削除する' })).toBeEnabled()
})

test('削除している間は、ボタンが押せず、Esc でも閉じない', async () => {
  const { fn, user } = await openMilkCard()
  // DELETE の返事を、手動で遅らせる
  let finish!: (r: Response) => void
  const original = fn.getMockImplementation()!
  fn.mockImplementation((url, init) =>
    init?.method === 'DELETE' ? new Promise<Response>((resolve) => (finish = resolve)) : original(url, init),
  )

  await user.click(screen.getByRole('button', { name: '削除' }))
  await user.click(screen.getByRole('button', { name: '削除する' }))

  expect(screen.getByRole('button', { name: '削除する' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled()
  await user.keyboard('{Escape}')
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(deleteCalls(fn)).toHaveLength(1)

  finish({ ok: true, status: 204 } as Response)
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

// ---------- <dialog> として開く（品質チェック F1） ----------

test('<dialog> として、showModal() で開く（後ろの画面の操作を止め、フォーカスを閉じ込めるため）', async () => {
  const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal')
  await openMilkCard()

  const dialog = screen.getByRole('dialog')
  expect(dialog.tagName).toBe('DIALOG')
  expect(dialog).toHaveAttribute('open')
  expect(showModal).toHaveBeenCalledTimes(1)
  showModal.mockRestore()
})

test('閉じると、フォーカスが、押したカードに戻る（Esc でも、キャンセルでも）', async () => {
  const { user } = await openMilkCard()
  const card = screen.getByRole('button', { name: /牛乳を買う/ })

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(card).toHaveFocus()

  await user.click(card)
  await user.click(screen.getByRole('button', { name: 'キャンセル' }))
  expect(card).toHaveFocus()
})

test('窓の中を押しても、閉じない', async () => {
  const { user } = await openMilkCard()

  await user.pointer({ keys: '[MouseLeft]', target: screen.getByRole('heading', { name: 'カードを編集' }) })

  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

test('ブラウザの都合で、窓が閉じられてしまったら、開き直す', async () => {
  await openMilkCard()
  const dialog = screen.getByRole('dialog')

  dialog.removeAttribute('open') // ブラウザが、Esc を続けて押されて、強制的に閉じた状態
  fireEvent(dialog, new Event('close'))

  expect(dialog).toHaveAttribute('open')
})

test('期限のカレンダーは、モーダルの中に出る（外に出ると、押せなくなるため）。Esc では、カレンダーだけが閉じる', async () => {
  const { user } = await openMilkCard()

  await user.click(screen.getByRole('button', { name: /^期限/ }))
  const calendar = screen.getByRole('dialog', { name: '期限日を選ぶ' })
  expect(screen.getByRole('dialog', { name: 'カードを編集' })).toContainElement(calendar)

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog', { name: '期限日を選ぶ' })).not.toBeInTheDocument()
  expect(screen.getByRole('dialog', { name: 'カードを編集' })).toBeInTheDocument()
})
