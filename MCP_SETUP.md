# MCP（Model Context Protocol）設定ガイド

## 概要
このプロジェクトではSupabaseとVercelのMCPサーバーを使用して、Claude Code内でデータベース操作やデプロイを行います。

## 設定完了済み
✅ Claude Desktop設定ファイルが作成済みです
- 場所: `C:\Users\teine\AppData\Roaming\Claude\claude_desktop_config.json`

## 次のステップ

### 1. 環境変数の設定
設定ファイル内の環境変数に実際の値を入力してください：

```json
{
  "mcpServers": {
    "supabase": {
      "env": {
        "SUPABASE_URL": "あなたのSupabase URL",
        "SUPABASE_ANON_KEY": "あなたのSupabase匿名キー"
      }
    },
    "vercel": {
      "env": {
        "VERCEL_ACCESS_TOKEN": "あなたのVercelアクセストークン"
      }
    }
  }
}
```

### 2. 必要な情報の取得

#### Supabase
1. [Supabase](https://supabase.com)でプロジェクト作成
2. Settings → API から以下を取得：
   - `Project URL` → SUPABASE_URL
   - `anon public` → SUPABASE_ANON_KEY

#### Vercel
1. [Vercel](https://vercel.com)にログイン
2. Settings → Tokens でアクセストークンを作成
3. 作成したトークン → VERCEL_ACCESS_TOKEN

### 3. Claude Desktop再起動
設定を反映するためにClaude Desktopを再起動してください。

### 4. 動作確認
Claude Code内で以下のコマンドが使用可能になります：

#### Supabase MCP
- `mcp__supabase__query` - SQLクエリ実行
- `mcp__supabase__list_tables` - テーブル一覧
- `mcp__supabase__describe_table` - テーブル構造確認

#### Vercel MCP  
- `mcp__vercel__deploy` - デプロイ実行
- `mcp__vercel__get_deployments` - デプロイ履歴
- `mcp__vercel__get_project_info` - プロジェクト情報

## データベーステーブル作成SQL
MCPが有効になったら、以下のSQLでテーブルを作成してください：

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

## トラブルシューティング
- MCPサーバーが認識されない場合は、Claude Desktopを完全に終了してから再起動
- 環境変数が正しく設定されているか確認
- ネットワーク接続を確認