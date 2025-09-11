'use client'

import { useState } from 'react'
import { Favorite, Volume } from '@/lib/supabase'
import StarRating from '@/components/StarRating'

interface FavoriteWithVolumes extends Favorite {
  volumes: Volume[]
}

interface MangaTableProps {
  favorites: FavoriteWithVolumes[]
  onDelete: (id: number) => void
  onAddClick: () => void
  onMangaClick: (manga: FavoriteWithVolumes) => void
  searchQuery?: string
  excludedForRecommendation?: Set<string>
  onRecommendationToggle?: (mangaName: string) => void
}

type SortField = 'series_name' | 'author_name' | 'latest_date' | 'user_rating'
type SortDirection = 'asc' | 'desc'

export default function MangaTable({ 
  favorites, 
  onDelete, 
  onAddClick, 
  onMangaClick,
  searchQuery = '',
  excludedForRecommendation = new Set(),
  onRecommendationToggle
}: MangaTableProps) {
  const [sortField, setSortField] = useState<SortField>('latest_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  // 検索フィルタリング
  const filteredFavorites = favorites.filter(manga => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    const seriesName = manga.series_name.toLowerCase()
    const authorName = manga.author_name?.toLowerCase() || ''
    
    return seriesName.includes(query) || authorName.includes(query)
  })

  // ソート機能
  const sortedFavorites = [...filteredFavorites].sort((a, b) => {
    let aValue: string | number | Date
    let bValue: string | number | Date

    switch (sortField) {
      case 'series_name':
        aValue = a.series_name
        bValue = b.series_name
        break
      case 'author_name':
        aValue = a.author_name || ''
        bValue = b.author_name || ''
        break
      case 'latest_date':
        aValue = a.volumes[0]?.release_date ? new Date(a.volumes[0].release_date) : new Date(0)
        bValue = b.volumes[0]?.release_date ? new Date(b.volumes[0].release_date) : new Date(0)
        break
      case 'user_rating':
        aValue = a.user_rating || 0
        bValue = b.user_rating || 0
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // ソートハンドラ
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // 日付フォーマット
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}/${month}/${day}`
  }

  // 価格フォーマット
  const formatPrice = (price: number | null) => {
    if (!price) return '-'
    return `¥${price.toLocaleString()}`
  }

  // 削除確認ハンドラ
  const handleDeleteClick = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    setDeleteConfirmId(id)
  }

  const handleDeleteConfirm = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    onDelete(id)
    setDeleteConfirmId(null)
  }

  const handleDeleteCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteConfirmId(null)
  }

  // ソートアイコン
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <span className="text-gray-400">⇅</span>
    }
    return sortDirection === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* 検索結果・統計 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {searchQuery && (
            <div className="text-sm text-gray-600">
              「<span className="font-medium">{searchQuery}</span>」の検索結果: 
              <span className="ml-1 font-medium">{filteredFavorites.length}件</span>
            </div>
          )}
          <div className="text-sm text-gray-500">
            登録作品: {favorites.length}件 | 
            新刊: {favorites.reduce((acc, manga) => acc + manga.volumes.length, 0)}件
          </div>
        </div>
        
        {/* 追加ボタン */}
        <button
          onClick={onAddClick}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
        >
          <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          追加
        </button>
      </div>

      {/* テーブル */}
      {sortedFavorites.length > 0 ? (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('series_name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>作品名</span>
                      {getSortIcon('series_name')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('author_name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>著者</span>
                      {getSortIcon('author_name')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('latest_date')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>発売日</span>
                      {getSortIcon('latest_date')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    価格
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('user_rating')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>お気に入り度</span>
                      {getSortIcon('user_rating')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AI推薦対象
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedFavorites.map((manga) => {
                  const latestVolume = manga.volumes[0]
                  
                  // 新刊判定: 最新巻の発売日が30日以内
                  const hasNewVolume = latestVolume?.release_date
                    ? (() => {
                        const releaseDate = new Date(latestVolume.release_date)
                        const today = new Date()
                        const thirtyDaysAgo = new Date()
                        thirtyDaysAgo.setDate(today.getDate() - 30)
                        return releaseDate >= thirtyDaysAgo
                      })()
                    : false

                  // 漫画名を一度だけ生成（重複処理の最適化）
                  const mangaName = manga.author_name ? `${manga.series_name}（${manga.author_name}）` : manga.series_name
                  const isExcluded = excludedForRecommendation.has(mangaName)

                  return (
                    <tr 
                      key={manga.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => onMangaClick(manga)}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                              {manga.series_name}
                              {hasNewVolume && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  新刊
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {manga.author_name || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(latestVolume?.release_date)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {formatPrice(latestVolume?.price)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <StarRating rating={manga.user_rating || 0} mangaId={manga.id} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation()
                            onRecommendationToggle?.(mangaName)
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          title={isExcluded ? 'AI推薦対象に含める' : 'AI推薦対象から除外する'}
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {/* 楽天リンク */}
                          {latestVolume?.rakuten_url && (
                            <a
                              href={latestVolume.rakuten_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="楽天で見る"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}

                          {/* 削除ボタン */}
                          {deleteConfirmId === manga.id ? (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={(e) => handleDeleteConfirm(e, manga.id)}
                                className="text-red-600 hover:text-red-900 text-xs px-2 py-1 bg-red-50 rounded transition-colors"
                              >
                                削除
                              </button>
                              <button
                                onClick={handleDeleteCancel}
                                className="text-gray-600 hover:text-gray-900 text-xs px-2 py-1 bg-gray-50 rounded transition-colors"
                              >
                                キャンセル
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => handleDeleteClick(e, manga.id)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="削除"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : searchQuery ? (
        /* 検索結果なしの場合 */
        <div className="bg-white shadow-sm rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            検索結果が見つかりません
          </h3>
          <p className="text-gray-500">
            「{searchQuery}」に一致する漫画がありません
          </p>
        </div>
      ) : (
        /* お気に入りが空の場合 */
        <div className="bg-white shadow-sm rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            お気に入りの漫画がありません
          </h3>
          <p className="text-gray-500 mb-4">
            右上の「追加」ボタンから漫画を追加してください
          </p>
          <button
            onClick={onAddClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            漫画を追加
          </button>
        </div>
      )}
    </div>
  )
}