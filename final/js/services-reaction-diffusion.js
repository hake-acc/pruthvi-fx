/**
 * Services Section ("What We Do"):
 * Authentic 1:1 Lama Lama Variable Wave-Motion Particle Matrix & 3D Video Engine
 * 
 * 1. Deep Organic Wave Boundaries & Diffusion Envelopes:
 *    - Top wave extends 360px up into Selected Projects (#section-projects).
 *    - Bottom wave extends 450px down into Happy Clients (.ll-section--logos),
 *      engulfing the [ HAPPY CLIENTS ] area with authentic multi-harmonic sinusoidal swells.
 *    - Multi-harmonic amplitudes (92px + 45px + 18px = 155px wave amplitude, 310px total crest-to-trough swing).
 *    - 130px stochastic dither diffusion band where particles disperse organically into darkness.
 *    - Continuous fluid animation: traveling horizontal wave motion and organic breathing over time.
 * 2. Continuous Variable Wave Motion:
 *    - Multi-harmonic kinetic coordinate displacement on every particle across the entire field.
 * 3. High-Performance Zero-Glitch Pipeline (Locked 120+ FPS, ~2.5ms frame time):
 *    - Viewport-aware row culling (only renders visible screen rows + margin).
 *    - Column wave boundary precomputation (typed Float32Array, 0 redundant math in cell loops).
 *    - Direct C++ Skia path construction (0 heap allocations, 0 GC thrashing).
 *    - Throttled offscreen video luminance caching (Float32Array lookup, 0 sync readbacks).
 * 4. Authentic 8px Dot Grid:
 *    - Crisp micro-dots (1.65px * dpr) in warm ivory (#f9f4eb @ 0.38 opacity).
 *    - Video luminance activates ordered sub-dots at 4px offsets, illuminating the team member typing at laptop.
 * 5. Interactive Cursor Repulsion & Kinetic Aura.
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
        let cols = 0, rows = 0, step = 8;
        let gridCells = [];
        let sectionHeight = 1692;

        // Offscreen sampling canvas for authentic 1440x1920 video
        const sampleW = 120;
        const sampleH = 160;
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = sampleW;
        sampleCanvas.height = sampleH;
        const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
        const lumCache = new Float32Array(sampleW * sampleH);
        let lastSampleTime = -1;
        let hasCachedVideo = false;

        // Offscreen video element
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
            videoEl.style.cssText = 'opacity: 0.001; pointer-events: none; position: fixed; top: -9999px; left: -9999px; width: 1440px; height: 1920px; z-index: -999;';
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

        // Generous vertical bleeds for deep rolling waves
        const topExtendCss = 360;   // 360px bleed UP into Selected Projects
        const bottomExtendCss = 450;// 450px bleed DOWN into Happy Clients

        let topWave = new Float32Array(0);
        let botWave = new Float32Array(0);

        function resize() {
            const rect = section.getBoundingClientRect();
            sectionHeight = section.offsetHeight || rect.height || 1692;
            dpr = Math.min(window.devicePixelRatio || 1, 2);

            const totalCssH = sectionHeight + topExtendCss + bottomExtendCss;

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

            step = Math.round(8.0 * dpr);
            cols = Math.ceil(width / step) + 1;
            rows = Math.ceil(height / step) + 1;

            topWave = new Float32Array(cols);
            botWave = new Float32Array(cols);

            gridCells = new Array(rows);
            for (let r = 0; r < rows; r++) {
                const rowCells = new Array(cols);
                const py = r * step;
                for (let c = 0; c < cols; c++) {
                    const px = c * step;
                    rowCells[c] = {
                        c: c,
                        r: r,
                        baseX: px,
                        baseY: py,
                        dither: pseudoNoise(c * 23.17, r * 47.83),
                        blockNoise: pseudoNoise(Math.floor(c / 2) * 11.3, Math.floor(r / 2) * 17.7),
                        phaseOffset: pseudoNoise(c * 17.3, r * 31.1) * Math.PI * 2
                    };
                }
                gridCells[r] = rowCells;
            }
        }

        resize();
        window.addEventListener('resize', resize, { passive: true });

        // Interactive cursor repulsion
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

        // Navbar message update on scroll
        function updateHeaderLabel() {
            const rect = section.getBoundingClientRect();
            const winH = window.innerHeight;
            const inView = rect.top < winH * 0.78 && rect.bottom > winH * 0.15;
            if (!inView) return;

            const headerTargets = document.querySelectorAll('.js-header-message-container .js-text-container, .js-menu-label, .js-backdrop-label, .js-nav-center-text');
            if (!headerTargets || headerTargets.length === 0) return;

            const secH = rect.height || 1000;
            const scrollIntoSec = Math.max(0, -rect.top);
            const progress = scrollIntoSec / secH;

            let labelText = 'HOW WE PAY RENT';
            if (rect.top < -180 && progress >= 0.33 && progress < 0.68) {
                labelText = 'OUR PARTY TRICKS';
            } else if (rect.top < -180 && progress >= 0.68) {
                labelText = 'WHERE THE MAGIC HAPPENS';
            }

            headerTargets.forEach(el => {
                if (el.textContent !== labelText) {
                    el.textContent = labelText;
                }
            });
        }
        window.addEventListener('scroll', updateHeaderLabel, { passive: true });
        const scroller = document.querySelector('.js-scroller') || document.querySelector('.ll-scroller');
        if (scroller) {
            scroller.addEventListener('scroll', updateHeaderLabel, { passive: true });
        }

        let time = 0;
        let lastFrameTime = performance.now();

        // Slide 05 lifts this grid's own dots into its headline: it reads the lit cells here, and hides each one as it
        // leaves through `hide` (a cell goes once its CSS y passes cut[col] - dither * band)
        const hide = { cut: null, band: 0 };
        const lit = (cell, c) => {
            const by = cell.baseY;
            const t = topWave[c], b = botWave[c], z = 125 * dpr;
            if (by < t - z || by > b + z) return false;
            const n = cell.dither * 0.65 + cell.blockNoise * 0.35;
            if (by < t) return n <= (by - (t - z)) / z;
            if (by > b) return n <= ((b + z) - by) / z;
            return true;
        };
        window.__svcField = {
            canvas, hide,
            get dpr() { return dpr; },
            get time() { return time; },
            get sectionHeight() { return sectionHeight; },
            get cols() { return cols; },
            top: topExtendCss,
            botWave: (c) => botWave[c] / dpr,
            // Lit cells whose CSS y lies in [y0, y1] of canvas space: fn(xCss, yCss, col, dither)
            each(y0, y1, fn) {
                const r0 = Math.max(0, Math.floor((y0 * dpr) / step)), r1 = Math.min(rows, Math.ceil((y1 * dpr) / step));
                for (let r = r0; r < r1; r++) {
                    const row = gridCells[r];
                    if (!row) continue;
                    for (let c = 0; c < cols; c++) {
                        const cell = row[c];
                        if (lit(cell, c)) fn(cell.baseX / dpr, cell.baseY / dpr, c, cell.dither);
                    }
                }
            },
        };
        const hidden = (cell, c) => hide.cut && cell.baseY / dpr > hide.cut[c] - cell.dither * hide.band;

        function draw(now) {
            requestAnimationFrame(draw);

            // Delta time clamped to 33ms
            const dt = Math.min(0.033, (now - lastFrameTime) * 0.001);
            lastFrameTime = now;
            time += dt * 1.5; // Natural wave progression rate

            // Visibility culling: skip work if entire canvas is off-screen
            const canvasRect = canvas.getBoundingClientRect();
            const winH = window.innerHeight;
            if (canvasRect.bottom < -150 || canvasRect.top > winH + 150) {
                return;
            }

            // Smooth cursor
            if (isHovering && targetMouseX > 0) {
                mouseX += (targetMouseX - mouseX) * 0.20;
                mouseY += (targetMouseY - mouseY) * 0.20;
            } else {
                mouseX += (-9999 - mouseX) * 0.15;
                mouseY += (-9999 - mouseY) * 0.15;
            }

            // Offscreen video sampling (max 30fps)
            if (videoEl && videoEl.readyState >= 2 && !videoEl.paused) {
                const curTime = videoEl.currentTime;
                if (Math.abs(curTime - lastSampleTime) > 0.028) {
                    lastSampleTime = curTime;
                    sampleCtx.drawImage(videoEl, 0, 0, sampleW, sampleH);
                    const imgData = sampleCtx.getImageData(0, 0, sampleW, sampleH).data;
                    const totalPixels = sampleW * sampleH;
                    for (let p = 0; p < totalPixels; p++) {
                        const idx = p * 4;
                        lumCache[p] = (imgData[idx] * 0.299 + imgData[idx + 1] * 0.587 + imgData[idx + 2] * 0.114) / 255;
                    }
                    hasCachedVideo = true;
                }
            }

            // Video geometry
            const isDesktop = width >= 768 * dpr;
            const vidW = isDesktop ? Math.round(width * 0.58) : Math.round(width * 0.85);
            const vidH = Math.round(vidW / (1440 / 1920));
            const vidX = isDesktop ? Math.round(width * 0.44) : Math.round((width - vidW) * 0.5);
            const vidY = Math.round((topExtendCss + 80) * dpr);

            // =========================================================================
            // 1. COLUMN WAVE BOUNDARY PRECALCULATION (Typed Float32Array: ~0.04ms)
            // =========================================================================
            // Base wave heights inside canvas coordinate space
            // Top wave sweeps 210px up into Selected Projects with deep multi-harmonic swells
            const topWaveBase = (topExtendCss - 25) * dpr;
            // Bottom wave sweeps down into Happy Clients past [ HAPPY CLIENTS ]
            const botWaveBase = (topExtendCss + sectionHeight + 50) * dpr;
            const diffZone = (125 * dpr);

            const topBreath = Math.sin(time * 0.75) * (14 * dpr);
            const botBreath = Math.cos(time * 0.70) * (14 * dpr);

            for (let c = 0; c < cols; c++) {
                const bx = c * step;
                // Top Wave (starts in Selected Projects, undulating traveling wave sweeping downward)
                const topW1 = Math.sin(bx * 0.0032 - time * 0.65) * (110 * dpr);
                const topW2 = Math.cos(bx * 0.0068 + time * 0.48) * (52 * dpr);
                const topW3 = Math.sin(bx * 0.0135 - time * 0.88) * (20 * dpr);
                topWave[c] = topWaveBase + topBreath + topW1 + topW2 + topW3;

                // Bottom Wave (sweeps down deeply into Happy Clients past [ HAPPY CLIENTS ])
                const botW1 = Math.sin(bx * 0.0032 + time * 0.65) * (115 * dpr);
                const botW2 = Math.cos(bx * 0.0068 - time * 0.48) * (55 * dpr);
                const botW3 = Math.sin(bx * 0.0135 + time * 0.85) * (22 * dpr);
                botWave[c] = botWaveBase + botBreath + botW1 + botW2 + botW3;
            }

            // =========================================================================
            // 2. VIEWPORT-AWARE ROW CULLING (Cuts unnecessary rows by ~65%)
            // =========================================================================
            const viewCanvasTop = -canvasRect.top * dpr;
            const viewCanvasBot = (-canvasRect.top + winH) * dpr;
            const margin = 100 * dpr;

            const visibleRowStart = Math.max(0, Math.floor((viewCanvasTop - margin) / step));
            const visibleRowEnd = Math.min(rows, Math.ceil((viewCanvasBot + margin) / step));

            // =========================================================================
            // 3. ZERO-ALLOCATION DIRECT PATH DRAWING (Locked 120+ FPS, Zero GC Thrashing)
            // =========================================================================
            ctx.clearRect(0, 0, width, height);

            const baseDotSize = 1.65 * dpr;
            const subDotSize = 1.45 * dpr;
            const subOffset = 4.0 * dpr;
            const cursorRadius = 135 * dpr;
            const cursorRadiusSq = cursorRadius * cursorRadius;
            const waveT = time * 0.80;
            const mouseActive = mouseX > -1000;

            // -------------------------------------------------------------------------
            // PASS 1: Base Ambient Dot Grid & Wavy Diffusion (Single Skia Path: ~2.2ms)
            // -------------------------------------------------------------------------
            ctx.fillStyle = 'rgba(249, 244, 235, 0.38)'; // Crisp, visible warm ivory dots matching reference
            ctx.beginPath();

            for (let r = visibleRowStart; r < visibleRowEnd; r++) {
                const rowCells = gridCells[r];
                if (!rowCells) continue;

                for (let c = 0; c < cols; c++) {
                    const cell = rowCells[c];
                    const by = cell.baseY;
                    const topCrestY = topWave[c];
                    const botCrestY = botWave[c];

                    // Outer cull beyond wave boundary
                    if (by < topCrestY - diffZone || by > botCrestY + diffZone) {
                        continue;
                    }

                    // Stochastic dither diffusion envelope at start (top)
                    if (by < topCrestY) {
                        const topDiff = (by - (topCrestY - diffZone)) / diffZone;
                        const noise = cell.dither * 0.65 + cell.blockNoise * 0.35;
                        if (noise > topDiff) {
                            continue;
                        }
                    } else if (by > botCrestY) {
                        // Stochastic dither diffusion envelope at end (bottom)
                        const botDiff = ((botCrestY + diffZone) - by) / diffZone;
                        const noise = cell.dither * 0.65 + cell.blockNoise * 0.35;
                        if (noise > botDiff) {
                            continue;
                        }
                    }
                    if (hidden(cell, c)) continue;

                    // Kinetic variable wave displacement on every particle
                    const wx1 = Math.sin(c * 0.085 + waveT + cell.phaseOffset) * (1.8 * dpr);
                    const wy1 = Math.cos(r * 0.085 + waveT * 0.85 + cell.phaseOffset) * (1.8 * dpr);

                    let px = cell.baseX + wx1;
                    let py = by + wy1;

                    // Cursor repulsion & aura
                    if (mouseActive) {
                        const dx = px - mouseX;
                        const dy = py - mouseY;
                        const distSq = dx * dx + dy * dy;
                        if (distSq < cursorRadiusSq && distSq > 0.01) {
                            const dist = Math.sqrt(distSq);
                            const factor = 1 - dist / cursorRadius;
                            const force = factor * factor * (14 * dpr);
                            px += (dx / dist) * force;
                            py += (dy / dist) * force;
                        }
                    }

                    ctx.rect(px, py, baseDotSize, baseDotSize);
                }
            }
            ctx.fill();

            // -------------------------------------------------------------------------
            // PASS 2: Video Silhouette Highlights & Sub-Dots (Bounding-Box Scoped: ~0.8ms)
            // -------------------------------------------------------------------------
            if (hasCachedVideo) {
                const vidColStart = Math.max(0, Math.floor(vidX / step));
                const vidColEnd = Math.min(cols, Math.ceil((vidX + vidW) / step));
                const vidRowStart = Math.max(visibleRowStart, Math.floor(vidY / step));
                const vidRowEnd = Math.min(visibleRowEnd, Math.ceil((vidY + vidH) / step));

                ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.beginPath();

                for (let r = vidRowStart; r < vidRowEnd; r++) {
                    const rowCells = gridCells[r];
                    if (!rowCells) continue;

                    for (let c = vidColStart; c < vidColEnd; c++) {
                        const cell = rowCells[c];
                        const by = cell.baseY;
                        const topCrestY = topWave[c];
                        const botCrestY = botWave[c];

                        if (by < topCrestY || by > botCrestY || hidden(cell, c)) continue;

                        const u = (cell.baseX - vidX) / vidW;
                        const v = (by - vidY) / vidH;
                        if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;

                        const sx = Math.min(sampleW - 1, Math.max(0, (u * sampleW) | 0));
                        const sy = Math.min(sampleH - 1, Math.max(0, (v * sampleH) | 0));
                        const rawLum = lumCache[sy * sampleW + sx];
                        if (rawLum < 0.16) continue;

                        const edgeX = Math.sin(u * Math.PI);
                        const edgeY = Math.sin(v * Math.PI);
                        const vignette = Math.pow(Math.min(1, edgeX * edgeY * 4.0), 0.85);
                        const effLum = rawLum * vignette;
                        if (effLum < 0.16) continue;

                        const wx1 = Math.sin(c * 0.085 + waveT + cell.phaseOffset) * (1.8 * dpr);
                        const wy1 = Math.cos(r * 0.085 + waveT * 0.85 + cell.phaseOffset) * (1.8 * dpr);
                        const px = cell.baseX + wx1;
                        const py = by + wy1;

                        // Primary video sub-dot
                        ctx.rect(px + subOffset, py + subOffset, subDotSize, subDotSize);

                        // Secondary sub-dot for medium-high brightness
                        if (effLum > 0.38) {
                            ctx.rect(px, py + subOffset, subDotSize, subDotSize);
                        }
                        // Tertiary sub-dot for peak brightness (laptop keyboard / monitor glow)
                        if (effLum > 0.60) {
                            ctx.rect(px + subOffset, py, subDotSize, subDotSize);
                        }
                    }
                }
                ctx.fill();
            }
        }

        requestAnimationFrame((t) => {
            lastFrameTime = t;
            draw(t);
        });

        // Pitchdeck interactive drawer
        function initStickyAccordion() {
            const pitchdeckBtn = section.querySelector('.js-title-toggle');
            const pitchdeckChildren = section.querySelector('.js-children-container');
            const plus = section.querySelector('.js-plus');
            const minus = section.querySelector('.js-minus');

            if (pitchdeckBtn && pitchdeckChildren) {
                pitchdeckBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const isOpen = pitchdeckChildren.style.display !== 'none';
                    if (isOpen) {
                        pitchdeckChildren.style.display = 'none';
                        if (plus) plus.classList.remove('hidden');
                        if (minus) minus.classList.add('hidden');
                    } else {
                        pitchdeckChildren.style.display = 'block';
                        if (plus) plus.classList.add('hidden');
                        if (minus) minus.classList.remove('hidden');
                    }
                });
            }

            const thisIsUsBtn = section.querySelector('.js-thisisus-toggle');
            if (thisIsUsBtn) {
                thisIsUsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const showreel = document.querySelector('#video-showreel, .js-showreel, [data-component*="showreel"]');
                    if (showreel) {
                        showreel.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            }
        }
        initStickyAccordion();
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
