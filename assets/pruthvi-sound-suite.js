/**
 * Pruthvi FX — Spatial Sound Suite
 * Adapted from Aarav Pilania & Pacôme Pertant Audio Controller (ISC License)
 */

(function () {
  'use strict';

  class PruthviSoundSuite {
    constructor() {
      this.isEnabled = false;
      this.sounds = {};
      this.ambientAudio = null;

      this.soundUrls = {
        click: '/assets/sounds/click.ogg',
        hover: '/assets/sounds/hover.ogg',
        tick: '/assets/sounds/tick.ogg',
        switch: '/assets/sounds/switch.ogg',
        spiral: '/assets/sounds/spiral.ogg',
        close: '/assets/sounds/close.ogg'
      };

      this.init();
    }

    init() {
      // Pre-instantiate audio elements
      Object.keys(this.soundUrls).forEach(key => {
        const audio = new Audio(this.soundUrls[key]);
        audio.preload = 'auto';
        audio.volume = key === 'hover' || key === 'tick' ? 0.22 : 0.45;
        this.sounds[key] = audio;
      });

      // Ambient audio
      this.ambientAudio = new Audio('/assets/sounds/ambient.ogg');
      this.ambientAudio.loop = true;
      this.ambientAudio.volume = 0.12;

      this.bindToggleButtons();
      this.bindInteractionTriggers();
    }

    enableAudio() {
      this.isEnabled = true;
      document.body.classList.add('audio-enabled');
      this.updateToggleUI(true);

      if (this.ambientAudio) {
        this.ambientAudio.play().catch(() => {});
      }
      this.play('switch');
    }

    disableAudio() {
      this.isEnabled = false;
      document.body.classList.remove('audio-enabled');
      this.updateToggleUI(false);

      if (this.ambientAudio) {
        this.ambientAudio.pause();
      }
    }

    toggle() {
      if (this.isEnabled) {
        this.disableAudio();
      } else {
        this.enableAudio();
      }
    }

    play(name) {
      if (!this.isEnabled) return;
      const audio = this.sounds[name];
      if (audio) {
        try {
          const clone = audio.cloneNode();
          clone.volume = audio.volume;
          clone.play().catch(() => {});
        } catch (e) {}
      }
    }

    updateToggleUI(active) {
      const btns = document.querySelectorAll('.sound-toggle-btn');
      btns.forEach(btn => {
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
        const label = btn.querySelector('.sound-toggle-label');
        if (label) label.textContent = active ? 'Sound: ON' : 'Sound: OFF';
      });
    }

    bindToggleButtons() {
      const btns = document.querySelectorAll('.sound-toggle-btn');
      btns.forEach(btn => {
        btn.addEventListener('click', () => this.toggle());
      });
    }

    bindInteractionTriggers() {
      // Delegate hover ticks
      let lastHoverTime = 0;
      document.addEventListener('mouseover', (e) => {
        if (!this.isEnabled) return;
        const target = e.target.closest('a, button, .sponge-card, .filter-pill, .renderlab-tab, .faq-item');
        if (target) {
          const now = Date.now();
          if (now - lastHoverTime > 75) {
            this.play('hover');
            lastHoverTime = now;
          }
        }
      }, { passive: true });

      // Delegate clicks
      document.addEventListener('click', (e) => {
        if (!this.isEnabled) return;
        const target = e.target.closest('a, button, .filter-pill, .renderlab-tab');
        if (target && !target.classList.contains('sound-toggle-btn')) {
          this.play('click');
        }
      }, { passive: true });
    }
  }

  window.PruthviSoundSuite = PruthviSoundSuite;
})();
