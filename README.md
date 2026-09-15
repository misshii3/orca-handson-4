# Orca ハンズオン 第4弾（ジュニアエンジニア向け・自習用）

[第1弾](https://github.com/misshii3/orca-handson) では同じバグ修正を Claude Code と Codex に競わせて PR を作り、
[第2弾](https://github.com/misshii3/orca-handson-2) では Issue を起点に 3 本のタスクを並列で進めてマージとコンフリクト解消まで通し、
[第3弾](https://github.com/misshii3/orca-handson-3) ではブラウザで画面を見ながら Design Mode でエージェントに見た目を直させました。

第4弾のテーマは **PR を出した後** です。Claude Code に小さな機能を実装させて **ドラフト PR** を出し、
PR から作った別のワークツリーの **Codex にレビューさせて GitHub にインラインコメントを投稿** させます。
Orca の PR パネルでレビュースレッドを読んで **採否を自分で決め**、採ったものだけ Claude Code に直させ、返信とリアクションを返します。
Ready for review にすると **CI が赤** になるので、**Fix broken checks** でエージェントに渡して直し、**auto-merge** で PR が自分でマージされるところまでを一人で通します。

> **この版は実機通し前の初版です。** 手順書の（要確認）が付いた UI 表記と、スクリーンショットは次回の検証で確定します。

## 前提

- [第1弾](https://github.com/misshii3/orca-handson)、[第2弾](https://github.com/misshii3/orca-handson-2)、[第3弾](https://github.com/misshii3/orca-handson-3) を終えていること（Orca のインストール、GitHub 連携、Issue からのワークツリー作成、PR パネルでのマージを知っている前提で書いています）
- macOS、Orca、Claude Code、Codex CLI、`gh`、Node.js 20 以上
- GitHub アカウント（Free で構いません。**public リポジトリを 1 つ作れること**。理由は下の「public で複製する理由」）

## 何を体験するか

![PR のライフサイクル。ドラフト PR → レビュー → Ready for review と auto-merge の予約 → changelog が赤 → Fix broken checks で直して push → 自動マージ。人間が押すのは採否、予約、push の 3 か所](images/diagrams/18_pr-lifecycle.svg)

| | 第1弾 | 第2弾 | 第3弾 | 第4弾 |
|---|---|---|---|---|
| タスク | 同じバグ修正を 2 つのエージェントで競争 | 別々の機能追加を 3 本並列 | 見た目の崩れ 4 か所の修正とクーポン入力欄の追加を 2 本並列 | **1 本の PR を、実装（Claude Code）とレビュー（Codex）で分担**。CI の赤と auto-merge まで |
| エージェントへの指示 | 指示文を貼る | Issue の URL が入力欄に入っている | ブラウザで要素をクリックしてメモを付け、送る | **レビューコメントを採否して渡す**、**Fix broken checks** で CI の失敗を渡す |
| 確認の仕方 | テストと差分 | テスト・差分・PR のチェック | ブラウザで見た目を確認 + 差分 | **レビュースレッド・CI のログ・差分** の 3 つを PR パネルで読む |
| 権限 | 手動 | Yolo（練習リポなので解禁） | Yolo | Yolo（同じ条件。終わったら戻す） |
| ゴール | PR を作るまで | マージ → コンフリクト解消 → Issue クローズ | 画面が直った状態で 2 本ともマージ | **必須チェックが通った瞬間に auto-merge で入る** → Issue クローズ → ブランチ自動削除 |

## 進め方（合計 約 100 分）

[01_handson.md](./01_handson.md) を上から順に進めてください。

| 区分 | 章 | 内容 | 目安 |
|---|---|---|---|
| 準備 | 1〜3 | ツールの確認、テンプレートから **public で** 複製、リポジトリの設定（auto-merge・必須チェック）と Issue の作成、Orca に追加して Yolo に切り替え | 20 分 |
| 本編 | 4〜8 | 実装してドラフト PR、PR から作ったワークツリーで Codex にレビューさせる、採否を決めて直し返信する、Ready にして auto-merge を予約、CI の赤を Fix broken checks で直して自動マージ | 75 分 |
| 後片付け | 9 | ワークツリー削除、Yolo を手動に戻す、pull して確認 | 5 分 |
| 付録 | A〜E | 役割を入れ替える、レビューの渡し方とワークツリーのメモ、ルールセットと auto-merge の中身、トラブルシューティング、業務での判断基準 | 任意 |

章ごとの作業場所（#1 のワークツリー、#2 のワークツリー、プライマリ）と、先に知っておきたい「つまずきやすいところ」は `01_handson.md` の 0 章にまとめてあります。
Orca の概念（worktree、ADE、権限の 3 層）は第1弾の [01_overview.md](https://github.com/misshii3/orca-handson/blob/main/01_overview.md) を、
Issue からのワークツリー作成・PR パネル・マージの操作は第2弾・第3弾の手順書を参照します。

## public で複製する理由

第1〜3弾は `--private` で複製しましたが、第4弾は **`--public`** で複製します。第4弾で使う **ドラフト PR** と **ルールセット（必須チェック）** は、GitHub Free ではパブリックリポジトリでしか使えないためです。
必須チェックが無いと **Enable auto-merge** も出ません（すぐマージできる PR には表示されない仕様です）。
中身はサンプルコードと Issue・PR の本文だけで、秘密の情報はありません。有料プラン（Pro / Team）なら private のままでも同じことができます。
`--private` で作ってしまったときは `gh repo edit --visibility public --accept-visibility-change-consequences` で切り替えられます。

## このリポジトリの使い方（参加者向け）

このリポジトリは **テンプレートリポジトリ** です。自分のアカウントに複製し、同梱のスクリプトでリポジトリの設定とタスク用の Issue を作ってから使います
（テンプレートから複製しても Issue とリポジトリの設定はコピーされないため、スクリプトで作ります）。
詳しい手順は `01_handson.md` の 2 章にありますが、要点だけ書くと次のコマンドです。

```bash
gh repo create orca-handson-4 --template misshii3/orca-handson-4 --public --clone   # 今回は public（ルールセットと auto-merge のため）
cd orca-handson-4
npm test                      # 30 件すべて成功するのが正常です
bash scripts/setup-repo.sh    # auto-merge・ブランチ自動削除・main の必須チェック（ルールセット）を設定します
bash scripts/seed-issues.sh   # 自分のリポジトリに Issue #1 を作ります（PR は #2 になります）
```

## ファイル構成

```
orca-handson-4/
├── README.md                    # このファイル
├── 01_handson.md                # ハンズオン手順（約 100 分）
├── LICENSE                      # MIT
├── CHANGELOG.md                 # 変更履歴（0.1.0〜0.3.0 は第1〜3弾の完了状態）
├── docs/
│   ├── CONTRIBUTING.md          # PR のルール（CI が確認する）
│   └── review-prompt.md         # Codex に貼るレビュアープロンプト（5 章で使う）
├── images/                      # スクリーンショット（次回の検証で追加）
│   └── diagrams/                # 図解（SVG）
├── issues/
│   ├── 01-show-free-shipping-hint.md            # 送料無料までの残額を表示する（Claude Code）
│   └── appendix/02-coupon-case-insensitive.md   # 付録 A 用（Codex が実装、Claude Code がレビュー）
├── scripts/
│   ├── setup-repo.sh            # gh で auto-merge、ブランチ自動削除、ルールセット main-required-checks（必須チェック test / changelog）を設定
│   ├── seed-issues.sh           # gh issue create で Issue #1 を作る（--appendix で付録 A の Issue。何度実行しても増えない）
│   ├── check-changelog.js       # CI の changelog ジョブの本体（npm run check:changelog でローカルでも実行できる）
│   └── dev-server.js            # 第3弾と同じ dev サーバー（第4弾の本編では使いません）
├── public/                      # 注文確認ページ（第3弾の完成状態: 崩れ 4 か所の修正 + クーポン入力欄）
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .github/workflows/ci.yml     # ジョブ test（npm test）と changelog（check-changelog.js）。PR と main への push で実行
├── package.json                 # npm test / npm run dev / npm run check:changelog の定義。依存パッケージなし
├── src/
│   ├── price.js                 # 税込・割引・送料・クーポン
│   └── date.js                  # 日付フォーマット（formatDate、formatDateJa）
└── test/
    ├── price.test.js
    ├── date.test.js
    ├── dev-server.test.js
    └── check-changelog.test.js  # check-changelog.js の部品のテスト
```

## サンプルアプリについて

第3弾の 2 本の PR（見た目の崩れ 4 か所の修正、クーポン入力欄の追加）が **すべてマージされた状態** が初期状態です。`npm test` は 30 件すべて成功します（第3弾の 26 件 + `check-changelog.js` のテスト 4 件）。

第4弾のタスク（Issue #1）は「送料無料まであと N 円」を注文確認ページに表示する、純粋関数 1 つ + テスト 4 例 + 表示 1 行の **わざと小さい機能追加** です。主役は PR を出した後の往復（レビュー、CI、マージ）で、機能そのものではありません。

CI（GitHub Actions）はジョブが 2 つあります。`test` は `npm test` を実行し、`changelog` はこのリポジトリの PR のルールが守られているかを確認します。ルールの中身と、それが赤になる理由は手順書の 7 章で体験します。

- ページを見たいときは `npm run dev` で dev サーバーを起こして `http://localhost:3000` を開きます（`public/index.html` を直接開くと `src/` の ES module を読み込めません）。第4弾の本編では dev サーバーは使いません
- 依存パッケージはありません。Node.js 20 以上で `npm test` と `npm run dev` が動きます

## 動作確認環境

- macOS（Apple Silicon）
- Orca 1.4.201（日本語 UI）
- Claude Code 2.1.x / Codex CLI 0.15x
- gh 2.8x / Node.js 22

この版は実機通し前の初版です。Orca は更新頻度が高く、画面の表記が変わることがあります。手順と画面が合わないときは
[公式ドキュメント](https://www.onorca.dev/docs) を確認してください。

## ライセンス

MIT（[LICENSE](./LICENSE)）
