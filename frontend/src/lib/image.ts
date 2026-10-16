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

export function isAcceptedImage(file: { type: string }): boolean {
  return ACCEPTED_TYPES.includes(file.type)
}

// 20MBを「超える」ものが、大きすぎる（ちょうど20MBは、登録できる）
export function isTooLarge(file: { size: number }): boolean {
  return file.size > MAX_FILE_BYTES
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
