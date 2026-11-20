/**
 * Hero Coded Avatar Scribbling & Kinetic Marker Sketch Engine
 * Generates living hand-drawn stop-motion ink jitter (12 fps)
 * and interactive cursor-responsive sketch accents.
 */
(function () {
  'use strict';

  function initHeroScribble() {
    const container = document.querySelector('.ll-hero-coded-avatar');
    if (!container) return;

    const noiseEl = document.getElementById('scribble-noise');
    const dispEl = document.getElementById('scribble-disp');
    const sketchGroup = document.getElementById('hero-scribble-sketches');
    const heroSection = document.querySelector('.ll-section--hero_extended');

    let isVisible = true;
    let seed = 1;
    let lastTime = 0;
    const fpsInterval = 1000 / 12; // 12 fps authentic stop-motion
    let mouseX = 0.5;
    let mouseY = 0.5;
    let targetScale = 3.2;
    let currentScale = 3.2;

    if ('IntersectionObserver' in window && heroSection) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          isVisible = entry.isIntersecting;
        });
      }, { threshold: 0.05 });
      observer.observe(heroSection);
    }

    if (heroSection) {
      heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) / rect.width;
        mouseY = (e.clientY - rect.top) / rect.height;
        targetScale = 3.0 + Math.hypot(mouseX - 0.5, mouseY - 0.5) * 2.0;
      });
      heroSection.addEventListener('mouseleave', () => {
        targetScale = 3.2;
      });
    }

    const anchorZones = [
      { x: 780, y: 320, len: 45, angle: -0.3 },
      { x: 1140, y: 310, len: 50, angle: 0.4 },
      { x: 960, y: 220, len: 40, angle: 0.1 },
      { x: 650, y: 720, len: 70, angle: 0.6 },
      { x: 1270, y: 740, len: 65, angle: -0.5 },
      { x: 710, y: 580, len: 35, angle: 0.8 },
      { x: 1210, y: 600, len: 40, angle: -0.7 },
      { x: 500, y: 920, len: 90, angle: 0.05 },
      { x: 1420, y: 930, len: 85, angle: -0.05 }
    ];

    function updateSketchLines() {
      if (!sketchGroup) return;
      let linesHtml = '';
      anchorZones.forEach(zone => {
        for (let i = 0; i < 2; i++) {
          const jitterX = (Math.random() - 0.5) * 16;
          const jitterY = (Math.random() - 0.5) * 16;
          const len = zone.len + (Math.random() - 0.5) * 14;
          const ang = zone.angle + (Math.random() - 0.5) * 0.3;
          const x1 = zone.x + jitterX;
          const y1 = zone.y + jitterY;
          const x2 = x1 + Math.cos(ang) * len;
          const y2 = y1 + Math.sin(ang) * len;
          const opacity = (0.25 + Math.random() * 0.45).toFixed(2);
          const strokeW = (1.2 + Math.random() * 1.5).toFixed(1);
          linesHtml += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#101010" stroke-width="${strokeW}" opacity="${opacity}" stroke-linecap="round"/>`;
        }
      });
      sketchGroup.innerHTML = linesHtml;
    }

    function animate(timestamp) {
      requestAnimationFrame(animate);

      if (!isVisible) return;

      const elapsed = timestamp - lastTime;
      if (elapsed > fpsInterval) {
        lastTime = timestamp - (elapsed % fpsInterval);

        seed = (seed + 19 + Math.floor(Math.random() * 7)) % 997;
        if (noiseEl) {
          noiseEl.setAttribute('seed', seed);
        }

        currentScale += (targetScale - currentScale) * 0.15;
        if (dispEl) {
          dispEl.setAttribute('scale', (currentScale + (Math.random() - 0.5) * 0.6).toFixed(2));
        }

        updateSketchLines();
      }
    }

    requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroScribble);
  } else {
    initHeroScribble();
  }
})();
