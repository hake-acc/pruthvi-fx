/**
 * Pruthvi FX — Advanced Motion & Interaction Engine
 * Inspired by NotZeoX motion physics & WaterEye section architecture
 * Features:
 *  - Lenis-grade virtual smooth scroll with exponential damping
 *  - Tilted thumbnail stream IntersectionObserver lifecycle management
 *  - Cubic ease-out counter engine (18+ Masterworks, 10M+ Client Views, 100% PSD Source)
 *  - Interactive Before/After comparison slider with touch, mouse & keyboard controls
 *  - Filterable gallery across 18 high-resolution Minecraft thumbnails
 *  - Full-screen 4K Lightbox modal with keyboard navigation (Esc, Left/Right arrows)
 *  - Smooth accordion FAQ system with ARIA controls
 *  - One-click Discord copy with tactile visual feedback
 *  - Mobile drawer navigation
 *  - Full prefers-reduced-motion accessibility compliance
 */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- 1. Virtual Smooth Scroll Engine (Lenis-Inspired) ---
  class SmoothScroll {
    constructor() {
      if (prefersReducedMotion || 'ontouchstart' in window) return;

      this.targetY = window.scrollY;
      this.currentY = window.scrollY;
      this.ease = 0.088;
      this.isScrolling = false;
      this.rafId = null;

      this.onWheel = this.onWheel.bind(this);
      this.update = this.update.bind(this);

      window.addEventListener('wheel', this.onWheel, { passive: false });
    }

    onWheel(e) {
      if (e.target.closest('.lightbox-dialog, .admin-container, textarea')) return;

      e.preventDefault();
      const delta = e.deltaY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      this.targetY = Math.max(0, Math.min(maxScroll, this.targetY + delta * 1.05));

      if (!this.isScrolling) {
        this.isScrolling = true;
        this.rafId = requestAnimationFrame(this.update);
      }
    }

    update() {
      const diff = this.targetY - this.currentY;
      this.currentY += diff * this.ease;

      if (Math.abs(diff) < 0.5) {
        this.currentY = this.targetY;
        window.scrollTo(0, this.currentY);
        this.isScrolling = false;
        cancelAnimationFrame(this.rafId);
        return;
      }

      window.scrollTo(0, this.currentY);
      this.rafId = requestAnimationFrame(this.update);
    }
  }

  const scroller = new SmoothScroll();

  // --- 2. Hero Tilted Thumbnail Wall Lifecycle ---
  function initHeroWall() {
    const wall = document.querySelector('.hero-thumbnail-wall');
    if (!wall) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            wall.classList.toggle('is-paused', !entry.isIntersecting);
          });
        },
        { rootMargin: '100px' }
      );
      observer.observe(wall);
    }
  }

  // --- 3. Live Animated Stats Counters ---
  function initCounters() {
    const counterElements = document.querySelectorAll('[data-counter-target]');
    if (!counterElements.length) return;

    const runCounter = (el) => {
      const target = parseFloat(el.getAttribute('data-counter-target') || '0');
      const decimals = parseInt(el.getAttribute('data-counter-decimals') || '0', 10);
      const prefix = el.getAttribute('data-counter-prefix') || '';
      const suffix = el.getAttribute('data-counter-suffix') || '';

      if (prefersReducedMotion) {
        el.textContent = `${prefix}${target.toFixed(decimals)}${suffix}`;
        return;
      }

      const duration = 1600;
      const startTime = performance.now();

      const tick = (now) => {
        const progress = Math.min(1, (now - startTime) / duration);
        // Cubic ease-out: 1 - (1 - p)^3
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentVal = target * eased;
        el.textContent = `${prefix}${currentVal.toFixed(decimals)}${suffix}`;

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = `${prefix}${target.toFixed(decimals)}${suffix}`;
        }
      };

      requestAnimationFrame(tick);
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              runCounter(entry.target);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.25 }
      );

      counterElements.forEach((el) => observer.observe(el));
    } else {
      counterElements.forEach(runCounter);
    }
  }

  // --- 4. Interactive Before/After Render Lab Slider ---
  function initBeforeAfterSlider() {
    const container = document.querySelector('.renderlab-container');
    if (!container) return;

    const clipElement = container.querySelector('.renderlab-clip');
    const divider = container.querySelector('.renderlab-divider');
    const rangeInput = container.querySelector('.renderlab-range');
    const beforeImg = container.querySelector('.renderlab-img-before');
    const afterImg = container.querySelector('.renderlab-img-after');
    const projectTabs = document.querySelectorAll('.renderlab-tab');
    const projectTitle = container.querySelector('.renderlab-project-title');
    const projectDesc = container.querySelector('.renderlab-project-desc');

    const projectData = {
      apocalypse: {
        title: 'Apocalypse 100 Days — Survival Hook',
        desc: 'Raw untextured 3D character pose with flat studio keylights transformed in Photoshop with apocalyptic dust storms, glowing red eyes, and high-retention cinematic rim lighting.',
        before: '/assets/before1.webp',
        after: '/assets/after1.webp',
        alt: 'Apocalypse 100 Days Before and After'
      },
      shadow: {
        title: 'Shadow Realm Boss Fight',
        desc: 'Basic Minecraft mob rigs upgraded into an intense dimensional rift encounter with volumetric neon purple particle effects and deep black contrast.',
        before: '/assets/before2.webp',
        after: '/assets/after2.webp',
        alt: 'Shadow Realm Boss Fight Before and After'
      },
      sharpness: {
        title: 'Infinite Sharpness XX God Weapon SMP',
        desc: 'Unlit Minecraft sword model enhanced with radiant enchanted glow, custom 3D character facial expression, and aggressive mobile-calibrated saturation.',
        before: '/assets/before3.webp',
        after: '/assets/after3.webp',
        alt: 'Infinite Sharpness XX God Weapon Before and After'
      },
      megabase: {
        title: 'Mega Base Build Progression',
        desc: 'Simple Minecraft terrain blocks composited into an epic scale mega-structure with cinematic sunset god rays and bold visual hierarchy.',
        before: '/assets/before4.webp',
        after: '/assets/after4.webp',
        alt: 'Mega Base Build Progression Before and After'
      }
    };

    const setPosition = (pos) => {
      const clamped = Math.max(0, Math.min(100, pos));
      if (clipElement) clipElement.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
      if (divider) divider.style.left = `${clamped}%`;
      if (rangeInput) rangeInput.value = clamped;
    };

    if (rangeInput) {
      rangeInput.addEventListener('input', (e) => {
        setPosition(parseFloat(e.target.value));
      });
    }

    // Direct pointer drag over stage
    const stage = container.querySelector('.renderlab-stage');
    let isDragging = false;

    if (stage) {
      const updateFromPointer = (e) => {
        const rect = stage.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const offsetX = clientX - rect.left;
        const percent = (offsetX / rect.width) * 100;
        setPosition(percent);
      };

      stage.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateFromPointer(e);
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        updateFromPointer(e);
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
      });

      stage.addEventListener('touchstart', (e) => {
        isDragging = true;
        updateFromPointer(e);
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        updateFromPointer(e);
      }, { passive: true });

      window.addEventListener('touchend', () => {
        isDragging = false;
      });
    }

    // Tab switching between projects
    projectTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const key = tab.getAttribute('data-project');
        const data = projectData[key];
        if (!data) return;

        projectTabs.forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');

        if (beforeImg) {
          beforeImg.src = data.before;
          beforeImg.alt = `${data.title} Raw 3D Staging`;
        }
        if (afterImg) {
          afterImg.src = data.after;
          afterImg.alt = `${data.title} Final Composite`;
        }
        if (projectTitle) projectTitle.textContent = data.title;
        if (projectDesc) projectDesc.textContent = data.desc;

        setPosition(50);
      });
    });

    setPosition(50);
  }

  // --- 5. Portfolio Gallery & Lightbox Inspection Modal ---
  function initGalleryAndLightbox() {
    const filterButtons = document.querySelectorAll('.filter-pill');
    const lightbox = document.getElementById('portfolio-lightbox');
    const lightboxImg = lightbox ? lightbox.querySelector('.lightbox-image') : null;
    const lightboxTitle = lightbox ? lightbox.querySelector('.lightbox-title') : null;
    const lightboxCategory = lightbox ? lightbox.querySelector('.lightbox-category') : null;
    const lightboxClient = lightbox ? lightbox.querySelector('.lightbox-client') : null;
    const lightboxClose = lightbox ? lightbox.querySelector('.lightbox-close') : null;
    const lightboxPrev = lightbox ? lightbox.querySelector('.lightbox-prev') : null;
    const lightboxNext = lightbox ? lightbox.querySelector('.lightbox-next') : null;

    let allItems = Array.from(document.querySelectorAll('.gallery-item'));
    let visibleItems = [...allItems];
    let currentIndex = 0;

    // Filter functionality
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const category = btn.getAttribute('data-filter') || 'All';

        filterButtons.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        visibleItems = [];
        allItems.forEach((card) => {
          const cardCat = card.getAttribute('data-category') || '';
          const match = category === 'All' || cardCat.toLowerCase().includes(category.toLowerCase());

          if (match) {
            card.classList.remove('is-hidden');
            visibleItems.push(card);
          } else {
            card.classList.add('is-hidden');
          }
        });
      });
    });

    // Lightbox modal functionality
    const openLightbox = (card) => {
      if (!lightbox || !card) return;
      currentIndex = visibleItems.indexOf(card);
      if (currentIndex === -1) currentIndex = 0;

      const img = card.querySelector('img');
      const title = card.getAttribute('data-title') || (img ? img.alt : 'Pruthvi FX Thumbnail');
      const category = card.getAttribute('data-category') || 'Minecraft';
      const client = card.getAttribute('data-client') || 'Featured Creator';
      const fullSrc = card.getAttribute('data-full-src') || (img ? img.src : '');

      if (lightboxImg) {
        lightboxImg.src = fullSrc;
        lightboxImg.alt = title;
      }
      if (lightboxTitle) lightboxTitle.textContent = title;
      if (lightboxCategory) lightboxCategory.textContent = category;
      if (lightboxClient) lightboxClient.textContent = client;

      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      if (lightboxClose) lightboxClose.focus();
    };

    const closeLightbox = () => {
      if (!lightbox) return;
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lightboxImg) lightboxImg.src = '';
    };

    const showPrev = () => {
      if (!visibleItems.length) return;
      currentIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
      openLightbox(visibleItems[currentIndex]);
    };

    const showNext = () => {
      if (!visibleItems.length) return;
      currentIndex = (currentIndex + 1) % visibleItems.length;
      openLightbox(visibleItems[currentIndex]);
    };

    allItems.forEach((card) => {
      card.addEventListener('click', () => openLightbox(card));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(card);
        }
      });
    });

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', showPrev);
    if (lightboxNext) lightboxNext.addEventListener('click', showNext);

    if (lightbox) {
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.classList.contains('lightbox-backdrop')) {
          closeLightbox();
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      if (!lightbox || !lightbox.classList.contains('is-open')) return;

      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        showPrev();
      } else if (e.key === 'ArrowRight') {
        showNext();
      }
    });
  }

  // --- 6. FAQ Accordion ---
  function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    if (!faqItems.length) return;

    faqItems.forEach((item) => {
      const button = item.querySelector('.faq-question-btn');
      const content = item.querySelector('.faq-answer-panel');

      if (!button || !content) return;

      button.addEventListener('click', () => {
        const isExpanded = button.getAttribute('aria-expanded') === 'true';

        faqItems.forEach((other) => {
          if (other !== item) {
            const ob = other.querySelector('.faq-question-btn');
            const oc = other.querySelector('.faq-answer-panel');
            if (ob && oc) {
              ob.setAttribute('aria-expanded', 'false');
              other.classList.remove('is-open');
              oc.style.maxHeight = null;
            }
          }
        });

        button.setAttribute('aria-expanded', String(!isExpanded));
        item.classList.toggle('is-open', !isExpanded);

        if (!isExpanded) {
          content.style.maxHeight = `${content.scrollHeight + 24}px`;
        } else {
          content.style.maxHeight = null;
        }
      });
    });
  }

  // --- 7. Copy to Clipboard (Discord & Email) ---
  function initCopyButtons() {
    const copyDiscordBtns = document.querySelectorAll('[data-copy-discord]');
    const copyEmailBtns = document.querySelectorAll('[data-copy-email]');

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

      const labelEl = btn.querySelector('.copy-label') || btn;
      const originalHtml = labelEl.innerHTML;
      labelEl.innerHTML = `<span class="copy-success"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!</span>`;
      btn.classList.add('is-copied');

      setTimeout(() => {
        labelEl.innerHTML = originalHtml;
        btn.classList.remove('is-copied');
      }, 2200);
    };

    copyDiscordBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        copyText('pruthvifx', btn);
      });
    });

    copyEmailBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        copyText('hakebusinesswork@gmail.com', btn);
      });
    });
  }

  // --- 8. Mobile Navigation Drawer ---
  function initMobileNav() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const drawer = document.querySelector('.mobile-drawer');
    const links = document.querySelectorAll('.mobile-drawer-nav a');

    if (!toggle || !drawer) return;

    const toggleMenu = (open) => {
      const isOpen = open !== undefined ? open : !drawer.classList.contains('is-open');
      drawer.classList.toggle('is-open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.classList.toggle('is-active', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    toggle.addEventListener('click', () => toggleMenu());

    links.forEach((link) => {
      link.addEventListener('click', () => toggleMenu(false));
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        toggleMenu(false);
      }
    });
  }

  // --- 9. Navigation Active State Spy ---
  function initScrollSpy() {
    const navLinks = document.querySelectorAll('.desktop-nav a[href^="#"]');
    const sections = Array.from(navLinks)
      .map((link) => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    if (!sections.length) return;

    const onScroll = () => {
      const scrollPos = window.scrollY + 180;
      let currentSection = sections[0];

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        if (sec.offsetTop <= scrollPos) {
          currentSection = sec;
        }
      }

      navLinks.forEach((link) => {
        const id = link.getAttribute('href');
        const isActive = currentSection && id === `#${currentSection.id}`;
        link.classList.toggle('is-active', isActive);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // --- DOM Ready Initialization ---
  function init() {
    initHeroWall();
    initCounters();
    initBeforeAfterSlider();
    initGalleryAndLightbox();
    initFaqAccordion();
    initCopyButtons();
    initMobileNav();
    initScrollSpy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
