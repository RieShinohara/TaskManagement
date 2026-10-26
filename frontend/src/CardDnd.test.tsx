import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App'
import type { Card, Column } from './api/types'

// カードをドラッグ＆ドロップで動かすテスト（画面全体を、通信をモックして動かす）。
// jsdom には画面上の位置がないので、列を横に・カードを縦に並べた位置を、仮に決めて返す。
// マウスのドラッグは再現しにくいので、キーボード（スペースでつかむ・矢印で動かす・スペースで置く）で動かす

const columns: Column[] = [
  { id: 1, name: 'ToDo', sortOrder: 0 },
  { id: 2, name: '作業中', sortOrder: 1 },
  { id: 3, name: '完了', sortOrder: 2 },
]

const cards: Card[] = [
  { id: 1, title: '部屋の掃除', description: null, color: 'none', dueDate: null, columnId: 1, position: 0 },
  { id: 2, title: '牛乳を買う', description: null, color: 'none', dueDate: null, columnId: 1, position: 1 },
  { id: 3, title: '資料を読む', description: null, color: 'none', dueDate: null, columnId: 2, position: 0 },
]

// 絞り込み中に出る、お知らせの文
const BANNER = /絞り込み中のため、カードは動かせません/

function rect(x: number, y: number, width: number, height: number): DOMRect {
  return { x, y, left: x, top: y, width, height, right: x + width, bottom: y + height, toJSON: () => ({}) }
}

// 列は 400px ずつ右へ、カードは 60px ずつ下へ並べた位置にする
function stubLayout() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const section = this.closest('section')
    if (!section) return rect(0, 0, 0, 0)
    const sections = Array.from(document.querySelectorAll('section'))
    const x = sections.indexOf(section) * 400
    if (this === section) return rect(x, 0, 320, 1000)
    const li = this.closest('li')
    if (!li) return rect(x, 0, 320, 40)
    const index = Array.from(section.querySelectorAll('li')).indexOf(li)
    return rect(x, 100 + index * 60, 320, 50)
  })
}

// PUT /move を受けると、並びを書き換えて、次の GET から返すモック（failMove が true なら、500 を返す）
function mockApi(failMove = false) {
  const stored = cards.map((c) => ({ ...c }))
  const fn = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'PUT' && url.endsWith('/move')) {
      if (failMove) return Promise.resolve({ ok: false, status: 500 } as Response)
      const id = Number(url.split('/')[3])
      const { columnId, index } = JSON.parse(init.body as string) as { columnId: number; index: number }
      const moving = stored.find((c) => c.id === id)!
      const others = stored
        .filter((c) => c.columnId === columnId && c.id !== id)
        .sort((a, b) => a.position - b.position)
      others.splice(index, 0, moving)
      moving.columnId = columnId
      others.forEach((c, i) => (c.position = i))
      return Promise.resolve({ ok: true, json: async () => moving } as Response)
    }
    return Promise.resolve({
      ok: true,
      json: async () => (url.startsWith('/api/columns') ? columns : stored),
    } as Response)
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const moveCalls = (fn: ReturnType<typeof mockApi>) =>
  fn.mock.calls.filter(([url, init]) => init?.method === 'PUT' && String(url).endsWith('/move'))

const titlesIn = (name: string) =>
  within(screen.getByRole('region', { name }))
    .queryAllByRole('listitem')
    .map((li) => li.textContent)

async function setup(failMove = false) {
  const fn = mockApi(failMove)
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })
  return { fn, user }
}

beforeEach(stubLayout)
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('同じ列の中で、カードを下へ動かすと、画面に反映され、保存される', async () => {
  const { fn, user } = await setup()
  expect(titlesIn('ToDo')).toEqual(['部屋の掃除', '牛乳を買う'])

  screen.getByRole('button', { name: /部屋の掃除/ }).focus()
  await user.keyboard(' ')
  await user.keyboard('{ArrowDown}')
  await user.keyboard(' ')

  await waitFor(() => expect(moveCalls(fn)).toHaveLength(1))
  const [url, init] = moveCalls(fn)[0]
  expect(url).toBe('/api/cards/1/move')
  expect(JSON.parse(init!.body as string)).toEqual({ columnId: 1, index: 1 })
  await waitFor(() => expect(titlesIn('ToDo')).toEqual(['牛乳を買う', '部屋の掃除']))
})

test('別の列へ動かすと、その列に入り、元の列から消える', async () => {
  const { fn, user } = await setup()

  screen.getByRole('button', { name: /部屋の掃除/ }).focus()
  await user.keyboard(' ')
  await user.keyboard('{ArrowRight}')
  await user.keyboard(' ')

  await waitFor(() => expect(moveCalls(fn)).toHaveLength(1))
  const body = JSON.parse(moveCalls(fn)[0][1]!.body as string) as { columnId: number }
  expect(body.columnId).toBe(2)
  await waitFor(() => expect(titlesIn('作業中')).toContain('部屋の掃除'))
  expect(titlesIn('ToDo')).toEqual(['牛乳を買う'])
})

test('つかんだあと Esc で取り消すと、動かないし、保存もされない', async () => {
  const { fn, user } = await setup()

  screen.getByRole('button', { name: /部屋の掃除/ }).focus()
  await user.keyboard(' ')
  await user.keyboard('{ArrowRight}')
  await user.keyboard('{Escape}')

  expect(titlesIn('ToDo')).toEqual(['部屋の掃除', '牛乳を買う'])
  expect(moveCalls(fn)).toHaveLength(0)
})

test('保存に失敗したら、元の並びに戻って、エラーが出る', async () => {
  const { fn, user } = await setup(true)

  screen.getByRole('button', { name: /部屋の掃除/ }).focus()
  await user.keyboard(' ')
  await user.keyboard('{ArrowDown}')
  await user.keyboard(' ')

  expect(await screen.findByRole('alert')).toHaveTextContent('サーバーからエラーが返りました')
  expect(titlesIn('ToDo')).toEqual(['部屋の掃除', '牛乳を買う'])
  expect(moveCalls(fn)).toHaveLength(1)
})

test('カードを短く押すだけなら、動かさずに、モーダルが開く', async () => {
  const { fn, user } = await setup()

  await user.click(screen.getByRole('button', { name: /部屋の掃除/ }))

  expect(screen.getByRole('dialog', { name: 'カードを編集' })).toBeInTheDocument()
  expect(moveCalls(fn)).toHaveLength(0)
})

test('絞り込み中は、お知らせが出て、カードを動かせない', async () => {
  const { fn, user } = await setup()
  expect(screen.queryByText(BANNER)).not.toBeInTheDocument()

  await user.type(screen.getByLabelText('キーワード'), '掃除')
  await user.click(screen.getByRole('button', { name: '検索' }))

  expect(await screen.findByText(BANNER)).toBeInTheDocument()
  await screen.findByRole('region', { name: 'ToDo' })
  const button = screen.getByRole('button', { name: /部屋の掃除/ })
  expect(button).not.toHaveAttribute('aria-roledescription')
  button.focus()
  await user.keyboard(' ')
  await user.keyboard('{ArrowDown}')
  await user.keyboard(' ')
  expect(moveCalls(fn)).toHaveLength(0)
})

test('「クリア」を押すと、お知らせが消えて、カードを動かせるようになる', async () => {
  const { user } = await setup()
  await user.type(screen.getByLabelText('キーワード'), '掃除')
  await user.click(screen.getByRole('button', { name: '検索' }))
  await screen.findByText(BANNER)

  await user.click(screen.getByRole('button', { name: 'クリア' }))

  await waitFor(() => expect(screen.queryByText(BANNER)).not.toBeInTheDocument())
  await screen.findByRole('region', { name: 'ToDo' })
  expect(screen.getByRole('button', { name: /部屋の掃除/ })).toHaveAttribute('aria-roledescription')
})

// ---------- ドロップ先を示す青い線（設計書：ドロップ先は、青い線で示す） ----------

const indicatorsIn = (name: string) =>
  within(screen.getByRole('region', { name })).queryAllByTestId('drop-indicator').length

test('つかんでいる間だけ、いま落とす場所のある列に、青い線が1本出る', async () => {
  const { user } = await setup()
  expect(indicatorsIn('ToDo') + indicatorsIn('作業中') + indicatorsIn('完了')).toBe(0)

  screen.getByRole('button', { name: /部屋の掃除/ }).focus()
  await user.keyboard(' ') // つかむ
  expect(indicatorsIn('ToDo')).toBe(1)
  expect(indicatorsIn('作業中')).toBe(0)

  await user.keyboard('{ArrowRight}') // 隣の列へ
  await waitFor(() => expect(indicatorsIn('作業中')).toBe(1))
  expect(indicatorsIn('ToDo')).toBe(0)

  await user.keyboard(' ') // 置く
  await waitFor(() => expect(indicatorsIn('作業中')).toBe(0))
  expect(indicatorsIn('ToDo') + indicatorsIn('完了')).toBe(0)
})

test('Esc で取り消すと、青い線が消える', async () => {
  const { fn, user } = await setup()

  screen.getByRole('button', { name: /部屋の掃除/ }).focus()
  await user.keyboard(' ')
  await user.keyboard('{ArrowDown}')
  expect(indicatorsIn('ToDo')).toBe(1)

  await user.keyboard('{Escape}')
  expect(indicatorsIn('ToDo')).toBe(0)
  expect(moveCalls(fn)).toHaveLength(0)
})

test('絞り込み中は、カードをつかめないので、青い線も出ない', async () => {
  const { user } = await setup()
  await user.type(screen.getByLabelText('キーワード'), '掃除')
  await user.click(screen.getByRole('button', { name: '検索' }))
  await screen.findByText(BANNER)

  screen.getByRole('button', { name: /部屋の掃除/ }).focus()
  await user.keyboard(' ')
  await user.keyboard('{ArrowDown}')

  expect(indicatorsIn('ToDo')).toBe(0)
})

// PUT /move を、テストが手で「成功」「失敗」させられるモック。成功したときだけ、サーバーの並びを書き換える
function mockControlledMoves() {
  const stored = cards.map((c) => ({ ...c }))
  const moves: { id: number; settle: (ok: boolean) => void }[] = []
  const apply = (id: number, columnId: number, index: number) => {
    const moving = stored.find((c) => c.id === id)!
    const others = stored.filter((c) => c.columnId === columnId && c.id !== id).sort((a, b) => a.position - b.position)
    others.splice(index, 0, moving)
    moving.columnId = columnId
    others.forEach((c, i) => (c.position = i))
    return moving
  }
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === 'PUT' && url.endsWith('/move')) {
        const id = Number(url.split('/')[3])
        const { columnId, index } = JSON.parse(init.body as string) as { columnId: number; index: number }
        return new Promise<Response>((resolve) =>
          moves.push({
            id,
            settle: (ok) =>
              resolve(
                ok
                  ? ({ ok: true, json: async () => apply(id, columnId, index) } as Response)
                  : ({ ok: false, status: 500 } as Response),
              ),
          }),
        )
      }
      return Promise.resolve({
        ok: true,
        json: async () => (url.startsWith('/api/columns') ? columns : stored.map((c) => ({ ...c }))),
      } as Response)
    }),
  )
  return moves
}

const pause = () => new Promise((resolve) => setTimeout(resolve, 60))

async function moveRight(user: ReturnType<typeof userEvent.setup>, title: RegExp) {
  screen.getByRole('button', { name: title }).focus()
  await user.keyboard(' ')
  await user.keyboard('{ArrowRight}')
  await user.keyboard(' ')
}

test('保存している間は、次のカードを動かせない。保存が終われば、また動かせる', async () => {
  const moves = mockControlledMoves()
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })

  await moveRight(user, /部屋の掃除/)
  await waitFor(() => expect(moves).toHaveLength(1))
  await moveRight(user, /牛乳を買う/) // 保存中なので、つかめない
  await pause()
  expect(moves).toHaveLength(1)
  expect(titlesIn('ToDo')).toEqual(['牛乳を買う']) // 動かしていないほうは、そのまま
  expect(titlesIn('作業中')).toEqual(['部屋の掃除', '資料を読む']) // 動かしたほうは、先に動いたまま

  await act(async () => moves[0]!.settle(true))
  await pause()
  await moveRight(user, /牛乳を買う/) // 保存が終わったので、動かせる
  await waitFor(() => expect(moves).toHaveLength(2))
  await act(async () => moves[1]!.settle(true))
})

test('保存に失敗したら、元の並びに戻り、エラーが出て、すぐまた動かせる', async () => {
  const moves = mockControlledMoves()
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })

  await moveRight(user, /部屋の掃除/)
  await waitFor(() => expect(moves).toHaveLength(1))
  await act(async () => moves[0]!.settle(false))

  expect(await screen.findByRole('alert')).toHaveTextContent('サーバーからエラーが返りました')
  await waitFor(() => expect(titlesIn('ToDo')).toEqual(['部屋の掃除', '牛乳を買う']))
  await moveRight(user, /牛乳を買う/)
  await waitFor(() => expect(moves).toHaveLength(2)) // 失敗のあとも、動かせなくならない
  await act(async () => moves[1]!.settle(true))
})
