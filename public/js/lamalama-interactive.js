/**
 * Lama Lama Recreated Interactive Animation & Transition Engine
 * 100% Client-side, High-performance, Authentic Easing & Motions
 */

(function () {
  'use strict';

  // State Management
  const state = {
    isPreloaded: false,
    menuOpen: false,
    servicesOpen: false,
    formActive: false,
    currentStep: 0,
    activeCase: 0,
    videoPlaying: true,
    videoMuted: true,
    cursorX: window.innerWidth / 2,
    cursorY: window.innerHeight / 2,
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
    clockInterval: null
  };

  /* ===================================================
     1. PRELOADER & ENTRANCE SEQUENCE
     Elements remain hidden during the authentic intro
     animation and smoothly reveal after.
     =================================================== */
  function initPreloader() {
    const loader = document.querySelector('.js-loader');

    let revealed = false;
    function triggerReveal() {
      if (revealed) return;
      revealed = true;

      if (loader && !loader.classList.contains('is-loaded')) {
        loader.classList.add('is-loaded');
        setTimeout(() => {
          if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
        }, 500);
      }

      revealEntrance();
    }

    // Observe when the authentic WebGL bundle finishes (removes .js-loader from DOM or adds class)
    if (loader) {
      const observer = new MutationObserver(() => {
        if (!document.body.contains(loader) || loader.classList.contains('is-loaded') || loader.style.display === 'none') {
          observer.disconnect();
          triggerReveal();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    }

    // Safeguard fallback: 8 seconds max
    setTimeout(() => {
      triggerReveal();
    }, 8000);
  }

  function ensurePageElementsRevealed() {
    state.isPreloaded = true;

    // Header & centered navbar menu reveal
    const header = document.querySelector('.js-header');
    const stickyMenu = document.querySelector('.js-menu');
    if (header) {
      header.classList.add('is-revealed');
      header.style.opacity = '1';
      header.style.visibility = 'visible';
    }
    if (stickyMenu) {
      stickyMenu.classList.remove('opacity-0');
      stickyMenu.classList.add('is-revealed');
      stickyMenu.style.opacity = '1';
      stickyMenu.style.visibility = 'visible';
      stickyMenu.style.pointerEvents = 'auto';
      stickyMenu.style.transform = 'translateX(-50%)';
    }

    // Sticky Lars Card
    const stickyItems = document.querySelector('.js-sticky-items');
    if (stickyItems) {
      stickyItems.classList.remove('opacity-0');
      stickyItems.classList.add('is-revealed');
      stickyItems.style.opacity = '1';
      stickyItems.style.visibility = 'visible';
      stickyItems.style.pointerEvents = 'auto';
    }

    // Sticky Bottom Bar
    const stickyBar = document.querySelector('.js-sticky-bar');
    if (stickyBar) {
      stickyBar.style.opacity = '1';
      stickyBar.style.visibility = 'visible';
      stickyBar.classList.add('is-revealed');
    }

    // Sticky hero showreel card
    const heroSticky = document.querySelector('.js-sticky-item');
    if (heroSticky) {
      heroSticky.classList.remove('opacity-0');
      heroSticky.classList.add('is-revealed');
      heroSticky.style.opacity = '1';
      heroSticky.style.visibility = 'visible';
    }

    // Reveal hero text elements with smooth upward reveal
    const textReveals = document.querySelectorAll('.ll-text-reveal');
    textReveals.forEach((el, i) => {
      el.classList.add('is-revealed');
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      el.style.transform = 'translateY(0)';
    });
  }

  function revealEntrance() {
    ensurePageElementsRevealed();
  }

  window.ensurePageElementsRevealed = ensurePageElementsRevealed;

  /* ===================================================
     2. NAVIGATION & DROPDOWN MENU
     =================================================== */
  function initNavigation() {
    const menuToggle = document.querySelector('.js-menu-toggle');
    const menu = document.querySelector('.js-menu');
    const menuItemsContainer = document.querySelector('.js-menu-items-container');
    const servicesToggle = document.querySelector('.js-services-toggle');
    const servicesDropdown = document.querySelector('.js-services-dropdown');

    if (menuToggle && menu) {
      menuToggle.addEventListener('click', (e) => {
        e.preventDefault();
        state.menuOpen = !state.menuOpen;
        if (state.menuOpen) {
          menu.classList.add('is-open');
          if (menuItemsContainer) menuItemsContainer.style.height = 'auto';
        } else {
          menu.classList.remove('is-open');
          if (menuItemsContainer) menuItemsContainer.style.height = '0px';
          if (servicesDropdown) servicesDropdown.style.height = '0px';
          state.servicesOpen = false;
        }
      });
    }

    if (servicesToggle && servicesDropdown) {
      servicesToggle.addEventListener('click', (e) => {
        e.preventDefault();
        state.servicesOpen = !state.servicesOpen;
        if (state.servicesOpen) {
          servicesDropdown.style.height = 'auto';
        } else {
          servicesDropdown.style.height = '0px';
        }
      });
    }
  }

  /* ===================================================
     3. CONTACT CARD & INTERACTIVE FORM STEPS
     =================================================== */
  function initContactForm() {
    const toggleButtons = document.querySelectorAll('.js-contact-card-toggle, .js-contact-toggle');
    const formContainer = document.querySelector('.js-form-container');
    const stepIndicators = document.querySelectorAll('.js-form-step');
    const nextButtons = document.querySelectorAll('.js-form-next');
    const prevButtons = document.querySelectorAll('.js-form-prev');
    const submitButtons = document.querySelectorAll('.js-form-submit');

    toggleButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        state.formActive = !state.formActive;
        if (formContainer) {
          formContainer.style.height = state.formActive ? 'auto' : '0px';
        }
      });
    });

    function showStep(stepIdx) {
      state.currentStep = stepIdx;
      stepIndicators.forEach((step, idx) => {
        if (idx === stepIdx) {
          step.classList.remove('hidden');
          step.style.display = 'block';
        } else {
          step.classList.add('hidden');
          step.style.display = 'none';
        }
      });
    }

    nextButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.currentStep < stepIndicators.length - 1) {
          showStep(state.currentStep + 1);
        }
      });
    });

    prevButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (state.currentStep > 0) {
          showStep(state.currentStep - 1);
        }
      });
    });

    submitButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const loader = btn.querySelector('.js-form-submit-loader');
        if (loader) loader.classList.remove('hidden');
        setTimeout(() => {
          if (loader) loader.classList.add('hidden');
          alert('Thank you! Your message has been sent to the Lama Lama team.');
          state.formActive = false;
          if (formContainer) formContainer.style.height = '0px';
          showStep(0);
        }, 1200);
      });
    });
  }

  /* ===================================================
     4. HEADER CLOCK & AMSTERDAM TIME (DISABLED / REMOVED)
     =================================================== */
  function initClock() {
    // Completely removed per user request
    if (state.clockInterval) clearInterval(state.clockInterval);
    const clockElements = document.querySelectorAll('.js-clock, [data-component="parts/clock"], .ll-block--clock, .js-sticky-bar');
    clockElements.forEach(el => el.remove());
  }



  /* ===================================================
     6. FULLSCREEN VIDEO MODAL (STICKY & CASES)
     =================================================== */
  function initVideoModal() {
    const modal = document.querySelector('.js-video-modal-container');
    const modalVideo = modal?.querySelector('video');
    const closeBtn = modal?.querySelector('.js-close-modal');
    const playBtn = modal?.querySelector('.js-play-button');
    const muteBtn = modal?.querySelector('.js-mute-button');
    const progressBtn = modal?.querySelector('.js-progress-line-button');
    const progressLine = modal?.querySelector('.js-progress-line');
    const currentTimeEl = modal?.querySelector('.js-current-time');
    const openShowreelButtons = document.querySelectorAll('.js-toggle-showreel, .js-open-showreel');

    if (!modal) return;

    function openModal(videoSrc) {
      if (modalVideo && videoSrc) {
        modalVideo.src = videoSrc;
        modalVideo.play().catch(() => { });
      }
      modal.classList.add('is-active');
      modal.style.opacity = '1';
      modal.style.pointerEvents = 'auto';
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      if (modalVideo) {
        modalVideo.pause();
        modalVideo.currentTime = 0;
      }
      modal.classList.remove('is-active');
      modal.style.opacity = '0';
      modal.style.pointerEvents = 'none';
      document.body.style.overflow = '';
    }

    openShowreelButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const src = btn.dataset.src || '/videos/showreel.mp4';
        openModal(src);
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-active')) {
        closeModal();
      }
    });

    if (playBtn && modalVideo) {
      playBtn.addEventListener('click', () => {
        if (modalVideo.paused) {
          modalVideo.play();
          playBtn.querySelector('.js-pause-label')?.classList.remove('hidden');
          playBtn.querySelector('.js-play-label')?.classList.add('hidden');
        } else {
          modalVideo.pause();
          playBtn.querySelector('.js-pause-label')?.classList.add('hidden');
          playBtn.querySelector('.js-play-label')?.classList.remove('hidden');
        }
      });
    }

    if (muteBtn && modalVideo) {
      muteBtn.addEventListener('click', () => {
        modalVideo.muted = !modalVideo.muted;
        if (modalVideo.muted) {
          muteBtn.querySelector('.js-mute-label')?.classList.remove('hidden');
          muteBtn.querySelector('.js-unmute-label')?.classList.add('hidden');
        } else {
          muteBtn.querySelector('.js-mute-label')?.classList.add('hidden');
          muteBtn.querySelector('.js-unmute-label')?.classList.remove('hidden');
        }
      });
    }

    if (modalVideo) {
      modalVideo.addEventListener('timeupdate', () => {
        if (!modalVideo.duration) return;
        const pct = modalVideo.currentTime / modalVideo.duration;
        if (progressLine) progressLine.style.transform = `scaleX(${pct})`;

        const mins = Math.floor(modalVideo.currentTime / 60);
        const secs = Math.floor(modalVideo.currentTime % 60).toString().padStart(2, '0');
        if (currentTimeEl) currentTimeEl.textContent = `${mins}:${secs}`;
      });
    }

    if (progressBtn && modalVideo) {
      progressBtn.addEventListener('click', (e) => {
        const rect = progressBtn.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        modalVideo.currentTime = pos * (modalVideo.duration || 63);
      });
    }
  }


  /* ===================================================
     8. PITCHDECK MODAL
     =================================================== */
  function initPitchdeck() {
    const openPitchdeckBtn = document.querySelector('.js-open-pitchdeck');
    const pitchdeckContainer = document.querySelector('.js-pitchdeck-container') || document.querySelector('.ll-pitchdeck');
    const closeBtn = document.querySelector('.ll-close-pitchdeck');

    if (!openPitchdeckBtn) return;

    openPitchdeckBtn.addEventListener('click', (e) => {
      e.preventDefault();
      triggerPageTransition(() => {
        alert("Lama Lama Pitchdeck: We craft brands, products, and digital experiences that hit harder.");
      });
    });

    if (closeBtn && pitchdeckContainer) {
      closeBtn.addEventListener('click', () => {
        pitchdeckContainer.classList.remove('is-active');
      });
    }
  }

  /* ===================================================
     10. ROUTE CHANGE & RESTORATION SYSTEM
     =================================================== */
  function onRouteChanged() {
    // 1. Clear stuck transition curtain & counter if any
    const curtain = document.querySelector('.js-page-transition');
    const counterContainer = document.querySelector('.js-page-transition-counter-container');
    if (curtain) {
      curtain.classList.add('hidden');
      curtain.style.display = 'none';
      curtain.classList.remove('is-active', 'is-exiting');
    }
    if (counterContainer) {
      counterContainer.classList.remove('is-active');
      counterContainer.style.opacity = '0';
    }
    document.body.style.pointerEvents = '';

    // 2. Reveal all page elements (headings, sticky cards, navbar)
    ensurePageElementsRevealed();


    // 4. Re-hook services generative canvas if on services section
    if (window.__servicesEngine && typeof window.__servicesEngine.init === 'function') {
      window.__servicesEngine.init();
    }

    // 5. Re-bind contextual cursor hover listeners for new DOM elements
    if (typeof window._bindCursorHoverListeners === 'function') {
      window._bindCursorHoverListeners();
    }

    // 6. Refresh GSAP ScrollTrigger
    const ScrollTrigger = window.ScrollTrigger || (window.$?.instances?.get('scroller')?.scrollTrigger?.constructor);
    if (ScrollTrigger) {
      ScrollTrigger.refresh();
    }
  }

  function initRouteListeners() {
    window.addEventListener('popstate', () => {
      setTimeout(onRouteChanged, 60);
    });

    function attachSwup() {
      const router = window.$?.instances?.get('router');
      if (router?.swup?.hooks) {
        router.swup.hooks.on('page:view', onRouteChanged);
        router.swup.hooks.on('content:replace', () => setTimeout(onRouteChanged, 30));
      }
    }

    if (window.$?.instances?.get('router')) {
      attachSwup();
    } else {
      let tries = 0;
      const t = setInterval(() => {
        tries++;
        if (window.$?.instances?.get('router')) {
          clearInterval(t);
          attachSwup();
        } else if (tries > 50) {
          clearInterval(t);
        }
      }, 100);
    }
  }

  function triggerPageTransition(onComplete) {
    if (onComplete) onComplete();
  }

  /* ===================================================
     INITIALIZATION ON DOM READY
     =================================================== */
  function init() {
    initPreloader();
    initNavigation();
    initContactForm();
    initClock();
    initVideoModal();
    initPitchdeck();
    initRouteListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.__lamalama = {
    reveal: ensurePageElementsRevealed,
    restore: onRouteChanged
  };

})();

