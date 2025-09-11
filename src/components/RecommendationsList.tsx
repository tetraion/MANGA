'use client';

import { useState, useEffect } from 'react';

interface MangaRecommendation {
  title: string;
  author: string;
  genre: string;
  reason: string;
  reviewAverage?: number;
  reviewCount?: number;
  qualityScore?: number;
  isVerified?: boolean;
}

interface FavoriteWithRating {
  name: string;
  rating: number;
}

interface RecommendationsResponse {
  recommendations: MangaRecommendation[];
  basedOn: string[];
  favoritesWithRatings?: FavoriteWithRating[];
  type?: string;
}

interface RecommendationsListProps {
  excludedForRecommendation?: Set<string>
}

export default function RecommendationsList({ excludedForRecommendation = new Set() }: RecommendationsListProps) {
  const [recommendations, setRecommendations] = useState<MangaRecommendation[]>([]);
  const [basedOn, setBasedOn] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [usageStatus, setUsageStatus] = useState({ daily: 0, monthly: 0 });
  const [mounted, setMounted] = useState(false);


  // 使用状況を取得
  const fetchUsageStatus = async () => {
    try {
      const response = await fetch('/api/usage?service=recommendations');
      if (response.ok) {
        const data = await response.json();
        setUsageStatus({ daily: data.daily, monthly: data.monthly });
      }
    } catch (error) {
      console.error('Failed to fetch usage status:', error);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchUsageStatus();
  }, []);

  // SSR時は何も表示しない（Hydrationエラー回避）
  if (!mounted) {
    return (
      <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-xl shadow-lg border border-blue-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              🤖 AIおすすめ漫画
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent text-sm font-medium">
                Powered by AI
              </span>
            </h2>
            <p className="text-gray-600 text-sm">あなたのお気に入り度を分析してパーソナライズされた推薦を提供</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="px-4 py-3 rounded-lg font-medium text-sm bg-gray-400 text-white">
              🎯 一般おすすめ
            </button>
            <button className="px-4 py-3 rounded-lg font-medium text-sm bg-gray-400 text-white">
              ✨ 2025年新作
            </button>
          </div>
        </div>
        <div className="text-gray-500 text-center py-12 flex items-center justify-center gap-2">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span>読み込み中...</span>
        </div>
      </div>
    );
  }

  const fetchRecommendations = async (type: string = 'general') => {
    setLoading(true);
    setError('');
    
    try {
      // 使用制限チェックとカウント増加をサーバー側で実行
      const usageResponse = await fetch('/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceType: 'recommendations' })
      });
      
      const usageData = await usageResponse.json();
      
      if (!usageResponse.ok) {
        setError(usageData.error || '利用制限に達しています');
        return;
      }
      
      // 使用制限チェックをクリアした場合のみAPIを呼び出し
      const excludedArray = Array.from(excludedForRecommendation);
      const queryParams = new URLSearchParams();
      if (type === 'recent') queryParams.set('type', 'recent');
      if (excludedArray.length > 0) queryParams.set('excluded', JSON.stringify(excludedArray));
      
      const endpoint = `/api/recommendations${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(endpoint);
      const data: RecommendationsResponse | { error: string } = await response.json();

      if (!response.ok) {
        throw new Error('error' in data ? data.error : 'Failed to fetch recommendations');
      }

      if ('recommendations' in data) {
        setRecommendations(data.recommendations);
        setBasedOn(data.basedOn);
        // 使用状況を更新
        setUsageStatus({ daily: usageData.daily, monthly: usageData.monthly });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-xl shadow-lg border border-blue-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div className="mb-4 sm:mb-0">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            🤖 AIおすすめ漫画
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent text-sm font-medium">
              Powered by AI
            </span>
          </h2>
          <p className="text-gray-600 text-sm">あなたのお気に入り度を分析してパーソナライズされた推薦を提供</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => fetchRecommendations('general')}
            disabled={loading}
            className={`px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
              loading
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
            }`}
          >
            {loading ? '🔄 分析中...' : '🎯 一般おすすめ'}
          </button>
          <button
            onClick={() => fetchRecommendations('recent')}
            disabled={loading}
            className={`px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
              loading
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
            }`}
          >
            {loading ? '🔄 分析中...' : '✨ 2025年新作'}
          </button>
        </div>
      </div>

      {/* 使用状況表示 */}
      <div className="bg-white bg-opacity-50 rounded-lg p-3 mb-4 border border-blue-200">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-blue-600">📊</span>
          <span className="text-gray-700">
            今日: <span className="font-semibold text-blue-600">{usageStatus.daily}/100回</span> | 
            今月: <span className="font-semibold text-blue-600">{usageStatus.monthly}/3,000回</span>
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}


      {recommendations.length > 0 ? (
        <div className="space-y-6">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📚</span>
                    <h3 className="font-bold text-xl text-gray-800">{rec.title}</h3>
                    {rec.isVerified && (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                        ✓ 評価確認済み
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-gray-500 text-sm">👤</span>
                    <p className="text-gray-600 font-medium">{rec.author}</p>
                  </div>
                  {/* 評価情報表示 */}
                  {rec.isVerified && rec.reviewAverage && typeof rec.reviewAverage === 'number' && (
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-gradient-to-r from-yellow-100 to-orange-100 px-3 py-1 rounded-lg text-sm">
                        <span className="text-yellow-600 font-semibold">⭐ {rec.reviewAverage.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0">
                  <span className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-3 py-2 rounded-lg text-sm font-medium border border-purple-200">
                    🏷️ {rec.genre}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-400">
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1 text-lg">💡</span>
                  <p className="text-gray-700 leading-relaxed">{rec.reason}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">AIおすすめを取得しよう！</h3>
            <p className="text-gray-500 mb-6">
              上のボタンを押して、あなたの好みに合った漫画を見つけてください
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
              <span>⭐</span>
              <span>星評価が高い作品ほど推薦精度が向上します</span>
            </div>
          </div>
        )
      )}
    </div>
  );
}