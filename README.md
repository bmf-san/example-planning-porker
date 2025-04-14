# Planning Poker アプリケーション

アジャイル開発におけるストーリーポイント見積もりのためのリアルタイムPlanning Pokerアプリケーションです。

## 特徴

- 登録不要で即座に利用可能
- リアルタイムでの投票状況の共有
- シンプルで使いやすいインターフェース
- 軽量で高速な動作

## 技術スタック

- **フロントエンド**: HTML, CSS, JavaScript (フレームワークなし)
- **バックエンド**: Node.js, Express
- **リアルタイム通信**: Socket.IO
- **デプロイ**: Docker, Google Cloud Run

## ローカル開発

### 前提条件

- Node.js（バージョン14以上）
- npm（バージョン6以上）

### セットアップ手順

1. リポジトリをクローン

```bash
git clone https://github.com/yourusername/planning-poker.git
cd planning-poker
```

2. 依存関係をインストール

```bash
npm install
```

3. 開発サーバーを起動

```bash
npm start
```

4. ブラウザで http://localhost:3000 にアクセス

## 使い方

1. ルームIDとユーザー名を入力してルームに参加
2. ストーリーポイントを選択（1, 2, 3, 5, 8, 13, 21）
3. 全員が投票したら「結果公開」ボタンをクリック
4. 次のストーリーに移る場合は「リセット」ボタンをクリック

## デプロイ

### Google Cloud Runへのデプロイ

1. Google Cloud SDKをインストール
2. Dockerイメージをビルド

```bash
docker build -t planning-poker .
```

3. Google Container Registryにプッシュ

```bash
docker tag planning-poker gcr.io/your-project/planning-poker
docker push gcr.io/your-project/planning-poker
```

4. Cloud Runにデプロイ

```bash
gcloud run deploy planning-poker --image gcr.io/your-project/planning-poker
```

## ライセンス

MIT