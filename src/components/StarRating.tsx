'use client'

import { useState } from 'react'

interface StarRatingProps {
  rating: number
  mangaId: number
  onRatingChange?: (mangaId: number, rating: number) => void
}

export default function StarRating({ rating, mangaId, onRatingChange }: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState(0)
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentRating, setCurrentRating] = useState(rating)

  const handleStarClick = async (e: React.MouseEvent, newRating: number) => {
    e.stopPropagation()
    if (isUpdating) return
    
    setIsUpdating(true)
    
    try {
      const response = await fetch('/api/favorites/rating', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mangaId,
          rating: newRating === currentRating ? 0 : newRating
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update rating')
      }

      const finalRating = newRating === currentRating ? 0 : newRating
      setCurrentRating(finalRating)
      
      if (onRatingChange) {
        onRatingChange(mangaId, finalRating)
      }
    } catch (error) {
      console.error('Error updating rating:', error)
      alert('評価の更新に失敗しました。')
    } finally {
      setIsUpdating(false)
    }
  }

  const displayRating = hoveredRating || currentRating

  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={(e) => handleStarClick(e, star)}
          onMouseEnter={() => setHoveredRating(star)}
          onMouseLeave={() => setHoveredRating(0)}
          disabled={isUpdating}
          className={`text-lg transition-colors ${
            isUpdating ? 'cursor-wait opacity-50' : 'cursor-pointer hover:scale-110'
          } ${
            star <= displayRating 
              ? 'text-yellow-400' 
              : 'text-gray-300'
          }`}
        >
          ★
        </button>
      ))}
      {isUpdating && (
        <div className="ml-2 w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
      )}
    </div>
  )
}