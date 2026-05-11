const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

function slugify(str = "") {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeText(str = "") {
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function readJson(request) {
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("application/json")) return request.json();

  const form = await request.formData();
  const obj = {};
  for (const [k, v] of form.entries()) obj[k] = String(v);
  return obj;
}

async function kvGetJson(env, key, fallback = null) {
  const data = await env.VIDEOS.get(key, "json");
  return data ?? fallback;
}

async function kvPutJson(env, key, value) {
  await env.VIDEOS.put(key, JSON.stringify(value));
}

async function loadAllIds(env) {
  const ids = await kvGetJson(env, "index:all", []);
  return Array.isArray(ids) ? ids : [];
}

async function saveAllIds(env, ids) {
  const uniq = [...new Set(ids)];
  await kvPutJson(env, "index:all", uniq);
}

async function loadCategoryIds(env, category) {
  const ids = await kvGetJson(env, `index:cat:${slugify(category)}`, []);
  return Array.isArray(ids) ? ids : [];
}

async function saveCategoryIds(env, category, ids) {
  const uniq = [...new Set(ids)];
  await kvPutJson(env, `index:cat:${slugify(category)}`, uniq);
}

async function upsertVideo(env, video) {
  const id = video.id || video.file_code || crypto.randomUUID();
  const now = new Date().toISOString();

  const record = {
    id,
    title: video.title || "Untitled",
    description: video.description || "",
    category: video.category || "other",
    tags: Array.isArray(video.tags)
      ? video.tags
      : String(video.tags || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
    thumb: video.thumb || video.thumbnail || "",
    file_code: video.file_code || "",
    link: video.link || (video.file_code ? `https://lulustream.com/${video.file_code}.html` : ""),
    player_img: video.player_img || "",
    length: video.length || "",
    views: String(video.views || "0"),
    public: String(video.public ?? "1"),
    adult: String(video.adult ?? "0"),
    fld_id: String(video.fld_id ?? "0"),
    source: video.source || "manual",
    created_at: video.created_at || now,
    updated_at: now,
    raw: video.raw || null,
  };

  await kvPutJson(env, `video:${id}`, record);

  const all = await loadAllIds(env);
  if (!all.includes(id)) {
    all.push(id);
    await saveAllIds(env, all);
  }

  const catIds = await loadCategoryIds(env, record.category);
  if (!catIds.includes(id)) {
    catIds.push(id);
    await saveCategoryIds(env, record.category, catIds);
  }

  return record;
}

async function getVideoById(env, id) {
  if (!id) return null;
  return await kvGetJson(env, `video:${id}`, null);
}

async function getAllVideos(env) {
  const ids = await loadAllIds(env);
  const values = await Promise.all(
    ids.map((id) => env.VIDEOS.get(`video:${id}`, "json"))
  );
  return values.filter(Boolean);
}

async function searchVideos(env, { q = "", category = "", page = 1, perPage = 24 }) {
  const videos = await getAllVideos(env);

  let items = videos;

  if (category && category !== "all") {
    const cat = slugify(category);
    items = items.filter((v) => slugify(v.category) === cat);
  }

  if (q) {
    const term = normalizeText(q);
    items = items.filter((v) => {
      const hay = normalizeText(
        [
          v.title,
          v.description,
          v.category,
          Array.isArray(v.tags) ? v.tags.join(" ") : v.tags,
          v.file_code,
        ].join(" ")
      );
      return hay.includes(term);
    });
  }

  items.sort((a, b) => {
    const da = new Date(a.created_at || 0).getTime();
    const db = new Date(b.created_at || 0).getTime();
    return db - da;
  });

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const sliced = items.slice(start, start + perPage);

  return { items: sliced, total, page, perPage, pages };
}

function renderApp(appName) {
  return String.raw`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(appName)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b1020;
      --panel: #111936;
      --panel2: #0f1730;
      --line: #22305d;
      --text: #e8eefc;
      --muted: #9fb0dd;
      --accent: #2f6bff;
      --accent2: #1a2446;
      --danger: #ff4d4f;
      --radius: 18px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      background: radial-gradient(circle at top, #14204a 0, var(--bg) 40%);
      color: var(--text);
      overflow-x: hidden;
    }
    a { color: inherit; text-decoration: none; }
    .wrap {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    .hero {
      position: relative;
      background: linear-gradient(135deg, rgba(47,107,255,.22), rgba(17,25,54,.9));
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: 22px;
      margin-bottom: 18px;
      box-shadow: 0 12px 40px rgba(0,0,0,.25);
      overflow: hidden;
    }
    canvas#heroCanvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    }
    .hero > * {
      position: relative;
      z-index: 2;
    }
    h1 { margin: 0 0 8px; font-size: 30px; }
    .muted { color: var(--muted); }
    .row {
      display: grid;
      grid-template-columns: 1.4fr .8fr;
      gap: 16px;
      align-items: start;
    }
    .card {
      background: rgba(17,25,54,.9);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 16px;
      box-shadow: 0 10px 28px rgba(0,0,0,.18);
    }
    .searchbar {
      display: grid;
      grid-template-columns: 1fr 180px 120px;
      gap: 10px;
      margin-top: 14px;
    }
    input, select, textarea, button {
      width: 100%;
      border-radius: 12px;
      border: 1px solid #2b3b6d;
      background: #0b1227;
      color: var(--text);
      padding: 12px 14px;
      font-size: 14px;
      outline: none;
    }
    textarea { min-height: 92px; resize: vertical; }
    button {
      cursor: pointer;
      background: var(--accent);
      border: 0;
      font-weight: 700;
    }
    button.secondary {
      background: var(--accent2);
      border: 1px solid var(--line);
    }
    button.danger {
      background: var(--danger);
      border: 0;
    }
    .cats {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin: 12px 0 0;
    }
    .pill {
      padding: 8px 12px;
      border-radius: 999px;
      background: #0b1227;
      border: 1px solid var(--line);
      color: var(--muted);
      cursor: pointer;
      user-select: none;
    }
    .pill.active {
      color: white;
      background: #2b54c8;
      border-color: #4f75e7;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 14px;
      margin-top: 16px;
    }
    .video {
      background: rgba(11,18,39,.95);
      border: 1px solid var(--line);
      border-radius: 18px;
      overflow: hidden;
      cursor: pointer;
      transition: transform .15s ease, border-color .15s ease;
    }
    .video:hover {
      transform: translateY(-2px);
      border-color: #4f75e7;
    }
    .thumb {
      width: 100%;
      aspect-ratio: 16/9;
      object-fit: cover;
      background: #07101f;
    }
    .vbody { padding: 12px; }
    .title {
      font-weight: 700;
      margin: 0 0 6px;
      line-height: 1.35;
    }
    .meta {
      font-size: 12px;
      color: var(--muted);
      line-height: 1.45;
    }
    .taglist {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    .tag {
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 999px;
      background: #142246;
      border: 1px solid #22396d;
      color: #cfe0ff;
    }
    .cols2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .list {
      display: grid;
      gap: 10px;
    }
    .small {
      font-size: 13px;
      color: var(--muted);
    }
    .pagination {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin: 18px 0 8px;
      flex-wrap: wrap;
    }
    .pagination button { width: auto; min-width: 44px; padding: 10px 14px; }
    .divider {
      height: 1px;
      background: var(--line);
      margin: 14px 0;
    }
    .badge {
      display: inline-block;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 999px;
      background: #142246;
      color: #d7e4ff;
      margin-left: 8px;
    }
    .detail-head {
      display: flex;
      gap: 14px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .detail-head img {
      width: 160px;
      aspect-ratio: 16/9;
      object-fit: cover;
      border-radius: 14px;
      border: 1px solid var(--line);
    }
    .detail-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 12px;
    }
    .detail-actions a, .detail-actions button {
      width: auto;
    }
    .status {
      margin-top: 10px;
      color: var(--muted);
      font-size: 13px;
    }
    .lookup-row {
      display: flex;
      gap: 10px;
      align-items: flex-end;
    }
    .lookup-row input {
      flex: 1;
    }
    @media (max-width: 920px) {
      .row, .cols2, .searchbar { grid-template-columns: 1fr; }
      .detail-head { align-items: flex-start; }
      .detail-head img { width: 100%; max-width: 340px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <canvas id="heroCanvas"></canvas>
      <h1>${escapeHtml(appName)}</h1>
      <div class="muted">Search video, filter kategori, tambah video via File Code. Tanpa direct link.</div>
      <div class="searchbar">
        <input id="q" placeholder="Cari title, kategori, tag, file code..." />
        <select id="category">
          <option value="all">Semua kategori</option>
        </select>
        <button onclick="doSearch()">Search</button>
      </div>
      <div class="cats" id="catPills"></div>
    </div>

    <div class="row">
      <div class="card">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;">
          <div>
            <b>Daftar Video</b>
            <div class="small" id="resultInfo">Memuat...</div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="secondary" onclick="syncFromLulu()">Sync dari Lulu</button>
            <button class="secondary" onclick="loadVideos()">Reload</button>
          </div>
        </div>

        <div class="grid" id="grid"></div>
        <div class="pagination" id="pagination"></div>
      </div>

      <div class="card">
        <b>Tambah Video (tanpa direct link)</b>
        <div class="small" style="margin-top:6px">
          Masukkan File Code dari LuluStream. Data otomatis dilengkapi dengan Lookup.
        </div>

        <div class="divider"></div>

        <div class="list">
          <div class="lookup-row">
            <input id="u_filecode" placeholder="File Code (wajib)" />
            <button class="secondary" onclick="lookupFileCode()" style="width:auto;">Lookup</button>
          </div>
          <input id="u_title" placeholder="Title video" />
          <input id="u_category" placeholder="Kategori, contoh: anime" />
          <input id="u_tags" placeholder="Tags, pisahkan koma" />
          <textarea id="u_descr" placeholder="Description"></textarea>
          <div class="cols2">
            <input id="u_fld" placeholder="Folder ID (opsional)" value="0" />
            <input id="u_catid" placeholder="Cat ID (opsional)" value="0" />
          </div>
          <div class="cols2">
            <input id="u_public" placeholder="Public 1/0" value="1" />
            <input id="u_adult" placeholder="Adult 1/0" value="0" />
          </div>
          <button onclick="addVideoByCode()">Simpan Video</button>
        </div>

        <div class="divider"></div>

        <b>Info</b>
        <div class="status" id="status">Siap.</div>
      </div>
    </div>
  </div>

<script>
let state = {
  page: 1,
  perPage: 24,
  q: "",
  category: "all",
  pages: 1,
};

function qs(id){ return document.getElementById(id); }

function setStatus(msg){
  qs("status").textContent = msg;
}

function renderCategories(categories){
  const select = qs("category");
  const pills = qs("catPills");

  const unique = ["all", ...categories.filter(Boolean)];
  const options = unique.map(c =>
    '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'
  ).join("");
  select.innerHTML = options;

  pills.innerHTML = unique.map(c => {
    const active = c === state.category ? "active" : "";
    const label = c === "all" ? "Semua" : c;
    return '<div class="pill ' + active + '" onclick="setCategory(\'' + escapeJs(c) + '\')">' + escapeHtml(label) + '</div>';
  }).join("");
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeJs(str = "") {
  return String(str).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function cardHtml(v){
  const thumb = v.thumb || v.thumbnail || "https://picsum.photos/800/450?blur=2";
  const tags = Array.isArray(v.tags) ? v.tags : String(v.tags || "").split(",").map(s => s.trim()).filter(Boolean);
  return \
    '<div class="video" onclick="openVideo(\'' + escapeJs(v.id) + '\')">' +
      '<img class="thumb" src="' + escapeHtml(thumb) + '" alt="">' +
      '<div class="vbody">' +
        '<div class="title">' + escapeHtml(v.title || "Untitled") + '</div>' +
        '<div class="meta">' +
          '<div>Kategori: ' + escapeHtml(v.category || "other") + '</div>' +
          '<div>Code: ' + escapeHtml(v.file_code || "-") + '</div>' +
          '<div>Views: ' + escapeHtml(v.views || "0") + '</div>' +
        '</div>' +
        '<div class="taglist">' +
          tags.slice(0, 4).map(t => '<span class="tag">' + escapeHtml(t) + '</span>').join("") +
        '</div>' +
      '</div>' +
    '</div>';
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || ("HTTP " + res.status));
  }
  return res.json();
}

async function loadVideos(page = 1) {
  state.page = page;
  qs("grid").innerHTML = "";
  qs("pagination").innerHTML = "";
  setStatus("Memuat video...");

  const url = new URL("/api/videos", location.origin);
  url.searchParams.set("page", String(state.page));
  url.searchParams.set("per_page", String(state.perPage));
  if (state.q) url.searchParams.set("q", state.q);
  if (state.category && state.category !== "all") url.searchParams.set("category", state.category);

  const data = await fetchJson(url);
  state.pages = data.pages || 1;

  const cats = [...new Set((data.all_categories || []).filter(Boolean))];
  renderCategories(cats);

  qs("resultInfo").textContent = data.total + " video ditemukan. Halaman " + data.page + "/" + data.pages;
  qs("grid").innerHTML = data.items.map(cardHtml).join("") || '<div class="small">Belum ada video.</div>';

  const pag = [];
  if (state.pages > 1) {
    if (state.page > 1) {
      pag.push('<button class="secondary" onclick="loadVideos(' + (state.page - 1) + ')">Prev</button>');
    }
    const start = Math.max(1, state.page - 2);
    const end = Math.min(state.pages, state.page + 2);
    for (let p = start; p <= end; p++) {
      pag.push('<button class="' + (p === state.page ? '' : 'secondary') + '" onclick="loadVideos(' + p + ')">' + p + '</button>');
    }
    if (state.page < state.pages) {
      pag.push('<button class="secondary" onclick="loadVideos(' + (state.page + 1) + ')">Next</button>');
    }
  }
  qs("pagination").innerHTML = pag.join("");
  setStatus("Siap.");
}

function doSearch() {
  state.q = qs("q").value.trim();
  state.category = qs("category").value;
  loadVideos(1).catch(err => setStatus("Error: " + err.message));
}

function setCategory(cat) {
  state.category = cat;
  qs("category").value = cat;
  loadVideos(1).catch(err => setStatus("Error: " + err.message));
}

async function openVideo(id) {
  location.href = "/watch?id=" + encodeURIComponent(id);
}

// Canvas hero: gambar background dinamis + thumbnail video acak
function initHeroCanvas() {
  const canvas = qs("heroCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const hero = canvas.parentNode;
  let anim;

  function resize() {
    canvas.width = hero.clientWidth || canvas.clientWidth;
    canvas.height = hero.clientHeight || canvas.clientHeight;
  }
  window.addEventListener("resize", () => {
    resize();
    draw();
  });
  resize();

  async function draw() {
    // Hapus dan isi gradien
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "rgba(47,107,255,0.5)");
    grad.addColorStop(0.5, "rgba(17,25,54,0.9)");
    grad.addColorStop(1, "rgba(11,16,32,0.9)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Partikel sederhana
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    const time = Date.now() / 2000;
    for (let i = 0; i < 30; i++) {
      const x = (Math.sin(i * 3.7 + time) * canvas.width * 0.4) + canvas.width / 2;
      const y = (Math.cos(i * 2.3 + time) * canvas.height * 0.3) + canvas.height / 2;
      const r = 1 + Math.sin(i + time) * 1.5;
      ctx.beginPath();
      ctx.arc(x, y, Math.abs(r), 0, Math.PI * 2);
      ctx.fill();
    }

    // Thumbnail acak dari video yang sudah dimuat (jika ada)
    const grid = qs("grid");
    const imgs = grid ? grid.querySelectorAll(".thumb") : [];
    if (imgs.length > 0) {
      const rand = Math.floor(Math.random() * imgs.length);
      const src = imgs[rand].src;
      if (src && src !== location.href) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        img.onload = () => {
          const pw = canvas.width * 0.25;
          const ph = pw * 9/16;
          const px = canvas.width - pw - 20;
          const py = canvas.height - ph - 10;
          ctx.shadowColor = "#000";
          ctx.shadowBlur = 15;
          ctx.drawImage(img, px, py, pw, ph);
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        };
      }
    }
    anim = requestAnimationFrame(draw);
  }
  draw();
}

window.addEventListener("DOMContentLoaded", initHeroCanvas);

// Add video by file code
async function addVideoByCode() {
  try {
    setStatus("Menyimpan video...");
    const file_code = qs("u_filecode").value.trim();
    if (!file_code) {
      setStatus("File Code wajib diisi.");
      return;
    }

    const payload = {
      file_code: file_code,
      title: qs("u_title").value.trim(),
      description: qs("u_descr").value.trim(),
      category: qs("u_category").value.trim() || "other",
      tags: qs("u_tags").value.trim(),
      fld_id: qs("u_fld").value.trim() || "0",
      cat_id: qs("u_catid").value.trim() || "0",
      file_public: qs("u_public").value.trim() || "1",
      file_adult: qs("u_adult").value.trim() || "0",
    };

    const data = await fetchJson("/api/video/add", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    setStatus("Video berhasil disimpan. ID: " + data.id);
    // Reset form
    qs("u_filecode").value = "";
    qs("u_title").value = "";
    qs("u_descr").value = "";
    qs("u_category").value = "";
    qs("u_tags").value = "";
    await loadVideos(1);
  } catch (e) {
    setStatus("Gagal: " + e.message);
  }
}

// Lookup file code untuk melengkapi metadata otomatis
async function lookupFileCode() {
  const code = qs("u_filecode").value.trim();
  if (!code) {
    setStatus("Masukkan file code dulu.");
    return;
  }
  try {
    setStatus("Mencari data dari LuluStream...");
    const data = await fetchJson("/api/lookup/" + encodeURIComponent(code));
    if (data.title) qs("u_title").value = data.title;
    if (data.thumbnail) {
      // thumbnail bisa dipakai untuk preview, tapi tidak disimpan di form, abaikan
    }
    if (data.views) {
      // opsional: tidak ditampilkan di form
    }
    if (data.length) {
      // opsional
    }
    // Isi kategori & tags jika tersedia
    if (data.category) qs("u_category").value = data.category;
    if (data.tags) qs("u_tags").value = Array.isArray(data.tags) ? data.tags.join(",") : data.tags;
    if (data.fld_id) qs("u_fld").value = data.fld_id;
    if (data.public !== undefined) qs("u_public").value = data.public;
    if (data.adult !== undefined) qs("u_adult").value = data.adult;
    setStatus("Data berhasil dilengkapi dari Lulu.");
  } catch (e) {
    setStatus("Lookup gagal: " + e.message);
  }
}

// Sync from Lulu (sebelumnya sudah ada, tetap berfungsi)
async function syncFromLulu() {
  try {
    setStatus("Sync dari Lulu...");
    const data = await fetchJson("/api/sync/lulu?pages=1");
    setStatus("Sync selesai. " + data.saved + " file tersimpan/diupdate.");
    await loadVideos(state.page);
  } catch (e) {
    setStatus("Sync gagal: " + e.message);
  }
}

qs("q").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});

loadVideos().catch(err => setStatus("Error: " + err.message));
</script>
</body>
</html>`;
}

function renderWatchPage(appName, video) {
  const link = video?.link || (video?.file_code ? `https://lulustream.com/${video.file_code}.html` : "#");
  const thumb = video?.thumb || video?.thumbnail || "";
  const tags = Array.isArray(video?.tags) ? video.tags : String(video?.tags || "").split(",").map(s => s.trim()).filter(Boolean);

  return String.raw`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(video?.title || appName)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b1020;
      --panel: #111936;
      --line: #22305d;
      --text: #e8eefc;
      --muted: #9fb0dd;
      --accent: #2f6bff;
    }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      background: radial-gradient(circle at top, #14204a 0, var(--bg) 45%);
      color: var(--text);
    }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 20px; }
    .card {
      background: rgba(17,25,54,.92);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 18px;
      box-shadow: 0 10px 28px rgba(0,0,0,.2);
    }
    a, button {
      color: inherit;
      text-decoration: none;
    }
    button {
      width: auto;
      border-radius: 12px;
      border: 0;
      background: var(--accent);
      color: white;
      padding: 12px 14px;
      font-weight: 700;
      cursor: pointer;
    }
    .secondary {
      background: #1a2446;
      border: 1px solid var(--line);
    }
    .head {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .head img {
      width: 280px;
      max-width: 100%;
      aspect-ratio: 16/9;
      object-fit: cover;
      border-radius: 16px;
      border: 1px solid var(--line);
      background: #07101f;
    }
    .meta { color: var(--muted); line-height: 1.6; }
    .tags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
    .tag {
      font-size: 12px;
      padding: 5px 10px;
      border-radius: 999px;
      background: #142246;
      border: 1px solid #22396d;
    }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
    .divider { height: 1px; background: var(--line); margin: 16px 0; }
    iframe {
      width: 100%;
      height: 680px;
      border: 1px solid var(--line);
      border-radius: 16px;
      background: #07101f;
    }
    @media (max-width: 900px) {
      iframe { height: 520px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div style="margin-bottom:14px">
        <a href="/" style="color:#9fb0dd">← Kembali</a>
      </div>

      <div class="head">
        <img src="${escapeHtml(thumb || "https://picsum.photos/800/450?blur=2")}" alt="">
        <div style="flex:1;min-width:260px">
          <h1 style="margin:0 0 10px">${escapeHtml(video?.title || "Untitled")}</h1>
          <div class="meta">
            <div><b>Kategori:</b> ${escapeHtml(video?.category || "other")}</div>
            <div><b>File code:</b> ${escapeHtml(video?.file_code || "-")}</div>
            <div><b>Views:</b> ${escapeHtml(video?.views || "0")}</div>
            <div><b>Length:</b> ${escapeHtml(video?.length || "-")}</div>
            <div><b>Uploaded:</b> ${escapeHtml(video?.created_at || "-")}</div>
          </div>
          <div class="tags">
            ${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
          </div>
          <div class="actions">
            <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">
              <button>Tonton di LuluStream</button>
            </a>
            <button class="secondary" onclick="navigator.clipboard.writeText('${escapeHtml(link)}')">Copy Link</button>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="meta" style="margin-bottom:10px">
        Player bawaan LuluStream bisa dibuka dari link di atas. iframe di bawah tergantung kebijakan embed LuluStream.
      </div>

      <iframe src="${escapeHtml(link)}" allow="autoplay; fullscreen; picture-in-picture"></iframe>
    </div>
  </div>
</body>
</html>`;
}

async function luluFetch(env, path, params = {}) {
  const url = new URL(env.LULU_BASE + path);
  url.searchParams.set("key", env.LULU_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v) !== "") {
      url.searchParams.set(k, String(v));
    }
  }
  return fetch(url.toString());
}

// Ganti upload URL menjadi add by file_code
async function addVideoByFileCode(env, body) {
  const file_code = body.file_code;
  if (!file_code) throw new Error("file_code diperlukan");

  // Opsional: ambil info dari Lulu untuk melengkapi
  let extra = {};
  try {
    const res = await luluFetch(env, "/api/file/info", { file_code });
    const info = await res.json();
    if (info?.status === 200 && info.result) {
      const f = Array.isArray(info.result) ? info.result[0] : info.result;
      if (f) {
        extra = {
          title: f.title,
          thumb: f.thumbnail || f.player_img,
          length: f.length,
          views: f.views,
          public: f.public,
          adult: f.adult,
          fld_id: f.fld_id,
          category: "other", // Lulu tidak sediakan category
        };
      }
    }
  } catch {
    // Biarkan kosong
  }

  const link = `${env.LULU_BASE.replace(/\/$/, "")}/${file_code}.html`;

  const record = await upsertVideo(env, {
    title: body.title || extra.title || "Untitled",
    description: body.description || "",
    category: body.category || extra.category || "other",
    tags: body.tags || "",
    file_code,
    link,
    thumb: extra.thumb || "",
    public: body.file_public ?? extra.public ?? "1",
    adult: body.file_adult ?? extra.adult ?? "0",
    fld_id: body.fld_id ?? extra.fld_id ?? "0",
    length: extra.length || "",
    views: extra.views || "0",
    source: "manual-filecode",
    raw: extra,
  });

  return { id: record.id, filecode: file_code, record };
}

// Endpoint lookup untuk frontend
async function lookupFileCode(env, file_code) {
  const res = await luluFetch(env, "/api/file/info", { file_code });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Respon Lulu bukan JSON: " + text.slice(0, 300));
  }
  if (data?.status !== 200) throw new Error(JSON.stringify(data));
  const f = Array.isArray(data.result) ? data.result[0] : data.result;
  if (!f) throw new Error("File tidak ditemukan");
  return {
    title: f.title,
    thumbnail: f.thumbnail || f.player_img,
    length: f.length,
    views: f.views,
    public: f.public,
    adult: f.adult,
    fld_id: f.fld_id,
  };
}

// Sync dari Lulu tetap dipertahankan
async function syncFromLulu(env, pages = 1) {
  let saved = 0;

  for (let page = 1; page <= pages; page++) {
    const res = await luluFetch(env, "/api/file/list", {
      per_page: 100,
      page,
    });

    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Lulu list bukan JSON: " + text.slice(0, 300));
    }

    if (!res.ok || data?.status !== 200) {
      throw new Error(JSON.stringify(data));
    }

    const files = data?.result?.files || [];
    for (const f of files) {
      await upsertVideo(env, {
        id: f.file_code,
        title: f.title || "Untitled",
        description: "",
        category: "other",
        tags: "",
        thumb: f.thumbnail || "",
        file_code: f.file_code,
        link: f.link || `${env.LULU_BASE.replace(/\/$/, "")}/${f.file_code}.html`,
        length: f.length || "",
        views: f.views || "0",
        public: f.public || "1",
        adult: f.adult || "0",
        fld_id: f.fld_id || "0",
        source: "lulu-sync",
        raw: f,
      });
      saved++;
    }
  }

  return saved;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!env.LULU_KEY) {
      return new Response("Missing secret LULU_KEY.", { status: 500 });
    }

    if (url.pathname === "/") {
      return new Response(renderApp(env.APP_NAME || "Streaming"), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/watch") {
      const id = url.searchParams.get("id");
      const video = await getVideoById(env, id);
      if (!video) return new Response("Not found", { status: 404 });
      return new Response(renderWatchPage(env.APP_NAME || "Streaming", video), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/api/videos" && request.method === "GET") {
      const q = url.searchParams.get("q") || "";
      const category = url.searchParams.get("category") || "all";
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
      const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") || "24", 10)));

      const data = await searchVideos(env, { q, category, page, perPage });

      const allVideos = await getAllVideos(env);
      const allCategories = [...new Set(allVideos.map((v) => v.category).filter(Boolean))].sort();

      return Response.json(
        {
          ...data,
          all_categories: allCategories,
        },
        { headers: jsonHeaders }
      );
    }

    if (url.pathname.startsWith("/api/video/") && request.method === "GET") {
      const id = url.pathname.split("/").pop();
      const video = await getVideoById(env, id);
      if (!video) return new Response("Not found", { status: 404 });
      return Response.json(video, { headers: jsonHeaders });
    }

    // Endpoint baru: tambah video via file code
    if (url.pathname === "/api/video/add" && request.method === "POST") {
      const body = await readJson(request);
      if (!body.file_code) {
        return Response.json({ msg: "file_code wajib diisi" }, { status: 400 });
      }
      const result = await addVideoByFileCode(env, body);
      return Response.json(result, { headers: jsonHeaders });
    }

    // Endpoint lookup untuk frontend
    if (url.pathname.startsWith("/api/lookup/") && request.method === "GET") {
      const file_code = url.pathname.split("/").pop();
      if (!file_code) return new Response("Not found", { status: 404 });
      const data = await lookupFileCode(env, file_code);
      return Response.json(data, { headers: jsonHeaders });
    }

    if (url.pathname === "/api/sync/lulu" && request.method === "GET") {
      const pages = Math.max(1, Math.min(20, parseInt(url.searchParams.get("pages") || "1", 10)));
      const saved = await syncFromLulu(env, pages);
      return Response.json(
        {
          msg: "OK",
          saved,
        },
        { headers: jsonHeaders }
      );
    }

    return new Response("Not found", { status: 404 });
  },
};
