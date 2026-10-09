const $ = (id) => document.getElementById(id);
const statusBox = $("status");
const API_BASE = "https://wajid-media-api.rsarian31.workers.dev";
let ffmpegInstance = null;

function detectPlatform(raw) {
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
    if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.watch") return "Facebook";
    if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") return "YouTube";
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "TikTok";
    if (host === "instagram.com" || host.endsWith(".instagram.com")) return "Instagram";
    return "Other website";
  } catch { return null; }
}
function showStatus(message, type = "info", actions = []) {
  statusBox.className = "status show " + type;
  statusBox.replaceChildren();
  const text = document.createElement("div");
  text.textContent = message;
  statusBox.append(text);
  if (actions.length) {
    const row = document.createElement("div");
    row.className = "status-actions";
    actions.forEach(({label, onClick, href}) => {
      if (href) {
        const a = document.createElement("a");
        a.className = "btn secondary status-action";
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = label;
        row.append(a);
      } else {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn secondary status-action";
        b.textContent = label;
        b.addEventListener("click", onClick);
        row.append(b);
      }
    });
    statusBox.append(row);
  }
}
function getHistory() {
  try { return JSON.parse(localStorage.getItem("wmh-history") || "[]"); } catch { return []; }
}
function saveHistory(url, platform) {
  const items = getHistory().filter(item => item.url !== url);
  items.unshift({url, platform, time: Date.now()});
  localStorage.setItem("wmh-history", JSON.stringify(items.slice(0, 12)));
  renderHistory();
}
function renderHistory() {
  const box = $("history");
  box.replaceChildren();
  const items = getHistory();
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
function isDirectMediaUrl(raw) {
  try {
    const path = new URL(raw).pathname.toLowerCase();
    return /\.(mp4|webm|mov|m4v|mp3|m4a|wav|ogg|oga|aac|flac)(?:$)/i.test(path);
  } catch { return false; }
}
function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
}
async function downloadDirectMedia(url) {
  const outputFormat = $("format").value;
  showStatus("Trying to fetch the direct media file…", "info");
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("HTTP " + response.status);
    const blob = await response.blob();
    const name = decodeURIComponent(new URL(url).pathname.split("/").pop() || "media-file");
    if (outputFormat !== "mp3") {
      downloadBlob(blob, name);
      showStatus("Download started. The source file format is kept. Check your phone's Downloads folder.", "success");
      return;
    }
    if (blob.size > 150 * 1024 * 1024) throw new Error("This file is over 150 MB; choose a smaller file or Original format.");
    const ffmpeg = await getFFmpeg();
    const inputName = "source-media";
    const outputName = "wajid-audio.mp3";
    showStatus("Converting the directly accessible media file to MP3. Keep this page open…", "info");
    await ffmpeg.writeFile(inputName, new Uint8Array(await blob.arrayBuffer()));
    await ffmpeg.exec(["-i", inputName, "-vn", "-codec:a", "libmp3lame", "-q:a", "2", outputName]);
    const data = await ffmpeg.readFile(outputName);
    downloadBlob(new Blob([data], {type:"audio/mpeg"}), name.replace(/\\.[^.]+$/, "") + ".mp3");
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
    showStatus("MP3 download started. Check your phone's Downloads folder.", "success");
  } catch (error) {
    const detail = error?.message || "The source blocks browser access (CORS) or needs permission.";
    showStatus("Could not download/convert this direct media URL. " + detail + " Social-platform page links are not direct media files; open the platform and use its official download option when available.", "warn", [{label:"Open source link", href:url}]);
  }
}
$("check").addEventListener("click", async () => {
  const url = $("url").value.trim();
  const platform = detectPlatform(url);
  if (!platform) return showStatus("Please paste a valid http:// or https:// link first.", "warn");
  saveHistory(url, platform);

  if (isDirectMediaUrl(url)) {
    const label = $("format").value === "mp3" ? "Download audio (MP3)" : "Download media file";
    showStatus("This looks like a direct media-file link. Choose MP3 audio above to extract its audio, or Original/MP4 to keep the source file. This only works when the host allows browser access.", "info", [{label, onClick:() => downloadDirectMedia(url)}, {label:"Open source", href:url}]);
    return;
  }
  if (platform === "Other website") {
    showStatus("This website is not one of the four social platforms. If the URL is a direct media file, use the download option when available.", "info", [{label:"Open link", href:url}]);
    return;
  }

  const button = $("check");
  button.disabled = true;
  button.textContent = "Checking…";
  showStatus("Checking this link with WAJID MEDIA API…", "info");
  try {
    const response = await fetch(API_BASE + "/api/check", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({url})
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      showStatus(result.error || "The API could not check this link. Please try again.", "warn", [{label:"Open platform link", href:url}]);
      return;
    }
    if (result.recognized) {
      const actions = [{label:"Open video", href:url}];
      if (result.platform === "YouTube") {
        actions.push({label:"YouTube Studio (your uploads)", href:"https://studio.youtube.com/"});
        showStatus("YouTube link recognized. This free Cloudflare/GitHub setup cannot extract a video stream or MP3 from YouTube. For a video you uploaded, open YouTube Studio and use its official download option; then only use media you have permission to save.", "warn", actions);
      } else if (result.platform === "Facebook") {
        showStatus("Facebook link recognized. This setup identifies the link but cannot extract the video/audio stream. Open the video and use Facebook's own download option if it is offered, or download your own uploaded media from the platform.", "warn", actions);
      } else {
        showStatus(result.platform + " link recognized. This setup does not extract protected video/audio streams. Use the platform's official download/save option where available.", "warn", actions);
      }
    } else {
      showStatus("The API could not identify this platform. You can still open the link in your browser.", "info", [{label:"Open link", href:url}]);
    }
  } catch {
    showStatus("Could not reach WAJID MEDIA API. Check your connection and try again.", "warn", [{label:"Open platform link", href:url}]);
  } finally {
    button.disabled = false;
    button.textContent = "Check link ↗";
  }
});
$("url").addEventListener("keydown", event => { if (event.key === "Enter") $("check").click(); });
$("clear").addEventListener("click", () => { localStorage.removeItem("wmh-history"); renderHistory(); });

async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  showStatus("Loading the free MP3 conversion engine. The first load may be large; stay on this page…", "info");
  const [{FFmpeg}, {toBlobURL}] = await Promise.all([
    import("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js"),
    import("https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js")
  ]);
  const ffmpeg = new FFmpeg();

  // The FFmpeg class worker must be same-origin or a blob URL. Fetch its
  // source and rewrite its two relative imports to absolute CDN URLs.
  const workerBase = "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/";
  const workerResponse = await fetch(workerBase + "worker.js");
  if (!workerResponse.ok) throw new Error("Could not load FFmpeg worker (" + workerResponse.status + ")");
  let workerSource = await workerResponse.text();
  workerSource = workerSource
    .replaceAll('"./const.js"', '"' + workerBase + 'const.js"')
    .replaceAll('"./errors.js"', '"' + workerBase + 'errors.js"')
    .replaceAll("'./const.js'", "'" + workerBase + "const.js'")
    .replaceAll("'./errors.js'", "'" + workerBase + "errors.js'");
  const workerBlobURL = URL.createObjectURL(new Blob([workerSource], {type:"text/javascript"}));

  const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";
  try {
    await ffmpeg.load({
      classWorkerURL: workerBlobURL,
      coreURL: await toBlobURL(base + "/ffmpeg-core.js", "text/javascript"),
      wasmURL: await toBlobURL(base + "/ffmpeg-core.wasm", "application/wasm")
    });
  } finally {
    // The worker has already been created; revoke the URL after a short delay.
    setTimeout(() => URL.revokeObjectURL(workerBlobURL), 60000);
  }
  ffmpegInstance = ffmpeg;
  return ffmpeg;
}
$("localbtn").addEventListener("click", async () => {
  const file = $("localfile").files[0];
  if (!file) return showStatus("Choose a video or audio file from your phone first.", "warn");
  const format = $("format").value;
  if (format !== "mp3") {
    downloadBlob(file, file.name);
    showStatus("Save requested for " + file.name + ". Check your phone's Downloads folder.", "success");
    return;
  }
  if (file.size > 150 * 1024 * 1024) {
    return showStatus("This file is over 150 MB. For phone memory and stability, choose a smaller file.", "warn");
  }
  const button = $("localbtn");
  button.disabled = true;
  button.textContent = "Converting…";
  try {
    const ffmpeg = await getFFmpeg();
    const inputName = "input_" + (file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "media");
    const outputName = "wajid-output.mp3";
    ffmpeg.on("progress", ({progress}) => {
      if (Number.isFinite(progress)) showStatus("Converting to MP3: " + Math.min(100, Math.round(progress * 100)) + "%. Keep this page open.", "info");
    });
    await ffmpeg.writeFile(inputName, new Uint8Array(await file.arrayBuffer()));
    await ffmpeg.exec(["-i", inputName, "-vn", "-codec:a", "libmp3lame", "-q:a", "2", outputName]);
    const data = await ffmpeg.readFile(outputName);
    downloadBlob(new Blob([data], {type:"audio/mpeg"}), file.name.replace(/\.[^.]+$/, "") + ".mp3");
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
    showStatus("MP3 conversion finished. Your download should appear in the phone's Downloads folder.", "success");
  } catch (error) {
    showStatus("MP3 conversion could not run on this browser/device. Try a smaller file or select Original format. Details: " + (error?.message || "conversion failed"), "warn");
  } finally {
    button.disabled = false;
    button.textContent = "Save / Convert selected file";
  }
});
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(() => {});
renderHistory();
