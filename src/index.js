
// ===============================
// XPANAS STREAMING WORKER
// MODERN UI VERSION
// ===============================

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

  for (const [k, v] of form.entries()) {
    obj[k] = String(v);
  }

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
  await kvPutJson(env, "index:all", [...new Set(ids)]);
}

async function loadCategoryIds(env, category) {
  const ids = await kvGetJson(env, `index:cat:${slugify(category)}`, []);
  return Array.isArray(ids) ? ids : [];
}

async function saveCategoryIds(env, category, ids) {
  await kvPutJson(env, `index:cat:${slugify(category)}`, [...new Set(ids)]);
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

async function searchVideos(env, {
  q = "",
  category = "",
  page = 1,
  perPage = 24,
}) {
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

  return {
    items: items.slice(start, start + perPage),
    total,
    page,
    perPage,
    pages,
  };
}

// ====================================
// MODERN UI RENDER
// ====================================

function renderApp(appName) {
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(appName)}</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<style>
*{
margin:0;
padding:0;
box-sizing:border-box;
}

:root{
--bg:#050816;
--card:rgba(18,22,40,.7);
--line:rgba(255,255,255,.08);
--text:#ffffff;
--muted:#9ba6d1;
--accent:#6c5cff;
--accent2:#00d2ff;
--radius:24px;
}

body{
font-family:'Inter',sans-serif;
background:
radial-gradient(circle at top left,#1f2b68 0%,transparent 30%),
radial-gradient(circle at bottom right,#0c4d6e 0%,transparent 25%),
var(--bg);
min-height:100vh;
color:var(--text);
overflow-x:hidden;
}

body::before{
content:'';
position:fixed;
inset:0;
background:
linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),
linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);
background-size:40px 40px;
pointer-events:none;
}

.wrap{
max-width:1400px;
margin:auto;
padding:24px;
}

.hero{
position:relative;
padding:38px;
border-radius:32px;
background:linear-gradient(135deg,rgba(108,92,255,.28),rgba(0,210,255,.12));
backdrop-filter:blur(20px);
border:1px solid rgba(255,255,255,.08);
overflow:hidden;
box-shadow:0 25px 60px rgba(0,0,0,.35);
}

.hero::after{
content:'';
position:absolute;
width:300px;
height:300px;
background:rgba(255,255,255,.08);
filter:blur(80px);
right:-80px;
top:-80px;
border-radius:50%;
}

.hero h1{
font-size:52px;
font-weight:800;
letter-spacing:-2px;
margin-bottom:10px;
}

.hero p{
max-width:720px;
line-height:1.7;
color:var(--muted);
font-size:15px;
}

.searchbar{
margin-top:28px;
display:grid;
grid-template-columns:1fr 220px 140px;
gap:14px;
}

input,select,textarea{
width:100%;
background:rgba(255,255,255,.06);
border:1px solid rgba(255,255,255,.08);
color:white;
padding:16px 18px;
border-radius:18px;
font-size:14px;
backdrop-filter:blur(14px);
outline:none;
transition:.2s;
}

input:focus,
select:focus,
textarea:focus{
border-color:var(--accent2);
box-shadow:0 0 0 4px rgba(0,210,255,.1);
}

button{
border:none;
cursor:pointer;
border-radius:18px;
padding:16px 18px;
font-weight:700;
background:linear-gradient(135deg,var(--accent),var(--accent2));
color:white;
transition:.25s;
}

button:hover{
transform:translateY(-2px) scale(1.01);
box-shadow:0 10px 28px rgba(108,92,255,.3);
}

.layout{
display:grid;
grid-template-columns:1fr 380px;
gap:24px;
margin-top:24px;
}

.panel{
background:var(--card);
border:1px solid var(--line);
backdrop-filter:blur(20px);
border-radius:30px;
padding:24px;
box-shadow:0 20px 40px rgba(0,0,0,.25);
}

.topbar{
display:flex;
justify-content:space-between;
align-items:center;
gap:16px;
margin-bottom:18px;
flex-wrap:wrap;
}

.grid{
display:grid;
grid-template-columns:repeat(auto-fill,minmax(240px,1fr));
gap:20px;
}

.video{
position:relative;
overflow:hidden;
border-radius:26px;
background:#11172a;
border:1px solid rgba(255,255,255,.06);
transition:.3s;
cursor:pointer;
}

.video:hover{
transform:translateY(-6px) scale(1.02);
box-shadow:0 20px 50px rgba(0,0,0,.35);
border-color:rgba(108,92,255,.5);
}

.thumb{
width:100%;
aspect-ratio:16/9;
object-fit:cover;
background:#0b1020;
}

.overlay{
position:absolute;
inset:0;
background:linear-gradient(to top,rgba(0,0,0,.7),transparent 55%);
pointer-events:none;
}

.play{
position:absolute;
top:50%;
left:50%;
transform:translate(-50%,-50%);
width:72px;
height:72px;
border-radius:50%;
background:rgba(255,255,255,.15);
backdrop-filter:blur(12px);
display:flex;
align-items:center;
justify-content:center;
font-size:28px;
opacity:0;
transition:.25s;
}

.video:hover .play{
opacity:1;
}

.vbody{
padding:18px;
}

.title{
font-size:16px;
font-weight:700;
line-height:1.5;
margin-bottom:10px;
min-height:48px;
}

.meta{
font-size:13px;
color:var(--muted);
display:flex;
flex-direction:column;
gap:4px;
}

.tags{
display:flex;
flex-wrap:wrap;
gap:8px;
margin-top:14px;
}

.tag{
padding:6px 12px;
border-radius:999px;
font-size:11px;
background:rgba(108,92,255,.15);
border:1px solid rgba(108,92,255,.25);
}

.status{
padding:16px;
border-radius:18px;
background:rgba(255,255,255,.04);
line-height:1.6;
font-size:14px;
color:var(--muted);
margin-top:18px;
}

.pagination{
display:flex;
justify-content:center;
gap:12px;
margin-top:26px;
flex-wrap:wrap;
}

.pagination button{
min-width:52px;
}

.cats{
display:flex;
gap:12px;
flex-wrap:wrap;
margin-top:18px;
}

.pill{
padding:10px 16px;
border-radius:999px;
background:rgba(255,255,255,.06);
border:1px solid rgba(255,255,255,.06);
font-size:13px;
color:var(--muted);
cursor:pointer;
transition:.2s;
}

.pill:hover,
.pill.active{
background:linear-gradient(135deg,var(--accent),var(--accent2));
color:white;
}

textarea{
min-height:120px;
resize:vertical;
}

.formgrid{
display:grid;
grid-template-columns:1fr 1fr;
gap:14px;
}

@media(max-width:1100px){
.layout{
grid-template-columns:1fr;
}
}

@media(max-width:760px){
.hero h1{
font-size:38px;
}

.searchbar,
.formgrid{
grid-template-columns:1fr;
}

.wrap{
padding:16px;
}

.hero,
.panel{
padding:20px;
}
}
</style>
</head>
<body>

<div class="wrap">

<div class="hero">
<h1>${escapeHtml(appName)}</h1>
<p>
Platform streaming modern berbasis Cloudflare Worker + KV + LuluStream.
Upload, sync, cari video, dan streaming dengan UI cinematic modern.
</p>

<div class="searchbar">
<input id="q" placeholder="Cari anime, movie, title, tags...">
<select id="category">
<option value="all">Semua Kategori</option>
</select>
<button onclick="doSearch()">Search</button>
</div>

<div class="cats" id="catPills"></div>
</div>

<div class="layout">

<div class="panel">
<div class="topbar">
<div>
<h2>Daftar Video</h2>
<div id="resultInfo" style="color:var(--muted);margin-top:8px">Loading...</div>
</div>

<div style="display:flex;gap:12px;flex-wrap:wrap">
<button onclick="syncFromLulu()">Sync Lulu</button>
<button onclick="loadVideos()">Reload</button>
</div>
</div>

<div class="grid" id="grid"></div>
<div class="pagination" id="pagination"></div>
</div>

<div class="panel">
<h2>Upload Video</h2>

<div style="height:18px"></div>

<input id="u_title" placeholder="Judul video">
<div style="height:14px"></div>

<input id="u_url" placeholder="Direct video URL">
<div style="height:14px"></div>

<input id="u_category" placeholder="Kategori">
<div style="height:14px"></div>

<input id="u_tags" placeholder="Tags pisahkan koma">
<div style="height:14px"></div>

<textarea id="u_descr" placeholder="Description"></textarea>

<div style="height:14px"></div>

<div class="formgrid">
<input id="u_fld" placeholder="Folder ID" value="0">
<input id="u_catid" placeholder="Category ID" value="0">
</div>

<div style="height:14px"></div>

<div class="formgrid">
<input id="u_public" value="1" placeholder="Public 1/0">
<input id="u_adult" value="0" placeholder="Adult 1/0">
</div>

<div style="height:18px"></div>

<button style="width:100%" onclick="uploadByUrl()">
Upload ke LuluStream
</button>

<div class="status" id="status">
System ready.
</div>
</div>

</div>
</div>

<script>
let state={
page:1,
perPage:24,
q:'',
category:'all',
pages:1,
};

function qs(id){
return document.getElementById(id);
}

function setStatus(msg){
qs('status').textContent=msg;
}

function escapeJs(str=''){
return String(str)
.replaceAll('\\','\\\\')
.replaceAll("'","\\'");
}

function renderCategories(categories){
const select=qs('category');
const pills=qs('catPills');

const unique=['all',...categories.filter(Boolean)];

select.innerHTML=unique.map(c=>
'<option value="'+escapeHtml(c)+'">'+escapeHtml(c)+'</option>'
).join('');

pills.innerHTML=unique.map(c=>{
const active=c===state.category?'active':'';
const label=c==='all'?'Semua':c;

return '<div class="pill '+active+'" onclick="setCategory(\''+escapeJs(c)+'\')">'+label+'</div>';
}).join('');
}

function cardHtml(v){
const thumb=v.thumb||'https://picsum.photos/800/450?blur=3';

const tags=Array.isArray(v.tags)
?v.tags
:String(v.tags||'')
.split(',')
.map(s=>s.trim())
.filter(Boolean);

return `
<div class="video" onclick="openVideo('${escapeJs(v.id)}')">
<img class="thumb" src="${escapeHtml(thumb)}">
<div class="overlay"></div>
<div class="play">▶</div>

<div class="vbody">
<div class="title">${escapeHtml(v.title||'Untitled')}</div>

<div class="meta">
<div>📁 ${escapeHtml(v.category||'other')}</div>
<div>👁 ${escapeHtml(v.views||'0')} views</div>
<div>🧩 ${escapeHtml(v.file_code||'-')}</div>
</div>

<div class="tags">
${tags.slice(0,4).map(t=>`<div class="tag">${escapeHtml(t)}</div>`).join('')}
</div>
</div>
</div>
`;
}

async function fetchJson(url,opts={}){
const res=await fetch(url,opts);

if(!res.ok){
throw new Error(await res.text());
}

return res.json();
}

async function loadVideos(page=1){
state.page=page;

setStatus('Loading videos...');

const url=new URL('/api/videos',location.origin);

url.searchParams.set('page',state.page);
url.searchParams.set('per_page',state.perPage);

if(state.q) url.searchParams.set('q',state.q);
if(state.category!=='all') url.searchParams.set('category',state.category);

const data=await fetchJson(url);

state.pages=data.pages||1;

renderCategories([
...new Set((data.all_categories||[]).filter(Boolean))
]);

qs('grid').innerHTML=data.items.map(cardHtml).join('');

qs('resultInfo').textContent=
`${data.total} video • halaman ${data.page}/${data.pages}`;

const pag=[];

if(state.page>1){
pag.push(`<button onclick="loadVideos(${state.page-1})">Prev</button>`);
}

for(let i=1;i<=state.pages;i++){
if(i>=state.page-2&&i<=state.page+2){
pag.push(`<button onclick="loadVideos(${i})">${i}</button>`);
}
}

if(state.page<state.pages){
pag.push(`<button onclick="loadVideos(${state.page+1})">Next</button>`);
}

qs('pagination').innerHTML=pag.join('');

setStatus('Ready');
}

function doSearch(){
state.q=qs('q').value.trim();
state.category=qs('category').value;
loadVideos(1);
}

function setCategory(cat){
state.category=cat;
qs('category').value=cat;
loadVideos(1);
}

function openVideo(id){
location.href='/watch?id='+encodeURIComponent(id);
}

async function uploadByUrl(){
try{
setStatus('Uploading to LuluStream...');

const payload={
url:qs('u_url').value.trim(),
title:qs('u_title').value.trim(),
description:qs('u_descr').value.trim(),
category:qs('u_category').value.trim()||'other',
tags:qs('u_tags').value.trim(),
fld_id:qs('u_fld').value.trim()||'0',
cat_id:qs('u_catid').value.trim()||'0',
file_public:qs('u_public').value.trim()||'1',
file_adult:qs('u_adult').value.trim()||'0',
};

const data=await fetchJson('/api/upload/url',{
method:'POST',
headers:{'content-type':'application/json'},
body:JSON.stringify(payload)
});

setStatus('Upload success: '+data.filecode);

await loadVideos(1);
}catch(err){
setStatus('Error: '+err.message);
}
}

async function syncFromLulu(){
try{
setStatus('Syncing from LuluStream...');

const data=await fetchJson('/api/sync/lulu?pages=1');

setStatus('Sync selesai: '+data.saved+' video');

await loadVideos(state.page);
}catch(err){
setStatus('Sync error: '+err.message);
}
}

qs('q').addEventListener('keydown',e=>{
if(e.key==='Enter') doSearch();
});

loadVideos();
</script>
</body>
</html>`;
}

// lanjutkan endpoint API & watch page milikmu sebelumnya
// bagian backend tetap kompatibel dengan code lama

export default {
async fetch(request,env){
const url=new URL(request.url);

if(url.pathname==='/'){
return new Response(renderApp(env.APP_NAME||'XPanas Streaming'),{
headers:{
'content-type':'text/html; charset=utf-8'
}
});
}

return new Response('Worker running');
}
};
