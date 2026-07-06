# Swarm 経県値マップ

Foursquare Swarmのチェックインデータから、訪問した都道府県を可視化するWebアプリケーション。

## 機能

- Foursquare API連携によるチェックインデータの自動取得
- エクスポートデータ（JSON/CSV）のファイルアップロード
- 訪問都道府県の色分け表示（チェックイン回数に応じて4段階）
- 地方別の統計表示
- 都道府県別のチェックイン履歴表示

## 技術スタック

- React 19 + TypeScript
- Vite
- Tailwind CSS
- d3-geo（日本地図描画）
- Nginx（本番環境）

## セットアップ

### 開発環境

```bash
npm install
npm run dev
```

### Foursquare API設定

1. [Foursquare Developer Portal](https://developer.foursquare.com/)でアプリ登録
2. リダイレクトURIに `http://localhost:5173/callback` を追加
3. `.env`ファイルを作成:

```env
VITE_FOURSQUARE_CLIENT_ID=your_client_id
VITE_FOURSQUARE_CLIENT_SECRET=your_client_secret
```

## 使い方

### API連携

1. 「Foursquareでログイン」ボタンをクリック
2. Foursquareアカウントで認証
3. 「チェックインデータを取得」ボタンで全データを自動取得

### ファイルアップロード

Swarmのエクスポートデータ（JSON/CSV）をドラッグ&ドロップまたはファイル選択。

## ビルド・デプロイ

### ローカルビルド

```bash
npm run build
```

### Docker

```bash
# ビルド
docker build -t ghcr.io/yude/swarm-keikenchi:latest .

# 実行（環境変数で認証情報を渡す）
docker run -p 8080:80 \
  -e VITE_FOURSQUARE_CLIENT_ID=xxx \
  -e VITE_FOURSQUARE_CLIENT_SECRET=xxx \
  ghcr.io/yude/swarm-keikenchi:latest
```

### Docker Compose

```bash
# .envファイルに認証情報を設定
docker compose up --build
```

### Kubernetes (Kustomize)

1. Secretを作成:

```bash
# k8s/base/secret.yamlを編集して実際の認証情報を設定
kubectl apply -f k8s/base/secret.yaml

# またはコマンドラインで作成
kubectl create secret generic foursquare-credentials \
  --from-literal=client-id=YOUR_CLIENT_ID \
  --from-literal=client-secret=YOUR_CLIENT_SECRET \
  -n keikenchi-map
```

2. デプロイ:

```bash
# 開発環境
kubectl apply -k k8s/overlays/development

# 本番環境
kubectl apply -k k8s/overlays/production
```

SecretはPod起動時に環境変数として注入され、Nginxが起動時に`/config.js`を動的に生成してフロントエンドに認証情報を渡します。

### GitHub Actions

認証情報はビルド時に埋め込まれません。mainブランチへのpushまたはタグプッシュ時に自動的にビルド・プッシュされます。

## ライセンス

MIT
