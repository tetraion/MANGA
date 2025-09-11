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

export default function Home() {
  const [favorites, setFavorites] = useState<FavoriteWithVolumes[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedManga, setSelectedManga] = useState<FavoriteWithVolumes | null>(null)

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
          // 除外キーワード
          const excludeKeywords = [
            'キャラクター', 'ガイドブック', 'アートブック', '設定資料', 'ファンブック',
            'オフィシャル', '公式', 'perfect', 'complete', 'final', 'special',
            '特別', '限定', 'dvd', 'blu-ray', 'サウンドトラック', 'soundtrack',
            'フィギュア', 'グッズ', 'カレンダー', '名鑑', '辞典', '解説'
          ]
          
          const title = volume.title.toLowerCase()
          
          // 除外キーワードチェック
          for (const keyword of excludeKeywords) {
            if (title.includes(keyword)) {
              return false
            }
          }
          
          // 異常に古い発売日を除外（2000年以前）
          if (volume.release_date) {
            const releaseYear = new Date(volume.release_date).getFullYear()
            if (releaseYear < 2000) {
              return false
            }
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
      alert('更新が完了しました')
    } catch (error) {
      console.error('Error updating favorites:', error)
      alert('更新に失敗しました')
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
        onAddClick={handleAddClick}
        isUpdating={updating}
        onUpdate={handleUpdate}
      />

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto">
        {/* 漫画テーブル */}
        <MangaTable
          favorites={favorites}
          onDelete={handleDeleteFavorite}
          onAddClick={handleAddClick}
          onMangaClick={handleMangaClick}
          searchQuery={searchQuery}
        />

        {/* AIおすすめセクション */}
        <div className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="text-3xl mr-3">🤖</span>
              AIおすすめ漫画
            </h2>
            <RecommendationsList />
          </div>
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