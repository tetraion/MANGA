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

export async function getAIRecommendations(favoritesList: string[], targetYear?: string, count: number = 3): Promise<MangaRecommendation[]> {
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
あなたは漫画に詳しいAIアシスタントです。以下のお気に入り漫画リストから、ユーザーの好みを分析して${targetDescription}を${count}つおすすめしてください。

お気に入り漫画：${favoritesText}

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
    "reason": "おすすめ理由（なぜこのユーザーに合うか）"
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
    
    // フォールバック: より堅牢なJSON修正を試行
    try {
      const fixedJson = attemptJsonRepair(content);
      if (fixedJson) {
        return JSON.parse(fixedJson) as MangaRecommendation[];
      }
    } catch (fallbackError) {
      console.error('JSON repair also failed:', fallbackError);
    }
    
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

function attemptJsonRepair(content: string): string | null {
  try {
    // より積極的な修正を試行
    const matches = content.match(/\[[\s\S]*?\]/g);
    if (!matches || matches.length === 0) return null;
    
    const longestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
    
    // 一般的なJSON構文エラーを修正
    let repaired = longestMatch
      .replace(/\n/g, ' ') // 改行を空白に
      .replace(/\s+/g, ' ') // 連続空白を単一空白に
      .replace(/,\s*([}\]])/g, '$1') // 末尾カンマ除去
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // プロパティ名クォート
      .replace(/:\s*([^"\[\{\d][^,}\]]*[^,}\]\s])/g, (match, value) => {
        // 値のクォート修正（既にクォートされていない場合）
        const trimmedValue = value.trim();
        if (!trimmedValue.startsWith('"') && !trimmedValue.startsWith('[') && !trimmedValue.startsWith('{')) {
          return `: "${trimmedValue}"`;
        }
        return match;
      })
      .trim();
    
    // 基本的な構文チェック
    JSON.parse(repaired);
    return repaired;
  } catch {
    return null;
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
  
  // 第一段階: AI推薦を多めに取得（6件）
  const candidates = await getAIRecommendations(favoritesList, options.targetYear, 6);
  
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
  const finalRecommendations = await selectBestRecommendations(favoritesList, sortedCandidates, 3);
  
  return finalRecommendations;
}

export async function selectBestRecommendations(
  favoritesList: string[],
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

  const favoritesText = favoritesList.join('、');
  const candidatesText = filteredCandidates.map(candidate => 
    `- ${candidate.title}（${candidate.author}）: ${candidate.reason}`
  ).join('\n');

  const prompt = `
あなたは漫画に詳しいAIアシスタントです。以下のユーザーのお気に入り漫画を分析し、候補作品の中から最もユーザーに適した${finalCount}つを選んでください。

お気に入り漫画：${favoritesText}

候補作品：
${candidatesText}

以下の基準で選択してください：
1. ユーザーの好みとの関連性
2. ジャンルの多様性
3. おすすめ理由の妥当性

必ず以下の厳密なJSON配列形式のみで回答してください（余計なテキストやマークダウンは一切含めない）：
[
  {
    "title": "選択した漫画のタイトル",
    "author": "著者",
    "genre": "ジャンル", 
    "reason": "なぜこの作品を選んだかの理由"
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
    
    // フォールバック: より堅牢なJSON修正を試行
    try {
      const fixedJson = attemptJsonRepair(content);
      if (fixedJson) {
        const selectedRecommendations = JSON.parse(fixedJson) as MangaRecommendation[];
        return selectedRecommendations.map(selected => {
          const original = filteredCandidates.find(c => c.title === selected.title);
          return original ? { ...original, reason: selected.reason } : selected;
        });
      }
    } catch (fallbackError) {
      console.error('JSON repair for selection also failed:', fallbackError);
    }
    
    // 最終フォールバック：品質スコア順で返す
    return filteredCandidates.slice(0, finalCount);
  }
}