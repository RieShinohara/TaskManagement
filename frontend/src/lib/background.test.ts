import { expect, test } from 'vitest'
import { BACKGROUND_OPTIONS, isBackground, resolveScene, sceneAt, toneOf } from './background'

const at = (hour: number, minute = 0) => new Date(2026, 9, 16, hour, minute)

test('自動：5時〜16時は青空', () => {
  expect(sceneAt(at(5, 0))).toBe('sky')
  expect(sceneAt(at(10, 30))).toBe('sky')
  expect(sceneAt(at(15, 59))).toBe('sky')
})

test('自動：16時〜18時は夕焼け', () => {
  expect(sceneAt(at(16, 0))).toBe('sunset')
  expect(sceneAt(at(17, 59))).toBe('sunset')
})

test('自動：18時〜翌5時は星空', () => {
  expect(sceneAt(at(18, 0))).toBe('night')
  expect(sceneAt(at(23, 59))).toBe('night')
  expect(sceneAt(at(0, 0))).toBe('night')
  expect(sceneAt(at(4, 59))).toBe('night')
})

test('自動以外は、選んだ背景がそのまま出る（時刻は関係ない）', () => {
  expect(resolveScene('plain', at(3))).toBe('plain')
  expect(resolveScene('sky', at(3))).toBe('sky')
  expect(resolveScene('sunset', at(12))).toBe('sunset')
  expect(resolveScene('night', at(12))).toBe('night')
})

test('自動は、時刻で決まる', () => {
  expect(resolveScene('auto', at(12))).toBe('sky')
  expect(resolveScene('auto', at(17))).toBe('sunset')
  expect(resolveScene('auto', at(22))).toBe('night')
})

test('列の色合い：無地は今までどおり、星空だけ暗い', () => {
  expect(toneOf('plain')).toBe('plain')
  expect(toneOf('sky')).toBe('light')
  expect(toneOf('sunset')).toBe('light')
  expect(toneOf('night')).toBe('dark')
})

test('選択肢は5つで、名前と順番が決まっている', () => {
  expect(BACKGROUND_OPTIONS.map((o) => o.label)).toEqual(['無地', '青空', '夕焼け', '星空', '自動（時間帯）'])
})

test('背景の値かどうかを調べられる', () => {
  expect(isBackground('night')).toBe(true)
  expect(isBackground('auto')).toBe(true)
  expect(isBackground('rainbow')).toBe(false)
  expect(isBackground(undefined)).toBe(false)
  expect(isBackground([])).toBe(false)
})
