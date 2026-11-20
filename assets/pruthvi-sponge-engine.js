/**
 * Pruthvi FX — Wide Velocity Sponge Carousel Engine
 * Authentic implementation adapted from Aarav Pilania's Sponge Carousel (ISC License)
 * Engineered for Minecraft YouTube Thumbnail Showcase
 */

(function () {
  'use strict';

  class PruthviSpongeEngine {
    constructor(containerId, options = {}) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;

      this.options = Object.assign({
        onCardClick: null,
        onVelocityChange: null
      }, options);

      this.stage = this.container.querySelector('.sponge-stage');
      this.track = this.container.querySelector('.sponge-track');
      this.clipPathEl = this.container.querySelector('#spongeHandPressPath');
      this.contourTop = this.container.querySelector('#spongeContourTop');
      this.contourBot = this.container.querySelector('#spongeContourBot');
      this.gaugeFill = this.container.querySelector('#spongeGaugeFill');
      this.gaugeVal = this.container.querySelector('#spongeGaugeVal');
      this.hudIndex = this.container.querySelector('#spongeHudIndex');
      this.hudName = this.container.querySelector('#spongeHudName');
      this.arrowPrev = this.container.querySelector('#spongePrev');
      this.arrowNext = this.container.querySelector('#spongeNext');

      if (!this.track) return;

      this.projects = [];
      this.cardItems = [];
      this.scrollX = 0;
      this.targetScrollX = 0;
      this.lastScrollX = 0;
      this.smoothedVelocity = 0;
      this.currentSquish = 0;

      this.isDragging = false;
      this.dragStartX = 0;
      this.dragScrollStart = 0;
      this.lastDragX = 0;
      this.dragVelocity = 0;

      this.cardWidth = 560;
      this.cardHeight = 315;
      this.singleSetWidth = 0;
      this.REPEATS = 3;
      this.isActive = false;
      this.rafId = null;

      this.bindEvents();
    }

    loadProjects(projects) {
      this.projects = projects;
      this.track.innerHTML = '';
      this.cardItems = [];

      for (let r = 0; r < this.REPEATS; r++) {
        projects.forEach((proj, idx) => {
          const card = document.createElement('div');
          card.className = 'sponge-card';
          card.setAttribute('data-index', idx);
          card.setAttribute('data-repeat', r);

          const inner = document.createElement('div');
          inner.className = 'sponge-card-inner';

          const mediaWrap = document.createElement('div');
          mediaWrap.className = 'sponge-card-media';

          const img = document.createElement('img');
          img.src = proj.image;
          img.alt = proj.title;
          img.loading = (r === 1) ? 'eager' : 'lazy';
          mediaWrap.appendChild(img);
          inner.appendChild(mediaWrap);

          const scrim = document.createElement('div');
          scrim.className = 'sponge-card-scrim';
          inner.appendChild(scrim);

          const sheen = document.createElement('div');
          sheen.className = 'sponge-card-sheen';
          inner.appendChild(sheen);

          const content = document.createElement('div');
          content.className = 'sponge-card-content';
          content.innerHTML = `
            <div class="sponge-card-header">
              <span class="sponge-card-num">[ ${String(idx + 1).padStart(2, '0')} ]</span>
              <span class="sponge-card-tag">${proj.category}</span>
            </div>
            <div class="sponge-card-footer">
              <h3 class="sponge-card-title">${proj.title}</h3>
              <p class="sponge-card-client">${proj.client || 'Featured Creator'}</p>
            </div>
          `;
          inner.appendChild(content);

          card.appendChild(inner);

          card.addEventListener('click', (e) => {
            if (Math.abs(this.smoothedVelocity) > 40) return;
            if (this.options.onCardClick) {
              this.options.onCardClick(proj, idx);
            }
          });

          this.track.appendChild(card);
          this.cardItems.push(card);
        });
      }

      this.measureMetrics();
    }

    measureMetrics() {
      const stageWidth = this.stage ? this.stage.clientWidth : window.innerWidth;
      if (window.innerWidth < 768) {
        this.cardWidth = Math.min(stageWidth * 0.88, 420);
        this.cardHeight = (this.cardWidth * 9) / 16;
      } else {
        this.cardWidth = Math.min(580, stageWidth * 0.46);
        this.cardHeight = (this.cardWidth * 9) / 16;
      }

      this.singleSetWidth = this.projects.length * this.cardWidth;
      this.cardItems.forEach(card => {
        card.style.width = `${this.cardWidth}px`;
        card.style.height = `${this.cardHeight}px`;
      });

      // Center initial repeat set
      this.targetScrollX = this.singleSetWidth;
      this.scrollX = this.singleSetWidth;
    }

    bindEvents() {
      // Wheel horizontal
      this.container.addEventListener('wheel', (e) => {
        if (!this.isActive) return;
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        this.targetScrollX += delta * 1.1;
      }, { passive: true });

      // Pointer Drag
      const onDown = (e) => {
        this.isDragging = true;
        this.dragStartX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        this.dragScrollStart = this.targetScrollX;
        this.lastDragX = this.dragStartX;
        this.dragVelocity = 0;
        this.track.style.cursor = 'grabbing';
      };

      const onMove = (e) => {
        if (!this.isDragging) return;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        const deltaX = clientX - this.lastDragX;
        this.dragVelocity = -deltaX * 1.35;
        this.targetScrollX += this.dragVelocity;
        this.lastDragX = clientX;
      };

      const onUp = () => {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.track.style.cursor = 'grab';
      };

      this.stage.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);

      this.stage.addEventListener('touchstart', onDown, { passive: true });
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('touchend', onUp);

      if (this.arrowPrev) {
        this.arrowPrev.addEventListener('click', () => {
          this.targetScrollX -= this.cardWidth;
        });
      }

      if (this.arrowNext) {
        this.arrowNext.addEventListener('click', () => {
          this.targetScrollX += this.cardWidth;
        });
      }

      window.addEventListener('resize', () => {
        if (this.isActive) this.measureMetrics();
      });
    }

    updateOrganicSpongeContours(squishRatio) {
      if (!this.stage) return;
      const w = this.stage.clientWidth || window.innerWidth;
      const h = this.cardHeight || 315;
      const centerH = h / 2;

      // Vertical hand-press indent
      const maxSquishPx = h * 0.22;
      const currentSquishPx = squishRatio * maxSquishPx;

      const topY = currentSquishPx;
      const botY = h - currentSquishPx;

      // C1-smooth Bezier curve across stage
      const cpX1 = w * 0.35;
      const cpX2 = w * 0.65;

      const topPathD = `M 0 0 C ${cpX1} ${topY}, ${cpX2} ${topY}, ${w} 0`;
      const botPathD = `M 0 ${h} C ${cpX1} ${botY}, ${cpX2} ${botY}, ${w} ${h}`;
      const clipPathD = `M 0 0 C ${cpX1} ${topY}, ${cpX2} ${topY}, ${w} 0 L ${w} ${h} C ${cpX2} ${botY}, ${cpX1} ${botY}, 0 ${h} Z`;

      if (this.contourTop) this.contourTop.setAttribute('d', topPathD);
      if (this.contourBot) this.contourBot.setAttribute('d', botPathD);
      if (this.clipPathEl) this.clipPathEl.setAttribute('d', clipPathD);
    }

    tick() {
      if (!this.isActive) return;

      // Inertia interpolation
      const diff = this.targetScrollX - this.scrollX;
      this.scrollX += diff * 0.088;

      // Velocity calculation
      const instantVelocity = (this.scrollX - this.lastScrollX) * 60;
      this.lastScrollX = this.scrollX;
      this.smoothedVelocity += (instantVelocity - this.smoothedVelocity) * 0.12;

      // Elastic wrapping
      if (this.singleSetWidth > 0) {
        if (this.scrollX < this.singleSetWidth * 0.5) {
          this.scrollX += this.singleSetWidth;
          this.targetScrollX += this.singleSetWidth;
        } else if (this.scrollX > this.singleSetWidth * 1.8) {
          this.scrollX -= this.singleSetWidth;
          this.targetScrollX -= this.singleSetWidth;
        }
      }

      // Update Track Position
      this.track.style.transform = `translate3d(${-this.scrollX}px, 0, 0)`;

      // Dynamic sponge squish based on speed
      const speed = Math.abs(this.smoothedVelocity);
      const targetSquish = Math.min(1.0, speed / 1600);
      this.currentSquish += (targetSquish - this.currentSquish) * 0.14;

      this.updateOrganicSpongeContours(this.currentSquish);

      // HUD gauge
      if (this.gaugeFill) {
        this.gaugeFill.style.width = `${Math.min(100, (speed / 1600) * 100)}%`;
      }
      if (this.gaugeVal) {
        this.gaugeVal.textContent = `${Math.round(speed)} PX/S`;
      }

      // Find centered card for HUD
      if (this.projects.length && this.hudIndex && this.hudName) {
        const stageMid = (this.stage.clientWidth || window.innerWidth) / 2;
        const centerIndex = Math.floor(((this.scrollX + stageMid) % this.singleSetWidth) / this.cardWidth);
        const clampedIdx = Math.max(0, Math.min(this.projects.length - 1, centerIndex));
        const activeProj = this.projects[clampedIdx];
        if (activeProj) {
          this.hudIndex.textContent = `[ ${String(clampedIdx + 1).padStart(2, '0')} / ${this.projects.length} ]`;
          this.hudName.textContent = activeProj.title.toUpperCase();
        }
      }

      this.rafId = requestAnimationFrame(() => this.tick());
    }

    start() {
      if (this.isActive) return;
      this.isActive = true;
      this.measureMetrics();
      this.tick();
    }

    stop() {
      this.isActive = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
    }
  }

  window.PruthviSpongeEngine = PruthviSpongeEngine;
})();
