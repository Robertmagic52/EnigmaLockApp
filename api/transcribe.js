"use strict";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-groq-key");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const apiKey = req.headers["x-groq-key"] || process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(400).json({ 
      ok: false, 
      error: "Missing Groq API Key. Add GROQ_API_KEY to Vercel or paste it in Settings." 
    });
    return;
  }

  try {
    let bodyBuffers = [];
    for await (const chunk of req) {
      bodyBuffers.push(chunk);
    }
    const audioBuffer = Buffer.concat(bodyBuffers);

    if (!audioBuffer || audioBuffer.length < 500) {
      res.status(400).json({ ok: false, error: "Audio buffer too small" });
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
      res.status(groqRes.status).json({ ok: false, error: errText });
      return;
    }

    const data = await groqRes.json();
    res.status(200).json({ ok: true, text: data.text || "" });
  } catch (err) {
    console.error("Transcription error:", err);
    res.status(500).json({ ok: false, error: err.message || "Transcription failed" });
  }
};
