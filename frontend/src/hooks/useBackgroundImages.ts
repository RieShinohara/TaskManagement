import { useCallback, useEffect, useState } from 'react'
import {
  backgroundImageUrl,
  deleteBackgroundImage,
  fetchBackgroundImages,
  uploadBackgroundImage,
} from '../api/client'
import type { UserImage, UserImageSlot } from '../api/types'
import { isAcceptedImage, isTooLarge, NOT_IMAGE_MESSAGE, resizeToJpeg, TOO_LARGE_MESSAGE } from '../lib/image'

// 登録済みの画像。割り当て先 → その画像
type ImageMap = Partial<Record<UserImageSlot, UserImage>>

const SLOTS: string[] = ['sky', 'sunset', 'night']

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
          if (SLOTS.includes(image?.slot)) next[image.slot] = image
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

  // 選んだファイルを、検査し、横1920px以下のJPEGに縮小して、サーバーに送る
  const register = useCallback(async (slot: UserImageSlot, file: File) => {
    if (!isAcceptedImage(file)) throw new Error(NOT_IMAGE_MESSAGE)
    if (isTooLarge(file)) throw new Error(TOO_LARGE_MESSAGE)
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
  for (const slot of SLOTS as UserImageSlot[]) {
    const image = images[slot]
    if (image) urls[slot] = backgroundImageUrl(image)
  }

  return { images, urls, register, remove }
}
