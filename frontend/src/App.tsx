import { useState } from 'react'
import { EMPTY_SEARCH, type CardSearch } from './api/types'
import { Board } from './components/Board'
import { BackupControls } from './components/BackupControls'
import { SearchBar } from './components/SearchBar'
import { useBoard } from './hooks/useBoard'

function App() {
  const [search, setSearch] = useState<CardSearch>(EMPTY_SEARCH)
  const { board, reload } = useBoard(search)
  // 絞り込み中は、画面に出ているのが列の一部のカードだけ。「何番目」が決められないので、カードを動かせなくする
  const searching = search.keyword.trim() !== '' || search.dueBefore !== ''

  return (
    <div className="min-h-screen bg-[#fafbfd] text-gray-800">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d5dbe8] bg-white px-6 py-3">
        <h1 className="text-[22px] font-bold">タスク管理</h1>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar onSearch={setSearch} />
          <BackupControls onRestored={reload} />
        </div>
      </header>
      {searching && (
        <p role="status" className="border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-800">
          絞り込み中のため、カードは動かせません。「クリア」を押すと、動かせるようになります。
        </p>
      )}
      <main>
        {board.status === 'loading' && <p className="p-6 text-gray-500">読み込み中…</p>}
        {board.status === 'error' && (
          <p role="alert" className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {board.message}
          </p>
        )}
        {board.status === 'success' && (
          <Board
            columns={board.columns}
            cards={board.cards}
            onCardCreated={reload}
            onCardUpdated={reload}
            onCardMoved={reload}
            dragDisabled={searching}
          />
        )}
      </main>
    </div>
  )
}

export default App
