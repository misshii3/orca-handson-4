#!/usr/bin/env node
/**
 * ハンズオン用の簡易 dev サーバー（依存パッケージなし・Node 20 以上）
 *
 * - public/ と src/ を配信する（src/ はブラウザから <script type="module"> で直接 import する）
 * - public/ と src/ のファイルが変わると、開いているブラウザを自動で再読み込みする（SSE）
 * - PORT 環境変数で待受ポートを変えられる（既定 3000。2 本目のワークツリーでは PORT=3001 npm run dev）
 *
 * 使い方（リポジトリのルートで）:
 *   npm run dev
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** リポジトリのルート（このファイルの 1 つ上） */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const SRC_DIR = path.join(ROOT, "src");

/** 拡張子 → Content-Type。ES module は text/javascript でないとブラウザが読み込みを拒否する */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

/** HTML に注入する自動再読み込み用スクリプト。/__reload に SSE で接続し、reload イベントが来たら再読み込みする */
export const RELOAD_SCRIPT =
  '<script>new EventSource("/__reload").addEventListener("reload", () => location.reload());</script>';

/**
 * URL のパスを、配信するファイルの絶対パスに変換する。
 * public/ と src/ の外を指すパス（/../package.json など）は null を返して配信しない。
 *
 * @param {string} urlPath URL のパス部分（例: "/", "/style.css", "/src/price.js"）
 * @returns {string | null} ファイルの絶対パス。配信してはいけないパスなら null
 */
export function resolveFile(urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (rel === "/") rel = "/index.html";
  // /src/ だけはリポジトリ直下の src/ から、それ以外は public/ から配信する
  const base = rel.startsWith("/src/") ? ROOT : PUBLIC_DIR;
  const filePath = path.normalize(path.join(base, rel));
  const allowed = [PUBLIC_DIR, SRC_DIR].some((dir) => filePath.startsWith(dir + path.sep));
  return allowed ? filePath : null;
}

/**
 * dev サーバーを作って返す（listen はしない）。
 * テストから import して、空いているポートで起動できるようにするため分けている。
 *
 * @returns {http.Server}
 */
export function createDevServer() {
  /** 再読み込み通知を待っているブラウザ（SSE 接続）の集合 */
  const clients = new Set();

  const server = http.createServer((req, res) => {
    const { pathname } = new URL(req.url, "http://localhost");

    // ブラウザからの SSE 接続。つないだままにして、ファイルが変わったら reload イベントを送る
    if (pathname === "/__reload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      });
      res.write(": connected\n\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    const filePath = resolveFile(pathname);
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath);
    let body = fs.readFileSync(filePath);
    if (ext === ".html") {
      // </body> の直前に自動再読み込み用スクリプトを差し込む
      const html = body.toString("utf8");
      body = Buffer.from(
        html.includes("</body>") ? html.replace("</body>", `${RELOAD_SCRIPT}\n</body>`) : html + RELOAD_SCRIPT,
      );
    }
    res.writeHead(200, {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Length": body.length,
      // 常に最新のファイルを返す（ブラウザにキャッシュさせない）
      "Cache-Control": "no-store",
    });
    res.end(body);
  });

  // ファイルの変更を監視する。エディタやエージェントの保存は 1 回で複数イベントになることがあるので 100ms まとめる
  let timer;
  const watchers = [PUBLIC_DIR, SRC_DIR].map((dir) =>
    fs.watch(dir, (_eventType, filename) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        console.log(`変更を検知: ${path.basename(dir)}/${filename ?? "(不明)"} → ブラウザを再読み込みします`);
        for (const res of clients) res.write("event: reload\ndata: 1\n\n");
      }, 100);
    }),
  );

  // サーバーを閉じるときに監視も止める（テストの子プロセスが終われるように）
  server.on("close", () => {
    clearTimeout(timer);
    for (const watcher of watchers) watcher.close();
    for (const res of clients) res.end();
    clients.clear();
  });

  return server;
}

// `node scripts/dev-server.js` として直接実行されたときだけ起動する（テストから import しても起動しない）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  const server = createDevServer();

  server.on("error", (err) => {
    if (err.code !== "EADDRINUSE") throw err;
    console.error(`エラー: ポート ${port} はすでに使われています（別のワークツリーの dev サーバーかもしれません）。`);
    console.error(`別のポートで起動するには:  PORT=${port + 1} npm run dev`);
    process.exit(1);
  });

  // host を省略して IPv4 / IPv6 の両方で待つ（localhost が ::1 に解決されても届く）
  server.listen(port, () => {
    console.log(`dev サーバーを起動しました: http://localhost:${port}`);
    console.log(`配信ディレクトリ: ${ROOT}`);
    console.log("public/ と src/ の変更を監視中。Ctrl+C で停止します。");
  });
}
