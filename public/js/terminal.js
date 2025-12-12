// ==============================
//  TERMINAL SYSTEM
// ==============================

// Reuse API_BASE from dashboard.js
// (Make sure <script src="dashboard.js"> loads before this file)

// Terminal element
let termBody = document.getElementById("terminal-body");

// Fallback if DOM wasn't ready yet
if (!termBody) {
    document.addEventListener("DOMContentLoaded", () => {
        termBody = document.getElementById("terminal-body");
    });
}

function focusInput() {
    const el = document.querySelector(".input-area:not([disabled])");
    if (el) el.focus();
}

window.TERMINAL_IS_BUSY = false;

// Intro boot sequence
const introLines = [
    "booting system…",
    "loading modules… OK",
    "initializing uptime-engine…",
    "ready.",
    "type 'help' for commands"
];

let introIndex = 0;

function typeIntro() {
    if (!termBody) return;

    if (introIndex < introLines.length) {
        const div = document.createElement("div");
        div.innerHTML = `<span style="color:#00E88F">➜</span> ${introLines[introIndex]}`;
        termBody.appendChild(div);
        introIndex++;

        termBody.scrollTop = termBody.scrollHeight;
        setTimeout(typeIntro, 250);
    } else {
        createInputLine();
    }
}

setTimeout(typeIntro, 400);

// ==============================
//  INPUT LINE CREATOR
// ==============================
function createInputLine() {
    termBody = document.getElementById("terminal-body");
    if (!termBody) return;

    const line = document.createElement("div");
    line.className = "command-line";

    line.innerHTML = `
        <span class="prompt">devchandansr@boltic:~/uptime$</span>
        <input class="input-area" type="text" spellcheck="false" />
    `;

    termBody.appendChild(line);
    termBody.scrollTop = termBody.scrollHeight;

    const input = line.querySelector(".input-area");

    setTimeout(() => input.focus(), 30);
    window.TERMINAL_IS_BUSY = true;

    input.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
            const cmd = input.value.trim();
            input.disabled = true;
            window.TERMINAL_IS_BUSY = false;

            await handleCommand(cmd);
        }
    });
}

// ==============================
//  TERMINAL COMMAND HANDLER
// ==============================
async function handleCommand(cmd) {
    let out = "";

    if (!cmd) return createInputLine();

    const lower = cmd.toLowerCase();

    // ---------------- HELP ----------------
    if (lower === "help") {
        out = `
Available commands:
  • help
  • list
  • add <url>
  • remove <url>
  • status
  • clear
`;
    }

    // ---------------- CLEAR ----------------
    else if (lower === "clear") {
        termBody.innerHTML = "";
        return createInputLine();
    }

    // ---------------- LIST ----------------
    else if (lower === "list") {
        try {
            const r = await fetch(`${API_BASE}/list`);
            const j = await r.json();

            if (j.ok && j.data.length > 0) {
                out = j.data.map((u, i) => `${i + 1}. ${u}`).join("\n");
            } else {
                out = "No websites monitored.";
            }
        } catch {
            out = "Error: server offline.";
        }
    }

    // ---------------- ADD ----------------
    else if (lower.startsWith("add ")) {
        const url = cmd.substring(4).trim();

        if (!url.startsWith("http")) {
            out = "Error: URL must begin with http:// or https://";
        } else {
            try {
                const r = await fetch(`${API_BASE}/add`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url })
                });

                const j = await r.json();

                if (j.ok) {
                    out = `Added → ${url}\nMonitoring will update shortly.`;
                    window.monitoredUrls = j.data;
                    pollAndRender();   // refresh dashboard
                } else {
                    out = "Error adding website.";
                }
            } catch {
                out = "Server not reachable.";
            }
        }
    }

    // ---------------- REMOVE ----------------
    else if (lower.startsWith("remove ")) {
        const url = cmd.substring(7).trim();

        try {
            const r = await fetch(`${API_BASE}/remove`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url })
            });

            const j = await r.json();

            if (j.ok) {
                out = `Removed → ${url}`;
                window.monitoredUrls = j.data;
                pollAndRender();
            } else {
                out = "Unable to remove. Invalid or unknown URL.";
            }
        } catch {
            out = "Server not reachable.";
        }
    }

    // ---------------- STATUS ----------------
    else if (lower === "status") {
        if (!window.latestData?.length) {
            out = "No data yet. Wait 5 seconds.";
        } else {
            out = "[STATUS REPORT]\n\n";
            window.latestData.forEach((item) => {
                out += `${item.url}\n  status: ${item.status}\n  latency: ${item.latency}s\n  code: ${item.code}\n\n`;
            });
        }
    }

    // ---------------- UNKNOWN ----------------
    else {
        out = `Unknown command: ${cmd}\nType 'help' for available commands.`;
    }

    // Print output
    const block = document.createElement("div");
    block.className = "output";
    block.innerText = out;

    termBody.appendChild(block);
    termBody.scrollTop = termBody.scrollHeight;

    createInputLine();
}
