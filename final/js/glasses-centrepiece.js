// Slide 05 and Slide 06 (End Screen): Centrepiece Spectacles & Ocular Screen Engine
// In Slide 05: Spectacles unite and morph ("Transformers"-style) from 3D hand-drawn frames
// into a clean, flat 2D Ocular Screen spanning the wide ratio across the screen,
// running the smooth, unbroken marquee in bold 'Brier' font.
// In Slide 06: Morphs back into 3D spectacles settling center screen, darkening into sunglasses
// with Aarav's authentic signature from signature.png written inside both lenses.
(() => {
    'use strict';
    const sec = document.querySelector('.ll-section--together');
    const canvas = sec && sec.querySelector('.wt-glasses');
    const THREE = window.THREE;
    if (!sec || !canvas || !THREE) return;
    const STATIC = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scroller = document.querySelector('.js-scroller') || document.scrollingElement || document.documentElement;
    const perf = window.__apPerf || { low: false, dpr: (c) => Math.min(window.devicePixelRatio || 1, 1.5, c || 2) };

    const FRONT_W = 238;
    const FRONT_H = 72;
    const OCULAR_W = 240;
    const OCULAR_H = 75;
    const OCULAR_R = 20;
    const BOIL = 1 / 7;

    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const lstep = (a, b, v) => clamp01((v - a) / (b - a));
    const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const mix = (a, b, t) => a + (b - a) * t;

    // SVG path (M/L/C/Z, y down) to polylines in y-up units; one polyline per subpath
    function polylines(d, steps) {
        const tok = d.match(/[MCLZ]|-?\d*\.?\d+(?:e-?\d+)?/g);
        const out = [];
        let cur = null, i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0;
        const num = () => parseFloat(tok[i++]);
        while (i < tok.length) {
            if (/[MCLZ]/.test(tok[i])) cmd = tok[i++];
            if (cmd === 'M') {
                x = sx = num(); y = sy = num();
                cur = [[x, -y]]; out.push(cur); cmd = 'L';
            } else if (cmd === 'L') {
                x = num(); y = num(); cur.push([x, -y]);
            } else if (cmd === 'C') {
                const a = num(), b = num(), c = num(), e = num(), f = num(), g = num();
                for (let k = 1; k <= steps; k++) {
                    const t = k / steps, u = 1 - t;
                    const px = u * u * u * x + 3 * u * u * t * a + 3 * u * t * t * c + t * t * t * f;
                    const py = u * u * u * y + 3 * u * u * t * b + 3 * u * t * t * e + t * t * t * g;
                    cur.push([px, -py]);
                }
                x = f; y = g;
            } else if (cmd === 'Z') {
                cur.closed = true; x = sx; y = sy; cmd = '';
            } else i++;
        }
        return out;
    }

    function shapeOf(d) {
        const p = polylines(d, 16)[0];
        const s = new THREE.Shape();
        p.forEach(([x, y], k) => (k ? s.lineTo(x, y) : s.moveTo(x, y)));
        s.closePath();
        return s;
    }

    // A marker stroke: a tube along the drawn line
    function inkTube(pts, r, closed, q, taper = true) {
        const v = pts.map((p) => (p.isVector3 ? p : new THREE.Vector3(p[0], p[1], p[2] || 0)));
        if (closed && v[0].distanceTo(v[v.length - 1]) < 0.5) v.pop();
        const curve = new THREE.CatmullRomCurve3(v, closed, 'centripetal');
        const segs = Math.max(6, Math.round((curve.getLength() / 3.2) * q.seg));
        const g = new THREE.TubeGeometry(curve, segs, r, q.radial, closed);
        const pos = g.attributes.position, ring = q.radial + 1, c = new THREE.Vector3(), w = new THREE.Vector3();
        for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            let k = 1 + 0.1 * Math.sin(t * 9.4 + r * 3.1);
            if (!closed && taper) k *= 0.3 + 0.7 * Math.sqrt(Math.min(1, t / 0.08, (1 - t) / 0.08));
            curve.getPointAt(Math.min(t, 1), c);
            for (let j = 0; j < ring; j++) {
                const n = i * ring + j;
                w.fromBufferAttribute(pos, n).sub(c).multiplyScalar(k).add(c);
                pos.setXYZ(n, w.x, w.y, w.z);
            }
        }
        g.computeVertexNormals();
        return g;
    }

    // Planar UVs over the shape's bounds
    function lensGeometry(d, flip) {
        const g = new THREE.ShapeGeometry(shapeOf(d), 1);
        g.computeBoundingBox();
        const b = g.boundingBox, w = b.max.x - b.min.x, h = b.max.y - b.min.y;
        const p = g.attributes.position, uv = g.attributes.uv;
        for (let k = 0; k < p.count; k++) {
            const u = (p.getX(k) - b.min.x) / w;
            uv.setXY(k, flip ? 1 - u : u, (p.getY(k) - b.min.y) / h);
        }
        uv.needsUpdate = true;
        return { g, aspect: w / h };
    }

    // --- AARAV'S REAL SIGNATURE TEXTURE FROM signature.png ---
    let sigTexture = null, sigMat = null;
    function loadSignatureTexture() {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = '/images/signature.png';
        img.onload = () => {
            const rawC = document.createElement('canvas');
            rawC.width = img.naturalWidth || img.width;
            rawC.height = img.naturalHeight || img.height;
            const rawCtx = rawC.getContext('2d');
            rawCtx.drawImage(img, 0, 0);

            try {
                const idata = rawCtx.getImageData(0, 0, rawC.width, rawC.height);
                const d = idata.data;
                const w = rawC.width, h = rawC.height;
                let minX = w, maxX = 0, minY = h, maxY = 0;

                // Find ink bounds and isolate ink in Signal Yellow (#FFED29)
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const idx = (y * w + x) * 4;
                        const lum = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
                        let alpha = 0;
                        if (lum < 165) {
                            alpha = Math.min(255, Math.max(0, Math.round((165 - lum) * 255 / 105)));
                            if (alpha > 40) {
                                if (x < minX) minX = x;
                                if (x > maxX) maxX = x;
                                if (y < minY) minY = y;
                                if (y > maxY) maxY = y;
                            }
                        }
                        d[idx] = 255;      // Signal Yellow #FFED29
                        d[idx + 1] = 237;
                        d[idx + 2] = 41;
                        d[idx + 3] = alpha;
                    }
                }
                rawCtx.putImageData(idata, 0, 0);

                // Create a proportioned texture for each lens (aspect ~ 1.4 : 1)
                const tw = 1024, th = 730;
                const finalC = document.createElement('canvas');
                finalC.width = tw;
                finalC.height = th;
                const finalCtx = finalC.getContext('2d');

                const inkW = Math.max(1, maxX - minX);
                const inkH = Math.max(1, maxY - minY);
                const pad = 0.14; // breathing room inside lens
                const scale = Math.min((tw * (1 - pad * 2)) / inkW, (th * (1 - pad * 2)) / inkH);
                const dw = inkW * scale;
                const dh = inkH * scale;
                const dx = (tw - dw) / 2;
                const dy = (th - dh) / 2;

                finalCtx.drawImage(rawC, minX, minY, inkW, inkH, dx, dy, dw, dh);

                sigTexture = new THREE.CanvasTexture(finalC);
                sigTexture.anisotropy = Math.min(perf.low ? 1 : 4, renderer ? renderer.capabilities.getMaxAnisotropy() : 1);
                if (sigMat) {
                    sigMat.uniforms.map.value = sigTexture;
                    sigMat.needsUpdate = true;
                }
                dirty = true;
            } catch (e) {
                sigTexture = new THREE.Texture(img);
                sigTexture.needsUpdate = true;
                if (sigMat) {
                    sigMat.uniforms.map.value = sigTexture;
                    sigMat.needsUpdate = true;
                }
            }
        };
    }

    // --- SEAMLESS UNDISTORTED 'BRIER' STREAM TEXTURE ---
    let streamCanvas = null, streamCtx = null, streamTex = null;
    let streamAspect = 1.0;
    const STREAM_PARTS = [
        { text: "LET'S BUILD SOMETHING TOGETHER", color: "#FFED29" },
        { text: "✦", color: "#FFED29", star: true },
        { text: "HAVE A PROJECT IN MIND? LET'S TALK", color: "#FFFFFF" },
        { text: "✦", color: "#FFED29", star: true },
        { text: "BRING YOUR VISION, I'LL BUILD THE CODE", color: "#FFED29" },
        { text: "✦", color: "#FFED29", star: true },
        { text: "OPEN FOR FREELANCE & COLLABORATION", color: "#FFFFFF" },
        { text: "✦", color: "#FFED29", star: true }
    ];

    function initStreamTexture() {
        const H_TEX = 512;
        const FONT_SIZE = 210;
        const testC = document.createElement('canvas');
        const testCtx = testC.getContext('2d');
        const fontStr = `bold ${FONT_SIZE}px 'Brier', Georgia, serif`;
        testCtx.font = fontStr;

        let totalW = 0;
        const partWidths = STREAM_PARTS.map(p => {
            const pad = p.star ? 90 : 140;
            const w = testCtx.measureText(p.text).width + pad;
            totalW += w;
            return { ...p, w, pad };
        });

        streamCanvas = document.createElement('canvas');
        streamCanvas.width = Math.max(1024, Math.ceil(totalW));
        streamCanvas.height = H_TEX;
        streamCtx = streamCanvas.getContext('2d');
        streamCtx.font = fontStr;
        streamCtx.textBaseline = 'middle';

        let curX = 0;
        partWidths.forEach(p => {
            streamCtx.fillStyle = p.color;
            streamCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            streamCtx.shadowBlur = 18;
            streamCtx.shadowOffsetY = 4;
            streamCtx.fillText(p.text, curX + p.pad / 2, H_TEX / 2);
            curX += p.w;
        });

        if (!streamTex) {
            streamTex = new THREE.CanvasTexture(streamCanvas);
            streamTex.wrapS = THREE.RepeatWrapping;
            streamTex.wrapT = THREE.ClampToEdgeWrapping;
            streamTex.minFilter = THREE.LinearMipmapLinearFilter;
            streamTex.generateMipmaps = true;
        } else {
            streamTex.image = streamCanvas;
            streamTex.needsUpdate = true;
        }

        // Exact 1:1 aspect ratio mapping:
        // Visible width across OCULAR_W = 240 * (512 / 75) = 1638.4 px
        streamAspect = (OCULAR_W * H_TEX) / (OCULAR_H * streamCanvas.width);
        if (ocularStreamMat) {
            ocularStreamMat.uniforms.streamTex.value = streamTex;
            ocularStreamMat.uniforms.streamAspect.value = streamAspect;
        }
        dirty = true;
    }

    if (document.fonts && document.fonts.load) {
        document.fonts.load("700 120px 'Brier'").then(() => {
            initStreamTexture();
        });
    }

    // --- THREE.JS SCENE OBJECTS & STRUCTURE ---
    let renderer = null, scene, camera, rig, glasses, L, R, hl = null, hr = null;
    let frames = [], glass, chalk, chalkSoft, ink, graphite, rivetMat, built = false;
    let ocularGroup = null, ocularFace = null, ocularStreamMat = null, ocularGlassMat = null;
    let q = null;
    const halfDetails = {
        temples: [],
        innerRims: [],
        nosePads: [],
        hatches: [],
        brows: [],
        glares: [],
        rivets: [],
        bridges: [],
        outers: [],
        panes: [],
        sigPrints: []
    };

    let W = 0, H = 0, vTop = 0, secTop = 0, secH = 1, navBottom = 0, kickerY = 0, visible = false, on = false, ticking = false;

    // --- LIVE IN-STRUCTURE MORPH TOPOLOGY (SPECTACLES TO OCULAR VISOR & BACK) ---
    let morphOrderedPts = [];
    let morphTargetPts = [];
    let lastMorphFactor = -1;
    let morphOuterGeo = null;

    function initMorphTopology(F_outer) {
        const raw = polylines(F_outer, 10)[0];
        const N = raw.length; // 51
        morphOrderedPts = [];
        // Re-order so starting point is idx 45 (inner vertical edge midpoint near bridge)
        for (let i = 0; i < N; i++) {
            morphOrderedPts.push(raw[(i + 45) % N]);
        }

        morphTargetPts = [];
        for (let i = 0; i < N; i++) {
            if (i <= 16) {
                // Top rail from x = 0 to x = -100 at y = 37.5
                const t = i / 16;
                morphTargetPts.push([ -100 * t, 37.5 ]);
            } else if (i <= 36) {
                // Outer-left rounded cap (radius 20, center (-100, 0))
                const t = (i - 16) / 20;
                let x, y;
                if (t <= 0.3) {
                    const a = Math.PI / 2 + (t / 0.3) * (Math.PI / 2);
                    x = -100 + 20 * Math.cos(a);
                    y = 17.5 + 20 * Math.sin(a);
                } else if (t <= 0.7) {
                    const v = (t - 0.3) / 0.4;
                    x = -120;
                    y = 17.5 - v * 35;
                } else {
                    const a = Math.PI + ((t - 0.7) / 0.3) * (Math.PI / 2);
                    x = -100 + 20 * Math.cos(a);
                    y = -17.5 + 20 * Math.sin(a);
                }
                morphTargetPts.push([ x, y ]);
            } else {
                // Bottom rail from x = -100 to x = 0 at y = -37.5
                const t = (i - 36) / (N - 1 - 36);
                morphTargetPts.push([ -100 * (1 - t), -37.5 ]);
            }
        }
    }

    function getMorphOuterGeometry(factor) {
        const qFactor = Math.round(factor * 120) / 120;
        if (morphOuterGeo && Math.abs(qFactor - lastMorphFactor) < 0.004) {
            return morphOuterGeo;
        }
        lastMorphFactor = qFactor;
        const v = morphOrderedPts.map((o, i) => {
            const tg = morphTargetPts[i];
            return new THREE.Vector3(
                o[0] + (tg[0] - o[0]) * qFactor,
                o[1] + (tg[1] - o[1]) * qFactor,
                0
            );
        });
        if (morphOuterGeo) morphOuterGeo.dispose();
        const curve = new THREE.CatmullRomCurve3(v, false, 'centripetal');
        const segs = Math.max(12, Math.round((curve.getLength() / 3.2) * (q ? q.seg : 1)));
        morphOuterGeo = new THREE.TubeGeometry(curve, segs, 3.3, q ? q.radial : 8, false);
        return morphOuterGeo;
    }

    function createOcularScreenMesh() {
        const group = new THREE.Group();
        const s = new THREE.Shape();
        const hw = OCULAR_W / 2, hh = OCULAR_H / 2, r = OCULAR_R;
        s.moveTo(-hw + r, -hh);
        s.lineTo(hw - r, -hh);
        s.quadraticCurveTo(hw, -hh, hw, -hh + r);
        s.lineTo(hw, hh - r);
        s.quadraticCurveTo(hw, hh, hw - r, hh);
        s.lineTo(-hw + r, hh);
        s.quadraticCurveTo(-hw, hh, -hw, hh - r);
        s.lineTo(-hw, -hh + r);
        s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

        const geo = new THREE.ShapeGeometry(s, 24);
        geo.computeBoundingBox();
        const b = geo.boundingBox;
        const gw = b.max.x - b.min.x, gh = b.max.y - b.min.y;
        const pos = geo.attributes.position, uv = geo.attributes.uv;
        for (let k = 0; k < pos.count; k++) {
            uv.setXY(k, (pos.getX(k) - b.min.x) / gw, (pos.getY(k) - b.min.y) / gh);
        }
        uv.needsUpdate = true;

        ocularGlassMat = new THREE.MeshBasicMaterial({
            color: 0x0a0a0c,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        ocularFace = new THREE.Mesh(geo, ocularGlassMat);
        ocularFace.renderOrder = 2;
        group.add(ocularFace);

        ocularStreamMat = new THREE.ShaderMaterial({
            uniforms: {
                streamTex: { value: streamTex },
                streamOffset: { value: 0 },
                streamAspect: { value: streamAspect },
                streamAlpha: { value: 0 }
            },
            vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
            fragmentShader: [
                'uniform sampler2D streamTex; uniform float streamOffset; uniform float streamAspect; uniform float streamAlpha; varying vec2 vUv;',
                'void main() {',
                '  float u = fract(vUv.x * streamAspect + streamOffset);',
                '  vec4 st = texture2D(streamTex, vec2(u, vUv.y));',
                '  vec3 glassBase = mix(vec3(0.045, 0.045, 0.052), vec3(0.012, 0.012, 0.015), vUv.y);',
                '  vec3 col = mix(glassBase, st.rgb, st.a);',
                '  float a = clamp((0.88 * streamAlpha) + st.a * 0.95, 0.0, 1.0);',
                '  gl_FragColor = vec4(col, a * streamAlpha);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        const decal = new THREE.Mesh(geo, ocularStreamMat);
        decal.position.z = 0.5;
        decal.renderOrder = 3;
        group.add(decal);

        group.visible = false;
        return group;
    }

    function build() {
        if (built) return true;
        built = true;
        const FR = window.__specsFrames;
        if (!FR || !FR.length) return false;
        try {
            renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !perf.low, powerPreference: perf.low ? 'low-power' : 'high-performance' });
        } catch (e) { renderer = null; return false; }
        renderer.setClearColor(0x000000, 0);
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(28, 1, 10, 20000);
        q = perf.low ? { seg: 0.5, radial: 5 } : { seg: 1, radial: 8 };

        if (!perf.low) {
            const env = new THREE.Scene();
            env.add(new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100), new THREE.MeshBasicMaterial({ color: 0x0c0c0e, side: THREE.BackSide })));
            const panel = (w, h, c, k, pos, rot) => {
                const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
                m.position.set(...pos);
                m.rotation.set(...rot);
                env.add(m);
            };
            panel(60, 22, 0xffffff, 3.2, [0, 46, 4], [Math.PI / 2, 0, 0]);
            panel(8, 70, 0xffffff, 4.5, [-46, 4, 10], [0, Math.PI / 2, 0]);
            panel(8, 70, 0xffffff, 2.2, [46, 0, 6], [0, -Math.PI / 2, 0]);
            panel(70, 6, 0xffed29, 1.6, [0, -30, -46], [0, 0, 0]);
            const pm = new THREE.PMREMGenerator(renderer);
            scene.environment = pm.fromScene(env, 0.035).texture;
            pm.dispose();
        }
        scene.add(new THREE.AmbientLight(0xffffff, perf.low ? 0.55 : 0.2));
        const key = new THREE.DirectionalLight(0xffffff, 1.1);
        key.position.set(-0.6, 0.9, 1.2);
        scene.add(key);

        ink = perf.low
            ? new THREE.MeshLambertMaterial({ color: 0x0b0b0c })
            : new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.4, metalness: 0, envMapIntensity: 0.9 });
        graphite = perf.low ? ink : new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.55, metalness: 0, envMapIntensity: 0.6 });
        chalk = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72, depthWrite: false });
        chalkSoft = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42, depthWrite: false });
        rivetMat = new THREE.MeshBasicMaterial({ color: 0xe8eae0 });
        glass = perf.low
            ? new THREE.MeshBasicMaterial({ color: 0xdfe7ea, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide })
            : new THREE.MeshPhysicalMaterial({ color: 0xdfe7ea, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.1, envMapIntensity: 1.8, depthWrite: false, side: THREE.DoubleSide });

        const lensD = FR[0].left.inner;
        const lens = lensGeometry(lensD, false);
        const lensR = lensGeometry(lensD, true);

        initStreamTexture();
        loadSignatureTexture();
        initMorphTopology(FR[0].left.outer);

        // Signature material inside both lenses
        sigMat = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: sigTexture },
                write: { value: 0 },
                morph: { value: 0 }
            },
            vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
            fragmentShader: [
                'uniform sampler2D map; uniform float write; uniform float morph; varying vec2 vUv;',
                'void main() {',
                '  if (morph < 0.01) discard;',
                '  vec4 s = texture2D(map, vUv);',
                '  float reveal = clamp((write * 1.25 - vUv.x * 0.95) * 12.0, 0.0, 1.0);',
                '  float a = s.a * morph * reveal;',
                '  gl_FragColor = vec4(s.rgb, a);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        function drawnHalf(F, mirrorUV) {
            const g = new THREE.Group();
            const add = (geo, mat, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.z = z; g.add(m); return m; };
            const line = (d, r, mat, z = 0, taper = true) => polylines(d, 10).map((p) => add(inkTube(p, r, !!p.closed, q, taper), mat, z));
            
            halfDetails.outers.push(...line(F.outer, 3.3, ink));
            halfDetails.innerRims.push(...line(F.inner, 1.5, ink, -0.6));
            halfDetails.brows.push(...line(F.brow, 1.9, ink, 1.6));
            halfDetails.hatches.push(...line(F.hatch, 1.1, graphite, 1.2));
            halfDetails.nosePads.push(...line(F.nosePad, 1.5, graphite, -5));
            
            const [br] = polylines(F.bridge, 10);
            const iTop = br.findIndex(([x]) => Math.abs(x) < 1e-3);
            const top = br.slice(0, iTop + 1), bot = br.slice(iTop + 1).reverse();
            const mid = top.map((p, k) => {
                const o = bot[Math.round((k / Math.max(1, top.length - 1)) * (bot.length - 1))];
                return [(p[0] + o[0]) / 2, (p[1] + o[1]) / 2, -1];
            });
            const thick = Math.abs(top[top.length - 1][1] - bot[bot.length - 1][1]);
            const brMesh = add(inkTube(mid, thick * 0.44, false, q, false), ink);
            halfDetails.bridges.push(brMesh);

            const [tp] = polylines(F.temple, 10);
            const [hx, hy] = tp[0];
            let acc = 0;
            const arm = tp.map(([x, y], k) => {
                if (k) acc += Math.hypot(x - tp[k - 1][0], y - tp[k - 1][1]);
                return [hx + (x - hx) * 0.14, hy + (y - hy) * 0.8, -acc * 2.3];
            });
            const end = arm[arm.length - 1];
            arm.push([end[0] + 0.6, end[1] - 9, end[2] - 7], [end[0] + 1, end[1] - 17, end[2] - 4]);
            const tpMesh = add(inkTube(arm, 2.4, false, q), ink, -1);
            halfDetails.temples.push(tpMesh);

            for (const [gl, mat, r] of [[F.glare1, chalk, 1.5], [F.glare2, chalkSoft, 1]]) {
                halfDetails.glares.push(add(inkTube([[gl.x1, -gl.y1, 0], [(gl.x1 + gl.x2) / 2, -(gl.y1 + gl.y2) / 2, 0], [gl.x2, -gl.y2, 0]], r, false, q), mat, 2.2));
            }
            for (const rv of [F.rivet1, F.rivet2]) {
                const m = add(new THREE.SphereGeometry(1.7, perf.low ? 6 : 10, perf.low ? 5 : 8), rivetMat, 3.4);
                m.position.x = rv.x; m.position.y = -rv.y;
                halfDetails.rivets.push(m);
            }
            return g;
        }

        function half(mirror) {
            const g = new THREE.Group();
            const pane = new THREE.Mesh(lens.g, glass);
            pane.renderOrder = 2;
            g.add(pane);
            halfDetails.panes.push(pane);

            // Aarav's authentic signature decal inside both lenses
            const sigPrint = new THREE.Mesh(mirror ? lensR.g : lens.g, sigMat);
            sigPrint.position.z = 0.5;
            sigPrint.renderOrder = 3;
            g.add(sigPrint);
            halfDetails.sigPrints.push(sigPrint);

            // Live in-structure morphing outer rim mesh
            const morphMesh = new THREE.Mesh(new THREE.BufferGeometry(), ink);
            morphMesh.visible = false;
            morphMesh.renderOrder = 4;
            g.add(morphMesh);

            const f = FR.map((F) => { const d = drawnHalf(F.left, mirror); g.add(d); return d; });
            if (mirror) g.scale.x = -1;
            const pivot = new THREE.Group();
            pivot.add(g);
            return { pivot, f, sigPrint, morphMesh, g };
        }

        glasses = new THREE.Group();
        hl = half(false); hr = half(true);
        L = hl.pivot; R = hr.pivot;
        frames = FR.map((_, k) => [hl.f[k], hr.f[k]]);
        glasses.add(L, R);

        ocularGroup = createOcularScreenMesh();
        glasses.add(ocularGroup);

        rig = new THREE.Group();
        rig.add(glasses);
        scene.add(rig);

        measure();
        renderer.compile(scene, camera);
        renderer.render(scene, camera);
        showFrame(0);
        canvas.addEventListener('webglcontextlost', (e) => e.preventDefault(), false);
        return true;
    }

    let boilShown = -1;
    function showFrame(k) {
        if (k === boilShown) return;
        boilShown = k;
        frames.forEach((pair, i) => { pair[0].visible = pair[1].visible = i === k; });
    }

    function measure() {
        W = window.innerWidth;
        H = window.innerHeight;
        vTop = scroller === document.scrollingElement || scroller === document.documentElement ? 0 : scroller.getBoundingClientRect().top;
        const r = sec.getBoundingClientRect();
        secTop = r.top - vTop + scroller.scrollTop;
        secH = r.height;
        const nav = document.querySelector('.ap-nav');
        navBottom = nav ? Math.max(0, nav.getBoundingClientRect().bottom) : H * 0.08;
        const stage = sec.querySelector('.wt-stage'), kick = sec.querySelector('.wt-kicker, .wt-title');
        if (!kick || !kick.style.transform || !kickerY) {
            kickerY = stage && kick ? kick.getBoundingClientRect().top - stage.getBoundingClientRect().top : H * 0.3;
            if (!(kickerY > navBottom + 40)) kickerY = H * 0.3;
        }
        if (!renderer) return;
        renderer.setPixelRatio(perf.dpr(perf.low ? 1 : 1.5));
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        camera.position.set(0, 0, (H / 2) / Math.tan((camera.fov * Math.PI) / 360));
        camera.near = camera.position.z * 0.2;
        camera.far = camera.position.z * 4;
        camera.updateProjectionMatrix();
        dirty = true;
    }

    const lenisScroll = () => {
        const l = window.__lenis;
        return l && typeof l.scroll === 'number' ? l.scroll : scroller.scrollTop;
    };

    const marqueeEl = sec.querySelector('.wt-marquee');
    const ptr = { x: 0, y: 0, on: false };
    const spin = { x: 0, y: 0, vx: 0, vy: 0 };
    let smoothVel = 0, smoothStreamOffset = 0, hasTriggeredContactTransition = false;
    let elasticLoaderProgress = 0, lastScrollY = -1, lastForwardScrollTime = 0;
    let time = 0, writeDrawn = 0, last = 0, boilT = 0, boilK = 0, dirty = true, lastKey = '';

    function frame() {
        const now = performance.now();
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
        last = now;
        if (!visible || !renderer) return;
        const top = secTop - lenisScroll();
        const maxScroll = Math.max(1, secH - H);
        const p = clamp01(-top / maxScroll);
        const enter = clamp01((H - top) / H);
        const st = window.__wtState || { p, settled: true };

        // Entry & unite
        const unite = STATIC ? 1 : easeOut(lstep(0.12, 0.94, enter));
        const centre = easeIO(lstep(0.0, 0.32, p));
        const grow = easeIO(lstep(0.06, 0.36, p));

        // Slide 5 Ocular Screen Phase:
        // Morph into clean 2D ocular screen from p = 0.24 to 0.44 (luxurious, calm opening)
        // Peak ocular screen holds from 0.44 to 0.64
        // Morphs back to 3D spectacles from 0.64 to 0.76
        const tMorphIn = easeIO(lstep(0.24, 0.44, p));
        const tMorphOut = easeIO(lstep(0.64, 0.76, p));
        const ocularFactor = tMorphIn * (1.0 - tMorphOut);

        // Slide 6 Sunglasses Darkening & Signature Phase:
        // p = 0.74 to 1.0
        const morph = easeIO(lstep(0.74, 0.86, p));
        // Immediate signature reveal as spectacles reform: starts at p = 0.74, drawn live with scroll
        const want = clamp01((p - 0.74) / 0.18);
        writeDrawn = want < writeDrawn ? want : writeDrawn + (want - writeDrawn) * Math.min(1, dt * 6);
        if (Math.abs(want - writeDrawn) < 0.0005) writeDrawn = want;

        // Stage backdrop blur
        const stageEl = sec.querySelector('.wt-stage');
        if (stageEl) {
            if (ocularFactor > 0.02) {
                stageEl.classList.add('is-visor-blur');
                stageEl.style.setProperty('--wt-bg-blur', `${Math.round(ocularFactor * 24)}px`);
            } else {
                stageEl.classList.remove('is-visor-blur');
                stageEl.style.removeProperty('--wt-bg-blur');
            }
        }

        // --- LIVE IN-STRUCTURE MORPH: SPECTACLES TO CLEAN OCULAR VISOR & BACK ---
        const isMorphing = ocularFactor > 0.001;

        if (hl && hr && hl.morphMesh && hr.morphMesh) {
            if (isMorphing) {
                hl.morphMesh.visible = true;
                hr.morphMesh.visible = true;
                const mGeo = getMorphOuterGeometry(ocularFactor);
                hl.morphMesh.geometry = mGeo;
                hr.morphMesh.geometry = mGeo;
                halfDetails.outers.forEach(m => { m.visible = false; });
            } else {
                hl.morphMesh.visible = false;
                hr.morphMesh.visible = false;
                halfDetails.outers.forEach(m => { m.visible = true; });
            }
        }

        // Bridge splits in half at x = 0 and retracts into frames:
        const bFactor = clamp01(ocularFactor / 0.40);
        const brVisible = bFactor < 0.99;
        const brScale = Math.max(0.001, 1.0 - bFactor);
        halfDetails.bridges.forEach(m => {
            m.visible = brVisible;
            m.scale.set(brScale, brScale, 1);
            m.position.x = -21.55 * bFactor;
        });

        // Inner and secondary details collapse/fold in during morph:
        const detailScale = Math.max(0, 1.0 - ocularFactor / 0.35);
        const detailVisible = detailScale > 0.01;
        halfDetails.temples.forEach(m => { m.scale.setScalar(detailScale); m.visible = detailVisible; });
        halfDetails.innerRims.forEach(m => { m.scale.setScalar(detailScale); m.visible = detailVisible; });
        halfDetails.nosePads.forEach(m => { m.scale.setScalar(detailScale); m.visible = detailVisible; });
        halfDetails.hatches.forEach(m => { m.scale.setScalar(detailScale); m.visible = detailVisible; });
        halfDetails.brows.forEach(m => { m.scale.setScalar(detailScale); m.visible = detailVisible; });
        halfDetails.glares.forEach(m => { m.scale.setScalar(detailScale); m.visible = detailVisible; });
        halfDetails.rivets.forEach(m => { m.scale.setScalar(detailScale); m.visible = detailVisible; });
        halfDetails.panes.forEach(m => { m.visible = ocularFactor < 0.35; });
        halfDetails.sigPrints.forEach(m => { m.visible = ocularFactor < 0.05 && p >= 0.74; });

        // Visor dark glass and text stream appearance:
        if (ocularGroup) {
            ocularGroup.visible = ocularFactor > 0.01;
            ocularGlassMat.opacity = mix(0.0, 0.92, ocularFactor);
            ocularStreamMat.uniforms.streamAlpha.value = ocularFactor;
        }

        // Marquee text motion: strictly on scroll, zero auto-drift, calm, silky, elegant speed:
        if (ocularStreamMat && ocularFactor > 0.01) {
            const scrollDriven = (p - 0.38) * 0.42;
            smoothStreamOffset += (scrollDriven - smoothStreamOffset) * Math.min(1, dt * 10);
            ocularStreamMat.uniforms.streamOffset.value = smoothStreamOffset;
        }

        // Slide 6 Signature in both lenses:
        if (sigMat) {
            sigMat.uniforms.morph.value = morph;
            sigMat.uniforms.write.value = writeDrawn;
        }

        // Slide 6 Top Nav Scroll Progress Loader & Elastic Spring-Back Effect:
        const scrollFillEl = document.getElementById('wtScrollFill');
        if (scrollFillEl) {
            const curScroll = lenisScroll();
            const scrollDelta = lastScrollY < 0 ? 0 : curScroll - lastScrollY;
            lastScrollY = curScroll;

            if (p >= 0.76) {
                const targetFromScroll = clamp01((p - 0.78) / 0.20);
                if (scrollDelta > 0.25) {
                    lastForwardScrollTime = now;
                }
                const isActivelyScrolling = (now - lastForwardScrollTime) < 180;

                if (isActivelyScrolling && targetFromScroll > elasticLoaderProgress) {
                    // Scrolling forward: smoothly charge up towards target
                    elasticLoaderProgress += (targetFromScroll - elasticLoaderProgress) * Math.min(1, dt * 10);
                } else {
                    // User stopped scrolling or paused: elastic decay / spring-back slowly!
                    // Decay speed: 0.22/sec gives palpable, silky elastic resistance
                    const decaySpeed = 0.22;
                    elasticLoaderProgress = Math.max(0, elasticLoaderProgress - decaySpeed * dt);
                }
            } else {
                elasticLoaderProgress = Math.max(0, elasticLoaderProgress - dt * 2.0);
            }

            scrollFillEl.style.transform = `scaleX(${elasticLoaderProgress.toFixed(4)})`;

            if (elasticLoaderProgress >= 0.98 && !hasTriggeredContactTransition) {
                hasTriggeredContactTransition = true;
                if (window.__pageTransition && typeof window.__pageTransition.navigate === 'function') {
                    window.__pageTransition.navigate('/contact');
                } else {
                    location.href = '/contact';
                }
            } else if (elasticLoaderProgress < 0.50) {
                hasTriggeredContactTransition = false;
            }
        }

        const show = enter > 0.02 && top < H;
        if (show !== on) { on = show; canvas.classList.toggle('is-on', show); }
        if (!show) return;

        // Size calculation:
        const gap = kickerY - navBottom;
        const base = Math.min(W * (W < 700 ? 0.56 : 0.24), 480, (gap * 0.62 / FRONT_H) * FRONT_W);
        const normalScale = (base * mix(1, W < 700 ? 1.4 : 2.2, grow) * mix(1, 1.08, centre)) / FRONT_W;

        // Max Ocular Screen size matching user's image ratio (~92vw width, ~50vh height):
        const targetW = Math.min(W * 0.92, 1460);
        const targetScale = targetW / OCULAR_W;
        const s = mix(normalScale, targetScale, ocularFactor);

        const holdY = navBottom + gap * 0.5;
        const y = mix(holdY, H * 0.5, centre);

        time += dt;
        const vel = window.__lenis ? window.__lenis.velocity || 0 : 0;
        smoothVel += (vel - smoothVel) * Math.min(1, dt * 10);
        const tx = (ptr.on ? ptr.y * 0.28 : 0) + Math.max(-0.14, Math.min(0.14, smoothVel * 0.0018));
        const ty = ptr.on ? ptr.x * 0.45 : 0;
        if (STATIC) { spin.x = tx; spin.y = ty; }
        else {
            spin.vx += ((tx - spin.x) * 22 - spin.vx * 8.0) * dt;
            spin.vy += ((ty - spin.y) * 22 - spin.vy * 8.0) * dt;
            spin.x += spin.vx * dt;
            spin.y += spin.vy * dt;
            boilT += dt;
            if (boilT >= BOIL) { boilT %= BOIL; boilK = (boilK + 1) % frames.length; }
        }
        showFrame(STATIC ? 0 : boilK);
        const idle = STATIC || perf.low ? 0 : 1;

        if (marqueeEl) marqueeEl.style.display = 'none';

        const key = [top.toFixed(1), W, H, boilShown, writeDrawn.toFixed(4), morph.toFixed(3), ocularFactor.toFixed(3), spin.x.toFixed(4), spin.y.toFixed(4), idle ? time.toFixed(3) : 0].join('|');
        if (key === lastKey && !dirty) return;
        lastKey = key;
        dirty = false;

        rig.position.set(0, H / 2 - y, 0);
        rig.scale.setScalar(s);

        const a = 1 - unite;
        L.position.set(-a * W * 0.55 / s, a * H * 0.9 / s, 0);
        R.position.set(a * W * 0.55 / s, a * H * 0.9 / s, 0);
        L.rotation.set(a * 0.5, a * 1.1, a * 0.28);
        R.rotation.set(a * 0.5, -a * 1.1, -a * 0.28);

        // ROTATION RULE:
        // When in max ocular screen mode, rotDamp = 0 -> pitch, yaw, roll are strictly 0 (kept straight in 2D).
        // 3D returns smoothly when returning to normal spectacle form and on Slide 6!
        const rotDamp = 1.0 - ocularFactor;
        glasses.rotation.set(
            spin.x * rotDamp + Math.sin(time * 0.9) * 0.05 * idle * rotDamp,
            spin.y * rotDamp + Math.sin(time * 0.6) * 0.08 * idle * rotDamp,
            Math.sin(time * 0.7) * 0.025 * idle * rotDamp
        );
        glasses.position.y = Math.sin(time * 1.1) * 4 * idle * rotDamp;

        glass.color.setRGB(mix(0.87, 0.035, morph), mix(0.9, 0.035, morph), mix(0.92, 0.043, morph));
        glass.opacity = mix(0.1, 0.65, morph);
        chalk.opacity = 0.72 * (1 - 0.65 * morph);
        chalkSoft.opacity = 0.42 * (1 - 0.65 * morph);

        renderer.render(scene, camera);
    }

    function setTicking(v) {
        if (v === ticking) return;
        ticking = v;
        last = 0;
        if (window.gsap && gsap.ticker) { if (v) gsap.ticker.add(frame); else gsap.ticker.remove(frame); }
        else if (v) (function loop() { if (!ticking) return; frame(); requestAnimationFrame(loop); })();
    }

    function start() {
        measure();
        window.addEventListener('resize', measure, { passive: true });
        window.addEventListener('ap:tier', measure);
        if (window.ScrollTrigger) ScrollTrigger.addEventListener('refresh', measure);
        window.addEventListener('pointermove', (e) => {
            ptr.x = (e.clientX / W) * 2 - 1;
            ptr.y = (e.clientY / H) * 2 - 1;
            ptr.on = true;
        }, { passive: true });
        document.documentElement.addEventListener('pointerleave', () => { ptr.on = false; }, { passive: true });

        const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1));
        const early = () => setTimeout(() => idle(() => build(), { timeout: 6000 }), 2500);
        if (document.readyState === 'complete') early(); else window.addEventListener('load', early, { once: true });
        new IntersectionObserver((es) => {
            if (!es[es.length - 1].isIntersecting || built) return;
            idle(() => build(), { timeout: 400 });
        }, { root: scroller === document.scrollingElement || scroller === document.documentElement ? null : scroller, rootMargin: '200% 0px' }).observe(sec);
        new IntersectionObserver((es) => {
            visible = es[es.length - 1].isIntersecting;
            if (visible && !built) build();
            if (visible) measure();
            if (!visible && on) { on = false; canvas.classList.remove('is-on'); }
            dirty = true;
            setTicking(visible && !!renderer);
        }).observe(sec);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
