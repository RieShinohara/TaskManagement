import type { Scene } from '../lib/background'

// 画面いっぱいの背景。画面に固定する（スクロールしても動かない）。ほかの部品の後ろに置く。
// 無地のときは、何も出さない（ページの色が見える）。標準の画像には、暗幕を重ねない
export function BackgroundLayer({ scene }: { scene: Scene }) {
  if (scene === 'plain') return null
  return <div aria-hidden="true" data-scene={scene} className={`bg-scene-${scene} fixed inset-0 -z-10`} />
}
