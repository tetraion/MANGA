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
- **Deployment**: Vercel

### File Structure
```
src/
├── app/
│   ├── api/
│   │   ├── favorites/
│   │   │   ├── route.ts          # お気に入り作品のCRUD
│   │   │   └── [id]/route.ts     # 特定作品の削除
│   │   └── update/
│   │       └── route.ts          # 楽天APIから情報更新
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # メイン画面
├── components/
│   ├── AddForm.tsx               # 作品追加フォーム
│   └── FavoritesList.tsx         # お気に入り一覧表示
└── lib/
    ├── supabase.ts               # Supabaseクライアント設定
    └── rakuten.ts                # 楽天ブックスAPI呼び出し
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
```

## Setup Instructions

1. Supabaseプロジェクト作成とテーブル作成
2. 楽天デベロッパー登録とAPI Key取得
3. 環境変数を.envファイルに設定
4. `npm install` で依存関係をインストール
5. `npm run dev` で開発サーバー起動