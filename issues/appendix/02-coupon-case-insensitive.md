# クーポンコードの大文字小文字を区別しない（welcome10 でも WELCOME10 として扱う）

## 背景

注文確認ページ（`public/`）のクーポン欄に `welcome10` と小文字で入れると「使えません」になります。
利用者は大文字小文字を意識しないので、コードを **大文字に正規化してから** 判定するようにします。

ブラウザでの見た目の確認は参加者が行います。**エージェントは dev サーバーを起動・停止・再起動しないでください**（`npm run dev`、`kill`、`lsof` を実行しない）。

## 仕様

- `src/price.js` に `normalizeCouponCode(code)` を追加して `export` する
  - 文字列なら前後の空白を除いて大文字にして返す。文字列以外（`undefined` など）なら `""` を返す
  - 置き場所は `applyCoupon` の直前。JSDoc のコメントは既存の関数と同じ書き方にする
- `applyCoupon(total, code)` は、`normalizeCouponCode(code)` の結果で `COUPONS` を探す（既存の動きは変えない。`"WELCOME10"` は今までどおり 10% 引き）
- `public/app.js`: `renderSummary` の「クーポンがあるか」の判定と、`setupCouponForm` の判定でも `normalizeCouponCode` を使う。画面に出すコード（`#coupon-code` とメッセージの中）は正規化後の大文字にする
- `test/price.test.js` に次の 3 例をテストとして追加する

| テスト | 期待 |
|---|---|
| `normalizeCouponCode(" welcome10 ")` | `"WELCOME10"` |
| `normalizeCouponCode(undefined)` | `""` |
| `applyCoupon(1000, "save500")` | `500` |

## 受け入れ条件

- [ ] 上の 3 例のテストが追加され、`npm test` がすべて成功する（34 件 → 37 件）
- [ ] 変更したファイルが `src/price.js`、`test/price.test.js`、`public/app.js` の 3 つだけ
- [ ] 既存のテストは変更していない
- [ ] dev サーバーを起動・停止・再起動していない
- [ ] コミット・push・PR 作成はしていない（参加者が Orca から行う）
- [ ] 最後に、何をどう実装したかを日本語で短く報告する
