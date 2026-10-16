import type { Scene } from '../lib/background'

// 薄い暗幕（黒10%）。自分の画像に重ねて、カードや見出しの文字を読みやすくする
const OVERLAY = 'linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1))'

type Props = {
  scene: Scene
  userImageUrl?: string // この場面に、自分の画像を登録しているとき、その URL
}

// 画面いっぱいの背景。画面に固定する（スクロールしても動かない）。ほかの部品の後ろに置く。
// 無地のときは、何も出さない（ページの色が見える）。
// 自分の画像があれば、標準の画像より優先して、画面いっぱいに広げ、暗幕を重ねる。標準の画像には、暗幕を重ねない
export function BackgroundLayer({ scene, userImageUrl }: Props) {
  if (scene === 'plain') return null
  if (userImageUrl) {
    return (
      <div
        aria-hidden="true"
        data-scene={scene}
        data-user-image={userImageUrl}
        style={{ backgroundImage: `${OVERLAY}, url("${userImageUrl}")` }}
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
      />
    )
  }
  return <div aria-hidden="true" data-scene={scene} className={`bg-scene-${scene} fixed inset-0 -z-10`} />
}
