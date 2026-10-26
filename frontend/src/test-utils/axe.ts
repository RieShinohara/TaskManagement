import axe from 'axe-core'
import { expect } from 'vitest'

// いまの画面（element の中）を、アクセシビリティの自動検査にかけて、違反があれば、読みやすい文で落とす。
// 色のコントラストは、テスト環境（jsdom）が色を計算できないので、検査しない（実際のブラウザで確かめる）
export async function expectNoA11yViolations(element: Element = document.body): Promise<void> {
  const { violations } = await axe.run(element, { rules: { 'color-contrast': { enabled: false } } })
  const report = violations
    .map((v) => `${v.id}（${v.impact}）：${v.help}\n${v.nodes.map((n) => `  ${n.html}`).join('\n')}`)
    .join('\n\n')
  expect(violations, `アクセシビリティの違反が ${violations.length} 種類あります\n\n${report}\n`).toHaveLength(0)
}
