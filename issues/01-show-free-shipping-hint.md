# 送料無料までの残額を注文確認ページに表示する（「あと 30 円で送料無料になります」）

## 背景

注文確認ページ（`public/`）は、割引後の金額が 3,000 円以上なら送料無料、それ未満なら送料 500 円です（`src/price.js` の `calcShipping`）。
今の画面は「送料 500 円」と出るだけで、**あといくら買えば送料無料になるか** が分かりません。
初期状態（小計 3,300 円にクーポン `WELCOME10` で −330 円 → 2,970 円）は、送料無料まであと 30 円です。この残額を「お支払い金額」カードに表示します。

ブラウザでの見た目の確認は参加者が行います。**エージェントは dev サーバーを起動・停止・再起動しないでください**（`npm run dev`、`kill`、`lsof` を実行しない）。

## 仕様

### 計算（`src/price.js` と `test/price.test.js`）

- `src/price.js` に `remainingForFreeShipping(total)` を追加して `export` する
  - `total` は割引後の金額（円、整数）。`calcShipping` に渡すものと同じ
  - `total` が `FREE_SHIPPING_THRESHOLD`（3,000 円）未満なら差額を、以上なら `0` を返す
  - 既存の定数 `FREE_SHIPPING_THRESHOLD` を使う。`3000` を直接書かない
  - 置き場所は `calcShipping` の直後。JSDoc のコメントは既存の関数と同じ書き方にする
- `test/price.test.js` に `describe("remainingForFreeShipping", …)` を追加し、次の 4 例をテストする

| 入力（割引後の金額） | 期待する戻り値 |
|---|---|
| `0` | `3000` |
| `2970` | `30` |
| `3000` | `0` |
| `8000` | `0` |

### 画面（`public/index.html`、`public/app.js`、`public/style.css`）

- `public/index.html`: 「お支払い金額」カードの `</dl>` の直後にある `<!-- Issue #1: … -->` のコメントの位置に `<p class="shipping-hint" id="shipping-hint" hidden></p>` を追加する
- `public/app.js`: `remainingForFreeShipping` を `import` し、`renderSummary` の中で `#shipping-hint` を描く
  - 残額が 1 円以上のとき: 文字を「あと 30 円で送料無料になります」（金額は既存の `yen()` で整形）にして表示する
  - 残額が 0 円のとき: 文字を空にして `hidden` にする
  - クーポンを適用し直したとき（`render(code)` が呼ばれたとき）も、この表示が更新されること
- `public/style.css`: `.shipping-hint` のスタイルを **末尾** に追加する。小さめの文字で、既存の CSS 変数の色を使う。既存のルールは変更しない

### 具体例（商品は変えない。小計 3,300 円）

| クーポン | 割引後の金額 | 送料 | `#shipping-hint` の表示 |
|---|---|---|---|
| `WELCOME10`（初期状態） | 2,970 円 | 500 円 | あと 30 円で送料無料になります |
| `SAVE500` | 2,800 円 | 500 円 | あと 200 円で送料無料になります |
| `ABC`（無効 → クーポンなし） | 3,300 円 | 無料 | （非表示） |

## 受け入れ条件

- [ ] 上の 4 例のテストが追加され、`npm test` がすべて成功する（30 件 → 34 件）
- [ ] 変更したファイルが `src/price.js`、`test/price.test.js`、`public/index.html`、`public/app.js`、`public/style.css` の 5 つだけ
- [ ] `remainingForFreeShipping` が `FREE_SHIPPING_THRESHOLD` を使っている（`3000` の直書きがない）
- [ ] dev サーバーを起動・停止・再起動していない
- [ ] コミット・push・PR 作成はしていない（参加者が Orca から行う）
- [ ] 最後に、何をどう実装したかを日本語で短く報告する
