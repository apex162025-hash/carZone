import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  
  // Normalize any nested shared asset/module requests to the root /shared directory
  if (urlPath.includes("/shared/")) {
    urlPath = "/shared/" + urlPath.split("/shared/")[1];
  }

  let filePath = path.join(__dirname, urlPath);

  // If path is directory, ensure trailing slash for relative resolution, then look for index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    if (!urlPath.endsWith("/")) {
      res.writeHead(301, { Location: urlPath + "/" + (req.url.includes("?") ? "?" + req.url.split("?")[1] : "") });
      res.end();
      return;
    }
    filePath = path.join(filePath, "index.html");
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found: " + urlPath);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Carzen Server started successfully on port ${PORT}`);
  console.log(`- Hub:            http://localhost:${PORT}/`);
  console.log(`- Customer App:   http://localhost:${PORT}/customer/`);
  console.log(`- Wash App:       http://localhost:${PORT}/wash/dashboard/  (owner / manager / employee)`);
  console.log(`- Registration:   http://localhost:${PORT}/wash/register/`);
  console.log(`- Platform Admin: http://localhost:${PORT}/admin/`);
});
