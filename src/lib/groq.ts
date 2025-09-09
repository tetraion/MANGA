interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

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

export async function getAIRecommendations(favoritesList: string[], targetYear?: string): Promise<MangaRecommendation[]> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const favoritesText = favoritesList.join('、');
  
  // 対象範囲を動的に設定
  const targetDescription = targetYear 
    ? `${targetYear}年以降に連載開始した最近の漫画` 
    : '漫画';
  
  const prompt = `
あなたは漫画に詳しいAIアシスタントです。以下のお気に入り漫画リストから、ユーザーの好みを分析して${targetDescription}を3つおすすめしてください。

お気に入り漫画：${favoritesText}

以下の手順で回答してください：
1. まず、おすすめしたい漫画のタイトルとおすすめな理由を決めてください。
2. 決定したタイトルに対応する正確な著者とジャンルを検索してください。
- 注意事項
  - 似たようなタイトルの2次作品やパロディ作品の場合があるため、公式ページを確認し、タイトルと原作の著者が一致していることを確認してください。
  - 共同で著者がいる場合は、複数人記述してください。
  - 不確実な場合は「不明」と記載してください。

以下のJSON形式で回答してください：
[
  {
    "title": "おすすめ漫画のタイトル",
    "author": "著者",
    "genre": "ジャンル",
    "reason": "おすすめ理由（なぜこのユーザーに合うか）"
  }
]
`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemma2-9b-it',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
  }

  const data: GroqResponse = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from Groq API');
  }

  try {
    const jsonStart = content.indexOf('[');
    const jsonEnd = content.lastIndexOf(']') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('No JSON array found in AI response');
    }
    
    const jsonString = content.slice(jsonStart, jsonEnd);
    return JSON.parse(jsonString) as MangaRecommendation[];
  } catch (error) {
    console.error('Failed to parse AI response:', content);
    throw new Error('Failed to parse AI recommendations');
  }
}

interface RecommendationOptions {
  minRating: number;
  targetYear?: string;
}

export async function getVerifiedAIRecommendations(
  favoritesList: string[], 
  options: RecommendationOptions = { minRating: 3.0 }
): Promise<MangaRecommendation[]> {
  
  // AI推薦を取得（年指定があれば使用）
  const recommendations = await getAIRecommendations(favoritesList, options.targetYear);
  
  // searchMangaWithRatingsを使用（年指定で新作モード対応）
  const { searchMangaWithRatings } = await import('./rakuten');
  
  const verifiedRecommendations: MangaRecommendation[] = [];
  
  for (const rec of recommendations) {
    try {
      // レビュー数の制限は年指定時（新作モード）では緩和
      const minReviewCount = options.targetYear ? 0 : 5;
      const books = await searchMangaWithRatings(rec.title, options.minRating, minReviewCount, options.targetYear);
      
      if (books.length > 0) {
        const bestMatch = books[0];
        verifiedRecommendations.push({
          ...rec,
          reviewAverage: bestMatch.reviewAverage || undefined,
          reviewCount: bestMatch.reviewCount || undefined,
          qualityScore: bestMatch.reviewAverage ? bestMatch.reviewAverage * Math.log10((bestMatch.reviewCount || 1) + 1) : undefined,
          isVerified: true
        });
      } else {
        const reason = options.targetYear ? `may not be ${options.targetYear}+ release` : 'rating below threshold or not found';
        console.log(`Skipping ${rec.title} - ${reason}`);
      }
      
      // API制限を避けるための待機
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error verifying ${rec.title}:`, error);
      // エラーの場合は未検証として追加
      verifiedRecommendations.push({
        ...rec,
        isVerified: false
      });
    }
  }
  
  // 品質スコアでソート（検証済み優先）
  return verifiedRecommendations
    .sort((a, b) => {
      if (a.isVerified && !b.isVerified) return -1;
      if (!a.isVerified && b.isVerified) return 1;
      return (b.qualityScore || 0) - (a.qualityScore || 0);
    })
    .slice(0, 3);
}