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
}

export async function getAIRecommendations(favoritesList: string[], focusRecent: boolean = false): Promise<MangaRecommendation[]> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const favoritesText = favoritesList.join('、');
  
  const prompt = focusRecent ? `
あなたは漫画に詳しいAIアシスタントです。以下のお気に入り漫画リストから、ユーザーの好みを分析して、2023年以降に連載開始した最近の漫画を3つおすすめしてください。

お気に入り漫画：${favoritesText}

以下の手順で回答してください：
1. まず、おすすめしたい2023年以降の漫画のタイトルとおすすめな理由を決めてください
2. 決定したタイトルに対応する正確な作者名とジャンルを検索してください

以下のJSON形式で回答してください：
[
  {
    "title": "おすすめ漫画のタイトル",
    "author": "上記タイトルの正確な作者名",
    "genre": "上記タイトルの正確なジャンル",
    "reason": "おすすめ理由（なぜこのユーザーに合うか）"
  }
]

` : `
あなたは漫画に詳しいAIアシスタントです。以下のお気に入り漫画リストから、ユーザーの好みを分析して新しい漫画を3つおすすめしてください。

お気に入り漫画：${favoritesText}

以下の手順で回答してください：
1. まず、おすすめしたい漫画のタイトルとおすすめな理由を決めてください
2. 決定したタイトルに対応する正確な作者名とジャンルを検索してください

以下のJSON形式で回答してください：
[
  {
    "title": "おすすめ漫画のタイトル",
    "author": "上記タイトルの正確な作者名",
    "genre": "上記タイトルの正確なジャンル",
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