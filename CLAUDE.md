# CLAUDE.md

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
│   │   │   └── [id]/route.ts     # 特定作品の削除
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
│   ├── AddForm.tsx               # 作品追加フォーム
│   ├── FavoritesList.tsx         # お気に入り一覧表示
│   └── RecommendationsList.tsx   # AIおすすめ表示
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
- 楽天API新刊情報取得
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