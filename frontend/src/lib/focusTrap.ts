import type { KeyboardEvent } from 'react'

// Tab キーを、root の中で回す（いちばん後ろの次は、いちばん前。Shift + Tab は、逆）。窓の外には出さない。
// 窓（ポップオーバー）の onKeyDown で呼ぶ。Tab で止まれるのは、tabIndex が 0 以上で、使えるボタン
export function wrapTabFocus(e: KeyboardEvent, root: HTMLElement | null) {
  if (e.key !== 'Tab') return
  const items = Array.from(root?.querySelectorAll<HTMLElement>('button') ?? []).filter(
    (button) => button.tabIndex >= 0 && !button.hasAttribute('disabled'),
  )
  if (items.length === 0) return
  const first = items[0]
  const last = items[items.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}
