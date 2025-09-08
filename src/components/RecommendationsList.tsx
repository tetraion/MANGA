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

  // 使用制限チェック
  const checkUsageLimit = (): { canUse: boolean; message?: string } => {
    const today = new Date().toDateString();
    const currentMonth = new Date().getMonth();
    const currentTime = Date.now();
    
    const lastUsedDate = localStorage.getItem('ai-recommendation-date');
    const lastUsedMonth = parseInt(localStorage.getItem('ai-recommendation-month') || '-1');
    const lastUsedTime = parseInt(localStorage.getItem('ai-recommendation-last-time') || '0');
    const dailyCount = parseInt(localStorage.getItem('ai-recommendation-daily') || '0');
    const monthlyCount = parseInt(localStorage.getItem('ai-recommendation-monthly') || '0');
    
    // 分間制限チェック（RPM=30なので、2秒間隔で制限）
    if (currentTime - lastUsedTime < 2000) {
      return { 
        canUse: false, 
        message: '少し間隔をあけてお試しください（2秒待機）。' 
      };
    }
    
    // 月が変わったらリセット
    if (lastUsedMonth !== currentMonth) {
      localStorage.setItem('ai-recommendation-month', currentMonth.toString());
      localStorage.setItem('ai-recommendation-monthly', '0');
      localStorage.setItem('ai-recommendation-daily', '0');
      localStorage.setItem('ai-recommendation-date', today);
      return { canUse: true };
    }
    
    // 日が変わったらデイリーカウントリセット
    if (lastUsedDate !== today) {
      localStorage.setItem('ai-recommendation-date', today);
      localStorage.setItem('ai-recommendation-daily', '0');
      return { canUse: true };
    }
    
    // 制限チェック（実際のGroq制限に基づく現実的な値）
    // Free tier: RPD=14,400なので、1日100回程度に制限（余裕を持たせて）
    if (dailyCount >= 100) {
      return { 
        canUse: false, 
        message: '1日の利用制限（100回）に達しました。明日再度お試しください。' 
      };
    }
    
    // 月間3,000回（1日100回×30日）
    if (monthlyCount >= 3000) {
      return { 
        canUse: false, 
        message: '月間利用制限（3,000回）に達しました。来月まで お待ちください。' 
      };
    }
    
    return { canUse: true };
  };

  // 使用回数を記録
  const recordUsage = () => {
    const dailyCount = parseInt(localStorage.getItem('ai-recommendation-daily') || '0');
    const monthlyCount = parseInt(localStorage.getItem('ai-recommendation-monthly') || '0');
    
    localStorage.setItem('ai-recommendation-daily', (dailyCount + 1).toString());
    localStorage.setItem('ai-recommendation-monthly', (monthlyCount + 1).toString());
    localStorage.setItem('ai-recommendation-last-time', Date.now().toString());
  };

  const fetchRecommendations = async () => {
    // 使用制限チェック
    const limitCheck = checkUsageLimit();
    if (!limitCheck.canUse) {
      setError(limitCheck.message || '利用制限に達しています');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/recommendations');
      const data: RecommendationsResponse | { error: string } = await response.json();

      if (!response.ok) {
        throw new Error('error' in data ? data.error : 'Failed to fetch recommendations');
      }

      if ('recommendations' in data) {
        setRecommendations(data.recommendations);
        setBasedOn(data.basedOn);
        recordUsage(); // 成功時のみカウントを増やす
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 現在の使用状況を取得（Hydrationエラー対策）
  const [usageStatus, setUsageStatus] = useState({ daily: 0, monthly: 0 });

  useEffect(() => {
    const dailyCount = parseInt(localStorage.getItem('ai-recommendation-daily') || '0');
    const monthlyCount = parseInt(localStorage.getItem('ai-recommendation-monthly') || '0');
    setUsageStatus({ daily: dailyCount, monthly: monthlyCount });
  }, []);

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