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
    .progress {
      margin-top: 10px;
      height: 16px;
      background: rgba(255,255,255,.08);
      border-radius: 999px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, var(--accent), #00d2ff);
      transition: width .3s ease;
    }
    @media (max-width: 980px) {
      .grid, .row2 { grid-template-columns: 1fr; }
    }
    /* Stream page */
    .video-container {
      position: relative;
      padding-bottom: 56.25%;
      height: 0;
      overflow: hidden;
      border-radius: 24px;
      border: 1px solid var(--line);
      background: #000;
    }
    .video-container iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
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
  try { data = JSON.parse(text); } catch { throw new Error("Invalid JSON from Dood: " + text.slice(0, 300)); }
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
  try { data = JSON.parse(text); } catch { throw new Error("Invalid JSON from Dood: " + text.slice(0, 300)); }
  return data;
}

// Halaman Utama (dashboard)
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
            <a href="/uploader" class="chip">📤 Uploader</a>
            <a href="/stream" class="chip">▶️ Stream</a>
            <div class="chip active">API</div>
          </div>
        </div>
      </div>
      <!-- ... (sisa dashboard sama seperti sebelumnya) ... -->
    `,
    `/* ... script client-side sama seperti sebelumnya ... */`
  );
}

// Halaman Uploader
function uploaderPage() {
  return htmlPage(
    "Upload Video - DoodStream",
    `
      <div class="hero">
        <h1>📤 Upload Video</h1>
        <div class="muted">Upload via URL atau file langsung ke DoodStream</div>
        <div class="chips" style="margin-top:12px">
          <a href="/" class="chip">← Dashboard</a>
          <a href="/stream" class="chip">Stream</a>
        </div>
      </div>

      <div class="grid">
        <div class="panel">
          <h2>🌐 Upload via URL</h2>
          <div class="form">
            <input id="urlInput" placeholder="Direct video URL (mp4, mkv, dll)" />
            <div class="row2">
              <input id="urlTitle" placeholder="Judul video" />
              <input id="urlFolder" placeholder="Folder ID (default 0)" value="0" />
            </div>
            <button class="good" onclick="uploadByUrl()">Upload URL</button>
          </div>
        </div>

        <div class="panel">
          <h2>📁 Upload File Langsung</h2>
          <div class="form">
            <input type="file" id="fileInput" accept="video/*" />
            <div class="row2">
              <input id="fileTitle" placeholder="Judul video" />
              <input id="fileFolder" placeholder="Folder ID" value="0" />
            </div>
            <div class="progress" id="progressBar" style="display:none">
              <div class="progress-fill" id="progressFill"></div>
            </div>
            <button class="good" onclick="uploadFile()">Upload File</button>
          </div>
        </div>
      </div>

      <div class="panel" style="margin-top:16px">
        <h2>Hasil Upload</h2>
        <pre id="result">Menunggu upload...</pre>
      </div>
    `,
    `
      const result = document.getElementById('result');
      function show(obj) { result.textContent = JSON.stringify(obj, null, 2); }

      window.uploadByUrl = async () => {
        const url = document.getElementById('urlInput').value.trim();
        const title = document.getElementById('urlTitle').value.trim();
        const fld_id = document.getElementById('urlFolder').value.trim() || '0';
        if (!url) return alert('URL diperlukan');
        show({ status: 'uploading...' });
        try {
          const res = await fetch('/upload/url', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ url, fld_id, new_title: title }),
          });
          show(await res.json());
        } catch(e) { show({ error: e.message }); }
      };

      window.uploadFile = () => {
        const file = document.getElementById('fileInput').files[0];
        if (!file) return alert('Pilih file video');
        const title = document.getElementById('fileTitle').value.trim();
        const fld_id = document.getElementById('fileFolder').value.trim() || '0';

        const form = new FormData();
        form.append('file', file);
        form.append('fld_id', fld_id);
        form.append('new_title', title);

        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');
        progressBar.style.display = 'block';
        progressFill.style.width = '0%';
        show({ status: 'uploading...' });

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = (e.loaded / e.total) * 100;
            progressFill.style.width = pct + '%';
            show({ uploaded: pct.toFixed(1) + '%' });
          }
        };
        xhr.onload = () => {
          try { show(JSON.parse(xhr.responseText)); } catch { show({ raw: xhr.responseText }); }
          progressBar.style.display = 'none';
        };
        xhr.onerror = () => { show({ error: 'Upload gagal' }); progressBar.style.display = 'none'; };
        xhr.open('POST', '/upload/file');
        xhr.send(form);
      };
    `
  );
}

// Halaman Streaming
function streamPage(file_code = "") {
  const embedUrl = file_code ? `https://dood.wf/e/${file_code}` : "";
  return htmlPage(
    "Streaming - DoodStream",
    `
      <div class="hero">
        <h1>▶️ Streaming Video</h1>
        <div class="muted">Masukkan file_code atau tonton video dari DoodStream</div>
        <div class="chips" style="margin-top:12px">
          <a href="/" class="chip">← Dashboard</a>
          <a href="/uploader" class="chip">Upload</a>
        </div>
      </div>

      <div class="panel" style="margin-bottom:16px">
        <div class="form">
          <div class="row2">
            <input id="fileCodeInput" placeholder="Masukkan file_code" value="${escapeHtml(file_code)}" />
            <button onclick="location.href='/stream?file_code=' + document.getElementById('fileCodeInput').value.trim()">
              Tonton
            </button>
          </div>
        </div>
      </div>

      ${file_code ? `
      <div class="panel">
        <div class="video-container">
          <iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>
        </div>
        <p style="margin-top:10px">File Code: <strong>${escapeHtml(file_code)}</strong></p>
        <p class="muted">Embed: ${embedUrl}</p>
      </div>
      ` : `
      <div class="panel">
        <p class="muted">Masukkan file_code di atas untuk menonton video.</p>
      </div>
      `}
    `,
    ""
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
      // Halaman Utama
      if (url.pathname === "/") {
        return new Response(homePage(), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      // Halaman Uploader
      if (url.pathname === "/uploader") {
        return new Response(uploaderPage(), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      // Halaman Streaming
      if (url.pathname === "/stream") {
        const file_code = url.searchParams.get("file_code") || "";
        return new Response(streamPage(file_code), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      // --- API Endpoints ---

      if (url.pathname === "/account") {
        return json(await dood(env, "/api/account/info"));
      }

      if (url.pathname === "/stats") {
        return json(await dood(env, "/api/account/stats", {
          last: url.searchParams.get("last") || "7",
          from_date: url.searchParams.get("from_date") || "",
          to_date: url.searchParams.get("to_date") || "",
        }));
      }

      if (url.pathname === "/upload/url" && request.method === "POST") {
        const body = await request.json();
        if (!body.url) return json({ msg: "url required", status: 400 }, 400);
        return json(await dood(env, "/api/upload/url", {
          url: body.url,
          fld_id: body.fld_id || "0",
          new_title: body.new_title || body.title || "",
        }));
      }

      // Upload server (untuk upload file langsung)
      if (url.pathname === "/upload/server") {
        return json(await dood(env, "/api/upload/server"));
      }

      // Upload file langsung
      if (url.pathname === "/upload/file" && request.method === "POST") {
        try {
          // 1. Dapatkan server upload
          const serverRes = await dood(env, "/api/upload/server");
          const uploadUrl = serverRes.result;
          if (!uploadUrl) {
            return json({ msg: "Gagal mendapatkan upload server", status: 500 }, 500);
          }

          // 2. Ambil file dari request client
          const form = await request.formData();
          const file = form.get("file");
          const fld_id = form.get("fld_id") || "0";
          const new_title = form.get("new_title") || "";

          if (!file) return json({ msg: "File wajib diisi", status: 400 }, 400);

          // 3. Kirim file ke server Dood
          const doodForm = new FormData();
          doodForm.append("api_key", env.DOOD_KEY);
          doodForm.append("file", file, file.name);
          doodForm.append("fld_id", fld_id);
          if (new_title) doodForm.append("file_title", new_title);

          const uploadRes = await fetch(uploadUrl, {
            method: "POST",
            body: doodForm,
          });
          const data = await uploadRes.json();

          if (data.status !== 200) {
            return json({ msg: "Upload gagal", error: data, status: 500 }, 500);
          }

          return json({ msg: "OK", result: data });
        } catch (err) {
          return json({ msg: err.message, status: 500 }, 500);
        }
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
        return json(await dood(env, "/api/file/list", {
          page: url.searchParams.get("page") || "1",
          per_page: url.searchParams.get("per_page") || "50",
          fld_id: url.searchParams.get("fld_id") || "",
          created: url.searchParams.get("created") || "",
        }));
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
        return json(await dood(env, "/api/file/rename", {
          file_code: body.file_code,
          title: body.title,
        }));
      }

      if (url.pathname === "/file/move" && request.method === "POST") {
        const body = await request.json();
        if (!body.file_code || !body.fld_id) {
          return json({ msg: "file_code & fld_id required", status: 400 }, 400);
        }
        return json(await dood(env, "/api/file/move", {
          file_code: body.file_code,
          fld_id: body.fld_id,
        }));
      }

      if (url.pathname === "/folder/create" && request.method === "POST") {
        const body = await request.json();
        if (!body.name) return json({ msg: "name required", status: 400 }, 400);
        return json(await dood(env, "/api/folder/create", {
          name: body.name,
          parent_id: body.parent_id || "0",
        }));
      }

      if (url.pathname === "/folder/list") {
        return json(await dood(env, "/api/folder/list", {
          fld_id: url.searchParams.get("fld_id") || "0",
          only_folders: url.searchParams.get("only_folders") || "0",
        }));
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
