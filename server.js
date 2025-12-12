// server/server.js
const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// In-memory monitored list + latest results
let monitored = [
  "https://kaily.ai",
  "https://boltic.io",
  "https://pixelbin.io",
  "https://glamar.io",
  "https://www.fynd.com"
];

let results = []; // { url, status, latency, code, timestamp }

// Helper to normalize URLs
function normalizeUrl(input) {
  if (!input) return null;
  let url = input.trim();
  if (/^https?\./i.test(url)) url = url.replace(".", "://");
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    const parsed = new URL(url);
    return parsed.href;
  } catch (e) {
    return null;
  }
}

async function checkUrl(url) {
  try {
    const start = Date.now();
    const res = await axios.get(url, { timeout: 8000 });
    const latency = (Date.now() - start) / 1000;
    return {
      url,
      status: res.status === 200 ? "UP" : "DOWN",
      latency,
      code: res.status,
      timestamp: new Date().toLocaleString()
    };
  } catch (err) {
    return {
      url,
      status: "DOWN",
      latency: null,
      code: err.response ? err.response.status : null,
      timestamp: new Date().toLocaleString()
    };
  }
}

async function runChecks() {
  const arr = [];
  for (const url of monitored) {
    try {
      const r = await checkUrl(url);
      arr.push(r);
    } catch (e) {
      arr.push({
        url,
        status: "DOWN",
        latency: null,
        code: null,
        timestamp: new Date().toLocaleString()
      });
    }
  }
  results = monitored.map(u => arr.find(a => a.url === u) || { url: u, status: "DOWN", latency: null, code: null, timestamp: new Date().toLocaleString() });
}

runChecks();
setInterval(runChecks, 5000);

app.get("/data", (req, res) => {
  return res.json({ ok: true, data: results });
});

app.get("/list", (req, res) => {
  return res.json({ ok: true, data: monitored });
});

app.post("/add", (req, res) => {
  const raw = (req.body && req.body.url) || req.query.url;
  const normalized = normalizeUrl(raw);
  if (!normalized) return res.status(400).json({ ok: false, error: "Invalid URL" });
  if (!monitored.includes(normalized)) {
    monitored.push(normalized);
    checkUrl(normalized).then(r => {
      results = results.filter(x => x.url !== normalized).concat(r);
    }).catch(()=>{});
  }
  return res.json({ ok: true, data: monitored });
});

app.post("/remove", (req, res) => {
  const raw = (req.body && req.body.url) || req.query.url;
  const normalized = normalizeUrl(raw);
  if (!normalized) return res.status(400).json({ ok: false, error: "Invalid URL" });
  monitored = monitored.filter(u => u !== normalized);
  results = results.filter(r => r.url !== normalized);
  return res.json({ ok: true, data: monitored });
});

// regex fallback (safe for express v5)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
