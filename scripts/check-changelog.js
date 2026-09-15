#!/usr/bin/env node
/**
 * CHANGELOG チェック（依存パッケージなし・Node 20 以上）
 *
 * ルール（docs/CONTRIBUTING.md）:
 *   PR では CHANGELOG.md の「## 未リリース」に変更内容を 1 行追加し、行末に Issue 番号を (#N) の形で書く。
 *
 * 確認すること:
 *   1. 比較元（origin/main）との差分に CHANGELOG.md が含まれている
 *   2. 「## 未リリース」の節に、比較元にはない箇条書き（- で始まる行）が増えている
 *   3. 増えた行に (#N) がある
 *   4. PR 本文かコミットメッセージに Closes #N があれば、その N と (#N) が一致する
 *
 * 使い方:
 *   npm run check:changelog        # ローカル（PR のブランチで実行。origin/main と比較する）
 *   GitHub Actions では .github/workflows/ci.yml の changelog ジョブが実行する
 *
 * 環境変数（GitHub Actions が渡す。ローカルでは省略可）:
 *   GITHUB_BASE_REF    PR のベースブランチ名（省略時 main）
 *   PR_BODY            PR の本文（Closes #N を探す）
 *   GITHUB_EVENT_NAME  pull_request 以外なら何もしないで成功する
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** リポジトリのルート（このファイルの 1 つ上） */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHANGELOG = "CHANGELOG.md";

/** git を実行して標準出力を返す。失敗したら null */
function git(...args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trimEnd();
  } catch {
    return null;
  }
}

/** 「## 未リリース」の見出しから次の「## 」見出しの手前までの行を返す。見出しがなければ null（### は節の中身として残す） */
export function extractUnreleased(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => /^##\s+\[?(未リリース|unreleased)\]?/i.test(line));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^##\s/.test(line));
  return end === -1 ? rest : rest.slice(0, end);
}

/** 箇条書き（- か * で始まる行）だけを、前後の空白を除いて返す */
export function bullets(lines) {
  return lines.map((line) => line.trim()).filter((line) => /^[-*]\s+\S/.test(line));
}

/** Closes #N / Fixes #N / Resolves #N（大文字小文字を問わない）の N を重複なしで返す */
export function findLinkedIssues(text) {
  const re = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s+#(\d+)/gi;
  return [...new Set([...text.matchAll(re)].map((m) => Number(m[1])))];
}

/** 行に含まれる (#N) の N を全部返す（「#2」だけや「Issue #1」は拾わない） */
export function issueRefs(line) {
  return [...line.matchAll(/\(#(\d+)\)/g)].map((m) => Number(m[1]));
}

/** 失敗メッセージを出して終了コードを 1 にする */
function fail(reason, linkedIssues) {
  const example = linkedIssues.length > 0
    ? `- <変更内容を 1 行で> (#${linkedIssues[0]})`
    : `- <変更内容を 1 行で> (#N)    ← N はこの PR が閉じる Issue の番号`;
  const message = [
    "[NG] changelog チェック: 失敗",
    "",
    `理由: ${reason}`,
    "",
    "このリポジトリのルール（docs/CONTRIBUTING.md）:",
    "  PR では CHANGELOG.md の「## 未リリース」に変更内容を 1 行追加し、行末に Issue 番号を (#N) の形で書く。",
    "",
    "直し方:",
    "  1. CHANGELOG.md の「## 未リリース」の直下に、次の形の行を足す",
    `       ${example}`,
    "  2. ローカルで確認する:  npm run check:changelog",
    "  3. コミットして push すると、このチェックが再実行される",
  ].join("\n");
  console.error(message);

  if (process.env.GITHUB_ACTIONS) {
    // PR の Checks 画面に注釈として出す。ジョブのサマリーにも全文を出す
    console.log(`::error title=changelog チェック::${reason.split("\n")[0]} CHANGELOG.md の「## 未リリース」に (#N) 付きで 1 行追加してください`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, "```\n" + message + "\n```\n");
    }
  }
  process.exitCode = 1;
}

function main() {
  const event = process.env.GITHUB_EVENT_NAME;
  if (event && event !== "pull_request") {
    console.log(`[SKIP] ${event} イベントでは確認しません（PR のときだけ）`);
    return;
  }

  // 比較元: origin/<base>。ローカルで origin がなければ <base>
  const baseBranch = process.env.GITHUB_BASE_REF || "main";
  const baseRef = [`origin/${baseBranch}`, baseBranch].find((ref) => git("rev-parse", "--verify", "--quiet", ref) !== null);
  if (!baseRef) {
    console.error(`[NG] 比較元のブランチ ${baseBranch} が見つかりません。git fetch origin ${baseBranch} を実行してください。`);
    process.exitCode = 1;
    return;
  }
  const mergeBase = git("merge-base", baseRef, "HEAD");
  if (!mergeBase) {
    console.error(`[NG] ${baseRef} と HEAD の共通の祖先が見つかりません。git fetch origin ${baseBranch} を実行してください。`);
    process.exitCode = 1;
    return;
  }
  const changed = (git("diff", "--name-only", mergeBase, "HEAD") ?? "").split("\n").filter(Boolean);
  if (changed.length === 0) {
    console.log(`[OK] ${baseRef} との差分がありません（確認するものがありません）`);
    return;
  }

  // この PR が閉じる Issue（PR 本文とコミットメッセージの Closes #N）
  const prBody = process.env.PR_BODY ?? "";
  const commitMessages = git("log", "--format=%B", `${mergeBase}..HEAD`) ?? "";
  const linked = findLinkedIssues(`${prBody}\n${commitMessages}`);

  if (!changed.includes(CHANGELOG)) {
    return fail(`この PR では ${CHANGELOG} が変更されていません。`, linked);
  }
  const headText = fs.readFileSync(path.join(ROOT, CHANGELOG), "utf8");
  const baseText = git("show", `${mergeBase}:${CHANGELOG}`) ?? "";
  const headSection = extractUnreleased(headText);
  if (!headSection) {
    return fail(`${CHANGELOG} に「## 未リリース」の見出しがありません。`, linked);
  }
  const baseBullets = new Set(bullets(extractUnreleased(baseText) ?? []));
  const added = bullets(headSection).filter((line) => !baseBullets.has(line));
  if (added.length === 0) {
    return fail("「## 未リリース」に新しい行（- で始まる箇条書き）が増えていません。", linked);
  }
  const withRef = added.filter((line) => issueRefs(line).length > 0);
  if (withRef.length === 0) {
    return fail(`増えた行に Issue 番号 (#N) がありません:\n${added.map((l) => `    ${l}`).join("\n")}`, linked);
  }
  if (linked.length > 0 && !withRef.some((line) => issueRefs(line).some((n) => linked.includes(n)))) {
    const want = linked.map((n) => `#${n}`).join(", ");
    return fail(`増えた行の Issue 番号が、この PR が閉じる Issue（${want}）と一致しません:\n${withRef.map((l) => `    ${l}`).join("\n")}`, linked);
  }

  console.log("[OK] changelog チェック: 「## 未リリース」に次の行が追加されています");
  for (const line of withRef) console.log(`    ${line}`);
}

// `node scripts/check-changelog.js` として直接実行されたときだけ動く（テストから import しても動かない）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
