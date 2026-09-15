// 日付フォーマットのテスト
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatDate, formatDateJa } from "../src/date.js";

describe("formatDate", () => {
  it("2026 年 1 月 5 日 → 2026-01-05（月・日はゼロ埋め）", () => {
    assert.equal(formatDate(new Date(2026, 0, 5)), "2026-01-05");
  });

  it("2026 年 12 月 25 日 → 2026-12-25", () => {
    assert.equal(formatDate(new Date(2026, 11, 25)), "2026-12-25");
  });

  it("2026 年 9 月 11 日 → 2026-09-11", () => {
    assert.equal(formatDate(new Date(2026, 8, 11)), "2026-09-11");
  });
});

describe("formatDateJa", () => {
  it("2026 年 9 月 13 日 → 2026年9月13日", () => {
    assert.equal(formatDateJa(new Date(2026, 8, 13)), "2026年9月13日");
  });

  it("2026 年 1 月 5 日 → 2026年1月5日（月・日はゼロ埋めしない）", () => {
    assert.equal(formatDateJa(new Date(2026, 0, 5)), "2026年1月5日");
  });

  it("2026 年 12 月 25 日 → 2026年12月25日", () => {
    assert.equal(formatDateJa(new Date(2026, 11, 25)), "2026年12月25日");
  });
});
