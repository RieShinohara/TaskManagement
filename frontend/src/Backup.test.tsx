import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App'
import type { Card, Column } from './api/types'

// 「バックアップ」「読み込み」ボタンのテスト（画面全体を、通信をモックして動かす）

const columns: Column[] = [
  { id: 1, name: 'ToDo', sortOrder: 0 },
  { id: 2, name: '作業中', sortOrder: 1 },
  { id: 3, name: '完了', sortOrder: 2 },
]

const backupBody = {
  app: 'taskboard',
  version: 1,
  exportedAt: '2026-10-16T00:00:00Z',
  columns: [
    { name: 'ToDo', cards: [{ title: '牛乳を買う', description: null, color: 'none', dueDate: null }] },
    { name: '作業中', cards: [] },
    { name: '完了', cards: [] },
  ],
}

function card(id: number, title: string): Card {
  return { id, title, description: null, color: 'none', dueDate: null, columnId: 1, position: 0 }
}

// restoreStatus：POST /restore が返す番号。成功（204）のときは、保存されているカードを「戻したあとの内容」に差し替える
function mockApi(restoreStatus = 204) {
  let stored: Card[] = [card(1, '消えたあとのカード')]
  const fn = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>((url) => {
    if (url === '/api/backup/restore') {
      if (restoreStatus !== 204) return Promise.resolve({ ok: false, status: restoreStatus } as Response)
      stored = [card(9, '戻ったカード')]
      return Promise.resolve({ ok: true, status: 204 } as Response)
    }
    if (url === '/api/backup') return Promise.resolve({ ok: true, json: async () => backupBody } as Response)
    return Promise.resolve({
      ok: true,
      json: async () => (url.startsWith('/api/columns') ? columns : stored),
    } as Response)
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const restoreCalls = (fn: ReturnType<typeof mockApi>) => fn.mock.calls.filter(([url]) => url === '/api/backup/restore')

async function setup(restoreStatus = 204) {
  const fn = mockApi(restoreStatus)
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })
  return { fn, user }
}

const jsonFile = (content: string, name = 'taskboard-backup-20261016-000000.json') =>
  new File([content], name, { type: 'application/json' })

const chooseFile = (user: ReturnType<typeof userEvent.setup>, file: File) =>
  user.upload(screen.getByLabelText('バックアップファイルを選ぶ'), file)

let savedBlob: Blob | undefined
let downloadNames: string[]

beforeEach(() => {
  savedBlob = undefined
  downloadNames = []
  vi.stubGlobal('URL', { createObjectURL: (b: Blob) => ((savedBlob = b), 'blob:test'), revokeObjectURL: vi.fn() })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloadNames.push(this.download)
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('「バックアップ」を押すと、日時付きの名前のJSONファイルとして保存される', async () => {
  const { user } = await setup()

  await user.click(screen.getByRole('button', { name: 'バックアップ' }))

  await waitFor(() => expect(downloadNames).toHaveLength(1))
  expect(downloadNames[0]).toMatch(/^taskboard-backup-\d{8}-\d{6}\.json$/)
  expect(JSON.parse(await savedBlob!.text())).toEqual(backupBody)
})

test('バックアップに失敗したら、お知らせを出す', async () => {
  const { fn, user } = await setup()
  const original = fn.getMockImplementation()!
  fn.mockImplementation((url) =>
    url === '/api/backup' ? Promise.resolve({ ok: false, status: 502 } as Response) : original(url),
  )

  await user.click(screen.getByRole('button', { name: 'バックアップ' }))

  const dialog = await screen.findByRole('alertdialog')
  expect(within(dialog).getByText(/サーバーに接続できません/)).toBeInTheDocument()
  expect(downloadNames).toHaveLength(0)
  await user.click(within(dialog).getByRole('button', { name: '閉じる' }))
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
})

test('読み込み：ファイルを選ぶと確認が出て、「読み込む」で送られ、ボードが取り直される', async () => {
  const { fn, user } = await setup()
  expect(screen.getByRole('button', { name: /消えたあとのカード/ })).toBeInTheDocument()

  await chooseFile(user, jsonFile(JSON.stringify(backupBody)))

  const dialog = await screen.findByRole('alertdialog')
  expect(within(dialog).getByText('現在のデータは、すべて置き換わります。よろしいですか？')).toBeInTheDocument()
  expect(restoreCalls(fn)).toHaveLength(0) // まだ送られていない
  await user.click(within(dialog).getByRole('button', { name: '読み込む' }))

  await waitFor(() => expect(restoreCalls(fn)).toHaveLength(1))
  const [, init] = restoreCalls(fn)[0]
  expect(init?.method).toBe('POST')
  expect(JSON.parse(init?.body as string)).toEqual(backupBody)
  expect(await screen.findByRole('button', { name: /戻ったカード/ })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /消えたあとのカード/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  expect(screen.getByText('バックアップを読み込みました。')).toBeInTheDocument()
})

test('確認で「キャンセル」を押すと、何も変わらない', async () => {
  const { fn, user } = await setup()

  await chooseFile(user, jsonFile(JSON.stringify(backupBody)))
  await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'キャンセル' }))

  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  expect(restoreCalls(fn)).toHaveLength(0)
  expect(screen.getByRole('button', { name: /消えたあとのカード/ })).toBeInTheDocument()
})

test('確認を出して Esc を押すと、読み込まれずに閉じる', async () => {
  const { fn, user } = await setup()

  await chooseFile(user, jsonFile(JSON.stringify(backupBody)))
  await screen.findByRole('alertdialog')
  await user.keyboard('{Escape}')

  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  expect(restoreCalls(fn)).toHaveLength(0)
})

test('バックアップファイルではないファイルを選ぶと、読み込めないと出て、確認は出ない', async () => {
  const { fn, user } = await setup()

  await chooseFile(user, jsonFile('これはバックアップファイルではありません', 'memo.json'))

  const dialog = await screen.findByRole('alertdialog')
  expect(within(dialog).getByText('このファイルは読み込めません。')).toBeInTheDocument()
  expect(within(dialog).queryByRole('button', { name: '読み込む' })).not.toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: '閉じる' }))
  expect(restoreCalls(fn)).toHaveLength(0)
  expect(screen.getByRole('button', { name: /消えたあとのカード/ })).toBeInTheDocument()
})

test('別のアプリのJSONを選んでも、読み込めないと出る', async () => {
  const { fn, user } = await setup()

  await chooseFile(user, jsonFile(JSON.stringify({ app: 'other', version: 1, columns: [] })))

  expect(await screen.findByText('このファイルは読み込めません。')).toBeInTheDocument()
  expect(restoreCalls(fn)).toHaveLength(0)
})

test('サーバーが400で断ったときも、読み込めないと出て、ボードは変わらない', async () => {
  const { user } = await setup(400)

  await chooseFile(user, jsonFile(JSON.stringify(backupBody)))
  await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '読み込む' }))

  await waitFor(() => expect(screen.getByRole('alertdialog')).toHaveTextContent('このファイルは読み込めません'))
  expect(screen.queryByRole('button', { name: '読み込む' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /消えたあとのカード/ })).toBeInTheDocument()
})

test('読み込んでいる間は、ボタンが押せず、Esc でも閉じない', async () => {
  const { fn, user } = await setup()
  let finish!: (r: Response) => void
  const original = fn.getMockImplementation()!
  fn.mockImplementation((url) =>
    url === '/api/backup/restore' ? new Promise<Response>((resolve) => (finish = resolve)) : original(url),
  )

  await chooseFile(user, jsonFile(JSON.stringify(backupBody)))
  await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '読み込む' }))

  const dialog = screen.getByRole('alertdialog')
  expect(within(dialog).getByRole('button', { name: '読み込む' })).toBeDisabled()
  expect(within(dialog).getByRole('button', { name: 'キャンセル' })).toBeDisabled()
  await user.keyboard('{Escape}')
  expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  expect(restoreCalls(fn)).toHaveLength(1)

  finish({ ok: true, status: 204 } as Response)
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
})

test('読み込めたら、背景の設定も取り直す', async () => {
  const { fn, user } = await setup()
  const settingsGets = () => fn.mock.calls.filter(([url]) => url === '/api/settings').length
  await waitFor(() => expect(settingsGets()).toBe(1)) // 開いたときの1回

  await chooseFile(user, jsonFile(JSON.stringify(backupBody)))
  await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: '読み込む' }))

  await waitFor(() => expect(settingsGets()).toBe(2))
})
