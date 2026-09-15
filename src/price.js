/**
 * 金額計算ユーティリティ
 *
 * 仕様は test/price.test.js を正とする。
 */

// ---- 定数 -------------------------------------------------------------
// 金額計算で使う定数はこのブロックにまとめる。
// 新しい定数を追加するときも、ここに 1 つずつ増やす。

/** 消費税率（既定 10%） */
export const TAX_RATE = 0.1;

/** この金額以上で割引を適用する（円） */
export const DISCOUNT_THRESHOLD = 5000;

/** 割引率（10%） */
export const DISCOUNT_RATE = 0.1;

/** 送料（円） */
export const SHIPPING_FEE = 500;

/** この金額以上で送料無料になる（円） */
export const FREE_SHIPPING_THRESHOLD = 3000;

/**
 * クーポン定義（コード → 割引内容）
 * - type: "rate"   … 割引率で引く（value は割引率、端数は切り捨て）
 * - type: "amount" … 固定額で引く（value は割引額・円）
 */
export const COUPONS = {
  /** 10% 引き（端数は切り捨て） */
  WELCOME10: { type: "rate", value: 0.1 },
  /** 500 円引き */
  SAVE500: { type: "amount", value: 500 },
};

// ---- 関数 -------------------------------------------------------------

/**
 * 税込価格を返す。
 * 端数は切り捨て（1 円未満は切り捨てる）。
 *
 * @param {number} price 税抜価格（円）
 * @param {number} [rate=TAX_RATE] 税率（既定 10%）
 * @returns {number} 税込価格（円）
 */
export function calcTaxIncluded(price, rate = TAX_RATE) {
  return Math.floor(price * (1 + rate));
}

/**
 * 割引後の合計金額を返す。
 * 合計が 5,000 円以上なら 10% オフ、それ未満なら割引なし。
 *
 * @param {number} total 割引前の合計金額（円）
 * @returns {number} 割引後の合計金額（円）
 */
export function applyDiscount(total) {
  if (total >= DISCOUNT_THRESHOLD) {
    return Math.floor(total * (1 - DISCOUNT_RATE));
  }
  return total;
}

/**
 * 割引後の合計金額から送料を返す。
 * 合計が 3,000 円以上なら送料無料、それ未満なら 500 円。
 *
 * @param {number} total 割引後の合計金額（円、整数）
 * @returns {number} 送料（円）
 */
export function calcShipping(total) {
  return total >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

/**
 * クーポンコードを適用した割引後の金額を返す。
 * - "WELCOME10" … 10% 引き（端数は切り捨て）
 * - "SAVE500"   … 500 円引き
 * - それ以外の文字列、または code が省略されたとき … 割引なし
 * 割引後の金額は 0 円未満にならない（下限 0 円）。
 *
 * @param {number} total 割引前の合計金額（円、整数）
 * @param {string} [code] クーポンコード（省略可）
 * @returns {number} 割引後の金額（円、整数）
 */
export function applyCoupon(total, code) {
  // 未定義コードや省略時は割引なし（プロトタイプのプロパティ名を拾わないよう hasOwn で判定）
  if (typeof code !== "string" || !Object.hasOwn(COUPONS, code)) {
    return total;
  }

  const coupon = COUPONS[code];
  let discounted;
  if (coupon.type === "rate") {
    discounted = Math.floor(total * (1 - coupon.value));
  } else {
    discounted = total - coupon.value;
  }

  // 0 円未満にはしない
  return Math.max(0, discounted);
}
