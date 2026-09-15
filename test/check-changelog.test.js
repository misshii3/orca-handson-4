// CHANGELOG チェックの部品のテスト（git を使わない純粋な関数だけ）
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractUnreleased, bullets, findLinkedIssues, issueRefs } from "../scripts/check-changelog.js";

describe("extractUnreleased", () => {
  it("「## 未リリース」から次の ## 見出しの手前までを返す（### は節の中身として残す）", () => {
    const text = "# 変更履歴\n\n## 未リリース\n\n### 追加\n- 残額表示 (#1)\n\n## 0.3.0 - 2026-09-15\n- 古い行\n";
    assert.deepEqual(bullets(extractUnreleased(text)), ["- 残額表示 (#1)"]);
  });

  it("見出しがなければ null", () => {
    assert.equal(extractUnreleased("# 変更履歴\n\n## 0.3.0\n- x\n"), null);
  });
});

describe("findLinkedIssues", () => {
  it("Closes #1 / fixes #12 / Resolves: #3 を拾い、重複は 1 つにする", () => {
    assert.deepEqual(findLinkedIssues("Closes #1\nfixes #12\nResolves: #3\ncloses #1"), [1, 12, 3]);
  });
});

describe("issueRefs", () => {
  it("(#1) は拾い、# だけの #2 や「Issue #3」は拾わない", () => {
    assert.deepEqual(issueRefs("- 残額表示 (#1) と #2 と Issue #3"), [1]);
  });
});
