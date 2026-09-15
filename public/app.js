/**
 * 注文確認ページの表示ロジック。
 *
 * src/ の関数をブラウザから直接 import する（ビルド工程なし）。
 * "../src/…" は public/ から見た相対パスで、dev サーバーが /src/ をリポジトリ直下から配信する。
 */
import { calcTaxIncluded, calcShipping, applyCoupon, COUPONS } from "../src/price.js";
// 日付の表示に使う。datetime 属性は formatDate、画面の文字は formatDateJa
import { formatDate, formatDateJa } from "../src/date.js";

/** 注文内容（数量と税抜単価） */
const ORDER_ITEMS = [
  { name: "ノート（A5・方眼）", qty: 2, unitPrice: 350 },
  { name: "ボールペン（黒・0.5mm）", qty: 4, unitPrice: 150 },
  { name: "トートバッグ（キャンバス）", qty: 1, unitPrice: 2000 },
];

/** 初期状態で適用されているクーポンコード */
const INITIAL_COUPON_CODE = "WELCOME10";

/** お届け予定日は注文日の何日後か */
const DELIVERY_DAYS = 3;

/** 金額を「3,817 円」の形にする */
function yen(amount) {
  return `${amount.toLocaleString("ja-JP")} 円`;
}

/** 小計・割引・送料・税込合計をまとめて計算する */
function calcOrder(items, couponCode) {
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const discounted = applyCoupon(subtotal, couponCode);
  const shipping = calcShipping(discounted);
  return {
    subtotal,
    discount: subtotal - discounted,
    shipping,
    total: calcTaxIncluded(discounted + shipping),
  };
}

/** 商品テーブルの行を描く。数値のセルには col-num を付ける */
function renderItems(items) {
  document.getElementById("items-body").innerHTML = items
    .map(
      (item) => `
    <tr>
      <td>${item.name}</td>
      <td class="col-num">${item.qty}</td>
      <td class="col-num">${yen(item.unitPrice)}</td>
      <td class="col-num">${yen(item.qty * item.unitPrice)}</td>
    </tr>`,
    )
    .join("");
}

/** お支払い金額の各行を描く */
function renderSummary(order, couponCode) {
  const hasCoupon = typeof couponCode === "string" && Object.hasOwn(COUPONS, couponCode);
  document.getElementById("coupon-code").textContent = hasCoupon ? couponCode : "なし";
  document.getElementById("subtotal").textContent = yen(order.subtotal);
  document.getElementById("discount").textContent = order.discount === 0 ? "0 円" : `−${yen(order.discount)}`;
  document.getElementById("shipping").textContent = order.shipping === 0 ? "無料" : yen(order.shipping);
  document.getElementById("total").textContent = yen(order.total);
}

/** お届け予定日を描く。datetime 属性は機械が読む YYYY-MM-DD、表示は日本語 */
function renderDelivery(orderedAt) {
  const date = new Date(orderedAt);
  date.setDate(date.getDate() + DELIVERY_DAYS);
  const el = document.getElementById("delivery-date");
  el.dateTime = formatDate(date);
  el.textContent = formatDateJa(date);
}

/** 画面全体を描き直す。クーポンを変えたときもこれを呼ぶ */
function render(couponCode) {
  renderItems(ORDER_ITEMS);
  renderSummary(calcOrder(ORDER_ITEMS, couponCode), couponCode);
}

// ---- 初期化 -------------------------------------------------------------
render(INITIAL_COUPON_CODE);
renderDelivery(new Date());
setupCouponForm();

// ---- クーポン入力欄（第3弾 Issue #2 で追加） -----------------------------

/** 入力欄と「適用」ボタンを初期化する。送信時にコードを検証して再計算する */
function setupCouponForm() {
  const form = document.getElementById("coupon-form");
  const input = document.getElementById("coupon-input");
  const message = document.getElementById("coupon-message");
  // 初期値は現在適用中のコード
  input.value = INITIAL_COUPON_CODE;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const code = input.value.trim();
    message.classList.remove("is-error");

    if (code === "") {
      message.textContent = "クーポンコードを入力してください";
      return;
    }
    if (Object.hasOwn(COUPONS, code)) {
      render(code);
      message.textContent = `クーポン「${code}」を適用しました`;
    } else {
      render(""); // クーポンなしで再計算（割引の行は「なし」になる）
      message.textContent = `クーポンコード「${code}」は使えません`;
      message.classList.add("is-error");
    }
  });
}
