import { useState, type FormEvent } from 'react'
import { EMPTY_SEARCH, type CardSearch } from '../api/types'

type Props = {
  onSearch: (search: CardSearch) => void
}

// 入力しただけでは検索せず、「検索」ボタン（Enterキーも可）で確定する
export function SearchBar({ onSearch }: Props) {
  const [keyword, setKeyword] = useState('')
  const [dueBefore, setDueBefore] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSearch({ keyword, dueBefore })
  }

  function handleClear() {
    setKeyword('')
    setDueBefore('')
    onSearch(EMPTY_SEARCH)
  }

  const inputClass = 'rounded-lg border border-[#d5dbe8] bg-white px-3 py-1.5'
  const buttonBase = 'rounded-lg border px-3 py-1.5'
  const buttonClass = `${buttonBase} border-[#d5dbe8] bg-white hover:bg-[#f1f4fa]`
  const primaryClass = `${buttonBase} border-[#4f7cff] bg-[#4f7cff] text-white hover:bg-[#3f68e0]`

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2">
        <span>キーワード</span>
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="タイトルに含む文字"
          className={inputClass}
        />
      </label>
      <label className="flex items-center gap-2">
        <span>期限（この日まで）</span>
        <input type="date" value={dueBefore} onChange={(e) => setDueBefore(e.target.value)} className={inputClass} />
      </label>
      <button type="submit" className={primaryClass}>
        検索
      </button>
      <button type="button" onClick={handleClear} className={buttonClass}>
        クリア
      </button>
    </form>
  )
}
