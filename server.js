const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
//    MIDDLEWARE
// ===============================
app.use(express.json());
app.use(cors({ origin: "*" }));
app.use(express.static(path.join(__dirname, "public")));

// ===============================
//    STATE (in-memory DB)
// ===============================
let monitored = [
  "https://kaily.ai",
  "https://boltic.io",
  "https://pixelbin.io",
  "https://glamar.io",
  "https://www.fynd.com"
];

let results = [];

// Your Boltic workflow webhook
const ALERT_WEBHOOK =
  "https://asia-south1.workflow.boltic.app/beafcc27-f073-43e8-9bbb-89e8bcb487cf";

// ===============================
//   URL CHECK FUNCTION
// ===============================
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
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      url,
      status: "DOWN",
      latency: null,
      code: err.response ? err.response.status : null,
      timestamp: new Date().toISOString()
    };
  }
}

// ===============================
//  SEND ALERT TO BOLTIC AUTOMATION
// ===============================
async function sendAlert(data) {
  try {
    await axios.post(ALERT_WEBHOOK, data, {
      headers: { "Content-Type": "application/json" }
    });
    console.log("⚠️ Sent alert for DOWN site:", data.url);
  } catch (err) {
    console.log("❌ Failed to send alert:", err.message);
  }
}

// ===============================
//   MAIN MONITOR LOOP (2 mins)
// ===============================
async function runChecks() {
  console.log("🔁 Running check cycle…");

  for (const url of monitored) {
    const r = await checkUrl(url);

    // Always send alert if DOWN
    if (r.status === "DOWN") {
      sendAlert(r);
    }

    // Update results array
    const idx = results.findIndex((x) => x.url === url);
    if (idx === -1) results.push(r);
    else results[idx] = r;
  }

  console.log("✅ Check cycle completed.");
}

// Run once on startup
runChecks();

// Run every 2 minutes
setInterval(runChecks, 120000);

// ===============================
//       API ENDPOINTS
// ===============================
app.get("/data", (req, res) => {
  return res.json({ ok: true, data: results });
});

app.get("/list", (req, res) => {
  return res.json({ ok: true, data: monitored });
});

// -------------------------------
// ADD URL (instant check + alert)
// -------------------------------
app.post("/add", async (req, res) => {
  let url = req.body.url;
  if (!url) return res.status(400).json({ ok: false, error: "URL missing" });

  if (!url.startsWith("http")) url = "https://" + url;

  if (!monitored.includes(url)) {
    monitored.push(url);

    // Immediately check the new website
    const r = await checkUrl(url);
    results.push(r);

    // Alert if DOWN
    if (r.status === "DOWN") sendAlert(r);

    console.log("➕ Added:", url);
  }

  return res.json({ ok: true, data: monitored });
});

// -------------------------------
// REMOVE URL
// -------------------------------
app.post("/remove", (req, res) => {
  const url = req.body.url;
  monitored = monitored.filter((u) => u !== url);
  results = results.filter((x) => x.url !== url);

  console.log("➖ Removed:", url);
  return res.json({ ok: true, data: monitored });
});

// -------------------------------
// SPA FRONTEND FALLBACK
// -------------------------------
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
//       START SERVER
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
