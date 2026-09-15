// dev サーバーのスモークテスト。起動して / が 200 を返し、自動再読み込み用スクリプトが入っているか
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createDevServer, resolveFile } from "../scripts/dev-server.js";

describe("dev-server", () => {
  let server;
  let base;

  before(async () => {
    server = createDevServer();
    // ポート 0 = 空いているポートを OS が選ぶ（他のテストや本物の dev サーバーと衝突しない）
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  it("/ は 200 で HTML を返し、自動再読み込み用スクリプトが注入されている", async () => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /text\/html/);
    assert.equal(res.headers.get("cache-control"), "no-store");
    const html = await res.text();
    assert.ok(html.includes('new EventSource("/__reload")'), "再読み込み用スクリプトが入っていない");
    assert.ok(html.includes('<script type="module" src="/app.js">'), "app.js の読み込みがない");
  });

  it("/src/price.js は text/javascript で配信される（module として import できる）", async () => {
    const res = await fetch(`${base}/src/price.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /text\/javascript/);
    assert.ok((await res.text()).includes("export function calcShipping"));
  });

  it("存在しないパスは 404", async () => {
    const res = await fetch(`${base}/nothing.txt`);
    assert.equal(res.status, 404);
  });

  it("public/ と src/ の外は配信しない", () => {
    assert.equal(resolveFile("/src/../package.json"), null);
    assert.equal(resolveFile("/../package.json"), null);
    assert.equal(resolveFile("/%E0%A4%A"), null); // 壊れたパーセントエンコードでも落ちない
  });
});
