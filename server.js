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

  // Handle Wallpaper / Homescreen Upload API
  if (req.method === "POST" && (pathname === "/api/wallpaper" || pathname === "/api/homescreen")) {
    const filename = pathname === "/api/homescreen" ? "custom_homescreen.jpg" : "custom_wallpaper.jpg";
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
          const targetPath = path.join(PUBLIC_DIR, filename);
          fs.writeFileSync(targetPath, buffer);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, url: "/" + filename + "?t=" + Date.now() }));
          return;
        }
      } catch (err) {
        console.error("Error saving image:", err);
      }
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Failed to process image" }));
    });
    return;
  }

  // Handle Groq Whisper Audio Transcription API
  if (req.method === "POST" && pathname === "/api/transcribe") {
    const apiKey = req.headers["x-groq-key"] || process.env.GROQ_API_KEY;
    if (!apiKey) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Missing Groq API Key" }));
      return;
    }

    let bodyBuffers = [];
    req.on("data", chunk => bodyBuffers.push(chunk));
    req.on("end", async () => {
      try {
        const audioBuffer = Buffer.concat(bodyBuffers);
        if (!audioBuffer || audioBuffer.length < 500) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "Audio buffer too small" }));
          return;
        }

        const contentType = req.headers["content-type"] || "audio/mp4";
        const mimeType = contentType.includes(";") ? contentType.split(";")[0] : contentType;
        const extension = mimeType.includes("webm") ? "webm" : (mimeType.includes("wav") ? "wav" : "mp4");

        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: mimeType });
        formData.append("file", blob, `audio.${extension}`);
        formData.append("model", "whisper-large-v3-turbo");
        formData.append("language", "en");
        formData.append("response_format", "json");

        const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey.trim()}`
          },
          body: formData
        });

        if (!groqRes.ok) {
          const errText = await groqRes.text();
          console.error("Groq API error:", errText);
          res.writeHead(groqRes.status, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: errText }));
          return;
        }

        const data = await groqRes.json();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, text: data.text || "" }));
      } catch (err) {
        console.error("Transcription error:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  if (pathname === "/") pathname = "/index.html";

  const filePath = path.join(PUBLIC_DIR, pathname);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      const indexFile = path.join(filePath, "index.html");
      if (fs.existsSync(indexFile)) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
        fs.createReadStream(indexFile).pipe(res);
        return;
      }
    }

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
