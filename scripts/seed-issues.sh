#!/usr/bin/env bash
#
# ハンズオン用の Issue を issues/*.md から一括で作る。
#
# 使い方（リポジトリのルートで）:
#   bash scripts/seed-issues.sh              # 本編の Issue（issues/*.md。第4弾は #1 の 1 件）
#   bash scripts/seed-issues.sh --appendix   # 付録 A の Issue（issues/appendix/*.md）
#
# - Markdown を番号順に読み、1 行目の「# 見出し」をタイトル、2 行目以降を本文として gh issue create を実行する
# - 同じタイトルの Issue がすでにあれば作らない（何度実行しても増えない）
#
set -euo pipefail

# どこから実行されてもリポジトリのルートに移動する
cd "$(dirname "$0")/.."

# 読むディレクトリ。--appendix なら付録用
issue_dir="issues"
if [ "${1:-}" = "--appendix" ]; then
  issue_dir="issues/appendix"
elif [ -n "${1:-}" ]; then
  echo "エラー: 不明な引数です: $1（使えるのは --appendix だけ）" >&2
  exit 1
fi

# gh にログイン済みか
if ! gh auth status >/dev/null 2>&1; then
  echo "エラー: gh にログインしていません。先に gh auth login を実行してください。" >&2
  exit 1
fi

# このディレクトリがどの GitHub リポジトリか（origin から判定される）
repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
echo "対象リポジトリ: ${repo}"
echo

# すでにある Issue のタイトル一覧（open / closed 両方）
existing_titles="$(gh issue list --state all --limit 200 --json title --jq '.[].title')"

for file in "${issue_dir}"/*.md; do
  # 1 行目の「# 」を取ったものがタイトル
  title="$(sed -n '1s/^# //p' "$file")"
  if [ -z "$title" ]; then
    echo "スキップ: ${file} の 1 行目に「# タイトル」がありません" >&2
    continue
  fi

  if grep -Fxq -- "$title" <<<"$existing_titles"; then
    echo "すでにあります: ${title}"
    continue
  fi

  # 2 行目以降が本文
  body_file="$(mktemp)"
  tail -n +2 "$file" >"$body_file"
  url="$(gh issue create --title "$title" --body-file "$body_file")"
  rm -f "$body_file"
  echo "作成しました: ${title}"
  echo "  ${url}"
done

echo
echo "現在の Issue:"
gh issue list --state open
