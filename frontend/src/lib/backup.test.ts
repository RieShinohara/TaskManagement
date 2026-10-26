import { afterEach, expect, test, vi } from 'vitest'
import {
  backupFileName,
  isBackupTooLarge,
  isSupportedBackupVersion,
  MAX_BACKUP_BYTES,
  parseBackupText,
  saveJsonFile,
} from './backup'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('ファイル名に、保存した日時が付く', () => {
  expect(backupFileName(new Date(2026, 9, 16, 12, 34, 56))).toBe('taskboard-backup-20261016-123456.json')
})

test('ファイル名の月・日・時刻は、1桁のとき0で埋める', () => {
  expect(backupFileName(new Date(2027, 0, 5, 3, 4, 5))).toBe('taskboard-backup-20270105-030405.json')
})

test('バックアップファイルらしい中身は、読める', () => {
  const text = JSON.stringify({ app: 'taskboard', version: 1, columns: [] })
  expect(parseBackupText(text)).toEqual({ app: 'taskboard', version: 1, columns: [] })
})

test('JSONでない・別のアプリ・列がない・形が違うものは、読めない', () => {
  expect(parseBackupText('これはバックアップではありません')).toBeNull()
  expect(parseBackupText('')).toBeNull()
  expect(parseBackupText('[]')).toBeNull()
  expect(parseBackupText('null')).toBeNull()
  expect(parseBackupText('"taskboard"')).toBeNull()
  expect(parseBackupText(JSON.stringify({ app: 'other', version: 1, columns: [] }))).toBeNull()
  expect(parseBackupText(JSON.stringify({ app: 'taskboard', version: 1 }))).toBeNull()
  expect(parseBackupText(JSON.stringify({ app: 'taskboard', version: 1, columns: 'x' }))).toBeNull()
})

test('JSONファイルとして保存する：ファイル名が付き、中身はJSON', async () => {
  let blob: Blob | undefined
  vi.stubGlobal('URL', {
    createObjectURL: (b: Blob) => ((blob = b), 'blob:test'),
    revokeObjectURL: vi.fn(),
  })
  const names: string[] = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    names.push(this.download)
  })

  saveJsonFile({ a: 1 }, 'x.json')

  expect(names).toEqual(['x.json'])
  expect(JSON.parse(await blob!.text())).toEqual({ a: 1 })
  expect(document.querySelector('a[download]')).toBeNull() // 使い終わったリンクは、残さない
})

test('20MBちょうどまでは読め、1バイトでも超えると大きすぎる', () => {
  expect(MAX_BACKUP_BYTES).toBe(20 * 1024 * 1024)
  expect(isBackupTooLarge({ size: MAX_BACKUP_BYTES })).toBe(false)
  expect(isBackupTooLarge({ size: MAX_BACKUP_BYTES + 1 })).toBe(true)
  expect(isBackupTooLarge({ size: 0 })).toBe(false)
})

test('対応しているバージョンは 1 だけ（サーバーと同じ）', () => {
  expect(isSupportedBackupVersion({ version: 1 })).toBe(true)
  expect(isSupportedBackupVersion({ version: 2 })).toBe(false)
  expect(isSupportedBackupVersion({ version: 0 })).toBe(false)
  expect(isSupportedBackupVersion({ version: '1' })).toBe(false) // 文字は、数字ではない
  expect(isSupportedBackupVersion({})).toBe(false)
})
