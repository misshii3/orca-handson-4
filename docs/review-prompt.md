# レビュアー用プロンプト（Codex に貼る）

第4弾 5 章で、PR から作ったワークツリーの Codex に貼る文です。Orca が入力欄に入れた PR の URL の下に、`---` より下を **そのまま** 貼ってください。
PR の番号が `#2` でないときは、文中の `2` を自分の番号に読み替えてください（付録 A では `4`、Issue は `3`）。

---

あなたは PR #2 のレビュアーです。このワークツリーは PR #2 のブランチを開いています。コードは一切変更せず、レビューコメントを GitHub に投稿するところまでを行ってください。

## 準備
1. `gh pr view 2 --json title,headRefName,headRefOid,body` で PR の情報を取り、`git rev-parse HEAD` が headRefOid と一致することを確認する。違っていたら `git fetch origin pull/2/head && git checkout --detach FETCH_HEAD` で PR の先頭を取り出す
2. `gh issue view 1` で仕様（Issue #1）を読む
3. `gh pr diff 2` で差分を読み、必要なら変更されたファイル全体も読む
4. `npm test` を実行して結果を確認する（dev サーバーは起動しない）

## レビューの観点（この 5 つに限定する）
- 仕様との一致: Issue #1 の表（テスト 4 例・画面 3 例）どおりに動くか
- エッジケース: 境界値（2,999 円 / 3,000 円）、0 円、クーポンを付け替えたときに表示が更新されるか
- 既存の関数・定数の再利用: `FREE_SHIPPING_THRESHOLD`、`calcShipping`、`yen()` を使っているか。同じ計算を 2 か所に書いていないか
- アクセシビリティ: 文字が動的に変わる要素の扱い（`role="status"` や `aria-live`）、非表示の仕方
- テスト: 4 例で十分か。足すべき境界値はないか

CHANGELOG やドキュメント、リリース手順については指摘しない。コードとテストだけを見る。

## 出力（GitHub に投稿する）
- 行に対する（インライン）コメントを 2〜4 件と、全体のまとめコメントを 1 件。すべて日本語
- 各インラインコメントは「【必須】/【提案】/【質問】のラベル → 指摘 → 理由 → 提案（あれば修正例）」の順で 3〜6 行。【必須】は直さないとバグや仕様違反になるもの、【提案】は好みや読みやすさで採否が作者の判断になるもの、【質問】は意図を確認したいもの。少なくとも 1 件は【提案】にする
- 投稿は次の 1 回の API 呼び出しで行う。`event` は必ず `COMMENT`（自分の PR には APPROVE / REQUEST_CHANGES はできない）
- `line` は `gh pr diff 2` に出てくる **変更後のファイルの行番号**（`+` の行、またはその変更ブロックの中の行）。`side` は `RIGHT`。差分に含まれない行にはコメントできない（422 エラーになる）
- JSON はリポジトリの外（`/tmp/review.json`）に書く。リポジトリにファイルを増やさない

```bash
cat > /tmp/review.json <<'JSON'
{
  "event": "COMMENT",
  "body": "（まとめ: 良い点を 1〜2 行、直してほしい点の要約、npm test の結果）",
  "comments": [
    { "path": "public/app.js", "line": 63, "side": "RIGHT", "body": "【提案】…\n理由: …\n提案: …" },
    { "path": "src/price.js", "line": 80, "side": "RIGHT", "body": "【質問】…" }
  ]
}
JSON
gh api -X POST repos/{owner}/{repo}/pulls/2/reviews --input /tmp/review.json --jq '.html_url'
```

## やってはいけないこと
- ファイルの変更、コミット、push、`gh pr review --approve` / `--request-changes`
- dev サーバーの起動

## 最後に
投稿した URL と、コメントの要約（1 件 1 行）を日本語で報告してください。422 エラーで投稿できなかったときは原因（行番号が差分にない、など）を直して再送し、それでも無理なら JSON の内容をそのままターミナルに出力してください。
