import { expect, test } from 'vitest'
import type { Card } from '../api/types'
import { cardsOfColumn, moveCard, positionOf } from './moveCard'

function card(id: number, columnId: number, position: number): Card {
  return { id, title: `カード${id}`, description: null, color: 'none', dueDate: null, columnId, position }
}

// 列1：1,2,3（上から）／列2：4,5／列3：空
const base: Card[] = [card(1, 1, 0), card(2, 1, 1), card(3, 1, 2), card(4, 2, 0), card(5, 2, 1)]

const order = (cards: Card[], columnId: number) => cardsOfColumn(cards, columnId).map((c) => c.id)
const positions = (cards: Card[], columnId: number) => cardsOfColumn(cards, columnId).map((c) => c.position)

test('列のカードは、position の順に返る（同じなら id の順）', () => {
  const shuffled = [card(9, 1, 5), card(7, 1, -2), card(8, 1, 5)]
  expect(order(shuffled, 1)).toEqual([7, 8, 9])
})

test('カードの今の場所が分かる', () => {
  expect(positionOf(base, 3)).toEqual({ columnId: 1, index: 2 })
  expect(positionOf(base, 5)).toEqual({ columnId: 2, index: 1 })
  expect(positionOf(base, 99)).toBeNull()
})

test('同じ列の中で、下へ動かせる', () => {
  expect(order(moveCard(base, 1, 1, 2), 1)).toEqual([2, 3, 1])
})

test('同じ列の中で、上へ動かせる', () => {
  expect(order(moveCard(base, 3, 1, 0), 1)).toEqual([3, 1, 2])
})

test('同じ位置へ動かしても、並びは変わらない', () => {
  expect(order(moveCard(base, 2, 1, 1), 1)).toEqual([1, 2, 3])
})

test('別の列の先頭・途中・末尾へ動かせる', () => {
  expect(order(moveCard(base, 1, 2, 0), 2)).toEqual([1, 4, 5])
  expect(order(moveCard(base, 1, 2, 1), 2)).toEqual([4, 1, 5])
  expect(order(moveCard(base, 1, 2, 2), 2)).toEqual([4, 5, 1])
})

test('動かしたカードの列が変わり、元の列は詰まる', () => {
  const moved = moveCard(base, 2, 2, 0)
  expect(moved.find((c) => c.id === 2)?.columnId).toBe(2)
  expect(order(moved, 1)).toEqual([1, 3])
  expect(positions(moved, 1)).toEqual([0, 1])
  expect(positions(moved, 2)).toEqual([0, 1, 2])
})

test('空の列へも動かせる', () => {
  const moved = moveCard(base, 4, 3, 0)
  expect(order(moved, 3)).toEqual([4])
  expect(positions(moved, 3)).toEqual([0])
  expect(order(moved, 2)).toEqual([5])
})

test('位置が大きすぎるときは一番下、負のときは一番上になる', () => {
  expect(order(moveCard(base, 1, 2, 999), 2)).toEqual([4, 5, 1])
  expect(order(moveCard(base, 5, 2, -3), 2)).toEqual([5, 4])
})

test('負や重なった position があっても、連番に直る', () => {
  const messy = [card(1, 1, -2), card(2, 1, -1), card(3, 1, 0), card(4, 2, 7), card(5, 2, 7)]
  const moved = moveCard(messy, 3, 2, 1)
  expect(positions(moved, 1)).toEqual([0, 1])
  expect(positions(moved, 2)).toEqual([0, 1, 2])
  expect(order(moved, 2)).toEqual([4, 3, 5])
})

test('元の配列は変えない。関係のない列のカードは、そのまま', () => {
  const before = JSON.stringify(base)
  const moved = moveCard(base, 1, 3, 0)
  expect(JSON.stringify(base)).toBe(before)
  expect(moved.find((c) => c.id === 4)).toBe(base.find((c) => c.id === 4))
})

test('ないカードを動かそうとしても、何も起きない', () => {
  expect(moveCard(base, 99, 1, 0)).toBe(base)
})
