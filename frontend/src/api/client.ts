import type {
  BackupFile,
  Card,
  CardCreateInput,
  CardMoveInput,
  CardSearch,
  CardUpdateInput,
  Column,
  Settings,
  UserImage,
  UserImageSlot,
} from './types'

const CONNECTION_ERROR = 'サーバーに接続できません。バックエンドとDBが起動しているか確認してください。'

// 通信の共通部分。開発中は、Vite のプロキシが /api をバックエンド（8080番）に中継する
// messages：サーバーに断られたときに出す文（省略できる）
//   badRequest：400（お願いの内容がだめ）のとき。省略すると、カードの入力についての文
//   tooLarge：413（大きすぎる）のとき。省略すると、番号つきの一般的なエラー
type Messages = { badRequest?: string; tooLarge?: string }

async function request<T>(url: string, init?: RequestInit, messages?: Messages): Promise<T> {
  let response: Response
  try {
    response = init ? await fetch(url, init) : await fetch(url)
  } catch {
    throw new Error(CONNECTION_ERROR)
  }
  if (!response.ok) {
    // バックエンドが止まっているとき、プロキシは 502 などを返す
    if ([502, 503, 504].includes(response.status)) throw new Error(CONNECTION_ERROR)
    if (response.status === 413 && messages?.tooLarge) throw new Error(messages.tooLarge)
    if (response.status === 400)
      throw new Error(
        messages?.badRequest ?? '入力内容を確認してください（タイトルは必須で255文字まで、説明文は2000文字までです）',
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
    { badRequest: UNREADABLE_BACKUP },
  )
}

// 設定（選んだ背景）を取得する。初めては青空（sky）
export function fetchSettings(): Promise<Settings> {
  return getJson<Settings>('/api/settings')
}

export function updateSettings(settings: Settings): Promise<Settings> {
  return request<Settings>('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
}

// 登録済みの自分の背景画像の一覧
export function fetchBackgroundImages(): Promise<UserImage[]> {
  return getJson<UserImage[]>('/api/background-images')
}

// 画像（JPEG）を登録する。すでにあれば、置き換わる。本文は、JPEGのバイト列そのもの
export function uploadBackgroundImage(slot: UserImageSlot, jpeg: Blob): Promise<UserImage> {
  return request<UserImage>(
    `/api/background-images/${slot}`,
    { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: jpeg },
    {
      badRequest: '画像を登録できませんでした。別の画像を選んでください。',
      tooLarge: '画像のファイルサイズが大きすぎて、登録できませんでした（5MBまで）。画像を圧縮するか、別の画像を選んでください。',
    },
  )
}

// 登録した画像を消す（標準の画像に戻る）
export function deleteBackgroundImage(slot: UserImageSlot): Promise<void> {
  return request<void>(`/api/background-images/${slot}`, { method: 'DELETE' })
}

// 登録した画像を表示するときの URL。登録日時を付けて、置き換えたときに、ブラウザが古い画像を使わないようにする
export function backgroundImageUrl(image: UserImage): string {
  return `/api/background-images/${image.slot}?v=${encodeURIComponent(image.updatedAt)}`
}
