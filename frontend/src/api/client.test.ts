import { afterEach, expect, test, vi } from 'vitest'
import { fetchCards } from './client'

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
