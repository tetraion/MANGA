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
      .select('series_name, author_name, user_rating');

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

    // お気に入り度を考慮したリスト作成（未評価は3とする）
    const favoritesWithRatings = favorites.map(fav => ({
      name: fav.author_name ? `${fav.series_name}（${fav.author_name}）` : fav.series_name,
      rating: fav.user_rating || 3  // 未評価は星3と仮定
    }));

    // タイプに応じて設定を変更
    const config = type === 'recent' 
      ? { minRating: 2.5, targetYear: '2025' }
      : { minRating: 3.0 };

    const recommendations = await getVerifiedAIRecommendations(favoritesWithRatings, config);

    return NextResponse.json({
      recommendations,
      basedOn: favoritesWithRatings.map(f => f.name),
      favoritesWithRatings, // お気に入り度情報も含める
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