import { afterEach, expect, test, vi } from 'vitest'
import {
  createCard,
  deleteCard,
  fetchBackup,
  fetchCards,
  fetchSettings,
  moveCard,
  restoreBackup,
  sortColumnByDue,
  updateCard,
  updateSettings,
} from './client'

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

test('カード更新は、JSONで PUT する', async () => {
  const updateInput = { title: '更新後', description: null, color: 'blue', dueDate: '2026-11-01' } as const
  const fn = stubFetch({ ok: true, json: async () => ({ id: 5, ...updateInput }) })
  await updateCard(5, updateInput)
  expect(fn).toHaveBeenCalledWith('/api/cards/5', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateInput),
  })
})

test('カード更新で 404 が返ったときは、見つからないことを伝える', async () => {
  stubFetch({ ok: false, status: 404 })
  await expect(updateCard(5, { title: 'x', description: null, color: 'none', dueDate: null })).rejects.toThrow(
    'カードが見つかりません',
  )
})

test('カード削除は、DELETE で送り、204（中身なし）でもエラーにならない', async () => {
  const json = vi.fn()
  const fn = stubFetch({ ok: true, status: 204, json })
  await expect(deleteCard(9)).resolves.toBeUndefined()
  expect(fn).toHaveBeenCalledWith('/api/cards/9', { method: 'DELETE' })
  expect(json).not.toHaveBeenCalled()
})

test('カード削除で 404 が返ったときは、読み込み直しを促すエラーにする', async () => {
  stubFetch({ ok: false, status: 404 })
  await expect(deleteCard(9)).rejects.toThrow('カードが見つかりません')
})

test('カード移動は、動かした先の列と位置を、JSONで PUT する', async () => {
  const moved = { id: 9, title: 'カード', columnId: 2, position: 0 }
  const fn = stubFetch({ ok: true, json: async () => moved })
  await expect(moveCard(9, { columnId: 2, index: 0 })).resolves.toEqual(moved)
  expect(fn).toHaveBeenCalledWith('/api/cards/9/move', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columnId: 2, index: 0 }),
  })
})

test('カード移動で接続できないときは、接続エラーにする', async () => {
  stubFetch(new TypeError('Failed to fetch'))
  await expect(moveCard(9, { columnId: 2, index: 0 })).rejects.toThrow('サーバーに接続できません')
})

test('期限順の並び替えは、列を指定して POST し、並び直したカードを受け取る', async () => {
  const sorted = [{ id: 2, columnId: 1, position: 0 }, { id: 1, columnId: 1, position: 1 }]
  const fn = stubFetch({ ok: true, json: async () => sorted })
  await expect(sortColumnByDue(1)).resolves.toEqual(sorted)
  expect(fn).toHaveBeenCalledWith('/api/columns/1/sort-by-due', { method: 'POST' })
})

test('期限順の並び替えで接続できないときは、接続エラーにする', async () => {
  stubFetch(new TypeError('Failed to fetch'))
  await expect(sortColumnByDue(1)).rejects.toThrow('サーバーに接続できません')
})

const backupFile = { app: 'taskboard', version: 1, columns: [{ name: 'ToDo', cards: [] }] }

test('バックアップの書き出しは、GET して、ファイルの中身を受け取る', async () => {
  const fn = stubFetch({ ok: true, json: async () => backupFile })
  await expect(fetchBackup()).resolves.toEqual(backupFile)
  expect(fn).toHaveBeenCalledWith('/api/backup')
})

test('バックアップの読み込みは、JSONで POST し、204（中身なし）でもエラーにならない', async () => {
  const json = vi.fn()
  const fn = stubFetch({ ok: true, status: 204, json })
  await expect(restoreBackup(backupFile)).resolves.toBeUndefined()
  expect(fn).toHaveBeenCalledWith('/api/backup/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backupFile),
  })
  expect(json).not.toHaveBeenCalled()
})

test('バックアップの読み込みで 400 が返ったときは、読み込めないファイルとして扱う', async () => {
  stubFetch({ ok: false, status: 400 })
  await expect(restoreBackup(backupFile)).rejects.toThrow('このファイルは読み込めません')
})

test('バックアップの読み込みで接続できないときは、接続エラーにする', async () => {
  stubFetch(new TypeError('Failed to fetch'))
  await expect(restoreBackup(backupFile)).rejects.toThrow('サーバーに接続できません')
})

test('設定の取得は、GET して、選んだ背景を受け取る', async () => {
  const fn = stubFetch({ ok: true, json: async () => ({ background: 'night' }) })
  await expect(fetchSettings()).resolves.toEqual({ background: 'night' })
  expect(fn).toHaveBeenCalledWith('/api/settings')
})

test('設定の更新は、JSONで PUT する', async () => {
  const fn = stubFetch({ ok: true, json: async () => ({ background: 'sunset' }) })
  await expect(updateSettings({ background: 'sunset' })).resolves.toEqual({ background: 'sunset' })
  expect(fn).toHaveBeenCalledWith('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ background: 'sunset' }),
  })
})

test('設定を取得・更新できないときは、接続エラーにする', async () => {
  stubFetch(new TypeError('Failed to fetch'))
  await expect(fetchSettings()).rejects.toThrow('サーバーに接続できません')
  await expect(updateSettings({ background: 'sky' })).rejects.toThrow('サーバーに接続できません')
})
