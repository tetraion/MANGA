import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(request: NextRequest) {
  try {
    const { mangaId, rating } = await request.json()

    if (!mangaId || (rating !== 0 && (!rating || rating < 1 || rating > 5))) {
      return NextResponse.json(
        { error: 'Invalid manga ID or rating. Rating must be between 1-5 or 0 to clear.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('favorites')
      .update({ user_rating: rating === 0 ? null : rating })
      .eq('id', mangaId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ 
      message: 'Rating updated successfully',
      data 
    })
  } catch (error) {
    console.error('Error updating rating:', error)
    return NextResponse.json(
      { error: 'Failed to update rating' },
      { status: 500 }
    )
  }
}