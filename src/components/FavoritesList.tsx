'use client'

import { Favorite, Volume } from '@/lib/supabase'

interface FavoriteWithVolumes extends Favorite {
  volumes: Volume[]
}

interface FavoritesListProps {
  favorites: FavoriteWithVolumes[]
  onDelete: (id: number) => void
}

export default function FavoritesList({ favorites, onDelete }: FavoritesListProps) {
  if (favorites.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500 text-lg">お気に入りの漫画がありません</p>
        <p className="text-gray-400 text-sm mt-2">上のフォームから漫画を追加してください</p>
      </div>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP')
  }

  const formatPrice = (price: number | null) => {
    if (!price) return '-'
    return `¥${price.toLocaleString()}`
  }

  return (
    <div className="space-y-4">
      {favorites.map((favorite) => (
        <div key={favorite.id} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {favorite.series_name}
              </h3>
              {favorite.author_name && (
                <p className="text-gray-600 text-sm">著者: {favorite.author_name}</p>
              )}
            </div>
            <button
              onClick={() => onDelete(favorite.id)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
            >
              削除
            </button>
          </div>

          {favorite.volumes.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800 border-b pb-2">最新情報</h4>
              {favorite.volumes
                .sort((a, b) => {
                  // 発売日で降順ソート（新しいものが上）
                  if (!a.release_date && !b.release_date) return 0
                  if (!a.release_date) return 1
                  if (!b.release_date) return -1
                  return new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
                })
                .slice(0, 3)
                .map((volume) => (
                <div key={volume.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{volume.title}</p>
                    <div className="flex space-x-4 text-sm text-gray-600 mt-1">
                      <span>発売日: {formatDate(volume.release_date)}</span>
                      <span>価格: {formatPrice(volume.price)}</span>
                    </div>
                  </div>
                  {volume.rakuten_url && (
                    <a
                      href={volume.rakuten_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors ml-4"
                    >
                      楽天で見る
                    </a>
                  )}
                </div>
              ))}
              {favorite.volumes.length > 3 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  他 {favorite.volumes.length - 3} 件
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">まだ情報が取得されていません</p>
              <p className="text-gray-400 text-sm mt-1">「情報更新」ボタンを押して最新情報を取得してください</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}