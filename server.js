"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3400;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;

  // Handle Wallpaper Upload API
  if (req.method === "POST" && pathname === "/api/wallpaper") {
    let body = [];
    req.on("data", chunk => body.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(body).toString();
        let buffer;
        if (raw.startsWith("data:image")) {
          const base64Data = raw.replace(/^data:image\/\w+;base64,/, "");
          buffer = Buffer.from(base64Data, "base64");
        } else {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.image) {
              const base64Data = parsed.image.replace(/^data:image\/\w+;base64,/, "");
              buffer = Buffer.from(base64Data, "base64");
            }
          } catch (e) {
            buffer = Buffer.concat(body);
          }
        }

        if (buffer && buffer.length > 0) {
          const targetPath = path.join(PUBLIC_DIR, "custom_wallpaper.jpg");
          fs.writeFileSync(targetPath, buffer);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, url: "/custom_wallpaper.jpg?t=" + Date.now() }));
          return;
        }
      } catch (err) {
        console.error("Error saving wallpaper:", err);
      }
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Failed to process image" }));
    });
    return;
  }

  if (pathname === "/") pathname = "/index.html";

  const filePath = path.join(PUBLIC_DIR, pathname);

  // Security check: stay inside public dir
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache"
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`🔮 Enigma Lock Screen running on port ${PORT}`);
  console.log(`📱 Local Web App: http://localhost:${PORT}`);
});
