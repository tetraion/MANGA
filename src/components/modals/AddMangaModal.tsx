'use client'

import { useState, useEffect } from 'react'

interface AddMangaModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (seriesName: string) => void
}

export default function AddMangaModal({ isOpen, onClose, onAdd }: AddMangaModalProps) {
  const [seriesName, setSeriesName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // モーダルが開いたときにフォーカス
  useEffect(() => {
    if (isOpen) {
      setSeriesName('')
    }
  }, [isOpen])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!seriesName.trim()) {
      alert('作品名を入力してください')
      return
    }

    setIsSubmitting(true)
    
    try {
      await onAdd(seriesName.trim())
      setSeriesName('')
      onClose()
    } catch (error) {
      console.error('Error adding favorite:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* オーバーレイ */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>
      
      {/* モーダル */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">
              新しい漫画を追加
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-4">
              <label htmlFor="seriesName" className="block text-sm font-medium text-gray-700 mb-2">
                作品名
              </label>
              <input
                type="text"
                id="seriesName"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                placeholder="例: ワンピース、鬼滅の刃"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600">
                お気に入りの漫画の作品名を入力してください。楽天ブックスAPIから自動的に新刊情報を取得します。
              </p>
            </div>

            {/* ボタン */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                disabled={isSubmitting}
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !seriesName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    追加中...
                  </div>
                ) : (
                  '追加'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}