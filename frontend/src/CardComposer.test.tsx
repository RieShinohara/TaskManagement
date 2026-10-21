import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { createCard } from './api/client'
import { CardComposer } from './components/CardComposer'

// カード追加の入力欄の、フォーカスの動きのテスト（品質チェック F2 の調査から）
// 入力欄の外にフォーカスが出たら、入力があれば追加し、空なら閉じる。色や期限の操作では、確定しない

vi.mock('./api/client', () => ({ createCard: vi.fn(() => Promise.resolve({})) }))

const onCreated = vi.fn()
const onClose = vi.fn()

function renderComposer() {
  render(
    <div>
      <CardComposer columnId={1} onCreated={onCreated} onClose={onClose} />
      <button type="button">欄の外の部品</button>
    </div>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

test('入力して Enter を押すと、カードが追加されて、欄が閉じる', async () => {
  const user = userEvent.setup()
  renderComposer()

  await user.type(screen.getByLabelText('タイトル'), '買い物{Enter}')

  expect(createCard).toHaveBeenCalledWith({ title: '買い物', columnId: 1, color: 'none', dueDate: null })
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('期限のカレンダーを、マウスで開いて日付を選んでも、確定せず、欄は閉じない', async () => {
  const user = userEvent.setup()
  renderComposer()

  await user.type(screen.getByLabelText('タイトル'), '買い物')
  await user.click(screen.getByRole('button', { name: '期限なし' }))
  expect(screen.getByRole('dialog', { name: '期限日を選ぶ' })).toBeInTheDocument()
  // 画面に出ている月の日付を、1つ選ぶ（いまの月は、テストを動かす日で変わる）
  await user.click(screen.getAllByRole('button', { name: /^\d+年\d+月15日$/ })[0])

  expect(createCard).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
  expect(screen.getByLabelText('タイトル')).toHaveValue('買い物')

  await user.type(screen.getByLabelText('タイトル'), '{Enter}')
  expect(createCard).toHaveBeenCalledWith(expect.objectContaining({ title: '買い物', dueDate: expect.stringMatching(/^\d{4}-\d{2}-15$/) }))
})

test('期限のカレンダーを、キーボードで開いただけでは、確定せず、欄は閉じない', async () => {
  const user = userEvent.setup()
  renderComposer()

  await user.type(screen.getByLabelText('タイトル'), '買い物')
  while (document.activeElement?.textContent !== '期限なし') await user.tab()
  await user.keyboard('{Enter}')

  expect(screen.getByRole('dialog', { name: '期限日を選ぶ' })).toBeInTheDocument()
  expect(createCard).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
})

test('期限のボタンから Tab で欄の外に出ると、入力があれば追加される', async () => {
  const user = userEvent.setup()
  renderComposer()

  await user.type(screen.getByLabelText('タイトル'), '買い物')
  while (document.activeElement?.textContent !== '期限なし') await user.tab()
  await user.tab() // カレンダーは画面の末尾に描かれるので、Tab で進むと、欄の外の部品に移る

  expect(screen.getByRole('button', { name: '欄の外の部品' })).toHaveFocus()
  expect(createCard).toHaveBeenCalledTimes(1)
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('何も入力せずに欄の外に出ると、追加せずに閉じる', async () => {
  const user = userEvent.setup()
  renderComposer()

  await user.click(screen.getByLabelText('タイトル'))
  await user.click(screen.getByRole('button', { name: '欄の外の部品' }))

  expect(createCard).not.toHaveBeenCalled()
  expect(onClose).toHaveBeenCalledTimes(1)
})

// ---------- カレンダーにフォーカスが移っても、追加欄は確定しない（F6。F2 の調べで、本当に起きうると分かった） ----------

test('期限のカレンダーを、キーボードで開いて、矢印で動かしても、確定せず、欄は閉じない', async () => {
  const user = userEvent.setup()
  renderComposer()

  await user.type(screen.getByLabelText('タイトル'), '買い物')
  while (document.activeElement?.textContent !== '期限なし') await user.tab()
  await user.keyboard('{Enter}') // カレンダーが開き、フォーカスが、カレンダーの中に移る
  expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^\d+年\d+月\d+日$/)

  await user.keyboard('{ArrowRight}{ArrowDown}{PageDown}') // カレンダーの中で、フォーカスが動く

  expect(createCard).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
})

test('キーボードで日付を選ぶと、追加欄に戻り、その期限で、追加できる', async () => {
  const user = userEvent.setup()
  renderComposer()

  await user.type(screen.getByLabelText('タイトル'), '買い物')
  while (document.activeElement?.textContent !== '期限なし') await user.tab()
  await user.keyboard('{Enter}{ArrowRight}{Enter}')

  expect(createCard).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: /^期限 / })).toHaveFocus() // 期限のボタンに戻った

  await user.click(screen.getByLabelText('タイトル'))
  await user.keyboard('{Enter}')
  expect(createCard).toHaveBeenCalledWith(
    expect.objectContaining({ title: '買い物', dueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
  )
})

test('マウスで期限を選ぶときは、フォーカスが、タイトル欄に残る（日付を選んだあと、Enter で追加できる）', async () => {
  const user = userEvent.setup()
  renderComposer()

  await user.type(screen.getByLabelText('タイトル'), '買い物')
  await user.click(screen.getByRole('button', { name: '期限なし' })) // マウスで開く
  expect(screen.getByLabelText('タイトル')).toHaveFocus() // カレンダーに、フォーカスを奪われない

  await user.click(screen.getAllByRole('button', { name: /^\d+年\d+月15日$/ })[0])
  expect(screen.getByLabelText('タイトル')).toHaveFocus() // 選んだあとも、タイトル欄のまま
  await user.keyboard('{Enter}')

  expect(createCard).toHaveBeenCalledWith(expect.objectContaining({ title: '買い物' }))
})
