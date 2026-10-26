import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'
import type { Background, Card, Column, UserImage } from './api/types'
import { jpegBytes, pngBytes } from './test-utils/imageBytes'

// 縮小（canvas）は、jsdom では動かないので、差し替える。ほかの関数は、本物を使う
vi.mock('./lib/image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/image')>()),
  resizeToJpeg: vi.fn(async () => new Blob(['resized-jpeg'], { type: 'image/jpeg' })),
}))
import { resizeToJpeg } from './lib/image'

// 自分の画像を背景に登録する・元に戻す、のテスト（画面全体を、通信をモックして動かす）

const columns: Column[] = [{ id: 1, name: 'ToDo', sortOrder: 0 }]
const cards: Card[] = [
  { id: 1, title: '牛乳を買う', description: null, color: 'none', dueDate: null, columnId: 1, position: 0 },
]

type Options = { background?: Background; images?: UserImage[]; failUpload?: boolean }

// 設定と、画像の一覧・登録（PUT）・削除（DELETE）をするモック
function mockApi({ background = 'sky', images = [], failUpload = false }: Options = {}) {
  let current = background
  let stored = [...images]
  const fn = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>((url, init) => {
    const ok = (body: unknown) => Promise.resolve({ ok: true, json: async () => body } as Response)
    if (url === '/api/settings') {
      if (init?.method === 'PUT') current = (JSON.parse(init.body as string) as { background: Background }).background
      return ok({ background: current })
    }
    if (url === '/api/background-images') return ok(stored)
    const match = /^\/api\/background-images\/(sky|sunset|night)$/.exec(url)
    if (match) {
      const slot = match[1] as UserImage['slot']
      if (init?.method === 'PUT') {
        if (failUpload) return Promise.resolve({ ok: false, status: 400 } as Response)
        const saved: UserImage = { slot, updatedAt: '2026-10-16T10:00:00.123Z' }
        stored = [...stored.filter((i) => i.slot !== slot), saved]
        return ok(saved)
      }
      if (init?.method === 'DELETE') {
        stored = stored.filter((i) => i.slot !== slot)
        return Promise.resolve({ ok: true, status: 204 } as Response)
      }
    }
    return ok(url.startsWith('/api/columns') ? columns : cards)
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const callsTo = (fn: ReturnType<typeof mockApi>, method: string, urlPart: string) =>
  fn.mock.calls.filter(([url, init]) => init?.method === method && String(url).includes(urlPart))

const layer = () => document.querySelector('[data-scene]')

const SKY_IMAGE: UserImage = { slot: 'sky', updatedAt: '2026-10-16T09:00:00.000Z' }
const SKY_URL = '/api/background-images/sky?v=2026-10-16T09%3A00%3A00.000Z'

async function setup(options: Options = {}, userOptions: Parameters<typeof userEvent.setup>[0] = {}) {
  const fn = mockApi(options)
  const user = userEvent.setup(userOptions)
  render(<App />)
  await screen.findByRole('region', { name: 'ToDo' })
  return { fn, user }
}

async function openPicker(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '背景' }))
  return screen.getByRole('dialog', { name: '背景を選ぶ' })
}

// 画像を開く前に、先頭から縦横の大きさを読むので、先頭だけは本物の形にする（中身は、ない）
const imageFile = (type = 'image/png', name = 'photo.png', bytes: Uint8Array<ArrayBuffer> = pngBytes(1600, 900)) =>
  new File([bytes], name, { type })

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

test('登録済みの画像があれば、標準の画像より優先して、背景に出る', async () => {
  await setup({ background: 'sky', images: [SKY_IMAGE] })

  await waitFor(() => expect(layer()).toHaveAttribute('data-user-image', SKY_URL))
  expect(layer()).toHaveAttribute('data-scene', 'sky')
  expect(layer()).not.toHaveClass('bg-scene-sky') // 標準の画像のクラスは、付かない
})

test('自分の画像には、黒10%の暗幕が重なる', async () => {
  await setup({ background: 'sky', images: [SKY_IMAGE] })

  await waitFor(() => expect(layer()).toHaveAttribute('data-user-image'))
  expect((layer() as HTMLElement).style.backgroundImage).toContain('rgba(0, 0, 0, 0.1)')
  expect((layer() as HTMLElement).style.backgroundImage).toContain(SKY_URL)
})

test('登録していない背景は、これまでどおり標準の画像で出る', async () => {
  await setup({ background: 'night', images: [SKY_IMAGE] }) // 登録があるのは青空だけ

  await waitFor(() => expect(layer()).toHaveAttribute('data-scene', 'night'))
  expect(layer()).toHaveClass('bg-scene-night')
  expect(layer()).not.toHaveAttribute('data-user-image')
})

test('「画像を選ぶ」は青空・夕焼け・星空の行だけにあり、「元に戻す」は登録済みの行だけにある', async () => {
  const { user } = await setup({ images: [SKY_IMAGE] })
  await waitFor(() => expect(layer()).toHaveAttribute('data-user-image'))

  const dialog = await openPicker(user)

  for (const label of ['青空', '夕焼け', '星空']) {
    expect(within(dialog).getByRole('button', { name: `${label}の画像を選ぶ` })).toBeInTheDocument()
  }
  expect(within(dialog).queryByRole('button', { name: /無地の画像/ })).not.toBeInTheDocument()
  expect(within(dialog).queryByRole('button', { name: /自動.*の画像/ })).not.toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: '青空の画像を元に戻す' })).toBeInTheDocument()
  expect(within(dialog).queryByRole('button', { name: '夕焼けの画像を元に戻す' })).not.toBeInTheDocument()
  expect(within(dialog).queryByRole('button', { name: '星空の画像を元に戻す' })).not.toBeInTheDocument()
})

test('登録した画像は、その行の見本にも出る', async () => {
  const { user } = await setup({ images: [SKY_IMAGE] })
  await waitFor(() => expect(layer()).toHaveAttribute('data-user-image'))

  const dialog = await openPicker(user)

  const sample = within(dialog).getByRole('radio', { name: '青空' }).querySelector('[data-user-image]')
  expect(sample).toHaveAttribute('data-user-image', SKY_URL)
  expect(within(dialog).getByRole('radio', { name: '星空' }).querySelector('[data-user-image]')).toBeNull()
})

test('画像を選ぶと、縮小したJPEGが送られ、その背景に切り替わる', async () => {
  const { fn, user } = await setup({ background: 'plain' })
  const dialog = await openPicker(user)

  await user.click(within(dialog).getByRole('button', { name: '夕焼けの画像を選ぶ' }))
  await user.upload(screen.getByLabelText('背景にする画像を選ぶ'), imageFile())

  await waitFor(() => expect(callsTo(fn, 'PUT', '/api/background-images/sunset')).toHaveLength(1))
  const [, init] = callsTo(fn, 'PUT', '/api/background-images/sunset')[0]
  expect(vi.mocked(resizeToJpeg)).toHaveBeenCalledTimes(1)
  expect(init?.headers).toEqual({ 'Content-Type': 'image/jpeg' })
  const sent = init?.body as Blob
  expect(await sent.text()).toBe('resized-jpeg') // 縮小したものが、送られる
  // その背景（夕焼け）に切り替わり、登録した画像が出る
  await waitFor(() => expect(layer()).toHaveAttribute('data-scene', 'sunset'))
  expect(layer()).toHaveAttribute('data-user-image', '/api/background-images/sunset?v=2026-10-16T10%3A00%3A00.123Z')
  expect(screen.queryByRole('dialog', { name: '背景を選ぶ' })).not.toBeInTheDocument()
  expect(callsTo(fn, 'PUT', '/api/settings')).toHaveLength(1)
})

test('画像でないファイルを選ぶと、読み込めないと出て、登録されない', async () => {
  const { fn, user } = await setup({}, { applyAccept: false })
  const dialog = await openPicker(user)

  await user.click(within(dialog).getByRole('button', { name: '星空の画像を選ぶ' }))
  await user.upload(screen.getByLabelText('背景にする画像を選ぶ'), imageFile('text/plain', 'memo.txt'))

  const notice = await screen.findByRole('alertdialog')
  expect(notice).toHaveTextContent('このファイルは読み込めません。画像（JPEG・PNG・WebP）を選んでください。')
  expect(callsTo(fn, 'PUT', '/api/background-images')).toHaveLength(0)
  expect(vi.mocked(resizeToJpeg)).not.toHaveBeenCalled()
  await user.click(within(notice).getByRole('button', { name: '閉じる' }))
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
})

test('20MBを超えるファイルを選ぶと、大きすぎると出て、登録されない（ちょうど20MBは登録できる）', async () => {
  const { fn, user } = await setup({}, { applyAccept: false })
  const tooLarge = imageFile()
  Object.defineProperty(tooLarge, 'size', { value: 20 * 1024 * 1024 + 1 })
  const justRight = imageFile('image/jpeg', 'big.jpg')
  Object.defineProperty(justRight, 'size', { value: 20 * 1024 * 1024 })

  await user.click(within(await openPicker(user)).getByRole('button', { name: '青空の画像を選ぶ' }))
  await user.upload(screen.getByLabelText('背景にする画像を選ぶ'), tooLarge)
  expect(await screen.findByRole('alertdialog')).toHaveTextContent('ファイルが大きすぎます（20MBまで）。')
  expect(callsTo(fn, 'PUT', '/api/background-images')).toHaveLength(0)
  await user.click(screen.getByRole('button', { name: '閉じる' }))

  await user.click(within(await openPicker(user)).getByRole('button', { name: '青空の画像を選ぶ' }))
  await user.upload(screen.getByLabelText('背景にする画像を選ぶ'), justRight)
  await waitFor(() => expect(callsTo(fn, 'PUT', '/api/background-images/sky')).toHaveLength(1))
})

test('画素数が5000万を超える画像は、開く前に弾かれる（ファイルは小さくても）', async () => {
  const { fn, user } = await setup()

  await user.click(within(await openPicker(user)).getByRole('button', { name: '青空の画像を選ぶ' }))
  await user.upload(
    screen.getByLabelText('背景にする画像を選ぶ'),
    imageFile('image/png', 'bomb.png', pngBytes(30000, 30000)),
  )

  expect(await screen.findByRole('alertdialog')).toHaveTextContent('画像が大きすぎます（5000万画素まで）。')
  expect(vi.mocked(resizeToJpeg)).not.toHaveBeenCalled() // 開いていない
  expect(callsTo(fn, 'PUT', '/api/background-images')).toHaveLength(0)
})

test('5000万画素ちょうどの画像は、登録できる', async () => {
  const { fn, user } = await setup()

  await user.click(within(await openPicker(user)).getByRole('button', { name: '青空の画像を選ぶ' }))
  await user.upload(
    screen.getByLabelText('背景にする画像を選ぶ'),
    imageFile('image/jpeg', 'wide.jpg', jpegBytes(10000, 5000)),
  )

  await waitFor(() => expect(callsTo(fn, 'PUT', '/api/background-images/sky')).toHaveLength(1))
})

test('先頭から縦横が読めないファイルは、開かずに、読み込めないと出る', async () => {
  const { fn, user } = await setup()

  await user.click(within(await openPicker(user)).getByRole('button', { name: '青空の画像を選ぶ' }))
  await user.upload(
    screen.getByLabelText('背景にする画像を選ぶ'),
    imageFile('image/png', 'fake.png', new TextEncoder().encode('image-bytes')),
  )

  expect(await screen.findByRole('alertdialog')).toHaveTextContent('このファイルは読み込めません')
  expect(vi.mocked(resizeToJpeg)).not.toHaveBeenCalled()
  expect(callsTo(fn, 'PUT', '/api/background-images')).toHaveLength(0)
})

test('画像として開けないファイルは、読み込めないと出る', async () => {
  vi.mocked(resizeToJpeg).mockRejectedValueOnce(new Error('decode'))
  const { fn, user } = await setup()

  await user.click(within(await openPicker(user)).getByRole('button', { name: '青空の画像を選ぶ' }))
  await user.upload(screen.getByLabelText('背景にする画像を選ぶ'), imageFile('image/png', 'broken.png'))

  expect(await screen.findByRole('alertdialog')).toHaveTextContent('このファイルは読み込めません')
  expect(callsTo(fn, 'PUT', '/api/background-images')).toHaveLength(0)
})

test('サーバーが断ったときも、お知らせが出て、背景は切り替わらない', async () => {
  const { user } = await setup({ background: 'night', failUpload: true })
  await waitFor(() => expect(layer()).toHaveAttribute('data-scene', 'night'))

  await user.click(within(await openPicker(user)).getByRole('button', { name: '青空の画像を選ぶ' }))
  await user.upload(screen.getByLabelText('背景にする画像を選ぶ'), imageFile())

  expect(await screen.findByRole('alertdialog')).toHaveTextContent('画像を登録できませんでした')
  expect(layer()).toHaveAttribute('data-scene', 'night')
  expect(layer()).not.toHaveAttribute('data-user-image')
})

test('「元に戻す」を押すと、確認なしで、登録した画像が消えて標準の画像に戻る', async () => {
  const { fn, user } = await setup({ background: 'sky', images: [SKY_IMAGE] })
  await waitFor(() => expect(layer()).toHaveAttribute('data-user-image'))
  const dialog = await openPicker(user)

  await user.click(within(dialog).getByRole('button', { name: '青空の画像を元に戻す' }))

  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument() // 確認は出ない
  await waitFor(() => expect(callsTo(fn, 'DELETE', '/api/background-images/sky')).toHaveLength(1))
  await waitFor(() => expect(layer()).not.toHaveAttribute('data-user-image'))
  expect(layer()).toHaveClass('bg-scene-sky')
  expect(within(dialog).queryByRole('button', { name: '青空の画像を元に戻す' })).not.toBeInTheDocument()
  expect(within(dialog).getByRole('radio', { name: '青空' }).querySelector('[data-user-image]')).toBeNull()
})

test('自動のときも、その時間帯に登録した画像があれば、その画像が出る', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 16, 10, 0)) // 10時は青空
  await setup({ background: 'auto', images: [SKY_IMAGE, { slot: 'night', updatedAt: '2026-10-16T08:00:00.000Z' }] })

  await waitFor(() => expect(layer()).toHaveAttribute('data-user-image', SKY_URL))
  expect(layer()).toHaveAttribute('data-scene', 'sky')
})

test('登録の一覧の返事の形が違っても、画面は表示される（標準の画像のまま）', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          url.startsWith('/api/columns')
            ? columns
            : url === '/api/settings'
              ? { background: 'sky' }
              : url === '/api/background-images'
                ? { oops: 1 }
                : cards,
      } as Response),
    ),
  )
  render(<App />)

  expect(await screen.findByRole('region', { name: 'ToDo' })).toBeInTheDocument()
  await waitFor(() => expect(layer()).toHaveAttribute('data-scene', 'sky'))
  expect(layer()).not.toHaveAttribute('data-user-image')
})
