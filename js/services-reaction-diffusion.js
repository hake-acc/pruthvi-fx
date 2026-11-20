/**
 * Services Section ("What We Do"):
 * Authentic Lama Lama Variable Wave-Motion Particle Matrix & Dither Transitions
 * 
 * 1. Continuous Organic Boundary Waves: Multi-harmonic sinusoidal wave envelopes at BOTH
 *    the start (Projects transition) and end (Happy Clients transition) with stochastic dither dissolve.
 *    ZERO straight lines.
 * 2. Variable Wave Displacement: Harmonic travelling wave oscillation on particle coordinates.
 * 3. Topographic Elevation Waves: Dynamic peaks of radiant ivory dots and valleys of subtle micro-dots.
 * 4. Boundary Bleed: Canvas extends seamlessly into the top and bottom transition margins,
 *    flowing right down into the zone immediately above [ HAPPY CLIENTS ] (1:1 with goal state Image 2).
 * 5. Interactive Cursor Magnetic Wave: Fluid cursor luminescence & repulsion ripple.
 * 6. Smooth Silhouette Video Blending: Bilinear sampled video silhouette without vertical banding.
 */
(function () {
    'use strict';

    function pseudoNoise(x, y) {
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return n - Math.floor(n);
    }

    function initServicesEngine() {
        const section = document.querySelector('.ll-section--services');
        if (!section) return;

        let canvas = document.getElementById('servicesDiffusionCanvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'servicesDiffusionCanvas';
            canvas.className = 'services-diffusion-canvas';
            section.style.position = 'relative';
            section.insertBefore(canvas, section.firstChild);
        }

        if (canvas._servicesWaveEngineActive) return;
        canvas._servicesWaveEngineActive = true;

        const ctx = canvas.getContext('2d', { alpha: true });
        let width = 0, height = 0, dpr = 1;
        let gridCells = [];

        // Offscreen sampling canvas for authentic video
        const sampleW = 120;
        const sampleH = 160;
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = sampleW;
        sampleCanvas.height = sampleH;
        const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

        // Offscreen video element for luminance sampling
        let videoEl = document.getElementById('servicesVideo');
        if (!videoEl) {
            videoEl = document.createElement('video');
            videoEl.id = 'servicesVideo';
            videoEl.preload = 'auto';
            videoEl.autoplay = true;
            videoEl.loop = true;
            videoEl.muted = true;
            videoEl.playsInline = true;
            videoEl.setAttribute('playsinline', '');
            videoEl.setAttribute('webkit-playsinline', '');
            videoEl.setAttribute('muted', '');
            videoEl.style.cssText = 'opacity: 0; pointer-events: none; position: fixed; top: -9999px; left: -9999px; width: 1px; height: 1px; z-index: -999;';
            videoEl.src = '/videos/services-bg.mp4';
            document.body.appendChild(videoEl);
        }
        if (!videoEl.src || !videoEl.src.includes('services-bg.mp4')) {
            videoEl.src = '/videos/services-bg.mp4';
        }
        videoEl.muted = true;
        videoEl.play().catch(() => {
            const resumeOnAction = () => {
                videoEl.play().catch(() => {});
                window.removeEventListener('scroll', resumeOnAction);
                window.removeEventListener('click', resumeOnAction);
                window.removeEventListener('touchstart', resumeOnAction);
            };
            window.addEventListener('scroll', resumeOnAction, { passive: true });
            window.addEventListener('click', resumeOnAction, { once: true });
            window.addEventListener('touchstart', resumeOnAction, { once: true });
        });

        function resize() {
            const rect = section.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);

            // Measure offset to [ HAPPY CLIENTS ]
            const happyClientsEl = document.querySelector('.ll-section--logos .js-text-container') ||
                                   document.querySelector('.ll-section--logos');
            let bottomExtendCss = 45; // Default CSS bleed into logos zone
            if (happyClientsEl) {
                const happyRect = happyClientsEl.getBoundingClientRect();
                const distToHappy = happyRect.top - rect.bottom;
                if (distToHappy > 0 && distToHappy < 300) {
                    bottomExtendCss = distToHappy;
                }
            }

            const topExtendCss = 60;
            const totalCssH = rect.height + topExtendCss + bottomExtendCss;

            canvas.style.position = 'absolute';
            canvas.style.top = '-' + topExtendCss + 'px';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = totalCssH + 'px';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '1';
            canvas.style.display = 'block';

            width = canvas.width = Math.round(rect.width * dpr);
            height = canvas.height = Math.round(totalCssH * dpr);

            if (width <= 0 || height <= 0) return;

            // Authentic Lama Lama dot matrix density (step ~8.5px CSS)
            gridCells = [];
            const step = Math.round(8.5 * dpr);
            const cols = Math.ceil(width / step);
            const rows = Math.ceil(height / step);

            for (let r = 0; r < rows; r++) {
                const py = r * step;
                for (let c = 0; c < cols; c++) {
                    const px = c * step;
                    gridCells.push({
                        c: c,
                        r: r,
                        baseX: px,
                        baseY: py,
                        dither: pseudoNoise(c * 23.17, r * 47.83),
                        blockNoise: pseudoNoise(Math.floor(c / 2) * 11.3, Math.floor(r / 2) * 17.7),
                        largeBlockNoise: pseudoNoise(Math.floor(c / 4) * 5.7, Math.floor(r / 4) * 9.1),
                        phaseOffset: pseudoNoise(c * 17.3, r * 31.1) * Math.PI * 2
                    });
                }
            }
        }

        resize();
        window.addEventListener('resize', resize, { passive: true });

        // Mouse interaction tracking
        let mouseX = -9999, mouseY = -9999;
        let targetMouseX = -9999, targetMouseY = -9999;
        let isHovering = false;

        window.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                isHovering = true;
                targetMouseX = (e.clientX - rect.left) * dpr;
                targetMouseY = (e.clientY - rect.top) * dpr;
            } else {
                isHovering = false;
                targetMouseX = -9999;
                targetMouseY = -9999;
            }
        }, { passive: true });

        let time = 0;

        function getDissolveProgress() {
            const rect = section.getBoundingClientRect();
            const winH = window.innerHeight;

            // Outside viewport completely
            if (rect.bottom <= -140 || rect.top >= winH + 140) {
                return 0;
            }

            // Top dissolve entry
            const topZone = winH * 0.45;
            const topProgress = Math.max(0, Math.min(1, (winH - rect.top) / topZone));

            // Bottom dissolve: stay active right down into [ HAPPY CLIENTS ]
            const bottomZone = winH * 0.20;
            const bottomProgress = rect.bottom > -100 ? Math.max(0, Math.min(1, (rect.bottom + 100) / bottomZone)) : 0;

            return Math.max(0.12, Math.min(1, topProgress * (bottomProgress * 0.85 + 0.15)));
        }

        function draw() {
            requestAnimationFrame(draw);

            const dissolve = getDissolveProgress();
            if (dissolve <= 0.01) return;

            time += 0.024; // Smooth organic wave frequency speed

            // Cursor smoothing
            if (isHovering && targetMouseX > 0) {
                mouseX += (targetMouseX - mouseX) * 0.18;
                mouseY += (targetMouseY - mouseY) * 0.18;
            } else {
                mouseX += (-9999 - mouseX) * 0.1;
                mouseY += (-9999 - mouseY) * 0.1;
            }

            // Sample video frame
            let hasVideo = false;
            let sampleData = null;
            if (videoEl && videoEl.readyState >= 2 && !videoEl.paused) {
                sampleCtx.drawImage(videoEl, 0, 0, sampleW, sampleH);
                sampleData = sampleCtx.getImageData(0, 0, sampleW, sampleH).data;
                hasVideo = true;
            }

            // Video positioning on the right side
            const isDesktop = width >= 768 * dpr;
            const vidH = isDesktop ? height * 0.85 : height * 0.6;
            const vidW = vidH * (1440 / 1920);
            const vidX = isDesktop ? (width - vidW - width * 0.04) : (width - vidW) * 0.5;
            const vidY = isDesktop ? (height - vidH) * 0.48 : (height - vidH) * 0.65;

            ctx.clearRect(0, 0, width, height);
            ctx.save();

            const baseSize = 2.05 * dpr;
            const cursorRadius = 130 * dpr;
            const numCells = gridCells.length;
            const transitionDepth = 22 * dpr;

            for (let i = 0; i < numCells; i++) {
                const cell = gridCells[i];
                const bx = cell.baseX;
                const by = cell.baseY;

                // =========================================================
                // 1. ORGANIC WAVE BOUNDARIES (START & END ENVELOPES)
                // Flowing multi-harmonic sinusoidal wave envelopes (Image 2)
                // =========================================================

                // Bottom Wave Boundary (reaching down right above [ HAPPY CLIENTS ])
                const waveB1 = Math.sin(bx * 0.0032 + time * 0.38) * (9 * dpr);
                const waveB2 = Math.cos(bx * 0.0075 - time * 0.28) * (5 * dpr);
                const waveB3 = Math.sin(bx * 0.0145 + time * 0.55) * (2.5 * dpr);
                const bottomWaveY = height - (20 * dpr) + (waveB1 + waveB2 + waveB3);

                // Top Wave Boundary (below Projects)
                const waveT1 = Math.sin(bx * 0.0032 - time * 0.35) * (9 * dpr);
                const waveT2 = Math.cos(bx * 0.0075 + time * 0.30) * (5 * dpr);
                const waveT3 = Math.sin(bx * 0.0145 - time * 0.48) * (2.5 * dpr);
                const topWaveY = (24 * dpr) + (waveT1 + waveT2 + waveT3);

                // Check boundary culling: particles outside wave envelopes do not render
                if (by > bottomWaveY || by < topWaveY) {
                    continue;
                }

                // Compute smooth distance-to-edge factors
                const distFromBottom = bottomWaveY - by;
                const distFromTop = by - topWaveY;

                let edgeFactor = 1.0;
                if (distFromBottom < transitionDepth) {
                    edgeFactor = Math.min(edgeFactor, distFromBottom / transitionDepth);
                }
                if (distFromTop < transitionDepth) {
                    edgeFactor = Math.min(edgeFactor, distFromTop / transitionDepth);
                }

                // Organic stochastic dither dissolve at the wave contours
                const cellProgress = dissolve * edgeFactor;
                if (cellProgress < 0.94) {
                    const threshold = (cell.dither * 0.55 + cell.blockNoise * 0.3 + cell.largeBlockNoise * 0.15);
                    if (threshold > cellProgress * 1.28) continue;
                }

                // =========================================================
                // 2. VARIABLE WAVE MOTION (HARMONIC PARTICLE DISPLACEMENT)
                // Particles gently undulate and breathe with living harmonic motion
                // =========================================================
                const phaseX = bx * 0.0030 + by * 0.0018 + time * 0.60 + cell.phaseOffset * 0.25;
                const phaseY = bx * 0.0022 - by * 0.0032 + time * 0.52 + cell.phaseOffset * 0.25;
                const dispX = Math.sin(phaseX) * (2.6 * dpr) + Math.cos(phaseY * 1.4) * (1.4 * dpr);
                const dispY = Math.cos(phaseY) * (2.8 * dpr) + Math.sin(phaseX * 1.3) * (1.6 * dpr);

                let px = bx + dispX;
                let py = by + dispY;

                // =========================================================
                // 3. TOPOGRAPHIC ELEVATION WAVES (LUMINANCE & DENSITY)
                // Rolling wave ridges matching Image 2 reference
                // =========================================================
                const nx = bx * 0.0025;
                const ny = by * 0.0022;
                const hill1 = Math.sin(nx * 1.7 + time * 0.28) * Math.cos(ny * 1.3 - time * 0.20);
                const hill2 = Math.sin(nx * 3.3 - ny * 1.7 + time * 0.38) * 0.48;
                const hill3 = Math.cos(nx * 5.0 + ny * 2.9 - time * 0.15) * 0.24;
                const topoElevation = (hill1 + hill2 + hill3 + 1.72) / 3.44; // 0 .. 1

                // =========================================================
                // 4. VIDEO LUMINANCE SAMPLE (SMOOTH SILHOUETTE)
                // =========================================================
                let vidLum = 0;
                if (hasVideo && px >= vidX && px <= vidX + vidW && py >= vidY && py <= vidY + vidH) {
                    const sx = Math.min(sampleW - 1, Math.max(0, Math.floor(((px - vidX) / vidW) * sampleW)));
                    const sy = Math.min(sampleH - 1, Math.max(0, Math.floor(((py - vidY) / vidH) * sampleH)));
                    const idx = (sy * sampleW + sx) * 4;
                    const r = sampleData[idx];
                    const g = sampleData[idx + 1];
                    const b = sampleData[idx + 2];
                    const rawLum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                    // Smooth soft falloff near video edges to avoid vertical stripes
                    const edgeDistX = Math.min(px - vidX, (vidX + vidW) - px) / (vidW * 0.15);
                    const edgeDistY = Math.min(py - vidY, (vidY + vidH) - py) / (vidH * 0.15);
                    const edgeMask = Math.max(0, Math.min(1, Math.min(edgeDistX, edgeDistY)));
                    vidLum = rawLum * edgeMask;
                }

                // =========================================================
                // 5. INTERACTIVE CURSOR REPULSION & LUMINESCENT AURA
                // =========================================================
                let cursorGlow = 0;
                if (mouseX > -1000) {
                    const dx = px - mouseX;
                    const dy = py - mouseY;
                    const dist = Math.hypot(dx, dy);
                    if (dist < cursorRadius && dist > 0.01) {
                        const factor = 1 - dist / cursorRadius;
                        const force = factor * factor * (16 * dpr);
                        px += (dx / dist) * force;
                        py += (dy / dist) * force;
                        cursorGlow = factor * 0.72;
                    }
                }

                // Calculate final opacity & scale
                const topoRidge = Math.pow(topoElevation, 1.85);
                const ambientWave = 0.5 + 0.5 * Math.sin(time * 1.1 + bx * 0.005 + by * 0.007);

                let alpha = (0.13 + 0.35 * topoRidge + 0.07 * ambientWave) * cellProgress + cursorGlow;
                let scale = 0.82 + 1.18 * topoRidge;

                if (vidLum > 0.08) {
                    const vidBoost = Math.pow(vidLum, 1.25);
                    alpha = Math.min(1.0, alpha + vidBoost * 0.85 * cellProgress);
                    scale = Math.max(scale, 1.0 + vidBoost * 1.3);
                }

                if (cursorGlow > 0) {
                    alpha = Math.min(1.0, alpha + cursorGlow * 0.5);
                    scale += cursorGlow * 0.45;
                }

                if (alpha < 0.035) continue;

                // Color palette: crisp warm ivory #f9f4eb with dynamic alpha
                ctx.fillStyle = `rgba(249, 244, 235, ${alpha.toFixed(3)})`;

                const curSize = baseSize * scale;

                // Render dot shapes: crisp squares on wave crests, circular dots elsewhere
                if (vidLum > 0.35 || topoElevation > 0.84) {
                    ctx.fillRect(px - curSize * 0.5, py - curSize * 0.5, curSize, curSize);
                } else if (cell.dither > 0.30) {
                    ctx.beginPath();
                    ctx.arc(px, py, curSize * 0.47, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(px - curSize * 0.37, py - curSize * 0.37, curSize * 0.74, curSize * 0.74);
                }
            }

            ctx.restore();
        }

        requestAnimationFrame(draw);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initServicesEngine);
    } else {
        initServicesEngine();
    }

    window.addEventListener('popstate', () => setTimeout(initServicesEngine, 100));

    window.__servicesEngine = {
        init: initServicesEngine
    };
})();
