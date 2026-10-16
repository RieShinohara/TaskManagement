import { useCallback, useEffect, useState } from 'react'
import { fetchSettings, updateSettings } from '../api/client'
import type { Background } from '../api/types'
import { AUTO_CHECK_INTERVAL_MS, isBackground, resolveScene, type Scene } from '../lib/background'

// 設定（選んだ背景）を取得して持つ。背景を選ぶと、先に画面を変え、保存し、失敗したら元に戻す。
// 自動のときは、時刻を見直し続けて、時間が来たら場面が切り替わるようにする
export function useSettings(): {
  background: Background | null // まだ取得できていない（または取得できなかった）ときは null
  scene: Scene
  error: string | null
  setBackground: (background: Background) => void
  reload: () => void
} {
  const [background, setBackgroundState] = useState<Background | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    let cancelled = false // 古い問い合わせの結果で、画面を上書きしないため
    fetchSettings()
      .then((settings) => {
        // 想定外の値（形の違う返事）は、無視する
        if (!cancelled && isBackground(settings?.background)) {
          setNow(new Date()) // 自動のとき、取得した時点の時刻で場面を決める
          setBackgroundState(settings.background)
        }
      })
      .catch(() => {
        // 取得できないときは、背景なしのまま。エラーは、ボードの取得のほうで出る
      })
    return () => {
      cancelled = true
    }
  }, [reloadCount])

  // 自動のときだけ、30秒ごとに時刻を見直す
  useEffect(() => {
    if (background !== 'auto') return
    const timer = setInterval(() => setNow(new Date()), AUTO_CHECK_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [background])

  const setBackground = useCallback(
    (next: Background) => {
      const previous = background
      setNow(new Date()) // 自動を選んだとき、いまの時刻で場面を決める
      setBackgroundState(next) // 先に画面を変える
      setError(null)
      updateSettings({ background: next }).catch((e: unknown) => {
        setBackgroundState(previous) // 保存できなかったので、元に戻す
        setError(e instanceof Error ? e.message : '背景を保存できませんでした')
      })
    },
    [background],
  )

  const reload = useCallback(() => setReloadCount((n) => n + 1), [])

  return { background, scene: resolveScene(background ?? 'plain', now), error, setBackground, reload }
}
