import type { Card, CardSearch, Column } from './types'

const CONNECTION_ERROR = 'サーバーに接続できません。バックエンドとDBが起動しているか確認してください。'

// 開発中は、Vite のプロキシが /api をバックエンド（8080番）に中継する
async function getJson<T>(url: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(url)
  } catch {
    throw new Error(CONNECTION_ERROR)
  }
  if (!response.ok) {
    // バックエンドが止まっているとき、プロキシは 502 などを返す
    if ([502, 503, 504].includes(response.status)) throw new Error(CONNECTION_ERROR)
    throw new Error(`サーバーからエラーが返りました（${response.status}）`)
  }
  return response.json() as Promise<T>
}

export function fetchColumns(): Promise<Column[]> {
  return getJson<Column[]>('/api/columns')
}

export function fetchCards(search: CardSearch): Promise<Card[]> {
  const params = new URLSearchParams()
  if (search.keyword.trim()) params.set('keyword', search.keyword.trim())
  if (search.dueBefore) params.set('dueBefore', search.dueBefore)
  const query = params.toString()
  return getJson<Card[]>(query ? `/api/cards?${query}` : '/api/cards')
}
