'use client'

import { useState, useEffect } from 'react'
import { supabase, Favorite, Volume } from '@/lib/supabase'
import AddForm from '@/components/AddForm'
import FavoritesList from '@/components/FavoritesList'
import RecommendationsList from '@/components/RecommendationsList'
import RecentMangaList from '@/components/RecentMangaList'

interface FavoriteWithVolumes extends Favorite {
  volumes: Volume[]
}

export default function Home() {
  const [favorites, setFavorites] = useState<FavoriteWithVolumes[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

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

      const favoritesWithVolumes = favoritesData?.map(favorite => ({
        ...favorite,
        volumes: volumesData?.filter(volume => volume.favorite_id === favorite.id) || []
      })) || []

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
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          漫画新作通知アプリ
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <AddForm onAdd={handleAddFavorite} />
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md transition-colors"
            >
              {updating ? '更新中...' : '情報更新'}
            </button>
          </div>
        </div>

        <div className="grid xl:grid-cols-3 lg:grid-cols-2 gap-6">
          <FavoritesList 
            favorites={favorites} 
            onDelete={handleDeleteFavorite}
          />
          
          <RecommendationsList />
          
          <RecentMangaList />
        </div>
      </div>
    </div>
  )
}