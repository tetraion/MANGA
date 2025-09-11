'use client'

import { useEffect } from 'react'
import { Favorite, Volume } from '@/lib/supabase'

interface FavoriteWithVolumes extends Favorite {
  volumes: Volume[]
}

interface MangaDetailModalProps {
  isOpen: boolean
  onClose: () => void
  manga: FavoriteWithVolumes | null
}

export default function MangaDetailModal({ isOpen, onClose, manga }: MangaDetailModalProps) {
  
  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // 発売日をフォーマット
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}/${month}/${day}`
  }

  // 価格をフォーマット
  const formatPrice = (price: number | null) => {
    if (!price) return '-'
    return `¥${price.toLocaleString()}`
  }

  if (!isOpen || !manga) return null

  // 巻数でソート（最新順）
  const sortedVolumes = [...manga.volumes].sort((a, b) => {
    if (a.volume_number && b.volume_number) {
      return b.volume_number - a.volume_number
    }
    // 巻数がない場合は発売日でソート
    const dateA = a.release_date ? new Date(a.release_date).getTime() : 0
    const dateB = b.release_date ? new Date(b.release_date).getTime() : 0
    return dateB - dateA
  })

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* オーバーレイ */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>
      
      {/* モーダル */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-auto max-h-[90vh] overflow-hidden">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {manga.series_name}
              </h3>
              {manga.author_name && (
                <p className="text-gray-600 mt-1">{manga.author_name}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* コンテンツ */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {sortedVolumes.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">
                    巻数情報 ({sortedVolumes.length}巻)
                  </h4>
                  <div className="text-sm text-gray-500">
                    最新順で表示
                  </div>
                </div>

                <div className="space-y-3">
                  {sortedVolumes.map((volume, index) => (
                    <div 
                      key={volume.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        index === 0 
                          ? 'border-blue-200 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {volume.volume_number && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {volume.volume_number}巻
                              </span>
                            )}
                            {index === 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                最新巻
                              </span>
                            )}
                            {volume.release_date && (
                              <span className="text-sm text-gray-600">
                                {formatDate(volume.release_date)}
                              </span>
                            )}
                          </div>
                          
                          <h5 className="font-medium text-gray-900 mb-1">
                            {volume.title}
                          </h5>
                          
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                              {volume.price && (
                                <span className="text-green-600 font-medium">
                                  {formatPrice(volume.price)}
                                </span>
                              )}
                            </div>
                            
                            {volume.rakuten_url && (
                              <a
                                href={volume.rakuten_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                楽天で見る
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📚</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  巻数情報がありません
                </h4>
                <p className="text-gray-500">
                  「情報更新」ボタンから最新情報を取得してください
                </p>
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <div>
                登録日: {new Date(manga.created_at).toLocaleDateString('ja-JP')}
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}