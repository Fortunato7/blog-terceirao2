// ══════════════════════════════════════════════════════
//  FIREBASE — configuração e inicialização
// ══════════════════════════════════════════════════════
import { initializeApp }                          from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc,
         getDocs, addDoc, deleteDoc,
         onSnapshot, setDoc, getDoc,
         query }                         from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
 
const firebaseConfig = {
  apiKey:            "AIzaSyC7pvlMpOdiLonmXmUb7E3H-FHY7KsRHj0",
  authDomain:        "terceirao-rousset.firebaseapp.com",
  projectId:         "terceirao-rousset",
  storageBucket:     "terceirao-rousset.firebasestorage.app",
  messagingSenderId: "90971827100",
  appId:             "1:90971827100:web:a021ed3a928fcebfabf659"
};
 
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
 
// ── Referências às coleções ───────────────────────────
const colPosts   = collection(db, "posts");
const colRecados = collection(db, "recados");
const colAlunos  = collection(db, "alunos");
const colEventos = collection(db, "eventos");
const docConfig  = doc(db, "config", "geral");
 
// ══════════════════════════════════════════════════════
//  ESTADO LOCAL (espelho do banco em memória)
// ══════════════════════════════════════════════════════
let posts   = [];
let recados = [];
let alunos  = [];
let eventos = [];
let config  = { formatura: "2026-12-15", nome: "Terceirão 2 Rousset", senha: "rousset2025" };
let admLogado = false;
 
// ══════════════════════════════════════════════════════
//  CARREGAMENTO INICIAL — lê tudo do Firestore
// ══════════════════════════════════════════════════════
window.carregarTudo = async function carregarTudo() {
  mostrarLoading(true);
 
  // Timeout de segurança: se demorar mais de 6s, some o loading
  const timeout = setTimeout(() => {
    mostrarLoading(false);
    renderFeed();
    updateCountdown();
  }, 6000);
 
  try {
    // Config
    const snapConfig = await getDoc(docConfig);
    if (snapConfig.exists()) config = { ...config, ...snapConfig.data() };
 
    // Posts — busca simples, ordena no JS
    const snapPosts = await getDocs(colPosts);
    posts = snapPosts.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(b.data) - new Date(a.data));
 
    // Recados — busca simples, ordena no JS
    const snapRecados = await getDocs(colRecados);
    recados = snapRecados.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(b.data) - new Date(a.data));
 
    // Alunos
    const snapAlunos = await getDocs(colAlunos);
    alunos = snapAlunos.docs.map(d => ({ id: d.id, ...d.data() }));
 
    // Eventos — busca simples, ordena no JS
    const snapEventos = await getDocs(colEventos);
    eventos = snapEventos.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => new Date(b.data) - new Date(a.data));
 
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
    mostrarLoading(false);
    toast("Erro: " + e.message);
    return;
  }
  clearTimeout(timeout);
  mostrarLoading(false);
  renderFeed();
  updateCountdown();
}
 
function mostrarLoading(sim) {
  const el = document.getElementById("loading-overlay");
  if (el) el.style.display = sim ? "flex" : "none";
}
 
// ══════════════════════════════════════════════════════
//  NAVEGAÇÃO
// ══════════════════════════════════════════════════════
function goPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".mobile-nav-btn").forEach(b => b.classList.remove("active"));
 
  document.getElementById("page-" + id).classList.add("active");
 
  const tab = document.querySelector(`.nav-tab[onclick="goPage('${id}')"]`);
  if (tab) tab.classList.add("active");
 
  const mobBtn = document.getElementById("mob-" + id);
  if (mobBtn) mobBtn.classList.add("active");
 
  if (id === "feed")     renderFeed();
  if (id === "mural")    renderMural();
  if (id === "alunos")   renderAlunos();
  if (id === "timeline") renderTimeline();
}
 
// Expõe goPage globalmente (necessário para onclick inline no HTML)
window.goPage = goPage;
 
// ══════════════════════════════════════════════════════
//  COUNTDOWN
// ══════════════════════════════════════════════════════
function updateCountdown() {
  const diff = new Date(config.formatura + "T20:00:00") - new Date();
  if (diff <= 0) {
    ["cd-dias","cd-horas","cd-min","cd-seg"].forEach(id => {
      document.getElementById(id).textContent = "🎓";
    });
    return;
  }
  document.getElementById("cd-dias").textContent  = Math.floor(diff / 86400000);
  document.getElementById("cd-horas").textContent = Math.floor((diff % 86400000) / 3600000);
  document.getElementById("cd-min").textContent   = Math.floor((diff % 3600000) / 60000);
  document.getElementById("cd-seg").textContent   = Math.floor((diff % 60000) / 1000);
}
setInterval(updateCountdown, 1000);
 
// ══════════════════════════════════════════════════════
//  FEED
// ══════════════════════════════════════════════════════
function renderFeed() {
  const grid  = document.getElementById("feed-grid");
  const empty = document.getElementById("feed-empty");
  if (!posts.length) { grid.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";
  grid.innerHTML = posts.map(p => {
    let media = p.tipo === "imagem_url" || p.tipo === "imagem_upload"
      ? `<img class="feed-media" src="${p.midia}" style="aspect-ratio:1;" loading="lazy" onerror="this.style.display='none'"/>`
      : p.tipo === "video_url"
      ? `<div class="feed-video-wrap"><video controls class="feed-media" src="${p.midia}"></video><span class="feed-video-badge">▶ Vídeo</span></div>`
      : `<div class="feed-media-placeholder">${p.emoji || "📸"}</div>`;
    const tags = (p.tags || []).map(t => `<span class="feed-tag">${t}</span>`).join("");
    return `<div class="feed-card">${media}<div class="feed-body">
      <div class="feed-author">
        <div class="feed-avatar">${p.autor[0].toUpperCase()}</div>
        <div>
          <div class="feed-author-name">${p.autor}</div>
          <div class="feed-date">${fmtDate(p.data)}</div>
        </div>
      </div>
      <div class="feed-desc">${p.desc}</div>
      ${tags ? `<div class="feed-tags">${tags}</div>` : ""}
    </div></div>`;
  }).join("");
}
 
// ══════════════════════════════════════════════════════
//  MURAL
// ══════════════════════════════════════════════════════
async function postarRecado() {
  const nome = document.getElementById("mural-nome").value.trim();
  const msg  = document.getElementById("mural-msg").value.trim();
  if (!nome || !msg) { toast("Preencha nome e mensagem!"); return; }
  try {
    const novo = { nome, msg, data: new Date().toISOString() };
    const ref = await addDoc(colRecados, novo);
    recados.unshift({ id: ref.id, ...novo });
    document.getElementById("mural-nome").value = "";
    document.getElementById("mural-msg").value  = "";
    renderMural();
    renderAdmRecados();
    toast("Recado publicado! 💬");
  } catch(e) { toast("Erro ao publicar recado 😢"); console.error(e); }
}
window.postarRecado = postarRecado;
 
function renderMural() {
  const grid  = document.getElementById("mural-grid");
  const empty = document.getElementById("mural-empty");
  if (!recados.length) { grid.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";
  grid.innerHTML = recados.map(r =>
    `<div class="mural-card">
      <div class="mural-from">✉ ${r.nome}</div>
      <div class="mural-msg">${r.msg}</div>
      <div class="mural-time">${fmtDate(r.data)}</div>
    </div>`
  ).join("");
}
 
// ══════════════════════════════════════════════════════
//  ALUNOS
// ══════════════════════════════════════════════════════
function renderAlunos() {
  const grid  = document.getElementById("alunos-grid");
  const empty = document.getElementById("alunos-empty");
  if (!alunos.length) { grid.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";
  grid.innerHTML = alunos.map(a => {
    let avatar = a.foto
      ? `<img class="aluno-foto" src="${a.foto}" alt="${a.nome}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
         <div class="aluno-foto-placeholder" style="display:none;">${a.emoji || a.nome[0].toUpperCase()}</div>`
      : `<div class="aluno-foto-placeholder">${a.emoji || a.nome[0].toUpperCase()}</div>`;
    return `<div class="aluno-card">
      <div class="aluno-foto-wrap">${avatar}</div>
      ${a.apelido   ? `<div class="aluno-apelido">🏷 ${a.apelido}</div>` : ""}
      <div class="aluno-name">${a.nome}</div>
      ${a.profissao ? `<div class="aluno-profissao">🎯 ${a.profissao}</div>` : ""}
      ${a.bio       ? `<div class="aluno-bio">"${a.bio}"</div>` : ""}
    </div>`;
  }).join("");
}
 
// ══════════════════════════════════════════════════════
//  TIMELINE
// ══════════════════════════════════════════════════════
function renderTimeline() {
  const list  = document.getElementById("timeline-list");
  const empty = document.getElementById("timeline-empty");
  if (!eventos.length) { list.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";
  list.innerHTML = eventos.map(e =>
    `<div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-card">
        <div class="timeline-date">📅 ${fmtDateBr(e.data)}</div>
        <div class="timeline-title">${e.titulo}</div>
        <div class="timeline-desc">${e.desc}</div>
      </div>
    </div>`
  ).join("");
}
 
// ══════════════════════════════════════════════════════
//  ADM — LOGIN / LOGOUT
// ══════════════════════════════════════════════════════
window.admLogin = async function() {
  const digitada = document.getElementById("adm-senha").value;
  if (digitada === config.senha) {
    admLogado = true;
    document.getElementById("adm-login-screen").style.display = "none";
    document.getElementById("adm-content").style.display = "block";
    document.getElementById("config-formatura").value = config.formatura;
    document.getElementById("config-nome").value = config.nome;
    document.getElementById("mural-form-adm").style.display = "block";
    document.getElementById("mural-aviso-visitante").style.display = "none";
    renderAdmPosts(); renderAdmAlunos(); renderAdmEventos(); renderAdmRecados();
    toast("Bem-vindo, ADM! 🦊");
  } else {
    toast("Senha incorreta!");
    document.getElementById("adm-senha").value = "";
  }
};
 
window.admLogout = function() {
  admLogado = false;
  document.getElementById("adm-login-screen").style.display = "block";
  document.getElementById("adm-content").style.display = "none";
  document.getElementById("adm-senha").value = "";
  document.getElementById("mural-form-adm").style.display = "none";
  document.getElementById("mural-aviso-visitante").style.display = "block";
};
 
window.admTab = function(tab) {
  ["posts","alunos","eventos","config","recados"].forEach(t => {
    const el = document.getElementById("adm-tab-" + t);
    if (el) el.style.display = t === tab ? "block" : "none";
  });
};
 
// ══════════════════════════════════════════════════════
//  ADM — POSTS
// ══════════════════════════════════════════════════════
let uploadedPostBase64 = null;
 
window.toggleMidiaInput = function() {
  const tipo = document.getElementById("post-tipo").value;
  document.getElementById("midia-url-field").style.display    = (tipo === "imagem_url" || tipo === "video_url") ? "block" : "none";
  document.getElementById("midia-upload-field").style.display = tipo === "imagem_upload" ? "block" : "none";
};
 
window.handleUploadPost = function(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { uploadedPostBase64 = ev.target.result; };
  reader.readAsDataURL(file);
};
 
window.adicionarPost = async function() {
  const autor = document.getElementById("post-autor").value.trim();
  const desc  = document.getElementById("post-desc").value.trim();
  const tipo  = document.getElementById("post-tipo").value;
  const tags  = document.getElementById("post-tags").value.split(",").map(t => t.trim()).filter(Boolean);
  const emoji = document.getElementById("post-emoji").value || "📸";
  if (!autor || !desc) { toast("Preencha autor e descrição!"); return; }
  let midia = null;
  if (tipo === "imagem_url" || tipo === "video_url") midia = document.getElementById("post-midia-url").value.trim();
  if (tipo === "imagem_upload") midia = uploadedPostBase64;
  try {
    const novo = { autor, desc, tipo, midia, tags, emoji, data: new Date().toISOString() };
    const ref = await addDoc(colPosts, novo);
    posts.unshift({ id: ref.id, ...novo });
    renderAdmPosts(); renderFeed();
    ["post-autor","post-desc","post-tags","post-emoji","post-midia-url"].forEach(id => document.getElementById(id).value = "");
    uploadedPostBase64 = null;
    toast("Post publicado! 📸");
  } catch(e) { toast("Erro ao publicar post 😢"); console.error(e); }
};
 
window.removerPost = async function(id) {
  if (!confirm("Remover este post?")) return;
  try {
    await deleteDoc(doc(db, "posts", id));
    posts = posts.filter(p => p.id !== id);
    renderAdmPosts(); renderFeed();
    toast("Post removido!");
  } catch(e) { toast("Erro ao remover 😢"); console.error(e); }
};
 
function renderAdmPosts() {
  const el = document.getElementById("adm-posts-list");
  if (!posts.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">📸</span><div class="empty-text">Nenhum post ainda.</div></div>'; return; }
  el.innerHTML = posts.map(p =>
    `<div style="background:var(--dark2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px;display:flex;gap:12px;align-items:center;">
      <div style="font-size:1.8rem;">${p.tipo === "emoji" ? p.emoji : "📷"}</div>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:0.88rem;">${p.autor}</div>
        <div style="font-size:0.78rem;color:var(--muted);">${p.desc.substring(0,60)}...</div>
        <div style="font-size:0.68rem;color:var(--muted);margin-top:4px;">${fmtDate(p.data)}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removerPost('${p.id}')">✕ Remover</button>
    </div>`
  ).join("");
}
 
// ══════════════════════════════════════════════════════
//  ADM — RECADOS (gerenciar mural)
// ══════════════════════════════════════════════════════
window.removerRecado = async function(id) {
  if (!confirm("Remover este recado?")) return;
  try {
    await deleteDoc(doc(db, "recados", id));
    recados = recados.filter(r => r.id !== id);
    renderAdmRecados(); renderMural();
    toast("Recado removido!");
  } catch(e) { toast("Erro ao remover 😢"); console.error(e); }
};
 
function renderAdmRecados() {
  const el = document.getElementById("adm-recados-list");
  if (!el) return;
  if (!recados.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">💬</span><div class="empty-text">Nenhum recado ainda.</div></div>'; return; }
  el.innerHTML = recados.map(r =>
    `<div style="background:var(--dark2);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">
      <div style="flex:1;">
        <div style="font-weight:700;font-size:0.85rem;">✉ ${r.nome}</div>
        <div style="font-size:0.78rem;color:var(--muted);margin-top:2px;">${r.msg.substring(0,80)}${r.msg.length>80?"...":""}</div>
        <div style="font-size:0.68rem;color:var(--muted);margin-top:3px;">${fmtDate(r.data)}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removerRecado('${r.id}')">✕</button>
    </div>`
  ).join("");
}
 
// ══════════════════════════════════════════════════════
//  ADM — ALUNOS
// ══════════════════════════════════════════════════════
let uploadedAlunoBase64 = null;
 
window.toggleAlunoFotoInput = function() {
  const tipo = document.getElementById("aluno-foto-tipo").value;
  document.getElementById("aluno-foto-url-field").style.display    = tipo === "url"    ? "block" : "none";
  document.getElementById("aluno-foto-upload-field").style.display = tipo === "upload" ? "block" : "none";
  if (tipo !== "url") {
    document.getElementById("aluno-foto-preview").classList.remove("show");
    document.getElementById("aluno-foto-preview-placeholder").style.display = "flex";
  }
  uploadedAlunoBase64 = null;
};
 
window.handleUploadAluno = function(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    uploadedAlunoBase64 = ev.target.result;
    const img = document.getElementById("aluno-foto-preview");
    img.src = uploadedAlunoBase64;
    img.classList.add("show");
    document.getElementById("aluno-foto-preview-placeholder").style.display = "none";
  };
  reader.readAsDataURL(file);
};
 
window.previewAlunoFoto = function() {
  const url = document.getElementById("aluno-foto-url").value.trim();
  const img = document.getElementById("aluno-foto-preview");
  const ph  = document.getElementById("aluno-foto-preview-placeholder");
  if (url) {
    img.src = url; img.classList.add("show"); ph.style.display = "none";
    img.onerror = () => { img.classList.remove("show"); ph.style.display = "flex"; };
  } else {
    img.classList.remove("show"); ph.style.display = "flex";
  }
};
 
window.adicionarAluno = async function() {
  const nome      = document.getElementById("aluno-nome").value.trim();
  const apelido   = document.getElementById("aluno-apelido").value.trim();
  const profissao = document.getElementById("aluno-profissao").value.trim();
  const bio       = document.getElementById("aluno-bio").value.trim();
  const fotoTipo  = document.getElementById("aluno-foto-tipo").value;
  if (!nome) { toast("Informe o nome do aluno!"); return; }
  let foto = null;
  if (fotoTipo === "url")    foto = document.getElementById("aluno-foto-url").value.trim() || null;
  if (fotoTipo === "upload") foto = uploadedAlunoBase64 || null;
  try {
    const novo = { nome, apelido, profissao, bio, foto };
    const ref = await addDoc(colAlunos, novo);
    alunos.push({ id: ref.id, ...novo });
    renderAdmAlunos(); renderAlunos();
    ["aluno-nome","aluno-apelido","aluno-profissao","aluno-bio","aluno-foto-url"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("aluno-foto-tipo").value = "emoji";
    document.getElementById("aluno-foto-url-field").style.display    = "none";
    document.getElementById("aluno-foto-upload-field").style.display = "none";
    document.getElementById("aluno-foto-preview").classList.remove("show");
    document.getElementById("aluno-foto-preview-placeholder").style.display = "flex";
    uploadedAlunoBase64 = null;
    toast("Aluno adicionado! 👥");
  } catch(e) { toast("Erro ao adicionar aluno 😢"); console.error(e); }
};
 
window.removerAluno = async function(id) {
  if (!confirm("Remover este aluno?")) return;
  try {
    await deleteDoc(doc(db, "alunos", id));
    alunos = alunos.filter(a => a.id !== id);
    renderAdmAlunos(); renderAlunos();
    toast("Aluno removido!");
  } catch(e) { toast("Erro ao remover 😢"); console.error(e); }
};
 
function renderAdmAlunos() {
  const el = document.getElementById("adm-alunos-list");
  if (!alunos.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">👥</span><div class="empty-text">Nenhum aluno ainda.</div></div>'; return; }
  el.innerHTML = alunos.map(a => {
    const fotoHtml = a.foto
      ? `<img src="${a.foto}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--orange);flex-shrink:0;" onerror="this.style.display='none'"/>`
      : `<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--orange),#ff9a5c);display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:800;color:#fff;flex-shrink:0;">${a.nome[0].toUpperCase()}</div>`;
    return `<div style="background:var(--dark2);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">
      ${fotoHtml}
      <div style="flex:1;">
        <div style="font-weight:700;font-size:0.88rem;">${a.nome}${a.apelido ? ` <span style="font-size:0.7rem;color:var(--orange);">(${a.apelido})</span>` : ""}</div>
        ${a.profissao ? `<div style="font-size:0.72rem;color:var(--orange2);">🎯 ${a.profissao}</div>` : ""}
        ${a.bio       ? `<div style="font-size:0.72rem;color:var(--muted);">"${a.bio}"</div>` : ""}
      </div>
      <button class="btn btn-danger btn-sm" onclick="removerAluno('${a.id}')">✕</button>
    </div>`;
  }).join("");
}
 
// ══════════════════════════════════════════════════════
//  ADM — EVENTOS
// ══════════════════════════════════════════════════════
window.adicionarEvento = async function() {
  const data   = document.getElementById("evento-data").value;
  const titulo = document.getElementById("evento-titulo").value.trim();
  const desc   = document.getElementById("evento-desc").value.trim();
  if (!data || !titulo) { toast("Preencha data e título!"); return; }
  try {
    const novo = { data, titulo, desc };
    const ref = await addDoc(colEventos, novo);
    eventos.unshift({ id: ref.id, ...novo });
    renderAdmEventos(); renderTimeline();
    ["evento-data","evento-titulo","evento-desc"].forEach(id => document.getElementById(id).value = "");
    toast("Evento adicionado! 📅");
  } catch(e) { toast("Erro ao adicionar evento 😢"); console.error(e); }
};
 
window.removerEvento = async function(id) {
  if (!confirm("Remover este evento?")) return;
  try {
    await deleteDoc(doc(db, "eventos", id));
    eventos = eventos.filter(e => e.id !== id);
    renderAdmEventos(); renderTimeline();
    toast("Evento removido!");
  } catch(e) { toast("Erro ao remover 😢"); console.error(e); }
};
 
function renderAdmEventos() {
  const el = document.getElementById("adm-eventos-list");
  if (!eventos.length) { el.innerHTML = '<div class="empty"><span class="empty-icon">📅</span><div class="empty-text">Nenhum evento.</div></div>'; return; }
  el.innerHTML = eventos.map(e =>
    `<div style="background:var(--dark2);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
      <div style="flex:1;">
        <div style="font-weight:700;font-size:0.88rem;">${e.titulo}</div>
        <div style="font-size:0.72rem;color:var(--orange);">${fmtDateBr(e.data)}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removerEvento('${e.id}')">✕</button>
    </div>`
  ).join("");
}
 
// ══════════════════════════════════════════════════════
//  ADM — CONFIG
// ══════════════════════════════════════════════════════
window.salvarConfigBtn = async function() {
  const f = document.getElementById("config-formatura").value;
  const n = document.getElementById("config-nome").value;
  const s = document.getElementById("config-senha").value;
  if (f) config.formatura = f;
  if (n) config.nome = n;
  if (s) { config.senha = s; document.getElementById("config-senha").value = ""; }
  try {
    await setDoc(docConfig, config);
    updateCountdown();
    toast("Configurações salvas! ⚙️");
  } catch(e) { toast("Erro ao salvar configurações 😢"); console.error(e); }
};
 
window.limparTudo = async function() {
  if (!confirm("Apagar TODOS os dados? Isso não pode ser desfeito!")) return;
  try {
    // Deleta todos os documentos de cada coleção
    const deletarColecao = async (col, lista) => {
      await Promise.all(lista.map(item => deleteDoc(doc(db, col, item.id))));
    };
    await deletarColecao("posts",   posts);
    await deletarColecao("recados", recados);
    await deletarColecao("alunos",  alunos);
    await deletarColecao("eventos", eventos);
    posts = []; recados = []; alunos = []; eventos = [];
    renderAdmPosts(); renderAdmAlunos(); renderAdmEventos(); renderAdmRecados();
    renderFeed(); renderMural(); renderAlunos(); renderTimeline();
    toast("Dados apagados!");
  } catch(e) { toast("Erro ao limpar dados 😢"); console.error(e); }
};
 
// ══════════════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════════════
function fmtDate(iso)  { return new Date(iso).toLocaleDateString("pt-BR"); }
function fmtDateBr(s)  { return new Date(s + "T12:00:00").toLocaleDateString("pt-BR"); }
 
window.toast = function(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
};
function toast(msg) { window.toast(msg); }
 
// ══════════════════════════════════════════════════════
//  INICIALIZAÇÃO
// ══════════════════════════════════════════════════════
carregarTudo();
