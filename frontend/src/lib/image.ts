// 自分の画像を登録するときの、画像まわりの関数

// 登録できる画像の種類（JPEG・PNG・WebP）
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// 選べるファイルの大きさの上限（20MB）。これより大きいものは、登録しない
export const MAX_FILE_BYTES = 20 * 1024 * 1024

// 登録するときの、横の幅の上限。これより大きい画像は、この幅に縮小する（小さい画像は、拡大しない）
export const MAX_WIDTH = 1920

// 縮小したJPEGの画質（0〜1）
const JPEG_QUALITY = 0.85

export const NOT_IMAGE_MESSAGE = 'このファイルは読み込めません。画像（JPEG・PNG・WebP）を選んでください。'
export const TOO_LARGE_MESSAGE = 'ファイルが大きすぎます（20MBまで）。'

// 画像を開いたときの、縦×横の画素数の上限（5000万画素）。開くと、1画素あたり4バイトのメモリを使う（約200MB）。
// ファイルが小さくても（とくに PNG は、同じ色が続くと小さくなる）、開くと巨大になる画像があるので、開く前に調べる
export const MAX_PIXELS = 50_000_000
export const TOO_MANY_PIXELS_MESSAGE = '画像が大きすぎます（5000万画素まで）。'

// 縦横の大きさを探すために、ファイルの先頭から読む量。JPEG は、縦横の前に、EXIF などが長く入ることがある
export const HEADER_BYTES = 1024 * 1024

export function isAcceptedImage(file: { type: string }): boolean {
  return ACCEPTED_TYPES.includes(file.type)
}

// 20MBを「超える」ものが、大きすぎる（ちょうど20MBは、登録できる）
export function isTooLarge(file: { size: number }): boolean {
  return file.size > MAX_FILE_BYTES
}

export type ImageSize = { width: number; height: number }

export function isTooManyPixels({ width, height }: ImageSize): boolean {
  return width * height > MAX_PIXELS
}

// ファイルの先頭から、縦横の大きさ（画素数）を読む。画像を開かずに、大きさだけ分かる。
// PNG・JPEG・WebP に対応。画像でない・途中で切れている・縦横が0のものは null
export function readImageSize(bytes: Uint8Array): ImageSize | null {
  const size = readPng(bytes) ?? readJpeg(bytes) ?? readWebp(bytes)
  return size && size.width > 0 && size.height > 0 ? size : null
}

const u16be = (b: Uint8Array, i: number) => ((b[i] ?? 0) << 8) | (b[i + 1] ?? 0)
const u32be = (b: Uint8Array, i: number) => u16be(b, i) * 65536 + u16be(b, i + 2)
const u16le = (b: Uint8Array, i: number) => (b[i] ?? 0) | ((b[i + 1] ?? 0) << 8)
const u24le = (b: Uint8Array, i: number) => u16le(b, i) | ((b[i + 2] ?? 0) << 16)
const u32le = (b: Uint8Array, i: number) => u16le(b, i) + u16le(b, i + 2) * 65536
const hasText = (b: Uint8Array, i: number, text: string) => [...text].every((c, k) => b[i + k] === c.charCodeAt(0))

// PNG：先頭の8バイトが目印、そのあとの IHDR に、横・縦（各4バイト）がある
function readPng(b: Uint8Array): ImageSize | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (b.length < 24 || !signature.every((v, i) => b[i] === v) || !hasText(b, 12, 'IHDR')) return null
  return { width: u32be(b, 16), height: u32be(b, 20) }
}

// JPEG：区切り（0xFF + 種類）をたどって、大きさを持つ区切り（SOF）を探す。SOF は、縦・横（各2バイト）を持つ
function readJpeg(b: Uint8Array): ImageSize | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null
  let i = 2
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null
    const marker = b[i + 1] ?? 0
    if (marker === 0xff) {
      i += 1
      continue
    } // 詰め物
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      i += 2
      continue
    } // 長さのない区切り
    if (marker === 0xd9 || marker === 0xda) return null // 終わり・画像データの始まり（SOF が見つからなかった）
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isStartOfFrame) {
      return i + 9 <= b.length ? { width: u16be(b, i + 7), height: u16be(b, i + 5) } : null
    }
    i += 2 + u16be(b, i + 2)
  }
  return null
}

// WebP：RIFF の入れ物の中の、最初の部分（lossy の VP8、lossless の VP8L、拡張の VP8X）に、縦横がある
function readWebp(b: Uint8Array): ImageSize | null {
  if (b.length < 20 || !hasText(b, 0, 'RIFF') || !hasText(b, 8, 'WEBP')) return null
  if (hasText(b, 12, 'VP8 ')) {
    if (b.length < 30 || b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null
    return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff }
  }
  if (hasText(b, 12, 'VP8L')) {
    if (b.length < 25 || b[20] !== 0x2f) return null
    const bits = u32le(b, 21)
    return { width: (bits % 16384) + 1, height: (Math.floor(bits / 16384) % 16384) + 1 }
  }
  if (hasText(b, 12, 'VP8X') && b.length >= 30) return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 }
  return null
}

// 縦横の比率を保ったまま、横を MAX_WIDTH に収めた大きさ。小さい画像は、そのまま（拡大しない）
export function fitWidth(width: number, height: number): { width: number; height: number } {
  if (width <= MAX_WIDTH) return { width, height }
  return { width: MAX_WIDTH, height: Math.max(1, Math.round((height * MAX_WIDTH) / width)) }
}

// 画像のファイルを、横1920px以下のJPEGにして返す（canvasに描き直す）。PNGの透明な部分は白にする。
// 画像として開けないファイルは、エラーにする
export async function resizeToJpeg(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWidth(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('画像を変換できませんでした')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('画像を変換できませんでした'))),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}
