'use client'

import { useState, useEffect } from 'react'
import { supabase, Favorite, Volume } from '@/lib/supabase'
import Header from '@/components/layout/Header'
import MangaTable from '@/components/manga/MangaTable'
import AddMangaModal from '@/components/modals/AddMangaModal'
import MangaDetailModal from '@/components/modals/MangaDetailModal'
import RecommendationsList from '@/components/RecommendationsList'

interface FavoriteWithVolumes extends Favorite {
  volumes: Volume[]
}

// データ品質フィルタリング用の除外キーワード（定数化でパフォーマンス改善）
const EXCLUDE_KEYWORDS = [
  'キャラクター', 'ガイドブック', 'アートブック', '設定資料', 'ファンブック',
  'オフィシャル', '公式', 'perfect', 'complete', 'final', 'special',
  '特別', '限定', 'dvd', 'blu-ray', 'サウンドトラック', 'soundtrack',
  'フィギュア', 'グッズ', 'カレンダー', '名鑑', '辞典', '解説'
] as const

export default function Home() {
  const [favorites, setFavorites] = useState<FavoriteWithVolumes[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedManga, setSelectedManga] = useState<FavoriteWithVolumes | null>(null)
  const [excludedForRecommendation, setExcludedForRecommendation] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchFavorites()
  }, [])

  const fetchFavorites = async () => {
    try {
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('*')
        .order('created_at', { ascending: false })

      if (favoritesError) throw favoritesError

      const { data: volumesData, error: volumesError } = await supabase
        .from('volumes')
        .select('*')
        .order('created_at', { ascending: false })

      if (volumesError) throw volumesError

      const favoritesWithVolumes = favoritesData?.map(favorite => {
        const volumes = volumesData?.filter(volume => volume.favorite_id === favorite.id) || []
        
        // データ品質フィルタリング：関連書籍や古いデータを除外
        const filteredVolumes = volumes.filter(volume => {
          const title = volume.title.toLowerCase()
          
          // 除外キーワードチェック（定数配列を使用）
          if (EXCLUDE_KEYWORDS.some(keyword => title.includes(keyword))) {
            return false
          }
          
          // 異常に古い発売日を除外（2000年以前）
          if (volume.release_date) {
            const releaseYear = new Date(volume.release_date).getFullYear()
            if (releaseYear < 2000) return false
          }
          
          // 異常に高い巻数を除外（999巻以上は年号の可能性）
          if (volume.volume_number && volume.volume_number >= 999) {
            return false
          }
          
          return true
        })
        
        // 各作品のvolumesを正しくソート（最新巻が最初に来るように）
        const sortedVolumes = filteredVolumes.sort((a, b) => {
          // 1. 巻数でソート（大きい巻数が最初）
          if (a.volume_number && b.volume_number) {
            return b.volume_number - a.volume_number
          }
          
          // 2. 巻数がない場合は発売日でソート（新しい発売日が最初）
          if (a.release_date && b.release_date) {
            return new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
          }
          
          // 3. 最後はデータベース追加日でソート（新しい追加が最初）
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        
        return {
          ...favorite,
          volumes: sortedVolumes
        }
      }) || []

      setFavorites(favoritesWithVolumes)
    } catch (error) {
      console.error('Error fetching favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFavorite = async (seriesName: string) => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .insert([{ series_name: seriesName }])
        .select()
        .single()

      if (error) throw error

      await fetchFavorites()
    } catch (error) {
      console.error('Error adding favorite:', error)
      alert('お気に入りの追加に失敗しました')
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleAddClick = () => {
    setShowAddModal(true)
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
  }

  const handleMangaClick = (manga: FavoriteWithVolumes) => {
    setSelectedManga(manga)
  }

  const handleCloseDetailModal = () => {
    setSelectedManga(null)
  }

  const handleDeleteFavorite = async (id: number) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchFavorites()
    } catch (error) {
      console.error('Error deleting favorite:', error)
      alert('お気に入りの削除に失敗しました')
    }
  }

  const handleRecommendationToggle = (mangaName: string) => {
    setExcludedForRecommendation(prev => {
      const newSet = new Set(prev)
      if (newSet.has(mangaName)) {
        newSet.delete(mangaName)
      } else {
        newSet.add(mangaName)
      }
      return newSet
    })
  }

  const handleScrollToRecommendations = () => {
    const element = document.getElementById('ai-recommendations')
    if (element) {
      // ヘッダーの高さ分オフセットを計算してスクロール
      const headerHeight = 64 // ヘッダーの高さ（h-16 = 4rem = 64px）
      const elementTop = element.offsetTop - headerHeight - 16 // 16px の余裕を追加
      
      window.scrollTo({
        top: elementTop,
        behavior: 'smooth'
      })
      
      // スクロール後に目立たせるアニメーション
      setTimeout(() => {
        element.classList.add('animate-pulse')
        setTimeout(() => {
          element.classList.remove('animate-pulse')
        }, 2000)
      }, 500)
    }
  }

  const handleUpdate = async () => {
    setUpdating(true)
    
    try {
      const response = await fetch('/api/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Update failed')
      }
      
      await fetchFavorites()
      alert('最新情報の取得が完了しました')
    } catch (error) {
      console.error('Error updating favorites:', error)
      alert('最新情報の取得に失敗しました')
    } finally {
      setUpdating(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <Header 
        onSearch={handleSearch}
        onScrollToRecommendations={handleScrollToRecommendations}
      />

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto">
        {/* お気に入り漫画一覧セクション */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-3xl">📚</span>
                  お気に入り漫画一覧
                </h2>
                <p className="text-gray-600 text-sm">
                  登録した漫画の最新巻情報とAI推薦機能をお楽しみください
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {/* 最新情報取得ボタン */}
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white transition-colors ${
                    updating 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {updating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      取得中...
                    </>
                  ) : (
                    <>
                      <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="hidden sm:inline">最新情報取得</span>
                      <span className="sm:hidden">取得</span>
                    </>
                  )}
                </button>

                {/* 漫画を追加ボタン */}
                <button
                  onClick={handleAddClick}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">漫画を追加</span>
                  <span className="sm:hidden">追加</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* 漫画テーブル */}
          <MangaTable
            favorites={favorites}
            onDelete={handleDeleteFavorite}
            onMangaClick={handleMangaClick}
            searchQuery={searchQuery}
            excludedForRecommendation={excludedForRecommendation}
            onRecommendationToggle={handleRecommendationToggle}
          />
        </div>

        {/* AIおすすめセクション */}
        <div id="ai-recommendations" className="px-4 sm:px-6 lg:px-8 pb-8">
          <RecommendationsList excludedForRecommendation={excludedForRecommendation} />
        </div>
      </main>

      {/* 追加モーダル */}
      <AddMangaModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        onAdd={handleAddFavorite}
      />

      {/* 詳細モーダル */}
      <MangaDetailModal
        isOpen={!!selectedManga}
        onClose={handleCloseDetailModal}
        manga={selectedManga}
      />
    </div>
  )
}