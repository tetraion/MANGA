import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select('*')
      .order('created_at', { ascending: false })

    if (favoritesError) {
      throw favoritesError
    }

    return NextResponse.json({ favorites })
  } catch (error) {
    console.error('Error fetching favorites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { series_name } = await request.json()

    if (!series_name) {
      return NextResponse.json(
        { error: 'Series name is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('favorites')
      .insert([{ series_name }])
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ favorite: data })
  } catch (error) {
    console.error('Error creating favorite:', error)
    return NextResponse.json(
      { error: 'Failed to create favorite' },
      { status: 500 }
    )
  }
}