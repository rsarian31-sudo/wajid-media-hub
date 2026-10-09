const $ = (id) => document.getElementById(id);
const statusBox = $("status");

function detectPlatform(raw) {
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
    if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.watch") return "Facebook";
    if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") return "YouTube";
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "TikTok";
    if (host === "instagram.com" || host.endsWith(".instagram.com")) return "Instagram";
    return "Other website";
  } catch {
    return null;
  }
}
function showStatus(message, type = "info") {
  statusBox.className = "status show " + type;
  statusBox.textContent = message;
}
function getHistory() {
  try { return JSON.parse(localStorage.getItem("wmh-history") || "[]"); }
  catch { return []; }
}
function saveHistory(url, platform) {
  const items = getHistory().filter(item => item.url !== url);
  items.unshift({ url, platform, time: Date.now() });
  localStorage.setItem("wmh-history", JSON.stringify(items.slice(0, 12)));
  renderHistory();
}
function renderHistory() {
  const box = $("history");
  const items = getHistory();
  box.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Your checked links will appear here.";
    box.append(empty);
    return;
  }
  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "historyitem";
    const platform = document.createElement("span");
    platform.textContent = item.platform;
    platform.style.fontWeight = "800";
    const link = document.createElement("span");
    link.className = "hurl";
    link.textContent = item.url;
    const open = document.createElement("button");
    open.type = "button";
    open.textContent = "↗";
    open.title = "Open link";
    open.setAttribute("aria-label", "Open " + item.platform + " link");
    open.addEventListener("click", () => window.open(item.url, "_blank", "noopener,noreferrer"));
    row.append(platform, link, open);
    box.append(row);
  });
}
const API_BASE = "https://wajid-media-api.rsarian31.workers.dev";

$("check").addEventListener("click", async () => {
  const url = $("url").value.trim();
  const platform = detectPlatform(url);
  if (!platform) {
    showStatus("Please paste a valid http:// or https:// link first.", "warn");
    return;
  }
  saveHistory(url, platform);
  if (platform === "Other website") {
    showStatus("This link is from another website. If it points directly to a media file, use the browser's open/download option when available.", "info");
    return;
  }

  const button = $("check");
  button.disabled = true;
  button.textContent = "Checking…";
  showStatus("Checking this link with WAJID MEDIA API…", "info");

  try {
    const response = await fetch(API_BASE + "/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      showStatus(result.error || "The API could not check this link. Please try again.", "warn");
      return;
    }

    if (result.recognized) {
      showStatus(result.platform + " link detected by WAJID MEDIA API. Download availability has not been verified; use the platform's official save/download option when available.", "warn");
    } else {
      showStatus("The API could not identify this platform. If the link points directly to a media file, use the browser's open/download option when available.", "info");
    }
  } catch {
    showStatus("Could not reach WAJID MEDIA API. Check your connection and try again.", "warn");
  } finally {
    button.disabled = false;
    button.textContent = "Check link ↗";
  }
});
$("url").addEventListener("keydown", event => {
  if (event.key === "Enter") $("check").click();
});
$("clear").addEventListener("click", () => {
  localStorage.removeItem("wmh-history");
  renderHistory();
});
$("localbtn").addEventListener("click", () => {
  const file = $("localfile").files[0];
  if (!file) {
    showStatus("Choose a video or audio file from your phone first.", "warn");
    return;
  }
  const objectUrl = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = file.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
  showStatus("Save requested for " + file.name + ". The original format is kept; MP3 conversion is not included yet.", "info");
});
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
renderHistory();
