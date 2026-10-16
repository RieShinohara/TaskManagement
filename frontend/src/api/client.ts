import type { BackupFile, Card, CardCreateInput, CardMoveInput, CardSearch, CardUpdateInput, Column } from './types'

const CONNECTION_ERROR = 'サーバーに接続できません。バックエンドとDBが起動しているか確認してください。'

// 通信の共通部分。開発中は、Vite のプロキシが /api をバックエンド（8080番）に中継する
// badRequestMessage：400 のときに出す文（省略すると、カードの入力についての文）
async function request<T>(url: string, init?: RequestInit, badRequestMessage?: string): Promise<T> {
  let response: Response
  try {
    response = init ? await fetch(url, init) : await fetch(url)
  } catch {
    throw new Error(CONNECTION_ERROR)
  }
  if (!response.ok) {
    // バックエンドが止まっているとき、プロキシは 502 などを返す
    if ([502, 503, 504].includes(response.status)) throw new Error(CONNECTION_ERROR)
    if (response.status === 400)
      throw new Error(
        badRequestMessage ?? '入力内容を確認してください（タイトルは必須で255文字まで、説明文は2000文字までです）',
      )
    if (response.status === 404) throw new Error('カードが見つかりません。画面を読み込み直してください。')
    throw new Error(`サーバーからエラーが返りました（${response.status}）`)
  }
  // 204 No Content（削除のあと）は、中身が空。JSONとして読むと失敗するので、読まずに終わる
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function getJson<T>(url: string): Promise<T> {
  return request<T>(url)
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

export function createCard(input: CardCreateInput): Promise<Card> {
  return request<Card>('/api/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function deleteCard(id: number): Promise<void> {
  return request<void>(`/api/cards/${id}`, { method: 'DELETE' })
}

export function updateCard(id: number, input: CardUpdateInput): Promise<Card> {
  return request<Card>(`/api/cards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function moveCard(id: number, input: CardMoveInput): Promise<Card> {
  return request<Card>(`/api/cards/${id}/move`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

// 列のカードを、期限の早い順に並べ直して保存する（期限なしは末尾）。並べ直したカードが、上から順に返る
export function sortColumnByDue(columnId: number): Promise<Card[]> {
  return request<Card[]>(`/api/columns/${columnId}/sort-by-due`, { method: 'POST' })
}

// 全データ（列とカード）を、バックアップファイルの形で受け取る
export function fetchBackup(): Promise<BackupFile> {
  return getJson<BackupFile>('/api/backup')
}

export const UNREADABLE_BACKUP = 'このファイルは読み込めません。'

// バックアップファイルの内容で、今のデータを全部入れ替える。サーバーが拒否（400）したときは、読めないファイルとして扱う
export function restoreBackup(file: BackupFile): Promise<void> {
  return request<void>(
    '/api/backup/restore',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(file) },
    UNREADABLE_BACKUP,
  )
}
