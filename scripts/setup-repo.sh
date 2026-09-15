#!/usr/bin/env bash
#
# ハンズオン用に GitHub リポジトリの設定を整える（複製直後に 1 回実行する）。
#
# 使い方（リポジトリのルートで）:
#   bash scripts/setup-repo.sh
#
# やること:
#   1. 自動マージ（auto-merge）を有効にする
#   2. マージ後にブランチを自動で削除する
#   3. main に ruleset「main-required-checks」を作る
#        - 必須チェック: test と changelog（.github/workflows/ci.yml のジョブ名）
#        - main の削除とフォースプッシュを禁止
#      → 2 つのチェックが緑になるまで PR をマージできず、main へ直接 push もできなくなる
#
# - 何度実行しても増えない（同じ名前の ruleset があれば作らない）
# - ruleset は GitHub Free ではパブリックリポジトリでしか使えない（プライベートだと 403）
# - 元に戻すには:  gh ruleset list  で id を調べて  gh api -X DELETE repos/{owner}/{repo}/rulesets/<id>
#
set -euo pipefail

# どこから実行されてもリポジトリのルートに移動する
cd "$(dirname "$0")/.."

# gh にログイン済みか
if ! gh auth status >/dev/null 2>&1; then
  echo "エラー: gh にログインしていません。先に gh auth login を実行してください。" >&2
  exit 1
fi

# このディレクトリがどの GitHub リポジトリか（origin から判定される）と、公開範囲
repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
visibility="$(gh repo view --json visibility --jq .visibility)"
echo "対象リポジトリ: ${repo}（${visibility}）"
if [ "${visibility}" != "PUBLIC" ]; then
  echo "エラー: ruleset は GitHub Free ではパブリックリポジトリでしか作れません。" >&2
  echo "  次のコマンドで公開にしてから、もう一度実行してください:" >&2
  echo "  gh repo edit --visibility public --accept-visibility-change-consequences" >&2
  exit 1
fi
echo

echo "1/3 自動マージと、マージ後のブランチ自動削除を有効にします"
gh repo edit --enable-auto-merge --delete-branch-on-merge >/dev/null
echo "  完了"
echo

ruleset_name="main-required-checks"
echo "2/3 main の ruleset「${ruleset_name}」を作ります"
existing_id="$(gh api "repos/${repo}/rulesets" --jq ".[] | select(.name == \"${ruleset_name}\") | .id")"
if [ -n "${existing_id}" ]; then
  echo "  すでにあります（id: ${existing_id}）"
else
  # 必須チェックの context はワークフローのジョブ名。integration_id 15368 は GitHub Actions
  gh api -X POST "repos/${repo}/rulesets" --input - >/dev/null <<'JSON'
{
  "name": "main-required-checks",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {
    "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          { "context": "test", "integration_id": 15368 },
          { "context": "changelog", "integration_id": 15368 }
        ]
      }
    }
  ]
}
JSON
  echo "  作成しました"
fi
echo

echo "3/3 設定の確認"
gh api "repos/${repo}" --jq '"  自動マージ: \(.allow_auto_merge)   マージ後にブランチ削除: \(.delete_branch_on_merge)"'
gh ruleset check main
