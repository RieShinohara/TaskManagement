import { describe, expect, test } from 'vitest'
import { jpegBytes, pngBytes, webpExtendedBytes, webpLosslessBytes, webpLossyBytes } from '../test-utils/imageBytes'
import {
  fitWidth,
  isAcceptedImage,
  isTooLarge,
  isTooManyPixels,
  MAX_FILE_BYTES,
  MAX_PIXELS,
  MAX_WIDTH,
  readImageSize,
} from './image'

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

describe('readImageSize：ファイルの先頭から、縦横の大きさを読む（画像を開く前に調べるため）', () => {
  test('PNG', () => {
    expect(readImageSize(pngBytes(1920, 1080))).toEqual({ width: 1920, height: 1080 })
  })
  test('JPEG（縦横の前に、別の部分が入っていても読める）', () => {
    expect(readImageSize(jpegBytes(4032, 3024))).toEqual({ width: 4032, height: 3024 })
  })
  test('WebP（3種類：lossy・lossless・拡張）', () => {
    expect(readImageSize(webpLossyBytes(800, 600))).toEqual({ width: 800, height: 600 })
    expect(readImageSize(webpLosslessBytes(800, 600))).toEqual({ width: 800, height: 600 })
    expect(readImageSize(webpExtendedBytes(800, 600))).toEqual({ width: 800, height: 600 })
  })
  test('とても大きな PNG（3万×3万）も、開かずに、大きさだけ読める', () => {
    expect(readImageSize(pngBytes(30000, 30000))).toEqual({ width: 30000, height: 30000 })
  })
  test('画像でないもの・空・短すぎるもの・途中で切れたものは、null', () => {
    expect(readImageSize(new Uint8Array())).toBeNull()
    expect(readImageSize(new TextEncoder().encode('image-bytes'))).toBeNull()
    expect(readImageSize(pngBytes(10, 10).slice(0, 20))).toBeNull()
    expect(readImageSize(jpegBytes(10, 10).slice(0, 27))).toBeNull()
    expect(readImageSize(webpLossyBytes(10, 10).slice(0, 25))).toBeNull()
  })
  test('縦か横が0のものは、null', () => {
    expect(readImageSize(pngBytes(0, 10))).toBeNull()
    expect(readImageSize(jpegBytes(10, 0))).toBeNull()
  })
})

describe('isTooManyPixels：5000万画素ちょうどまでは通り、1画素でも超えると弾く', () => {
  test('境目', () => {
    expect(MAX_PIXELS).toBe(50_000_000)
    expect(isTooManyPixels({ width: 10000, height: 5000 })).toBe(false)
    expect(isTooManyPixels({ width: 10000, height: 5001 })).toBe(true)
    expect(isTooManyPixels({ width: 4032, height: 3024 })).toBe(false)
  })
  test('3万×3万（9億画素）は弾く', () => {
    expect(isTooManyPixels({ width: 30000, height: 30000 })).toBe(true)
  })
})
