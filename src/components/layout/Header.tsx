'use client'

import { useState } from 'react'

interface HeaderProps {
  onSearch: (query: string) => void
  onScrollToRecommendations: () => void
}

export default function Header({ onSearch, onScrollToRecommendations }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch(query)
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ・タイトル */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="text-3xl mr-2">🎌</span>
              <span className="hidden sm:inline">漫画コレクション</span>
              <span className="sm:hidden">漫画</span>
            </h1>
          </div>

          {/* 検索バー */}
          <div className="flex-1 max-w-lg mx-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="漫画を検索..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex items-center">
            {/* AIおすすめボタン */}
            <button
              onClick={onScrollToRecommendations}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors shadow-sm"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="hidden sm:inline">🤖 AIおすすめ</span>
              <span className="sm:hidden">🤖</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}