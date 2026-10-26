import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { failed: boolean }

// 画面を描いている途中でエラーが起きたとき、画面全体が真っ白になるのを防ぐ「受け皿」。
// 代わりに、エラーが起きたことと、読み込み直すボタンを出す。
// 受け止められるのは、「描画中」のエラーだけ。クリックなどの操作や、通信（await）の中のエラーは、
// 受け止められない（それらは、操作した場所のお知らせで扱っている）。
// React の仕組み上、この部品だけは、関数ではなく、クラスで書く必要がある
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  // 子の部品の描画でエラーが起きたとき、React が呼ぶ。次に出す画面を決める
  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  // エラーの内容を、あとで調べられるように、コンソールに残す
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('画面の描画中にエラーが起きました', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="mx-auto max-w-xl p-6">
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <h1 className="text-lg font-bold">画面でエラーが起きました</h1>
          <p className="mt-2">
            保存したデータは、そのまま残っています。画面を読み込み直しても、同じエラーが出るときは、お知らせください。
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-red-700 hover:bg-red-100"
          >
            画面を読み込み直す
          </button>
        </div>
      </main>
    )
  }
}
