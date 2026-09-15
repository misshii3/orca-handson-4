// 金額計算のテスト
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcTaxIncluded, applyDiscount, calcShipping, applyCoupon } from "../src/price.js";

describe("calcTaxIncluded", () => {
  it("1000 円の税込（10%）は 1100 円", () => {
    assert.equal(calcTaxIncluded(1000), 1100);
  });

  it("端数は切り捨てる: 999 円 → 1098 円（1098.9 の切り捨て）", () => {
    assert.equal(calcTaxIncluded(999), 1098);
  });

  it("税率を指定できる: 1000 円 × 8% → 1080 円", () => {
    assert.equal(calcTaxIncluded(1000, 0.08), 1080);
  });
});

describe("applyDiscount", () => {
  it("4999 円は割引なし", () => {
    assert.equal(applyDiscount(4999), 4999);
  });

  it("ちょうど 5000 円は 10% オフで 4500 円", () => {
    assert.equal(applyDiscount(5000), 4500);
  });

  it("8000 円は 10% オフで 7200 円", () => {
    assert.equal(applyDiscount(8000), 7200);
  });
});

describe("calcShipping", () => {
  it("1000 円の送料は 500 円", () => {
    assert.equal(calcShipping(1000), 500);
  });

  it("2999 円の送料は 500 円", () => {
    assert.equal(calcShipping(2999), 500);
  });

  it("ちょうど 3000 円は送料無料", () => {
    assert.equal(calcShipping(3000), 0);
  });

  it("8000 円は送料無料", () => {
    assert.equal(calcShipping(8000), 0);
  });
});

describe("applyCoupon", () => {
  it("WELCOME10: 1000 円は 10% 引きで 900 円", () => {
    assert.equal(applyCoupon(1000, "WELCOME10"), 900);
  });

  it("WELCOME10: 端数は切り捨てる: 999 円 → 899 円（899.1 の切り捨て）", () => {
    assert.equal(applyCoupon(999, "WELCOME10"), 899);
  });

  it("SAVE500: 1000 円は 500 円引きで 500 円", () => {
    assert.equal(applyCoupon(1000, "SAVE500"), 500);
  });

  it("SAVE500: 300 円は 0 円未満にせず 0 円", () => {
    assert.equal(applyCoupon(300, "SAVE500"), 0);
  });

  it("未知のコード UNKNOWN は割引なしで 1000 円", () => {
    assert.equal(applyCoupon(1000, "UNKNOWN"), 1000);
  });

  it("コード省略時は割引なしで 1000 円", () => {
    assert.equal(applyCoupon(1000), 1000);
  });
});
