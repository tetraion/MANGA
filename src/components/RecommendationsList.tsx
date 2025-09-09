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

interface RecommendationsResponse {
  recommendations: MangaRecommendation[];
  basedOn: string[];
  type?: string;
}

export default function RecommendationsList() {
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
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">🤖 AIおすすめ漫画</h2>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded-md text-white font-medium text-sm bg-gray-400">
              一般おすすめ
            </button>
            <button className="px-3 py-2 rounded-md text-white font-medium text-sm bg-gray-400">
              2025年新作
            </button>
          </div>
        </div>
        <div className="text-gray-500 text-center py-8">
          読み込み中...
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
      const endpoint = type === 'recent' ? '/api/recommendations?type=recent' : '/api/recommendations';
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
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">🤖 AIおすすめ漫画</h2>
        <div className="flex gap-2">
          <button
            onClick={() => fetchRecommendations('general')}
            disabled={loading}
            className={`px-3 py-2 rounded-md text-white font-medium text-sm ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {loading ? '分析中...' : '一般おすすめ'}
          </button>
          <button
            onClick={() => fetchRecommendations('recent')}
            disabled={loading}
            className={`px-3 py-2 rounded-md text-white font-medium text-sm ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {loading ? '分析中...' : '2025年新作'}
          </button>
        </div>
      </div>

      {/* 使用状況表示 */}
      <div className="text-xs text-gray-500 mb-3">
        今日: {usageStatus.daily}/100回 | 今月: {usageStatus.monthly}/3,000回
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {basedOn.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
          <p className="text-blue-700 text-sm">
            <strong>分析対象：</strong>
            {basedOn.slice(0, 3).join('、')}
            {basedOn.length > 3 && `など${basedOn.length}作品`}
          </p>
        </div>
      )}

      {recommendations.length > 0 ? (
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-lg">{rec.title}</h3>
                  <p className="text-gray-600">{rec.author}</p>
                  {/* 評価情報表示 */}
                  {rec.isVerified && (rec.reviewAverage || rec.reviewCount) && (
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      {rec.reviewAverage && typeof rec.reviewAverage === 'number' && (
                        <span className="bg-yellow-100 px-2 py-1 rounded-md text-yellow-800">
                          ⭐ {rec.reviewAverage.toFixed(1)}
                        </span>
                      )}
                      {rec.reviewCount && typeof rec.reviewCount === 'number' && (
                        <span className="bg-gray-100 px-2 py-1 rounded-md text-gray-700">
                          {rec.reviewCount}件
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span className="bg-gray-100 px-2 py-1 rounded-md text-xs text-gray-700">
                  {rec.genre}
                </span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">{rec.reason}</p>
            </div>
          ))}
        </div>
      ) : (
        !loading && (
          <p className="text-gray-500 text-center py-8">
            ボタンを押してAIおすすめ漫画を取得してください
          </p>
        )
      )}
    </div>
  );
}