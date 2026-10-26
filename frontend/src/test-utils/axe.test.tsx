import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { expectNoA11yViolations } from './axe'

// 検査の関数そのものが、ちゃんと違反を見つけるかの確認（いつも「違反なし」になる、壊れた検査を防ぐ）

test('名前のないボタンは、違反として見つかる', async () => {
  // わざと、名前のないボタンを置く（lint にも、同じ指摘をされる）
  // oxlint-disable-next-line jsx-a11y/control-has-associated-label
  render(<button type="button" />)
  await expect(expectNoA11yViolations()).rejects.toThrow(/button-name/)
})

test('開いた dialog の中の、名前のない入力欄も、見つかる', async () => {
  render(
    <dialog open>
      <input type="text" />
    </dialog>,
  )
  await expect(expectNoA11yViolations()).rejects.toThrow(/label/)
})

test('違反のない画面は、通る', async () => {
  render(
    <main>
      <h1>見出し</h1>
      <button type="button">保存</button>
    </main>,
  )
  await expectNoA11yViolations()
})
