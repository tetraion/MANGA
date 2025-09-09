'use client';

import { useState, useEffect } from 'react';

interface MangaRecommendation {
  title: string;
  author: string;
  genre: string;
  reason: string;
}

interface RecommendationsResponse {
  recommendations: MangaRecommendation[];
  basedOn: string[];
}

export default function RecommendationsList() {
  const [recommendations, setRecommendations] = useState<MangaRecommendation[]>([]);
  const [basedOn, setBasedOn] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [usageStatus, setUsageStatus] = useState({ daily: 0, monthly: 0 });

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
    fetchUsageStatus();
  }, []);

  const fetchRecommendations = async () => {
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
      const response = await fetch('/api/recommendations');
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
        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {loading ? '分析中...' : 'おすすめを取得'}
        </button>
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
            <strong>分析対象：</strong>{basedOn.slice(0, 3).join('、')}
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