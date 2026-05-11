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
    link: video.link || "",
    player_img: video.player_img || "",
    length: video.length || "",
    views: String(video.views || "0"),
    public: String(video.public ?? "1"),
    adult: String(video.adult ?? "0"),
    fld_id: String(video.fld_id ?? "0"),
    source: video.source || "lulu",
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
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;1,9..40,300&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #080810;
      --surface: #0f0f1a;
      --surface2: #13131f;
      --border: rgba(255,80,30,.13);
      --border2: rgba(255,80,30,.28);
      --fire1: #ff4500;
      --fire2: #ff8c00;
      --fire3: #ffb347;
      --text: #f0eae0;
      --muted: #8c7f74;
      --danger: #ff3333;
      --r: 14px;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
    }
    /* ── Noise texture overlay ── */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 0;
      opacity: .45;
    }
    /* ── Ambient glow ── */
    body::after {
      content: '';
      position: fixed;
      top: -180px;
      left: 50%;
      transform: translateX(-50%);
      width: 800px;
      height: 380px;
      background: radial-gradient(ellipse, rgba(255,69,0,.16) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }
    a { color: inherit; text-decoration: none; }
    .wrap {
      position: relative;
      z-index: 1;
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 20px 40px;
    }

    /* ── HEADER ── */
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 0 14px;
      border-bottom: 1px solid var(--border);
      gap: 14px;
      flex-wrap: wrap;
    }
    .logo {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 42px;
      letter-spacing: 2px;
      background: linear-gradient(90deg, var(--fire1) 0%, var(--fire2) 50%, var(--fire3) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
      text-shadow: none;
      position: relative;
    }
    .logo-sub {
      font-size: 11px;
      letter-spacing: 5px;
      text-transform: uppercase;
      color: var(--muted);
      margin-top: -2px;
      font-weight: 300;
    }
    .topbar-actions {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    /* ── SEARCH BAR ── */
    .searchrow {
      display: flex;
      gap: 10px;
      margin: 22px 0 0;
      flex-wrap: wrap;
    }
    .searchrow input {
      flex: 1;
      min-width: 180px;
    }
    .searchrow select {
      width: 160px;
      flex-shrink: 0;
    }
    .searchrow button {
      width: 120px;
      flex-shrink: 0;
    }

    /* ── INPUTS ── */
    input, select, textarea {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: var(--r);
      color: var(--text);
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      padding: 11px 14px;
      outline: none;
      width: 100%;
      transition: border-color .18s;
    }
    input:focus, select:focus, textarea:focus {
      border-color: var(--fire1);
      box-shadow: 0 0 0 3px rgba(255,69,0,.13);
    }
    textarea { min-height: 90px; resize: vertical; }

    /* ── BUTTONS ── */
    button {
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: .5px;
      padding: 11px 18px;
      border-radius: var(--r);
      border: 0;
      transition: filter .15s, transform .12s;
    }
    button:hover { filter: brightness(1.12); transform: translateY(-1px); }
    button:active { transform: translateY(0); }
    .btn-fire {
      background: linear-gradient(135deg, var(--fire1) 0%, var(--fire2) 100%);
      color: #fff;
      box-shadow: 0 4px 20px rgba(255,69,0,.35);
    }
    .btn-ghost {
      background: transparent;
      border: 1px solid var(--border2);
      color: var(--fire2);
    }
    .btn-ghost:hover { background: rgba(255,140,0,.08); }
    .btn-danger { background: var(--danger); color: #fff; }

    /* ── CATEGORY PILLS ── */
    .catstrip {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin: 16px 0 0;
    }
    .pill {
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid var(--border);
      color: var(--muted);
      font-size: 13px;
      cursor: pointer;
      transition: all .15s;
      background: var(--surface);
      user-select: none;
    }
    .pill:hover { border-color: var(--fire2); color: var(--fire2); }
    .pill.active {
      background: linear-gradient(135deg, var(--fire1), var(--fire2));
      border-color: transparent;
      color: #fff;
      font-weight: 700;
    }

    /* ── MAIN LAYOUT ── */
    .layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 20px;
      margin-top: 22px;
      align-items: start;
    }

    /* ── CARD ── */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 20px;
    }
    .card-title {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 22px;
      letter-spacing: 1.5px;
      color: var(--fire2);
      margin-bottom: 4px;
    }
    .card-sub {
      font-size: 12px;
      color: var(--muted);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 16px;
    }

    /* ── VIDEO GRID ── */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
      gap: 12px;
      margin-top: 14px;
    }
    .vcard {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      cursor: pointer;
      transition: transform .18s, border-color .18s, box-shadow .18s;
      position: relative;
    }
    .vcard::after {
      content: '▶';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      font-size: 28px;
      color: #fff;
      text-shadow: 0 2px 12px rgba(0,0,0,.7);
      transition: transform .18s, opacity .18s;
      opacity: 0;
      pointer-events: none;
      z-index: 2;
    }
    .vcard:hover {
      transform: translateY(-3px) scale(1.013);
      border-color: var(--fire1);
      box-shadow: 0 8px 28px rgba(255,69,0,.22);
    }
    .vcard:hover::after { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    .vcard:hover .thumb-wrap::after { opacity: 1; }
    .thumb-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 16/9;
      background: #0a0a14;
      overflow: hidden;
    }
    .thumb-wrap::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,69,0,.3) 0%, transparent 60%);
      opacity: 0;
      transition: opacity .18s;
    }
    .thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform .22s;
    }
    .vcard:hover .thumb { transform: scale(1.05); }
    .vbody { padding: 10px 11px 11px; }
    .vtitle {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.35;
      margin-bottom: 5px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .vmeta {
      font-size: 11px;
      color: var(--muted);
      line-height: 1.5;
    }
    .vcat {
      display: inline-block;
      font-size: 10px;
      padding: 2px 7px;
      border-radius: 999px;
      background: rgba(255,69,0,.15);
      border: 1px solid rgba(255,69,0,.3);
      color: var(--fire2);
      margin-top: 6px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .5px;
    }

    /* ── DIVIDER ── */
    .divider {
      height: 1px;
      background: var(--border);
      margin: 16px 0;
    }

    /* ── FORM STACK ── */
    .form-stack {
      display: grid;
      gap: 10px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    /* ── PAGINATION ── */
    .pagination {
      display: flex;
      gap: 8px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 20px;
    }
    .pagination button {
      width: auto;
      min-width: 40px;
      padding: 8px 12px;
      font-size: 12px;
    }

    /* ── STATUS ── */
    .status {
      margin-top: 10px;
      font-size: 12px;
      color: var(--muted);
      line-height: 1.55;
      min-height: 18px;
    }

    /* ── EMPTY STATE ── */
    .empty {
      text-align: center;
      padding: 40px 20px;
      color: var(--muted);
      font-size: 14px;
    }
    .empty-icon {
      font-size: 36px;
      margin-bottom: 10px;
      opacity: .4;
    }

    /* ── FIRE BADGE ── */
    .fire-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      padding: 3px 9px;
      border-radius: 999px;
      background: rgba(255,69,0,.12);
      border: 1px solid rgba(255,69,0,.25);
      color: var(--fire2);
    }

    @keyframes flicker {
      0%, 100% { opacity: 1; }
      50% { opacity: .8; }
    }
    .logo { animation: flicker 3.5s ease-in-out infinite; }

    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .form-row { grid-template-columns: 1fr; }
    }
    @media (max-width: 540px) {
      .logo { font-size: 32px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <!-- TOPBAR -->
    <div class="topbar">
      <div>
        <div class="logo">${escapeHtml(appName)}</div>
        <div class="logo-sub">Hot streaming · LuluStream</div>
      </div>
      <div class="topbar-actions">
        <button class="btn-ghost" onclick="syncFromLulu()">⟳ Sync Lulu</button>
        <button class="btn-ghost" onclick="loadVideos()">↺ Reload</button>
      </div>
    </div>

    <!-- SEARCH -->
    <div class="searchrow">
      <input id="q" placeholder="🔍  Cari judul, tag, kategori, file code…" />
      <select id="category">
        <option value="all">Semua Kategori</option>
      </select>
      <button class="btn-fire" onclick="doSearch()">Cari</button>
    </div>

    <!-- CATEGORY PILLS -->
    <div class="catstrip" id="catPills"></div>

    <!-- MAIN LAYOUT -->
    <div class="layout">
      <!-- LEFT: Video Grid -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Video Terbaru</div>
            <div class="card-sub" id="resultInfo">Memuat…</div>
          </div>
        </div>
        <div class="grid" id="grid"></div>
        <div class="pagination" id="pagination"></div>
      </div>

      <!-- RIGHT: Upload Panel -->
      <div style="display:grid;gap:16px;">
        <div class="card">
          <div class="card-title">Upload by URL</div>
          <div class="card-sub" style="margin-bottom:14px">Kirim link video langsung ke LuluStream.</div>

          <div class="form-stack">
            <input id="u_title" placeholder="Judul video" />
            <input id="u_url" placeholder="Direct video URL" />
            <input id="u_category" placeholder="Kategori  (contoh: anime)" />
            <input id="u_tags" placeholder="Tags, pisahkan koma" />
            <textarea id="u_descr" placeholder="Deskripsi (opsional)"></textarea>
            <div class="form-row">
              <input id="u_fld" placeholder="Folder ID" value="0" />
              <input id="u_catid" placeholder="Cat ID" value="0" />
            </div>
            <div class="form-row">
              <input id="u_public" placeholder="Public 1/0" value="1" />
              <input id="u_adult" placeholder="Adult 1/0" value="0" />
            </div>
            <button class="btn-fire" onclick="uploadByUrl()">🔥 Upload ke Lulu</button>
          </div>

          <div class="divider"></div>
          <div class="status" id="status">Siap.</div>
        </div>
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
  const el = qs("status");
  el.textContent = msg;
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

function renderCategories(categories){
  const select = qs("category");
  const pills = qs("catPills");

  const unique = ["all", ...categories.filter(Boolean)];
  select.innerHTML = unique.map(c =>
    '<option value="' + escapeHtml(c) + '">' + escapeHtml(c === "all" ? "Semua Kategori" : c) + '</option>'
  ).join("");
  select.value = state.category;

  pills.innerHTML = unique.map(c => {
    const active = c === state.category ? "active" : "";
    const label = c === "all" ? "🔥 Semua" : c;
    return '<div class="pill ' + active + '" onclick="setCategory(\'' + escapeJs(c) + '\')">' + escapeHtml(label) + '</div>';
  }).join("");
}

function cardHtml(v){
  const thumb = v.thumb || v.thumbnail || "https://picsum.photos/800/450?blur=2";
  const cat = v.category || "other";
  return (
    '<div class="vcard" onclick="openVideo(\'' + escapeJs(v.id) + '\')">' +
      '<div class="thumb-wrap">' +
        '<img class="thumb" src="' + escapeHtml(thumb) + '" alt="" loading="lazy">' +
      '</div>' +
      '<div class="vbody">' +
        '<div class="vtitle">' + escapeHtml(v.title || "Untitled") + '</div>' +
        '<div class="vmeta">' +
          '<div>Code: ' + escapeHtml(v.file_code || "—") + '</div>' +
          '<div>👁 ' + escapeHtml(v.views || "0") + '</div>' +
        '</div>' +
        '<div class="vcat">' + escapeHtml(cat) + '</div>' +
      '</div>' +
    '</div>'
  );
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
  setStatus("Memuat video…");

  const url = new URL("/api/videos", location.origin);
  url.searchParams.set("page", String(state.page));
  url.searchParams.set("per_page", String(state.perPage));
  if (state.q) url.searchParams.set("q", state.q);
  if (state.category && state.category !== "all") url.searchParams.set("category", state.category);

  const data = await fetchJson(url);
  state.pages = data.pages || 1;

  const cats = [...new Set((data.all_categories || []).filter(Boolean))];
  renderCategories(cats);

  qs("resultInfo").textContent =
    data.total + " video · Hal " + data.page + "/" + data.pages;

  if (data.items.length === 0) {
    qs("grid").innerHTML =
      '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🔥</div>Belum ada video di sini.</div>';
  } else {
    qs("grid").innerHTML = data.items.map(cardHtml).join("");
  }

  const pag = [];
  if (state.pages > 1) {
    if (state.page > 1)
      pag.push('<button class="btn-ghost" onclick="loadVideos(' + (state.page - 1) + ')">← Prev</button>');

    const start = Math.max(1, state.page - 2);
    const end = Math.min(state.pages, state.page + 2);
    for (let p = start; p <= end; p++) {
      pag.push(
        '<button class="' + (p === state.page ? "btn-fire" : "btn-ghost") +
        '" onclick="loadVideos(' + p + ')">' + p + '</button>'
      );
    }
    if (state.page < state.pages)
      pag.push('<button class="btn-ghost" onclick="loadVideos(' + (state.page + 1) + ')">Next →</button>');
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

function openVideo(id) {
  location.href = "/watch?id=" + encodeURIComponent(id);
}

async function uploadByUrl() {
  try {
    setStatus("⏳ Upload dimulai…");
    const payload = {
      url: qs("u_url").value.trim(),
      title: qs("u_title").value.trim(),
      description: qs("u_descr").value.trim(),
      category: qs("u_category").value.trim() || "other",
      tags: qs("u_tags").value.trim(),
      fld_id: qs("u_fld").value.trim() || "0",
      cat_id: qs("u_catid").value.trim() || "0",
      file_public: qs("u_public").value.trim() || "1",
      file_adult: qs("u_adult").value.trim() || "0",
    };

    const data = await fetchJson("/api/upload/url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    setStatus("✅ Upload masuk antrian. File code: " + data.filecode);
    await loadVideos(1);
  } catch (e) {
    setStatus("❌ Upload gagal: " + e.message);
  }
}

async function syncFromLulu() {
  try {
    setStatus("⟳ Sync dari Lulu…");
    const data = await fetchJson("/api/sync/lulu?pages=1");
    setStatus("✅ Sync selesai. " + data.saved + " file tersimpan.");
    await loadVideos(state.page);
  } catch (e) {
    setStatus("❌ Sync gagal: " + e.message);
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
  const tags = Array.isArray(video?.tags)
    ? video.tags
    : String(video?.tags || "").split(",").map(s => s.trim()).filter(Boolean);

  return String.raw`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(video?.title || appName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #080810;
      --surface: #0f0f1a;
      --surface2: #13131f;
      --border: rgba(255,80,30,.13);
      --border2: rgba(255,80,30,.28);
      --fire1: #ff4500;
      --fire2: #ff8c00;
      --fire3: #ffb347;
      --text: #f0eae0;
      --muted: #8c7f74;
      --r: 16px;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 0;
      opacity: .45;
    }
    body::after {
      content: '';
      position: fixed;
      top: -120px; left: 50%;
      transform: translateX(-50%);
      width: 700px; height: 300px;
      background: radial-gradient(ellipse, rgba(255,69,0,.14) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }
    a { color: inherit; text-decoration: none; }
    .wrap {
      position: relative;
      z-index: 1;
      max-width: 1100px;
      margin: 0 auto;
      padding: 0 20px 48px;
    }

    /* TOPBAR */
    .topbar {
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 18px 0 14px;
      border-bottom: 1px solid var(--border);
    }
    .logo {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 34px;
      letter-spacing: 2px;
      background: linear-gradient(90deg, var(--fire1), var(--fire2), var(--fire3));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .back-link {
      font-size: 13px;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 6px;
      transition: color .15s;
    }
    .back-link:hover { color: var(--fire2); }

    /* PLAYER AREA */
    .player-wrap {
      margin-top: 24px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 22px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,.5);
    }
    iframe {
      display: block;
      width: 100%;
      height: 640px;
      border: 0;
      background: #000;
    }

    /* META SECTION */
    .meta-section {
      margin-top: 18px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      align-items: start;
    }
    .video-title {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 32px;
      letter-spacing: 1px;
      line-height: 1.15;
      background: linear-gradient(90deg, var(--text) 60%, var(--fire3) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .meta-grid {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    .meta-item {
      font-size: 13px;
      color: var(--muted);
    }
    .meta-item strong {
      color: var(--text);
      font-weight: 600;
    }
    .tags {
      display: flex;
      gap: 7px;
      flex-wrap: wrap;
      margin-top: 12px;
    }
    .tag {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(255,69,0,.1);
      border: 1px solid rgba(255,69,0,.22);
      color: var(--fire2);
    }

    /* ACTIONS */
    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 160px;
    }
    button {
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: .4px;
      padding: 12px 18px;
      border-radius: var(--r);
      border: 0;
      transition: filter .15s, transform .12s;
      width: 100%;
    }
    button:hover { filter: brightness(1.12); transform: translateY(-1px); }
    .btn-fire {
      background: linear-gradient(135deg, var(--fire1), var(--fire2));
      color: #fff;
      box-shadow: 0 4px 18px rgba(255,69,0,.3);
    }
    .btn-ghost {
      background: transparent;
      border: 1px solid var(--border2);
      color: var(--fire2);
    }

    /* THUMBNAIL STRIP */
    .thumb-strip {
      position: relative;
      overflow: hidden;
      border-radius: 14px 14px 0 0;
    }
    .thumb-strip img {
      width: 100%;
      max-height: 340px;
      object-fit: cover;
      display: block;
      opacity: .35;
    }
    .thumb-strip::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, transparent 30%, var(--surface) 100%);
    }

    @media (max-width: 760px) {
      iframe { height: 360px; }
      .meta-section { grid-template-columns: 1fr; }
      .actions { flex-direction: row; flex-wrap: wrap; }
      .actions button { width: auto; flex: 1; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="topbar">
      <a href="/" class="logo">${escapeHtml(appName)}</a>
      <a href="/" class="back-link">← Kembali ke Beranda</a>
    </div>

    <div class="player-wrap">
      ${thumb ? `<div class="thumb-strip"><img src="${escapeHtml(thumb)}" alt=""></div>` : ""}
      <iframe
        src="${escapeHtml(link)}"
        allow="autoplay; fullscreen; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>

    <div class="meta-section">
      <div>
        <div class="video-title">${escapeHtml(video?.title || "Untitled")}</div>
        <div class="meta-grid">
          <div class="meta-item"><strong>Kategori</strong><br>${escapeHtml(video?.category || "other")}</div>
          <div class="meta-item"><strong>File Code</strong><br>${escapeHtml(video?.file_code || "—")}</div>
          <div class="meta-item"><strong>Views</strong><br>👁 ${escapeHtml(video?.views || "0")}</div>
          <div class="meta-item"><strong>Durasi</strong><br>${escapeHtml(video?.length || "—")}</div>
          <div class="meta-item"><strong>Upload</strong><br>${escapeHtml((video?.created_at || "").split("T")[0] || "—")}</div>
        </div>
        <div class="tags">
          ${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
        </div>
      </div>
      <div class="actions">
        <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">
          <button class="btn-fire">🔥 Buka di Lulu</button>
        </a>
        <button class="btn-ghost" onclick="navigator.clipboard.writeText('${escapeHtml(link)}').then(()=>this.textContent='✓ Tersalin!')">📋 Copy Link</button>
      </div>
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

async function uploadByUrlToLulu(env, body) {
  const res = await luluFetch(env, "/api/upload/url", {
    url: body.url,
    fld_id: body.fld_id ?? "0",
    cat_id: body.cat_id ?? "0",
    file_public: body.file_public ?? "1",
    file_adult: body.file_adult ?? "0",
    tags: body.tags ?? "",
  });

  const text = await res.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Lulu bukan JSON: " + text.slice(0, 300));
  }

  if (!res.ok || data?.status !== 200) {
    throw new Error(JSON.stringify(data));
  }

  const filecode = data?.result?.filecode;
  if (!filecode) throw new Error("LuluStream tidak mengembalikan filecode.");

  const link = `${env.LULU_BASE.replace(/\/$/, "")}/${filecode}.html`;

  const record = await upsertVideo(env, {
    title: body.title || "Untitled",
    description: body.description || "",
    category: body.category || "other",
    tags: body.tags || "",
    file_code: filecode,
    link,
    thumb: body.thumb || "",
    public: body.file_public ?? "1",
    adult: body.file_adult ?? "0",
    fld_id: body.fld_id ?? "0",
    source: "lulu-upload-url",
    raw: data,
  });

  return { filecode, record, raw: data };
}

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
      return new Response(renderApp(env.APP_NAME || "xpanas"), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/watch") {
      const id = url.searchParams.get("id");
      const video = await getVideoById(env, id);
      if (!video) return new Response("Not found", { status: 404 });
      return new Response(renderWatchPage(env.APP_NAME || "xpanas", video), {
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
        { ...data, all_categories: allCategories },
        { headers: jsonHeaders }
      );
    }

    if (url.pathname.startsWith("/api/video/") && request.method === "GET") {
      const id = url.pathname.split("/").pop();
      const video = await getVideoById(env, id);
      if (!video) return new Response("Not found", { status: 404 });
      return Response.json(video, { headers: jsonHeaders });
    }

    if (url.pathname === "/api/upload/url" && request.method === "POST") {
      const body = await readJson(request);

      if (!body.url) {
        return Response.json({ msg: "url wajib diisi" }, { status: 400 });
      }

      const result = await uploadByUrlToLulu(env, body);
      return Response.json(
        { msg: "OK", filecode: result.filecode, record: result.record, raw: result.raw },
        { headers: jsonHeaders }
      );
    }

    if (url.pathname === "/api/sync/lulu" && request.method === "GET") {
      const pages = Math.max(1, Math.min(20, parseInt(url.searchParams.get("pages") || "1", 10)));
      const saved = await syncFromLulu(env, pages);
      return Response.json({ msg: "OK", saved }, { headers: jsonHeaders });
    }

    return new Response("Not found", { status: 404 });
  },
};
