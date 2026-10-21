import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const GAP = 4 // きっかけのボタンと窓の間
const MARGIN = 8 // 画面の端との間

// ボタンを押すと、すぐ下に開く小さな窓（ポップオーバー）の共通部分。下に入らないときは、上に開く。
// 窓は、画面に固定して（fixed）、body の直下に出す想定（列やモーダルの枠で、切り取られないようにするため）。
// 窓の外を押したら閉じる（きっかけのボタンを押したときは、ボタン側で開け閉めする）
export function usePopover() {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // 窓を置く位置を決める。画面からはみ出さないようにする
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !popoverRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const { width, height } = popoverRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - trigger.bottom - GAP - MARGIN
    const spaceAbove = trigger.top - GAP - MARGIN
    // 下に入らず、上のほうが広いときだけ、上に出す
    const placeAbove = height > spaceBelow && spaceAbove > spaceBelow
    const wantedTop = placeAbove ? trigger.top - GAP - height : trigger.bottom + GAP
    const top = Math.max(MARGIN, Math.min(wantedTop, window.innerHeight - height - MARGIN))
    const left = Math.max(MARGIN, Math.min(trigger.left, window.innerWidth - width - MARGIN))
    setPosition({ top, left })
  }, [])

  // 開いたとき（描く前）に位置を決める。開いている間に、画面の大きさやスクロールが変わったら、決め直す
  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, updatePosition])

  // 窓の外を押したら、何も選ばずに閉じる
  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  const close = useCallback(() => {
    setOpen(false)
    setPosition(null)
  }, [])

  // 閉じる。窓の中に、フォーカスがあったとき（キーボードで操作していたとき）は、フォーカスを、開いたボタンに戻す。
  // マウスで操作していたとき（フォーカスは、ほかの所に残っている）は、そのまま
  const closeAndFocusTrigger = useCallback(() => {
    const hadFocus = popoverRef.current?.contains(document.activeElement)
    close()
    if (hadFocus) triggerRef.current?.focus()
  }, [close])

  return { open, setOpen, close, closeAndFocusTrigger, position, triggerRef, popoverRef }
}
