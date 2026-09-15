# Orca ハンズオン 第4弾 — PR を出した後: レビューコメントと CI の赤に応えて、自動マージまで

所要時間の目安: 約 100 分（エージェントと GitHub Actions の待ち時間を含む）
確認環境: macOS（Apple Silicon）、Orca 1.4.201（日本語 UI）、Claude Code 2.1.272、Codex CLI 0.154、gh 2.83、Node.js 22

[第1弾](https://github.com/misshii3/orca-handson)、[第2弾](https://github.com/misshii3/orca-handson-2)、[第3弾](https://github.com/misshii3/orca-handson-3) を終えている前提で書いています。ワークツリーの作り方（第3弾 4-1）、差分の読み方、コミット → 公開 → PR → チェック → マージの 5 手（第3弾 9-2）、`Closes #N`（第2弾 6-2）は該当章を示すだけにします。第4弾で初めて出てくる操作（ドラフト PR、PR からのワークツリー、レビュースレッドへの返信とリアクション、auto-merge、Fix broken checks）だけを丁寧に書きます。

Orca は更新が速く、ボタンの文言や配置が変わることがあります。画面と食い違ったら、主要な用語に（ ）で併記した英語ドキュメントの呼び方を手がかりに [公式ドキュメント](https://www.onorca.dev/docs) を探してください。

> **スクリーンショットについて**: 画像は検証用に `orca-handson-4-test` という名前で複製したリポジトリで撮影しています（Orca 1.4.201、2026 年 9 月）。あなたの画面では `orca-handson-4` と読み替えてください。サイドバーに別のプロジェクトが写っていることがあります。
>
> **キー表記**: ⌘ = command、⇧ = shift、⌥ = option、↩ = Enter（return）、⌫ = delete

---

## 0. このハンズオンのゴール

終わったときに、次のことが一人でできるようになっているのがゴールです。

- PR を **ドラフト** で出し、レビューが済んでから **Ready for review** にできる
- 別のワークツリーで **エージェントに PR をレビューさせ**、GitHub に **インラインコメント** として投稿させられる
- Orca の PR パネルで **レビュースレッドを読み、採否を自分で決め**、採ったものだけをエージェントに直させ、**返信とリアクション** で結果を返せる
- **必須チェックと auto-merge** の関係を理解し、チェックが通る前に予約した auto-merge が、チェックが通った瞬間に PR をマージするのを見届けられる
- **CI の赤** を PR パネルのログで読み、エージェントに渡して直させ、Orca の「修正」（Fix broken checks）が何を送るのかを説明できる
- 「PR を出した後」に人間が押すボタンが **どこに残るか**（採否、auto-merge の予約、push）を説明できる

### 全体の流れ

![第4弾のロードマップ。準備（1〜3 章）、本編（4〜9 章）、付録の順に進む](images/diagrams/21_handson4-roadmap.svg)

章ごとの「どこで・何をするか」は次のとおりです。今どこにいるか分からなくなったら、ここに戻ってください。

| 章 | どこで作業するか | やること | 目安 |
|---|---|---|---|
| 1〜3 | ターミナルと Orca の設定 | ツールの確認、テンプレートから **public で** 複製、`setup-repo.sh` でルールセットと auto-merge を設定、Issue #1 を作成、Orca にプロジェクトを追加して Yolo に切り替え | 20 分 |
| 4 | #1 のワークツリー（Claude Code） | Issue #1 からワークツリーを作り、実装させ、差分を読んで `Closes #1` でコミット、公開、**ドラフト PR #2** を作る | 15 分 |
| 5 | #2 のワークツリー（Codex、**PR から作る**） | PR #2 からワークツリーを作り、Codex にレビューさせて GitHub に **インラインコメント** を投稿させる | 15 分 |
| 6 | #1 の PR パネルと Claude Code | レビュースレッドを読み、採否を決め、採ったものだけ Claude Code に直させ、差分を読んで push、各スレッドに **返信とリアクション** | 15 分 |
| 7 | #1 の PR パネル | **Mark ready for review** → **自動マージを有効にする**（予約）→ `test` 緑・`changelog` **赤** → ログを読む → CONTRIBUTING を初めて開く | 15 分 |
| 8 | #1 の PR パネルと Claude Code | CI の失敗を Claude Code に渡す（「**修正**」= Fix broken checks の中身を知る）→ CHANGELOG の 1 行を読んで push → 何も押さずに待つ → **PR が自分でマージ** → Issue #1 クローズ → ブランチ自動削除 | 15 分 |
| 9 | プライマリ | ワークツリー 2 本の削除、Yolo を手動に戻す、pull して `npm test`、Issue とルールセットの確認 | 5 分 |

本編で体験するのは、**PR を出してから main に入るまで** の往復です。**エージェントがレビューを書く → あなたが採否を決める → エージェントが直す → あなたが読んで push する → CI が守る → 予約した auto-merge が入れる。** 人間が押すのは「採否」「auto-merge の予約」「push」の 3 か所だけです。

![PR のライフサイクル。ドラフト PR（4 章）→ レビュー（5〜6 章）→ Ready for review と auto-merge の予約（7 章）→ changelog が赤（7 章）→ Fix broken checks で直して push（8 章）→ 自動マージ（8 章）。人間が押すのは採否、予約、push の 3 か所。灰色の分岐は第2弾の手動マージ](images/diagrams/18_pr-lifecycle.svg)

### 第1弾〜第3弾との違い

| | 第1弾 | 第2弾 | 第3弾 | 第4弾 |
|---|---|---|---|---|
| タスク | 同じバグ修正を Claude Code と Codex で競争 | 別々の機能追加を 3 本並列 | 見た目の崩れ 4 か所（Claude Code）とクーポン入力欄（Codex）を 2 本並列 | **1 本の PR を、実装（Claude Code）とレビュー（Codex）で分担**。CI の赤と auto-merge まで |
| エージェントへの指示 | 指示文を貼る | Issue の URL が入力欄に入っている | ブラウザで要素をクリックし、メモを付けて送る | **レビューコメントを採否して渡す**、**CI の失敗（チェック名とログのリンク）を渡す** |
| 確認の仕方 | `npm test` と差分 | テスト・差分・PR のチェック | ブラウザで見た目を確認 + 差分 | **レビュースレッド・CI のログ・差分** の 3 つを PR パネルで読む |
| 権限 | 手動 | Yolo | Yolo | Yolo（同じ 4 条件。9 章で手動に戻す） |
| ゴール | PR を作るまで | マージ → コンフリクト解消 → Issue クローズ | 画面が直った状態で 2 本ともマージ | **必須チェックが通った瞬間に auto-merge で入る** → Issue クローズ → ブランチ自動削除 |

### 用語（先に押さえておく）

| 用語 | 意味 |
|---|---|
| ドラフト PR（Draft pull request） | 「まだマージしないでほしい」印の付いた PR。マージボタンが出ず、レビューは受けられます。**Ready for review**（レビュー準備完了）に切り替えると普通の PR になります。GitHub Free では **public リポジトリだけ** で使えます（2-1 で public にする理由の 1 つ） |
| レビューコメント / レビュースレッド（Review thread） | PR の差分の **特定の行** に付くコメント（インラインコメント）と、そこから続く返信の束。PR 全体へのコメント（会話）とは別物です。5 章で Codex が付け、6 章であなたが読みます |
| リアクション（Reaction） | コメントに付ける絵文字（GitHub の 8 種: 👍 👎 😄 🎉 😕 ❤️ 🚀 👀）。返信を書かずに「読んだ・採用した」を伝えます。本書では 👍 = 採用、😕 = 見送り（理由は返信に書く） |
| ルールセット（Ruleset） | GitHub 側で「`main` に入れる条件」を決める仕組み。2 章の `setup-repo.sh` が `main-required-checks` という名前で「**必須チェック `test` と `changelog` が通っていること**」（+ ブランチ削除と force push の禁止）を作ります。GitHub Free では public リポジトリだけで使えます |
| 必須チェック（Required status check） | ルールセットで「通っていないとマージできない」と決めたチェック名。名前は GitHub Actions の **ジョブ名**（`test`、`changelog`）と一致していないと効きません |
| auto-merge（自動マージ） | 「条件がそろったら GitHub が勝手にマージしてよい」と PR ごとに **予約** する機能。**必須チェックが通っておらず、今はマージできない PR**（保留中でも失敗中でも）に予約できます。すべて成功している PR には普通のマージボタンが出るだけです。Orca の PR パネルでは「**自動マージを有効にする**」というボタンです。7 章で予約し、8 章で発動を見ます |
| Fix broken checks（「修正」） | PR パネルに赤いチェックがあるとき、「1 チェックに失敗しました」の右に出る Orca の「**修正**」ボタン。新しいタブで Agent を起こし、失敗したチェックを直させます。8 章では、同じ中身（**失敗したチェック名とログへのリンク**）を今動いている Claude Code に自分で渡します |
| CHANGELOG.md | 変更履歴。このリポジトリでは「`## 未リリース` の下に、PR ごとに 1 行、行末に **Issue 番号** を `(#1)` の形で付けて足す」ルールです（何が足りないかは 7 章で CI が教えてくれます） |
| CONTRIBUTING.md | 「このリポジトリに PR を出すときのルール」を書いたファイル。このリポジトリでは `docs/CONTRIBUTING.md` にあります（GitHub はルート・`docs/`・`.github/` のどこにあっても認識します）。7 章で読みます |
| ブランチの自動削除（Automatically delete head branches） | マージされた PR のブランチをリモートから自動で消すリポジトリ設定。`setup-repo.sh` が有効にします。8 章の最後に確認 |
| PR パネル / ソース管理 | 第2弾と同じ。右パネル上部の 3 番目（ソース管理 ⌘⇧G）と 4 番目（チェック）のアイコン。ソース管理の一覧の見出しは「**変更点**」（Changes）、「**ステージ済みの変更**」、「**コミット先のブランチ**」 |

Issue と PR は **番号を共有** します。今回は Issue が **#1 だけ** なので、PR は **#2** になります。本書は PR を #2 と書きます。番号が違ったら読み替えてください。

### つまずきやすいところ（先に 3 つだけ）

本編でよく起きる迷い方です。どれも付録 D に直し方がありますが、先に知っておくと避けられます。

1. **複製は `--public`**（2-1）。private で `setup-repo.sh` を打つとルールセットが作れず、7〜8 章（必須チェック、auto-merge）が成り立ちません。エラー文にそのまま直し方が出ます
2. **push と auto-merge は、あなたが押す**。エージェントには毎回「コミットも push もしない」と言い、差分を読んでから push します（4-3、6-3、8-3）。7-2 で auto-merge を予約した後は、**push した瞬間に `main` に入る道が開いています**。8-1 で Claude Code にもう一度「push しない」と言うのはこのためです
3. **2 本目のワークツリー（Codex）はレビュー専用**。ファイルは直させません。直すのは #1 の Claude Code だけです。同じ PR を 2 か所から直すと、push が競合します（5-2）

---

## 1. 前提チェック（5 分）

第1〜3弾の準備の章が済んでいる（Orca がインストール済みで、「連携」の GitHub が Connected、Issue からワークツリーを作った経験がある）ことを前提にします。ターミナルで次を確認してください。

```bash
claude --version      # 2.x
codex --version       # codex-cli 0.15x
node --version        # v20 以上
gh auth status        # "Logged in to github.com account <あなたのID>" が出れば OK。Token scopes に repo が含まれていること
```

`gh auth status` の `Token scopes` に `repo` が無いときは `gh auth refresh -s repo` で足しておきます（2-2 のルールセット作成に必要です）。

Orca も起動しておきます。バージョンは、メニューバーの **Orca → Orca について**（About Orca）で確認できます。1.4.201 前後なら本書の表記と合うはずです。

✅ **ここまでできたら**: 4 つのコマンドが全部エラーなく終わり、Orca が起動している。

---

## 2. サンプルリポジトリを public で複製して、ルールを入れ、Issue を作る（10 分）

### 2-1. テンプレートから public で複製する

```bash
cd ~/Documents
gh repo create orca-handson-4 --template misshii3/orca-handson-4 --public --clone
cd orca-handson-4
npm test
```

`npm test` は **30 件すべて成功** します（第3弾の完成状態 26 件 + 今回足したチェックスクリプトのテスト 4 件）。

```
ℹ tests 30
ℹ suites 10
ℹ pass 30
ℹ fail 0
```

このリポジトリは、第3弾の 2 本の PR（見た目の崩れ 4 か所の修正と、クーポン入力欄）がマージされた状態から始まります。`npm run dev` で完成した注文確認ページを見ておいても構いません（見たら `Ctrl+C`。第4弾では dev サーバーは使いません）。

> **なぜ public か**: 第1〜3弾は `--private` でした。第4弾で使う **ドラフト PR** と **ルールセット（必須チェック）** は、GitHub Free では public リポジトリでしか使えません。必須チェックが無いと **自動マージを有効にする**（Enable auto-merge）も出ません（すぐマージできる PR には表示されない仕様です）。練習用に複製したばかりで秘密の情報はないので public にします。有料プラン（Pro / Team）なら private でも同じことができます。詳細は付録 C。

> **`--private` で作ってしまったら**: `gh repo edit --visibility public --accept-visibility-change-consequences` で切り替えてから 2-2 へ進みます。

### 2-2. リポジトリにルールを入れる（`setup-repo.sh`）

```bash
bash scripts/setup-repo.sh
```

```
対象リポジトリ: <あなたのID>/orca-handson-4（PUBLIC）

1/3 自動マージと、マージ後のブランチ自動削除を有効にします
  完了

2/3 main の ruleset「main-required-checks」を作ります
  作成しました

3/3 設定の確認
  自動マージ: true   マージ後にブランチ削除: true
3 rules apply to branch main in repo <あなたのID>/orca-handson-4

- deletion
  (configured in ruleset 23446429 from repository <あなたのID>/orca-handson-4)

- non_fast_forward
  (configured in ruleset 23446429 from repository <あなたのID>/orca-handson-4)

- required_status_checks: [do_not_enforce_on_create: false] [required_status_checks: [map[context:test integration_id:15368] map[context:changelog integration_id:15368]]] [strict_required_status_checks_policy: false]
  (configured in ruleset 23446429 from repository <あなたのID>/orca-handson-4)
```

最後の 3 ブロックが `gh ruleset check main` の出力です（ruleset の id はあなたの環境で違います）。

やったことは 3 つです。

1. **自動マージ（auto-merge）を許可**した。PR ごとの予約は 7 章で押します
2. **マージ後にブランチを自動削除**する設定にした。8 章の最後に確認します
3. `main` に **ルールセット `main-required-checks`** を作った。必須チェックは `test` と `changelog`（`.github/workflows/ci.yml` のジョブ名）。あわせて `main` の削除と force push を禁止しています

もう一度実行しても増えません（`2/3` が「すでにあります（id: …）」になります）。

> **`{owner}/{repo}` はそのまま打ちます**: 本書の `gh api` の例に出てくる `repos/{owner}/{repo}/...` は、`gh` が今いるリポジトリの名前に置き換えてくれる書き方です。6 章で Claude Code にも同じ書き方で頼みます。

### 2-3. タスク用の Issue を 1 件作る

```bash
bash scripts/seed-issues.sh
```

```
対象リポジトリ: <あなたのID>/orca-handson-4

作成しました: 送料無料までの残額を注文確認ページに表示する（「あと 30 円で送料無料になります」）
  https://github.com/<あなたのID>/orca-handson-4/issues/1

現在の Issue:
（gh issue list の出力。#1 が 1 件）
```

今回の Issue は 1 件だけです（付録 A で 2 件目を作ります）。

### 2-4. Issue を読む

```bash
gh issue view 1
```

内容は「送料無料まであといくらか」を注文確認ページに出す、小さな機能追加です。

- `src/price.js` の `calcShipping` の直後に、純粋関数 `remainingForFreeShipping(total)` を足す。既存の定数 `FREE_SHIPPING_THRESHOLD` を使う
- `test/price.test.js` に 4 例（0 → 3000、2970 → 30、3000 → 0、8000 → 0）のテストを足す
- `public/index.html` の `<!-- Issue #1: 送料無料までの残額の表示はここに追加する -->` の位置に `<p class="shipping-hint" id="shipping-hint" hidden></p>` を足し、`public/app.js` の `renderSummary` で「あと 30 円で送料無料になります」を表示する。残額 0 円なら非表示
- 具体例: `WELCOME10`（初期状態）→ あと 30 円、`SAVE500` → あと 200 円、`ABC`（無効）→ 非表示

受け入れ条件には、`npm test` が **30 → 34 件**、変更するファイルは **5 つだけ**、dev サーバーを触らない、**コミット・push・PR 作成はしない**（参加者が Orca から行う）、日本語で報告する、とあります。機能はわざと小さくしてあります。第4弾の主役は **PR を出した後の往復** だからです。

✅ **ここまでできたら**: `npm test` が 30 件成功、`gh repo view --json visibility` が `PUBLIC`、`gh ruleset check main` に `main-required-checks` が出る、`gh issue list` に #1 だけが出ている。

---

## 3. Orca にプロジェクトを追加して、Yolo に切り替える（5 分）

### 3-1. プロジェクトを追加する

第3弾 3-1 と同じです。サイドバーの「プロジェクト」右の **+**（プロジェクトを追加）から `~/Documents/orca-handson-4` を選びます。サイドバーに `orca-handson-4` と `main ［プライマリ］` が出ます。「**セットアップスクリプトを追加する**」のポップアップは **×** で閉じて構いません（依存パッケージはありません）。

### 3-2. 「Agent の権限」を Yolo にする

第3弾 3-2 と同じく、練習リポなので Yolo を使います。理由と条件は第2弾の付録 C にまとめてあります。第4弾でも同じ 4 条件がそろっているか、いま一度確認してください。

- [ ] リポジトリが使い捨てで、認証情報や個人情報が含まれていない（複製したばかりの `orca-handson-4`。public です）
- [ ] エージェントが取り消せない操作をしても困らない
- [ ] 社内コードやプロンプトを外部 LLM に送ることが組織のルールで許されている
- [ ] 出てきた差分を全部読む時間がある（4-2、6-3、8-3）

**設定（⌘,）→ Agent → 「Agent の権限」を「Yolo」** にします。「インストール済み」の欄で、Claude の起動コマンドに `--dangerously-skip-permissions`、Codex に `--dangerously-bypass-approvals-and-sandbox` が付いたことを確認します。

> **9 章で必ず手動に戻します。** 業務のリポジトリで Yolo のまま作業しないようにするための習慣です。

✅ **ここまでできたら**: サイドバーに `orca-handson-4` があり、「Agent の権限」が Yolo になっている。

---

## 4. Issue #1 から実装して、ドラフト PR を出す（15 分）

> 4〜8 章が本編です。4 章は第3弾 4-1 と 9-2 の復習に、**ドラフト** が 1 つ加わるだけです。

### 4-1. #1 のワークツリー（Claude Code）

サイドバーで `orca-handson-4` を選んで **⌘N**。第3弾 4-1 と同じダイアログです。

| 項目 | 入れる値 |
|---|---|
| プロジェクト | `orca-handson-4` になっているか確認 |
| 実行先 | `Local Mac` のまま |
| タブ | 「**GitHub**」に切り替える |
| 選ぶ Issue | **#1 送料無料までの残額を注文確認ページに表示する** |
| Agent | **Claude** |

「**詳細設定**」を開き、**名前** に `issue-1` と入れます。1.4.201 は Issue のタイトルから名前を自動で入れますが、今回のタイトルでは「30」（「あと 30 円」の数字）になってしまうためです。ブランチは `<あなたのID>/issue-1` になります。「**ワークツリーを作成する ⌘↩**」を押すと Claude Code が起動し、初回は「Quick safety check」が出ます。**既定の選択が「No, exit」** なので、↓ で **Yes, I trust this folder** を選んで ↩（Claude Code 2.1.272）。「セットアップスクリプトを追加する」のポップアップが出たら × で閉じます（3-1）。

入力欄に Issue の URL が入っています（上に「Pre-filled prompt · review before pressing Enter」と出ます）。その **後ろに** 次の一文を足して ↩。

```
この Issue を読んで実装してください。npm test が通ったら、コミットも push もせずに、何をどう実装したか日本語で報告してください。差分は私が読んでコミットします。
```

参考値: **約 2 分**（実測 1 分 59 秒）。待っている間に次を読んでください。

> **この後の合言葉**: 第4弾では、エージェントへの指示の最後に毎回「コミットも push もしない」を付けます。理由は 7 章で分かります。auto-merge を予約した PR では、**push した瞬間に `main` に入る道が開く** からです。第2弾・第3弾でも人間がコミットしてきましたが、今回はそれが最後の関門になります。

![Claude Code の実装報告。npm test が 30 件から 34 件になり、コミットも push もしていないと書いてある。変更した 5 ファイルの説明と、クーポンごとの表示の検算表、CHANGELOG は触っていないという補足が続く](images/01_claude_report_shipping_hint.png)

### 4-2. 差分を読む

右パネルの **ソース管理（⌘⇧G）** → 「**変更点 5**」に 5 ファイルが出ています（ブランチ行の右に `+60 -3` のような行数も出ます）。ファイル名をクリックすると中央に `price.js (diff)` のタブが開くので、差分を読みます。

- [ ] `src/price.js`: 既存の定数はそのまま。`remainingForFreeShipping` が **`calcShipping` の直後に 1 つ** 増えただけ。`FREE_SHIPPING_THRESHOLD` を使い、`3000` をそのまま書いていない。JSDoc が日本語
- [ ] `test/price.test.js`: Issue の 4 例（0 → 3000、2970 → 30、**ちょうど 3,000 → 0**、8000 → 0）がある
- [ ] `public/index.html`: マーカーコメントの位置に `<p class="shipping-hint" id="shipping-hint" hidden>` が 1 つ増えただけ
- [ ] `public/app.js`: `renderSummary` に表示の数行が足され、既存の関数の振る舞いが変わっていない。金額に既存の `yen()` を使い、0 円のときは空にして `hidden`
- [ ] `public/style.css`: 追加は末尾の `.shipping-hint` だけ
- [ ] 上の 5 ファイル以外に「ついで」の修正がない

![中央に price.js の差分。calcShipping の直後に remainingForFreeShipping が 1 つ追加されている。右のソース管理パネルには変更点 5 として app.js、index.html、style.css、price.js、price.test.js が並ぶ](images/02_changes_shipping_hint_diff.png)

タブバーの **+ → 新規ターミナル ⌘T** で `npm test`。**30 → 34 件** になっています。 画面でも見たければ、同じターミナルで `npm run dev` → 普段のブラウザで `http://localhost:3000` を開くと「あと 30 円で送料無料になります」が出ています（見たら `Ctrl+C`。以降は使いません）。

### 4-3. コミット → 公開 → ドラフト PR

第3弾 9-2 の 5 手のうち、前半 3 手です。

1. 「**ステージオール**」→ 一覧が「ステージ済みの変更 5」になり、ボタンが「**Commit**」に変わります。「メッセージ」欄の右端の AI アイコン（AIでコミットメッセージを生成）で文面を作らせ（30〜60 秒。英語のことも日本語のこともあります）、読んで直し、末尾に改行して **`Closes #1`** を足して「**Commit**」（第2弾 6-2）
2. 「**ブランチを公開**」。push されると、パネルが「**新規 PR**」のフォームに切り替わります
3. **第4弾で新しいのはここ** です。1.4.201 では PR の内容を別ダイアログではなく **パネルの中のフォーム** で決めます（フォームが出ていなければ、パネル上部の「PR を作成」を押します）

| 項目 | 入れる値 |
|---|---|
| 「新規 PR」右上の **生成**（AI を使用して PR の詳細を生成する） | 押す。初回は「ホストされたレビューの詳細を生成する」ダイアログ（Agent = Claude、コマンドテンプレート `{basePrompt}`）が出るので **Generate**。20 秒ほどでタイトルと説明が入ります |
| PR タイトル | `送料無料までの残額を表示する`（生成は Issue のタイトルをそのまま入れるので、短く書き換えます） |
| 説明 | 生成された文面（Problem / Solution）を読み、末尾に `Fixes #1` か `Closes #1` が無ければ足す |
| Base branch | `main` のまま（`from <あなたのID>/issue-1`） |
| **下書きとして作成**（Create as draft） | **チェックを入れる**。ボタンが「**ドラフト PR を作成する**」に変わります |

> **AI の生成が「Generation timed out after 60s.」で終わったら**: もう一度 AI アイコンを押します（実機では 2 回目に 45 秒で生成できました）。急ぐなら自分で書いて構いません。

![ソース管理パネルの中の新規 PR フォーム。PR タイトル、生成された説明、Base branch が main、下書きとして作成にチェックが入り、ボタンがドラフト PR を作成するになっている](images/03_pr_create_dialog_draft_toggle.png)

4. 「ドラフト PR を作成する」を押すと右パネルが PR パネルに切り替わり、**#2** と **DRAFT** のバッジが出ます。マージボタンの代わりに「**Mark ready for review**」のボタンがあります（7 章で押します。**マージボタンが無い** のがドラフトの印です）。チェックの欄は「1 保留中」で `test` が Queued。更新アイコンを押すと「2 合格」になり、`test` が Successful、`changelog` は **Skipped**（灰色の −）と出ます（参考値 **約 20 秒**。`test` は 7 秒で終わります）

> **ドラフトのうちは `changelog` のチェックは走らない設定にしてあります**（`.github/workflows/ci.yml` の `if`）。`test` は走ります。「コードのテストはいつでも、マージ直前のルールは Ready になってから」という、このリポジトリの流儀です。GitHub の既定ではドラフトでもすべて走ります。7 章で Ready にした瞬間に `changelog` が走ります。

![PR パネル。#2 と DRAFT のバッジ、Mark ready for review のボタン、2 合格として test が Successful、changelog が Skipped](images/04_pr_panel_draft.png)

![Source Control パネルのボタンと git の段階の対応。変更点 → ステージオール → Commit → ブランチを公開 → PR を作成 → PR が OPEN。下段は作業ツリー、インデックス、ローカルコミット、origin、Pull Request](images/diagrams/03_source-control-flow.svg)

✅ **ここまでできたら**: PR #2 が **DRAFT** で OPEN、コミットメッセージに `Closes #1`、PR パネルに「Mark ready for review」が出ていて（マージボタンは無い）、`test` が緑、`changelog` が Skipped。

---

## 5. PR から 2 本目のワークツリーを作り、Codex にレビューさせる（15 分）

### 5-1. PR からワークツリーを作る

サイドバーで `orca-handson-4` を選んで **⌘N** → タブ「**GitHub**」。検索欄のプレースホルダは「GitHub PR と Issue を検索」で、候補には **PR と Issue が同じ一覧** に並びます（PR はマージのアイコン、Issue は丸いアイコン。出ないときは `#2` と打つか、ダイアログを閉じて開き直す）。**#2 送料無料までの残額を表示する** を選び、Agent を **Codex** にします。「**詳細設定**」を開くと、PR から作るときは名前欄が空なので **`review-pr-2`** と入れます。「注記」の欄には「PR #2 — 送料無料までの残額を表示する」が自動で入っています（付録 B-2 で見るワークツリーのメモです）。ブランチ名の欄は出ません。PR に紐づくブランチを Orca が解決します。

![ワークツリーを作成するダイアログ。プロジェクトは orca-handson-4-test、GitHub タブで #2 送料無料までの残額を表示する を選択、Agent は Codex、詳細設定の名前に review-pr-2、注記に PR #2 のタイトルが入っている](images/05_create_dialog_github_tab_pr_list.png)

> **同じブランチの衝突は起きません**: #1 のワークツリーが `<あなたのID>/issue-1` を checkout 済みなので、git は同じブランチを 2 か所で checkout できません。Orca は **`<あなたのID>/issue-1-2`** という別名のローカルブランチを切り、PR の先頭コミットを開きます（追跡先は `origin/<あなたのID>/issue-1`）。フォルダ名も `review-pr-2-2` のように `-2` が付きます。サイドバーのカードには `review-pr-2` と `<あなたのID>/issue-1-2` が出ます。レビュアープロンプトの 1 行目が HEAD と PR の先頭を照合するので、どの状態でもレビューは成り立ちます。

Codex の入力欄（`»`）に **PR のタイトルと URL の 2 行** が入っています。その後ろに、リポジトリの `docs/review-prompt.md` の `---` より下を **そのまま** 貼って ↩（貼ると「[Pasted Content 1930 chars]」と 1 行にまとまります）。全文は次のとおりです。

````
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
````

参考値: **約 3 分**（実測 3 分 10 秒）。Codex が `gh pr diff` で差分を読み、`npm test` を回し、JSON を組んで `gh api` で投稿します。実機では、コメントを付ける前に行番号が差分に含まれるかを自分で確かめてから投稿し、422 は出ませんでした。

### 5-2. なぜ「レビュー専用」なのか

> **Codex には直させません**（つまずき 3）。Codex が直すと、#1 の Claude Code と同じ PR を 2 か所から書き換えることになり、push が競合します。レビュアーは **読む・コメントを書く** だけ。業務でも「レビュアーが勝手にコミットしない」のと同じです。直すのは 6 章で、#1 のワークツリーの Claude Code です。

![レビューコメントの往復。左が issue-1 ワークツリーの Claude Code、中央が GitHub の PR #2、右が review-pr-2 ワークツリーの Codex。Codex が gh pr diff で読み、gh api でインラインコメントを投稿する。人間が Orca の PR パネルでスレッドを読んで採否を決め、Claude Code に伝えて直させ、差分を読んで push し、返信とリアクションを返す。Codex はファイルを直さず、コミットと push は人間が行う](images/diagrams/19_review-roundtrip.svg)

### 5-3. 投稿されたことを確かめる

Codex の報告を読みます。投稿した URL と、コメントの一覧（ファイル・行・要旨）が出ているはずです。

![Codex の報告。GitHub にレビューを投稿した URL と、必須 1 件と提案 2 件のコメントの要約が 1 行ずつ並ぶ](images/06_codex_review_posted_report.png)

ターミナル（プライマリでも #2 のワークツリーでも可）で GitHub 側を確認します。

```bash
gh api repos/{owner}/{repo}/pulls/2/comments --jq '.[] | "\(.path):\(.line)  \(.body | split("\n")[0])"'
```

```
public/index.html:40  【必須】クーポン変更で更新される残額を、支援技術にも通知するようにしてください。
test/price.test.js:93  【提案】送料無料の直前である2,999円の例も追加すると、境界の意図がより明確になります。
public/app.js:77  【提案】クーポンを続けて付け替えたときの文言と hidden を確認するテストもあると、表示の回帰を検出できます。
```

2〜4 行出れば OK です（上は実機での例。中身は毎回変わります。【質問】が無いこともあります）。普段のブラウザで PR #2 の **Files changed** を開くと、差分の行にコメントが付いています。

![GitHub の Files changed。public/app.js の差分の 77 行目の下に、提案のラベルで始まる Codex のインラインコメントが付いている](images/07_github_files_changed_inline_comments.png)

> **Codex が「差分に無い行」を指定して 422 になったら**: プロンプトに書いてあるので Codex が自分でやり直します。それでも投稿できないときは付録 D（`gh pr review 2 --comment --body "…"` で PR 全体へのコメントに切り替える）。

✅ **ここまでできたら**: PR #2 に Codex のレビューコメントが 2〜4 件付き、それぞれ【必須】【提案】【質問】のどれかで始まっている。Codex のワークツリーの「変更点」は **空**。

---

## 6. レビューを読み、採否を決め、Claude Code に直させ、返事を返す（15 分）

### 6-1. PR パネルでレビュースレッドを読む

サイドバーで `issue-1` を選び、右パネル 4 番目（チェック）→ PR 番号右の **更新アイコン**。チェック欄の下の「**コメント**」セクション（英語ドキュメント: review threads）に、「**レビュー待ち · 3**」の見出しでスレッドが並びます（新しいものが上。一番下が Codex のまとめコメント）。各スレッドには **ファイル名:行**（`app.js:L77` など）、本文、下に 😊+（リアクション）があります。見出しの右の「全て / 人間 / ボット」は投稿者のフィルタです。スレッドをクリックしても差分には飛びません。GitHub 上で見たいときは、スレッド右上の「…」→「**コメントに移動**」で普段のブラウザが開きます。

![PR パネルのコメント欄。全て 4、人間 4、ボット 0 のフィルタと、レビュー待ち 3 の見出し。app.js:L77 と price.test.js:L93 のスレッドに提案のラベルで始まる本文と、下にリアクションのアイコンがある](images/08_pr_panel_review_threads.png)

### 6-2. 採否を決める（あなたの仕事）

| 種類 | 決め方 | 返し方（6-4） |
|---|---|---|
| 【必須】 | 原則採用。Issue と照らして本当に必須か確認する | 直して 👍 +「対応しました」 |
| 【提案】 | **採否はあなたが決める**。Issue の範囲を超える、好みの問題、今回は見送る、など理由を言えるなら見送ってよい | 採用なら 👍、見送りなら 😕 + 理由を返信 |
| 【質問】 | コードは変えない。意図を返信で答える | 返信のみ |

> **全部受け入れない**: レビューは提案であって命令ではありません（エージェントのレビューは特に）。見送るときは理由を書きます。これが付録 E の 1 つ目です。実機では【必須】1 件（`role="status"` で支援技術に通知）、【提案】2 件（2,999 円の境界テスト、クーポン付け替えの DOM テスト）で【質問】は無し。【必須】と境界テストを採用し、DOM テストは「テスト基盤が無く Issue の範囲外」として見送りました。

### 6-3. 採ったものだけ Claude Code に直させる

`issue-1` の Claude Code のタブで、次を埋めて送ります。`<…>` はあなたの採否で書き換えてください。

```
PR #2 にレビューコメントが付きました。次の 2 つで全部読んでください。
  gh api repos/{owner}/{repo}/pulls/2/reviews --jq '.[] | {user: .user.login, state, body}'
  gh api repos/{owner}/{repo}/pulls/2/comments --jq '.[] | {id, path, line, body}'
対応するもの: <public/index.html:40 の【必須】role="status" の追加（最小限に）>、<test/price.test.js:93 の【提案】2,999 円の境界テスト>
対応しないもの: <public/app.js:77 の【提案】クーポン付け替えの DOM テスト（理由: テスト基盤が無く Issue #1 の範囲外）>
【質問】には私が返信するので、コードは変えないでください。
対応したら npm test を通し、コミットも push もせずに、何を変えたか日本語で 1 件 1 行で報告してください。
```

参考値: **約 1 分**（実測 42 秒）。【質問】が無ければ、Claude Code は「【質問】のコメントはありませんでした」と報告してきます。

![Claude Code のターミナル。採否を書いた指示の下で、gh api でコメントを読み、index.html に role=status を足す差分と price.test.js に 2999 円のテストを足す差分を表示し、変更したもの、対応しなかったもの、補足に分けて報告している](images/09_claude_reading_review_comments.png)

差分を読みます（ソース管理 → 「変更点」）。

- [ ] 採用した指摘 **だけ** が直っている（見送ったものが直っていない）
- [ ] テストが増えた分だけ `test/price.test.js` が変わっている
- [ ] 既存の関数の振る舞いが変わっていない

「**ステージオール**」→ AI 文面（`Closes #1` は **もう不要** です。1 つ目のコミットに入っています）→「**Commit**」→「**プッシュ**」（2 回目以降はこの表記。1 回目は「ブランチを公開」でした）。ボタンが灰色の「Commit」に戻れば push 完了です。ブランチ名の下の `↑2` は「`origin/main` より進んでいるコミット数」なので、push しても消えません。

> ドラフトなので `changelog` はまだ走りません（`test` はもう一度走って緑になります）。PR パネルの上部のボタンが「PR を作成」から「PR #2」に変わっているのにも気づくはずです。

### 6-4. 返信とリアクション

PR パネルの各スレッドで返します。スレッドの上にマウスを乗せると、右上に「**解決**」「**返事**」「Copy comment」「…」が出ます。

- 採用したもの: 「**返事**」→ スレッドの下に返信欄（プレースホルダ「<あなたのID> に返信」、太字・斜体・コードなどの書式ボタン、「キャンセル」「**Reply**」）が開くので `対応しました（境界のテストを追加）` と書いて **Reply** → 本文の下の 😊+（**Add reaction**）→ 2 段 4 列のピッカー（👍 👎 😄 😕 / ❤️ 🎉 🚀 👀）から **👍**
- 見送ったもの: `今回は見送ります。理由: Issue #1 の範囲外なので、別の Issue で扱います` → **😕**
- 質問: 返信で答える（無ければ何もしない）

返信はスレッドの中に入れ子で表示され、リアクションは「😕 1」のようなチップになります。GitHub 側には数秒で反映されます。

![app.js:L77 のスレッド。本文の下に 8 種のリアクションピッカーが開き、その下の返信欄に見送りの理由が入力され、キャンセルと Reply のボタンがある](images/10_pr_panel_reply_and_reaction.png)

> **スレッドの「解決」ボタン**: あります。採用して直した分は「解決」を押すと、スレッドが「レビュー待ち」から「**解決済み**」の見出しの下へ移ります（GitHub 側も resolved になります）。押さなくても流れに影響しません（ルールセットで会話の解決を必須にしていません）。

✅ **ここまでできたら**: 採用した指摘が直って push 済み（コミット 2 つ）、すべてのスレッドに返信と 👍 / 😕（採用分は「解決済み」でもよい）。PR はまだ **DRAFT**。

---

## 7. Ready for review にして auto-merge を予約すると、CI が赤で止まる（15 分）

### 7-1. Ready for review にする

`issue-1` の PR パネルで、タイトルの下の「**Mark ready for review**」（英語表記のまま。右の ▾ は「Close PR」だけ）を押します。バッジが **DRAFT → OPEN** に変わり、同じ位置にマージボタン「**Create merge commit**」が出ます（まだ押せる状態ではありません。GitHub 側が「必須チェック待ち」と認識すると、次項の「自動マージを有効にする」に変わります）。チェックの欄には新しい `test` が Queued で増え、`changelog` が初めて走ります。ボタンが見つからなければ、ターミナルで `gh pr ready 2` でも同じです。

![ドラフトの PR パネル。タイトルの下に Mark ready for review のボタンと右端の下向き矢印、その下に 2 合格のチェック欄](images/11_mark_ready_for_review.png)

### 7-2. 自動マージを有効にする（予約）

**急ぐ必要はありません。** 更新アイコンを押して少し待つと、マージボタンの位置が「**自動マージを有効にする**」（Enable auto-merge）に変わります。押すと「処理中…」→ 数秒で緑の「**自動マージを無効にする**」（Disable auto-merge）に変わります。確認ダイアログは出ません。右の ▾ にはマージ方法（Create merge commit / Squash and merge / Rebase and merge）と「閉じる PR」が入っています。

![PR パネル。OPEN のバッジの下に自動マージを有効にするのボタン、その下に 1 チェックに失敗しましたのブロックと修正ボタン、3 合格 1 失敗の欄](images/12_merge_dropdown_enable_auto_merge.png)

> **参考値**: このリポジトリの CI は速く、Ready にしてから `test`（7 秒）→ `changelog`（5 秒）が終わるまで **約 20 秒** です。ボタンが「自動マージを有効にする」になるのは、GitHub 側が「必須チェックが通っていない」と判定してからなので、実機では `changelog` が赤になった後でした。**赤になってからでも予約できます**。

> **なぜ押せるのか**: GitHub は「**必須チェックが通っておらず、今はマージできない PR**」に auto-merge の予約を出します（保留中でも失敗中でも）。すべて緑の PR は普通のマージボタンが出るだけで、予約の出番はありません。ドラフトと競合中の PR にも出ません。

> **予約した = 宣言した**: ここから先、必須チェックが緑になった瞬間に GitHub がマージします。**8 章で Claude Code の修正を push するのはあなた** です。押す前に差分を読む。これが第4弾で残る最後の人間の関門です。

> **ボタンが「Create merge commit」のままなら**: GitHub 側の状態がまだ更新されていません。数秒待って更新アイコンを押します。それでも変わらない、または押してもエラーになるときは、ターミナルで `gh pr merge 2 --auto --merge` と打つと同じ予約ができます（付録 D）。予約を取り消したいときは「自動マージを無効にする」を押します（即時に解除され、ボタンが「有効にする」に戻ります）。

### 7-3. `test` は緑、`changelog` は赤。auto-merge は待ったまま

参考値: Ready から **約 20 秒**（`test` が先に終わり、そのあと `changelog`）。更新アイコンを押すと、チェック欄が「**3 合格 1 失敗**」になり、`changelog` が **Failed**（古い `test` の Successful と `changelog` の Skipped も並びます）。マージボタンの下に赤い「**1 チェックに失敗しました** / 詳細を検査するか、AI 修正パスを開始します。」のブロックと「**修正**」ボタンが出ます（8 章で見ます）。サイドバーの `issue-1` と `review-pr-2` のカードでは PR のアイコンが赤くなります（第2弾 8-1 の赤いチップ）。予約は **有効のまま** で、ボタンは「自動マージを無効にする」のままです（失敗しても予約は消えません）。

![PR パネル。OPEN、緑の自動マージを無効にするボタン、1 チェックに失敗しましたのブロックと修正ボタン、3 合格 1 失敗の欄に changelog が Failed、test が Successful 2 つ、古い changelog が Skipped](images/14_pr_panel_test_green_changelog_red.png)

> **`changelog` も緑だったら**: Claude Code が `docs/CONTRIBUTING.md` を自分で読み、Issue 番号付きの行を `CHANGELOG.md` に足していた場合です（4-2 か 6-3 の「変更点」に `CHANGELOG.md` があったはずです）。予約が効いて **その場で自動マージされます**。それ自体は正しい振る舞いです。7-4〜8-3 は読むだけで進み、8-4 の確認へ。

### 7-4. ログをその場で読み、CONTRIBUTING を初めて開く

`changelog` の行をクリックすると、その下にジョブの詳細が PR パネルの中に開きます（第2弾 8-1 で予告した機能）。上から、ステータスと時刻、「**注釈**」（GitHub Actions の注釈。`changelog チェック` として「この PR では CHANGELOG.md が変更されていません。CHANGELOG.md の「## 未リリース」に (#N) 付きで 1 行追加してください」の 1 行が出ます）、「失敗したジョブ」、「**ログテール（最後の 200 行）**」（小さな枠。スクロールすると、このリポジトリのチェックスクリプト（`scripts/check-changelog.js`）の次のメッセージがあります。「完全なログを表示」で全文も開けます）。

```
[NG] changelog チェック: 失敗

理由: この PR では CHANGELOG.md が変更されていません。

このリポジトリのルール（docs/CONTRIBUTING.md）:
  PR では CHANGELOG.md の「## 未リリース」に変更内容を 1 行追加し、行末に Issue 番号を (#N) の形で書く。

直し方:
  1. CHANGELOG.md の「## 未リリース」の直下に、次の形の行を足す
       - <変更内容を 1 行で> (#1)
  2. ローカルで確認する:  npm run check:changelog
  3. コミットして push すると、このチェックが再実行される
```

`(#1)` と出るのは、コミットメッセージの `Closes #1` から「この PR が閉じる Issue」を読み取っているからです。GitHub Actions の画面では、同じ内容が注釈（`::error`）とジョブのサマリーにも出ます。

![PR パネルの中に開いた changelog ジョブの詳細。ステータス Failed、注釈に changelog チェックの日本語メッセージ、失敗したジョブ、ログテールの枠](images/15_failed_job_log_inline.png)

ここで初めて `docs/CONTRIBUTING.md` を開きます（ワークツリーのファイル一覧から、または `gh browse docs/CONTRIBUTING.md`）。「PR を出すときのルール」に 3 つ書いてあります。「`## 未リリース` の下に変更内容を 1 行、行末に `(#Issue番号)`」「`Closes #N` で Issue とつなぐ」「`npm test` を通す」。`CHANGELOG.md` を開くと、`## 未リリース` は空で、その下に第1〜3弾の分（0.1.0〜0.3.0）が入っています。

Claude Code は Issue に書かれた **5 ファイルだけ** を触りました。Issue には CHANGELOG のことは書いてありません。だから赤になりました（実機では Claude Code は報告の補足で「CONTRIBUTING によると Ready にすると changelog チェックが走る」と予告していましたが、Issue の「5 ファイルだけ」を優先して足しませんでした）。

> **あなたはこのファイルを読んでいませんでした。エージェントは読んでいても、Issue の範囲を守って足しませんでした**。それでも `main` は守られました。ルールを **人が読む文書** に書くだけでは守られない、**CI に書くと守られる**。第4弾でいちばん持ち帰ってほしい体験です（付録 E）。

![必須チェックと auto-merge の関係。上段はルールセット main-required-checks が main を守る層。中段は PR のチェック状態。保留中も失敗中もマージボタンは押せず、自動マージを有効にするで予約できる。予約済みなら有効のまま待つ。両方成功なら普通のマージボタンで、予約済みなら GitHub がマージする。下段は自動マージから Closes #1 で Issue が閉じ、ブランチが自動削除されるまで。予約した後の push は読まれずに入る、という注意](images/diagrams/20_required-checks-and-auto-merge.svg)

✅ **ここまでできたら**: PR #2 がドラフトではなくなり、auto-merge が **有効**、`test` が緑、`changelog` が赤、`docs/CONTRIBUTING.md` のルールを読んだ。

---

## 8. Fix broken checks で直させ、push すると PR が自分でマージされる（15 分）

### 8-1. 先に Claude Code に一言

auto-merge を予約した PR では **push = マージ** です。CI の失敗をエージェントに渡す前に、`issue-1` の Claude Code のタブで次を送っておきます（4 章の合言葉の念押しです。「修正」ボタンで新規 Agent を起こす場合は、その Agent に同じ一文を送ります）。

```
これから PR パネルから CI の失敗を送ります。原因を直しても、コミットも push もしないでください。差分は私が読んで push します。
```

### 8-2. 「修正」（Fix broken checks）の中身を、Claude Code に渡す

PR パネルの「1 チェックに失敗しました」の右にある「**修正**」（AI アイコン付き。英語ドキュメントの Fix broken checks）が Orca の機能です。押すと送信先を選ぶメニューは出ず、`issue-1` に **新しいターミナルタブが開いて Agent が起動し**、右下に「失敗したチェックに対して AI Agent を開始しました。」のトーストが出ます。つまり、今動いている Claude Code ではなく **新規の Agent** に渡す作りです（第3弾の Design Mode の送信メニューとは違います）。

![PR パネルの 1 チェックに失敗しましたのブロックと修正ボタン。下に、失敗したチェックに対して AI Agent を開始しましたというトースト](images/16_fix_broken_checks_button.png)

> **1.4.201 の実機では、新しいタブが `issue-1 >` のプロンプトのまま止まり、Agent が起動しませんでした**（検証機の zsh の環境との相性で、Orca がシェルの準備完了を検出できなかったものです。他の環境では起動するはずです）。そのため「修正」の Agent に届く文面は本書では確認できていません。起動した場合は、新規 Agent には Issue と PR の文脈が無いので、8-1 の一文（コミットも push もしない）を足してから進めてください。

本書では、**同じ中身を自分で書いて、今動いている Claude Code に送る** 手順を本線にします。Fix broken checks が渡すのも「失敗したチェック名とログへのリンク」です。リンクは PR パネルの `changelog` の行の右端のアイコン（オープンチェックの詳細）で開くページの URL か、ターミナルの `gh pr checks 2` で取れます。`issue-1` の Claude Code のタブに次を送ります。

```
PR #2 で次のチェックが失敗しました。
- changelog: https://github.com/<あなたのID>/orca-handson-4/actions/runs/<id>/job/<id>
原因を調べて直してください。コミットも push もしないでください。何を変えたか日本語で報告してください。
```

見てほしいのは 2 点です。

- **チェック名とリンクだけ** を渡しています。ログの本文は渡していません。だから Claude Code は `gh run view <id> --log-failed` や `gh api` でログを **読みに行き**、7-4 のメッセージにたどり着きます
- **Issue と PR の文脈は同じセッションだから持っています**。新規 Agent や新しいタブに渡すと失います（第3弾のつまずき 2 と同じ）

![Claude Code のターミナル。チェック名とログの URL を渡した指示の下で、失敗ログとチェックスクリプトを確認し、CHANGELOG.md の未リリースの直下に (#1) 付きの 1 行を足す差分を表示し、原因、変更したもの、確認結果を報告している](images/17_claude_received_fix_broken_checks.png)

参考値: **約 1 分**（実測 44 秒）。報告の例: 「`CHANGELOG.md` の `## 未リリース` の直下に `- 送料無料までの残額を注文確認ページに表示する（「あと 30 円で送料無料になります」） (#1)` を追加しました。`npm run check:changelog` は [OK]、`npm test` は 35 件すべて成功です」。

### 8-3. 差分を読んで push（最後の関門）

「変更点 1」に `CHANGELOG.md` だけが出ています。クリックして 1 行の追加を読みます。`(#1)` が付いているか、`## 未リリース` の下か、他のファイルを触っていないか。読んだら「**ステージオール**」→ AI 文面（そのままで可）→「**Commit**」→「**プッシュ**」。

![CHANGELOG.md の差分。未リリースの直下に送料無料までの残額を表示する行が 1 行追加されている。右のソース管理パネルは変更点 1 に CHANGELOG.md だけ](images/18_changelog_diff_one_line.png)

> **Claude Code がコミット・push まで済ませていたら**: 予約が効いて、チェックが緑になった瞬間にマージされます（読む前に入ってしまった状態）。`gh pr diff 2 -- CHANGELOG.md` か、マージ後なら `git show <マージコミット> -- CHANGELOG.md` で **事後に読みます**。業務なら revert を検討する場面です（付録 D）。

> **7-2 で予約していなかった人**: push した後、ボタンが「自動マージを有効にする」のうちに押します（チェックが緑になるまで約 30 秒）。緑になってしまったら、普通の「Create merge commit」で入れて構いません（第2弾 8-2）。

### 8-4. 何も押さずに待つ

参考値: push から **約 40 秒**（実測 36 秒。`test` 7 秒 → `changelog` 11 秒）。push 直後に更新すると、チェック欄が「まだチェックは報告されていません」になり、予約は「自動マージを無効にする」のまま残っています。

![push 直後の PR パネル。OPEN、緑の自動マージを無効にするボタン、チェック欄にまだチェックは報告されていませんの表示](images/13_pr_panel_auto_merge_enabled_pending.png)

もう一度更新すると、両方が緑になった直後にバッジが **MERGED**（紫）に変わり、ボタンが赤い「**ワークスペースの削除**」になります。**まだ押しません**（9 章で）。

![マージ後の PR パネル。MERGED のバッジ、ワークスペースの削除ボタン、2 合格として test と changelog が Successful](images/19_pr_panel_merged_by_auto_merge.png)

ターミナルで確かめます。

```bash
gh pr view 2 --json state,mergedAt,mergeCommit --jq '"\(.state) \(.mergedAt) \(.mergeCommit.oid[0:7])"'
gh issue view 1 --json state          # {"state":"CLOSED"}  ← Closes #1
git ls-remote --heads origin          # issue-1 が無い（マージ後に自動削除された）
gh ruleset check main                 # main-required-checks は残っていて正常
```

第2弾の手動マージと並べると、こうなります。

| | 第2弾 8-2（手動） | 第4弾 7-2 → 8-4（auto-merge） |
|---|---|---|
| 押すもの | チェックが緑になるのを **待ってから** Create merge commit | チェックが通る前に「自動マージを有効にする」（予約） |
| マージするのは | あなた | GitHub（条件がそろった瞬間） |
| 守っているのは | あなたの目 | ルールセットの必須チェック + **push する前に読んだあなたの目** |
| 向く場面 | 小さなチーム、チェックが速い | チェックが長い、夜間に通したい、PR が多い |

![PR の流れ。PR を作成 → チェック実行中 → チェック成功 → マージ → Issue クローズ。チェック失敗のときは Fix broken checks でエージェントに渡して直させる](images/diagrams/12_pr-panel-flow.svg)

✅ **ここまでできたら**: PR #2 が MERGED（`mergedAt` に時刻が入る）、Issue #1 が CLOSED、`origin` に `issue-1` が無い、`main` に `CHANGELOG.md` の 1 行と機能が入っている。

---

## 9. 後片付けと、手動に戻す（5 分）

### 9-1. ワークツリーを 2 本削除する

第3弾 11-3 と同じです。`issue-1` は PR パネルの「**ワークスペースの削除**」。`review-pr-2` はサイドバーで右クリック → 一番下の「**削除 ⌘⇧⌫**」。どちらも「ワークスペースの削除」の確認ダイアログ（「削除 issue-1 from git and delete its workspace folder.」、パス、「**Delete Workspace**」）が出るので確定します。MERGED なので「Review N Branches」のトーストは出ません（`review-pr-2` で出たら Codex が何か直しています。中身を見てから削除してください）。`review-pr-2` を消すとローカルブランチ `<あなたのID>/issue-1-2` も消えます。

![後片付けの流れ。マージ済みのワークツリーを削除する。フォルダと未コミットの変更とローカルブランチは消え、プライマリ、push 済みブランチ、PR は残る](images/diagrams/06_worktree-cleanup.svg)

### 9-2. 「Agent の権限」を手動に戻す

**設定 → Agent → 「Agent の権限」を「手動」** に。「インストール済み」の欄で、起動コマンドから `--dangerously-skip-permissions` が消えたことを確認します。

### 9-3. プライマリで結果を確かめる

サイドバーの `main ［プライマリ］` を選び、+ → 新規ターミナルで次を打ちます。

```bash
git pull
git fetch --prune             # 消えたリモートブランチの情報を片付ける
npm test                      # 35 件（6 章で境界のテストを 1 つ足した場合。足していなければ 34 件）
head -10 CHANGELOG.md         # ## 未リリース の下に (#1) の行
gh issue list                 # 何も出ない
gh pr list                    # 何も出ない
```

### 9-4. ルールセットはそのまま残す

`main-required-checks` は消しません。付録 A でもう一度使います。消し方は付録 C にあります。

✅ **ここまでできたら**: サイドバーは `main ［プライマリ］` だけ。Yolo が手動に戻り、Issue #1 が CLOSED、`main` に機能と CHANGELOG の行が入っている。

ここまでで本編は終わりです。お疲れさまでした。

---

## 付録 A（任意）: 役割を入れ替える。Codex が実装し、Claude Code がレビューする（20 分）

1. `bash scripts/seed-issues.sh --appendix` で Issue **#3**「クーポンコードの大文字小文字を区別しない（welcome10 でも WELCOME10 として扱う）」を作ります。`src/price.js` に `normalizeCouponCode(code)`（前後の空白を除いて大文字に。文字列以外は `""`）を `applyCoupon` の直前に足し、`applyCoupon` と `public/app.js` の判定で使う。テスト 3 例、触るのは 3 ファイル、`npm test` は **34 → 37**
2. 3 章の状態（Yolo）で、Issue #3 から **Codex** のワークツリーを作ります（4-1 の手順で Agent を Codex に）。合言葉は同じ: 「コミットも push もせずに報告」
3. 差分を読み（3 ファイルだけか、`normalizeCouponCode` が `applyCoupon` の直前か、テスト 3 例があるか、37 件か）、`Closes #3` でコミット、公開、**ドラフト PR #4**
4. PR #4 から **Claude Code** のワークツリー `review-pr-4` を作り（5-1）、`docs/review-prompt.md` を「PR #4」「Issue #3」に読み替えて貼ります
5. 6〜8 章をもう一度。今度は CONTRIBUTING を知っているので、**Ready にする前に** Codex に `CHANGELOG.md` の行（`(#3)` 付き）を足させると、`changelog` は最初から緑です。Ready の直後にボタンが「自動マージを有効にする」になっていれば予約でき、約 20 秒後にそのままマージされます。すでに緑なら普通の「Create merge commit」で入れます
6. 第1弾の「比べる」を、レビューでやります。Claude Code のレビューと 5-3 の Codex のレビューを見比べてください。根拠と代替案の量、【必須】と【提案】の使い分けに違いが出やすいです

---

## 付録 B（任意）: レビューコメントの渡し方と、ワークツリーにひと言メモを残させる（10 分）

**B-1. 渡し方は 3 通り**。6-3 では `gh api` の書き方を渡して Claude Code に自分で読ませました。ほかに、`gh pr view 2 --comments` の出力を貼る、PR パネルのコメントを ⌘C で貼る、があります。**番号や URL だけ渡して自分で読ませる** 方が、コピペの取りこぼしが無く、行番号も付いてきます。ただし何を読んだかはターミナルで確認してください。

**B-2. ワークツリーのコメント欄**。Orca CLI（第1弾 付録 A、第3弾 付録 B）には、ワークツリーのカードに 1 行のメモを書く命令があります。`issue-1` のような作業中のワークツリーで Claude Code に次を頼んでみてください。

```
このワークツリーの状態を、orca worktree set --worktree current --comment "レビュー 3 件中 2 件対応、push 待ち" で Orca に記録してください。終わったら orca worktree show --worktree current --json で comment を確認して報告してください。
```

サイドバーのカードのブランチ名の右に **書類のアイコン** が付きます（本文はカードには出ません）。アイコンをクリックすると出るポップオーバーの「**ノート**」欄に本文が表示され、鉛筆アイコンで編集もできます。PR から作った `review-pr-2` には最初から「PR #2 — …」の注記が入っていました（5-1）。**エージェントが自分の進捗を、人間の見える場所に 1 行で書く** 使い方です。`--workspace-status in-review` を足すと、ボードの列も動かせます（1.4.201 の `orca worktree set --help` で確認済み）。

---

## 付録 C（任意）: ルールセットと auto-merge の中身（何を設定したのか）

`scripts/setup-repo.sh` がやったことの中身です。

- `gh repo edit --enable-auto-merge --delete-branch-on-merge`: リポジトリの「Allow auto-merge」と「Automatically delete head branches」を有効にする
- `gh api -X POST repos/{owner}/{repo}/rulesets`: 名前 `main-required-checks`、対象は既定ブランチ（`~DEFAULT_BRANCH`）、ルールは `required_status_checks`（`test` と `changelog`。GitHub Actions の integration_id 15368、strict は false）、`deletion`（ブランチ削除の禁止）、`non_fast_forward`（force push の禁止）。`enforcement: active`。**バイパスなし** = 所有者のあなたも縛られます。同じ名前があれば作りません
- GitHub で見る場所: リポジトリの **Settings → Rules → Rulesets → `main-required-checks`**、**Settings → General → Pull Requests**（Allow auto-merge、Automatically delete head branches）。CLI では `gh ruleset list` / `gh ruleset check main` / `gh ruleset view <id>`

![GitHub の Settings、Rulesets の main-required-checks の画面。Enforcement status が Active、Bypass list is empty](images/20_github_settings_rules_ruleset.png)

- 副作用: `main` に **直接 push できなくなります**（`git push origin main` が拒否される。これが狙いです）
- チェック名は **ジョブ名** と一致させます。ジョブを改名したら必須チェックも直します（付録 D）
- `CONTRIBUTING.md` が `docs/` にある理由: GitHub はルート・`docs/`・`.github/` のどこにあっても「Contributing guidelines」として認識し、PR 作成画面にリンクします。業務リポジトリでもこの 3 か所を探してください
- なぜ public か: GitHub Free ではルールセット・ブランチ保護・ドラフト PR が **public リポジトリ限定** です（private では Pro / Team / Enterprise が必要。GitHub Docs の About rulesets と About pull requests の冒頭にある availability の注記を参照）。実機でも public の Free リポジトリで `setup-repo.sh` のルールセット作成が通り、ドラフト PR が作れました
- 消し方: `gh ruleset list` で id を調べて `gh api -X DELETE repos/{owner}/{repo}/rulesets/<id>`、`gh repo edit --enable-auto-merge=false`
- 業務では: ルールセットは管理者が組織単位で入れることが多いです。「自分の PR がなぜマージできないか」を Rules の画面で読めるようになるのが目的です

---

## 付録 D: トラブルシューティング

第1弾の付録 B、第2弾の付録 B、第3弾の付録 D も合わせて参照してください。ここには第4弾で新しく出る症状だけを載せます。

| 症状 | 見るところ・直し方 |
|---|---|
| `setup-repo.sh` が「ruleset は GitHub Free ではパブリックリポジトリでしか作れません」で止まる | `gh repo edit --visibility public --accept-visibility-change-consequences` で public にして再実行。GitHub Free ではルールセットは public 限定 |
| `setup-repo.sh` のルールセット作成が `403` / `Upgrade to GitHub Pro or make this repository public` | 上と同じ（private）。public なのに 403 なら `gh auth status` の Token scopes に `repo` があるか。無ければ `gh auth refresh -s repo` |
| `gh repo create` が `name already exists` | `orca-handson-4b` などにして、以後読み替える |
| 「新規 PR」フォームで「下書きとして作成」を忘れた / ドラフトにならなかった | `gh pr ready --undo 2` でドラフトに戻す（または最初から `gh pr create --draft --fill`）。以降は本文どおり |
| 「ブランチを公開」の後に「新規 PR」フォームが出ない | パネル上部の「PR を作成」を押す。バージョン差でダイアログになる場合も項目は同じ |
| AI のコミットメッセージ生成が「Generation timed out after 60s.」 | もう一度 AI アイコンを押す（実機では 2 回目に 45 秒で生成）。急ぐなら自分で書く |
| PR パネルに DRAFT の表示が無い / マージボタンが出ている | `gh pr view 2 --json isDraft`。`false` なら `gh pr ready --undo 2` |
| 作成ダイアログの GitHub タブに PR が出ない | 候補は PR と Issue が同じ一覧。検索欄に `#2` と打つ、閉じて開き直す、少し待つ。それでも出なければ「スマート」タブに PR の URL を貼る |
| Issue から作ったワークツリーの名前が `30` になった | 1.4.201 が Issue のタイトルから名前を付けるため。「詳細設定」の名前に `issue-1` と入れる（4-1）。付いてしまっても動作は同じで、本書の `issue-1` を読み替えればよい |
| PR からワークツリーを作ると「ブランチはすでに checkout されています」相当のエラー | 1.4.201 では出ません（別名のブランチ `<あなたのID>/issue-1-2` が切られます）。出たときは「名前」タブで `main` から `review-pr-2` を作り、Codex に PR の URL を渡す。プロンプトの 1 行目が `git fetch origin pull/2/head && git checkout --detach FETCH_HEAD` で PR の先頭を取り出す |
| Codex のワークツリーが PR の最新になっていない（`git log` が `main` のまま、detached HEAD） | 正常。レビュアープロンプトの 1 行目で Codex が取り出す。レビューだけなので detached で問題ない |
| Codex の `gh api` が `422`（`line` が差分に無い） | インラインコメントは **差分に含まれる行** にしか付けられない。「`gh pr diff 2` に出る行だけを指定して」と伝える。無理なら `gh pr review 2 --comment --body "…"` で PR 全体へのコメントに |
| Codex が `Can not approve your own pull request` | 自分の PR は自分で承認できない。`event` は `COMMENT`（プロンプトどおり） |
| Codex がファイルを直してしまった | レビュー専用。`git checkout -- .` で戻し「ファイルは変更しないで」と伝える。コミット済みなら `git reset --hard origin/<ブランチ>` |
| PR パネルにレビューが出ない | 更新アイコン。`gh api repos/{owner}/{repo}/pulls/2/comments` で GitHub 側に付いているか。付いていれば表示待ち |
| 返信やリアクションが送れない | `gh auth status`。GitHub 側の反映は数秒 |
| Ready for review にしても `changelog` が走らない | Settings → Actions で Actions が有効か。`.github/workflows/ci.yml` の `types` に `ready_for_review` があるか。`gh pr checks 2`。何も無ければ空コミット `git commit --allow-empty -m "trigger ci"` → push |
| 「自動マージを有効にする」が出ない | (1) すでに両方緑（Claude Code が先回りしていた）→ 7-3 の注意。普通にマージ。(2) ボタンが「Create merge commit」のまま → GitHub 側の状態待ち。数秒待って更新アイコン。(3) まだ DRAFT。(4) 競合中。(5) リポジトリの Allow auto-merge がオフ（`gh api repos/{owner}/{repo} --jq .allow_auto_merge`）。(6) 必須チェックが無い（ルールセットが無い、private で作れていない） |
| 「自動マージを有効にする」を押してもエラーになる | `gh pr merge 2 --auto --merge` で予約する。`Pull request is in clean status` などで断られたら、すでに緑なので普通にマージ |
| 予約する前に両方緑になった | 第2弾 8-2 の「Create merge commit」で手動マージ。auto-merge は付録 A の PR #4 で試す |
| auto-merge を予約したのに、緑になってもマージされない | 必須チェックの **名前** とジョブ名が違う（`gh ruleset view <id>` で `required_status_checks` を見る）。または GitHub の反映待ち（1〜2 分）。`gh pr view 2 --json mergeStateStatus,autoMergeRequest` で予約が残っているか確認。消えていたら再予約 |
| Claude Code が push してしまい、読む前にマージされた | 予約中は push = マージ。`git show <マージコミット> -- CHANGELOG.md` で事後に読む。8-1 の一言を送っていたか確認。業務なら revert を検討 |
| `changelog` が最初から緑 | 7-3 の注意。正常。読み進めて 8-4 へ |
| `test` が赤 | 6 章の修正でテストが壊れた。ログを読み、8-2 と同じ文面（チェック名とログの URL）で Claude Code に渡す。2 つ赤でも手順は同じ |
| 「修正」を押しても新しいタブが `issue-1 >` のまま Agent が起動しない | 検証機でも再現した症状（シェルの準備完了を Orca が検出できない）。タブの × で閉じ、8-2 の文面を今動いている Claude Code に手で送る |
| 「修正」で起動した新規 Agent が動いている | 文脈が無いので、`PR #2 の changelog チェックが失敗しています。コミットも push もしないで` と一言添える。入力欄で止まっていれば ↩ |
| 「修正」を何度も押して zsh のタブが増えた | 各タブの × で閉じる。ワークツリーの削除でも消える |
| マージされたのに Issue #1 が CLOSED にならない | 第2弾 付録 B と同じ（反映に少し時間がかかる） |
| マージ後に `git push origin main` が拒否された | ルールセットが効いている（正常）。`main` へは PR 経由で |
| ワークツリー削除時に「Review N Branches」のトースト | `review-pr-2` にコミットが残っている（Codex が直してしまった）。中身を見て不要なら削除 |
| Yolo を戻し忘れた | 設定 → Agent → 「Agent の権限」を手動に。「インストール済み」の欄でフラグが消えたことを確認 |

---

## 付録 E: 業務で「PR を出した後」を任せるときの判断基準

第1弾の付録 C（Yolo）、第2弾の付録 C（差分を全部読む）、第3弾の付録 E（Design Mode で何が送られるか）に続く、第4弾の持ち帰りです。

### レビューコメントは全部受け入れない

採否を決めるのは作者です。理由を書いて見送ります（6-2）。エージェントのレビューは「見落としを減らす前段」で、人間のレビューの代わりではありません。【必須】【提案】【質問】の区別は、人間のレビューでも使えます。

### ルールはどこに書くか

7 章の体験は、「人が読む文書に書いただけでは、人もエージェントも読まない」でした。ルールの置き場所は 3 段あります。

| 書く場所 | 誰が読む | 守られる強さ | 例 |
|---|---|---|---|
| Issue | そのタスクの担当エージェントと担当者。今回だけ | 読まれれば | 「変更するファイルは 5 つだけ」 |
| CLAUDE.md / AGENTS.md | そのリポジトリで動くエージェントが毎回 | 読まれれば | 「コミットは人間が行う」 |
| CI（必須チェック） | 誰も読まなくても止まる。毎回 | 強い | 「CHANGELOG に 1 行」「テストが通る」 |

Issue に書くのが一番手軽で、CI に書くのが一番確実です。「守られないと困るルール」は CI に、「毎回言うのが面倒なルール」は CLAUDE.md / AGENTS.md に、「今回だけのルール」は Issue に。

### auto-merge は必須チェックとセットでのみ

必須チェックの無い auto-merge は「誰も見ずに入る」と同じです。予約は「これ以降の push は読まずに入る」という宣言です（7-2）。だから push は人間が、差分を読んでから押します（8-3）。エージェントに push まで任せる運用なら、auto-merge は使わないか、必須レビュー（人間の承認）を足してください。

### 人間が押すボタンを残す

第4弾で人間が押したのは **採否・auto-merge の予約・push** の 3 つです。どれを自動化してよいかはチームで決めます。「差分を読む時間を確保している」（第2弾 付録 C の 4 条件目）が、ここでも前提です。

---

## 参考リンク

- Orca: GitHub 連携（レビュースレッド、Fix broken checks = 「修正」、Enable auto-merge = 「自動マージを有効にする」、Mark ready for review）: https://www.onorca.dev/docs/review/github
- Orca: コミットと push（PR 作成、ドラフト、AI で生成）: https://www.onorca.dev/docs/review/commit-push
- Orca: ワークツリー（PR からの作成）: https://www.onorca.dev/docs/model/worktrees
- Orca CLI（`orca worktree set --comment`）: https://www.onorca.dev/docs/cli/reference
- GitHub Docs: Automatically merging a pull request: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request
- GitHub Docs: Managing auto-merge for pull requests in your repository: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-auto-merge-for-pull-requests-in-your-repository
- GitHub Docs: About rulesets: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- GitHub Docs: About pull requests（Draft pull requests）: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests
- GitHub REST: Create a review for a pull request（`path` / `line` / `side`）: https://docs.github.com/en/rest/pulls/reviews#create-a-review-for-a-pull-request
- `gh pr` / `gh ruleset` のマニュアル: https://cli.github.com/manual/gh_pr 、 https://cli.github.com/manual/gh_ruleset
- 第1弾: https://github.com/misshii3/orca-handson 、 第2弾: https://github.com/misshii3/orca-handson-2 、 第3弾: https://github.com/misshii3/orca-handson-3
