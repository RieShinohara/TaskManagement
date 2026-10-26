import { useCallback, useEffect, useState } from 'react'
import { backgroundImageUrl, deleteBackgroundImage, fetchBackgroundImages, uploadBackgroundImage } from '../api/client'
import { USER_IMAGE_SLOTS } from '../api/types'
import type { UserImage, UserImageSlot } from '../api/types'
import {
  HEADER_BYTES,
  isAcceptedImage,
  isTooLarge,
  isTooManyPixels,
  NOT_IMAGE_MESSAGE,
  readImageSize,
  resizeToJpeg,
  TOO_LARGE_MESSAGE,
  TOO_MANY_PIXELS_MESSAGE,
} from '../lib/image'

// 登録済みの画像。割り当て先 → その画像
type ImageMap = Partial<Record<UserImageSlot, UserImage>>

// 登録済みの、自分の背景画像を持つ。登録（縮小して送る）と、削除（元に戻す）もできる。
// 失敗したときは、Error を投げる（メッセージは、そのまま画面に出せる文）
export function useBackgroundImages(): {
  images: ImageMap
  urls: Partial<Record<UserImageSlot, string>> // 画像を表示するときの URL
  register: (slot: UserImageSlot, file: File) => Promise<void>
  remove: (slot: UserImageSlot) => Promise<void>
} {
  const [images, setImages] = useState<ImageMap>({})

  useEffect(() => {
    let cancelled = false
    fetchBackgroundImages()
      .then((list) => {
        // 想定外の返事（形の違うもの）は、無視する
        if (cancelled || !Array.isArray(list)) return
        const next: ImageMap = {}
        for (const image of list) {
          if (USER_IMAGE_SLOTS.includes(image?.slot)) next[image.slot] = image
        }
        setImages(next)
      })
      .catch(() => {
        // 取得できないときは、標準の画像のまま。エラーは、ボードの取得のほうで出る
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 選んだファイルを、検査し（種類・ファイルの大きさ・画素数）、横1920px以下のJPEGに縮小して、サーバーに送る
  const register = useCallback(async (slot: UserImageSlot, file: File) => {
    if (!isAcceptedImage(file)) throw new Error(NOT_IMAGE_MESSAGE)
    if (isTooLarge(file)) throw new Error(TOO_LARGE_MESSAGE)
    // 開くと巨大になる画像（ファイルは小さい）を防ぐため、開く前に、先頭から縦横の大きさを読んで調べる
    const header = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer())
    const size = readImageSize(header)
    if (!size) throw new Error(NOT_IMAGE_MESSAGE)
    if (isTooManyPixels(size)) throw new Error(TOO_MANY_PIXELS_MESSAGE)
    // 種類は画像でも、中身が壊れていて開けないことがある
    const jpeg = await resizeToJpeg(file).catch(() => {
      throw new Error(NOT_IMAGE_MESSAGE)
    })
    const saved = await uploadBackgroundImage(slot, jpeg)
    setImages((current) => ({ ...current, [slot]: saved }))
  }, [])

  const remove = useCallback(async (slot: UserImageSlot) => {
    await deleteBackgroundImage(slot)
    setImages((current) => {
      const next = { ...current }
      delete next[slot]
      return next
    })
  }, [])

  const urls: Partial<Record<UserImageSlot, string>> = {}
  for (const slot of USER_IMAGE_SLOTS) {
    const image = images[slot]
    if (image) urls[slot] = backgroundImageUrl(image)
  }

  return { images, urls, register, remove }
}
