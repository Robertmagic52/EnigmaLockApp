"use strict";

// In-memory clue storage across serverless warm invocations (or kv/poll)
let globalClue = global._enigmaClue || { word: null, letter: null, timestamp: 0 };
global._enigmaClue = globalClue;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // 1. GET request: either check latest clue or send a clue via query param (?word=gun)
  if (req.method === "GET") {
    const parsedUrl = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const wordParam = parsedUrl.searchParams.get("word") || parsedUrl.searchParams.get("text") || parsedUrl.searchParams.get("w");

    if (wordParam) {
      // Shortcut sent clue via GET: e.g. /api/clue?word=gun
      const clean = wordParam.trim();
      const firstLetter = clean[0].toUpperCase();
      global._enigmaClue = {
        word: clean,
        letter: firstLetter,
        timestamp: Date.now()
      };
      res.status(200).json({ ok: true, word: clean, letter: firstLetter });
      return;
    }

    // Otherwise, phone is checking for the latest clue
    const since = parseInt(parsedUrl.searchParams.get("since") || "0", 10);
    if (global._enigmaClue.timestamp > since) {
      res.status(200).json({ ok: true, clue: global._enigmaClue });
    } else {
      res.status(200).json({ ok: true, clue: null });
    }
    return;
  }

  // 2. POST request: Shortcut sends JSON { "word": "gun" } or plain text
  if (req.method === "POST") {
    let body = [];
    for await (const chunk of req) {
      body.push(chunk);
    }
    const raw = Buffer.concat(body).toString().trim();
    let word = "";

    try {
      const parsed = JSON.parse(raw);
      word = parsed.word || parsed.text || parsed.clue || "";
    } catch (e) {
      word = raw;
    }

    if (!word) {
      res.status(400).json({ ok: false, error: "Missing word" });
      return;
    }

    const clean = word.trim();
    const firstLetter = clean[0].toUpperCase();
    global._enigmaClue = {
      word: clean,
      letter: firstLetter,
      timestamp: Date.now()
    };

    res.status(200).json({ ok: true, word: clean, letter: firstLetter });
    return;
  }

  res.status(405).json({ ok: false, error: "Method not allowed" });
};
