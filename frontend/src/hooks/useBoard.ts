import { useEffect, useState } from 'react'
import { fetchCards, fetchColumns } from '../api/client'
import type { Card, CardSearch, Column } from '../api/types'

export type BoardState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; columns: Column[]; cards: Card[] }

// 取得の結果と、どの検索条件の結果かを、セットで持つ
type Fetched = { search: CardSearch; result: Exclude<BoardState, { status: 'loading' }> }

// 列とカードを取得する。検索の条件が変わったら、取り直す
export function useBoard(search: CardSearch): BoardState {
  const [fetched, setFetched] = useState<Fetched | null>(null)

  useEffect(() => {
    let cancelled = false // 古い問い合わせの結果で、画面を上書きしないため
    Promise.all([fetchColumns(), fetchCards(search)])
      .then(([columns, cards]) => {
        if (!cancelled) setFetched({ search, result: { status: 'success', columns, cards } })
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : '読み込みに失敗しました'
          setFetched({ search, result: { status: 'error', message } })
        }
      })
    return () => {
      cancelled = true
    }
  }, [search])

  // 今の検索条件の結果がまだ届いていなければ「読み込み中」
  return fetched !== null && fetched.search === search ? fetched.result : { status: 'loading' }
}
