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
  creatorsSection: {
    titleLine1: "Creators",
    titleLine2: "in the Frame.",
    experienceLabel: "days of experience"
  },
  collaborators: [],
  beforeAfter: {
    eyebrow: "Transformation",
    title: "From raw capture to the click.",
    items: []
  },
  reviews: {
    eyebrow: "Creator Reviews",
    title: "Loved by creators who reach millions.",
    items: []
  },
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
  if (window.PRUTHVI_FIREBASE_CONFIG) {
    return window.PRUTHVI_FIREBASE_CONFIG;
  }
  const saved = localStorage.getItem(STORAGE_KEYS.FB_CONFIG);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch (e) {
    return null;
  }
}

// Authorized Administrator Whitelist (Lock CMS from unauthorized accounts)
const AUTHORIZED_ADMIN_EMAILS = [
  "admin@pruthvi-fx.com",
  "notmafiyaxd@gmail.com"
];

function isAuthorizedAdmin(email) {
  if (!email) return false;
  return AUTHORIZED_ADMIN_EMAILS.includes(email.toLowerCase());
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

    // Listen to Auth State (Enforce Whitelist)
    auth.onAuthStateChanged(async (user) => {
      currentUser = user;
      if (user) {
        if (!isAuthorizedAdmin(user.email)) {
          console.warn("Unauthorized login attempt:", user.email);
          showToast("Access Denied: You are not an authorized administrator.", "error");
          await auth.signOut();
          showAuthScreen();
          return;
        }
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

// 4. Email/Password Authentication (Strict Admin Sign-In Only — Public Registration Disabled)
const loginSubmitBtn = document.getElementById("loginSubmitBtn");

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPassword").value;

  if (!email || !pass) return;

  if (!isAuthorizedAdmin(email)) {
    showToast("Access Denied: Unauthorized admin email address.", "error");
    return;
  }

  loginSubmitBtn.disabled = true;
  loginSubmitBtn.textContent = "Authenticating...";

  try {
    await auth.signInWithEmailAndPassword(email, pass);
    showToast("Welcome back, Pruthvi!", "success");
  } catch (err) {
    console.error("Auth error:", err);
    showToast(err.message || "Invalid admin credentials", "error");
  } finally {
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.textContent = "Enter Studio Dashboard";
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
  renderBeforeAfter();
  renderReviews();
  renderSettingsForm();
  if (portfolioData.theme) {
    currentTheme = { ...DEFAULT_THEME, ...portfolioData.theme };
    syncInputsFromTheme(currentTheme);
    applyLiveThemeToPreview(currentTheme);
  }
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

  if (portfolioData.creatorsSection) {
    const t1 = document.getElementById("creatorsTitleLine1");
    const t2 = document.getElementById("creatorsTitleLine2");
    const exp = document.getElementById("creatorsExpLabel");
    if (t1) t1.value = portfolioData.creatorsSection.titleLine1 || "Creators";
    if (t2) t2.value = portfolioData.creatorsSection.titleLine2 || "in the Frame.";
    if (exp) exp.value = portfolioData.creatorsSection.experienceLabel || "days of experience";
  }

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
        ${c.subs ? `<div class="cms-review-subs-badge" style="margin-top: 4px;">${escapeHtml(c.subs)}</div>` : ''}
        <a href="${escapeHtml(c.profileUrl)}" target="_blank" class="creator-link" style="margin-top: 8px;">
          ${escapeHtml((c.profileUrl || '').replace(/^https?:\/\/(www\.)?/, ''))} ↗
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

function renderBeforeAfter() {
  const container = document.getElementById("beforeAfterGrid");
  const countBadge = document.getElementById("baCountBadge");
  const baData = portfolioData.beforeAfter || { eyebrow: "Transformation", title: "From raw capture to the click.", items: [] };
  const items = baData.items || [];

  if (countBadge) countBadge.textContent = items.length;
  const eyebrowInput = document.getElementById("baEyebrowInput");
  const titleInput = document.getElementById("baTitleInput");
  if (eyebrowInput) eyebrowInput.value = baData.eyebrow || "Transformation";
  if (titleInput) titleInput.value = baData.title || "From raw capture to the click.";

  if (!container) return;
  container.innerHTML = "";

  if (items.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-muted); font-family: var(--font-mono);">No comparisons added yet. Click "+ Add Comparison" above.</div>`;
    return;
  }

  items.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "cms-card";
    card.innerHTML = `
      <div class="cms-ba-preview">
        <div class="cms-ba-half">
          <img src="${escapeHtml(item.before)}" alt="Before: ${escapeHtml(item.title)}">
          <span class="cms-ba-half-label left">${escapeHtml(item.beforeTag || 'Raw In-Game')}</span>
        </div>
        <div class="cms-ba-divider-line">
          <div class="cms-ba-divider-knob">&lt;&gt;</div>
        </div>
        <div class="cms-ba-half">
          <img src="${escapeHtml(item.after)}" alt="After: ${escapeHtml(item.title)}">
          <span class="cms-ba-half-label right">${escapeHtml(item.afterTag || 'Final Click')}</span>
        </div>
      </div>
      <div class="cms-card-body">
        <div class="cms-card-title">${escapeHtml(item.title || `Comparison ${idx + 1}`)}</div>
        <div class="cms-card-meta">
          <span>${escapeHtml(item.subtitle || 'Transformation')}</span>
          • <span>${escapeHtml(item.beforeTag || 'Raw')} &rarr; ${escapeHtml(item.afterTag || 'Final')}</span>
        </div>
        <div class="cms-card-actions" style="margin-top: 14px;">
          <div style="display: flex; gap: 6px;">
            <button class="btn-icon move-ba-up" data-idx="${idx}" title="Move up" ${idx === 0 ? 'disabled style="opacity:0.3"' : ''}>↑</button>
            <button class="btn-icon move-ba-down" data-idx="${idx}" title="Move down" ${idx === items.length - 1 ? 'disabled style="opacity:0.3"' : ''}>↓</button>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary edit-ba-btn" data-idx="${idx}">Edit</button>
            <button class="btn-danger delete-ba-btn" data-id="${escapeHtml(item.id)}">Delete</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll(".delete-ba-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteBeforeAfter(btn.dataset.id));
  });
  container.querySelectorAll(".edit-ba-btn").forEach(btn => {
    btn.addEventListener("click", () => openBeforeAfterModal(Number(btn.dataset.idx)));
  });
  container.querySelectorAll(".move-ba-up").forEach(btn => {
    btn.addEventListener("click", () => moveBeforeAfter(Number(btn.dataset.idx), -1));
  });
  container.querySelectorAll(".move-ba-down").forEach(btn => {
    btn.addEventListener("click", () => moveBeforeAfter(Number(btn.dataset.idx), 1));
  });
}

function renderReviews() {
  const container = document.getElementById("reviewsGrid");
  const countBadge = document.getElementById("reviewCountBadge");
  const rvData = portfolioData.reviews || { eyebrow: "Creator Reviews", title: "Loved by creators who reach millions.", items: [] };
  const items = rvData.items || [];

  if (countBadge) countBadge.textContent = items.length;
  const eyebrowInput = document.getElementById("reviewEyebrowInput");
  const titleInput = document.getElementById("reviewTitleInput");
  if (eyebrowInput) eyebrowInput.value = rvData.eyebrow || "Creator Reviews";
  if (titleInput) titleInput.value = rvData.title || "Loved by creators who reach millions.";

  if (!container) return;
  container.innerHTML = "";

  if (items.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-muted); font-family: var(--font-mono);">No reviews added yet. Click "+ Add Review" above.</div>`;
    return;
  }

  items.forEach((item, idx) => {
    const card = document.createElement("div");
    card.className = "cms-review-card";
    card.innerHTML = `
      <div class="cms-review-header">
        <img class="cms-review-avatar" src="${escapeHtml(item.avatar || '/favicon.svg')}" alt="${escapeHtml(item.name)}">
        <div class="cms-review-info">
          <div class="cms-review-name">${escapeHtml(item.name)}</div>
          <span class="cms-review-subs-badge">${escapeHtml(item.subs || 'Creator')}</span>
        </div>
      </div>
      <div class="cms-review-bubble">
        &ldquo;${escapeHtml(item.bubble)}&rdquo;
      </div>
      <div class="cms-card-actions" style="margin-top: auto; padding-top: 10px; border-top: 1px solid var(--border-subtle);">
        <div style="display: flex; gap: 6px;">
          <button class="btn-icon move-review-up" data-idx="${idx}" title="Move up" ${idx === 0 ? 'disabled style="opacity:0.3"' : ''}>↑</button>
          <button class="btn-icon move-review-down" data-idx="${idx}" title="Move down" ${idx === items.length - 1 ? 'disabled style="opacity:0.3"' : ''}>↓</button>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary edit-review-btn" data-idx="${idx}">Edit</button>
          <button class="btn-danger delete-review-btn" data-id="${escapeHtml(item.id)}">Delete</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll(".delete-review-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteReview(btn.dataset.id));
  });
  container.querySelectorAll(".edit-review-btn").forEach(btn => {
    btn.addEventListener("click", () => openReviewModal(Number(btn.dataset.idx)));
  });
  container.querySelectorAll(".move-review-up").forEach(btn => {
    btn.addEventListener("click", () => moveReview(Number(btn.dataset.idx), -1));
  });
  container.querySelectorAll(".move-review-down").forEach(btn => {
    btn.addEventListener("click", () => moveReview(Number(btn.dataset.idx), 1));
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

async function deleteBeforeAfter(id) {
  if (!confirm("Are you sure you want to delete this before/after comparison?")) return;
  const items = (portfolioData.beforeAfter?.items || []).filter(item => item.id !== id);
  portfolioData.beforeAfter = { ...(portfolioData.beforeAfter || {}), items };
  renderBeforeAfter();
  await savePortfolioToFirestore();
}

async function moveBeforeAfter(fromIdx, dir) {
  const toIdx = fromIdx + dir;
  const list = [...(portfolioData.beforeAfter?.items || [])];
  if (toIdx < 0 || toIdx >= list.length) return;
  const [item] = list.splice(fromIdx, 1);
  list.splice(toIdx, 0, item);
  portfolioData.beforeAfter = { ...(portfolioData.beforeAfter || {}), items: list };
  renderBeforeAfter();
  await savePortfolioToFirestore();
}

async function deleteReview(id) {
  if (!confirm("Are you sure you want to delete this creator review?")) return;
  const items = (portfolioData.reviews?.items || []).filter(item => item.id !== id);
  portfolioData.reviews = { ...(portfolioData.reviews || {}), items };
  renderReviews();
  await savePortfolioToFirestore();
}

async function moveReview(fromIdx, dir) {
  const toIdx = fromIdx + dir;
  const list = [...(portfolioData.reviews?.items || [])];
  if (toIdx < 0 || toIdx >= list.length) return;
  const [item] = list.splice(fromIdx, 1);
  list.splice(toIdx, 0, item);
  portfolioData.reviews = { ...(portfolioData.reviews || {}), items: list };
  renderReviews();
  await savePortfolioToFirestore();
}

// 8b. Section Header Save Handlers
const saveCreatorsHeaderBtn = document.getElementById("saveCreatorsHeaderBtn");
if (saveCreatorsHeaderBtn) {
  saveCreatorsHeaderBtn.addEventListener("click", async () => {
    portfolioData.creatorsSection = {
      titleLine1: document.getElementById("creatorsTitleLine1").value.trim() || "Creators",
      titleLine2: document.getElementById("creatorsTitleLine2").value.trim() || "in the Frame.",
      experienceLabel: document.getElementById("creatorsExpLabel").value.trim() || "days of experience"
    };
    await savePortfolioToFirestore();
    showToast("Creators section titles saved!", "success");
  });
}

const saveBaHeaderBtn = document.getElementById("saveBaHeaderBtn");
if (saveBaHeaderBtn) {
  saveBaHeaderBtn.addEventListener("click", async () => {
    portfolioData.beforeAfter = {
      ...(portfolioData.beforeAfter || {}),
      eyebrow: document.getElementById("baEyebrowInput").value.trim() || "Transformation",
      title: document.getElementById("baTitleInput").value.trim() || "From raw capture to the click.",
      items: portfolioData.beforeAfter?.items || []
    };
    await savePortfolioToFirestore();
    showToast("Before & After section header saved!", "success");
  });
}

const saveReviewHeaderBtn = document.getElementById("saveReviewHeaderBtn");
if (saveReviewHeaderBtn) {
  saveReviewHeaderBtn.addEventListener("click", async () => {
    portfolioData.reviews = {
      ...(portfolioData.reviews || {}),
      eyebrow: document.getElementById("reviewEyebrowInput").value.trim() || "Creator Reviews",
      title: document.getElementById("reviewTitleInput").value.trim() || "Loved by creators who reach millions.",
      items: portfolioData.reviews?.items || []
    };
    await savePortfolioToFirestore();
    showToast("Reviews section header saved!", "success");
  });
}

// 9. Modals (Thumbnail, Creator, Before/After, Review)
const thumbnailModal = document.getElementById("thumbnailModal");
const creatorModal = document.getElementById("creatorModal");
const beforeAfterModal = document.getElementById("beforeAfterModal");
const reviewModal = document.getElementById("reviewModal");

document.querySelectorAll("[data-modal]").forEach(btn => {
  btn.addEventListener("click", () => {
    const m = document.getElementById(btn.dataset.modal);
    if (m) m.classList.remove("open");
  });
});

document.getElementById("addThumbnailBtn").addEventListener("click", () => openThumbnailModal());
document.getElementById("addCreatorBtn").addEventListener("click", () => openCreatorModal());
const addBaBtn = document.getElementById("addBeforeAfterBtn");
if (addBaBtn) addBaBtn.addEventListener("click", () => openBeforeAfterModal());
const addRvBtn = document.getElementById("addReviewBtn");
if (addRvBtn) addRvBtn.addEventListener("click", () => openReviewModal());

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
    const subsInput = document.getElementById("creatorSubs");
    if (subsInput) subsInput.value = c.subs || "";
    document.getElementById("creatorAvatarInput").value = c.avatar || "";
    if (c.avatar) {
      preview.src = c.avatar;
      preview.style.display = "block";
    }
  } else {
    document.getElementById("creatorModalTitle").textContent = "Add Creator";
    document.getElementById("creatorEditId").value = "";
    const subsInput = document.getElementById("creatorSubs");
    if (subsInput) subsInput.value = "";
  }

  creatorModal.classList.add("open");
}

function openBeforeAfterModal(editIdx = null) {
  if (!beforeAfterModal) return;
  const form = document.getElementById("beforeAfterForm");
  form.reset();
  const previewBefore = document.getElementById("baBeforePreviewImg");
  const previewAfter = document.getElementById("baAfterPreviewImg");
  if (previewBefore) { previewBefore.style.display = "none"; previewBefore.src = ""; }
  if (previewAfter) { previewAfter.style.display = "none"; previewAfter.src = ""; }

  const items = portfolioData.beforeAfter?.items || [];
  if (editIdx !== null && items[editIdx]) {
    const item = items[editIdx];
    document.getElementById("beforeAfterModalTitle").textContent = "Edit Comparison";
    document.getElementById("baEditId").value = item.id;
    document.getElementById("baItemTitle").value = item.title || "";
    document.getElementById("baItemSubtitle").value = item.subtitle || "";
    document.getElementById("baBeforeTag").value = item.beforeTag || "Raw In-Game";
    document.getElementById("baAfterTag").value = item.afterTag || "Final Click";
    document.getElementById("baBeforeSrcInput").value = item.before || "";
    document.getElementById("baAfterSrcInput").value = item.after || "";
    if (item.before && previewBefore) {
      previewBefore.src = item.before;
      previewBefore.style.display = "block";
    }
    if (item.after && previewAfter) {
      previewAfter.src = item.after;
      previewAfter.style.display = "block";
    }
  } else {
    document.getElementById("beforeAfterModalTitle").textContent = "Add Comparison";
    document.getElementById("baEditId").value = "";
    document.getElementById("baItemTitle").value = `Transformation ${items.length + 1}`;
    document.getElementById("baItemSubtitle").value = "";
    document.getElementById("baBeforeTag").value = "Raw In-Game";
    document.getElementById("baAfterTag").value = "Final Click";
  }

  beforeAfterModal.classList.add("open");
}

function openReviewModal(editIdx = null) {
  if (!reviewModal) return;
  const form = document.getElementById("reviewForm");
  form.reset();
  const preview = document.getElementById("reviewPreviewImg");
  if (preview) { preview.style.display = "none"; preview.src = ""; }

  const items = portfolioData.reviews?.items || [];
  if (editIdx !== null && items[editIdx]) {
    const item = items[editIdx];
    document.getElementById("reviewModalTitle").textContent = "Edit Creator Review";
    document.getElementById("reviewEditId").value = item.id;
    document.getElementById("reviewName").value = item.name || "";
    document.getElementById("reviewSubs").value = item.subs || "";
    document.getElementById("reviewAvatarInput").value = item.avatar || "";
    document.getElementById("reviewBubble").value = item.bubble || "";
    if (item.avatar && preview) {
      preview.src = item.avatar;
      preview.style.display = "block";
    }
  } else {
    document.getElementById("reviewModalTitle").textContent = "Add Creator Review";
    document.getElementById("reviewEditId").value = "";
    document.getElementById("reviewName").value = "";
    document.getElementById("reviewSubs").value = "500K+";
    document.getElementById("reviewBubble").value = "";
  }

  reviewModal.classList.add("open");
}

// 10. Image Dropzone & File Handling (Converts to DataURL or Firebase Storage)
function setupDropzone(dropzoneId, inputId, previewId, urlInputId) {
  const dropzone = document.getElementById(dropzoneId);
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  const urlInput = document.getElementById(urlInputId);
  if (!dropzone || !input || !preview || !urlInput) return;

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
setupDropzone("baBeforeDropzone", "baBeforeFileInput", "baBeforePreviewImg", "baBeforeSrcInput");
setupDropzone("baAfterDropzone", "baAfterFileInput", "baAfterPreviewImg", "baAfterSrcInput");
setupDropzone("reviewDropzone", "reviewFileInput", "reviewPreviewImg", "reviewAvatarInput");

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
  const subs = (document.getElementById("creatorSubs")?.value || "").trim();
  const avatar = document.getElementById("creatorAvatarInput").value.trim();

  const creators = [...(portfolioData.collaborators || [])];

  if (editId) {
    const idx = creators.findIndex(c => c.id === editId);
    if (idx !== -1) {
      creators[idx] = { ...creators[idx], name, profileUrl, avatar, subs };
    }
  } else {
    const newId = `creator-${Date.now()}`;
    creators.push({ id: newId, name, profileUrl, avatar, subs });
  }

  portfolioData.collaborators = creators;
  creatorModal.classList.remove("open");
  renderCreators();
  await savePortfolioToFirestore();
});

const beforeAfterForm = document.getElementById("beforeAfterForm");
if (beforeAfterForm) {
  beforeAfterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("baEditId").value;
    const title = document.getElementById("baItemTitle").value.trim();
    const subtitle = document.getElementById("baItemSubtitle").value.trim();
    const beforeTag = document.getElementById("baBeforeTag").value.trim() || "Raw In-Game";
    const afterTag = document.getElementById("baAfterTag").value.trim() || "Final Click";
    const before = document.getElementById("baBeforeSrcInput").value.trim();
    const after = document.getElementById("baAfterSrcInput").value.trim();

    if (!before || !after) {
      showToast("Please provide both before and after images", "error");
      return;
    }

    const items = [...(portfolioData.beforeAfter?.items || [])];

    if (editId) {
      const idx = items.findIndex(item => item.id === editId);
      if (idx !== -1) {
        items[idx] = { ...items[idx], title, subtitle, beforeTag, afterTag, before, after };
      }
    } else {
      const newId = `ba-${Date.now()}`;
      items.push({ id: newId, title, subtitle, beforeTag, afterTag, before, after });
    }

    portfolioData.beforeAfter = {
      ...(portfolioData.beforeAfter || {}),
      items
    };

    beforeAfterModal.classList.remove("open");
    renderBeforeAfter();
    await savePortfolioToFirestore();
  });
}

const reviewForm = document.getElementById("reviewForm");
if (reviewForm) {
  reviewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("reviewEditId").value;
    const name = document.getElementById("reviewName").value.trim();
    const subs = document.getElementById("reviewSubs").value.trim();
    const avatar = document.getElementById("reviewAvatarInput").value.trim();
    const bubble = document.getElementById("reviewBubble").value.trim();

    if (!name || !bubble) {
      showToast("Please provide creator name and review quote", "error");
      return;
    }

    const items = [...(portfolioData.reviews?.items || [])];

    if (editId) {
      const idx = items.findIndex(item => item.id === editId);
      if (idx !== -1) {
        items[idx] = { ...items[idx], name, subs, avatar, bubble };
      }
    } else {
      const newId = `rv-${Date.now()}`;
      items.push({ id: newId, name, subs, avatar, bubble });
    }

    portfolioData.reviews = {
      ...(portfolioData.reviews || {}),
      items
    };

    reviewModal.classList.remove("open");
    renderReviews();
    await savePortfolioToFirestore();
  });
}

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
window.addEventListener("DOMContentLoaded", async () => {
  initVisualBuilder();
  try {
    const res = await fetch("/content/portfolio.json");
    if (res.ok) {
      const localData = await res.json();
      portfolioData = { ...portfolioData, ...localData };
      renderAllData();
    }
  } catch (_) {}

  const config = getSavedFirebaseConfig();
  if (config) {
    initFirebase(config);
  } else {
    showFirebaseConfigScreen();
  }
});


// ==========================================================================
// VISUAL STUDIO BUILDER & REAL-TIME STYLING LOGIC
// ==========================================================================

const DEFAULT_THEME = {
  colorAccent: "#a855f7",
  colorPop: "#c084fc",
  bgDeep: "#07060b",
  bgCard: "#12101a",
  textColor: "#ffffff",
  textMuted: "#8e8a9f",
  glowIntensity: 60,
  heroScale: 100,
  cardRadius: 20,
  cardSize: 100,
  backdropBlur: 24,
  heroTitle: "selected works",
  showreelBadge: "scroll me",
  marqueeText: "showreel • 2025 • showreel • 2025 •"
};

const THEME_PRESETS = {
  "obsidian-purple": {
    colorAccent: "#a855f7",
    colorPop: "#c084fc",
    bgDeep: "#07060b",
    bgCard: "#12101a",
    textColor: "#ffffff",
    textMuted: "#8e8a9f",
    glowIntensity: 70
  },
  "cyber-gold": {
    colorAccent: "#ffed29",
    colorPop: "#fef08a",
    bgDeep: "#060608",
    bgCard: "#141410",
    textColor: "#ffffff",
    textMuted: "#a1a1aa",
    glowIntensity: 55
  },
  "emerald-matrix": {
    colorAccent: "#10b981",
    colorPop: "#34d399",
    bgDeep: "#030a06",
    bgCard: "#0d1a12",
    textColor: "#ffffff",
    textMuted: "#9ca3af",
    glowIntensity: 65
  },
  "crimson-fade": {
    colorAccent: "#f43f5e",
    colorPop: "#fb7185",
    bgDeep: "#0c0406",
    bgCard: "#1a0b0e",
    textColor: "#ffffff",
    textMuted: "#a8a29e",
    glowIntensity: 60
  },
  "minimal-monochrome": {
    colorAccent: "#ffffff",
    colorPop: "#e4e4e7",
    bgDeep: "#09090b",
    bgCard: "#18181b",
    textColor: "#ffffff",
    textMuted: "#71717a",
    glowIntensity: 30
  }
};

let currentTheme = { ...DEFAULT_THEME };

let themeChannel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    themeChannel = new BroadcastChannel('studio_theme_sync');
  }
} catch (e) {
  console.warn("BroadcastChannel error:", e);
}

function broadcastLiveTheme(theme) {
  if (themeChannel) {
    try {
      themeChannel.postMessage({ type: 'STUDIO_THEME_UPDATE', theme });
    } catch (_) {}
  }
  try {
    localStorage.setItem('studio_live_theme_preview', JSON.stringify({
      theme,
      timestamp: Date.now()
    }));
  } catch (_) {}
}


function initVisualBuilder() {
  // Sync UI inputs with currentTheme
  bindThemeInputs();
  applyLiveThemeToPreview(currentTheme);

  // Setup Preset Buttons
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const presetKey = btn.dataset.preset;
      const preset = THEME_PRESETS[presetKey];
      if (preset) {
        currentTheme = { ...currentTheme, ...preset };
        syncInputsFromTheme(currentTheme);
        applyLiveThemeToPreview(currentTheme);
        showToast(`Applied ${btn.innerText.trim()} preset`);
      }
    });
  });

  // Setup Save Button
  const saveBtn = document.getElementById("saveThemeBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveThemeToFirestore);
  }

  // Setup Reset Button
  const resetBtn = document.getElementById("resetThemeBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      currentTheme = { ...DEFAULT_THEME };
      syncInputsFromTheme(currentTheme);
      applyLiveThemeToPreview(currentTheme);
      showToast("Reset to default studio theme");
    });
  }
}

function bindThemeInputs() {
  const bindings = [
    { color: "vbColorAccent", text: "vbColorAccentText", key: "colorAccent" },
    { color: "vbColorPop", text: "vbColorPopText", key: "colorPop" },
    { color: "vbBgDeep", text: "vbBgDeepText", key: "bgDeep" },
    { color: "vbBgCard", text: "vbBgCardText", key: "bgCard" },
    { color: "vbTextColor", text: "vbTextColorText", key: "textColor" },
    { color: "vbMutedColor", text: "vbMutedColorText", key: "textMuted" },
  ];

  bindings.forEach(({ color, text, key }) => {
    const cEl = document.getElementById(color);
    const tEl = document.getElementById(text);

    if (cEl && tEl) {
      cEl.addEventListener("input", (e) => {
        tEl.value = e.target.value;
        currentTheme[key] = e.target.value;
        applyLiveThemeToPreview(currentTheme);
      });
      tEl.addEventListener("input", (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
          cEl.value = e.target.value;
          currentTheme[key] = e.target.value;
          applyLiveThemeToPreview(currentTheme);
        }
      });
    }
  });

  // Sliders
  bindSlider("vbGlowIntensity", "vbGlowVal", "glowIntensity", "%");
  bindSlider("vbHeroScale", "vbHeroScaleVal", "heroScale", "%");
  bindSlider("vbCardRadius", "vbRadiusVal", "cardRadius", "px");
  bindSlider("vbCardSize", "vbCardSizeVal", "cardSize", "%");
  bindSlider("vbBackdropBlur", "vbBlurVal", "backdropBlur", "px");

  // Text Inputs
  bindTextInput("vbHeroTitle", "heroTitle");
  bindTextInput("vbShowreelBadge", "showreelBadge");
  bindTextInput("vbMarqueeText", "marqueeText");
}

function bindSlider(sliderId, labelId, key, unit) {
  const sEl = document.getElementById(sliderId);
  const lEl = document.getElementById(labelId);
  if (!sEl) return;

  sEl.addEventListener("input", (e) => {
    const val = Number(e.target.value);
    currentTheme[key] = val;
    if (lEl) lEl.textContent = `${val}${unit}`;
    applyLiveThemeToPreview(currentTheme);
  });
}

function bindTextInput(inputId, key) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.addEventListener("input", (e) => {
    currentTheme[key] = e.target.value;
    applyLiveThemeToPreview(currentTheme);
  });
}

function syncInputsFromTheme(theme) {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal("vbColorAccent", theme.colorAccent);
  setVal("vbColorAccentText", theme.colorAccent);
  setVal("vbColorPop", theme.colorPop);
  setVal("vbColorPopText", theme.colorPop);
  setVal("vbBgDeep", theme.bgDeep);
  setVal("vbBgDeepText", theme.bgDeep);
  setVal("vbBgCard", theme.bgCard);
  setVal("vbBgCardText", theme.bgCard);
  setVal("vbTextColor", theme.textColor);
  setVal("vbTextColorText", theme.textColor);
  setVal("vbMutedColor", theme.textMuted);
  setVal("vbMutedColorText", theme.textMuted);

  setVal("vbGlowIntensity", theme.glowIntensity);
  setVal("vbHeroScale", theme.heroScale);
  setVal("vbCardRadius", theme.cardRadius);
  setVal("vbCardSize", theme.cardSize);
  setVal("vbBackdropBlur", theme.backdropBlur);

  const setLabel = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setLabel("vbGlowVal", `${theme.glowIntensity}%`);
  setLabel("vbHeroScaleVal", `${theme.heroScale}%`);
  setLabel("vbRadiusVal", `${theme.cardRadius}px`);
  setLabel("vbCardSizeVal", `${theme.cardSize}%`);
  setLabel("vbBlurVal", `${theme.backdropBlur}px`);

  setVal("vbHeroTitle", theme.heroTitle);
  setVal("vbShowreelBadge", theme.showreelBadge);
  setVal("vbMarqueeText", theme.marqueeText);
}

function applyLiveThemeToPreview(theme) {
  broadcastLiveTheme(theme);
  const stage = document.getElementById("vbPreviewStage");
  if (!stage) return;

  stage.style.backgroundColor = theme.bgDeep;
  stage.style.color = theme.textColor;

  const mockHero = document.getElementById("mockHeroTitle");
  if (mockHero) {
    mockHero.textContent = theme.heroTitle || "selected works";
    mockHero.style.color = theme.textColor;
    mockHero.style.transform = `scale(${theme.heroScale / 100})`;
  }

  const mockTag = document.getElementById("mockHeroTag");
  if (mockTag) {
    mockTag.style.color = theme.colorAccent;
  }

  const mockDot = document.getElementById("mockDot");
  if (mockDot) {
    mockDot.style.backgroundColor = theme.colorPop;
    mockDot.style.boxShadow = `0 0 10px ${theme.colorPop}`;
  }

  const mockCard = document.getElementById("mockCard");
  if (mockCard) {
    mockCard.style.backgroundColor = theme.bgCard;
    mockCard.style.borderRadius = `${theme.cardRadius}px`;
    mockCard.style.transform = `scale(${theme.cardSize / 100})`;
    mockCard.style.boxShadow = `0 20px 50px rgba(0, 0, 0, 0.8), 0 0 ${(theme.glowIntensity * 0.5).toFixed(0)}px ${theme.colorAccent}`;
  }

  const mockBadge = document.getElementById("mockCardBadge");
  if (mockBadge) {
    mockBadge.textContent = `↓ ${theme.showreelBadge || 'scroll me'}`.toUpperCase();
    mockBadge.style.color = theme.textColor;
  }

  const mockAvatar = document.getElementById("mockAvatar");
  if (mockAvatar) {
    mockAvatar.style.background = `linear-gradient(135deg, ${theme.colorPop}, ${theme.colorAccent})`;
  }

  const mockBubble = document.getElementById("mockBubble");
  if (mockBubble) {
    mockBubble.style.color = theme.textColor;
    mockBubble.style.backdropFilter = `blur(${theme.backdropBlur}px)`;
  }
}

async function saveThemeToFirestore() {
  if (!db) {
    showToast("Firestore not connected", "error");
    return;
  }

  const saveBtn = document.getElementById("saveThemeBtn");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerText = "Publishing Theme...";
  }

  try {
    // Merge theme object into portfolio document
    portfolioData.theme = { ...currentTheme };
    await db.collection("portfolio").doc("live").set({
      ...portfolioData,
      theme: currentTheme,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showToast("Theme published live to website!", "success");
  } catch (err) {
    console.error("Error saving theme to Firestore:", err);
    showToast(`Failed to save theme: ${err.message}`, "error");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerText = "Save Theme to Live Site";
    }
  }
}
