import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getVerifiedAIRecommendations } from '@/lib/groq';

export async function GET(request: Request) {
  try {
    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'general';
    
    const { data: favorites, error } = await supabase
      .from('favorites')
      .select('series_name, author_name');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      );
    }

    if (!favorites || favorites.length === 0) {
      return NextResponse.json(
        { error: 'No favorites found. Please add some manga to your favorites first.' },
        { status: 400 }
      );
    }

    const favoritesList = favorites.map(fav => 
      fav.author_name ? `${fav.series_name}（${fav.author_name}）` : fav.series_name
    );

    // タイプに応じて設定を変更
    const config = type === 'recent' 
      ? { minRating: 2.5, targetYear: '2025' }
      : { minRating: 3.0 };

    const recommendations = await getVerifiedAIRecommendations(favoritesList, config);

    return NextResponse.json({
      recommendations,
      basedOn: favoritesList,
      type
    });

  } catch (error) {
    console.error('AI recommendation error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate recommendations'
      },
      { status: 500 }
    );
  }
}