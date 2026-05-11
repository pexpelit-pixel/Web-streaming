const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "*",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: jsonHeaders,
  });
}

function htmlPage(title, body, script = "") {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b1020;
      --panel: rgba(17, 25, 54, 0.92);
      --line: rgba(255,255,255,.08);
      --text: #e8eefc;
      --muted: #9fb0dd;
      --accent: #2f6bff;
      --accent2: #1a2446;
      --good: #22c55e;
      --danger: #ff4d4f;
      --radius: 22px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      background: radial-gradient(circle at top, #14204a 0, var(--bg) 42%);
      color: var(--text);
    }
    a { color: inherit; text-decoration: none; }
    .wrap {
      max-width: 1280px;
      margin: 0 auto;
      padding: 20px;
    }
    .hero {
      background: linear-gradient(135deg, rgba(47,107,255,.22), rgba(17,25,54,.92));
      border: 1px solid var(--line);
      border-radius: 28px;
      padding: 22px;
      margin-bottom: 16px;
      box-shadow: 0 14px 40px rgba(0,0,0,.22);
    }
    h1, h2, h3, p { margin-top: 0; }
    .muted { color: var(--muted); }
    .grid {
      display: grid;
      grid-template-columns: 1.1fr .9fr;
      gap: 16px;
      align-items: start;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 16px;
      box-shadow: 0 10px 28px rgba(0,0,0,.18);
      backdrop-filter: blur(18px);
    }
    .form {
      display: grid;
      gap: 10px;
    }
    .row2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    input, select, textarea, button {
      width: 100%;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.08);
      background: rgba(255,255,255,.06);
      color: var(--text);
      padding: 12px 14px;
      font-size: 14px;
      outline: none;
    }
    textarea { min-height: 96px; resize: vertical; }
    button {
      cursor: pointer;
      border: none;
      background: linear-gradient(135deg, var(--accent), #00d2ff);
      font-weight: 800;
      transition: transform .18s ease, opacity .18s ease;
    }
    button:hover { transform: translateY(-2px); opacity: .95; }
    button.secondary {
      background: rgba(255,255,255,.06);
      border: 1px solid var(--line);
    }
    button.good {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: #07110a;
    }
    button.danger {
      background: linear-gradient(135deg, #ff4d4f, #d61e45);
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      background: rgba(7, 16, 31, .86);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 14px;
      margin: 0;
      overflow: auto;
      max-height: 380px;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .chip {
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,.05);
      color: var(--muted);
      cursor: pointer;
      user-select: none;
    }
    .chip.active {
      color: #fff;
      background: linear-gradient(135deg, var(--accent), #00d2ff);
      border-color: transparent;
    }
    .table {
      display: grid;
      gap: 10px;
      margin-top: 12px;
    }
    .item {
      background: rgba(255,255,255,.04);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 12px;
    }
    .item .title { font-weight: 800; margin-bottom: 6px; }
    .item .meta { color: var(--muted); font-size: 13px; line-height: 1.5; }
    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    .actions button { width: auto; padding: 10px 12px; border-radius: 12px; }
    .split {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 10px;
    }
    .kpi {
      background: rgba(255,255,255,.05);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 14px;
    }
    .kpi b { display:block; font-size: 22px; margin-bottom: 4px; }
    .topbar {
      display:flex;
      justify-content:space-between;
      gap:12px;
      align-items:center;
      flex-wrap:wrap;
    }
    .small { font-size: 13px; color: var(--muted); }
    .footer {
      margin-top: 16px;
      color: var(--muted);
      font-size: 13px;
    }
    @media (max-width: 980px) {
      .grid, .row2, .split { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    ${body}
  </div>
  <script>
    ${script}
  </script>
</body>
</html>`;
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function dood(env, path, params = {}) {
  const base = env.DOOD_API || "https://doodapi.co";
  const url = new URL(path, base);
  url.searchParams.set("key", env.DOOD_KEY);

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v) !== "") {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "application/json, text/plain, */*",
    },
  });

  const text = await res.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON from Dood: " + text.slice(0, 300));
  }

  return data;
}

async function doodPost(env, path, body = {}) {
  const base = env.DOOD_API || "https://doodapi.co";
  const url = new URL(path, base);
  url.searchParams.set("key", env.DOOD_KEY);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/plain, */*",
      "user-agent": "Mozilla/5.0",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON from Dood: " + text.slice(0, 300));
  }

  return data;
}

function homePage() {
  return htmlPage(
    "Dood Proxy",
    `
      <div class="hero">
        <div class="topbar">
          <div>
            <h1 style="margin-bottom:8px">DoodStream Proxy API</h1>
            <div class="muted">Cloudflare Worker + tampilan simple + endpoint lengkap</div>
          </div>
          <div class="chips">
            <div class="chip active">Simple UI</div>
            <div class="chip">API Proxy</div>
            <div class="chip">GET / POST</div>
          </div>
        </div>
      </div>

      <div class="grid">
        <div class="panel">
          <h2>Upload By File / URL</h2>
          <div class="muted" style="margin-bottom:12px">Prioritas upload langsung ke DoodStream.</div>

          <div class="form">
            <input id="uploadUrl" placeholder="Direct video URL" />
            <div class="row2">
              <input id="uploadTitle" placeholder="Judul video" />
              <input id="uploadFolder" placeholder="Folder ID" value="0" />
            </div>
            <button class="good" onclick="showUploadMain()">Upload Remote URL</button>
          </div>

          <div style="height:18px"></div>

          <h2>Quick Actions</h2>
          <div class="row2">
            <button onclick="loadAccount()">Account Info</button>
            <button onclick="loadStats()">Account Stats</button>
          </div>
          <div class="row2" style="margin-top:10px">
            <button onclick="loadFiles()">File List</button>
            <button onclick="loadFolders()">Folder List</button>
          </div>
          <div class="row2" style="margin-top:10px">
            <button class="good" onclick="showUpload()">Remote Upload URL</button>
            <button onclick="loadUploadList()">Upload Queue</button>
          </div>

          <div class="footer">API key tidak tampil di frontend. Semua lewat Worker.</div>
        </div>

        <div class="panel">
          <h2>Output</h2>
          <pre id="out">Klik tombol di kiri untuk test.</pre>
        </div>
      </div>

      <div class="grid" style="margin-top:16px">
        <div class="panel">
          <h2>Tools</h2>
          <div class="form">
            <input id="searchTerm" placeholder="Search term" />
            <div class="row2">
              <button onclick="searchVideos()">Search Files</button>
              <button onclick="fileInfo()">File Info by Code</button>
            </div>
            <div class="row2">
              <button onclick="fileCheck()">File Check</button>
              <button onclick="createFolder()">Create Folder</button>
            </div>
            <div class="row2">
              <button onclick="renameFile()">Rename File</button>
              <button onclick="moveFile()">Move File</button>
            </div>
          </div>
        </div>

        <div class="panel">
          <h2>API Example</h2>
          <pre>
GET /account
GET /stats?last=7
GET /files?page=1&per_page=50
GET /file/info?file_code=xxx
POST /upload/url { url, fld_id, new_title }
POST /folder/create { name, parent_id }
          </pre>
        </div>
      </div>
    `,
    `
      const out = document.getElementById('out');
      const searchTerm = document.getElementById('searchTerm');

      async function show(res) {
        out.textContent = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      }

      async function api(path, opts) {
        const res = await fetch(path, opts || {});
        return res.json();
      }

      window.loadAccount = async () => show(await api('/account'));
      window.loadStats = async () => show(await api('/stats?last=7'));
      window.loadFiles = async () => show(await api('/files?page=1&per_page=10'));
      window.loadFolders = async () => show(await api('/folder/list?fld_id=0'));
      window.loadUploadList = async () => show(await api('/upload/list'));
      window.searchVideos = async () => show(await api('/search?q=' + encodeURIComponent(searchTerm.value || 'test')));

      window.fileInfo = async () => {
        const code = prompt('File code?');
        if (!code) return;
        show(await api('/file/info?file_code=' + encodeURIComponent(code)));
      };

      window.fileCheck = async () => {
        const code = prompt('File code?');
        if (!code) return;
        show(await api('/file/check?file_code=' + encodeURIComponent(code)));
      };

      window.createFolder = async () => {
        const name = prompt('Folder name?');
        if (!name) return;
        const res = await fetch('/folder/create', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, parent_id: '0' }),
        });
        show(await res.json());
      };

      window.renameFile = async () => {
        const file_code = prompt('File code?');
        if (!file_code) return;
        const title = prompt('New title?');
        if (!title) return;
        const res = await fetch('/file/rename', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ file_code, title }),
        });
        show(await res.json());
      };

      window.moveFile = async () => {
        const file_code = prompt('File code?');
        if (!file_code) return;
        const fld_id = prompt('Target folder id?');
        if (!fld_id) return;
        const res = await fetch('/file/move', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ file_code, fld_id }),
        });
        show(await res.json());
      };

      window.showUploadMain = async () => {
        const url = document.getElementById('uploadUrl').value.trim();
        const title = document.getElementById('uploadTitle').value.trim();
        const fld_id = document.getElementById('uploadFolder').value.trim() || '0';

        if (!url) {
          alert('URL wajib diisi');
          return;
        }

        out.textContent = 'Uploading...';

        const res = await fetch('/upload/url', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            url,
            fld_id,
            new_title: title,
          }),
        });

        show(await res.json());
      };

      window.showUpload = async () => {
        const url = prompt('Direct video URL?');
        if (!url) return;
        const title = prompt('New title?', '');
        const res = await fetch('/upload/url', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url, new_title: title || '' }),
        });
        show(await res.json());
      };
    `
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response("", { headers: jsonHeaders });
    }

    if (!env.DOOD_KEY) {
      return json({ msg: "Missing DOOD_KEY", status: 500 }, 500);
    }

    try {
      if (url.pathname === "/") {
        return new Response(homePage(), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      if (url.pathname === "/account") {
        return json(await dood(env, "/api/account/info"));
      }

      if (url.pathname === "/stats") {
        return json(
          await dood(env, "/api/account/stats", {
            last: url.searchParams.get("last") || "7",
            from_date: url.searchParams.get("from_date") || "",
            to_date: url.searchParams.get("to_date") || "",
          })
        );
      }

      if (url.pathname === "/upload/url" && request.method === "POST") {
        const body = await request.json();
        if (!body.url) return json({ msg: "url required", status: 400 }, 400);

        return json(
          await dood(env, "/api/upload/url", {
            url: body.url,
            fld_id: body.fld_id || "0",
            new_title: body.new_title || body.title || "",
          })
        );
      }

      if (url.pathname === "/upload/status") {
        const file_code = url.searchParams.get("file_code");
        if (!file_code) return json({ msg: "file_code required", status: 400 }, 400);
        return json(await dood(env, "/api/urlupload/status", { file_code }));
      }

      if (url.pathname === "/upload/list") {
        return json(await dood(env, "/api/urlupload/list"));
      }

      if (url.pathname === "/files") {
        return json(
          await dood(env, "/api/file/list", {
            page: url.searchParams.get("page") || "1",
            per_page: url.searchParams.get("per_page") || "50",
            fld_id: url.searchParams.get("fld_id") || "",
            created: url.searchParams.get("created") || "",
          })
        );
      }

      if (url.pathname === "/file/info") {
        const file_code = url.searchParams.get("file_code");
        if (!file_code) return json({ msg: "file_code required", status: 400 }, 400);
        return json(await dood(env, "/api/file/info", { file_code }));
      }

      if (url.pathname === "/file/check") {
        const file_code = url.searchParams.get("file_code");
        if (!file_code) return json({ msg: "file_code required", status: 400 }, 400);
        return json(await dood(env, "/api/file/check", { file_code }));
      }

      if (url.pathname === "/file/rename" && request.method === "POST") {
        const body = await request.json();
        if (!body.file_code || !body.title) {
          return json({ msg: "file_code & title required", status: 400 }, 400);
        }
        return json(
          await dood(env, "/api/file/rename", {
            file_code: body.file_code,
            title: body.title,
          })
        );
      }

      if (url.pathname === "/file/move" && request.method === "POST") {
        const body = await request.json();
        if (!body.file_code || !body.fld_id) {
          return json({ msg: "file_code & fld_id required", status: 400 }, 400);
        }
        return json(
          await dood(env, "/api/file/move", {
            file_code: body.file_code,
            fld_id: body.fld_id,
          })
        );
      }

      if (url.pathname === "/folder/create" && request.method === "POST") {
        const body = await request.json();
        if (!body.name) return json({ msg: "name required", status: 400 }, 400);

        return json(
          await dood(env, "/api/folder/create", {
            name: body.name,
            parent_id: body.parent_id || "0",
          })
        );
      }

      if (url.pathname === "/folder/list") {
        return json(
          await dood(env, "/api/folder/list", {
            fld_id: url.searchParams.get("fld_id") || "0",
            only_folders: url.searchParams.get("only_folders") || "0",
          })
        );
      }

      if (url.pathname === "/search") {
        const q = url.searchParams.get("q");
        if (!q) return json({ msg: "q required", status: 400 }, 400);
        return json(await dood(env, "/api/search/videos", { search_term: q }));
      }

      return json({ msg: "Not found", status: 404 }, 404);
    } catch (err) {
      return json({ msg: err.message || "Internal error", status: 500 }, 500);
    }
  },
};

