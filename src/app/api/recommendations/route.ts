import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getVerifiedAIRecommendations } from '@/lib/groq';

export async function GET(request: Request) {
  try {
    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'general';
    const excludedParam = searchParams.get('excluded');
    const excludedFavorites: string[] = excludedParam ? JSON.parse(excludedParam) : [];
    
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
    const allFavoritesWithRatings = favorites.map(fav => ({
      name: fav.author_name ? `${fav.series_name}（${fav.author_name}）` : fav.series_name,
      rating: fav.user_rating || 3  // 未評価は星3と仮定
    }));

    // 除外対象を取り除いたリストを作成
    const favoritesWithRatings = allFavoritesWithRatings.filter(fav => 
      !excludedFavorites.includes(fav.name)
    );

    // 除外後にお気に入りが残っているかチェック
    if (favoritesWithRatings.length === 0) {
      return NextResponse.json(
        { error: '分析対象のお気に入り作品がありません。チェックボックスで作品を選択してください。' },
        { status: 400 }
      );
    }

    // タイプに応じて設定を変更
    const config = type === 'recent' 
      ? { minRating: 2.5, targetYear: '2025' }
      : { minRating: 3.0 };

    const recommendations = await getVerifiedAIRecommendations(favoritesWithRatings, config);

    return NextResponse.json({
      recommendations,
      basedOn: favoritesWithRatings.map(f => f.name),
      favoritesWithRatings: allFavoritesWithRatings, // 全お気に入り度情報（除外前）
      excludedFavorites, // 除外されたお気に入り名のリスト
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