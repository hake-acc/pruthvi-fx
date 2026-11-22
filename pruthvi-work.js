(() => {
  const LOCAL_DATA_SOURCE = "/content/portfolio.json";
  const CONTENT_POLL_MS = 30_000;
  const MAX_SPIRAL_THUMBNAILS = 10;
  const CONTENT_ENDPOINT = document
    .querySelector('meta[name="notzeox-content-endpoint"]')
    ?.getAttribute("content")
    ?.trim();
  const WORK_VIEW = "work";
  let workNavigationArmed = false;
  const isWorkLocation = () =>
    new URLSearchParams(location.search).get("view") === WORK_VIEW;
  try {
    // Remove the reload bridge used by older builds. Every fresh load starts
    // on Home; Work is opened only by an explicit in-page interaction.
    sessionStorage.removeItem("notzeox:open-work-after-entry");
  } catch {
    // The route remains deterministic when storage is unavailable.
  }
  // If URL has ?view=work on load, arm workNavigation
  if (isWorkLocation()) {
    workNavigationArmed = true;
  }
  const DAY_MS = 86_400_000;
  const PROJECT_IMAGE_ROOT =
    "/sanity/images/u7lvkmbp/production/";
  const DISCORD_ICON_PATH =
    "M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z";
  const DISCORD_FONT_ASSETS = [
    "/assets/discord-gg-sans-400.woff2",
    "/assets/discord-gg-sans-500.woff2",
  ];
  const DISCORD_LOADING_MESSAGE = [
    "Need a thumbnail? Just say the word — don't hold back.",
  ];

  function warmDiscordLoaderFonts() {
    DISCORD_FONT_ASSETS.forEach((href) => {
      if (document.head.querySelector(`link[href="${href}"]`)) return;
      const preload = document.createElement("link");
      preload.rel = "preload";
      preload.as = "font";
      preload.type = "font/woff2";
      preload.crossOrigin = "anonymous";
      preload.href = href;
      document.head.append(preload);
    });
    if (document.fonts) {
      void Promise.all([
        document.fonts.load('400 16px "Zeox Discord UI"'),
        document.fonts.load('500 14px "Zeox Discord UI"'),
      ]).catch(() => {
        // The measured Discord fallback stack below keeps the layout stable.
      });
    }
  }

  warmDiscordLoaderFonts();

  let portfolio = null;

  const DEFAULT_PORTFOLIO = {
    experienceStart: "2022-07-30",
    email: "notmafiyaxd@gmail.com",
    discord: "pruthvifx",
    discordUrl: "https://discord.gg/rHugN7euzG",
    instagram: "pruthvifx99",
    instagramUrl: "https://www.instagram.com/pruthvifx99?dmpr=MTh5Y3Z6aTRjdTBkb",
    lifetimeThumbnails: 100,
    collaborators: [
      { id: "creator-01", name: "INSANE RMK", avatar: "/images/creators/insane_rmk.webp", profileUrl: "https://www.youtube.com/@InsaneRMK" },
      { id: "creator-02", name: "Mikey Chan", avatar: "/images/creators/mikey_chan.webp", profileUrl: "https://www.youtube.com/@MickeyChaan" },
      { id: "creator-03", name: "Kabeer", avatar: "/images/creators/kabeer.webp", profileUrl: "https://www.youtube.com/@kabeerOG" },
      { id: "creator-04", name: "Mr Overrated", avatar: "/images/creators/mr_overrated.webp", profileUrl: "https://www.youtube.com/@Mr_OverratedXD" },
      { id: "creator-05", name: "Znsu", avatar: "/images/creators/znsu.webp", profileUrl: "https://www.youtube.com/@znsuyt" },
      { id: "creator-06", name: "Teddy Gaming", avatar: "/images/creators/teddy_gaming.webp", profileUrl: "https://www.youtube.com/@TeddyGaming" },
      { id: "creator-07", name: "Haider Playz", avatar: "/images/creators/haider_playz.webp", profileUrl: "https://www.youtube.com/@HaiderPlayz786" },
      { id: "creator-08", name: "Gamingrill", avatar: "/images/creators/gamingrill.webp", profileUrl: "https://youtube.com/@gaming_grill" }
    ],
    thumbnails: [
      { id: "thumbnail-01", title: "Thumbnail 1", src: "/images/pruthvi_thumb_01_build.webp" },
      { id: "thumbnail-02", title: "Thumbnail 2", src: "/images/pruthvi_thumb_02_after.webp" },
      { id: "thumbnail-03", title: "Thumbnail 3", src: "/images/pruthvi_thumb_03_flamefrag.webp" },
      { id: "thumbnail-04", title: "Thumbnail 4", src: "/images/pruthvi_thumb_04_gaming_grill.webp" },
      { id: "thumbnail-05", title: "Thumbnail 5", src: "/images/pruthvi_thumb_05_kabeer.webp" },
      { id: "thumbnail-06", title: "Thumbnail 6", src: "/images/pruthvi_thumb_06_kira.webp" },
      { id: "thumbnail-07", title: "Thumbnail 7", src: "/images/pruthvi_thumb_07_shadow.webp" },
      { id: "thumbnail-08", title: "Thumbnail 8", src: "/images/pruthvi_thumb_08_teddy.webp" },
      { id: "thumbnail-09", title: "Thumbnail 9", src: "/images/pruthvi_thumb_09_work.webp" },
      { id: "thumbnail-10", title: "Thumbnail 10", src: "/images/pruthvi_thumb_10_lal_baal.webp" },
      { id: "thumbnail-11", title: "Thumbnail 11", src: "/images/pruthvi_thumb_11_mickey.webp" },
      { id: "thumbnail-12", title: "Thumbnail 12", src: "/images/pruthvi_thumb_12_kabeer5.webp" },
      { id: "thumbnail-13", title: "Thumbnail 13", src: "/images/pruthvi_thumb_13_work7.webp" }
    ],
    spiralThumbnailIds: [
      "thumbnail-01", "thumbnail-02", "thumbnail-03", "thumbnail-04", "thumbnail-05",
      "thumbnail-06", "thumbnail-07", "thumbnail-08", "thumbnail-09", "thumbnail-10"
    ]
  };

  function createLightbox() {
    if (document.querySelector(".zeox-lightbox")) return;
    const lightbox = document.createElement("div");
    lightbox.className = "zeox-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Project image preview");
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.innerHTML = `
      <button class="zeox-lightbox__close" type="button" aria-label="Close image">&times;</button>
      <div class="zeox-lightbox__stage">
        <img class="zeox-lightbox__image" alt="">
      </div>
    `;
    document.body.append(lightbox);
  }

  function createToast() {
    if (document.querySelector(".zeox-toast")) return;
    const toast = document.createElement("div");
    toast.className = "zeox-toast";
    toast.setAttribute("role", "status");
    document.body.append(toast);
  }

  function showToast(message) {
    const toast = document.querySelector(".zeox-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("show");
    window.clearTimeout(showToast.timeout);
    requestAnimationFrame(() => toast.classList.add("show"));
    showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 1800);
  }
  window.showToast = showToast;

  let workPage = null;
  let revealObserver = null;
  let returnFocus = null;
  let midnightTimer = null;
  let triggerObserver = null;
  let imageRequestId = 0;
  let imageReturnFocus = null;
  let lightboxCloseTimer = null;
  let lightboxCleanupTimer = null;
  let discordTransitionTimer = null;
  let workProgressFrame = null;
  let counterLaunchTimer = null;
  let workSettleTimer = null;
  let workCloseTimer = null;
  let workTransitionToken = 0;
  let counterGeneration = 0;
  let endmarkObserver = null;
  let scrollLetterGroups = [];
  let popupInteractionState = null;
  let globalEventsReady = false;
  let workEventsReady = false;

  let contentPollTimer = null;
  let contentRequest = null;
  let contentPollingReady = false;
  let portfolioSignature = "";
  let spiralSyncTimer = null;
  let spiralSyncGeneration = 0;
  const spiralImageCache = new Map();
  const spiralImageWarnings = new Set();
  const spiralImageFailures = new Map();
  const spiralTouch = {
    active: false,
    moved: false,
    mode: null,
    startX: 0,
    startY: 0,
    lastY: 0,
  };

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const renderTypedLabel = (value) =>
    Array.from(value)
      .map(
        (character, index) =>
          `<span style="--zeox-type-index:${index}">${
            character === " " ? "&nbsp;" : escapeHtml(character)
          }</span>`
      )
      .join("");

  const renderDiscordTip = (segments) =>
    segments
      .map((segment) => {
        if (typeof segment === "object" && segment?.key) {
          return `<kbd class="zeox-discord-keycap">${escapeHtml(segment.key)}</kbd>`;
        }
        return `<span class="zeox-discord-tip-copy">${escapeHtml(segment)}</span>`;
      })
      .join(" ");

  const formatNumber = (value) =>
    new Intl.NumberFormat("en-US").format(value);

  function getAudio() {
    return document.querySelector("#__nuxt")?.__vue_app__?.config
      ?.globalProperties?.$audio;
  }

  function playSound(name) {
    try {
      getAudio()?.play(name);
    } catch {
      // The existing sound system may still be loading.
    }
  }

  function calculateExperienceDays(startDate) {
    const [year, month, day] = startDate.split("-").map(Number);
    const now = new Date();
    const todayUtc = Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startUtc = Date.UTC(year, month - 1, day);
    return Math.max(0, Math.floor((todayUtc - startUtc) / DAY_MS));
  }

  function scheduleDayUpdate() {
    window.clearTimeout(midnightTimer);
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 2, 0);
    midnightTimer = window.setTimeout(() => {
      updateLiveDays();
      scheduleDayUpdate();
    }, nextMidnight.getTime() - now.getTime());
  }

  function updateLiveDays() {
    if (!portfolio || !workPage) return;
    const days = calculateExperienceDays(portfolio.experienceStart);
    workPage.querySelectorAll("[data-live-days]").forEach((element) => {
      element.dataset.target = String(days);
      if (element.dataset.counted === "true") {
        element.textContent = `${formatNumber(days)}${element.dataset.suffix || ""}`;
      }
    });
  }

  function renderCreatorProfiles(collaborators, interactive = false) {
    const profiles =
      Array.isArray(collaborators) && collaborators.length > 0
        ? collaborators.slice(0, 12)
        : Array.from({ length: 8 }, () => ({}));

    return profiles
      .map((creator, index) => {
        const avatar = creator.avatar || "";
        const creatorId =
          creator.id || `creator-${String(index + 1).padStart(2, "0")}`;
        const creatorName = creator.name || "";
        const profileUrl = interactive ? creator.profileUrl || "" : "";
        const analyticsAttribute = profileUrl
          ? `data-zeox-creator-id="${escapeHtml(creatorId)}"`
          : "";
        const profileOpen = profileUrl
          ? `<a
              class="zeox-collaborator-profile"
              style="--zeox-profile-index:${index}"
              data-zeox-collaborator
              ${analyticsAttribute}
              href="${escapeHtml(profileUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              title="${escapeHtml(creatorName)}"
              aria-label="${escapeHtml(creatorName || 'Open creator profile')}"
            >`
          : `<span
              class="zeox-collaborator-profile"
              style="--zeox-profile-index:${index}"
              data-zeox-collaborator
              ${analyticsAttribute}
              title="${escapeHtml(creatorName)}"
              aria-hidden="true"
            >`;
        const profileClose = profileUrl ? "</a>" : "</span>";
        return `
          ${profileOpen}
            <span class="zeox-collaborator-media">
              ${
                avatar
                  ? `<img
                      class="zeox-collaborator-image"
                      src="${escapeHtml(avatar)}"
                      alt="${escapeHtml(creatorName)}"
                      loading="eager"
                    >`
                  : `<span class="zeox-collaborator-placeholder" aria-hidden="true"></span>`
              }
            </span>
          ${profileClose}
        `;
      })
      .join("");
  }

  function renderGalleryItems(thumbnails) {
    return thumbnails
      .map(
        (item, index) => `
          <button
            class="zeox-work-card"
            type="button"
            style="--zeox-index:${index % 3}"
            data-zeox-image="${escapeHtml(item.src)}"
            data-zeox-thumbnail-id="${escapeHtml(item.id)}"
            aria-label="Open thumbnail preview"
          >
            <span class="zeox-work-card-media">
              <img
                src="${escapeHtml(item.src)}"
                alt=""
                crossorigin="anonymous"
                loading="${index < 3 ? "eager" : "lazy"}"
                decoding="async"
                fetchpriority="${index < 3 ? "high" : "auto"}"
              >
            </span>
          </button>
        `
      )
      .join("");
  }

  function normalizePortfolioManifest(payload, sourceUrl) {
    const candidate = payload?.portfolio || payload?.data || payload;
    if (!candidate || typeof candidate !== "object") {
      throw new Error("Portfolio manifest must be an object");
    }
    if (
      !Array.isArray(candidate.thumbnails) ||
      !Array.isArray(candidate.collaborators)
    ) {
      throw new Error("Portfolio manifest is missing thumbnails or collaborators");
    }

    const resolveAsset = (value) => {
      if (!value || !sourceUrl) return value || "";
      if (String(value).startsWith("/")) return value;
      try {
        const resolved = new URL(value, sourceUrl);
        return ["http:", "https:"].includes(resolved.protocol)
          ? resolved.href
          : "";
      } catch {
        return "";
      }
    };

    const thumbnails = candidate.thumbnails
      .map((thumbnail, index) => ({
        ...thumbnail,
        id: String(
          thumbnail?.id ||
            `thumbnail-${String(index + 1).padStart(2, "0")}`
        ),
        src: resolveAsset(thumbnail?.src),
      }))
      .filter((thumbnail) => thumbnail.src);
    const thumbnailIds = new Set(thumbnails.map(({ id }) => id));
    const spiralThumbnailIds = Array.isArray(candidate.spiralThumbnailIds)
      ? candidate.spiralThumbnailIds
          .map((id) => String(id || "").trim())
          .filter(
            (id, index, ids) =>
              thumbnailIds.has(id) && ids.indexOf(id) === index
          )
          .slice(0, MAX_SPIRAL_THUMBNAILS)
      : [];

    return {
      ...candidate,
      collaborators: candidate.collaborators.map((creator, index) => ({
        ...creator,
        id: String(
          creator?.id ||
            `creator-${String(index + 1).padStart(2, "0")}`
        ),
        avatar: resolveAsset(creator?.avatar),
        profileUrl: resolveAsset(creator?.profileUrl),
      })),
      thumbnails,
      spiralThumbnailIds,
    };
  }

  async function fetchPortfolioManifest(source, resolveRelativeAssets = false) {
    const response = await fetch(source, {
      method: "GET",
      headers: { accept: "application/json" },
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Portfolio data request failed: ${response.status}`);
    }
    return normalizePortfolioManifest(
      await response.json(),
      resolveRelativeAssets ? response.url || source : ""
    );
  }

  function loadSpiralImage(source) {
    if (spiralImageCache.has(source)) return spiralImageCache.get(source);
    const failure = spiralImageFailures.get(source);
    if (failure?.retryAt > Date.now()) {
      return Promise.reject(failure.error);
    }
    const request = new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";
      image.onload = () => {
        spiralImageFailures.delete(source);
        resolve(image);
      };
      image.onerror = () => reject(new Error(`Unable to load ${source}`));
      image.src = source;
    }).catch((error) => {
      spiralImageCache.delete(source);
      const attempts = Number(spiralImageFailures.get(source)?.attempts || 0) + 1;
      spiralImageFailures.set(source, {
        attempts,
        error,
        retryAt:
          Date.now() + Math.min(5 * 60_000, 30_000 * 2 ** (attempts - 1)),
      });
      throw error;
    });
    spiralImageCache.set(source, request);
    return request;
  }

  function updateSpiralPlaneImageSize(plane, image) {
    const width = Number(image?.naturalWidth || image?.width || 0);
    const height = Number(image?.naturalHeight || image?.height || 0);
    if (!width || !height) return;
    plane?.material?.uniforms?.uImageSizes?.value?.set?.(width, height);
  }

  function releaseSpiralPlaneTexture(plane) {
    const textureUniform = plane?.material?.uniforms?.uTexture;
    const currentTexture = textureUniform?.value;
    const baseTexture = plane?.userData?.zeoxBaseTexture;
    if (
      plane?.userData?.zeoxTextureOwned &&
      currentTexture &&
      currentTexture !== baseTexture
    ) {
      currentTexture.dispose?.();
    }
    if (textureUniform && baseTexture) {
      textureUniform.value = baseTexture;
      updateSpiralPlaneImageSize(plane, baseTexture.image);
    }
    if (!plane?.userData) return;
    plane.userData.zeoxTextureOwned = false;
    delete plane.userData.zeoxSource;
    delete plane.userData.zeoxThumbnailId;
    delete plane.userData.zeoxSelectionIndex;
  }

  function spiralProjectForItem(item) {
    return {
      ...item,
      id: item.id,
      src: item.src,
      title: item.title || "",
      slug: { current: item.id },
      zeoxSpiralProject: true,
    };
  }

  function selectedSpiralThumbnails(manifest = portfolio) {
    if (!Array.isArray(manifest?.thumbnails)) return [];
    const thumbnailsById = new Map(
      manifest.thumbnails.map((thumbnail) => [thumbnail.id, thumbnail])
    );
    const explicitIds = Array.isArray(manifest.spiralThumbnailIds)
      ? manifest.spiralThumbnailIds
      : [];
    const source = explicitIds.length
      ? explicitIds.map((id) => thumbnailsById.get(id))
      : manifest.thumbnails;
    const selectedIds = new Set();
    const selectedSources = new Set();
    const selected = [];

    for (const thumbnail of source) {
      if (!thumbnail || selected.length >= MAX_SPIRAL_THUMBNAILS) break;
      const id = String(thumbnail.id || "").trim();
      const assetSource = String(thumbnail.src || "").trim();
      if (!id || !assetSource) continue;
      let resolvedSource = assetSource;
      try {
        resolvedSource = new URL(assetSource, location.href).href;
      } catch {
        // Keep the original source as the uniqueness key if it cannot resolve.
      }
      if (selectedIds.has(id) || selectedSources.has(resolvedSource)) continue;
      selectedIds.add(id);
      selectedSources.add(resolvedSource);
      selected.push(thumbnail);
    }

    return selected;
  }

  function buildSpiralAssignments(thumbnails, planes) {
    if (!thumbnails.length || !planes.length) return [];
    const centerSlot = Math.floor(planes.length / 2);
    const angleGap = Number(planes[0]?.angleGap || 0.85);
    const frontFacingOffset = Math.round((Math.PI / 2) / angleGap);
    const focusSlot = (centerSlot + frontFacingOffset) % planes.length;
    const startSlot = focusSlot - Math.floor((thumbnails.length - 1) / 2);
    return planes.map((plane, slotIndex) => {
      const selectionIndex =
        ((slotIndex - startSlot) % thumbnails.length + thumbnails.length) %
        thumbnails.length;
      const item = thumbnails[selectionIndex];
      return {
        plane,
        item,
        project: spiralProjectForItem(item),
        selectionIndex,
        slotIndex,
      };
    });
  }

  function spiralTextureSource(plane) {
    const image = plane?.material?.uniforms?.uTexture?.value?.image;
    return (
      (typeof image?.currentSrc === "string" && image.currentSrc.trim()) ||
      (typeof image?.src === "string" && image.src.trim()) ||
      null
    );
  }

  function sameSpiralSource(first, second) {
    if (!first || !second) return false;
    try {
      return new URL(first, location.href).href === new URL(second, location.href).href;
    } catch {
      return first === second;
    }
  }

  function setSpiralPlaneSelectionVisibility(plane, isVisible) {
    if (!plane?.userData) return;
    if (isVisible) {
      if (Number.isInteger(plane.userData.zeoxSelectionLayerMask)) {
        plane.layers.mask = plane.userData.zeoxSelectionLayerMask;
        delete plane.userData.zeoxSelectionLayerMask;
      }
      plane.userData.zeoxSelectionHidden = false;
      plane.visible = true;
      return;
    }

    if (
      plane.userData.zeoxSelectionLayerMask === undefined &&
      Number.isInteger(plane.layers?.mask)
    ) {
      plane.userData.zeoxSelectionLayerMask = plane.layers.mask;
    }
    if (plane.layers) plane.layers.mask = 0;
    plane.userData.zeoxSelectionHidden = true;
    plane.visible = false;
  }

  function applyResponsiveSpiralFraming() {
    const experience = window.experience;
    const camera = experience?.camera?.instance;
    const width = experience?.sizes?.width || window.innerWidth;
    const height = experience?.sizes?.height || window.innerHeight;
    if (!camera || !width || !height) return false;

    const portraitMobile = width <= 700 && height > width;
    const aspect = width / height;
    camera.position.z = portraitMobile
      ? 8 * Math.max(1, Math.min(1.8, 0.82 / aspect))
      : 8;
    camera.updateProjectionMatrix?.();
    return true;
  }

  function guardSpiralHoverOverlay(world) {
    const logics = world?.logics;
    if (
      !logics ||
      logics.zeoxSpiralHoverGuarded ||
      typeof logics.hoverProject !== "function"
    ) {
      return;
    }
    const originalHoverProject = logics.hoverProject.bind(logics);
    logics.hoverProject = (project) =>
      originalHoverProject(project?.zeoxSpiralProject ? null : project);
    logics.zeoxSpiralHoverGuarded = true;
  }

  async function syncSpiralManifest(generation) {
    const world = window.experience?.world;
    const planes = world?.projectPlanes;
    if (!Array.isArray(planes) || !planes.length) {
      return false;
    }
    guardSpiralHoverOverlay(world);
    applyResponsiveSpiralFraming();

    const thumbnails = selectedSpiralThumbnails();
    const selectionSignature = thumbnails
      .map(({ id, src }) => `${id}\u0000${src}`)
      .join("\u0001");
    if (world.zeoxSpiralSelectionSignature !== selectionSignature) {
      world.hoveredProject?.setHovered?.(false);
      world.hoveredProject = null;
      world.logics?.hoverProject?.(null);
      if (window.experience?.canvas) {
        window.experience.canvas.style.cursor = "default";
      }
      world.zeoxSpiralSelectionSignature = selectionSignature;
    }
    world.projects = thumbnails.map(spiralProjectForItem);
    const assignments = buildSpiralAssignments(thumbnails, planes);
    const visiblePlaneCount = assignments.length;
    const spiralSlotCount = Math.max(1, planes.length);
    const assignedPlanes = new Set(assignments.map(({ plane }) => plane));

    planes.forEach((plane) => {
      plane.projectsCount = spiralSlotCount;
      plane.centerIndex = Math.floor(spiralSlotCount / 2);
      if (assignedPlanes.has(plane)) return;
      plane.project = null;
      plane.userData.project = null;
      releaseSpiralPlaneTexture(plane);
      setSpiralPlaneSelectionVisibility(plane, false);
    });

    const assignmentResults = await Promise.all(
      assignments.map(async ({ plane, item, project, selectionIndex }) => {
        plane.project = project;
        plane.userData.project = project;
        if (sameSpiralSource(spiralTextureSource(plane), item.src)) {
          updateSpiralPlaneImageSize(
            plane,
            plane.material?.uniforms?.uTexture?.value?.image
          );
          plane.userData.zeoxSource = item.src;
          plane.userData.zeoxThumbnailId = item.id;
          plane.userData.zeoxSelectionIndex = selectionIndex;
          setSpiralPlaneSelectionVisibility(plane, true);
          return true;
        }

        // Never leave an old bundled texture visible while its replacement loads.
        setSpiralPlaneSelectionVisibility(plane, false);
        try {
          const image = await loadSpiralImage(item.src);
          const currentThumbnails = selectedSpiralThumbnails();
          const currentItem = currentThumbnails[selectionIndex];
          if (
            generation !== spiralSyncGeneration ||
            currentItem?.id !== item.id ||
            currentItem?.src !== item.src
          ) {
            return false;
          }

          const textureUniform = plane.material?.uniforms?.uTexture;
          const currentTexture = textureUniform?.value;
          if (!currentTexture?.clone) return false;

          if (!plane.userData.zeoxBaseTexture) {
            plane.userData.zeoxBaseTexture = currentTexture;
          }

          const nextTexture = currentTexture.clone();
          const TextureSource = currentTexture.source?.constructor;
          if (typeof TextureSource === "function") {
            // Texture.clone() keeps Three.js's Source object shared. Give every
            // plane an independent Source so one card cannot change another
            // card's image metadata while its GPU pixels remain stale.
            nextTexture.source = new TextureSource(image);
          } else {
            nextTexture.image = image;
          }
          nextTexture.needsUpdate = true;
          textureUniform.value = nextTexture;
          updateSpiralPlaneImageSize(plane, image);
          if (plane.userData.zeoxTextureOwned) {
            currentTexture.dispose?.();
          }
          plane.project = project;
          plane.userData.project = project;
          plane.userData.zeoxTextureOwned = true;
          plane.userData.zeoxSource = item.src;
          plane.userData.zeoxThumbnailId = item.id;
          plane.userData.zeoxSelectionIndex = selectionIndex;
          spiralImageWarnings.delete(item.src);
          setSpiralPlaneSelectionVisibility(plane, true);
          return true;
        } catch (error) {
          if (generation === spiralSyncGeneration) {
            plane.project = null;
            plane.userData.project = null;
            setSpiralPlaneSelectionVisibility(plane, false);
          }
          if (!spiralImageWarnings.has(item.src)) {
            spiralImageWarnings.add(item.src);
            console.warn(
              "[NotZeox] A selected spiral thumbnail could not load.",
              error
            );
          }
          return false;
        }
      })
    );

    if (generation === spiralSyncGeneration) {
      const activeSources = new Set(
        selectedSpiralThumbnails().map(({ src }) => src)
      );
      for (const source of spiralImageCache.keys()) {
        if (!activeSources.has(source)) spiralImageCache.delete(source);
      }
      for (const source of spiralImageWarnings) {
        if (!activeSources.has(source)) spiralImageWarnings.delete(source);
      }
      for (const source of spiralImageFailures.keys()) {
        if (!activeSources.has(source)) spiralImageFailures.delete(source);
      }
    }

    if (!visiblePlaneCount) {
      world.hoveredProject?.setHovered?.(false);
      world.hoveredProject = null;
      world.logics?.hoverProject?.(null);
      if (window.experience?.canvas) {
        window.experience.canvas.style.cursor = "default";
      }
    }
    return (
      assignmentResults.every(Boolean) &&
      assignments.every(({ plane, item }) =>
        plane.visible !== false &&
        !plane.userData?.zeoxSelectionHidden &&
        sameSpiralSource(spiralTextureSource(plane), item.src)
      )
    );
  }

  function scheduleSpiralManifestSync(attempt = 0) {
    window.clearTimeout(spiralSyncTimer);
    const generation = ++spiralSyncGeneration;
    const run = async () => {
      const ready = await syncSpiralManifest(generation);
      if (!ready && generation === spiralSyncGeneration && attempt < 20) {
        spiralSyncTimer = window.setTimeout(
          () => scheduleSpiralManifestSync(attempt + 1),
          Math.min(5_000, 100 + attempt * 100)
        );
      }
    };
    void run();
  }

  function patchWorkContent(nextPortfolio) {
    const nextSignature = JSON.stringify(nextPortfolio);
    if (nextSignature === portfolioSignature) {
      scheduleSpiralManifestSync();
      return;
    }

    const emailChanged = portfolio?.email !== nextPortfolio.email;
    const discordChanged =
      portfolio?.discordUrl !== nextPortfolio.discordUrl;
    const collaboratorsChanged =
      JSON.stringify(portfolio?.collaborators) !==
      JSON.stringify(nextPortfolio.collaborators);
    const thumbnailsChanged =
      JSON.stringify(portfolio?.thumbnails) !==
      JSON.stringify(nextPortfolio.thumbnails);
    portfolio = nextPortfolio;
    portfolioSignature = nextSignature;
    scheduleSpiralManifestSync();
    if (!workPage) return;

    if (emailChanged) {
      workPage.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
        link.href = `mailto:${nextPortfolio.email}`;
        link.textContent = nextPortfolio.email;
      });
    }
    if (discordChanged) {
      workPage
        .querySelectorAll(".zeox-work-contact-link--discord")
        .forEach((link) => {
          link.href = nextPortfolio.discordUrl;
        });
    }
    if (collaboratorsChanged) {
      workPage
        .querySelectorAll(".zeox-collaborator-group")
        .forEach((group, index) => {
          group.innerHTML = renderCreatorProfiles(
            nextPortfolio.collaborators,
            index === 0
          );
        });
    }
    if (thumbnailsChanged) {
      const gallery = workPage.querySelector(".zeox-thumbnail-grid");
      if (gallery) {
        gallery.innerHTML = renderGalleryItems(nextPortfolio.thumbnails);
      }
      enhanceLegacyTriggers();
    }
    updateLiveDays();
    if (thumbnailsChanged) {
      setupReveals();
      revealVisibleWorkItems();
      updateWorkProgress();
    }
  }

  async function refreshRemotePortfolio() {
    if (document.visibilityState !== "visible") return;
    if (contentRequest) return contentRequest;

    const source = CONTENT_ENDPOINT || LOCAL_DATA_SOURCE;
    contentRequest = fetchPortfolioManifest(source, Boolean(CONTENT_ENDPOINT))
      .then(patchWorkContent)
      .catch(() => {
        // Keep the last valid manifest during a transient admin outage.
      })
      .finally(() => {
        contentRequest = null;
      });
    return contentRequest;
  }

  function scheduleContentPoll() {
    window.clearTimeout(contentPollTimer);
    contentPollTimer = null;
    if (document.visibilityState !== "visible") return;
    contentPollTimer = window.setTimeout(async () => {
      await refreshRemotePortfolio();
      scheduleContentPoll();
    }, CONTENT_POLL_MS);
  }

  function refreshContentOnFocus() {
    if (document.visibilityState !== "visible") return;
    window.clearTimeout(contentPollTimer);
    contentPollTimer = null;
    void refreshRemotePortfolio().finally(scheduleContentPoll);
  }

  function startContentPolling() {
    if (contentPollingReady) return;
    contentPollingReady = true;
    window.addEventListener("focus", refreshContentOnFocus, { passive: true });
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.visibilityState === "visible") {
          refreshContentOnFocus();
        } else {
          window.clearTimeout(contentPollTimer);
          contentPollTimer = null;
        }
      },
      { passive: true }
    );
    scheduleContentPoll();
  }

  function createWorkPage(data) {
    if (document.querySelector(".zeox-work-page")) {
      return document.querySelector(".zeox-work-page");
    }

    const todayYear = String(new Date().getFullYear());
    const days = calculateExperienceDays(data.experienceStart);
    const discordUrl =
      data.discordUrl ||
      "https://discord.gg/rHugN7euzG";
    const page = document.createElement("div");
    page.className = "zeox-work-page";
    page.setAttribute("aria-hidden", "true");
    page.setAttribute("tabindex", "-1");
    page.setAttribute("data-lenis-prevent", "");
    page.setAttribute("data-lenis-prevent-wheel", "");
    page.setAttribute("data-lenis-prevent-touch", "");
    page.innerHTML = `
      <div class="zeox-work-vignette" aria-hidden="true"></div>
      <div class="zeox-work-shell">
        <main>
          <section class="zeox-work-section zeox-work-index" id="zeox-work-gallery">
            <header class="zeox-work-index-header">
              <div class="zeox-work-index-intro">
                <h1 class="zeox-work-hero-title" aria-label="Thumbnails">
                  <span class="zeox-work-hero-line"><span>thumb</span></span>
                  <span class="zeox-work-hero-line"><span>nails.</span></span>
                </h1>
              </div>
            </header>
          </section>

          <section
            class="zeox-work-collaborators"
            data-zeox-collaborators
            aria-label="Creator collaborations"
          >
            <div class="zeox-work-collaborators-inner">
              <div class="zeox-work-collaborators-head">
                <h2 aria-label="Made with creators">
                  <span>Creators</span>
                  <span>in the Frame.</span>
                </h2>
                <dl class="zeox-work-facts" aria-label="Experience in days">
                  <div>
                    <dt
                      data-live-days
                      data-zeox-count
                      data-target="${days}"
                      data-counter-delay="0"
                    >0</dt>
                    <dd>days of experience</dd>
                  </div>
                </dl>
              </div>
              <div class="zeox-collaborator-marquee">
                <div class="zeox-collaborator-track">
                  <div class="zeox-collaborator-group">
                    ${renderCreatorProfiles(data.collaborators, true)}
                  </div>
                  <div class="zeox-collaborator-group" aria-hidden="true">
                    ${renderCreatorProfiles(data.collaborators)}
                  </div>
                  <div class="zeox-collaborator-group" aria-hidden="true">
                    ${renderCreatorProfiles(data.collaborators)}
                  </div>
                  <div class="zeox-collaborator-group" aria-hidden="true">
                    ${renderCreatorProfiles(data.collaborators)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="zeox-work-section zeox-work-gallery-section">
            <div class="zeox-gallery-stage">
              <div class="zeox-thumbnail-grid">
                ${renderGalleryItems(data.thumbnails)}
              </div>
            </div>
          </section>

          <section
            class="zeox-work-statement"
            data-zeox-statement
            aria-label="Let's make something click"
          >
            <div class="zeox-work-statement-sticky">
              <h2>
                <span>Let&rsquo;s make</span>
                <span class="zeox-statement-click-line" data-zeox-click-target>something click.</span>
              </h2>
              <span class="zeox-work-statement-pulse" aria-hidden="true"></span>
              <span class="zeox-statement-fake-cursor" aria-hidden="true">
                <img class="zeox-statement-hand" src="/windows-link-cursor.webp" onerror="if(!this.dataset.triedPng){this.dataset.triedPng='1';this.src='/windows-link-cursor.png';}" alt="">
              </span>
            </div>
          </section>

          <footer
            class="zeox-work-footer"
            data-zeox-closing
            data-zeox-endmark
            aria-label="Selected work closing sequence"
          >
            <div class="zeox-work-footer-sticky">
              <div class="zeox-contact-stage">
                <h2
                  class="zeox-scroll-type"
                  aria-label="Get in touch."
                >
                  <span class="zeox-scroll-type-line">Get in</span>
                  <span class="zeox-scroll-type-line zeox-scroll-type-line--muted">touch.</span>
                </h2>
                <a
                  class="zeox-contact-mark zeox-contact-logo-carry zeox-work-contact-link--discord"
                  data-zeox-contact-logo
                  href="${escapeHtml(discordUrl)}"
                  aria-label="Open Discord profile"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="${DISCORD_ICON_PATH}"></path>
                  </svg>
                </a>
              </div>
              <p class="zeox-contact-note">No need to scroll.</p>
            </div>
          </footer>

          <section
            class="zeox-work-logo-stage"
            data-zeox-logo-stage
            aria-label="Social links and contact"
          >
            <footer class="zeox-work-social-footer" data-zeox-social-footer>
              <div class="zeox-social-footer-main">
                <h2><span>Socials</span><span>&amp; Say hello.</span></h2>
                <div class="zeox-social-footer-columns">
                  <div>
                    <h3>Socials</h3>
                    <a class="zeox-social-link" href="${escapeHtml(data.instagramUrl || 'https://www.instagram.com/pruthvifx99?dmpr=MTh5Y3Z6aTRjdTBkb')}" target="_blank" rel="noopener noreferrer" style="display:block;color:#080808;text-decoration:none;margin-bottom:8px;font-weight:600;">Instagram ↗</a>
                    <a
                      class="zeox-social-discord zeox-work-contact-link--discord"
                      href="${escapeHtml(discordUrl)}"
                      target="_blank"
                      rel="noopener noreferrer"
                      style="display:block;color:#080808;text-decoration:none;margin-bottom:8px;font-weight:600;"
                    >Discord ↗</a>
                  </div>
                  <div>
                    <h3>Contact</h3>
                    <a href="mailto:${escapeHtml(data.email)}" style="color:#080808;text-decoration:underline;font-weight:600;">${escapeHtml(data.email)}</a>
                  </div>
                </div>
                <a
                  class="zeox-social-discord-button zeox-work-contact-link--discord"
                  href="${escapeHtml(discordUrl)}"
                  aria-label="Open Discord profile"
                >
                  <span class="zeox-social-discord-label">
                    <span>Talk on Disc</span><em aria-hidden="true">
                      <span style="--zeox-stretch-index:0">o</span>
                      <span style="--zeox-stretch-index:1">o</span>
                      <span style="--zeox-stretch-index:2">o</span>
                      <span style="--zeox-stretch-index:3">o</span>
                    </em><span>ord</span>
                  </span>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="${DISCORD_ICON_PATH}"
                    ></path>
                  </svg>
                </a>
              </div>
              <div class="zeox-social-footer-bottom">
                <span>© ${todayYear}</span>
                <span>Thumbnail Designer</span>
              </div>
            </footer>
          </section>
        </main>
      </div>
    `;
    document.body.append(page);

    return page;
  }

  const clamp01 = (value) => Math.min(1, Math.max(0, value));
  const smoothStep = (value) =>
    value * value * (3 - 2 * value);
  const expoOut = (value) =>
    value >= 1 ? 1 : 1 - 2 ** (-10 * value);
  const backInOut = (value) => {
    const amount = 1.70158 * 1.525;
    if (value < 0.5) {
      const doubled = value * 2;
      return (
        (doubled * doubled * ((amount + 1) * doubled - amount)) /
        2
      );
    }
    const doubled = value * 2 - 2;
    return (
      (doubled * doubled * ((amount + 1) * doubled + amount) + 2) /
      2
    );
  };

  function prepareScrollLetters(page) {
    scrollLetterGroups = [];
    page.querySelectorAll("[data-zeox-scroll-letters]").forEach((element) => {
      const characters = [];
      element.querySelectorAll(".zeox-scroll-type-line").forEach((line) => {
        const text = line.textContent || "";
        line.textContent = "";
        line.setAttribute("aria-hidden", "true");
        Array.from(text).forEach((character, index) => {
          const span = document.createElement("span");
          span.className = "zeox-scroll-character";
          span.style.setProperty("--zeox-char-index", String(index));
          span.textContent = character === " " ? "\u00a0" : character;
          line.append(span);
          characters.push(span);
        });
      });
      scrollLetterGroups.push({ element, characters });
    });
  }

  function setupEndmarkScene() {
    endmarkObserver?.disconnect();
    const identity = workPage?.querySelector("[data-zeox-endmark-identity]");
    const canvas = identity?.querySelector("canvas");
    if (!identity || !(canvas instanceof HTMLCanvasElement)) return;

    const initialize = async () => {
      if (identity.dataset.zeoxLiangReady === "true") return;
      identity.dataset.zeoxLiangReady = "true";
      try {
        await window.NotZeoxLiang?.start?.(canvas, identity);
      } catch (error) {
        identity.dataset.zeoxLiangReady = "false";
        console.error("Unable to initialize the Work closing mark", error);
      }
    };

    endmarkObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        initialize();
        endmarkObserver?.disconnect();
      },
      {
        root: workPage,
        rootMargin: "90% 0px",
        threshold: 0.01
      }
    );
    endmarkObserver.observe(identity);
  }

  function updateScrollScenes() {
    if (!workPage) return;
    const viewportHeight = Math.max(1, workPage.clientHeight);
    const viewportWidth = Math.max(1, workPage.clientWidth);

    const collaborators = workPage.querySelector("[data-zeox-collaborators]");
    if (collaborators) {
      const collaboratorsRect = collaborators.getBoundingClientRect();
      const collaboratorsProgress = expoOut(
        clamp01(
          (viewportHeight * 0.84 - collaboratorsRect.top) /
            (viewportHeight * 0.58)
        )
      );
      collaborators.style.setProperty(
        "--zeox-collaborators-progress",
        String(collaboratorsProgress)
      );
      collaborators.classList.toggle(
        "is-visible",
        collaboratorsRect.top < viewportHeight * 0.96 &&
          collaboratorsRect.bottom > 0
      );
    }

    const statement = workPage.querySelector("[data-zeox-statement]");
    if (statement) {
      const statementRect = statement.getBoundingClientRect();
      const statementTravel = Math.max(
        1,
        statement.offsetHeight - viewportHeight
      );
      const statementProgress = clamp01(
        -statementRect.top / statementTravel
      );
      const statementReveal = expoOut(
        clamp01((statementProgress - 0.03) / 0.3)
      );
      const statementExit = smoothStep(
        clamp01((statementProgress - 0.86) / 0.13)
      );
      const statementPhase = (start, end) =>
        clamp01((statementProgress - start) / (end - start));
      const cursorEnter = expoOut(statementPhase(0.04, 0.18));
      const cursorMove = smoothStep(statementPhase(0.12, 0.62));
      const cursorPressIn = smoothStep(statementPhase(0.62, 0.72));
      const cursorPressOut = smoothStep(statementPhase(0.76, 0.88));
      const cursorPress = cursorPressIn * (1 - cursorPressOut);
      const cursorExit = smoothStep(statementPhase(0.92, 0.995));
      const cursorOpacity = cursorEnter * (1 - cursorExit);
      const targetCursorX = 0;
      const targetCursorY = workPage.clientWidth <= 640 ? 18 : 28;
      const cursorStartX = Math.min(340, viewportWidth * 0.22);
      const cursorStartY = Math.min(220, viewportHeight * 0.26);
      const cursorX =
        cursorStartX * (1 - cursorMove) +
        targetCursorX * cursorMove +
        cursorExit * 18;
      const cursorY =
        cursorStartY * (1 - cursorMove) +
        targetCursorY * cursorMove -
        cursorExit * 14;
      const cursorScale =
        0.92 + cursorEnter * 0.08 - cursorPress * 0.12;
      statement.style.setProperty(
        "--zeox-statement-reveal",
        String(statementReveal)
      );
      statement.style.setProperty(
        "--zeox-statement-exit",
        String(statementExit)
      );
      statement.style.setProperty(
        "--zeox-statement-opacity",
        String(statementReveal * (1 - statementExit))
      );
      statement.style.setProperty(
        "--zeox-fake-cursor-x",
        `${cursorX.toFixed(2)}px`
      );
      statement.style.setProperty(
        "--zeox-fake-cursor-y",
        `${cursorY.toFixed(2)}px`
      );
      statement.style.setProperty(
        "--zeox-fake-cursor-opacity",
        String(cursorOpacity)
      );
      statement.style.setProperty(
        "--zeox-fake-cursor-scale",
        String(cursorScale)
      );
      statement.style.setProperty(
        "--zeox-fake-cursor-press",
        String(cursorPress)
      );
      statement.style.setProperty(
        "--zeox-statement-click",
        String(cursorPress)
      );
      statement.style.setProperty(
        "--zeox-statement-hit",
        String(smoothStep(statementPhase(0.62, 0.78)))
      );
    }

    scrollLetterGroups.forEach(({ element, characters }) => {
      const rect = element.getBoundingClientRect();
      const closing = element.closest("[data-zeox-closing]");
      let progress;
      let closingProgress = null;
      if (closing) {
        const closingRect = closing.getBoundingClientRect();
        const closingTravel = Math.max(
          1,
          closing.offsetHeight - viewportHeight
        );
        closingProgress = clamp01(
          (viewportHeight - closingRect.top) /
            (viewportHeight + closingTravel)
        );
        progress = clamp01((closingProgress - 0.12) / 0.36);
      } else {
        progress = clamp01(
          (viewportHeight * 0.94 - rect.top) /
            (viewportHeight * 0.72 + rect.height)
        );
      }
        const count = Math.max(1, characters.length - 1);
      characters.forEach((character, index) => {
        const ratio = index / count;
        const stagger = closing ? ratio * 0.11 : ratio * 0.34;
        const localProgress = closing
          ? expoOut(
              clamp01(
                (closingProgress - (0.04 + stagger)) / 0.24
              )
            )
          : clamp01((progress - stagger) / 0.66);
        const easedProgress = backInOut(localProgress);
        const exit = closing
          ? smoothStep(clamp01((closingProgress - 0.9) / 0.09))
          : 0;
        character.style.opacity = String(
          (closing ? localProgress : 0.08 + localProgress * 0.92) *
            (1 - exit * 0.9)
        );
        character.style.transform = `translate3d(0, ${
          (1 - easedProgress) * 60
        }%, 0) scaleY(${1 + (1 - easedProgress) * 0.2})`;
      });
    });

    const closing = workPage.querySelector("[data-zeox-closing]");
    if (closing) {
      const rect = closing.getBoundingClientRect();
      const travel = Math.max(1, closing.offsetHeight - viewportHeight);
      const progress = clamp01(
        (viewportHeight - rect.top) / (viewportHeight + travel)
      );
      const phase = (start, end) =>
        clamp01((progress - start) / (end - start));
      const copy = closing.querySelector(".zeox-scroll-type");
      const logoEnter = smoothStep(phase(0.38, 0.56));
      const logoLeave = smoothStep(phase(0.72, 0.82));
      const logoReveal = logoEnter * (1 - logoLeave);
      const logoScale =
        0.34 + logoEnter * (0.76 - logoLeave * 0.24);
      const firstLineReveal = expoOut(phase(0.39, 0.54));
      const secondLineReveal = expoOut(phase(0.42, 0.57));
      const logoGap =
        smoothStep(phase(0.38, 0.58)) *
        (1 - smoothStep(phase(0.72, 0.82)));
      const copyExit = smoothStep(phase(0.86, 0.96));
      if (copy) {
        copy.style.opacity = String(1 - copyExit);
        const lines = copy.querySelectorAll(".zeox-scroll-type-line");
        const lineEntryPx = workPage.clientWidth <= 640 ? 18 : 32;
        const logoSpacePx = workPage.clientWidth <= 640 ? 116 : 190;
        lines[0]?.style.setProperty(
          "--zeox-closing-line-y",
          `${(1 - firstLineReveal) * lineEntryPx - logoGap * logoSpacePx}px`
        );
        lines[0]?.style.setProperty(
          "--zeox-closing-line-opacity",
          String(firstLineReveal)
        );
        lines[1]?.style.setProperty(
          "--zeox-closing-line-y",
          `${(1 - secondLineReveal) * lineEntryPx + logoGap * logoSpacePx}px`
        );
        lines[1]?.style.setProperty(
          "--zeox-closing-line-opacity",
          String(secondLineReveal)
        );
        lines[0]?.style.setProperty(
          "--zeox-closing-line-x",
          `${copyExit * -10}vw`
        );
        lines[1]?.style.setProperty(
          "--zeox-closing-line-x",
          `${copyExit * 10}vw`
        );
      }

      const contactReveal = Math.max(firstLineReveal, secondLineReveal);
      const noteReveal =
        expoOut(phase(0.66, 0.76)) *
        (1 - smoothStep(phase(0.84, 0.94)));
      closing.style.setProperty(
        "--zeox-contact-logo-reveal",
        String(logoReveal)
      );
      closing.style.setProperty(
        "--zeox-contact-reveal",
        String(contactReveal)
      );
      closing.style.setProperty(
        "--zeox-contact-exit",
        String(copyExit)
      );
      const contactNote = closing.querySelector(".zeox-contact-note");
      if (contactNote) {
        contactNote.style.opacity = String(noteReveal);
        contactNote.style.transform =
          `translateX(-50%) translateY(${(1 - noteReveal) * 12}px)`;
      }
      closing.classList.toggle(
        "is-contact-ready",
        logoReveal > 0.86 && copyExit < 0.15
      );
      workPage.style.setProperty(
        "--zeox-contact-logo-opacity",
        String(logoReveal)
      );
      workPage.style.setProperty(
        "--zeox-contact-logo-scale",
        String(logoScale)
      );
      workPage.style.setProperty("--zeox-contact-logo-surface", "0");
      workPage.classList.toggle(
        "is-contact-logo-ready",
        logoReveal > 0.86
      );
    }

    const logoStage = workPage.querySelector("[data-zeox-logo-stage]");
    if (logoStage) {
      const logoRect = logoStage.getBoundingClientRect();
      const logoTravel = Math.max(
        1,
        logoStage.offsetHeight - viewportHeight
      );
      const logoProgress = clamp01(
        (viewportHeight - logoRect.top) /
          (viewportHeight + logoTravel)
      );
      const socialPhase = clamp01((logoProgress - 0.01) / 0.76);
      const socialReveal = smoothStep(smoothStep(socialPhase));
      const socialLineOne = smoothStep(
        clamp01((logoProgress - 0.18) / 0.2)
      );
      const socialLineTwo = smoothStep(
        clamp01((logoProgress - 0.3) / 0.2)
      );
      const socialDetails = smoothStep(
        clamp01((logoProgress - 0.58) / 0.24)
      );
      const socialTilt = -0.35 - (1 - socialReveal);
      logoStage.style.setProperty(
        "--zeox-social-reveal",
        String(socialReveal)
      );
      logoStage.style.setProperty(
        "--zeox-social-line-one",
        String(socialLineOne)
      );
      logoStage.style.setProperty(
        "--zeox-social-line-two",
        String(socialLineTwo)
      );
      logoStage.style.setProperty(
        "--zeox-social-details-reveal",
        String(socialDetails)
      );
      logoStage.style.setProperty(
        "--zeox-social-y",
        "0%"
      );
      logoStage.style.setProperty(
        "--zeox-social-tilt",
        `${socialTilt.toFixed(3)}deg`
      );
      logoStage.style.setProperty(
        "--zeox-social-counter-tilt",
        `${(-socialTilt).toFixed(3)}deg`
      );
      logoStage.classList.toggle(
        "is-social-ready",
        socialReveal > 0.985
      );
      logoStage.classList.toggle(
        "is-social-details-ready",
        socialDetails > 0.995
      );
      if (logoProgress > 0.001) {
        workPage.style.setProperty(
          "--zeox-contact-logo-opacity",
          "0"
        );
        workPage.style.setProperty(
          "--zeox-contact-logo-scale",
          "0.84"
        );
        workPage.style.setProperty(
          "--zeox-contact-logo-surface",
          "0"
        );
        workPage.classList.remove("is-contact-logo-ready");
      }
      const socialFooter = logoStage.querySelector(
        "[data-zeox-social-footer]"
      );
      const switchRect = document
        .querySelector(".home-overlay-wrapper .switch")
        ?.getBoundingClientRect();
      const socialFooterTop =
        socialFooter?.getBoundingClientRect().top;
      const socialSurfaceActive =
        Number.isFinite(socialFooterTop) &&
        socialFooterTop <= (switchRect?.bottom ?? 96);
      workPage.classList.toggle(
        "is-social-entering",
        Number.isFinite(socialFooterTop) &&
          socialFooterTop < viewportHeight
      );
      workPage.classList.toggle(
        "is-social-surface",
        socialSurfaceActive
      );
    }
  }

  function animateCounter(element, generation = counterGeneration) {
    if (element.dataset.counted === "true") return;
    element.dataset.counted = "true";
    const target = Number(element.dataset.target || 0);
    const suffix = element.dataset.suffix || "";
    const delay = Number(element.dataset.counterDelay || 0);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.textContent = `${formatNumber(target)}${suffix}`;
      element.classList.add("is-counted");
      return;
    }

    window.setTimeout(() => {
      if (generation !== counterGeneration) return;
      element.classList.add("is-counting");
      const duration = target > 100 ? 1650 : 1100;
      const startedAt = performance.now();
      const tick = (now) => {
        if (generation !== counterGeneration) return;
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 4);
        element.textContent = `${formatNumber(
          Math.round(target * eased)
        )}${suffix}`;
        element.style.setProperty(
          "--zeox-counter-blur",
          `${Math.max(0, (1 - progress) * 7).toFixed(2)}px`
        );
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          element.classList.remove("is-counting");
          element.classList.add("is-counted");
          element.style.removeProperty("--zeox-counter-blur");
        }
      };
      requestAnimationFrame(tick);
    }, delay);
  }

  function launchCounters() {
    if (!workPage) return;
    window.clearTimeout(counterLaunchTimer);
    counterGeneration += 1;
    const generation = counterGeneration;
    const facts = workPage.querySelector(".zeox-work-facts");
    const counters = [
      ...workPage.querySelectorAll("[data-zeox-count]")
    ];
    counters.forEach((element) => {
      element.dataset.counted = "false";
      element.classList.remove("is-counting", "is-counted");
      element.style.removeProperty("--zeox-counter-blur");
      element.textContent = `0${element.dataset.suffix || ""}`;
    });
    facts?.classList.remove("in-view");
    requestAnimationFrame(() => facts?.classList.add("in-view"));
    counterLaunchTimer = window.setTimeout(() => {
      counters.forEach((element) => animateCounter(element, generation));
      counterLaunchTimer = null;
    }, 430);
  }

  function setupReveals() {
    revealObserver?.disconnect();
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        });
      },
      {
        root: workPage,
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12
      }
    );

    workPage
      .querySelectorAll(
        ".zeox-reveal, .zeox-work-card, .zeox-work-rule"
      )
      .forEach((element) => revealObserver.observe(element));
  }

  function revealVisibleWorkItems() {
    if (!workPage?.classList.contains("open")) return;
    const viewport = workPage.getBoundingClientRect();
    workPage
      .querySelectorAll(
        ".zeox-reveal:not(.in-view), .zeox-work-card:not(.in-view), .zeox-work-rule:not(.in-view)"
      )
      .forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (
          rect.bottom > viewport.top &&
          rect.top < viewport.bottom * 0.96
        ) {
          element.classList.add("in-view");
          revealObserver?.unobserve(element);
        }
      });
  }

  function setWorkHistory(open, replace = false) {
    const url = new URL(location.href);
    if (open) {
      url.pathname = "/";
      url.searchParams.set("view", WORK_VIEW);
    } else {
      url.pathname = "/";
      url.searchParams.delete("view");
      url.hash = "";
    }
    history[replace ? "replaceState" : "pushState"]({}, "", url);
  }

  function scrollWorkTo(section) {
    if (!section || !workPage) return;
    const target = workPage.querySelector(`#zeox-work-${section}`);
    if (!target) return;
    const top = target.offsetTop - 92;
    workPage.scrollTo({ top, behavior: "smooth" });
  }

  function updateWorkProgress() {
    if (!workPage || workProgressFrame) return;
    workProgressFrame = requestAnimationFrame(() => {
      workProgressFrame = null;
      const viewportHeight = Math.max(1, workPage.clientHeight);
      workPage
        .querySelectorAll(".zeox-work-card.in-view")
        .forEach((card) => {
          const rect = card.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > viewportHeight) return;
          const position =
            (rect.top + rect.height / 2 - viewportHeight / 2) /
            viewportHeight;
          const imageOffset = Math.max(
            -10,
            Math.min(10, position * -18)
          );
          card.style.setProperty(
            "--zeox-image-y",
            `${imageOffset.toFixed(2)}px`
          );
        });
      updateScrollScenes();
    });
  }

  function pauseHomeScene() {
    try {
      window.experience?.pause?.();
    } catch {
      // Keep the work view usable even if the mirrored scene API changes.
    }
  }

  function resumeHomeScene() {
    try {
      window.experience?.resume?.();
    } catch {
      // The original scene may not have completed loading yet.
    }
  }

  function lockSceneForPopup() {
    document.documentElement.classList.add("zeox-popup-open");
    if (popupInteractionState) return;

    const experience = window.experience;
    const controls = experience?.controls;
    const logics = experience?.logics;
    const world = experience?.world;
    popupInteractionState = {
      experience,
      controlsWasPaused: Boolean(controls?.isPaused),
      menuWasOpen: Boolean(logics?.menuOpened)
    };

    world?.hoveredProject?.setHovered?.(false);
    if (world) world.hoveredProject = null;
    if (experience?.canvas) experience.canvas.style.cursor = "default";
    logics?.hoverProject?.(null);
    controls?.normalizedMouse?.set?.(2, 2);
    controls?.pause?.();
    if (logics?.toggleMenu) {
      logics.toggleMenu(true);
    } else if (logics) {
      logics.menuOpened = true;
    }
  }

  function unlockSceneAfterPopup() {
    document.documentElement.classList.remove("zeox-popup-open");
    const state = popupInteractionState;
    popupInteractionState = null;
    if (!state?.experience) return;

    const { experience, controlsWasPaused, menuWasOpen } = state;
    if (experience.logics?.toggleMenu) {
      experience.logics.toggleMenu(menuWasOpen);
    } else if (experience.logics) {
      experience.logics.menuOpened = menuWasOpen;
    }
    if (!controlsWasPaused && experience.isActive) {
      experience.controls?.resume?.();
    }
  }

  function syncLegacySwitch(open) {
    const wrappers = [...document.querySelectorAll(".switch .button")];
    wrappers[0]?.classList.toggle("active", !open);
    wrappers[1]?.classList.toggle("active", open);
  }

  function announceViewChange(view) {
    window.dispatchEvent(
      new CustomEvent("notzeox:view-change", {
        detail: { view }
      })
    );
  }

  function openWorkView({ push = true, section = null } = {}) {
    if (!workPage) return;
    const wasOpen =
      workPage.classList.contains("open") &&
      !workPage.classList.contains("is-closing");
    const transitionToken = ++workTransitionToken;
    window.clearTimeout(workSettleTimer);
    window.clearTimeout(workCloseTimer);
    workSettleTimer = null;
    workCloseTimer = null;
    returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (push && new URLSearchParams(location.search).get("view") !== WORK_VIEW) {
      setWorkHistory(true);
    }
    workPage.classList.remove("zeox-work-settled", "is-closing");
    workPage.classList.add("open");
    workPage.setAttribute("aria-hidden", "false");
    workPage.removeAttribute("inert");
    document.documentElement.classList.add("zeox-work-open");
    setupReveals();
    syncLegacySwitch(true);
    pauseHomeScene();
    launchCounters();
    workSettleTimer = window.setTimeout(() => {
      workSettleTimer = null;
      if (
        transitionToken === workTransitionToken &&
        workPage?.classList.contains("open")
      ) {
        pauseHomeScene();
        workPage.classList.add("zeox-work-settled");
      }
    }, 900);
    workPage.focus({ preventScroll: true });
    playSound("longclick");
    if (!wasOpen) announceViewChange("work");

    if (section) {
      window.setTimeout(() => scrollWorkTo(section), 620);
    } else {
      workPage.scrollTo({ top: 0, behavior: "auto" });
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        revealVisibleWorkItems();
        updateWorkProgress();
      });
    });
  }

  function closeWorkView({ push = true, silent = false } = {}) {
    if (!workPage) return;
    const transitionToken = ++workTransitionToken;
    window.clearTimeout(workSettleTimer);
    window.clearTimeout(workCloseTimer);
    workSettleTimer = null;
    workCloseTimer = null;
    window.clearTimeout(counterLaunchTimer);
    counterLaunchTimer = null;
    counterGeneration += 1;
    if (push) setWorkHistory(false);
    const wasOpen = workPage.classList.contains("open");
    const wasClosing = workPage.classList.contains("is-closing");
    if (!wasOpen) {
      workPage.classList.remove(
        "zeox-work-settled",
        "is-closing",
        "is-social-surface"
      );
      workPage.setAttribute("aria-hidden", "true");
      workPage.setAttribute("inert", "");
      document.documentElement.classList.remove("zeox-work-open");
      syncLegacySwitch(false);
      resumeHomeScene();
      return;
    }

    workPage.classList.remove(
      "zeox-work-settled",
      "is-social-surface"
    );
    workPage.classList.add("is-closing");
    void workPage.offsetWidth;
    document.documentElement.classList.remove("zeox-work-open");
    syncLegacySwitch(false);
    resumeHomeScene();
    if (!wasClosing) announceViewChange("spiral");
    requestAnimationFrame(() => {
      if (transitionToken === workTransitionToken) {
        workPage?.classList.remove("open");
      }
    });
    if (!silent) playSound("close");
    const closeDuration = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
      ? 20
      : 860;
    workCloseTimer = window.setTimeout(() => {
      workCloseTimer = null;
      if (transitionToken !== workTransitionToken || !workPage) return;
      workPage.classList.remove("is-closing");
      workPage.setAttribute("aria-hidden", "true");
      workPage.setAttribute("inert", "");
      returnFocus?.focus?.();
    }, closeDuration);
  }

  function showWorkFromLocation() {
    const open =
      new URLSearchParams(location.search).get("view") === WORK_VIEW;
    if (open) {
      openWorkView({ push: false });
      return;
    }
    closeWorkView({ push: false });
  }

  function setPopupOrigin(lightbox, opener, mode, originPoint = null) {
    const stage = lightbox.querySelector(".zeox-lightbox__stage");
    if (!stage) return;
    [
      "--zeox-popup-entry-x",
      "--zeox-popup-entry-y"
    ].forEach((property) => stage.style.removeProperty(property));

    if (mode !== "compact") return;

    let sourceCenter = null;
    const visualOpener =
      opener instanceof HTMLImageElement ||
      opener?.matches?.(
        ".zeox-work-card, .thumbnail, .styleframe, .showreel-thumbnail"
      );
    if (visualOpener && !(opener instanceof HTMLCanvasElement)) {
      const source = opener.getBoundingClientRect();
      if (source.width > 0 && source.height > 0) {
        sourceCenter = {
          x: source.left + source.width / 2,
          y: source.top + source.height / 2
        };
      }
    } else if (
      Number.isFinite(originPoint?.x) &&
      Number.isFinite(originPoint?.y)
    ) {
      sourceCenter = { x: originPoint.x, y: originPoint.y };
    }
    if (!sourceCenter) return;

    const entryX = Math.max(
      -22,
      Math.min(22, (sourceCenter.x - window.innerWidth / 2) * 0.035)
    );
    const entryY = Math.max(
      -16,
      Math.min(16, (sourceCenter.y - window.innerHeight / 2) * 0.035)
    );
    stage.style.setProperty("--zeox-popup-entry-x", `${entryX.toFixed(2)}px`);
    stage.style.setProperty("--zeox-popup-entry-y", `${entryY.toFixed(2)}px`);
  }

  async function openImage(
    src,
    title,
    opener = null,
    mode = "compact",
    originPoint = null,
    itemId = null
  ) {
    const lightbox = document.querySelector(".zeox-lightbox");
    const image = lightbox?.querySelector(".zeox-lightbox__image");
    if (!lightbox || !image || !src) return;
    window.clearTimeout(lightboxCloseTimer);
    window.clearTimeout(lightboxCleanupTimer);
    lightboxCloseTimer = null;
    lightboxCleanupTimer = null;
    const requestId = ++imageRequestId;
    const resolvedSource = new URL(src, location.href).href;
    imageReturnFocus = opener instanceof HTMLElement ? opener : null;
    lightbox.scrollTop = 0;
    lightbox.scrollLeft = 0;
    lightbox.classList.toggle("zeox-lightbox--compact", mode === "compact");
    setPopupOrigin(lightbox, opener, mode, originPoint);
    lightbox.classList.remove(
      "zeox-lightbox--ready",
      "zeox-lightbox--closing"
    );
    lightbox.classList.add("zeox-lightbox--loading");
    image.classList.remove("zeox-lightbox__image--loaded");
    image.onload = null;
    image.onerror = null;
    image.decoding = "async";
    image.fetchPriority = "high";
    image.crossOrigin = "anonymous";
    image.removeAttribute("src");
    image.alt = "";
    lightbox.setAttribute("aria-hidden", "false");
    lightbox.setAttribute("aria-busy", "true");
    lightbox.classList.add("open");
    lightbox.style.cursor = "crosshair";
    if (image) image.style.cursor = "zoom-out";
    document.documentElement.classList.add("no-scroll");
    lockSceneForPopup();
    lightbox.querySelector(".zeox-lightbox__close")?.focus();
    playSound("longclick");

    const preload = new Image();
    preload.decoding = "async";
    preload.fetchPriority = "high";
    preload.crossOrigin = "anonymous";

    try {
      await new Promise((resolve, reject) => {
        preload.onload = resolve;
        preload.onerror = reject;
        preload.src = resolvedSource;
        if (preload.complete && preload.naturalWidth > 0) resolve();
      });
      try {
        await preload.decode();
      } catch {
        // A completed image can still be displayed when decode() is unavailable.
      }

      if (
        requestId !== imageRequestId ||
        !lightbox.classList.contains("open")
      ) {
        return;
      }

      image.src = resolvedSource;
      image.alt = "Selected thumbnail";
      try {
        await image.decode();
      } catch {
        if (!(image.complete && image.naturalWidth > 0)) throw new Error();
      }

      if (
        requestId !== imageRequestId ||
        !lightbox.classList.contains("open")
      ) {
        return;
      }

      image.classList.add("zeox-lightbox__image--loaded");
      lightbox.classList.remove("zeox-lightbox--loading");
      lightbox.setAttribute("aria-busy", "false");
      if (
        itemId &&
        portfolio?.thumbnails?.some((item) => item.id === itemId)
      ) {
        window.dispatchEvent(
          new CustomEvent("notzeox:image-open", {
            detail: { itemId }
          })
        );
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (
            requestId !== imageRequestId ||
            !lightbox.classList.contains("open")
          ) {
            return;
          }
          lightbox.classList.add("zeox-lightbox--ready");
        });
      });
    } catch {
      if (requestId !== imageRequestId) return;
      image.classList.remove("zeox-lightbox__image--loaded");
      image.removeAttribute("src");
      lightbox.setAttribute("aria-busy", "false");
      window.showToast?.("Image could not be loaded");
      window.setTimeout(() => {
        if (requestId === imageRequestId) closeImage();
      }, 80);
    }
  }

  function closeImage() {
    const lightbox = document.querySelector(".zeox-lightbox");
    const image = lightbox?.querySelector(".zeox-lightbox__image");
    if (!lightbox?.classList.contains("open")) return;
    if (lightbox.classList.contains("zeox-lightbox--closing")) return;
    window.clearTimeout(lightboxCloseTimer);
    window.clearTimeout(lightboxCleanupTimer);
    const closeRequestId = ++imageRequestId;
    lightbox.classList.add("zeox-lightbox--closing");
    lightbox.classList.remove("zeox-lightbox--ready");
    lightbox.setAttribute("aria-busy", "false");
    lightboxCloseTimer = window.setTimeout(() => {
      if (imageRequestId !== closeRequestId) return;
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
      document.documentElement.classList.remove("no-scroll");
      lightboxCloseTimer = null;
    }, 260);
    lightboxCleanupTimer = window.setTimeout(() => {
      if (imageRequestId !== closeRequestId) return;
      lightbox.classList.remove(
        "zeox-lightbox--compact",
        "zeox-lightbox--loading",
        "zeox-lightbox--closing"
      );
      if (image) {
        image.onload = null;
        image.onerror = null;
        image.classList.remove("zeox-lightbox__image--loaded");
        image.removeAttribute("src");
        image.alt = "";
      }
      imageReturnFocus?.focus?.({ preventScroll: true });
      imageReturnFocus = null;
      unlockSceneAfterPopup();
      lightboxCleanupTimer = null;
    }, 340);
  }

  function sanityReferenceToSource(reference) {
    if (!reference) return null;
    const match = String(reference).match(
      /^image-([a-f0-9]+)-(\d+x\d+)-([a-z0-9]+)$/i
    );
    if (!match) return null;
    return `${PROJECT_IMAGE_ROOT}${match[1]}-${match[2]}.${match[3]}`;
  }

  function findPortfolioItem(title) {
    if (!portfolio || !title) return null;
    const normalized = title.toLowerCase().replaceAll(/\s+/g, " ").trim();
    return portfolio.thumbnails.find(
      (item) =>
        String(item.title || "")
          .toLowerCase()
          .replaceAll(/\s+/g, " ")
          .trim() === normalized
    );
  }

  function findPortfolioItemBySource(source) {
    if (!portfolio || !source) return null;
    let resolvedSource;
    try {
      resolvedSource = new URL(source, location.href).href;
    } catch {
      return null;
    }
    return (
      portfolio.thumbnails.find((item) => {
        try {
          return new URL(item.src, location.href).href === resolvedSource;
        } catch {
          return false;
        }
      }) || null
    );
  }

  function findPortfolioItemForProject(project, derivedSource = null) {
    if (!portfolio || !project) return null;
    const projectId = String(project.id || "").trim();
    if (projectId) {
      const byId = portfolio.thumbnails.find((item) => item.id === projectId);
      if (byId) return byId;
    }
    return (
      findPortfolioItemBySource(project.src) ||
      findPortfolioItemBySource(derivedSource) ||
      findPortfolioItem(project.title) ||
      null
    );
  }

  function transformSpiralPoint(elements, x, y, z, w = 1) {
    if (!elements || elements.length < 16) return null;
    return {
      x: elements[0] * x + elements[4] * y + elements[8] * z + elements[12] * w,
      y: elements[1] * x + elements[5] * y + elements[9] * z + elements[13] * w,
      z: elements[2] * x + elements[6] * y + elements[10] * z + elements[14] * w,
      w: elements[3] * x + elements[7] * y + elements[11] * z + elements[15] * w,
    };
  }

  function spiralAttributeComponent(attribute, index, component) {
    const getter = attribute?.[`get${component.toUpperCase()}`];
    if (typeof getter === "function") return getter.call(attribute, index);
    const componentIndex = { x: 0, y: 1, z: 2 }[component];
    const itemSize = Number(attribute?.itemSize || 0);
    if (componentIndex === undefined || !attribute?.array || itemSize <= componentIndex) {
      return 0;
    }
    return Number(attribute.array[index * itemSize + componentIndex] || 0);
  }

  function projectSpiralVertex(plane, camera, vertexIndex) {
    const position = plane?.geometry?.attributes?.position;
    const uv = plane?.geometry?.attributes?.uv;
    const model = plane?.matrixWorld?.elements;
    const view = camera?.matrixWorldInverse?.elements;
    const projection = camera?.projectionMatrix?.elements;
    if (!position || !uv || !model || !view || !projection) return null;

    const x = spiralAttributeComponent(position, vertexIndex, "x");
    const y = spiralAttributeComponent(position, vertexIndex, "y");
    const z = spiralAttributeComponent(position, vertexIndex, "z");
    const u = spiralAttributeComponent(uv, vertexIndex, "x");
    const v = spiralAttributeComponent(uv, vertexIndex, "y");
    const originalWorld = transformSpiralPoint(model, x, y, z);
    const curvedZ = Math.sin(u * Math.PI) * 0.2;
    const modelPosition = transformSpiralPoint(model, x, y, curvedZ);
    if (!originalWorld || !modelPosition) return null;
    const viewPosition = transformSpiralPoint(
      view,
      modelPosition.x,
      modelPosition.y,
      modelPosition.z,
      modelPosition.w
    );
    if (!viewPosition) return null;
    const scrollSpeed = Number(
      plane?.material?.uniforms?.uScrollSpeed?.value || 0
    );
    viewPosition.x += originalWorld.y ** 2 * 0.1;
    viewPosition.x += Math.sin(v * Math.PI) * scrollSpeed * 2;
    const clip = transformSpiralPoint(
      projection,
      viewPosition.x,
      viewPosition.y,
      viewPosition.z,
      viewPosition.w
    );
    if (!clip || !Number.isFinite(clip.w) || clip.w <= 0.000001) return null;
    return {
      x: clip.x / clip.w,
      y: clip.y / clip.w,
      z: clip.z / clip.w,
    };
  }

  function spiralTriangleDepth(point, first, second, third) {
    if (!first || !second || !third) return null;
    const edgeOneX = second.x - first.x;
    const edgeOneY = second.y - first.y;
    const edgeTwoX = third.x - first.x;
    const edgeTwoY = third.y - first.y;
    const pointX = point.x - first.x;
    const pointY = point.y - first.y;
    const denominator = edgeOneX * edgeTwoY - edgeTwoX * edgeOneY;
    if (Math.abs(denominator) < 0.0000001) return null;
    const secondWeight = (pointX * edgeTwoY - edgeTwoX * pointY) / denominator;
    const thirdWeight = (edgeOneX * pointY - pointX * edgeOneY) / denominator;
    const firstWeight = 1 - secondWeight - thirdWeight;
    const tolerance = -0.001;
    if (
      firstWeight < tolerance ||
      secondWeight < tolerance ||
      thirdWeight < tolerance
    ) {
      return null;
    }
    return (
      firstWeight * first.z +
      secondWeight * second.z +
      thirdWeight * third.z
    );
  }

  function pickProjectedSpiralPlane(planes, camera, point) {
    let evaluated = false;
    let nearestPlane = null;
    let nearestDepth = Number.POSITIVE_INFINITY;

    camera?.updateMatrixWorld?.(true);
    for (const plane of planes) {
      if (
        !plane ||
        plane.visible === false ||
        plane.userData?.zeoxSelectionHidden ||
        Number(plane.hiddenProgress || 0) >= 0.01
      ) {
        continue;
      }
      const position = plane.geometry?.attributes?.position;
      const uv = plane.geometry?.attributes?.uv;
      const vertexCount = Number(position?.count || 0);
      if (!position || !uv || vertexCount < 3) continue;
      plane.updateWorldMatrix?.(true, false);
      if (!plane.matrixWorld?.elements || !camera?.matrixWorldInverse?.elements) {
        continue;
      }
      evaluated = true;
      const projectedVertices = new Map();
      const projectedVertex = (index) => {
        if (!projectedVertices.has(index)) {
          projectedVertices.set(index, projectSpiralVertex(plane, camera, index));
        }
        return projectedVertices.get(index);
      };
      const indexAttribute = plane.geometry?.index;
      const indexCount = Number(indexAttribute?.count || indexAttribute?.array?.length || 0);
      const triangleIndexCount = indexAttribute ? indexCount : vertexCount;
      const readIndex = (offset) => {
        if (!indexAttribute) return offset;
        if (typeof indexAttribute.getX === "function") {
          return indexAttribute.getX(offset);
        }
        return indexAttribute.array?.[offset];
      };

      for (let offset = 0; offset + 2 < triangleIndexCount; offset += 3) {
        const firstIndex = readIndex(offset);
        const secondIndex = readIndex(offset + 1);
        const thirdIndex = readIndex(offset + 2);
        if (
          !Number.isInteger(firstIndex) ||
          !Number.isInteger(secondIndex) ||
          !Number.isInteger(thirdIndex)
        ) {
          continue;
        }
        const depth = spiralTriangleDepth(
          point,
          projectedVertex(firstIndex),
          projectedVertex(secondIndex),
          projectedVertex(thirdIndex)
        );
        if (depth !== null && depth < nearestDepth) {
          nearestDepth = depth;
          nearestPlane = plane;
        }
      }
    }

    return { plane: nearestPlane, evaluated };
  }

  function getSpiralPlaneAtEvent(event) {
    const point =
      event?.changedTouches?.[0] || event?.touches?.[0] || event || null;
    if (!Number.isFinite(point?.clientX) || !Number.isFinite(point?.clientY)) {
      return null;
    }

    const experience = window.experience;
    const canvas = experience?.canvas;
    const camera = experience?.camera?.instance;
    const raycaster = experience?.raycaster;
    const normalizedMouse = experience?.controls?.normalizedMouse;
    const planes = experience?.world?.projectPlanes;
    if (
      !(canvas instanceof HTMLCanvasElement) ||
      !camera ||
      !Array.isArray(planes) ||
      planes.length === 0
    ) {
      return null;
    }

    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;

    const normalizedPoint = {
      x: ((point.clientX - bounds.left) / bounds.width) * 2 - 1,
      y: -((point.clientY - bounds.top) / bounds.height) * 2 + 1,
    };
    normalizedMouse?.set?.(normalizedPoint.x, normalizedPoint.y);
    raycaster?.setFromCamera?.(normalizedMouse || normalizedPoint, camera);

    // Three.js raycasts the undeformed PlaneGeometry, while the portfolio's
    // vertex shader curves and shifts every card. Mirror that shader on the
    // existing 8x8 mesh so the clicked pixels select the card actually shown.
    const projectedHit = pickProjectedSpiralPlane(planes, camera, normalizedPoint);
    if (projectedHit.plane || projectedHit.evaluated) return projectedHit.plane;

    if (!raycaster?.intersectObjects) return null;

    const intersections = raycaster.intersectObjects(planes, false);
    for (const intersection of intersections) {
      const plane = intersection?.object;
      if (
        !plane ||
        plane.visible === false ||
        plane.userData?.zeoxSelectionHidden ||
        Number(plane.hiddenProgress || 0) >= 0.01
      ) {
        continue;
      }
      return plane;
    }
    return null;
  }

  function getSpiralPlaneDisplaySource(plane) {
    const renderedSource = spiralTextureSource(plane);
    const assignedSource =
      typeof plane?.userData?.zeoxSource === "string"
        ? plane.userData.zeoxSource.trim()
        : "";
    return renderedSource || assignedSource || null;
  }

  function openSpiralPlane(plane, opener, originPoint = null) {
    const source = getSpiralPlaneDisplaySource(plane);
    if (!source) return false;
    const item =
      findPortfolioItemBySource(source) ||
      findPortfolioItemBySource(plane?.userData?.zeoxSource);
    openImage(
      source,
      "Selected thumbnail",
      opener,
      "compact",
      originPoint,
      item?.id || null
    );
    return true;
  }

  function openLegacyProject(project, opener, originPoint = null) {
    if (!project) return false;
    if (project.src) {
      const item = findPortfolioItemForProject(project, project.src);
      openImage(
        project.src,
        "Selected thumbnail",
        opener,
        "compact",
        originPoint,
        item?.id || null
      );
      return true;
    }

    const reference =
      project.thumbnail?.asset?._ref ||
      project.thumbnail?.asset?.ref ||
      project.asset?._ref;
    const source = sanityReferenceToSource(reference);
    const fallback = findPortfolioItem(project.title);
    const item = findPortfolioItemForProject(project, source) || fallback;
    if (!source && !fallback) return false;
    openImage(
      source || fallback.src,
      "Selected thumbnail",
      opener,
      "compact",
      originPoint,
      item?.id || null
    );
    return true;
  }

  function normalizeLabel(element) {
    return element?.textContent?.replaceAll(/\s+/g, " ").trim().toLowerCase();
  }

  function enhanceLegacyTriggers() {
    document.querySelectorAll(".switch .button").forEach((wrapper, index) => {
      const button = wrapper.querySelector("button");
      if (!button) return;
      if (index === 0) button.dataset.zeoxHomeTrigger = "true";
      // Allow switch to cleanly toggle between Nuxt spiral and Nuxt list
    });

    document.querySelectorAll(".links .link").forEach((link) => {
      const label = normalizeLabel(link);
      if (label?.includes("work")) {
        link.dataset.zeoxWorkTrigger = "true";
      }
      if (label?.includes("about")) {
        link.dataset.zeoxProfileTrigger = "true";
      }
    });

    document
      .querySelectorAll('a[href^="/projects/"]')
      .forEach((link, index) => {
        link.setAttribute("role", "button");
        link.dataset.zeoxThumbnailIndex = String(index);
        if (portfolio?.thumbnails?.[index]?.id) {
          link.dataset.zeoxThumbnailId = portfolio.thumbnails[index].id;
        } else {
          delete link.dataset.zeoxThumbnailId;
        }
        link.setAttribute("aria-label", "Open thumbnail preview");
      });
  }

  function openDiscordTarget(url) {
    window.location.assign(url);
  }

  function playDiscordWaterTransition(
    url,
    originElement,
    originX,
    originY
  ) {
    if (!url) return;
    playSound("click");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleDocumentClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const openLightbox = document.querySelector(".zeox-lightbox.open");
    if (openLightbox && (target.closest(".zeox-lightbox__close") || target.classList.contains("zeox-lightbox") || target.classList.contains("zeox-lightbox__stage"))) {
      event.preventDefault();
      closeImage();
      return;
    }

    const discordContact = target.closest(
      ".zeox-work-contact-link--discord"
    );
    if (discordContact instanceof HTMLAnchorElement) {
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      playDiscordWaterTransition(
        discordContact.href,
        discordContact,
        event.clientX,
        event.clientY
      );
      return;
    }

    if (
      target.closest("[data-zeox-home-trigger]") &&
      workPage?.classList.contains("open")
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeWorkView();
      return;
    }

    const workCard = target.closest("[data-zeox-image]");
    if (workCard) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openImage(
        workCard.dataset.zeoxImage,
        workCard.dataset.zeoxTitle,
        workCard,
        "compact",
        null,
        workCard.dataset.zeoxThumbnailId || null
      );
      return;
    }

    if (target.closest("[data-zeox-close]")) {
      event.preventDefault();
      closeWorkView();
      return;
    }

    const scrollButton = target.closest("[data-zeox-scroll]");
    if (scrollButton) {
      event.preventDefault();
      playSound("click");
      scrollWorkTo(scrollButton.dataset.zeoxScroll);
      return;
    }

    if (target.closest("[data-zeox-copy-email]")) {
      event.preventDefault();
      navigator.clipboard
        ?.writeText(portfolio.email)
        .then(() => window.showToast?.("Email copied"))
        .catch(() => window.showToast?.(portfolio.email));
      return;
    }

    if (target.closest("[data-zeox-discord]")) {
      event.preventDefault();
      window.openDiscord?.();
      return;
    }

    if (target.closest("[data-zeox-work-trigger]")) {
      event.preventDefault();
      workNavigationArmed = true;
      if (target.closest(".switch")) event.stopImmediatePropagation();
      // If navigation menu drawer is open, close it
      const closeMenuBtn = document.querySelector(".close-button, [aria-label*='Close menu'], button.closed.close-button");
      if (closeMenuBtn && !closeMenuBtn.classList.contains("closed")) {
        closeMenuBtn.click();
      }
      openWorkView();
      return;
    }

    if (target.closest("[data-zeox-profile-trigger]")) {
      event.preventDefault();
      if (target.closest(".switch")) event.stopImmediatePropagation();
      window.showToast?.("About coming soon");
      return;
    }

    const legacyLink = target.closest('a[href^="/projects/"]');
    if (legacyLink) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const itemIndex = Number(legacyLink.dataset.zeoxThumbnailIndex);
      openLegacyProject(portfolio?.thumbnails?.[itemIndex], legacyLink);
      return;
    }

    const legacyImage = target.closest(
      ".thumbnail[data-v-a2f5aa0a] img, .styleframe img, .showreel-thumbnail img"
    );
    if (legacyImage instanceof HTMLImageElement) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const source = legacyImage.currentSrc || legacyImage.src;
      const item = findPortfolioItemBySource(source);
      openImage(
        source,
        legacyImage.alt || "Selected visual",
        legacyImage,
        "compact",
        null,
        item?.id || null
      );
      return;
    }

    const canvas = target.closest("canvas.webgl");
    if (canvas) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const plane = getSpiralPlaneAtEvent(event);
      if (plane) {
        openSpiralPlane(plane, canvas, {
          x: event.clientX,
          y: event.clientY
        });
      }
      return;
    }
  }

  function handleTouchEnd(event) {
    const target = event.target;
    if (!(target instanceof HTMLCanvasElement) || !target.matches("canvas.webgl")) {
      return;
    }
    const wasMoved = spiralTouch.moved;
    spiralTouch.active = false;
    spiralTouch.moved = false;
    spiralTouch.mode = null;
    if (wasMoved) {
      const controls = window.experience?.controls;
      if (controls) controls.isDragging = true;
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();

    const touch = event.changedTouches?.[0];
    const plane = getSpiralPlaneAtEvent(event);
    if (plane) {
      openSpiralPlane(
        plane,
        target,
        touch ? { x: touch.clientX, y: touch.clientY } : null
      );
    }
  }

  function handleTouchStart(event) {
    const target = event.target;
    const touch = event.touches?.[0];
    if (
      !(target instanceof HTMLCanvasElement) ||
      !target.matches("canvas.webgl") ||
      !touch ||
      event.touches.length !== 1
    ) {
      spiralTouch.active = false;
      return;
    }
    spiralTouch.active = true;
    spiralTouch.moved = false;
    spiralTouch.mode = null;
    spiralTouch.startX = touch.clientX;
    spiralTouch.startY = touch.clientY;
    spiralTouch.lastY = touch.clientY;
  }

  function handleTouchMove(event) {
    const touch = event.touches?.[0];
    if (!spiralTouch.active || !touch) return;
    const deltaX = touch.clientX - spiralTouch.startX;
    const deltaY = touch.clientY - spiralTouch.startY;
    if (!spiralTouch.mode && Math.hypot(deltaX, deltaY) > 9) {
      spiralTouch.mode =
        Math.abs(deltaY) > Math.abs(deltaX) ? "vertical" : "horizontal";
      spiralTouch.moved = true;
    }
    if (spiralTouch.mode !== "vertical") return;

    event.preventDefault();
    const controls = window.experience?.controls;
    if (controls && !controls.isPaused) {
      const motion = spiralTouch.lastY - touch.clientY;
      controls.isDragging = true;
      controls.targetWheelDeltaY = Math.max(
        -2,
        Math.min(2, controls.targetWheelDeltaY + motion * 0.003)
      );
      controls.wheelDirection = motion >= 0 ? 1 : -1;
      controls.touchVelocityX = -motion * 0.5;
    }
    spiralTouch.lastY = touch.clientY;
  }

  function handleTouchCancel() {
    spiralTouch.active = false;
    spiralTouch.moved = false;
    spiralTouch.mode = null;
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      if (document.querySelector(".zeox-lightbox.open")) {
        event.preventDefault();
        closeImage();
        return;
      }
      if (workPage?.classList.contains("open")) {
        event.preventDefault();
        closeWorkView();
        return;
      }
    }
  }

  function setupEvents() {
    if (!globalEventsReady) {
      globalEventsReady = true;
      document.addEventListener("click", handleDocumentClick, true);
      document.addEventListener("touchstart", handleTouchStart, {
        capture: true,
        passive: true
      });
      document.addEventListener("touchmove", handleTouchMove, {
        capture: true,
        passive: false
      });
      document.addEventListener("touchend", handleTouchEnd, {
        capture: true,
        passive: false
      });
      document.addEventListener("touchcancel", handleTouchCancel, true);
      document.addEventListener("keydown", handleKeydown);
      window.addEventListener("popstate", showWorkFromLocation);
      window.addEventListener("resize", updateWorkProgress, {
        passive: true
      });
      window.addEventListener("resize", applyResponsiveSpiralFraming, {
        passive: true
      });
      window.addEventListener("orientationchange", updateWorkProgress, {
        passive: true
      });
      window.addEventListener(
        "orientationchange",
        applyResponsiveSpiralFraming,
        { passive: true }
      );
    }

    if (!triggerObserver && document.readyState === "complete") {
      triggerObserver = new MutationObserver(enhanceLegacyTriggers);
      triggerObserver.observe(document.body, { childList: true, subtree: true });
      enhanceLegacyTriggers();
    }

    if (workPage && !workEventsReady) {
      workEventsReady = true;
      workPage.addEventListener("scroll", updateWorkProgress, { passive: true });
    }
  }


  // Responsive Loader Entry System (respects mascot intro animation)
  function setupLoaderEntry() {
    const loader = document.querySelector('.loader');
    if (!loader) return;

    // If opening directly to works (?view=work or #work), skip loader immediately
    if (isWorkLocation()) {
      const enterBtn = loader.querySelector('.enter, button');
      if (enterBtn) enterBtn.click();
      loader.style.display = 'none';
      return;
    }

    function revealButtons() {
      const enter = loader.querySelector('.enter');
      const noSound = loader.querySelector('.no-sound');
      if (enter && !enter.classList.contains('show')) {
        enter.classList.add('show');
      }
      if (noSound && !noSound.classList.contains('show')) {
        noSound.classList.add('show');
      }
    }

    // Fallback: If mascot complete event hasn't triggered after 4.5s, reveal gracefully
    window.setTimeout(revealButtons, 4500);

    // Allow clicking anywhere on the screen to enter ONLY AFTER buttons are revealed
    loader.addEventListener('click', (e) => {
      const enterBtn = loader.querySelector('.enter.show, button.enter.show');
      if (enterBtn && e.target !== enterBtn && !e.target.closest('.no-sound')) {
        enterBtn.click();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupLoaderEntry);
  } else {
    setupLoaderEntry();
  }

  async function startThumbnailPortfolio() {
    if (document.documentElement.dataset.zeoxWorkReady === "true") return;
    document.documentElement.dataset.zeoxWorkReady = "true";
    setupEvents();

    createLightbox();
    createToast();
    try {
      try {
        if (CONTENT_ENDPOINT) {
          portfolio = await fetchPortfolioManifest(CONTENT_ENDPOINT, true);
        } else {
          portfolio = await fetchPortfolioManifest(LOCAL_DATA_SOURCE);
        }
      } catch {
        portfolio = DEFAULT_PORTFOLIO;
      }
      portfolioSignature = JSON.stringify(portfolio);
      scheduleSpiralManifestSync();
      workPage = createWorkPage(portfolio);
      workPage.setAttribute("inert", "");
      prepareScrollLetters(workPage);
      setupEndmarkScene();
      setupReveals();
      setupEvents();
      updateLiveDays();
      scheduleDayUpdate();
      if (isWorkLocation()) {
        openWorkView({ push: false });
      } else {
        closeWorkView({ push: false, silent: true });
      }
      startContentPolling();
      setupSwipeableShowreel();
      setupDesktopCrosshair();
      setupCardScrollProgression();
      setInterval(() => {
        setupSwipeableShowreel();
        setupCardScrollProgression();
      }, 800);
    } catch (error) {
      console.error("Unable to initialize the thumbnail portfolio", error);
      window.showToast?.("Unable to load the work archive");
    }
  }

  /* ==========================================================================
     1. Swipeable Showreel Gesture Interaction
     ========================================================================== */
  function setupSwipeableShowreel() {
    const showreel = document.querySelector(".showreel-thumbnail");
    if (!showreel || showreel.dataset.swipeReady === "true") return;
    showreel.dataset.swipeReady = "true";

    const wrapper = showreel.querySelector(".thumbnail-wrapper") || showreel;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let startTime = 0;

    wrapper.style.touchAction = "none";

    function onPointerDown(e) {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      currentX = e.clientX;
      currentY = e.clientY;
      startTime = Date.now();
      wrapper.style.transition = "none";
      try { wrapper.setPointerCapture(e.pointerId); } catch (_) {}
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      currentX = e.clientX;
      currentY = e.clientY;
      const dx = currentX - startX;
      const dy = currentY - startY;
      const dist = Math.hypot(dx, dy);
      const angle = -15 + Math.min(22, Math.max(-22, dx * 0.12));
      const scale = 1 + Math.min(0.12, dist * 0.001);
      wrapper.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${angle.toFixed(1)}deg) scale(${scale.toFixed(2)})`;
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      isDragging = false;
      try { wrapper.releasePointerCapture(e.pointerId); } catch (_) {}

      const dx = currentX - startX;
      const dy = currentY - startY;
      const dist = Math.hypot(dx, dy);
      const duration = Math.max(1, Date.now() - startTime);
      const velocity = dist / duration;

      wrapper.style.transition = "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)";

      if (dist > 30 || velocity > 0.28) {
        playSound("longclick");
        wrapper.style.transform = "translate3d(60px, -60px, 0) scale(1.35) rotate(-5deg)";
        wrapper.style.opacity = "0.9";
        setTimeout(() => {
          wrapper.style.transform = "";
          wrapper.style.opacity = "";
          const clickTarget = showreel.querySelector("img") || showreel;
          clickTarget.click();
        }, 180);
      } else {
        wrapper.style.transform = "";
      }
    }

    wrapper.addEventListener("pointerdown", onPointerDown);
    wrapper.addEventListener("pointermove", onPointerMove);
    wrapper.addEventListener("pointerup", onPointerUp);
    wrapper.addEventListener("pointercancel", onPointerUp);
  }

  /* ==========================================================================
     2. Desktop Crosshair Cursor for Thumbnail Opening
     ========================================================================== */
  function setupDesktopCrosshair() {
    const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!isDesktop) return;

    const lightbox = document.querySelector(".zeox-lightbox");
    if (lightbox) {
      lightbox.style.cursor = "crosshair";
      const stage = lightbox.querySelector(".zeox-lightbox__stage");
      if (stage) stage.style.cursor = "crosshair";
    }

    let reticle = document.querySelector(".pruthvi-desktop-crosshair");
    if (!reticle) {
      reticle = document.createElement("div");
      reticle.className = "pruthvi-desktop-crosshair";
      reticle.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ffffff" stroke-width="1.75"><circle cx="12" cy="12" r="5" stroke="rgba(192,132,252,0.9)" stroke-width="1.5"/><line x1="12" y1="2" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="22"/><line x1="2" y1="12" x2="7" y2="12"/><line x1="17" y1="12" x2="22" y2="12"/></svg>`;
      document.body.appendChild(reticle);
    }

    document.addEventListener("pointermove", (e) => {
      const activeLightbox = document.querySelector(".zeox-lightbox.open");
      const hoverThumb = e.target?.closest?.(".list-thumb, .zeox-work-card, .project[data-v-80516469]");
      if (activeLightbox || hoverThumb) {
        reticle.style.opacity = "1";
        reticle.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      } else {
        reticle.style.opacity = "0";
      }
    }, { passive: true });
  }

  /* ==========================================================================
     3. Card Scroll Progression & Thumbnail Titles
     ========================================================================== */
  const THUMBNAIL_CREATOR_MAP = [
    { title: "Thumbnail 01", creator: "INSANE RMK", tag: "Minecraft 3D Motion" },
    { title: "Thumbnail 02", creator: "Haider Playz", tag: "Survival Finale" },
    { title: "Thumbnail 03", creator: "Znsu", tag: "Flame Frag War" },
    { title: "Thumbnail 04", creator: "Gamingrill", tag: "Survival Reborn" },
    { title: "Thumbnail 05", creator: "Kabeer", tag: "100 Days Hardcore" },
    { title: "Thumbnail 06", creator: "Mr Overrated", tag: "Bedwars Nightmare" },
    { title: "Thumbnail 07", creator: "Mikey Chan", tag: "Shadow Realm" },
    { title: "Thumbnail 08", creator: "Teddy Gaming", tag: "The Ultimate Escape" },
    { title: "Thumbnail 09", creator: "Kabeer", tag: "Void Awakening" },
    { title: "Thumbnail 10", creator: "Znsu", tag: "Crimson SMP" },
    { title: "Thumbnail 11", creator: "Mikey Chan", tag: "Speedrun Record" },
    { title: "Thumbnail 12", creator: "Kabeer", tag: "Ancient City Raid" },
    { title: "Thumbnail 13", creator: "Mr Overrated", tag: "Mythic Challenge" }
  ];

  function setupCardScrollProgression() {
    const listProjects = document.querySelectorAll(".wrapper .project[data-v-80516469]");
    if (listProjects.length > 0) {
      listProjects.forEach((proj, idx) => {
        proj.classList.add("pruthvi-card-row");
        const aLink = proj.querySelector("p a");
        const meta = THUMBNAIL_CREATOR_MAP[idx % THUMBNAIL_CREATOR_MAP.length];
        if (aLink && meta && !aLink.dataset.titled) {
          aLink.dataset.titled = "true";
          aLink.innerHTML = `
            <span class="card-num-title">${meta.title}</span>
            <span class="card-creator-tag">${meta.creator}</span>
          `;
        }

        if (!proj.dataset.observed) {
          proj.dataset.observed = "true";
          const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                proj.classList.add("card-in-view");
              }
            });
          }, { threshold: 0.12 });
          observer.observe(proj);
          // Trigger immediate check in case it's already in view
          const rect = proj.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            proj.classList.add("card-in-view");
          }
        }
      });
    }

    // Ensure Discord icon in menu footer is always rendered
    const menuSocials = document.querySelectorAll(".wrapper.opened a, .container[data-v-b1c462f7] a, .menu-footer a");
    menuSocials.forEach((a) => {
      if ((a.href?.includes("discord") || a.getAttribute("aria-label")?.toLowerCase().includes("discord")) && !a.dataset.discordFixed) {
        a.dataset.discordFixed = "true";
        a.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="${DISCORD_ICON_PATH}"/></svg>`;
      }
    });

    // Ensure loader lottie has purple filter
    const loaderLottie = document.querySelector(".loader .lottie svg, .loader svg");
    if (loaderLottie && !loaderLottie.dataset.purpleFixed) {
      loaderLottie.dataset.purpleFixed = "true";
      loaderLottie.style.filter = "hue-rotate(145deg) saturate(1.9) brightness(1.1) drop-shadow(0 0 20rem rgba(168, 85, 247, 0.6))";
    }
  }

  window.NotZeoxPortfolio = {
    openImage,
    closeImage,
    openWorkView,
    closeWorkView
  };
  window.PruthviFXPortfolio = window.NotZeoxPortfolio;

  if (document.readyState === "complete") {
    window.setTimeout(startThumbnailPortfolio, 150);
  } else {
    window.addEventListener(
      "load",
      () => window.setTimeout(startThumbnailPortfolio, 150),
      { once: true }
    );
  }
  setupEvents();
})();
