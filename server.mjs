import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const port = process.env.PORT ? Number(process.env.PORT) : 4173;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function resolvePath(urlPath) {
  const normalized = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const candidate = path.resolve(root, normalized);
  if (!candidate.startsWith(root)) {
    return null;
  }
  return candidate;
}

async function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const buffer = await fs.readFile(filePath);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(buffer);
}

async function requestHandler(req, res) {
  const urlPath = req.url || "/";
  const target = resolvePath(urlPath);

  if (!target) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  try {
    const stats = await fs.stat(target).catch(() => null);

    if (stats?.isFile()) {
      await serveFile(target, res);
      return;
    }

    if (stats?.isDirectory()) {
      await serveFile(path.join(target, "index.html"), res);
      return;
    }

    if (!path.extname(target)) {
      await serveFile(path.join(root, "index.html"), res);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Server error: ${error.message}`);
  }
}

http.createServer(requestHandler).listen(port, () => {
  console.log(`Токи23 is running at http://localhost:${port}`);
});
