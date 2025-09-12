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
  imageUrl?: string;
}

interface RecommendationsResponse {
  recommendations: MangaRecommendation[];
  basedOn: string[];
  type?: string;
  selectedGenres?: string[];
}

interface RecommendationsListProps {
  excludedForRecommendation?: Set<string>
}

// ジャンル定義
const MANGA_GENRES = [
  // 基本ジャンル（年代・対象別）
  { id: 'shounen', label: '少年', category: 'basic' },
  { id: 'shoujo', label: '少女', category: 'basic' },
  { id: 'seinen', label: '青年', category: 'basic' },
  { id: 'josei', label: '女性', category: 'basic' },
  
  // 人気テーマジャンル
  { id: 'romance', label: '恋愛・ラブコメ', category: 'theme' },
  { id: 'action', label: 'アクション', category: 'theme' },
  { id: 'fantasy', label: 'ファンタジー', category: 'theme' },
  { id: 'sf', label: 'SF', category: 'theme' },
  { id: 'sports', label: 'スポーツ', category: 'theme' },
  { id: 'horror', label: 'ホラー', category: 'theme' },
  { id: 'comedy', label: 'ギャグ・コメディ', category: 'theme' },
  { id: 'mystery', label: 'ミステリー', category: 'theme' },
  { id: 'school', label: '青春・学園', category: 'theme' },
  { id: 'gourmet', label: 'グルメ', category: 'theme' },
  
  // 特徴的ジャンル
  { id: 'history', label: '歴史', category: 'special' },
  { id: 'business', label: 'ビジネス', category: 'special' },
  { id: 'yonkoma', label: '四コマ', category: 'special' },
] as const

export default function RecommendationsList({ excludedForRecommendation = new Set() }: RecommendationsListProps) {
  const [recommendations, setRecommendations] = useState<MangaRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [usageStatus, setUsageStatus] = useState({ daily: 0, monthly: 0 });
  const [mounted, setMounted] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [customGenreInput, setCustomGenreInput] = useState<string>('');
  const [lastUsedGenres, setLastUsedGenres] = useState<string[]>([]);
  const [isGenreSelectionOpen, setIsGenreSelectionOpen] = useState<boolean>(false);

  // 使用状況を取得
  const fetchUsageStatus = async () => {
    try {
      const response = await fetch('/api/usage?service=recommendations');
      if (response.ok) {
        const data = await response.json();
        setUsageStatus({ daily: data.daily, monthly: data.monthly });
      }
    } catch (error) {
      // エラーは無視（使用状況表示は必須ではない）
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

  // ジャンル選択ハンドラー
  const handleGenreToggle = (genreId: string) => {
    setSelectedGenres(prev => {
      const newSet = new Set(prev);
      if (newSet.has(genreId)) {
        newSet.delete(genreId);
      } else {
        newSet.add(genreId);
      }
      return newSet;
    });
  };

  // カスタムジャンル追加ハンドラー
  const handleCustomGenreAdd = () => {
    if (customGenreInput.trim() && !selectedGenres.has(customGenreInput.trim())) {
      setSelectedGenres(prev => new Set([...prev, customGenreInput.trim()]));
      setCustomGenreInput('');
    }
  };

  // カスタムジャンル削除ハンドラー
  const handleCustomGenreRemove = (genre: string) => {
    setSelectedGenres(prev => {
      const newSet = new Set(prev);
      newSet.delete(genre);
      return newSet;
    });
  };

  // Enterキーでの追加
  const handleCustomGenreKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomGenreAdd();
    }
  };

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
      // 定義済みジャンルは日本語ラベルに変換、カスタムジャンルはそのまま使用
      const genresArray = Array.from(selectedGenres).map(genre => {
        const predefinedGenre = MANGA_GENRES.find(g => g.id === genre);
        return predefinedGenre ? predefinedGenre.label : genre;
      });
      
      const queryParams = new URLSearchParams();
      if (type === 'recent') queryParams.set('type', 'recent');
      if (excludedArray.length > 0) queryParams.set('excluded', JSON.stringify(excludedArray));
      if (genresArray.length > 0) queryParams.set('genres', JSON.stringify(genresArray));
      
      const endpoint = queryParams.toString() ? `/api/recommendations?${queryParams.toString()}` : '/api/recommendations';
      const response = await fetch(endpoint);
      const data: RecommendationsResponse | { error: string } = await response.json();

      if (!response.ok) {
        throw new Error('error' in data ? data.error : 'Failed to fetch recommendations');
      }

      if ('recommendations' in data) {
        setRecommendations(data.recommendations);
        setLastUsedGenres(data.selectedGenres || []);
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
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
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
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>📊</span>
            <span>
              本日の利用: <span className="font-medium text-gray-600">{usageStatus.daily}/100回</span> 
              <span className="mx-1">•</span> 
              今月の利用: <span className="font-medium text-gray-600">{usageStatus.monthly}/3,000回</span>
            </span>
          </div>
        </div>

        {/* ジャンル付加UI（コンパクト版） */}
        <div className="mb-4 bg-white bg-opacity-70 rounded-lg border border-blue-200">
          <button
            onClick={() => setIsGenreSelectionOpen(!isGenreSelectionOpen)}
            className="w-full flex items-center justify-between p-3 text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-blue-600">➕</span>
              <span>ジャンル付加</span>
              {selectedGenres.size > 0 && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                  {selectedGenres.size}件選択中
                </span>
              )}
            </div>
            <span className={`text-gray-400 transition-transform ${isGenreSelectionOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {isGenreSelectionOpen && (
            <div className="border-t border-blue-200 p-4">
              <p className="text-xs text-gray-500 mb-3">特定のジャンルを重視したい場合のみ選択してください</p>
              
              {/* プリセットジャンル */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4">
                {MANGA_GENRES.map((genre) => (
                  <label
                    key={genre.id}
                    className={`flex items-center p-2 rounded-md cursor-pointer transition-colors hover:bg-blue-50 ${
                      selectedGenres.has(genre.id) ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGenres.has(genre.id)}
                      onChange={() => handleGenreToggle(genre.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mr-2"
                    />
                    <span className={`text-xs font-medium ${
                      selectedGenres.has(genre.id) ? 'text-blue-700' : 'text-gray-600'
                    }`}>
                      {genre.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* カスタムジャンル入力 */}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">または、独自のジャンルを入力：</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customGenreInput}
                    onChange={(e) => setCustomGenreInput(e.target.value)}
                    onKeyPress={handleCustomGenreKeyPress}
                    placeholder="例: 異世界転生、サバイバル、料理バトル"
                    className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleCustomGenreAdd}
                    disabled={!customGenreInput.trim()}
                    className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      customGenreInput.trim()
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    追加
                  </button>
                </div>
              </div>

              {/* 選択されたカスタムジャンル表示 */}
              {Array.from(selectedGenres).filter(genre => !MANGA_GENRES.some(g => g.id === genre)).length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">追加したジャンル：</div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(selectedGenres)
                      .filter(genre => !MANGA_GENRES.some(g => g.id === genre))
                      .map(customGenre => (
                        <span
                          key={customGenre}
                          className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-200"
                        >
                          {customGenre}
                          <button
                            onClick={() => handleCustomGenreRemove(customGenre)}
                            className="ml-1 text-green-600 hover:text-green-800 focus:outline-none"
                            title="削除"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    }
                  </div>
                </div>
              )}
              {selectedGenres.size > 0 && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => setSelectedGenres(new Set())}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    すべて解除
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {recommendations.length > 0 ? (
        <div className="space-y-6">
          {/* ジャンル考慮表示 */}
          {lastUsedGenres.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-blue-600">🎯</span>
                <span className="text-blue-700 font-medium">ジャンル考慮:</span>
                <div className="flex flex-wrap gap-1">
                  {lastUsedGenres.map(genre => (
                    <span key={genre} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-1">上記ジャンルを考慮した推薦結果です</p>
            </div>
          )}

          {recommendations.map((rec, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-300"
            >
              <div className="flex gap-4 mb-4">
                {/* 画像部分 */}
                <div className="flex-shrink-0">
                  {rec.imageUrl ? (
                    <img 
                      src={rec.imageUrl} 
                      alt={rec.title}
                      className="w-24 h-32 object-cover rounded-lg shadow-md border border-gray-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-24 h-32 bg-gray-100 rounded-lg shadow-md border border-gray-200 flex items-center justify-center ${rec.imageUrl ? 'hidden' : ''}`}>
                    <span className="text-gray-400 text-3xl">📚</span>
                  </div>
                </div>
                
                {/* コンテンツ部分 */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
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
                      <span className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                        lastUsedGenres.some(genre => rec.genre.includes(genre) || genre.includes(rec.genre))
                          ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200'
                          : 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border-purple-200'
                      }`}>
                        🏷️ {rec.genre}
                        {lastUsedGenres.some(genre => rec.genre.includes(genre) || genre.includes(rec.genre)) && (
                          <span className="ml-1 text-green-600">✓</span>
                        )}
                      </span>
                    </div>
                  </div>
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