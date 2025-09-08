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

export default function RecentMangaList() {
  const [recommendations, setRecommendations] = useState<MangaRecommendation[]>([]);
  const [basedOn, setBasedOn] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // 使用制限チェック（recent-manga専用のキー）
  const checkUsageLimit = (): { canUse: boolean; message?: string } => {
    const today = new Date().toDateString();
    const currentMonth = new Date().getMonth();
    const currentTime = Date.now();
    
    const lastUsedDate = localStorage.getItem('recent-manga-date');
    const lastUsedMonth = parseInt(localStorage.getItem('recent-manga-month') || '-1');
    const lastUsedTime = parseInt(localStorage.getItem('recent-manga-last-time') || '0');
    const dailyCount = parseInt(localStorage.getItem('recent-manga-daily') || '0');
    const monthlyCount = parseInt(localStorage.getItem('recent-manga-monthly') || '0');
    
    // 分間制限チェック（2秒間隔）
    if (currentTime - lastUsedTime < 2000) {
      return { 
        canUse: false, 
        message: '少し間隔をあけてお試しください（2秒待機）。' 
      };
    }
    
    // 月が変わったらリセット
    if (lastUsedMonth !== currentMonth) {
      localStorage.setItem('recent-manga-month', currentMonth.toString());
      localStorage.setItem('recent-manga-monthly', '0');
      localStorage.setItem('recent-manga-daily', '0');
      localStorage.setItem('recent-manga-date', today);
      return { canUse: true };
    }
    
    // 日が変わったらデイリーカウントリセット
    if (lastUsedDate !== today) {
      localStorage.setItem('recent-manga-date', today);
      localStorage.setItem('recent-manga-daily', '0');
      return { canUse: true };
    }
    
    // 制限チェック（最近の漫画用）
    if (dailyCount >= 20) {
      return { 
        canUse: false, 
        message: '1日の利用制限（20回）に達しました。明日再度お試しください。' 
      };
    }
    
    if (monthlyCount >= 600) {
      return { 
        canUse: false, 
        message: '月間利用制限（600回）に達しました。来月まで お待ちください。' 
      };
    }
    
    return { canUse: true };
  };

  // 使用回数を記録（recent-manga専用のキー）
  const recordUsage = () => {
    const dailyCount = parseInt(localStorage.getItem('recent-manga-daily') || '0');
    const monthlyCount = parseInt(localStorage.getItem('recent-manga-monthly') || '0');
    
    localStorage.setItem('recent-manga-daily', (dailyCount + 1).toString());
    localStorage.setItem('recent-manga-monthly', (monthlyCount + 1).toString());
    localStorage.setItem('recent-manga-last-time', Date.now().toString());
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
      // 最近連載特化のAPIエンドポイント
      const response = await fetch('/api/recent-recommendations');
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
    const dailyCount = parseInt(localStorage.getItem('recent-manga-daily') || '0');
    const monthlyCount = parseInt(localStorage.getItem('recent-manga-monthly') || '0');
    setUsageStatus({ daily: dailyCount, monthly: monthlyCount });
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">🆕 最近連載開始</h2>
        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {loading ? '分析中...' : 'おすすめを取得'}
        </button>
      </div>

      {/* 使用状況表示 */}
      <div className="text-xs text-gray-500 mb-3">
        今日: {usageStatus.daily}/20回 | 今月: {usageStatus.monthly}/600回
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {basedOn.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
          <p className="text-green-700 text-sm">
            <strong>好み分析：</strong>{basedOn.slice(0, 3).join('、')}
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
                <span className="bg-green-100 px-2 py-1 rounded-md text-xs text-green-700">
                  {rec.genre}
                </span>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">{rec.reason}</p>
            </div>
          ))}
        </div>
      ) : (
        !loading && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">🌱</div>
            <p className="text-gray-500">
              あなたの好みに合う最近の連載作品を探します
            </p>
            <p className="text-gray-400 text-sm mt-1">
              2023年以降連載開始の作品から厳選
            </p>
          </div>
        )
      )}
    </div>
  );
}