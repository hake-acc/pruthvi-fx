/**
 * Pruthvi FX — Core Motion & Experience Orchestrator
 * Integrates 3D WebGL Spiral, Velocity Sponge Carousel, Sound Suite, and Render Lab
 * Interaction Architecture Foundation Inspired by Aarav Pilania & Pacôme Pertant
 */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Global Engine Instances
  let soundSuite = null;
  let spiralEngine = null;
  let spongeEngine = null;
  let allThumbnails = [];

  // --- 1. Studio Cursor Dot ---
  function initCursor() {
    if (prefersReducedMotion || 'ontouchstart' in window) return;

    const dot = document.getElementById('siteCursorDot');
    if (!dot) return;

    let mouseX = -100;
    let mouseY = -100;
    let dotX = -100;
    let dotY = -100;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    const updateCursor = () => {
      dotX += (mouseX - dotX) * 0.35;
      dotY += (mouseY - dotY) * 0.35;
      dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(updateCursor);
    };
    requestAnimationFrame(updateCursor);

    document.addEventListener('mouseover', (e) => {
      const interactive = e.target.closest('a, button, .sponge-card, .gallery-item, .renderlab-tab, .filter-pill, .mode-btn, .faq-item');
      dot.classList.toggle('is-expanded', !!interactive);
    });
  }

  // --- 2. Cinematic Entrance Loader ---
  function initLoader() {
    const loader = document.getElementById('site-loader');
    const fill = document.getElementById('loaderProgressFill');
    const pct = document.getElementById('loaderPercent');
    const btnAudio = document.getElementById('loaderEnterAudio');
    const btnMuted = document.getElementById('loaderEnterMuted');

    if (!loader) return;

    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.floor(Math.random() * 8) + 4;
      if (progress >= 100) {
        progress = 100;
        clearInterval(progressInterval);
      }
      if (fill) fill.style.width = `${progress}%`;
      if (pct) pct.textContent = `${progress}%`;
    }, 45);

    const dismissLoader = (withAudio) => {
      if (withAudio && soundSuite) {
        soundSuite.enableAudio();
      }
      loader.classList.add('is-loaded');
      setTimeout(() => {
        loader.style.display = 'none';
        if (spiralEngine) spiralEngine.start();
      }, 900);
    };

    if (btnAudio) btnAudio.addEventListener('click', () => dismissLoader(true));
    if (btnMuted) btnMuted.addEventListener('click', () => dismissLoader(false));
  }

  // --- 3. Multi-Mode Showcase Switcher ---
  function initShowcaseModes() {
    const modeBtns = document.querySelectorAll('.mode-btn');
    const views = {
      spiral: document.getElementById('view-spiral'),
      sponge: document.getElementById('view-sponge'),
      grid: document.getElementById('view-grid')
    };

    const switchMode = (mode) => {
      modeBtns.forEach(btn => {
        const isActive = btn.getAttribute('data-mode') === mode;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });

      Object.keys(views).forEach(key => {
        if (!views[key]) return;
        const active = key === mode;
        views[key].classList.toggle('is-active', active);
      });

      if (soundSuite) {
        if (mode === 'spiral') soundSuite.play('spiral');
        else if (mode === 'sponge') soundSuite.play('switch');
        else soundSuite.play('list');
      }

      // Handle Engine Run States
      if (mode === 'spiral') {
        if (spongeEngine) spongeEngine.stop();
        if (spiralEngine) spiralEngine.start();
      } else if (mode === 'sponge') {
        if (spiralEngine) spiralEngine.stop();
        if (spongeEngine) spongeEngine.start();
      } else {
        if (spiralEngine) spiralEngine.stop();
        if (spongeEngine) spongeEngine.stop();
      }
    };

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        switchMode(mode);
      });
    });
  }

  // --- 4. 4K Lightbox Modal ---
  function initLightbox() {
    const lightbox = document.getElementById('portfolio-lightbox');
    if (!lightbox) return;

    const img = lightbox.querySelector('.lightbox-image');
    const title = lightbox.querySelector('.lightbox-title');
    const category = lightbox.querySelector('.lightbox-category');
    const client = lightbox.querySelector('.lightbox-client');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');

    let currentIndex = 0;

    const open = (proj, idx) => {
      if (!proj) return;
      currentIndex = idx !== undefined ? idx : 0;

      if (img) {
        img.src = proj.image;
        img.alt = proj.title;
      }
      if (title) title.textContent = proj.title;
      if (category) category.textContent = proj.category;
      if (client) client.textContent = proj.client || 'Featured Creator';

      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (soundSuite) soundSuite.play('click');
    };

    const close = () => {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (soundSuite) soundSuite.play('close');
    };

    const prev = () => {
      if (!allThumbnails.length) return;
      currentIndex = (currentIndex - 1 + allThumbnails.length) % allThumbnails.length;
      open(allThumbnails[currentIndex], currentIndex);
    };

    const next = () => {
      if (!allThumbnails.length) return;
      currentIndex = (currentIndex + 1) % allThumbnails.length;
      open(allThumbnails[currentIndex], currentIndex);
    };

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (nextBtn) nextBtn.addEventListener('click', next);

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-backdrop')) {
        close();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    });

    window.openPruthviLightbox = open;
  }

  // --- 5. Interactive Before/After Render Lab ---
  function initRenderLab() {
    const container = document.querySelector('.renderlab-container');
    if (!container) return;

    const clipElement = container.querySelector('.renderlab-clip');
    const divider = container.querySelector('.renderlab-divider');
    const rangeInput = container.querySelector('.renderlab-range');
    const beforeImg = container.querySelector('.renderlab-img-before');
    const afterImg = container.querySelector('.renderlab-img-after');
    const projectTabs = container.querySelectorAll('.renderlab-tab');
    const projectTitle = container.querySelector('.renderlab-project-title');
    const projectDesc = container.querySelector('.renderlab-project-desc');

    const projectData = {
      apocalypse: {
        title: 'Apocalypse 100 Days — Survival Hook',
        desc: 'Raw untextured 3D character pose with flat studio keylights transformed in Photoshop with apocalyptic dust storms, glowing red eyes, and high-retention cinematic rim lighting.',
        before: '/assets/before1.webp',
        after: '/assets/after1.webp'
      },
      shadow: {
        title: 'Shadow Realm Boss Fight',
        desc: 'Basic Minecraft mob rigs upgraded into an intense dimensional rift encounter with volumetric neon purple particle effects and deep black contrast.',
        before: '/assets/before2.webp',
        after: '/assets/after2.webp'
      },
      sharpness: {
        title: 'Infinite Sharpness XX God Weapon SMP',
        desc: 'Unlit Minecraft sword model enhanced with radiant enchanted glow, custom 3D character facial expression, and aggressive mobile-calibrated saturation.',
        before: '/assets/before3.webp',
        after: '/assets/after3.webp'
      },
      megabase: {
        title: 'Mega Base Build Progression',
        desc: 'Simple Minecraft terrain blocks composited into an epic scale mega-structure with cinematic sunset god rays and bold visual hierarchy.',
        before: '/assets/before4.webp',
        after: '/assets/after4.webp'
      }
    };

    const setPosition = (pos) => {
      const clamped = Math.max(0, Math.min(100, pos));
      if (clipElement) clipElement.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
      if (divider) divider.style.left = `${clamped}%`;
      if (rangeInput) rangeInput.value = clamped;
    };

    if (rangeInput) {
      rangeInput.addEventListener('input', (e) => setPosition(parseFloat(e.target.value)));
    }

    projectTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const key = tab.getAttribute('data-project');
        const data = projectData[key];
        if (!data) return;

        projectTabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');

        if (beforeImg) beforeImg.src = data.before;
        if (afterImg) afterImg.src = data.after;
        if (projectTitle) projectTitle.textContent = data.title;
        if (projectDesc) projectDesc.textContent = data.desc;

        setPosition(50);
      });
    });

    setPosition(50);
  }

  // --- 6. FAQ Accordion ---
  function initFaq() {
    const items = document.querySelectorAll('.faq-item');
    items.forEach(item => {
      const btn = item.querySelector('.faq-question-btn');
      const panel = item.querySelector('.faq-answer-panel');
      if (!btn || !panel) return;

      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');

        items.forEach(other => {
          if (other !== item) {
            other.classList.remove('is-open');
            const ob = other.querySelector('.faq-question-btn');
            const op = other.querySelector('.faq-answer-panel');
            if (ob) ob.setAttribute('aria-expanded', 'false');
            if (op) op.style.maxHeight = null;
          }
        });

        item.classList.toggle('is-open', !isOpen);
        btn.setAttribute('aria-expanded', String(!isOpen));
        panel.style.maxHeight = !isOpen ? `${panel.scrollHeight + 24}px` : null;
      });
    });
  }

  // --- 7. Copy Buttons ---
  function initCopy() {
    const copyDiscord = document.querySelectorAll('[data-copy-discord]');
    const copyEmail = document.querySelectorAll('[data-copy-email]');

    const copyText = async (text, btn) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      const label = btn.querySelector('.copy-label') || btn;
      const prevHtml = label.innerHTML;
      label.innerHTML = `✓ Copied!`;
      btn.classList.add('is-copied');
      if (soundSuite) soundSuite.play('click');

      setTimeout(() => {
        label.innerHTML = prevHtml;
        btn.classList.remove('is-copied');
      }, 2200);
    };

    copyDiscord.forEach(b => b.addEventListener('click', (e) => {
      e.preventDefault();
      copyText('pruthvifx', b);
    }));

    copyEmail.forEach(b => b.addEventListener('click', (e) => {
      e.preventDefault();
      copyText('hakebusinesswork@gmail.com', b);
    }));
  }

  // --- 8. Filter Bar ---
  function initFilterBar() {
    const pills = document.querySelectorAll('.filter-pill');
    const items = document.querySelectorAll('.gallery-item');

    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        const filter = pill.getAttribute('data-filter') || 'All';
        pills.forEach(p => p.classList.remove('is-active'));
        pill.classList.add('is-active');

        items.forEach(card => {
          const cat = card.getAttribute('data-category') || '';
          const match = filter === 'All' || cat.toLowerCase().includes(filter.toLowerCase());
          card.classList.toggle('is-hidden', !match);
        });
      });
    });

    items.forEach((card, idx) => {
      card.addEventListener('click', () => {
        if (window.openPruthviLightbox && allThumbnails[idx]) {
          window.openPruthviLightbox(allThumbnails[idx], idx);
        }
      });
    });
  }

  // --- 9. Stats Counter ---
  function initCounters() {
    const counterElements = document.querySelectorAll('[data-counter-target]');
    if (!counterElements.length) return;

    const runCounter = (el) => {
      const target = parseFloat(el.getAttribute('data-counter-target') || '0');
      const suffix = el.getAttribute('data-counter-suffix') || '';
      if (prefersReducedMotion) {
        el.textContent = `${target}${suffix}`;
        return;
      }

      const duration = 1600;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = `${Math.floor(target * eased)}${suffix}`;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = `${target}${suffix}`;
      };
      requestAnimationFrame(tick);
    };

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      counterElements.forEach(el => obs.observe(el));
    } else {
      counterElements.forEach(runCounter);
    }
  }

  // --- Initialize App ---
  async function init() {
    initCursor();
    initLoader();
    initLightbox();
    initRenderLab();
    initFaq();
    initCopy();
    initFilterBar();
    initCounters();

    // Sound Suite
    soundSuite = new PruthviSoundSuite();
    window.pruthviSound = soundSuite;

    // Fetch Thumbnail Data
    try {
      const res = await fetch('/api/thumbnails');
      if (res.ok) {
        allThumbnails = await res.json();
      }
    } catch (e) {
      console.warn('Using pre-rendered thumbnails array');
    }

    if (!allThumbnails || !allThumbnails.length) {
      const domCards = document.querySelectorAll('.gallery-item');
      allThumbnails = Array.from(domCards).map((card, idx) => ({
        id: `thumb-${idx}`,
        title: card.getAttribute('data-title'),
        category: card.getAttribute('data-category'),
        client: card.getAttribute('data-client'),
        image: card.getAttribute('data-full-src')
      }));
    }

    // Initialize 3D Spiral Engine
    if (window.PruthviSpiralEngine && document.getElementById('spiralCanvasContainer')) {
      spiralEngine = new window.PruthviSpiralEngine('spiralCanvasContainer', {
        onCardClick: (proj, idx) => {
          if (window.openPruthviLightbox) window.openPruthviLightbox(proj, idx);
        }
      });
      spiralEngine.loadProjects(allThumbnails);
    }

    // Initialize Sponge Carousel Engine
    if (window.PruthviSpongeEngine && document.getElementById('view-sponge')) {
      spongeEngine = new window.PruthviSpongeEngine('view-sponge', {
        onCardClick: (proj, idx) => {
          if (window.openPruthviLightbox) window.openPruthviLightbox(proj, idx);
        }
      });
      spongeEngine.loadProjects(allThumbnails);
    }

    initShowcaseModes();

    // Header scroll background
    const header = document.querySelector('.site-header');
    if (header) {
      window.addEventListener('scroll', () => {
        header.classList.toggle('is-scrolled', window.scrollY > 40);
      }, { passive: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
