/**
 * SPONGE CAROUSEL ENGINE
 * 1:1 Boutique Creative Developer Experience
 * 
 * Vertical Sponge Press Mechanics:
 * - Wide landscape format (long lengthwise, not heightwise)
 * - Zero gaps and zero borders: directly connected edge-to-edge images
 * - Symmetric vertical squish: invisible "human hand" pressing down in the center
 * - Continuous, seamless C1-smooth Bézier curve across all cards (zero stair-steps)
 * - Inward-snuggling content hierarchy so text/buttons remain centered in the pressed waist
 * - Elastic spring recovery when scrolling settles
 */

(function () {
    'use strict';

    const PROJECTS = [
        {
            num: "01",
            title: "Gargantua",
            tag: "LAB // 2026",
            desc: "Lusion-grade 5D corridor tesseract, crystal void, Schwarzschild raymarched black hole & NASA EMU suit.",
            mediaType: "image",
            mediaSrc: "/lab/gargantua/og.jpg",
            launchUrl: "/lab/gargantua/",
            githubUrl: "https://github.com/AaravPilania/lab-gargantua"
        },
        {
            num: "02",
            title: "Quidditch",
            tag: "LAB // 2026",
            desc: "Endless 3D broom flight simulation around procedural Hogwarts towers chasing the elusive Golden Snitch.",
            mediaType: "image",
            mediaSrc: "/lab/quidditch/assets/og.jpg",
            launchUrl: "/lab/quidditch/",
            githubUrl: "https://github.com/AaravPilania/lab-quidditch"
        },
        {
            num: "03",
            title: "Smart-Split",
            tag: "AI & FINTECH // 2025",
            desc: "Next-gen bill splitting with OCR receipt decomposition, real-time sync, and multi-currency smart settlement.",
            mediaType: "image",
            mediaSrc: "/images/gl/astrodither/2.jpg",
            launchUrl: "https://smart-split-aarav.vercel.app/",
            githubUrl: "https://github.com/AaravPilania/Smart-Split"
        },
        {
            num: "04",
            title: "Pivot",
            tag: "DECISION OS // 2025",
            desc: "High-contrast tactical executive dashboard with algorithmic priority scoring and keyboard-first workflows.",
            mediaType: "video",
            mediaSrc: "/images/gl/dracarys/2.mp4",
            launchUrl: "https://pivot-wheat.vercel.app/",
            githubUrl: "https://github.com/aryan-astra/Pivot"
        },
        {
            num: "05",
            title: "Zenith",
            tag: "SPACETECH // 2026",
            desc: "Real-time orbital tracking of the International Space Station with WebGL day/night terminator shaders.",
            mediaType: "video",
            mediaSrc: "/images/gl/oc2/1.mp4",
            launchUrl: "https://zenith-aarav.vercel.app/",
            githubUrl: "https://github.com/AaravPilania/Zenith"
        },
        {
            num: "06",
            title: "ProvenPath",
            tag: "EDTECH // 2025",
            desc: "Curated learning pathways with graph-based skill trees and verified portfolio assessments.",
            mediaType: "image",
            mediaSrc: "/images/gl/longines/2.jpg",
            launchUrl: "https://provenpath.vercel.app/",
            githubUrl: "https://github.com/AaravPilania/Guidewire"
        },
        {
            num: "07",
            title: "Onyx",
            tag: "CREATIVE OS // 2025",
            desc: "Minimalist desktop visual environment and creative canvas for shaders and kinetic typography.",
            mediaType: "image",
            mediaSrc: "/images/gl/medusae/2.jpg",
            launchUrl: "https://onyx-aarav.vercel.app/",
            githubUrl: "https://github.com/AaravPilania/Onyx"
        },
        {
            num: "08",
            title: "Divide & Conquer",
            tag: "ALGORITHMS // 2025",
            desc: "Kinetic 3D visualization of recursion trees, merge sort pipelines and computational geometry.",
            mediaType: "image",
            mediaSrc: "/images/gl/horsebit/1.jpg",
            launchUrl: "https://divide-and-conquer-visualizer.vercel.app/",
            githubUrl: "https://github.com/AaravPilania/divide-and-conquer-visualizer"
        },
        {
            num: "09",
            title: "Book-Selling",
            tag: "STOREFRONT // 2024",
            desc: "Boutique editorial bookstore platform with dynamic typography, audio samples and inventory sync.",
            mediaType: "image",
            mediaSrc: "/images/gl/wim/3.jpg",
            launchUrl: "https://book-selling-aarav.vercel.app/",
            githubUrl: "https://github.com/AaravPilania/Book-Selling"
        },
        {
            num: "10",
            title: "Sitara",
            tag: "EXPERIMENT // 2025",
            desc: "Generative particle soundscapes and tactile typographic interactions driven by real-time audio FFT.",
            mediaType: "image",
            mediaSrc: "/images/gl/sitara/2.jpg",
            launchUrl: "https://github.com/AaravPilania",
            githubUrl: "https://github.com/AaravPilania"
        },
        {
            num: "11",
            title: "Hypnotica",
            tag: "SHADERS // 2025",
            desc: "Raymarched GLSL chromatic dispersion tunnel with interactive cursor refraction and lens flare.",
            mediaType: "image",
            mediaSrc: "/images/gl/hypnotica/2.jpg",
            launchUrl: "https://github.com/AaravPilania",
            githubUrl: "https://github.com/AaravPilania"
        },
        {
            num: "12",
            title: "Adidas Speed",
            tag: "INTERACTIVE // 2024",
            desc: "High-cadence athletic showcase with frame-accurate motion tracking and video displacement.",
            mediaType: "image",
            mediaSrc: "/images/gl/adidas/2.jpg",
            launchUrl: "https://github.com/AaravPilania",
            githubUrl: "https://github.com/AaravPilania"
        }
    ];

    class SpongeCarousel {
        constructor() {
            this.stage = document.getElementById('spongeStage');
            this.track = document.getElementById('spongeTrack');
            this.gridBg = document.getElementById('spongeGridBg');
            this.lensGuide = document.getElementById('spongeLensGuide');
            this.hudIndex = document.getElementById('spongeHudIndex');
            this.hudName = document.getElementById('spongeHudName');
            this.gaugeFill = document.getElementById('spongeGaugeFill');
            this.gaugeVal = document.getElementById('spongeGaugeVal');
            this.arrowPrev = document.getElementById('spongePrev');
            this.arrowNext = document.getElementById('spongeNext');

            // SVG elements for continuous organic hand-press curve
            this.clipPathEl = document.getElementById('spongeHandPressPath');
            this.contourTop = document.getElementById('spongeContourTop');
            this.contourBot = document.getElementById('spongeContourBot');

            if (!this.track) return;

            // Scroll & Velocity State
            this.scrollX = 0;
            this.targetScrollX = 0;
            this.lastScrollX = 0;
            this.smoothedVelocity = 0;
            this.currentSquish = 0;

            // Pointer Drag State
            this.isDragging = false;
            this.dragStartX = 0;
            this.dragScrollStart = 0;
            this.lastDragX = 0;
            this.dragVelocity = 0;

            // Layout Metrics
            this.cardItems = [];
            this.cardWidth = 640;
            this.cardHeight = 340;
            this.singleSetWidth = 0;
            this.REPEATS = 4; // 48 items total for infinite smooth wrapping

            this.init();
        }

        init() {
            this.buildDOM();
            this.measureMetrics();
            this.bindEvents();
            this.tick();
        }

        buildDOM() {
            this.track.innerHTML = '';
            this.cardItems = [];

            for (let r = 0; r < this.REPEATS; r++) {
                PROJECTS.forEach((proj, idx) => {
                    const card = document.createElement('div');
                    card.className = 'sponge-card';
                    card.setAttribute('data-index', idx);
                    card.setAttribute('data-repeat', r);

                    const inner = document.createElement('div');
                    inner.className = 'sponge-card-inner';

                    // Background Media (Edge-to-edge landscape)
                    const mediaWrap = document.createElement('div');
                    mediaWrap.className = 'sponge-card-media';

                    let mediaEl;
                    if (proj.mediaType === 'video') {
                        mediaEl = document.createElement('video');
                        mediaEl.src = proj.mediaSrc;
                        mediaEl.autoplay = true;
                        mediaEl.loop = true;
                        mediaEl.muted = true;
                        mediaEl.playsInline = true;
                        mediaEl.setAttribute('playsinline', '');
                    } else {
                        mediaEl = document.createElement('img');
                        mediaEl.src = proj.mediaSrc;
                        mediaEl.alt = proj.title;
                        mediaEl.loading = (r === 1 || r === 2) ? 'eager' : 'lazy';
                    }
                    mediaWrap.appendChild(mediaEl);
                    inner.appendChild(mediaWrap);

                    // Scrim & Sheen
                    const scrim = document.createElement('div');
                    scrim.className = 'sponge-card-scrim';
                    inner.appendChild(scrim);

                    const sheen = document.createElement('div');
                    sheen.className = 'sponge-card-sheen';
                    inner.appendChild(sheen);

                    // Content Overlay
                    const content = document.createElement('div');
                    content.className = 'sponge-card-content';

                    // Header (Pill tags)
                    const header = document.createElement('div');
                    header.className = 'sponge-card-header';
                    header.innerHTML = `
                        <span class="sponge-card-num">[ ${proj.num} ]</span>
                        <span class="sponge-card-tag">${proj.tag}</span>
                    `;
                    content.appendChild(header);

                    // Footer (Title, description, actions)
                    const footer = document.createElement('div');
                    footer.className = 'sponge-card-footer';
                    footer.innerHTML = `
                        <div class="sponge-card-meta">
                            <h2 class="sponge-card-title">${proj.title}</h2>
                            <p class="sponge-card-desc">${proj.desc}</p>
                        </div>
                        <div class="sponge-card-actions">
                            <a href="${proj.launchUrl}" ${proj.launchUrl.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="sponge-btn sponge-btn--launch">
                                Launch
                                <svg viewBox="0 0 7 8"><path d="M7.002.499v7h-1V2.206L.707 7.501 0 6.794l5.295-5.295H.002v-1h7Z"/></svg>
                            </a>
                            <a href="${proj.githubUrl}" target="_blank" rel="noopener" class="sponge-btn sponge-btn--gh" title="GitHub">
                                <svg viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                            </a>
                        </div>
                    `;
                    content.appendChild(footer);

                    inner.appendChild(content);
                    card.appendChild(inner);
                    this.track.appendChild(card);

                    this.cardItems.push({
                        el: card,
                        inner: inner,
                        content: content,
                        header: header,
                        footer: footer,
                        media: mediaEl,
                        project: proj,
                        origIndex: idx
                    });
                });
            }
        }

        measureMetrics() {
            if (this.cardItems.length === 0) return;
            const sample = this.cardItems[0].el;
            this.cardWidth = sample.offsetWidth || Math.min(window.innerWidth * 0.48, 720);
            this.cardHeight = this.track.offsetHeight || 340;
            this.singleSetWidth = PROJECTS.length * this.cardWidth;

            // Start in middle set for seamless bidirectional scrolling
            if (this.scrollX === 0) {
                this.scrollX = this.singleSetWidth * 1.5;
                this.targetScrollX = this.scrollX;
                this.lastScrollX = this.scrollX;
            }
        }

        bindEvents() {
            window.addEventListener('resize', () => {
                this.measureMetrics();
            }, { passive: true });

            // Wheel: Downward scroll advances right-to-left
            window.addEventListener('wheel', (e) => {
                if (e.ctrlKey || e.metaKey) return;
                const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                this.targetScrollX += delta * 1.35;
            }, { passive: true });

            // Pointer Drag / Swipe
            const stage = this.stage || window;
            stage.addEventListener('pointerdown', (e) => {
                if (e.target.closest('a, button')) return;
                this.isDragging = true;
                this.dragStartX = e.clientX;
                this.dragScrollStart = this.targetScrollX;
                this.lastDragX = e.clientX;
                this.dragVelocity = 0;
                if (this.stage) this.stage.classList.add('is-dragging');
            });

            window.addEventListener('pointermove', (e) => {
                if (!this.isDragging) return;
                const dx = e.clientX - this.lastDragX;
                this.lastDragX = e.clientX;
                this.dragVelocity = -dx * 1.6;
                this.targetScrollX += this.dragVelocity;
            });

            const onPointerEnd = () => {
                if (!this.isDragging) return;
                this.isDragging = false;
                if (this.stage) this.stage.classList.remove('is-dragging');
                this.targetScrollX += this.dragVelocity * 4.2;
            };

            window.addEventListener('pointerup', onPointerEnd);
            window.addEventListener('pointercancel', onPointerEnd);

            // Arrow Keys
            window.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    this.targetScrollX += this.cardWidth * 0.85;
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    this.targetScrollX -= this.cardWidth * 0.85;
                }
            });

            // Navigation Arrows
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
        }

        tick() {
            // Smooth lerp on scroll position
            const lerpFactor = this.isDragging ? 0.22 : 0.084;
            this.scrollX += (this.targetScrollX - this.scrollX) * lerpFactor;

            // Infinite wrapping across repeats
            if (this.singleSetWidth > 0) {
                if (this.scrollX < this.singleSetWidth) {
                    this.scrollX += this.singleSetWidth;
                    this.targetScrollX += this.singleSetWidth;
                    this.lastScrollX += this.singleSetWidth;
                } else if (this.scrollX > this.singleSetWidth * 2.5) {
                    this.scrollX -= this.singleSetWidth;
                    this.targetScrollX -= this.singleSetWidth;
                    this.lastScrollX -= this.singleSetWidth;
                }
            }

            // Real-time instantaneous scroll velocity
            const rawV = this.scrollX - this.lastScrollX;
            this.lastScrollX = this.scrollX;
            this.smoothedVelocity += (rawV - this.smoothedVelocity) * 0.16;

            const absV = Math.abs(this.smoothedVelocity);
            // Normalized velocity [0, 1]
            const normV = Math.min(absV / 24.0, 1.0);

            // Vertical Sponge Squish Depth:
            // Symmetrically presses from top and bottom toward center line.
            // Depth scales with velocity up to 46% of total height!
            const targetSquish = 0.46 * normV;
            // Harmonic spring recovery
            this.currentSquish += (targetSquish - this.currentSquish) * 0.22;
            const pressDepth = this.currentSquish;

            // Subtle parallax on background grid
            if (this.gridBg) {
                const gridOffset = (-this.scrollX * 0.1) % 60;
                this.gridBg.style.transform = `translate3d(${gridOffset}px, 0, 0)`;
            }

            // Viewport & Geometry Metrics
            const W = window.innerWidth;
            const H = this.cardHeight;
            const midX = W * 0.5;
            const midY = window.innerHeight * 0.5;
            // Radius of horizontal reach of the hand-press
            const R = Math.min(W * 0.44, 520);
            const Delta = (H * 0.5) * pressDepth; // Vertical pinch depth from top and bottom

            // =========================================================================
            // GENERATE CONTINUOUS C1-SMOOTH BÉZIER CONTOUR (HUMAN HAND VERTICAL PRESS)
            // =========================================================================
            const X0 = Math.max(0, midX - R);
            const X2 = Math.min(W, midX + R);
            const dx = midX - X0;
            const cpx = dx * 0.52; // Cubic Bézier smooth tangent control distance

            let trackClipD;
            if (Delta < 0.2) {
                // Flat rectangle when stationary
                trackClipD = `M 0 0 L ${W} 0 L ${W} ${H} L 0 ${H} Z`;
            } else {
                // Symmetrically curved top & bottom hand press
                trackClipD = [
                    `M 0 0`,
                    `L ${X0.toFixed(1)} 0`,
                    `C ${(X0 + cpx).toFixed(1)} 0, ${(midX - cpx).toFixed(1)} ${Delta.toFixed(1)}, ${midX.toFixed(1)} ${Delta.toFixed(1)}`,
                    `C ${(midX + cpx).toFixed(1)} ${Delta.toFixed(1)}, ${(X2 - cpx).toFixed(1)} 0, ${X2.toFixed(1)} 0`,
                    `L ${W} 0`,
                    `L ${W} ${H}`,
                    `L ${X2.toFixed(1)} ${H}`,
                    `C ${(X2 - cpx).toFixed(1)} ${H}, ${(midX + cpx).toFixed(1)} ${(H - Delta).toFixed(1)}, ${midX.toFixed(1)} ${(H - Delta).toFixed(1)}`,
                    `C ${(midX - cpx).toFixed(1)} ${(H - Delta).toFixed(1)}, ${(X0 + cpx).toFixed(1)} ${H}, ${X0.toFixed(1)} ${H}`,
                    `L 0 ${H}`,
                    `Z`
                ].join(' ');
            }

            // Update SVG ClipPath on track
            if (this.clipPathEl) {
                this.clipPathEl.setAttribute('d', trackClipD);
            }

            // Update Luminous Glowing Boundary Lines (Spanning Full Visible Row)
            if (this.contourTop && this.contourBot) {
                const topY0 = midY - H * 0.5;
                const botY0 = midY + H * 0.5;

                let topD, botD;
                if (Delta < 0.2) {
                    // Straight lines covering the full visible row
                    topD = `M 0 ${topY0.toFixed(1)} L ${W} ${topY0.toFixed(1)}`;
                    botD = `M 0 ${botY0.toFixed(1)} L ${W} ${botY0.toFixed(1)}`;
                } else {
                    // Full visible row spanning edge-to-edge, smoothly flexing in the middle
                    topD = [
                        `M 0 ${topY0.toFixed(1)}`,
                        `L ${X0.toFixed(1)} ${topY0.toFixed(1)}`,
                        `C ${(X0 + cpx).toFixed(1)} ${topY0.toFixed(1)}, ${(midX - cpx).toFixed(1)} ${(topY0 + Delta).toFixed(1)}, ${midX.toFixed(1)} ${(topY0 + Delta).toFixed(1)}`,
                        `C ${(midX + cpx).toFixed(1)} ${(topY0 + Delta).toFixed(1)}, ${(X2 - cpx).toFixed(1)} ${topY0.toFixed(1)}, ${X2.toFixed(1)} ${topY0.toFixed(1)}`,
                        `L ${W} ${topY0.toFixed(1)}`
                    ].join(' ');

                    botD = [
                        `M 0 ${botY0.toFixed(1)}`,
                        `L ${X0.toFixed(1)} ${botY0.toFixed(1)}`,
                        `C ${(X0 + cpx).toFixed(1)} ${botY0.toFixed(1)}, ${(midX - cpx).toFixed(1)} ${(botY0 - Delta).toFixed(1)}, ${midX.toFixed(1)} ${(botY0 - Delta).toFixed(1)}`,
                        `C ${(midX + cpx).toFixed(1)} ${(botY0 - Delta).toFixed(1)}, ${(X2 - cpx).toFixed(1)} ${botY0.toFixed(1)}, ${X2.toFixed(1)} ${botY0.toFixed(1)}`,
                        `L ${W} ${botY0.toFixed(1)}`
                    ].join(' ');
                }

                this.contourTop.setAttribute('d', topD);
                this.contourBot.setAttribute('d', botD);

                // Always visible across full row, brightening with velocity compression
                const lineAlpha = 0.55 + Math.min(pressDepth * 1.5, 0.45);
                this.contourTop.style.opacity = lineAlpha.toFixed(2);
                this.contourBot.style.opacity = lineAlpha.toFixed(2);
            }

            // =========================================================================
            // UPDATE CARDS: FLUSH EDGE-TO-EDGE + INWARD SNUGGLING CONTENT HIERARCHY
            // =========================================================================
            const W0 = this.cardWidth;
            let closestCard = null;
            let minDistance = Infinity;

            for (let i = 0; i < this.cardItems.length; i++) {
                const item = this.cardItems[i];
                const screenLeft = i * W0 - this.scrollX;
                const screenRight = screenLeft + W0;

                // Viewport culling: skip offscreen cards
                if (screenRight < -120 || screenLeft > W + 120) {
                    item.el.style.display = 'none';
                    continue;
                }
                item.el.style.display = '';

                // Flush horizontal alignment (zero gaps, zero horizontal scale)
                item.el.style.transform = `translate3d(${screenLeft.toFixed(2)}px, 0, 0)`;

                // Distance from card center to hand-press axis
                const cardCenterX = screenLeft + W0 * 0.5;
                const distFromMid = Math.abs(cardCenterX - midX);

                // Smooth bell-curve proximity factor
                const prox = distFromMid < R 
                    ? Math.cos((Math.PI * distFromMid) / (2 * R)) ** 2 
                    : 0;

                // Dynamic vertical inward displacement for header and footer
                // Keeps text and buttons nested comfortably inside the pinched waist
                const cardDeltaY = (H * 0.5) * pressDepth * prox;

                if (item.header) {
                    item.header.style.transform = `translate3d(0, ${cardDeltaY.toFixed(1)}px, 0)`;
                }
                if (item.footer) {
                    item.footer.style.transform = `translate3d(0, -${cardDeltaY.toFixed(1)}px, 0)`;
                }

                // Check closest card to center for HUD
                if (distFromMid < minDistance) {
                    minDistance = distFromMid;
                    closestCard = item;
                }
            }

            // Mark active center card & update HUD
            if (closestCard) {
                this.cardItems.forEach(c => {
                    c.el.classList.toggle('is-center', c === closestCard);
                });

                if (this.hudIndex && this.hudName) {
                    this.hudIndex.textContent = `[ ${closestCard.project.num} / ${PROJECTS.length.toString().padStart(2, '0')} ]`;
                    this.hudName.textContent = closestCard.project.title.toUpperCase();
                }
            }

            // Update Velocity Sponge Compression Gauge in HUD
            if (this.gaugeFill && this.gaugeVal) {
                const fillPct = Math.min((pressDepth / 0.46) * 100, 100);
                this.gaugeFill.style.width = `${fillPct.toFixed(1)}%`;
                this.gaugeVal.textContent = `${Math.round(fillPct)}% PRESSED`;
            }

            // Lens guide indicator state & position
            if (this.lensGuide) {
                this.lensGuide.classList.toggle('is-squishing', normV > 0.08);
            }

            requestAnimationFrame(() => this.tick());
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new SpongeCarousel());
    } else {
        new SpongeCarousel();
    }
})();
