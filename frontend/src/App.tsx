import { useState } from 'react'
import { EMPTY_SEARCH, type CardSearch } from './api/types'
import { BackgroundLayer } from './components/BackgroundLayer'
import { BackgroundPicker } from './components/BackgroundPicker'
import { BackupControls } from './components/BackupControls'
import { Board } from './components/Board'
import { SearchBar } from './components/SearchBar'
import { useBoard } from './hooks/useBoard'
import { useSettings } from './hooks/useSettings'
import { toneOf } from './lib/background'

function App() {
  const [search, setSearch] = useState<CardSearch>(EMPTY_SEARCH)
  const { board, reload } = useBoard(search)
  const settings = useSettings()
  // 絞り込み中は、画面に出ているのが列の一部のカードだけ。「何番目」が決められないので、カードを動かせなくする
  const searching = search.keyword.trim() !== '' || search.dueBefore !== ''

  return (
    // 背景の層（BackgroundLayer）は、ほかの部品の後ろに置く。この枠には、色を付けない（ページの色は、body に付いている）
    <div className="min-h-screen text-gray-800">
      <BackgroundLayer scene={settings.scene} />
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d5dbe8] bg-white px-6 py-3">
        <h1 className="text-[22px] font-bold">タスク管理</h1>
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar onSearch={setSearch} />
          <BackgroundPicker value={settings.background} onSelect={settings.setBackground} />
          <BackupControls
            onRestored={() => {
              reload()
              settings.reload() // 背景の設定も、バックアップのものに戻る
            }}
          />
        </div>
      </header>
      {settings.error && (
        <p role="alert" className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          {settings.error}
        </p>
      )}
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
            tone={toneOf(settings.scene)}
          />
        )}
      </main>
    </div>
  )
}

export default App
