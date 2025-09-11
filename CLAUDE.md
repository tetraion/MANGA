# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

漫画新作通知アプリケーション - Next.js、Supabase、楽天ブックスAPIを使用した漫画新刊情報・AI推薦システム

## Development Commands

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm run start

# ESLintチェック
npm run lint
```

## Architecture

### Tech Stack
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL)
- 楽天ブックスAPI
- Groq API (gemma2-9b-it)
- Vercel

### File Structure
```
src/
├── app/
│   ├── api/
│   │   ├── favorites/
│   │   │   ├── route.ts          # お気に入り作品のCRUD
│   │   │   ├── [id]/route.ts     # 特定作品の削除
│   │   │   └── rating/route.ts   # 星評価更新API
│   │   ├── recommendations/
│   │   │   └── route.ts          # AIおすすめ機能（一般・新作統合）
│   │   ├── usage/
│   │   │   └── route.ts          # API使用量管理
│   │   └── update/
│   │       └── route.ts          # 楽天APIから情報更新
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # メイン画面
├── components/
│   ├── StarRating.tsx            # 星評価コンポーネント
│   ├── RecommendationsList.tsx   # AIおすすめ表示
│   ├── layout/
│   │   └── Header.tsx            # ヘッダーコンポーネント
│   ├── manga/
│   │   └── MangaTable.tsx        # 漫画テーブル表示
│   └── modals/
│       ├── AddMangaModal.tsx     # 作品追加モーダル
│       └── MangaDetailModal.tsx  # 作品詳細モーダル
└── lib/
    ├── supabase.ts               # Supabaseクライアント設定
    ├── rakuten.ts                # 楽天ブックスAPI呼び出し
    └── groq.ts                   # Groq AI API呼び出し（二段階推薦システム）
```

### Database Schema
```sql
-- お気に入り作品テーブル
CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  series_name TEXT NOT NULL,
  author_name TEXT,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 新刊情報テーブル
CREATE TABLE volumes (
  id SERIAL PRIMARY KEY,
  favorite_id INTEGER REFERENCES favorites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  volume_number INTEGER,
  release_date DATE,
  price INTEGER,
  rakuten_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API使用量管理テーブル
CREATE TABLE api_usage (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  service_type TEXT NOT NULL,
  daily_count INTEGER DEFAULT 0,
  monthly_count INTEGER DEFAULT 0,
  last_used DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Environment Variables

```bash
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# 楽天ブックスAPI設定
RAKUTEN_APPLICATION_ID=your_rakuten_application_id_here

# Groq AI API設定
GROQ_API_KEY=your_groq_api_key_here
```

## Setup Instructions

1. Supabaseプロジェクト作成とテーブル作成
2. 楽天デベロッパー登録とAPI Key取得
3. Groq Console（https://console.groq.com/）でAPI Key取得
4. 環境変数を.env.localファイルに設定
5. `npm install` で依存関係をインストール
6. `npm run dev` で開発サーバー起動

## 機能

### AIおすすめ
- 二段階推薦: AI候補生成(6件) → 楽天API評価検証 → AI最終選定(3件)
- 一般: 評価3.0+, レビュー5件+
- 新作: 評価2.5+, レビュー制限緩和
- 制限: 100回/日, 3000回/月, IP管理
- エンドポイント: `/api/recommendations[?type=recent]`

### 基本機能
- お気に入り漫画管理 (CRUD)
- 星評価機能 (1-5星、お気に入り度)
- 楽天API新刊情報取得
- 巻数自動抽出・更新
- 使用量制限管理

## Claude 作業ルール

### 必須プロセス
1. 変更内容の事前提示（対象ファイル・箇所・理由）
2. ユーザー承認待ち（明示的な許可まで実行しない）
3. 段階的実行（大規模変更は分割）

### 禁止
- 無断でのコード変更
- 一度に大量ファイル変更

## 技術仕様

### 現在の構成
- 単一エンドポイント + クエリパラメータ方式
- 二段階AI推薦システム（6候補→フィルタ→3選定）
- 評価基準: 一般(3.0+,5件+), 新作(2.5+,緩和)
- 使用制限: IPベース, 日次/月間管理
- エラー対応: 部分成功表示, 429制限対応

### 変更時注意
- 候補数変更 → API制限影響
- 評価基準変更 → モード差異維持
- エンドポイント変更 → フロント同期
- スキーマ変更 → マイグレーション必須

### 技術的負債
- `/api/recent-recommendations/route.ts` は使用されていない（統合済み）→ 削除可能

## Key Components & Implementation Details

### React Components
- `page.tsx`: Main application layout with favorites management and recommendations display
- `AddForm.tsx`: Form for adding new favorite manga series
- `FavoritesList.tsx`: Display component for user's favorite manga with volume information
- `RecommendationsList.tsx`: AI-powered manga recommendation interface with usage tracking
- `AddMangaModal.tsx` & `MangaDetailModal.tsx`: Modal components for adding and viewing manga details
- `StarRating.tsx`: Interactive star rating component (1-5 stars)
- `MangaTable.tsx`: Table display component for manga listings

### API Routes
- `/api/favorites`: CRUD operations for favorite manga series
- `/api/favorites/[id]`: Individual favorite deletion
- `/api/favorites/rating`: Star rating updates (1-5 stars or 0 to clear)
- `/api/recommendations`: Unified AI recommendation endpoint (supports `?type=recent` parameter)
- `/api/usage`: API usage tracking and rate limiting (IP-based)
- `/api/update`: Rakuten API data synchronization with volume number extraction

### Libraries & External APIs
- `lib/supabase.ts`: Database client configuration and TypeScript interfaces
- `lib/rakuten.ts`: Rakuten Books API integration with rate limiting and error handling
- `lib/groq.ts`: Groq AI API integration with two-stage recommendation system

## Important Implementation Patterns

### AI Recommendation Flow
1. **Stage 1**: Generate 6 candidate recommendations using Groq AI
2. **Stage 2**: Validate candidates against Rakuten API (rating/review filtering)
3. **Stage 3**: AI selects best 3 recommendations from validated candidates
4. **Fallback**: Include unverified candidates if not enough verified results

### Rate Limiting & Error Handling
- IP-based usage tracking in `api_usage` table
- Daily limits: 100 recommendations, 20 recent-manga
- Monthly limits: 3000 recommendations, 600 recent-manga
- Exponential backoff for Rakuten API rate limits
- Graceful degradation for partial failures

### Database Relationships
- `favorites` → `volumes` (one-to-many via `favorite_id`)
- `favorites.user_rating`: 1-5 star user evaluation of manga series
- `api_usage` tracks per-IP usage by service type and date
- Cascade deletion: removing favorites automatically removes associated volumes
- Volume number extraction: regex patterns extract numbers from titles during updates

### Client-Side State Management
- Manual state synchronization between components
- Hydration error prevention using consistent date calculations
- Star rating with immediate UI feedback and background API updates
- Usage status display with real-time updates

## Development Guidelines

### Testing Strategy
- Use `npm run lint` to check code quality
- No specific test framework configured - check with user if tests needed
- Manual testing via development server (`npm run dev`)

### Code Conventions
- TypeScript strict mode enabled
- Japanese language used for UI text and comments
- Tailwind CSS for styling with responsive design
- Error messages in Japanese for user-facing errors
- Console logging for debugging (English for technical details)

### API Design Patterns
- RESTful endpoints with appropriate HTTP methods
- Consistent error response format: `{ error: string }`
- Query parameters for endpoint variants (`?type=recent`)
- IP-based user identification for rate limiting