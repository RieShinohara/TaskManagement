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
    return Promise.resolve({
      ok: true,
      json: async () => (url.startsWith('/api/columns') ? columns : cards),
    } as Response)
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

// ---------- キーボードだけで使える（品質チェック F6 の後半） ----------
// 矢印キーは、フォーカスを動かすだけ。選ぶのは、Enter か Space
// （選ぶとすぐ背景が切り替わり、保存されて、窓が閉じるので、矢印キーで選ぶと、使えない）

const radio = (name: string) => screen.getByRole('radio', { name })
const pickerButton = () => screen.getByRole('button', { name: '背景' })

async function openByKeyboard(user: ReturnType<typeof userEvent.setup>) {
  pickerButton().focus()
  await user.keyboard('{Enter}')
  return screen.getByRole('dialog', { name: '背景を選ぶ' })
}

test('Enter で開くと、フォーカスが、いまの背景の選択肢に移る', async () => {
  const { user } = await setup('night')
  await waitFor(() => expect(layer()).toHaveAttribute('data-scene', 'night'))

  await openByKeyboard(user)

  expect(radio('星空')).toHaveFocus()
})

test('マウスで開いたときは、フォーカスを、窓の中に移さない', async () => {
  const { user } = await setup('sky')

  await openPicker(user)

  expect(pickerButton()).toHaveFocus()
})

test('矢印キーで、フォーカスだけが動く（端では、反対の端に回る）。選ばれた背景は、変わらない', async () => {
  const { fn, user } = await setup('sky')
  await openByKeyboard(user)
  expect(radio('青空')).toHaveFocus()

  await user.keyboard('{ArrowDown}')
  expect(radio('夕焼け')).toHaveFocus()
  await user.keyboard('{ArrowDown}')
  expect(radio('星空')).toHaveFocus()
  await user.keyboard('{ArrowRight}') // → も、次へ
  expect(radio('自動（時間帯）')).toHaveFocus()
  await user.keyboard('{ArrowDown}') // いちばん下の次は、いちばん上
  expect(radio('無地')).toHaveFocus()
  await user.keyboard('{ArrowUp}') // いちばん上の前は、いちばん下
  expect(radio('自動（時間帯）')).toHaveFocus()
  await user.keyboard('{Home}')
  expect(radio('無地')).toHaveFocus()
  await user.keyboard('{End}')
  expect(radio('自動（時間帯）')).toHaveFocus()

  expect(radio('青空')).toHaveAttribute('aria-checked', 'true') // 選びは、そのまま
  expect(putCalls(fn)).toHaveLength(0)
})

test('Tab の止まる選択肢は、いまのフォーカスの1つだけ（矢印キーで動くと、止まる場所も動く）', async () => {
  const { user } = await setup('sky')
  const dialog = await openByKeyboard(user)
  const stops = () =>
    within(dialog)
      .getAllByRole('radio')
      .filter((r) => r.tabIndex === 0)

  expect(stops()).toEqual([radio('青空')])
  await user.keyboard('{ArrowDown}')
  expect(stops()).toEqual([radio('夕焼け')])
})

test('Tab は、窓の中を回る（青空の選択肢 → 各行の「画像を選ぶ」 → 最初に戻る）。外には出ない', async () => {
  const { user } = await setup('sky')
  await openByKeyboard(user)
  expect(radio('青空')).toHaveFocus()

  await user.tab()
  expect(screen.getByRole('button', { name: '青空の画像を選ぶ' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: '夕焼けの画像を選ぶ' })).toHaveFocus()
  await user.tab()
  expect(screen.getByRole('button', { name: '星空の画像を選ぶ' })).toHaveFocus()
  await user.tab() // いちばん後ろの次は、いちばん前
  expect(radio('青空')).toHaveFocus()
  await user.tab({ shift: true }) // いちばん前の前は、いちばん後ろ
  expect(screen.getByRole('button', { name: '星空の画像を選ぶ' })).toHaveFocus()
  expect(screen.getByRole('button', { name: 'バックアップ' })).not.toHaveFocus()
})

test('Enter で選ぶと、背景が切り替わり、窓が閉じて、フォーカスが「背景」のボタンに戻る', async () => {
  const { fn, user } = await setup('sky')
  await openByKeyboard(user)

  await user.keyboard('{ArrowDown}{Enter}') // 夕焼け

  expect(putCalls(fn)).toHaveLength(1)
  expect(JSON.parse(putCalls(fn)[0][1]!.body as string)).toEqual({ background: 'sunset' })
  await waitFor(() => expect(layer()).toHaveAttribute('data-scene', 'sunset'))
  expect(screen.queryByRole('dialog', { name: '背景を選ぶ' })).not.toBeInTheDocument()
  expect(pickerButton()).toHaveFocus()
})

test('Space でも選べる', async () => {
  const { fn, user } = await setup('sky')
  await openByKeyboard(user)

  await user.keyboard('{End}{Home}{ArrowDown}{ArrowDown}{ArrowDown} ') // 無地 → 青空 → 夕焼け → 星空。Space

  expect(JSON.parse(putCalls(fn)[0][1]!.body as string)).toEqual({ background: 'night' })
})

test('Esc で閉じると、何も選ばず、フォーカスが「背景」のボタンに戻る', async () => {
  const { fn, user } = await setup('sky')
  await openByKeyboard(user)

  await user.keyboard('{ArrowDown}{Escape}')

  expect(screen.queryByRole('dialog', { name: '背景を選ぶ' })).not.toBeInTheDocument()
  expect(putCalls(fn)).toHaveLength(0)
  expect(pickerButton()).toHaveFocus()
})

// 設定の更新（PUT）を、テストが手で「成功」「失敗」させられるモック（連続して選んだときの、終わる順番を決めるため）
function mockControlledPuts(initial: Background = 'plain') {
  const puts: { background: Background; settle: (ok: boolean) => void }[] = []
  const fn = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>((url, init) => {
    if (url === '/api/settings' && init?.method === 'PUT') {
      const background = (JSON.parse(init.body as string) as { background: Background }).background
      return new Promise<Response>((resolve) => {
        puts.push({
          background,
          settle: (ok) =>
            resolve(
              ok
                ? ({ ok: true, json: async () => ({ background }) } as Response)
                : ({ ok: false, status: 500 } as Response),
            ),
        })
      })
    }
    const body = url === '/api/settings' ? { background: initial } : url.startsWith('/api/columns') ? columns : cards
    return Promise.resolve({ ok: true, json: async () => body } as Response)
  })
  vi.stubGlobal('fetch', fn)
  return puts
}

async function choose(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(within(await openPicker(user)).getByRole('radio', { name }))
}

test('続けて選んだとき、先に選んだほうの保存が、あとから失敗しても、最後に選んだ背景のまま', async () => {
  const puts = mockControlledPuts('plain')
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })

  await choose(user, '夕焼け')
  await choose(user, '星空')
  expect(layer()).toHaveAttribute('data-scene', 'night') // 画面は、先に変わる

  // 夕焼けの保存が失敗する。星空の保存は、そのあと成功する（送られた順に、1つずつ終わらせる）
  await waitFor(() => expect(puts).toHaveLength(1))
  act(() => puts[0]!.settle(false))
  await waitFor(() => expect(puts).toHaveLength(2))
  act(() => puts[1]!.settle(true))

  await waitFor(() => expect(puts[1]!.background).toBe('night'))
  expect(layer()).toHaveAttribute('data-scene', 'night') // 星空のまま。無地には、戻らない
  expect(screen.queryByRole('alert')).not.toBeInTheDocument() // 最終的に星空は保存できたので、エラーは出さない
})

test('続けて選んだとき、保存のお願いは、前のが終わってから、1つずつ送られる（順番が入れ替わらない）', async () => {
  const puts = mockControlledPuts('plain')
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })

  await choose(user, '夕焼け')
  await choose(user, '星空')

  await waitFor(() => expect(puts).toHaveLength(1))
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(puts).toHaveLength(1) // 夕焼けが終わるまで、星空は送られない
  act(() => puts[0]!.settle(true))
  await waitFor(() => expect(puts).toHaveLength(2))
  expect(puts.map((p) => p.background)).toEqual(['sunset', 'night'])
  act(() => puts[1]!.settle(true))
})

test('続けて選んで、最後の保存だけが失敗したときは、最後に保存できた背景に戻り、エラーが出る', async () => {
  const puts = mockControlledPuts('plain')
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })

  await choose(user, '夕焼け')
  await choose(user, '星空')
  await waitFor(() => expect(puts).toHaveLength(1))
  act(() => puts[0]!.settle(true))
  await waitFor(() => expect(puts).toHaveLength(2))
  act(() => puts[1]!.settle(false))

  await waitFor(() => expect(layer()).toHaveAttribute('data-scene', 'sunset')) // 夕焼けは、保存できている
  expect(await screen.findByRole('alert')).toHaveTextContent('サーバーからエラーが返りました')
})
