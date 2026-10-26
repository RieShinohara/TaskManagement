import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { expectNoA11yViolations } from '../test-utils/axe'
import { ErrorBoundary } from './ErrorBoundary'

// 画面を描いている途中で、エラーが起きたときの、代わりの画面のテスト

function Bomb(): never {
  throw new Error('描画中のエラー')
}

beforeEach(() => {
  // React は、描画中のエラーを、コンソールに出す。テストの出力が荒れないよう、黙らせる（呼ばれたかは、あとで見る）
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('エラーがなければ、中の画面を、そのまま出す', () => {
  render(
    <ErrorBoundary>
      <p>ふつうの画面</p>
    </ErrorBoundary>,
  )
  expect(screen.getByText('ふつうの画面')).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('描画中にエラーが起きたら、真っ白にならず、代わりの画面が出る', () => {
  render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  )
  const alert = screen.getByRole('alert')
  expect(alert).toHaveTextContent('画面でエラーが起きました')
  expect(alert).toHaveTextContent('保存したデータは、そのまま残っています')
  expect(screen.getByRole('button', { name: '画面を読み込み直す' })).toBeInTheDocument()
})

test('囲まないと、エラーは、そのまま外に出る（比べるための確認）', () => {
  expect(() => render(<Bomb />)).toThrow('描画中のエラー')
})

test('エラーの内容は、あとで調べられるよう、コンソールに残す', () => {
  render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  )
  expect(console.error).toHaveBeenCalledWith('画面の描画中にエラーが起きました', expect.any(Error), expect.anything())
})

test('「画面を読み込み直す」を押すと、ページを読み込み直す', async () => {
  const reload = vi.fn()
  vi.stubGlobal('location', { ...window.location, reload })
  render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  )
  await userEvent.setup().click(screen.getByRole('button', { name: '画面を読み込み直す' }))
  expect(reload).toHaveBeenCalledTimes(1)
})

test('代わりの画面は、アクセシビリティの違反がない', async () => {
  render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  )
  await expectNoA11yViolations()
})
