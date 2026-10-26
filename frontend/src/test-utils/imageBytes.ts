// テスト用：画像ファイルの「先頭だけ」を、バイト列で作る（縦横の大きさが読めれば、中身はなくてよい）

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))
const u16be = (n: number) => [(n >> 8) & 0xff, n & 0xff]
const u32be = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
const u16le = (n: number) => [n & 0xff, (n >> 8) & 0xff]
const u24le = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff]
const u32le = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]

export function pngBytes(width: number, height: number): Uint8Array<ArrayBuffer> {
  return Uint8Array.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // 目印
    ...u32be(13),
    ...ascii('IHDR'),
    ...u32be(width),
    ...u32be(height),
    8,
    6,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ])
}

// 縦横の前に、別の部分（APP0）を挟む。本物の JPEG は、縦横の前に、いろいろ入っている
export function jpegBytes(width: number, height: number): Uint8Array<ArrayBuffer> {
  const app0 = [0xff, 0xe0, ...u16be(16), ...ascii('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]
  const sof0 = [0xff, 0xc0, ...u16be(17), 8, ...u16be(height), ...u16be(width), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]
  return Uint8Array.from([0xff, 0xd8, ...app0, ...sof0])
}

const riff = (chunk: number[]) => [...ascii('RIFF'), ...u32le(chunk.length + 4), ...ascii('WEBP'), ...chunk]

export function webpLossyBytes(width: number, height: number): Uint8Array<ArrayBuffer> {
  const frame = [0x10, 0x02, 0x00, 0x9d, 0x01, 0x2a, ...u16le(width), ...u16le(height)]
  return Uint8Array.from(riff([...ascii('VP8 '), ...u32le(frame.length), ...frame]))
}

export function webpLosslessBytes(width: number, height: number): Uint8Array<ArrayBuffer> {
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14)
  const data = [0x2f, ...u32le(bits >>> 0)]
  return Uint8Array.from(riff([...ascii('VP8L'), ...u32le(data.length), ...data]))
}

export function webpExtendedBytes(width: number, height: number): Uint8Array<ArrayBuffer> {
  const data = [0, 0, 0, 0, ...u24le(width - 1), ...u24le(height - 1)]
  return Uint8Array.from(riff([...ascii('VP8X'), ...u32le(data.length), ...data]))
}
