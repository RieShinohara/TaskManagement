import { useState } from 'react'
import { EMPTY_SEARCH, type CardSearch } from './api/types'
import { Board } from './components/Board'
import { SearchBar } from './components/SearchBar'
import { useBoard } from './hooks/useBoard'

function App() {
  const [search, setSearch] = useState<CardSearch>(EMPTY_SEARCH)
  const board = useBoard(search)

  return (
    <div className="min-h-screen bg-[#fafbfd] text-gray-800">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d5dbe8] bg-white px-6 py-3">
        <h1 className="text-[22px] font-bold">タスク管理</h1>
        <SearchBar onSearch={setSearch} />
      </header>
      <main>
        {board.status === 'loading' && <p className="p-6 text-gray-500">読み込み中…</p>}
        {board.status === 'error' && (
          <p role="alert" className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {board.message}
          </p>
        )}
        {board.status === 'success' && <Board columns={board.columns} cards={board.cards} />}
      </main>
    </div>
  )
}

export default App
