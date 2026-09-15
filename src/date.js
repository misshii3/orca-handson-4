/**
 * 日付フォーマットユーティリティ
 *
 * 仕様は test/date.test.js を正とする。
 */

/**
 * Date を "YYYY-MM-DD" 形式の文字列にする。
 * 月・日は 2 桁ゼロ埋め。
 *
 * @param {Date} date 対象の日付
 * @returns {string} "YYYY-MM-DD"
 */
export function formatDate(date) {
  const year = date.getFullYear();
  // getMonth() は 0 始まり（1 月が 0）なので +1 する
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Date を "YYYY年M月D日" 形式の日本語文字列にする。
 * 月・日はゼロ埋めしない（例: 2026年1月5日）。
 *
 * @param {Date} date 対象の日付
 * @returns {string} "YYYY年M月D日"
 */
export function formatDateJa(date) {
  const year = date.getFullYear();
  // getMonth() は 0 始まり（1 月が 0）なので +1 する
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}
