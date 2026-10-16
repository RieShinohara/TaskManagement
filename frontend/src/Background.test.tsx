import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'
import type { Background, Card, Column } from './api/types'
import { AUTO_CHECK_INTERVAL_MS } from './lib/background'

// 背景の選択と表示のテスト（画面全体を、通信をモックして動かす）

const columns: Column[] = [
  { id: 1, name: 'ToDo', sortOrder: 0 },
  { id: 2, name: '作業中', sortOrder: 1 },
]

const cards: Card[] = [
  { id: 1, title: '牛乳を買う', description: null, color: 'none', dueDate: null, columnId: 1, position: 0 },
]

// 設定の取得（GET）と更新（PUT）をするモック。failPut が true なら、PUT は 500 を返す
function mockApi(initial: Background = 'sky', failPut = false) {
  let current = initial
  const fn = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>((url, init) => {
    if (url === '/api/settings') {
      if (init?.method === 'PUT') {
        if (failPut) return Promise.resolve({ ok: false, status: 500 } as Response)
        current = (JSON.parse(init.body as string) as { background: Background }).background
      }
      return Promise.resolve({ ok: true, json: async () => ({ background: current }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => (url.startsWith('/api/columns') ? columns : cards) } as Response)
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const putCalls = (fn: ReturnType<typeof mockApi>) =>
  fn.mock.calls.filter(([url, init]) => url === '/api/settings' && init?.method === 'PUT')

// 画面いっぱいの背景の層（無地のときは、ない）
const layer = () => document.querySelector('[data-scene]')

async function setup(initial: Background = 'sky', failPut = false) {
  const fn = mockApi(initial, failPut)
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })
  return { fn, user }
}

async function openPicker(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '背景' }))
  return screen.getByRole('dialog', { name: '背景を選ぶ' })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

test('保存されている背景で表示される（夕焼け）', async () => {
  await setup('sunset')

  await waitFor(() => expect(layer()).toHaveAttribute('data-scene', 'sunset'))
})

test('「背景」を押すと、見本つきの5つの選択肢が出て、いまの背景が選ばれている', async () => {
  const { user } = await setup('night')
  await waitFor(() => expect(layer()).toHaveAttribute('data-scene', 'night'))

  const dialog = await openPicker(user)

  const radios = within(dialog).getAllByRole('radio')
  expect(radios.map((r) => r.textContent)).toEqual(['無地', '青空', '夕焼け', '星空', '自動（時間帯）'])
  expect(within(dialog).getByRole('radio', { name: '星空' })).toBeChecked()
  expect(within(dialog).getByRole('radio', { name: '青空' })).not.toBeChecked()
})

test('背景を選ぶと、すぐ切り替わって窓が閉じ、保存される', async () => {
  const { fn, user } = await setup('sky')
  await waitFor(() => expect(layer()).toHaveAttribute('data-scene', 'sky'))

  await user.click(within(await openPicker(user)).getByRole('radio', { name: '星空' }))

  expect(layer()).toHaveAttribute('data-scene', 'night')
  expect(screen.queryByRole('dialog', { name: '背景を選ぶ' })).not.toBeInTheDocument()
  await waitFor(() => expect(putCalls(fn)).toHaveLength(1))
  expect(JSON.parse(putCalls(fn)[0][1]!.body as string)).toEqual({ background: 'night' })
})

test('無地を選ぶと、背景の層がなくなる', async () => {
  const { user } = await setup('sky')
  await waitFor(() => expect(layer()).not.toBeNull())

  await user.click(within(await openPicker(user)).getByRole('radio', { name: '無地' }))

  expect(layer()).toBeNull()
})

test('窓の外を押す・Esc を押すと、何も選ばずに閉じる', async () => {
  const { fn, user } = await setup('sky')
  await waitFor(() => expect(layer()).toHaveAttribute('data-scene', 'sky'))

  await openPicker(user)
  await user.pointer({ keys: '[MouseLeft]', target: document.body })
  expect(screen.queryByRole('dialog', { name: '背景を選ぶ' })).not.toBeInTheDocument()

  await openPicker(user)
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog', { name: '背景を選ぶ' })).not.toBeInTheDocument()

  expect(putCalls(fn)).toHaveLength(0)
  expect(layer()).toHaveAttribute('data-scene', 'sky')
})

test('保存に失敗したら、元の背景に戻って、エラーが出る', async () => {
  const { user } = await setup('sky', true)
  await waitFor(() => expect(layer()).toHaveAttribute('data-scene', 'sky'))

  await user.click(within(await openPicker(user)).getByRole('radio', { name: '夕焼け' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('サーバーからエラーが返りました')
  expect(layer()).toHaveAttribute('data-scene', 'sky')
})

test('列の色合い：無地は今までどおり、青空は透ける、星空は暗い', async () => {
  const { user } = await setup('sky')
  const column = () => screen.getByRole('region', { name: 'ToDo' })
  await waitFor(() => expect(column()).toHaveAttribute('data-tone', 'light'))

  await user.click(within(await openPicker(user)).getByRole('radio', { name: '星空' }))
  expect(column()).toHaveAttribute('data-tone', 'dark')
  expect(within(column()).getByRole('heading', { name: 'ToDo' })).toHaveClass('text-gray-100')

  await user.click(within(await openPicker(user)).getByRole('radio', { name: '無地' }))
  expect(column()).toHaveAttribute('data-tone', 'plain')
})

test('カードは、どの背景でも、列とは別に表示される（文字が読める）', async () => {
  await setup('night')

  const card = await screen.findByRole('button', { name: /牛乳を買う/ })
  expect(card.closest('li')).toHaveClass('bg-white')
})

test('自動：時刻で場面が決まり、開いたままでも、時間が来たら切り替わる', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 16, 10, 0))
  const realSetInterval = globalThis.setInterval
  let tick: (() => void) | undefined
  vi.spyOn(globalThis, 'setInterval').mockImplementation(((fn: () => void, ms?: number) => {
    if (ms === AUTO_CHECK_INTERVAL_MS) {
      tick = fn
      return 1
    }
    return realSetInterval(fn, ms)
  }) as typeof setInterval)

  await setup('auto')
  await waitFor(() => expect(layer()).toHaveAttribute('data-scene', 'sky')) // 10時は青空

  act(() => {
    vi.setSystemTime(new Date(2026, 9, 16, 17, 0))
    tick!()
  })
  expect(layer()).toHaveAttribute('data-scene', 'sunset') // 17時は夕焼け

  act(() => {
    vi.setSystemTime(new Date(2026, 9, 16, 19, 0))
    tick!()
  })
  expect(layer()).toHaveAttribute('data-scene', 'night') // 19時は星空
})

test('自動を選ぶと、いまの時刻の場面になる', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 16, 22, 0))
  const { user } = await setup('plain')

  await user.click(within(await openPicker(user)).getByRole('radio', { name: '自動（時間帯）' }))

  expect(layer()).toHaveAttribute('data-scene', 'night') // 22時は星空
})

test('設定の返事の形が違っても、ボードは表示される（背景はなしのまま）', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () => (url.startsWith('/api/columns') ? columns : url === '/api/settings' ? { oops: 1 } : cards),
      } as Response),
    ),
  )
  render(<App />)

  expect(await screen.findByRole('region', { name: 'ToDo' })).toBeInTheDocument()
  expect(layer()).toBeNull()
})
