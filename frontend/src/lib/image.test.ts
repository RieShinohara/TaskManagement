import { expect, test } from 'vitest'
import { fitWidth, isAcceptedImage, isTooLarge, MAX_FILE_BYTES, MAX_WIDTH } from './image'

test('JPEG・PNG・WebP は、登録できる画像', () => {
  expect(isAcceptedImage({ type: 'image/jpeg' })).toBe(true)
  expect(isAcceptedImage({ type: 'image/png' })).toBe(true)
  expect(isAcceptedImage({ type: 'image/webp' })).toBe(true)
})

test('それ以外（GIF・SVG・文書・種類が分からない）は、登録できない', () => {
  expect(isAcceptedImage({ type: 'image/gif' })).toBe(false)
  expect(isAcceptedImage({ type: 'image/svg+xml' })).toBe(false)
  expect(isAcceptedImage({ type: 'text/plain' })).toBe(false)
  expect(isAcceptedImage({ type: 'application/json' })).toBe(false)
  expect(isAcceptedImage({ type: '' })).toBe(false)
})

test('20MBちょうどまでは登録でき、1バイトでも超えると大きすぎる', () => {
  expect(MAX_FILE_BYTES).toBe(20 * 1024 * 1024)
  expect(isTooLarge({ size: MAX_FILE_BYTES })).toBe(false)
  expect(isTooLarge({ size: MAX_FILE_BYTES + 1 })).toBe(true)
  expect(isTooLarge({ size: 0 })).toBe(false)
})

test('横が1920pxより大きい画像は、比率を保って縮小する', () => {
  expect(fitWidth(3840, 2160)).toEqual({ width: 1920, height: 1080 })
  expect(fitWidth(4000, 3000)).toEqual({ width: 1920, height: 1440 })
  expect(fitWidth(1921, 1081)).toEqual({ width: 1920, height: 1080 }) // 四捨五入
})

test('縦長の画像も、横を1920pxに収める', () => {
  expect(fitWidth(3000, 6000)).toEqual({ width: 1920, height: 3840 })
})

test('1920px以下の画像は、拡大も縮小もしない', () => {
  expect(MAX_WIDTH).toBe(1920)
  expect(fitWidth(1920, 1080)).toEqual({ width: 1920, height: 1080 })
  expect(fitWidth(800, 600)).toEqual({ width: 800, height: 600 })
  expect(fitWidth(1, 1)).toEqual({ width: 1, height: 1 })
})

test('とても横長の画像でも、縮小後の高さは1px以上になる', () => {
  expect(fitWidth(100000, 10).height).toBeGreaterThanOrEqual(1)
})
