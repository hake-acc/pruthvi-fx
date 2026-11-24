/**
 * Pruthvi FX — Studio Admin CMS Logic
 * Firebase Authentication (Email/Password — No Google Auth)
 * Live Firestore Sync with Cloud Storage / Data URL upload support
 */

const STORAGE_KEYS = {
  FB_CONFIG: "pruthvi_fx_fb_config",
};

let db = null;
let auth = null;
let storage = null;
let currentUser = null;
let portfolioData = {
  experienceStart: "2022-07-30",
  email: "notmafiyaxd@gmail.com",
  discord: "pruthvifx",
  discordUrl: "https://discord.gg/rHugN7euzG",
  instagram: "pruthvifx99",
  instagramUrl: "https://www.instagram.com/pruthvifx99?dmpr=MTh5Y3Z6aTRjdTBkb",
  lifetimeThumbnails: 100,
  collaborators: [],
  thumbnails: [],
  spiralThumbnailIds: []
};
let unsubscribeFirestore = null;

// UI Elements
const fbConfigView = document.getElementById("firebaseConfigView");
const authView = document.getElementById("authView");
const dashboardView = document.getElementById("dashboardView");
const toastContainer = document.getElementById("toastContainer");

function showToast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `admin-toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✔' : type === 'error' ? '✖' : 'ℹ'}</span> <span>${escapeHtml(msg)}</span>`;
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateY(10px)";
    setTimeout(() => t.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// 1. Initialize Firebase
function getSavedFirebaseConfig() {
  const saved = localStorage.getItem(STORAGE_KEYS.FB_CONFIG);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch (e) {
    return null;
  }
}

function initFirebase(config) {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    db = firebase.firestore();
    auth = firebase.auth();
    try {
      storage = firebase.storage();
    } catch (_) {}

    // Listen to Auth State
    auth.onAuthStateChanged((user) => {
      currentUser = user;
      if (user) {
        showDashboard(user);
      } else {
        showAuthScreen();
      }
    });
    return true;
  } catch (err) {
    console.error("Firebase init failed:", err);
    showToast("Firebase initialization failed: " + err.message, "error");
    showFirebaseConfigScreen();
    return false;
  }
}

// 2. Screen Router
function showFirebaseConfigScreen() {
  fbConfigView.style.display = "flex";
  authView.style.display = "none";
  dashboardView.style.display = "none";
}

function showAuthScreen() {
  fbConfigView.style.display = "none";
  authView.style.display = "flex";
  dashboardView.style.display = "none";
}

function showDashboard(user) {
  fbConfigView.style.display = "none";
  authView.style.display = "none";
  dashboardView.style.display = "block";
  document.getElementById("userEmailDisplay").textContent = user.email || "Admin User";
  setupFirestoreListener();
}

// 3. Setup Firebase Config Form
document.getElementById("firebaseConfigForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = document.getElementById("fbConfigJson").value.trim();
  let parsed = null;
  try {
    // allow loose object copy-paste:
    if (raw.startsWith("{") && raw.endsWith("}")) {
      parsed = (new Function(`return ${raw}`))();
    } else {
      parsed = JSON.parse(raw);
    }
  } catch (err) {
    showToast("Invalid JSON/JS object: " + err.message, "error");
    return;
  }

  if (!parsed || !parsed.apiKey || !parsed.projectId) {
    showToast("Configuration must include at least apiKey and projectId", "error");
    return;
  }

  localStorage.setItem(STORAGE_KEYS.FB_CONFIG, JSON.stringify(parsed));
  showToast("Firebase configuration saved!", "success");
  initFirebase(parsed);
});

document.getElementById("reconfigureFbLink").addEventListener("click", (e) => {
  e.preventDefault();
  const current = getSavedFirebaseConfig();
  if (current) {
    document.getElementById("fbConfigJson").value = JSON.stringify(current, null, 2);
  }
  showFirebaseConfigScreen();
});

// 4. Email/Password Authentication (Strictly No Google Auth)
let isRegisterMode = false;
const toggleRegisterLink = document.getElementById("toggleRegisterLink");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");

toggleRegisterLink.addEventListener("click", (e) => {
  e.preventDefault();
  isRegisterMode = !isRegisterMode;
  if (isRegisterMode) {
    loginSubmitBtn.textContent = "Register Admin Account";
    toggleRegisterLink.textContent = "Back to Login";
  } else {
    loginSubmitBtn.textContent = "Enter Studio Dashboard";
    toggleRegisterLink.textContent = "Create Admin User";
  }
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPassword").value;

  if (!email || !pass) return;

  loginSubmitBtn.disabled = true;
  loginSubmitBtn.textContent = "Authenticating...";

  try {
    if (isRegisterMode) {
      await auth.createUserWithEmailAndPassword(email, pass);
      showToast("Admin account created successfully!", "success");
    } else {
      await auth.signInWithEmailAndPassword(email, pass);
      showToast("Welcome back, Pruthvi!", "success");
    }
  } catch (err) {
    console.error("Auth error:", err);
    showToast(err.message, "error");
  } finally {
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.textContent = isRegisterMode ? "Register Admin Account" : "Enter Studio Dashboard";
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  if (unsubscribeFirestore) {
    unsubscribeFirestore();
    unsubscribeFirestore = null;
  }
  await auth.signOut();
  showToast("Signed out", "info");
});

// 5. Firestore Live Data Synchronization
function setupFirestoreListener() {
  if (!db) return;
  if (unsubscribeFirestore) unsubscribeFirestore();

  const docRef = db.collection("portfolio").doc("live");

  unsubscribeFirestore = docRef.onSnapshot(async (doc) => {
    if (doc.exists) {
      portfolioData = { ...portfolioData, ...doc.data() };
      renderAllData();
      showToast("Synced with live Firestore", "info");
    } else {
      // Document doesn't exist yet, seed from local content/portfolio.json if empty
      console.log("No remote portfolio doc found, seeding initial data...");
      await seedFromLocal();
    }
  }, (err) => {
    console.error("Firestore listener error:", err);
    showToast("Firestore stream error: " + err.message, "error");
  });
}

async function seedFromLocal() {
  try {
    const res = await fetch("/content/portfolio.json");
    if (res.ok) {
      const initial = await res.json();
      await db.collection("portfolio").doc("live").set(initial, { merge: true });
      showToast("Seeded Firestore with default portfolio data!", "success");
    }
  } catch (err) {
    console.error("Failed to seed local data:", err);
  }
}

document.getElementById("syncDefaultsBtn").addEventListener("click", async () => {
  if (confirm("Reset/Seed all thumbnails and creators to default portfolio content?")) {
    await seedFromLocal();
  }
});

// 6. Rendering Logic
function renderAllData() {
  renderThumbnails();
  renderCreators();
  renderSettingsForm();
}

function renderThumbnails() {
  const container = document.getElementById("thumbnailsGrid");
  const countBadge = document.getElementById("thumbCountBadge");
  const thumbs = portfolioData.thumbnails || [];
  const spiralIds = new Set(portfolioData.spiralThumbnailIds || []);

  countBadge.textContent = thumbs.length;
  container.innerHTML = "";

  if (thumbs.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-muted); font-family: var(--font-mono);">No thumbnails yet. Click "+ Add Thumbnail" above.</div>`;
    return;
  }

  thumbs.forEach((t, idx) => {
    const isSpiral = spiralIds.has(t.id);
    const card = document.createElement("div");
    card.className = "cms-card";
    card.innerHTML = `
      <div class="cms-thumb-preview">
        <span class="thumb-order-badge">#${idx + 1}</span>
        <button class="spiral-toggle-pill ${isSpiral ? 'active' : ''}" data-id="${escapeHtml(t.id)}" title="Toggle 3D Spiral visibility">
          ${isSpiral ? 'Spiral Active' : '+ Add to Spiral'}
        </button>
        <img src="${escapeHtml(t.src)}" alt="${escapeHtml(t.title)}" loading="lazy">
      </div>
      <div class="cms-card-body">
        <div class="cms-card-title">${escapeHtml(t.title || `Thumbnail ${idx + 1}`)}</div>
        <div class="cms-card-meta">
          <span>${escapeHtml(t.creator || 'Unassigned')}</span>
          ${t.tag ? `• <span>${escapeHtml(t.tag)}</span>` : ''}
        </div>
        <div class="cms-card-actions">
          <div style="display: flex; gap: 6px;">
            <button class="btn-icon move-thumb-up" data-idx="${idx}" title="Move up" ${idx === 0 ? 'disabled style="opacity:0.3"' : ''}>↑</button>
            <button class="btn-icon move-thumb-down" data-idx="${idx}" title="Move down" ${idx === thumbs.length - 1 ? 'disabled style="opacity:0.3"' : ''}>↓</button>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary edit-thumb-btn" data-idx="${idx}">Edit</button>
            <button class="btn-danger delete-thumb-btn" data-id="${escapeHtml(t.id)}">Delete</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // Attach handlers
  container.querySelectorAll(".spiral-toggle-pill").forEach(btn => {
    btn.addEventListener("click", () => toggleSpiralThumbnail(btn.dataset.id));
  });
  container.querySelectorAll(".delete-thumb-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteThumbnail(btn.dataset.id));
  });
  container.querySelectorAll(".edit-thumb-btn").forEach(btn => {
    btn.addEventListener("click", () => openThumbnailModal(Number(btn.dataset.idx)));
  });
  container.querySelectorAll(".move-thumb-up").forEach(btn => {
    btn.addEventListener("click", () => moveThumbnail(Number(btn.dataset.idx), -1));
  });
  container.querySelectorAll(".move-thumb-down").forEach(btn => {
    btn.addEventListener("click", () => moveThumbnail(Number(btn.dataset.idx), 1));
  });
}

function renderCreators() {
  const container = document.getElementById("creatorsGrid");
  const countBadge = document.getElementById("creatorCountBadge");
  const creators = portfolioData.collaborators || [];

  countBadge.textContent = creators.length;
  container.innerHTML = "";

  if (creators.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-muted); font-family: var(--font-mono);">No creators added yet. Click "+ Add Creator".</div>`;
    return;
  }

  creators.forEach((c, idx) => {
    const card = document.createElement("div");
    card.className = "cms-card";
    card.innerHTML = `
      <div class="cms-card-body" style="align-items: center; text-align: center;">
        <div class="creator-avatar-wrap">
          <img src="${escapeHtml(c.avatar || '/favicon.svg')}" alt="${escapeHtml(c.name)}">
        </div>
        <div class="cms-card-title">${escapeHtml(c.name)}</div>
        <a href="${escapeHtml(c.profileUrl)}" target="_blank" class="creator-link">
          ${escapeHtml(c.profileUrl.replace(/^https?:\/\/(www\.)?/, ''))} ↗
        </a>
        <div class="cms-card-actions" style="width: 100%; margin-top: 20px;">
          <div style="display: flex; gap: 6px;">
            <button class="btn-icon move-creator-up" data-idx="${idx}" ${idx === 0 ? 'disabled style="opacity:0.3"' : ''}>↑</button>
            <button class="btn-icon move-creator-down" data-idx="${idx}" ${idx === creators.length - 1 ? 'disabled style="opacity:0.3"' : ''}>↓</button>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary edit-creator-btn" data-idx="${idx}">Edit</button>
            <button class="btn-danger delete-creator-btn" data-id="${escapeHtml(c.id)}">Delete</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // Attach handlers
  container.querySelectorAll(".delete-creator-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteCreator(btn.dataset.id));
  });
  container.querySelectorAll(".edit-creator-btn").forEach(btn => {
    btn.addEventListener("click", () => openCreatorModal(Number(btn.dataset.idx)));
  });
  container.querySelectorAll(".move-creator-up").forEach(btn => {
    btn.addEventListener("click", () => moveCreator(Number(btn.dataset.idx), -1));
  });
  container.querySelectorAll(".move-creator-down").forEach(btn => {
    btn.addEventListener("click", () => moveCreator(Number(btn.dataset.idx), 1));
  });
}

function renderSettingsForm() {
  document.getElementById("metaEmail").value = portfolioData.email || "";
  document.getElementById("metaDiscord").value = portfolioData.discord || "";
  document.getElementById("metaDiscordUrl").value = portfolioData.discordUrl || "";
  document.getElementById("metaInstagramUrl").value = portfolioData.instagramUrl || "";
  document.getElementById("metaExperienceStart").value = portfolioData.experienceStart || "2022-07-30";
  document.getElementById("metaLifetime").value = portfolioData.lifetimeThumbnails || 100;
}

// 7. Navigation Tabs
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add("active");
  });
});

// 8. CRUD Actions & Firestore Saves
async function savePortfolioToFirestore() {
  if (!db) return;
  try {
    await db.collection("portfolio").doc("live").set(portfolioData, { merge: true });
    showToast("Changes synced to Firestore live!", "success");
  } catch (err) {
    console.error("Firestore save error:", err);
    showToast("Save failed: " + err.message, "error");
  }
}

async function toggleSpiralThumbnail(id) {
  let list = portfolioData.spiralThumbnailIds ? [...portfolioData.spiralThumbnailIds] : [];
  if (list.includes(id)) {
    list = list.filter(x => x !== id);
  } else {
    list.push(id);
  }
  portfolioData.spiralThumbnailIds = list;
  renderThumbnails();
  await savePortfolioToFirestore();
}

async function deleteThumbnail(id) {
  if (!confirm("Are you sure you want to delete this thumbnail?")) return;
  portfolioData.thumbnails = (portfolioData.thumbnails || []).filter(t => t.id !== id);
  portfolioData.spiralThumbnailIds = (portfolioData.spiralThumbnailIds || []).filter(x => x !== id);
  renderThumbnails();
  await savePortfolioToFirestore();
}

async function moveThumbnail(fromIdx, dir) {
  const toIdx = fromIdx + dir;
  const list = [...portfolioData.thumbnails];
  if (toIdx < 0 || toIdx >= list.length) return;
  const [item] = list.splice(fromIdx, 1);
  list.splice(toIdx, 0, item);
  portfolioData.thumbnails = list;
  renderThumbnails();
  await savePortfolioToFirestore();
}

async function deleteCreator(id) {
  if (!confirm("Are you sure you want to remove this creator?")) return;
  portfolioData.collaborators = (portfolioData.collaborators || []).filter(c => c.id !== id);
  renderCreators();
  await savePortfolioToFirestore();
}

async function moveCreator(fromIdx, dir) {
  const toIdx = fromIdx + dir;
  const list = [...portfolioData.collaborators];
  if (toIdx < 0 || toIdx >= list.length) return;
  const [item] = list.splice(fromIdx, 1);
  list.splice(toIdx, 0, item);
  portfolioData.collaborators = list;
  renderCreators();
  await savePortfolioToFirestore();
}

// 9. Modals (Thumbnail & Creator)
const thumbnailModal = document.getElementById("thumbnailModal");
const creatorModal = document.getElementById("creatorModal");

document.querySelectorAll("[data-modal]").forEach(btn => {
  btn.addEventListener("click", () => {
    const m = document.getElementById(btn.dataset.modal);
    if (m) m.classList.remove("open");
  });
});

document.getElementById("addThumbnailBtn").addEventListener("click", () => openThumbnailModal());
document.getElementById("addCreatorBtn").addEventListener("click", () => openCreatorModal());

function openThumbnailModal(editIdx = null) {
  const form = document.getElementById("thumbnailForm");
  form.reset();
  const preview = document.getElementById("thumbPreviewImg");
  preview.style.display = "none";
  preview.src = "";

  if (editIdx !== null) {
    const t = portfolioData.thumbnails[editIdx];
    document.getElementById("thumbnailModalTitle").textContent = "Edit Thumbnail";
    document.getElementById("thumbEditId").value = t.id;
    document.getElementById("thumbTitle").value = t.title || "";
    document.getElementById("thumbCreator").value = t.creator || "";
    document.getElementById("thumbTag").value = t.tag || "";
    document.getElementById("thumbSrcInput").value = t.src || "";
    document.getElementById("thumbSpiralCheck").checked = (portfolioData.spiralThumbnailIds || []).includes(t.id);
    if (t.src) {
      preview.src = t.src;
      preview.style.display = "block";
    }
  } else {
    document.getElementById("thumbnailModalTitle").textContent = "Add Thumbnail";
    document.getElementById("thumbEditId").value = "";
    document.getElementById("thumbTitle").value = `Thumbnail ${(portfolioData.thumbnails || []).length + 1}`;
    document.getElementById("thumbSpiralCheck").checked = true;
  }

  thumbnailModal.classList.add("open");
}

function openCreatorModal(editIdx = null) {
  const form = document.getElementById("creatorForm");
  form.reset();
  const preview = document.getElementById("creatorPreviewImg");
  preview.style.display = "none";
  preview.src = "";

  if (editIdx !== null) {
    const c = portfolioData.collaborators[editIdx];
    document.getElementById("creatorModalTitle").textContent = "Edit Creator";
    document.getElementById("creatorEditId").value = c.id;
    document.getElementById("creatorName").value = c.name || "";
    document.getElementById("creatorProfileUrl").value = c.profileUrl || "";
    document.getElementById("creatorAvatarInput").value = c.avatar || "";
    if (c.avatar) {
      preview.src = c.avatar;
      preview.style.display = "block";
    }
  } else {
    document.getElementById("creatorModalTitle").textContent = "Add Creator";
    document.getElementById("creatorEditId").value = "";
  }

  creatorModal.classList.add("open");
}

// 10. Image Dropzone & File Handling (Converts to DataURL or Firebase Storage)
function setupDropzone(dropzoneId, inputId, previewId, urlInputId) {
  const dropzone = document.getElementById(dropzoneId);
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const urlInput = document.getElementById(urlInputId);

  dropzone.addEventListener("click", () => input.click());

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  input.addEventListener("change", () => {
    if (input.files && input.files[0]) {
      handleFile(input.files[0]);
    }
  });

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.style.display = "block";
      urlInput.value = e.target.result; // Data URL for direct live storage
    };
    reader.readAsDataURL(file);
  }
}

setupDropzone("thumbDropzone", "thumbFileInput", "thumbPreviewImg", "thumbSrcInput");
setupDropzone("creatorDropzone", "creatorFileInput", "creatorPreviewImg", "creatorAvatarInput");

// 11. Form Submissions
document.getElementById("thumbnailForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const editId = document.getElementById("thumbEditId").value;
  const title = document.getElementById("thumbTitle").value.trim();
  const creator = document.getElementById("thumbCreator").value.trim();
  const tag = document.getElementById("thumbTag").value.trim();
  const src = document.getElementById("thumbSrcInput").value.trim();
  const isSpiral = document.getElementById("thumbSpiralCheck").checked;

  if (!src) {
    showToast("Please provide an image or image URL", "error");
    return;
  }

  const thumbs = [...(portfolioData.thumbnails || [])];
  let spiralIds = [...(portfolioData.spiralThumbnailIds || [])];

  if (editId) {
    const idx = thumbs.findIndex(t => t.id === editId);
    if (idx !== -1) {
      thumbs[idx] = { ...thumbs[idx], title, creator, tag, src };
    }
    if (isSpiral && !spiralIds.includes(editId)) {
      spiralIds.push(editId);
    } else if (!isSpiral) {
      spiralIds = spiralIds.filter(x => x !== editId);
    }
  } else {
    const newId = `thumbnail-${Date.now()}`;
    thumbs.push({ id: newId, title, creator, tag, src });
    if (isSpiral) spiralIds.push(newId);
  }

  portfolioData.thumbnails = thumbs;
  portfolioData.spiralThumbnailIds = spiralIds;
  thumbnailModal.classList.remove("open");
  renderThumbnails();
  await savePortfolioToFirestore();
});

document.getElementById("creatorForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const editId = document.getElementById("creatorEditId").value;
  const name = document.getElementById("creatorName").value.trim();
  const profileUrl = document.getElementById("creatorProfileUrl").value.trim();
  const avatar = document.getElementById("creatorAvatarInput").value.trim();

  const creators = [...(portfolioData.collaborators || [])];

  if (editId) {
    const idx = creators.findIndex(c => c.id === editId);
    if (idx !== -1) {
      creators[idx] = { ...creators[idx], name, profileUrl, avatar };
    }
  } else {
    const newId = `creator-${Date.now()}`;
    creators.push({ id: newId, name, profileUrl, avatar });
  }

  portfolioData.collaborators = creators;
  creatorModal.classList.remove("open");
  renderCreators();
  await savePortfolioToFirestore();
});

document.getElementById("settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  portfolioData.email = document.getElementById("metaEmail").value.trim();
  portfolioData.discord = document.getElementById("metaDiscord").value.trim();
  portfolioData.discordUrl = document.getElementById("metaDiscordUrl").value.trim();
  portfolioData.instagramUrl = document.getElementById("metaInstagramUrl").value.trim();
  portfolioData.experienceStart = document.getElementById("metaExperienceStart").value.trim();
  portfolioData.lifetimeThumbnails = Number(document.getElementById("metaLifetime").value) || 100;

  await savePortfolioToFirestore();
});

// 12. Startup sequence
window.addEventListener("DOMContentLoaded", () => {
  const config = getSavedFirebaseConfig();
  if (config) {
    initFirebase(config);
  } else {
    showFirebaseConfigScreen();
  }
});
