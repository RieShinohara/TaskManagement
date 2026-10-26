import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSettings, updateSettings } from '../api/client'
import type { Background } from '../api/types'
import { AUTO_CHECK_INTERVAL_MS, isBackground, resolveScene, type Scene } from '../lib/background'

// 設定（選んだ背景）を取得して持つ。背景を選ぶと、先に画面を変え、保存し、失敗したら元に戻す。
// 続けて選んだときは、保存を、選んだ順に、1つずつ行う（前のが終わってから送る）
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
  const savedRef = useRef<Background | null>(null) // サーバーに保存できている、最後の値（失敗したとき、ここに戻す）
  const lastChoiceRef = useRef(0) // 何回目の選択か。失敗した保存が、最新の選択のものかを見分ける
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve()) // 保存の順番待ち

  useEffect(() => {
    let cancelled = false // 古い問い合わせの結果で、画面を上書きしないため
    fetchSettings()
      .then((settings) => {
        // 想定外の値（形の違う返事）は、無視する
        if (!cancelled && isBackground(settings?.background)) {
          setNow(new Date()) // 自動のとき、取得した時点の時刻で場面を決める
          savedRef.current = settings.background
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

  const setBackground = useCallback((next: Background) => {
    const choice = ++lastChoiceRef.current
    setNow(new Date()) // 自動を選んだとき、いまの時刻で場面を決める
    setBackgroundState(next) // 先に画面を変える
    setError(null)
    // 前の保存が終わってから送る（続けて選んだとき、送った順に届くようにするため）
    saveQueueRef.current = saveQueueRef.current
      .then(() => updateSettings({ background: next }))
      .then(
        () => {
          savedRef.current = next
        },
        (e: unknown) => {
          // あとにも選択があるときは、何もしない（あとの保存の結果で、決まる）。
          // 最新の選択が失敗したときだけ、最後に保存できた値に戻す
          if (choice !== lastChoiceRef.current) return
          setBackgroundState(savedRef.current)
          setError(e instanceof Error ? e.message : '背景を保存できませんでした')
        },
      )
  }, [])

  const reload = useCallback(() => setReloadCount((n) => n + 1), [])

  return { background, scene: resolveScene(background ?? 'plain', now), error, setBackground, reload }
}
