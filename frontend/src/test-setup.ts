import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// 各テストのあとに、描いた画面を片付ける（globals を使わない設定のため、自分で呼ぶ）
afterEach(cleanup)
