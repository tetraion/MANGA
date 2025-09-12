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
  imageUrl?: string;
}

interface FavoriteWithRating {
  name: string;
  rating: number;
}

export async function getAIRecommendations(favoritesWithRatings: FavoriteWithRating[], targetYear?: string, count: number = 3): Promise<MangaRecommendation[]> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  // お気に入り度に応じて重み付けしたテキストを作成
  const createFavoritesText = (favorites: FavoriteWithRating[]): string => {
    const ratingGroups = {
      5: favorites.filter(f => f.rating === 5),
      4: favorites.filter(f => f.rating === 4),
      3: favorites.filter(f => f.rating === 3),
      2: favorites.filter(f => f.rating === 2),
      1: favorites.filter(f => f.rating === 1)
    };

    let text = '';
    if (ratingGroups[5].length > 0) {
      text += `\n【非常に気に入っている作品★★★★★】\n${ratingGroups[5].map(f => f.name).join('、')}`;
    }
    if (ratingGroups[4].length > 0) {
      text += `\n【気に入っている作品★★★★☆】\n${ratingGroups[4].map(f => f.name).join('、')}`;
    }
    if (ratingGroups[3].length > 0) {
      text += `\n【普通の作品★★★☆☆】\n${ratingGroups[3].map(f => f.name).join('、')}`;
    }
    if (ratingGroups[2].length > 0) {
      text += `\n【あまり好きではない作品★★☆☆☆】\n${ratingGroups[2].map(f => f.name).join('、')}`;
    }
    if (ratingGroups[1].length > 0) {
      text += `\n【嫌いな作品★☆☆☆☆】\n${ratingGroups[1].map(f => f.name).join('、')}`;
    }
    
    return text;
  };

  const favoritesText = createFavoritesText(favoritesWithRatings);
  
  // 対象範囲を動的に設定
  const targetDescription = targetYear 
    ? `${targetYear}年以降に連載開始した最近の漫画` 
    : '漫画';
  
  const prompt = `
あなたは漫画に詳しいAIアシスタントです。以下のユーザーのお気に入り漫画リスト（星評価付き）から好みを分析し、${targetDescription}を${count}つおすすめしてください。

お気に入り漫画（星評価付き）：${favoritesText}

【重要な分析ポイント】
- ★★★★★（星5）の作品は「非常に気に入っている」ため、最重要な好み指標として扱う
- ★★★★☆（星4）の作品は「気に入っている」ため、重要な好み指標として扱う  
- ★★★☆☆（星3）の作品は「普通」のため、参考程度に扱う
- ★★☆☆☆（星2）の作品は「あまり好きではない」ため、類似作品は避ける
- ★☆☆☆☆（星1）の作品は「嫌い」なため、類似作品は強く避ける

推薦手順：
1. 星5と星4の作品から主要な好みのパターン（ジャンル、作風、テーマ等）を特定
2. 星2と星1の作品の特徴は避けるべき要素として認識
3. これらの分析に基づいて最適な作品を選定

以下の手順で回答してください：
1. まず、おすすめしたい漫画のタイトルとおすすめな理由を決めてください。
2. 決定したタイトルに対応する正確な著者とジャンルを検索してください。
- 注意事項
  - 似たようなタイトルの2次作品やパロディ作品の場合があるため、公式ページを確認し、タイトルと原作の著者が一致していることを確認してください。
  - 共同で著者がいる場合は、複数人記述してください。
  - 不確実な場合は「不明」と記載してください。

必ず以下の厳密なJSON配列形式のみで回答してください（余計なテキストやマークダウンは一切含めない）：
[
  {
    "title": "おすすめ漫画のタイトル",
    "author": "著者",
    "genre": "ジャンル",
    "reason": "おすすめ理由（特に星評価の高い作品との関連性を説明）"
  }
]

重要：JSON以外のテキスト（ヘッダー、説明文など）は含めず、有効なJSON配列のみを出力してください。
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
    // JSON文字列を抽出・修正
    let jsonString = extractAndFixJson(content);
    if (!jsonString) {
      throw new Error('No valid JSON array found in AI response');
    }
    
    return JSON.parse(jsonString) as MangaRecommendation[];
  } catch (error) {
    console.error('Failed to parse AI response:', content);
    console.error('Parse error details:', error);
    throw new Error('Failed to parse AI recommendations');
  }
}

// JSON抽出・修正ユーティリティ関数
function extractAndFixJson(content: string): string | null {
  const jsonStart = content.indexOf('[');
  const jsonEnd = content.lastIndexOf(']') + 1;
  
  if (jsonStart === -1 || jsonEnd === 0) {
    return null;
  }
  
  let jsonString = content.slice(jsonStart, jsonEnd);
  
  // 基本的な修正
  jsonString = jsonString
    .replace(/\/\*[\s\S]*?\*\//g, '') // コメント除去
    .replace(/\/\/.*$/gm, '') // 行コメント除去
    .replace(/,\s*([}\]])/g, '$1') // 末尾カンマ除去
    .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // プロパティ名のクォート追加
    .trim();
  
  return jsonString;
}


interface RecommendationOptions {
  minRating: number;
  targetYear?: string;
}

export async function getVerifiedAIRecommendations(
  favoritesWithRatings: FavoriteWithRating[], 
  options: RecommendationOptions = { minRating: 3.0 }
): Promise<MangaRecommendation[]> {
  
  // 第一段階: AI推薦を多めに取得（6件）
  const candidates = await getAIRecommendations(favoritesWithRatings, options.targetYear, 6);
  
  // フィルタリング: 楽天APIで評価チェック
  const { searchMangaWithRatings } = await import('./rakuten');
  
  const filteredCandidates: MangaRecommendation[] = [];
  
  // 並行処理数を制限（2つまで同時実行）
  const BATCH_SIZE = 2;
  const DELAY_BETWEEN_BATCHES = 2000; // バッチ間の待機時間を増加
  
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    
    // バッチ内は並行処理
    const batchPromises = batch.map(async (candidate) => {
      try {
        // レビュー数の制限は年指定時（新作モード）では緩和
        const minReviewCount = options.targetYear ? 0 : 5;
        const books = await searchMangaWithRatings(candidate.title, options.minRating, minReviewCount, options.targetYear);
        
        if (books.length > 0) {
          const bestMatch = books[0];
          return {
            ...candidate,
            reviewAverage: bestMatch.reviewAverage || undefined,
            reviewCount: bestMatch.reviewCount || undefined,
            qualityScore: bestMatch.reviewAverage ? bestMatch.reviewAverage * Math.log10((bestMatch.reviewCount || 1) + 1) : undefined,
            imageUrl: bestMatch.largeImageUrl || bestMatch.mediumImageUrl || bestMatch.smallImageUrl || undefined,
            isVerified: true
          };
        } else {
          return null; // フィルタアウト
        }
      } catch (error) {
        console.error(`Error verifying ${candidate.title}:`, error);
        
        // レート制限エラーの場合は未検証として保持、その他のエラーは除外
        if (error instanceof Error && error.message.includes('API rate limit exceeded')) {
          return {
            ...candidate,
            isVerified: false
          };
        }
        return null; // その他のエラーは除外
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    // nullでない結果のみを追加
    batchResults.forEach(result => {
      if (result) {
        filteredCandidates.push(result);
      }
    });
    
    // 次のバッチまで待機（最後のバッチでない場合）
    if (i + BATCH_SIZE < candidates.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }
  
  // 検証済み候補が少ない場合は未検証候補も含める
  if (filteredCandidates.filter(c => c.isVerified).length < 3) {
    
    // 未検証の候補を元のリストから追加
    candidates.forEach(candidate => {
      const alreadyExists = filteredCandidates.some(fc => fc.title === candidate.title);
      if (!alreadyExists) {
        filteredCandidates.push({
          ...candidate,
          isVerified: false
        });
      }
    });
  }
  
  // 品質スコアでソート（検証済み優先）
  const sortedCandidates = filteredCandidates.sort((a, b) => {
    if (a.isVerified && !b.isVerified) return -1;
    if (!a.isVerified && b.isVerified) return 1;
    return (b.qualityScore || 0) - (a.qualityScore || 0);
  });
  
  
  // 候補が3件以下の場合は直接返す
  if (sortedCandidates.length <= 3) {
    return sortedCandidates;
  }
  
  // 第二段階: AIに最適な3作品を選ばせる
  const finalRecommendations = await selectBestRecommendations(favoritesWithRatings, sortedCandidates, 3);
  
  return finalRecommendations;
}

export async function selectBestRecommendations(
  favoritesWithRatings: FavoriteWithRating[],
  filteredCandidates: MangaRecommendation[],
  finalCount: number = 3
): Promise<MangaRecommendation[]> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  if (filteredCandidates.length === 0) {
    return [];
  }

  if (filteredCandidates.length <= finalCount) {
    return filteredCandidates;
  }

  // お気に入り度を考慮したテキスト作成（同じロジックを再利用）
  const createFavoritesText = (favorites: FavoriteWithRating[]): string => {
    const ratingGroups = {
      5: favorites.filter(f => f.rating === 5),
      4: favorites.filter(f => f.rating === 4),
      3: favorites.filter(f => f.rating === 3),
      2: favorites.filter(f => f.rating === 2),
      1: favorites.filter(f => f.rating === 1)
    };

    let text = '';
    if (ratingGroups[5].length > 0) {
      text += `\n【非常に気に入っている作品★★★★★】\n${ratingGroups[5].map(f => f.name).join('、')}`;
    }
    if (ratingGroups[4].length > 0) {
      text += `\n【気に入っている作品★★★★☆】\n${ratingGroups[4].map(f => f.name).join('、')}`;
    }
    if (ratingGroups[3].length > 0) {
      text += `\n【普通の作品★★★☆☆】\n${ratingGroups[3].map(f => f.name).join('、')}`;
    }
    if (ratingGroups[2].length > 0) {
      text += `\n【あまり好きではない作品★★☆☆☆】\n${ratingGroups[2].map(f => f.name).join('、')}`;
    }
    if (ratingGroups[1].length > 0) {
      text += `\n【嫌いな作品★☆☆☆☆】\n${ratingGroups[1].map(f => f.name).join('、')}`;
    }
    
    return text;
  };

  const favoritesText = createFavoritesText(favoritesWithRatings);
  const candidatesText = filteredCandidates.map(candidate => 
    `- ${candidate.title}（${candidate.author}）: ${candidate.reason}`
  ).join('\n');

  const prompt = `
あなたは漫画に詳しいAIアシスタントです。以下のユーザーのお気に入り漫画（星評価付き）を分析し、候補作品の中から最もユーザーに適した${finalCount}つを選んでください。

お気に入り漫画（星評価付き）：${favoritesText}

候補作品：
${candidatesText}

【重要な選択基準】
1. ★★★★★（星5）と★★★★☆（星4）の作品との関連性を最優先
2. ★★☆☆☆（星2）と★☆☆☆☆（星1）の作品の特徴は避ける
3. ジャンルの多様性とバランス
4. おすすめ理由の妥当性と説得力

選択手順：
1. 星5・星4の作品から好みのパターンを分析
2. 候補作品の中から最も適合する作品を特定
3. 低評価作品の特徴と重複しないことを確認

必ず以下の厳密なJSON配列形式のみで回答してください（余計なテキストやマークダウンは一切含めない）：
[
  {
    "title": "選択した漫画のタイトル",
    "author": "著者",
    "genre": "ジャンル", 
    "reason": "なぜこの作品を選んだかの理由（特に高評価作品との関連性を説明）"
  }
]

重要：JSON以外のテキスト（ヘッダー、説明文など）は含めず、有効なJSON配列のみを出力してください。
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
    // JSON文字列を抽出・修正
    let jsonString = extractAndFixJson(content);
    if (!jsonString) {
      throw new Error('No valid JSON array found in AI response');
    }
    
    const selectedRecommendations = JSON.parse(jsonString) as MangaRecommendation[];
    
    // 元の候補から評価データを継承
    return selectedRecommendations.map(selected => {
      const original = filteredCandidates.find(c => c.title === selected.title);
      return original ? { ...original, reason: selected.reason } : selected;
    });
    
  } catch (error) {
    console.error('Failed to parse AI selection response:', content);
    console.error('Selection parse error details:', error);
    
    // 最終フォールバック：品質スコア順で返す
    return filteredCandidates.slice(0, finalCount);
  }
}