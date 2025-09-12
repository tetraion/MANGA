# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリでコードを扱う際のガイダンスを提供します。

漫画管理・AI推薦アプリケーション - Next.js、Supabase、楽天ブックスAPIを使用した漫画管理・AI推薦システム

## 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm run start

# ESLintチェック
npm run lint

# TypeScript型チェック
npx tsc --noEmit
```

## アーキテクチャ

### 技術スタック
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL)
- 楽天ブックスAPI
- Groq API (gemma2-9b-it)
- Vercel

### ファイル構造
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

### データベーススキーマ
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
  image_url TEXT,
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

## 環境変数

```bash
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# 楽天ブックスAPI設定
RAKUTEN_APPLICATION_ID=your_rakuten_application_id_here

# Groq AI API設定
GROQ_API_KEY=your_groq_api_key_here
```

## セットアップ手順

1. Supabaseプロジェクト作成とテーブル作成
2. 楽天デベロッパー登録とAPI Key取得
3. Groq Console（https://console.groq.com/）でAPI Key取得
4. 環境変数を.env.localファイルに設定
5. `npm install` で依存関係をインストール
6. `npm run dev` で開発サーバー起動

## 機能

### AIおすすめ
- 二段階推薦: AI候補生成(6件) → 楽天API評価検証 → AI最終選定(3件)
- ジャンル付加機能: プリセットジャンル17種 + 自然言語カスタムジャンル
- 一般: 評価3.0+, レビュー5件+
- 新作: 評価2.5+, レビュー制限緩和
- 制限: 100回/日, 3000回/月, IP管理
- エンドポイント: `/api/recommendations[?type=recent&genres=...]`

### 基本機能
- お気に入り漫画管理 (CRUD)
- 星評価機能 (1-5星、お気に入り度)
- 楽天API新刊情報取得・画像表示
- 使用量制限管理
- レスポンシブテーブル表示・検索機能

## 技術仕様

### 現在の構成
- 単一エンドポイント + クエリパラメータ方式 (`/api/recommendations[?type=recent&genres=...]`)
- ジャンル付加機能: プリセット17ジャンル + カスタム入力（自然言語対応）
- 二段階AI推薦システム（6候補→楽天API評価検証→AI最終選定3件）
- 評価基準: 一般(3.0+,5件+), 新作(2.5+,緩和)
- 使用制限: IPベース, 日次/月間管理 (日次100回, 月次3000回)
- UI: コンパクトな展開式ジャンル付加、視覚的フィードバック表示
- エラー対応: 部分成功表示, 429制限対応, 指数バックオフ

### AI推薦フロー詳細
1. **Stage 1 (getAIRecommendations)**: 星評価 + ジャンル指定でGroq APIが6件候補生成
2. **Stage 2 (楽天API検証)**: 候補を並行処理(2件ずつ)で評価・レビュー数・画像取得
3. **Stage 3 (selectBestRecommendations)**: 検証済み候補からAIが最適3件を選定
4. **Fallback**: 検証済み候補が不足時は未検証候補も含める
5. **UI表示**: ジャンル考慮表示、画像付き推薦カード、マッチングハイライト

### 変更時注意
- 候補数変更 → API制限・処理時間に影響
- 評価基準変更 → 一般/新作モード差異の維持必要
- エンドポイント変更 → フロントエンド同期必須
- スキーマ変更 → Supabaseマイグレーション必須
- レート制限調整 → `lib/rakuten.ts` のバッチサイズ・待機時間見直し

## 主要コンポーネント & 実装詳細

### Reactコンポーネント
- `page.tsx`: お気に入り管理とおすすめ表示を含むメインアプリケーションレイアウト、ヘッダーベースのスムーズスクロール機能付き
- `RecommendationsList.tsx`: ジャンル付加機能付きAI推薦漫画インターフェース（プリセット17ジャンル + カスタム入力、視覚的フィードバック表示）
- `AddMangaModal.tsx` & `MangaDetailModal.tsx`: 漫画の追加と詳細表示用モーダルコンポーネント
- `StarRating.tsx`: インタラクティブな星評価コンポーネント（1-5星）
- `MangaTable.tsx`: ソート・検索・AI推薦除外機能付き漫画テーブル表示コンポーネント
- `Header.tsx`: 検索機能とAI推薦へのスクロール機能を含むヘッダーコンポーネント

### APIルート
- `/api/favorites`: お気に入り漫画シリーズのCRUD操作
- `/api/favorites/[id]`: 個別のお気に入り削除
- `/api/favorites/rating`: 星評価の更新（1-5星または0でクリア）
- `/api/recommendations`: 統合AI推薦エンドポイント（`?type=recent&genres=...`パラメータ対応、ジャンル付加機能付き）
- `/api/usage`: API使用量追跡とレート制限（IPベース）
- `/api/update`: 楽天APIデータ同期（巻数抽出・画像URL取得機能付き）

### ライブラリ & 外部API
- `lib/supabase.ts`: データベースクライアント設定とTypeScriptインターフェース
- `lib/rakuten.ts`: レート制限とエラーハンドリング付き楽天ブックスAPI統合（画像URL取得対応）
- `lib/groq.ts`: ジャンル考慮対応二段階推薦システム付きGroq AI API統合

## 重要な実装パターン

### AI推薦フロー
1. **第1段階**: Groq AIを使用し6件の候補推薦を生成
2. **第2段階**: 楽天APIで候補を検証（評価/レビューフィルタリング）
3. **第3段階**: AIが検証済み候補から最適な3件を選定
4. **フォールバック**: 検証済み結果が不足の場合は未検証候補も含める

### レート制限 & エラーハンドリング
- `api_usage`テーブルでIPベースの使用量追跡
- 日次制限: 推薦100回、新作20回
- 月次制限: 推薦3000回、新作600回
- 楽天APIレート制限に対する指数バックオフ
- 部分的障害に対するグレースフルデグラデーション

### データベース関係
- `favorites` → `volumes` （`favorite_id`経由1対多）
- `favorites.user_rating`: 漫画シリーズの1-5星ユーザー評価
- `api_usage`はサービスタイプと日付別のIP単位使用量を追跡
- カスケード削除: お気に入り削除時に関連巻を自動削除
- 巻数抽出: 更新時に正規表現パターンでタイトルから数値を抽出

### クライアントサイド状態管理
- コンポーネント間の手動状態同期
- 一致した日付計算を使用したHydrationエラー防止
- 即座UIフィードバックとバックグラウンドAPI更新付き星評価
- リアルタイム更新付き使用状況表示
- ジャンル付加機能の展開/収納状態管理

## 開発ガイドライン

### テスト戦略
- コード品質チェックに`npm run lint`を使用
- 特定のテストフレームワークは未設定 - テストが必要な場合はユーザーに確認
- 開発サーバー(`npm run dev`)での手動テスト

### コード規約
- TypeScriptストリクトモード有効
- UIテキストとコメントに日本語使用
- レスポンシブデザイン用Tailwind CSSスタイリング
- ユーザー向けエラーメッセージは日本語
- デバッグ用コンソールログ（技術詳細は英語）

### API設計パターン
- 適切なHTTPメソッドを使用したRESTfulエンドポイント
- 一致したエラーレスポンス形式: `{ error: string }`
- エンドポイントバリアント用クエリパラメータ(`?type=recent&genres=...`)
- レート制限用IPベースユーザー識別
- ジャンル情報のJSON形式クエリパラメータ送信

## 重要な実装ノート

### データ品質フィルタリング
`page.tsx:16-21`で定義された`EXCLUDE_KEYWORDS`定数は、ガイドブック、アートブック、その他の非漫画コンテンツを巻データからフィルタリングする。これによりUIが関連資料で散らからないようにする。

### ジャンル付加システム
- **プリセットジャンル**: 17種類のジャンル（少年、少女、青年、BL/GL、異世界転生など）を`MANGA_GENRES`定数で管理
- **カスタムジャンル**: 自然言語入力対応（「スポーツ系の漫画」「恋愛要素強め」など）
- **視覚的フィードバック**: 推薦結果でジャンル考慮表示、マッチングジャンルのハイライト（緑色+チェックマーク）
- **UI設計**: 展開式デザインでコンパクト表示、重複排除機能付き

### 巻数抽出
`/api/update/route.ts`は正規表現パターンを使用してタイトルから巻数を抽出する。現在のパターンは「第1巻」、「1巻」、「Vol.1」などの形式に対応。

### 星評価システム
- favoritesテーブルの`user_rating`: 1-5星または未評価のNULL
- 未評価のお気に入りはAI推薦でデフォルトで3とする
- 星評価はAI推薦プロンプトに大きく影響（5★ = 最高優先度、ジャンル考慮と併用）

### Hydrationエラー防止  
`RecommendationsList.tsx`は、`mounted`状態がtrueになるまでプレースホルダーコンテンツを表示してSSR hydrationの不一致を防止する。

### スクロール機能実装
`page.tsx:173-193`でヘッダー高さ（64px）を考慮したスムーズスクロール実装。`scrollIntoView`から`window.scrollTo`に変更してオフセット調整を正確に行う。

### レート制限実装
- `api/usage/route.ts`は`api_usage`テーブルでIPアドレス別の使用量を追跡
- 高コストなAI操作前に使用量をチェック/増加
- サービスタイプ別に異なる制限（推薦 vs 新作）
- ユーザーフレンドリーな表示形式（「本日の利用: X/100回」）

### API統合パターン
- **楽天API**: レート制限用指数バックオフ、バッチ処理（2同時リクエスト）、画像URL取得対応
- **Groq AI API**: ジャンル考慮プロンプト、フォールバック解析付きJSONレスポンス抽出
- **Supabase**: `lib/supabase.ts`で定義されたTypeScriptインターフェース、image_url列追加対応

## デバッグ & メンテナンス

### パフォーマンスに関する考慮点
- AI推薦はAPI呼び出しを減らすために2段階フィルタリングを使用
- ジャンル付加機能は展開式で初期表示を軽量化
- 巻データは`page.tsx`で表示前に事前フィルタリングとソート
- 使用量追跡は正当な使用を許可しながら乱用を防止
- 楽天API画像取得は並行処理でレスポンス時間を短縮
