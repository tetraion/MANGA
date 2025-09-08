# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

漫画新作通知アプリケーション - Next.js、Supabase、楽天ブックスAPIを使用した漫画の新刊情報を確認できるWebアプリケーション

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
- **Frontend**: Next.js 15 (App Router) with TypeScript
- **UI**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **External API**: 楽天ブックスAPI
- **AI**: Groq API (gemma2-9b-it)
- **Deployment**: Vercel

### File Structure
```
src/
├── app/
│   ├── api/
│   │   ├── favorites/
│   │   │   ├── route.ts          # お気に入り作品のCRUD
│   │   │   └── [id]/route.ts     # 特定作品の削除
│   │   ├── recommendations/
│   │   │   └── route.ts          # AIおすすめ機能
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
    └── groq.ts                   # Groq AI API呼び出し
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

## 新機能: AIおすすめ機能

お気に入り登録している漫画の傾向を分析し、AIが新しい漫画をおすすめする機能です。

### 機能概要
- Groq API（gemma2-9b-it）を使用
- ユーザーのお気に入り漫画を分析
- 類似する嗜好の新作漫画を3つ推薦
- ジャンル・作者・おすすめ理由を表示

### 使用方法
1. お気に入り漫画を複数登録
2. メイン画面右側の「AIおすすめ漫画」セクションで「おすすめを取得」ボタンをクリック
3. AIが分析した結果に基づくおすすめ漫画が表示される