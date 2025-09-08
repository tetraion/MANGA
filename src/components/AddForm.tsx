'use client'

import { useState } from 'react'

interface AddFormProps {
  onAdd: (seriesName: string) => void
}

export default function AddForm({ onAdd }: AddFormProps) {
  const [seriesName, setSeriesName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    } catch (error) {
      console.error('Error adding favorite:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="seriesName" className="block text-sm font-medium text-gray-700 mb-2">
          作品名
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            id="seriesName"
            value={seriesName}
            onChange={(e) => setSeriesName(e.target.value)}
            placeholder="例: ワンピース"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !seriesName.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-md transition-colors font-medium"
          >
            {isSubmitting ? '追加中...' : '追加'}
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-600">
        お気に入りの漫画の作品名を入力して追加してください
      </p>
    </form>
  )
}