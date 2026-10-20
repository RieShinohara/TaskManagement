import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// 各テストのあとに、描いた画面を片付ける（globals を使わない設定のため、自分で呼ぶ）
afterEach(cleanup)

// テスト環境（jsdom）には、<dialog> の showModal() / close() がない。ブラウザの動きを、最小限、まねる。
// （Tab の閉じ込めと、後ろの画面を操作できなくすること（inert）は、まねられない。実際のブラウザで確かめる）
HTMLDialogElement.prototype.showModal = function showModal() {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function close() {
  this.removeAttribute('open')
}

// Esc キーを押すと、いちばん前の <dialog> に cancel イベントが飛び、止められなければ閉じる（ブラウザと同じ）。
// keydown が、すでに止められている（preventDefault）ときは、何もしない（カレンダーの Esc がこれ）
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || e.defaultPrevented) return
  const dialogs = document.querySelectorAll('dialog[open]')
  const dialog = dialogs[dialogs.length - 1]
  if (!dialog) return
  const cancel = new Event('cancel', { cancelable: true })
  dialog.dispatchEvent(cancel)
  if (!cancel.defaultPrevented) dialog.removeAttribute('open')
})
