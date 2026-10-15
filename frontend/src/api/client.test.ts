import { afterEach, expect, test, vi } from 'vitest'
import { createCard, fetchCards } from './client'

afterEach(() => vi.unstubAllGlobals())

function stubFetch(response: Partial<Response> | Error) {
  const fn = vi.fn(() => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response)))
  vi.stubGlobal('fetch', fn)
  return fn
}

test('条件が空のときは、クエリを付けない', async () => {
  const fn = stubFetch({ ok: true, json: async () => [] })
  await fetchCards({ keyword: '', dueBefore: '' })
  expect(fn).toHaveBeenCalledWith('/api/cards')
})

test('指定した条件だけが、クエリになる', async () => {
  const fn = stubFetch({ ok: true, json: async () => [] })
  await fetchCards({ keyword: ' 買い ', dueBefore: '2026-10-20' })
  expect(fn).toHaveBeenCalledWith(`/api/cards?keyword=${encodeURIComponent('買い')}&dueBefore=2026-10-20`)
})

test('接続できないときは、分かりやすいエラーにする', async () => {
  stubFetch(new TypeError('Failed to fetch'))
  await expect(fetchCards({ keyword: '', dueBefore: '' })).rejects.toThrow('サーバーに接続できません')
})

test('HTTPエラーのときは、ステータスを含むエラーにする', async () => {
  stubFetch({ ok: false, status: 500 })
  await expect(fetchCards({ keyword: '', dueBefore: '' })).rejects.toThrow('500')
})

test('プロキシの 502（バックエンド停止中）は、接続エラーとして扱う', async () => {
  stubFetch({ ok: false, status: 502 })
  await expect(fetchCards({ keyword: '', dueBefore: '' })).rejects.toThrow('サーバーに接続できません')
})

const input = { title: '新しいカード', columnId: 1, color: 'red', dueDate: null } as const

test('カード追加は、JSONで POST する', async () => {
  const created = { id: 9, ...input, position: -1 }
  const fn = stubFetch({ ok: true, json: async () => created })
  await expect(createCard(input)).resolves.toEqual(created)
  expect(fn).toHaveBeenCalledWith('/api/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
})

test('カード追加で 400 が返ったときは、入力の確認を促すエラーにする', async () => {
  stubFetch({ ok: false, status: 400 })
  await expect(createCard(input)).rejects.toThrow('入力内容を確認してください')
})

test('カード追加で接続できないときは、接続エラーにする', async () => {
  stubFetch(new TypeError('Failed to fetch'))
  await expect(createCard(input)).rejects.toThrow('サーバーに接続できません')
})
