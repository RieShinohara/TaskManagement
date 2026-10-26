import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, test, vi } from 'vitest'
import App from './App'
import type { Card, Column } from './api/types'
import { expectNoA11yViolations } from './test-utils/axe'

// 主な画面を、アクセシビリティの自動検査（axe）にかける。画面全体を、通信をモックして動かす

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

const backupBody = { app: 'taskboard', version: 1, columns: [{ name: 'ToDo', cards: [] }] }

function mockApi() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/api/settings') return Promise.resolve({ ok: true, json: async () => ({ background: 'sky' }) })
      if (url === '/api/background-images') return Promise.resolve({ ok: true, json: async () => [] })
      if (url === '/api/backup/restore') return Promise.resolve({ ok: true, status: 204 })
      return Promise.resolve({ ok: true, json: async () => (url.startsWith('/api/columns') ? columns : cards) })
    }),
  )
}

async function setup() {
  mockApi()
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })
  return { user }
}

afterEach(() => vi.unstubAllGlobals())

test('ボード', async () => {
  await setup()
  await expectNoA11yViolations()
})

test('カードの追加の入力欄', async () => {
  const { user } = await setup()
  await user.click(screen.getAllByRole('button', { name: /カードを追加/ })[0]!)
  await expectNoA11yViolations()
})

test('カードの編集のモーダル', async () => {
  const { user } = await setup()
  await user.click(screen.getByRole('button', { name: /牛乳を買う/ }))
  await expectNoA11yViolations()
})

test('期限のカレンダー', async () => {
  const { user } = await setup()
  await user.click(screen.getByRole('button', { name: /牛乳を買う/ }))
  await user.click(screen.getByRole('button', { name: '期限 2000年1月1日' }))
  await expectNoA11yViolations()
})

test('削除の確認', async () => {
  const { user } = await setup()
  await user.click(screen.getByRole('button', { name: /牛乳を買う/ }))
  await user.click(screen.getByRole('button', { name: '削除' }))
  await expectNoA11yViolations()
})

test('背景の選択', async () => {
  const { user } = await setup()
  await user.click(screen.getByRole('button', { name: '背景' }))
  await expectNoA11yViolations()
})

test('バックアップの読み込みの確認と、完了のお知らせ', async () => {
  const { user } = await setup()
  const file = new File([JSON.stringify(backupBody)], 'taskboard-backup.json', { type: 'application/json' })
  await user.upload(screen.getByLabelText('バックアップファイルを選ぶ'), file)
  const confirm = await screen.findByRole('alertdialog')
  await expectNoA11yViolations()

  await user.click(within(confirm).getByRole('button', { name: '読み込む' }))
  await screen.findByText('バックアップを読み込みました。')
  await expectNoA11yViolations()
})
