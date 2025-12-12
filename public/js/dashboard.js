// =====================================================
//  AUTO API BASE URL (LOCAL → localhost, PROD → Render)
// =====================================================
const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://boltic.onrender.com";

console.log("API Base →", API_BASE);

// =====================================================
//  GLOBAL STATE
// =====================================================
let latestData = [];
let monitoredUrls = [];

// Cyber-futuristic rotating icons
const siteIcons = [
  "fa-microchip",
  "fa-wave-square",
  "fa-database",
  "fa-code-branch",
  "fa-chart-line"
];

function iconForIndex(i) {
  return siteIcons[i % siteIcons.length];
}

// =====================================================
//  RENDER HOME (all websites)
// =====================================================
function renderHome() {
  updateCards(latestData);
  updateDock(latestData);
}

// =====================================================
//  CARD SYSTEM (FAST, NO FLICKER)
// =====================================================
function updateCards(data) {
  const grid = document.getElementById("main-content");
  const existingCards = grid.querySelectorAll(".card");

  if (existingCards.length !== data.length) {
    grid.innerHTML = "";
    data.forEach((item, idx) => buildCard(grid, item, idx));
    if (typeof initTilt === "function") initTilt();
    return;
  }

  data.forEach((item, idx) =>
    updateExistingCard(existingCards[idx], item, idx)
  );
}

function buildCard(grid, item, idx) {
  const status = item.status || "WAIT";
  const isUp = status === "UP";
  const color = isUp ? "#00E88F" : "#ff5f56";

  const latencyTxt = item.latency ? item.latency + "s" : "N/A";
  const codeTxt = item.code ?? "-";
  const timestamp = item.timestamp ?? "-";

  grid.insertAdjacentHTML(
    "beforeend",
    `
    <div class="card" style="animation: popUp .4s ease forwards ${idx * 0.06}s;">
        <div class="card-title"><i class="fa ${iconForIndex(idx)}"></i> ${
      item.url
    }</div>

        <div class="card-content" style="color:${color};">${status}</div>

        <div class="card-desc">
            <span class="status-pill ${
              isUp ? "status-up" : "status-down"
            }">
                ${
                  isUp
                    ? '<i class="fa fa-check"></i> UP'
                    : '<i class="fa fa-times"></i> DOWN'
                }
            </span>

            <br><br>
            Latency: <strong class="latency">${latencyTxt}</strong><br>
            HTTP: <strong class="code">${codeTxt}</strong><br>
            Updated: <strong class="timestamp">${timestamp}</strong>
        </div>
    </div>
    `
  );
}

function updateExistingCard(card, item) {
  if (!card) return;

  const status = item.status || "WAIT";
  const isUp = status === "UP";
  const latencyTxt = item.latency ? item.latency + "s" : "N/A";
  const codeTxt = item.code ?? "-";
  const timestamp = item.timestamp ?? "-";
  const color = isUp ? "#00E88F" : "#ff5f56";

  card.querySelector(".card-content").style.color = color;
  card.querySelector(".card-content").innerText = status;

  const pill = card.querySelector(".status-pill");
  pill.className = `status-pill ${isUp ? "status-up" : "status-down"}`;
  pill.innerHTML = isUp
    ? '<i class="fa fa-check"></i> UP'
    : '<i class="fa fa-times"></i> DOWN';

  card.querySelector(".latency").innerText = latencyTxt;
  card.querySelector(".code").innerText = codeTxt;
  card.querySelector(".timestamp").innerText = timestamp;
}

// =====================================================
//  DOCK (Sidebar icons)
// =====================================================
function updateDock(data) {
  const dock = document.getElementById("dock");
  dock.innerHTML = "";

  const homeBtn = document.createElement("div");
  homeBtn.className = "dock-icon active";
  homeBtn.innerHTML = `<i class="fa fa-house"></i><span class="dock-tooltip">Home</span>`;
  homeBtn.onclick = () => {
    dock.querySelectorAll(".dock-icon").forEach((d) =>
      d.classList.remove("active")
    );
    homeBtn.classList.add("active");
    renderHome();
  };
  dock.appendChild(homeBtn);

  data.forEach((item, idx) => {
    const wrapper = document.createElement("div");
    wrapper.className = "dock-icon";
    wrapper.innerHTML = `
      <i class="fa ${iconForIndex(idx)}"></i>
      <span class="dock-tooltip">${item.url}</span>
    `;
    wrapper.onclick = () => {
      dock.querySelectorAll(".dock-icon").forEach((d) =>
        d.classList.remove("active")
      );
      wrapper.classList.add("active");
      updateCards([item]);
    };
    dock.appendChild(wrapper);
  });
}

// =====================================================
//  FETCH DATA FROM BACKEND
// =====================================================
async function fetchDataFromServer() {
  try {
    const r = await fetch(`${API_BASE}/data`);
    const j = await r.json();

    if (j.ok && Array.isArray(j.data)) {
      latestData = j.data;
      monitoredUrls = latestData.map((x) => x.url);
      document.getElementById("server-status").innerText = "online";
      return true;
    }
    return false;
  } catch (err) {
    document.getElementById("server-status").innerText = "offline";
    return false;
  }
}

// =====================================================
//  POLLING SYSTEM
// =====================================================
async function pollAndRender() {
  const ok = await fetchDataFromServer();

  if (window.TERMINAL_IS_BUSY) return;

  if (!ok && latestData.length === 0) {
    monitoredUrls = ["https://google.com", "https://github.com"];
    latestData = monitoredUrls.map((u) => ({
      url: u,
      status: "WAIT",
      latency: null,
      code: null,
      timestamp: new Date().toLocaleString()
    }));
  }

  renderHome();
}

// Auto-start polling
window.addEventListener("load", () => {
  setTimeout(() => pollAndRender(), 400);
  setInterval(pollAndRender, 5000);
});

// Export for terminal.js
window.pollAndRender = pollAndRender;
window.updateCards = updateCards;
window.updateDock = updateDock;
