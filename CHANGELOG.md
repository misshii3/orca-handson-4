# 変更履歴

このプロジェクトの変更点を、リリースごとにまとめます。
形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に沿い、見出しは日本語（追加・変更・修正）にしています。
書き方のルールは [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) を見てください。

## 未リリース

## 0.3.0 - 2026-09-15

第3弾（Orca ハンズオン 第3弾）の完了状態。

### 追加
- 注文確認ページ `public/`（商品 3 品、クーポン、送料、税込合計、お届け予定日）と、依存なしの dev サーバー `scripts/dev-server.js`
- クーポン入力欄（コードを入力して「適用」すると割引・送料・合計が再計算される。使えないコードは赤いメッセージ）
- dev サーバーのスモークテスト `test/dev-server.test.js`

### 修正
- 注文確認ページの見た目 4 か所（合計金額の文字色、金額列の右寄せ、お届け予定日の日本語表記、スマホ幅でのボタン幅）

## 0.2.0 - 2026-09-13

第2弾の完了状態。

### 追加
- `formatDateJa`（YYYY年M月D日）、`calcShipping`（3,000 円以上で送料無料）、`applyCoupon`（WELCOME10 / SAVE500）とそのテスト

## 0.1.0 - 2026-09-11

第1弾の完了状態。

### 追加
- `calcTaxIncluded`、`applyDiscount`、`formatDate` とそのテスト
