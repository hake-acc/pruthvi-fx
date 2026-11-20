/**
 * Lusion.co Authentic 3D Tunnel & Astronaut Engine - Studio Grade Replication
 * 1:1 Complete replica of Lusion.co's end-of-site sequence:
 * 1. Deep cosmic black space with trailing clones & Fresnel glow
 * 2. Vibrant blue geometric archway corridor (16 blocks, voronoi pattern)
 * 3. White room with 64 refractive floating 3D diamonds
 * 4. 946-piece glass shatter explosion with dynamic chromatic dispersion
 * 5. Astronaut bursting out of screen into footer, settling into zero-g idle
 * 6. Blinking 8-bit LED matrix animated smile & eyes inside helmet visor
 * 7. 26 drifting pop-art stickers & diamonds surrounding the astronaut
 * 8. Natural mouse tracking & parallax
 */

(function () {
    'use strict';

    if (typeof THREE === 'undefined') {
        console.warn('[Lusion Astronaut] THREE is not defined, aborting.');
        return;
    }

    // ==========================================
    // 1. Math & Easing Utilities
    // ==========================================
    const math = {
        PI: Math.PI,
        HALF_PI: Math.PI * 0.5,
        DEG2RAD: Math.PI / 180,
        RAD2DEG: 180 / Math.PI,
        clamp(e, min, max) { return e < min ? min : e > max ? max : e; },
        saturate(e) { return Math.max(0, Math.min(1, e)); },
        linearStep(min, max, x) { return this.clamp((x - min) / (max - min), 0, 1); },
        mix(a, b, t) { return a + (b - a) * t; },
        cMix(a, b, t) { return a + (b - a) * this.clamp(t, 0, 1); },
        unMix(a, b, x) { return (x - a) / (b - a); },
        cUnMix(a, b, x) { return this.clamp((x - a) / (b - a), 0, 1); },
        fit(val, inMin, inMax, outMin, outMax, easeFn) {
            let t = this.cUnMix(inMin, inMax, val);
            if (easeFn) t = easeFn(t);
            return outMin + t * (outMax - outMin);
        },
        smoothstep(min, max, x) {
            let t = this.cUnMix(min, max, x);
            return t * t * (3 - 2 * t);
        },
        getSeedRandomFn(seedStr) {
            let s = 0;
            for (let i = 0; i < seedStr.length; i++) s = (s << 5) - s + seedStr.charCodeAt(i) | 0;
            return function () {
                s = (s * 9301 + 49297) % 233280;
                return s / 233280;
            };
        }
    };

    const ease = {
        sineIn(t) { return 1 - Math.cos(t * Math.PI / 2); },
        sineOut(t) { return Math.sin(t * Math.PI / 2); },
        sineInOut(t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
        cubicIn(t) { return t * t * t; },
        cubicOut(t) { return --t * t * t + 1; },
        cubicInOut(t) { return (t *= 2) < 1 ? 0.5 * t * t * t : 0.5 * ((t -= 2) * t * t + 2); },
        quartIn(t) { return t * t * t * t; },
        quartOut(t) { return 1 - --t * t * t * t; },
        expoIn(t) { return t === 0 ? 0 : Math.pow(2, 10 * (t - 1)); },
        expoOut(t) { return t === 1 ? 1 : -Math.pow(2, -10 * t) + 1; },
        backInOut(t) {
            const s = 1.70158 * 1.525;
            return (t *= 2) < 1 ? 0.5 * (t * t * ((s + 1) * t - s)) : 0.5 * ((t -= 2) * t * ((s + 1) * t + s) + 2);
        }
    };

    // ==========================================
    // 2. Physical & Noise Helpers
    // ==========================================
    const { Vector3, Quaternion, Euler, Matrix4 } = THREE;
    const _v$2 = new THREE.Vector3();

    class Simple1DNoise {
        static MAX_VERTICES = 512;
        static MAX_VERTICES_MASK = Simple1DNoise.MAX_VERTICES - 1;
        _scale = 1;
        _amplitude = 1;
        _r = [];
        constructor(e) {
            let t = e ? math.getSeedRandomFn(e) : Math.random;
            for (let r = 0; r < Simple1DNoise.MAX_VERTICES; ++r) this._r.push(t() - .5);
        }
        getVal(e) {
            const t = e * this._scale, r = Math.floor(t), n = t - r, a = n * n * (3 - 2 * n), l = r & Simple1DNoise.MAX_VERTICES_MASK, c = l + 1 & Simple1DNoise.MAX_VERTICES_MASK;
            return math.mix(this._r[l], this._r[c], a) * this._amplitude;
        }
        getFbm(e, t) {
            let r = 0, n = .5;
            for (let a = 0; a < t; a++) r += n * this.getVal(e), e *= 2, n *= .5;
            return r;
        }
    }

    class SecondOrderDynamics {
        constructor(e, t = 1.5, r = .8, n = 2, a = !0) {
            this.isRobust = a;
            this.isVector = typeof e == "object";
            this.setFZR(t, r, n);
            if (this.isVector) {
                this.target = e;
                this.target0 = e.clone();
                this.prevTarget = e.clone();
                this.value = e.clone();
                this.valueVel = e.clone().setScalar(0);
                this._targetVelCache = this.valueVel.clone();
                this._cache1 = this.valueVel.clone();
                this._cache2 = this.valueVel.clone();
                this.update = this._updateVector;
            } else {
                this.target0 = e;
                this.prevTarget = e;
                this.value = e;
                this.valueVel = 0;
                this.update = this._updateNumber;
            }
            this.computeStableCoefficients = a ? this._computeRobustStableCoefficients : this._computeStableCoefficients;
        }
        setFZR(e = this._f, t = this._z, r = this._r) {
            let n = Math.PI * 2 * e;
            this.isRobust && (this._w = n, this._z = t, this._d = this._w * Math.sqrt(Math.abs(this._z * this._z - 1)));
            this.k1 = t / (Math.PI * e);
            this.k2 = 1 / (n * n);
            this.k3 = r * t / n;
        }
        _computeRobustStableCoefficients(e) {
            if (this._w * e < this._z) {
                this._k1Stable = this.k1;
                this._k2Stable = Math.max(this.k2, e * e / 2 + e * this.k1 / 2, e * this.k1);
            } else {
                let t = Math.exp(-this._z * this._w * e),
                    r = 2 * t * (this._z <= 1 ? Math.cos(e * this._d) : Math.cosh(e * this._d)),
                    n = t * t,
                    a = e / (1 + n - r);
                this._k1Stable = (1 - n) * a;
                this._k2Stable = e * a;
            }
        }
        _updateVector(e, t = this.target) {
            if (e > 0) {
                this._targetVelCache.copy(t).sub(this.prevTarget).divideScalar(e);
                this.prevTarget.copy(t);
                this.computeStableCoefficients(e);
                this.value.add(this._cache1.copy(this.valueVel).multiplyScalar(e));
                this._cache1.copy(t).add(this._targetVelCache.multiplyScalar(this.k3)).sub(this.value).sub(this._cache2.copy(this.valueVel).multiplyScalar(this._k1Stable)).multiplyScalar(e / this._k2Stable);
                this.valueVel.add(this._cache1);
            }
        }
        _updateNumber(e, t = this.target) {
            if (e > 0) {
                let r = (t - this.prevTarget) / e;
                this.prevTarget = t;
                this.computeStableCoefficients(e);
                this.valueVel += (t + this.k3 * r - this.value - this._k1Stable * this.valueVel) * (e / this._k2Stable);
                this.value += this.valueVel * e;
            }
        }
    }

    class BrownianMotion {
        _position = new Vector3;
        _rotation = new Quaternion;
        _euler = new Euler;
        _scale = new Vector3(1, 1, 1);
        _matrix = new Matrix4;
        _enablePositionNoise = !0;
        _enableRotationNoise = !0;
        _positionFrequency = .25;
        _rotationFrequency = .25;
        _positionAmplitude = .3;
        _rotationAmplitude = .003;
        _positionScale = new Vector3(1, 1, 1);
        _rotationScale = new Vector3(1, 1, 0);
        _positionFractalLevel = 3;
        _rotationFractalLevel = 3;
        _times = new Float32Array(6);
        _noise = new Simple1DNoise;
        static FBM_NORM = 1 / .75;
        constructor() {
            for (let e = 0; e < 6; e++) this._times[e] = Math.random() * -1e4;
        }
        update(e) {
            const t = e === void 0 ? 16.666 : e * 1000;
            if (this._enablePositionNoise) {
                for (let r = 0; r < 3; r++) this._times[r] += this._positionFrequency * t * 0.001;
                _v$2.set(
                    this._noise.getFbm(this._times[0], this._positionFractalLevel),
                    this._noise.getFbm(this._times[1], this._positionFractalLevel),
                    this._noise.getFbm(this._times[2], this._positionFractalLevel)
                );
                _v$2.multiply(this._positionScale);
                _v$2.multiplyScalar(this._positionAmplitude * BrownianMotion.FBM_NORM);
                this._position.copy(_v$2);
            }
            if (this._enableRotationNoise) {
                for (let r = 0; r < 3; r++) this._times[r + 3] += this._rotationFrequency * t * 0.001;
                _v$2.set(
                    this._noise.getFbm(this._times[3], this._rotationFractalLevel),
                    this._noise.getFbm(this._times[4], this._rotationFractalLevel),
                    this._noise.getFbm(this._times[5], this._rotationFractalLevel)
                );
                _v$2.multiply(this._rotationScale);
                _v$2.multiplyScalar(this._rotationAmplitude * BrownianMotion.FBM_NORM);
                this._euler.set(_v$2.x, _v$2.y, _v$2.z);
                this._rotation.setFromEuler(this._euler);
            }
            this._matrix.compose(this._position, this._rotation, this._scale);
        }
    }

    // ==========================================
    // 3. Binary .buf Parser
    // ==========================================
    function parseBuf(arrayBuffer) {
        const e = arrayBuffer;
        const t = new Uint32Array(e, 0, 1)[0];
        const r = JSON.parse(new TextDecoder().decode(new Uint8Array(e, 4, t)));
        const n = r.vertexCount;
        const a = r.indexCount;
        let l = 4 + t;
        const geo = new THREE.BufferGeometry();
        const u = r.attributes;
        const storageMap = {
            'Float32Array': Float32Array,
            'Uint32Array': Uint32Array,
            'Uint16Array': Uint16Array,
            'Uint8Array': Uint8Array,
            'Int16Array': Int16Array,
            'Int8Array': Int8Array
        };

        for (let i = 0; i < u.length; i++) {
            const M = u[i];
            const S = M.id;
            const b = S === 'indices' ? a : n;
            const C = M.componentSize;
            const w = storageMap[M.storageType] || Float32Array;
            const R = new w(e, l, b * C);
            const E = w.BYTES_PER_ELEMENT;
            let I;

            if (M.needsPack) {
                const F = M.packedComponents;
                const k = F.length;
                const L = M.storageType.indexOf('Int') === 0;
                const D = 1 << (E * 8);
                const ne = L ? D * 0.5 : 0;
                const re = 1 / D;
                I = new Float32Array(b * C);
                for (let ce = 0, z = 0; ce < b; ce++) {
                    for (let j = 0; j < k; j++) {
                        const X = F[j];
                        I[z] = (R[z] + ne) * re * X.delta + X.from;
                        z++;
                    }
                }
            } else {
                I = R;
            }

            if (S === 'indices') {
                geo.setIndex(new THREE.BufferAttribute(I, 1));
            } else {
                geo.setAttribute(S, new THREE.BufferAttribute(I, C));
            }
            l += b * C * E;
        }

        return geo;
    }

    // ==========================================
    // 4. Shaders Registration
    // ==========================================
    THREE.ShaderChunk['astronautCommon'] = "vec3 worldNormal=normalize(v_worldNormal);vec3 worldTangent=normalize(v_worldTangent.xyz);vec3 worldBinormal=normalize(cross(worldNormal,worldTangent))*-v_worldTangent.w;worldTangent=normalize(cross(worldBinormal,worldNormal));vec3 tangentSpaceNormal=normalize(texture2D(u_norTexture,v_uv).xyz-.5);worldNormal=normalize(tangentSpaceNormal.x*worldTangent+tangentSpaceNormal.y*worldBinormal+tangentSpaceNormal.z*worldNormal);vec4 armb=texture2D(u_armbTexture,v_uv);float ao=v_ao*armb.r;float roughness=armb.g;float metalness=armb.b;float albedo=armb.a;vec3 N=worldNormal;vec3 V=normalize(cameraPosition-v_worldPosition);vec3 reflection=normalize(reflect(-V,N));float NdV=clamp(abs(dot(N,V)),0.001,1.0);float fresnel=pow(1.0-NdV,5.0);";
    THREE.ShaderChunk['astronautCommon_pars'] = "uniform sampler2D u_armbTexture;uniform sampler2D u_norTexture;uniform float u_time;uniform vec3 u_bgColor;uniform float u_showRatio;\n#ifdef IS_WHITE\nuniform float u_whiteTunnelRatio;\n#endif\nvarying vec3 v_worldPosition;varying vec4 v_worldTangent;varying vec3 v_worldNormal;varying vec2 v_uv;varying float v_ao;varying vec3 v_viewPosition;const float PI=3.14159265359;const float RECIPROCAL_PI=0.31830988618;const float RECIPROCAL_PI2=0.15915494;const float LN2=0.6931472;const float ENV_LODS=6.0;\n#ifndef saturate\n#define saturate( a ) clamp( a, 0.0, 1.0 )\n#endif\nfloat linearStep(float edge0,float edge1,float x){return clamp((x-edge0)/(edge1-edge0),0.0,1.0);}vec2 cartesianToPolar(vec3 n){vec2 uv;uv.x=atan(n.z,n.x)*RECIPROCAL_PI2+0.5;uv.y=asin(n.y)*RECIPROCAL_PI+0.5;return uv;}mat4 rotation3d(vec3 axis,float angle){axis=normalize(axis);float s=sin(angle);float c=cos(angle);float oc=1.0-c;return mat4(oc*axis.x*axis.x+c,oc*axis.x*axis.y-axis.z*s,oc*axis.z*axis.x+axis.y*s,0.0,oc*axis.x*axis.y+axis.z*s,oc*axis.y*axis.y+c,oc*axis.y*axis.z-axis.x*s,0.0,oc*axis.z*axis.x-axis.y*s,oc*axis.y*axis.z+axis.x*s,oc*axis.z*axis.z+c,0.0,0.0,0.0,0.0,1.0);}";

    const SHADERS = {
        vertAstronaut: `
            uniform float u_time;
            uniform sampler2D u_animationPositionTexture;
            uniform sampler2D u_animationOrientTexture;
            uniform vec2 u_animationTextureSize;
            uniform float u_loopLinearBlend;
            attribute vec2 boneIndices;
            attribute vec2 boneWeights;
            attribute vec4 tangent;
            attribute float ao;
            attribute vec3 instancePos;
            attribute vec4 instanceOrient;
            attribute vec3 instanceAnimationFrameFromToBlend1;
            attribute vec3 instanceAnimationFrameFromToBlend2;
            varying vec3 v_worldPosition;
            varying vec4 v_worldTangent;
            varying vec3 v_worldNormal;
            varying vec3 v_viewPosition;
            varying vec2 v_uv;
            varying float v_ao;
            #define PI 3.14159265359
            vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {
                return normalize((vec4(dir, 0.0) * matrix).xyz);
            }
            vec3 qrotate(vec4 q, vec3 v) {
                return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
            }
            void computeTransform(inout vec3 pos, inout vec3 nor, inout vec3 tang, vec4 uvBone12) {
                vec3 bonePos1 = texture2D(u_animationPositionTexture, uvBone12.xy).xyz;
                vec3 bonePos2 = texture2D(u_animationPositionTexture, uvBone12.zw).xyz;
                vec4 boneOrient1 = texture2D(u_animationOrientTexture, uvBone12.xy);
                vec4 boneOrient2 = texture2D(u_animationOrientTexture, uvBone12.zw);
                pos = (qrotate(boneOrient1, pos) + bonePos1) * boneWeights.x + (qrotate(boneOrient2, pos) + bonePos2) * boneWeights.y;
                nor = normalize(qrotate(boneOrient1, nor) * boneWeights.x + qrotate(boneOrient2, nor) * boneWeights.y);
                tang = normalize(qrotate(boneOrient1, tang) * boneWeights.x + qrotate(boneOrient2, tang) * boneWeights.y);
            }
            void computeFrameTransform(inout vec3 pos, inout vec3 nor, inout vec3 tang, vec3 instanceAnimationFrameFromToBlend) {
                vec4 dataOffset = boneIndices.xyxy + instanceAnimationFrameFromToBlend.xxyy * float(BONE_COUNT) + 0.5;
                vec4 fromUvsBone12 = vec4(floor(mod(dataOffset.xy, u_animationTextureSize.x)) + 0.5, floor(dataOffset.xy / u_animationTextureSize.x) + 0.5).xzyw / u_animationTextureSize.xyxy;
                vec4 toUvsBone12 = vec4(floor(mod(dataOffset.zw, u_animationTextureSize.x)) + 0.5, floor(dataOffset.zw / u_animationTextureSize.x) + 0.5).xzyw / u_animationTextureSize.xyxy;
                vec3 fromPos = pos; vec3 fromNor = nor; vec3 fromTang = tang;
                computeTransform(fromPos, fromTang, fromNor, fromUvsBone12);
                vec3 toPos = pos; vec3 toNor = nor; vec3 toTang = tang;
                computeTransform(toPos, toNor, toTang, toUvsBone12);
                pos = mix(fromPos, toPos, instanceAnimationFrameFromToBlend.z);
                nor = mix(fromNor, toNor, instanceAnimationFrameFromToBlend.z);
                tang = mix(fromTang, toTang, instanceAnimationFrameFromToBlend.z);
            }
            void main() {
                v_ao = ao;
                vec3 posLoop = position; vec3 norLoop = normal; vec3 tangLoop = tangent.xyz;
                computeFrameTransform(posLoop, norLoop, tangLoop, instanceAnimationFrameFromToBlend1);
                vec3 posLinear = position; vec3 norLinear = normal; vec3 tangLinear = tangent.xyz;
                computeFrameTransform(posLinear, norLinear, tangLinear, instanceAnimationFrameFromToBlend2);
                vec3 pos = mix(posLoop, posLinear, u_loopLinearBlend);
                vec3 nor = mix(norLoop, norLinear, u_loopLinearBlend);
                vec3 tang = mix(tangLoop, tangLinear, u_loopLinearBlend);
                pos = qrotate(instanceOrient, pos) + instancePos.xyz;
                nor = normalize(qrotate(instanceOrient, nor));
                tang = normalize(qrotate(instanceOrient, tang));
                vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
                v_worldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
                v_worldTangent = vec4(inverseTransformDirection(normalMatrix * tang, viewMatrix), tangent.w);
                v_worldNormal = inverseTransformDirection(normalMatrix * nor, viewMatrix);
                v_uv = uv;
                v_viewPosition = -mvPos.xyz;
                gl_Position = projectionMatrix * mvPos;
            }
        `,

        fragBlack: `
            uniform sampler2D u_blackTunnelTexture;
            uniform sampler2D u_matcapTexture;
            uniform sampler2D u_envTexture;
            uniform float u_sunFactor;
            uniform vec3 u_sunPosition;
            uniform vec3 u_ambientColor;
            uniform float u_blackTunnelRatio;
            uniform float u_frameIn;
            uniform float u_endRatio;
            #ifdef IS_CLONE
            uniform float u_alpha;
            #endif
            #include <astronautCommon_pars>
            void main() {
                #include <astronautCommon>
                vec2 uvDiff = cartesianToPolar(worldNormal);
                vec2 uvSpec = cartesianToPolar(reflection);
                vec3 blackTunnelEnvDiff = texture2D(u_blackTunnelTexture, 0.25 * uvDiff).rgb;
                vec3 blackTunnelEnvSpec = texture2D(u_blackTunnelTexture, 0.25 * uvSpec).rgb * (0.2 + metalness * 0.7) * 2.0;
                #ifdef IS_CLONE
                gl_FragColor.rgb = (blackTunnelEnvDiff * 3.5 * blackTunnelEnvDiff + blackTunnelEnvSpec * 3.5) * v_ao * u_alpha * (0.5 + fresnel * 0.9);
                gl_FragColor.a = mix(max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b)) * u_alpha, 0.0, u_endRatio);
                #else
                mat4 frameInRotation = rotation3d(vec3(1.0, 0.0, 0.0), 0.2 + 1.0 * u_frameIn);
                vec3 viewDir = (vec4(normalize(v_worldPosition), 1.0) * frameInRotation).xyz;
                vec3 x = normalize(vec3(viewDir.z, 0.0, -viewDir.x));
                vec3 y = cross(viewDir, x);
                vec2 uv = vec2(dot(x, worldNormal), dot(y, worldNormal)) * 0.495 + 0.5;
                vec3 sunPosition = u_sunPosition;
                vec3 L = normalize(sunPosition - v_worldPosition);
                float sunNdLRaw = dot(N, L);
                float sunNdL = saturate(sunNdLRaw);
                float matcapShading = 0.5 + 0.5 * (1.0 - texture2D(u_matcapTexture, uv).r);
                float zAxisShading = linearStep(-0.2, 1.3, worldNormal.z) * (0.65 + ao * 0.35);
                float metalMask = 1.0 - metalness;
                vec3 color = vec3(matcapShading * albedo);
                color += zAxisShading;
                color *= metalMask;
                color *= mix(u_ambientColor * (0.85 + sunNdL * 0.5), vec3(fresnel * 2.0), u_blackTunnelRatio * 0.5);
                color *= mix(0.5 + 0.5 * ao, 0.75 + 0.25 * ao, u_blackTunnelRatio);
                vec3 blackTunnelColor = (color * blackTunnelEnvSpec * (7.0 + metalness * 10.0) + albedo * blackTunnelEnvDiff * 1.6) * (1.3 - abs(reflection.z)) * (0.5 + ao * 0.5);
                gl_FragColor.rgb = color;
                gl_FragColor.rgb = mix(gl_FragColor.rgb, 0.3 * gl_FragColor.rgb + blackTunnelColor, clamp(u_blackTunnelRatio * 2.0 - 1.0 + ao, 0.0, 1.0));
                gl_FragColor.rgb = mix(u_bgColor, gl_FragColor.rgb, vec3(u_showRatio));
                gl_FragColor.rgb *= (0.3 + armb.r * 0.7);
                #ifdef IS_HELMET_GLASS
                gl_FragColor.a = 0.85;
                #else
                gl_FragColor.a = 1.0;
                #endif
                #endif
            }
        `,

        fragWhite: `
            uniform sampler2D u_matcapTexture;
            uniform float u_frameOutRatio;
            uniform float u_faceLedLight;
            uniform vec3 u_tintColor;
            uniform vec3 u_sunPosition;
            uniform vec3 u_ambientColor;
            uniform vec3 u_faceLedColor;
            uniform sampler2D u_envTexture;
            #include <astronautCommon_pars>
            void main() {
                #include <astronautCommon>
                mat4 frameInRotation = rotation3d(vec3(1.0, 0.0, 0.0), 1.0);
                vec3 viewDir = (vec4(normalize(v_worldPosition), 1.0) * frameInRotation).xyz;
                vec3 x = normalize(vec3(viewDir.z, 0.0, -viewDir.x));
                vec3 y = cross(viewDir, x);
                vec2 uv = vec2(dot(x, worldNormal), dot(y, worldNormal)) * 0.495 + 0.5;
                float zAxisShading = linearStep(-0.2, 1.3, worldNormal.z) * (0.65 + ao * 0.35);
                float outOfFrameRatio = linearStep(0.35, 1.0, u_frameOutRatio);
                vec3 sunPosition = u_sunPosition;
                vec3 L = normalize(sunPosition - v_worldPosition);
                float sunNdLRaw = dot(N, L);
                float sunNdL = saturate(sunNdLRaw);
                float matcapShading = 0.5 + 0.5 * (1.0 - texture2D(u_matcapTexture, uv).r);
                float metalMask = 1.0 - metalness;
                vec3 color = vec3(matcapShading * albedo);
                color += 0.8 * zAxisShading;
                color *= u_ambientColor * (0.85 + sunNdL * 0.5);
                color *= metalMask;
                color += (0.5 + 0.5 * outOfFrameRatio) * metalMask * (0.5 * (0.4 + 0.2 * ao + 0.5 * sunNdL) + 0.1 * sunNdL * sunNdL);
                color *= 0.7 + 0.3 * ao;
                color = mix(color * 0.75, color, outOfFrameRatio) * (0.7 + armb.r * 0.3);
                gl_FragColor.rgb = mix(u_bgColor, color, vec3(u_showRatio * 0.8 + 0.2));
                #ifndef IS_HELMET_GLASS
                gl_FragColor.rgb += outOfFrameRatio * max(worldNormal.z * 2.0 * sunNdL, metalness) * texture2D(u_envTexture, 1.2 * (uv - 0.5) + vec2(0.5, 0.5)).rgb * 0.75 * v_ao;
                #endif
                gl_FragColor.rgb = min(vec3(1.0), gl_FragColor.rgb + u_tintColor * (1.0 - u_frameOutRatio * 0.3) * (0.4 + gl_FragColor.b * 0.6));
                gl_FragColor.rgb *= 0.95 + mix(u_tintColor, vec3(1.0), v_ao) * 0.1;
                gl_FragColor.rgb *= mix(1.0, metalMask * 0.7 + 0.3, linearStep(0.8, 1.0, u_frameOutRatio));
                #ifdef IS_HELMET_GLASS
                gl_FragColor.a = 0.75 + fresnel * 0.25;
                #else
                gl_FragColor.a = 1.0;
                #endif
            }
        `,

        fragCard: `
            uniform sampler2D u_cardTexture;
            uniform sampler2D u_cardLedTexture;
            uniform vec2 u_cardUvOffset;
            uniform vec2 u_cardTextureSize;
            uniform vec3 u_cardColor;
            uniform float u_cardOpacity;
            varying vec2 v_uv;
            void main() {
                vec2 uv = v_uv / u_cardTextureSize;
                vec4 texel = texture2D(u_cardTexture, uv + u_cardUvOffset);
                vec3 ledTexture = pow(texture2D(u_cardLedTexture, fract(v_uv * vec2(20.0, 15.0))).rgb, vec3(2.2));
                float ledMask = dot(ledTexture, u_cardColor * texel.r);
                gl_FragColor.rgb = pow(ledTexture, vec3(1.0 / 2.2)) * ledMask * 4.5 * u_cardOpacity;
                gl_FragColor.a = clamp(texel.r * u_cardOpacity * 1.5, 0.0, 1.0);
            }
        `,

        vertGlass: `
            attribute float piece;
            uniform sampler2D u_positionTexture;
            uniform sampler2D u_orientTexture;
            uniform vec2 u_textureSize;
            uniform float u_frameFrom;
            uniform float u_frameTo;
            uniform float u_frameRatio;
            uniform float u_fragmentScale;
            varying vec3 v_viewPosition;
            varying vec3 v_localDir;
            vec3 qrotate(vec4 q, vec3 v) {
                return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
            }
            void main() {
                vec4 animationUvs = (vec4(piece, u_frameFrom, piece, u_frameTo) + 0.5) / u_textureSize.xyxy;
                vec3 piecePosFrom = texture2D(u_positionTexture, animationUvs.xy).xyz;
                vec4 pieceOrientFrom = texture2D(u_orientTexture, animationUvs.xy);
                vec3 piecePosTo = texture2D(u_positionTexture, animationUvs.zw).xyz;
                vec4 pieceOrientTo = texture2D(u_orientTexture, animationUvs.zw);
                float radius = length(position) * u_fragmentScale;
                vec3 dir = position / max(0.0001, radius);
                vec3 posFrom = qrotate(pieceOrientFrom, dir);
                vec3 posTo = qrotate(pieceOrientTo, dir);
                v_localDir = normalize(mix(posFrom, posTo, u_frameRatio));
                vec3 pos = v_localDir * radius + mix(piecePosFrom, piecePosTo, u_frameRatio);
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                v_viewPosition = mvPosition.xyz;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,

        fragGlass: `
            uniform sampler2D u_backgroundTexture;
            uniform vec2 u_resolution;
            varying vec3 v_viewPosition;
            varying vec3 v_localDir;
            void main() {
                vec3 fdx = dFdx(v_viewPosition);
                vec3 fdy = dFdy(v_viewPosition);
                vec3 viewNormal = normalize(cross(fdx, fdy));
                float alpha = abs(1.0 - viewNormal.z);
                vec2 uv = gl_FragCoord.xy / u_resolution.xy;
                vec2 refl = reflect(normalize(v_viewPosition), viewNormal).xy;
                vec2 uvOffset = refl.xy * 0.2 * vec2(u_resolution.x / u_resolution.y, 1.0);
                vec3 color;
                color.r = texture2D(u_backgroundTexture, uv + uvOffset * 1.15).r;
                color.g = texture2D(u_backgroundTexture, uv + uvOffset).g;
                color.b = texture2D(u_backgroundTexture, uv + uvOffset * 0.85).b;
                vec3 spectral = clamp(abs(mod(alpha * 8.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
                color += spectral * 0.85 * alpha;
                float glassAlpha = clamp(0.55 + alpha * 0.45, 0.0, 0.98);
                gl_FragColor = vec4(color, glassAlpha);
            }
        `,

        vertBlock: `
            attribute float a_instanceId;
            uniform float u_time;
            uniform float u_ratio;
            uniform float u_ratioInverse;
            varying vec3 v_worldPosition;
            varying vec3 v_worldNormal;
            varying vec3 v_localPosition;
            varying vec2 v_uv;
            varying vec3 v_viewPosition;
            varying float v_lengthRatio;
            vec3 deform(in vec3 pos) {
                float blockCount = float(BLOCK_COUNT);
                float ratio = mix(0.1, 1.0, u_ratioInverse);
                float lengthRatio = -pos.z / blockCount;
                float scalar = mix(0.25, ratio, lengthRatio);
                pos.x *= 1.0 + scalar * 0.5 * sin(lengthRatio * 6.283184);
                pos.y *= 1.0 + scalar * 0.5 * cos(lengthRatio * 6.283184 + 3.1415926);
                float angleRatio = smoothstep(0.25, 1.0, u_ratioInverse);
                float angle = (angleRatio + angleRatio * lengthRatio * lengthRatio * 1.0) * -6.283184;
                float s = sin(angle); float c = cos(angle);
                mat2 m = mat2(c, -s, s, c);
                pos.xy = m * pos.xy;
                pos.y += ratio * sin(ratio * lengthRatio * 3.141592 * 4.0) * 0.25;
                pos.z -= (cos(ratio * 1.5 + (1.0 - ratio) * lengthRatio * 3.141592 * 0.5) * 0.5 + 0.5 - 1.0) * blockCount;
                pos.z *= 1.0 + 16.0 * (ratio * lengthRatio * lengthRatio) + 2.0 * ratio * (sin(8.0 * lengthRatio) * 0.5 + 0.5);
                pos.z *= (1.0 - ratio * ratio * ratio) * 0.9 + 0.1;
                pos.z += blockCount / 4.0;
                return pos * 15.0;
            }
            vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {
                return normalize((vec4(dir, 0.0) * matrix).xyz);
            }
            void main() {
                float blockCount = float(BLOCK_COUNT);
                vec3 pos = position;
                pos.z -= a_instanceId;
                pos.z /= blockCount;
                float lengthRatio = -pos.z;
                pos.z *= blockCount;
                v_localPosition = pos;
                v_lengthRatio = lengthRatio;
                vec3 nor = deform(pos + normal * 0.01);
                pos = deform(pos);
                nor = normalize(nor - pos);
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                v_viewPosition = mvPosition.xyz;
                gl_Position = projectionMatrix * mvPosition;
                v_worldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
                v_worldNormal = inverseTransformDirection(normalMatrix * nor, viewMatrix);
                v_uv = uv;
            }
        `,

        fragBlock: `
            uniform sampler2D u_texture;
            uniform float u_ratioInverse;
            uniform vec3 u_fbm;
            varying vec3 v_localPosition;
            varying vec2 v_uv;
            varying vec3 v_worldPosition;
            varying vec3 v_worldNormal;
            varying float v_lengthRatio;
            uniform float u_time;
            vec4 hash(vec4 p4) {
                p4 = fract(p4 * vec4(0.1031, 0.1030, 0.0973, 0.1099));
                p4 += dot(p4, p4.wzxy + 33.33);
                return fract((p4.xxyz + p4.yzzw) * p4.zywx);
            }
            vec3 voronoi(const in vec4 x) {
                vec4 p = floor(x); vec4 f = fract(x);
                float id = 0.0; vec2 res = vec2(100.0);
                for (int l = -1; l <= 1; l++) {
                    for (int k = -1; k <= 1; k++) {
                        for (int j = -1; j <= 1; j++) {
                            for (int i = -1; i <= 1; i++) {
                                vec4 b = vec4(float(i), float(j), float(k), float(l));
                                vec4 r = vec4(b) - f + hash(p + b);
                                float d = dot(r, r);
                                float cond = max(sign(res.x - d), 0.0);
                                float nCond = 1.0 - cond;
                                float cond2 = nCond * max(sign(res.y - d), 0.0);
                                float nCond2 = 1.0 - cond2;
                                id = (dot(p + b, vec4(1.0, 57.0, 113.0, 421.0)) * cond) + (id * nCond);
                                res = vec2(d, res.x) * cond + res * nCond;
                                res.y = cond2 * d + nCond2 * res.y;
                            }
                        }
                    }
                }
                return vec3(sqrt(res), abs(id));
            }
            void main() {
                vec3 worldNormal = normalize(v_worldNormal);
                float shade = texture2D(u_texture, v_uv).r;
                float brightness = pow(v_lengthRatio, 5.0);
                float t = u_ratioInverse * -2.0 + u_time * 0.2;
                vec3 vn = voronoi(vec4(v_localPosition * 2.0 + vec3(0.0, 0.0, -t * 0.5), t * 0.25));
                vec4 rnd = hash(vec4(vn.z));
                float threshold = 0.05 + rnd.x * 0.1;
                float r = abs(vn.x - 0.5) * (1.75 + rnd.y * 0.5);
                float pattern = max(0.0, 1.0 - smoothstep(threshold - fwidth(r), threshold, r));
                // Lusion's signature electric royal blue
                vec3 color = mix(vec3(0.102, 0.184, 0.984), vec3(1.0), pattern);
                color *= (0.35 + shade);
                color += brightness;
                gl_FragColor = vec4(color, shade + brightness);
                gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), smoothstep(0.8, 1.0, u_ratioInverse) * 0.5);
                gl_FragColor.a *= mix(1.0, 0.15, pattern);
            }
        `,

        vertDiamond: `
            attribute vec3 a_instancePosition;
            attribute vec3 a_instanceRotationAxis;
            attribute vec4 a_instanceRand;
            attribute float thickness;
            uniform float u_time;
            uniform float u_aspect;
            uniform float u_activeRatio;
            varying vec3 v_viewNormal;
            varying float v_thickness;
            varying vec3 v_cameraPositionLS;
            varying vec3 v_positionLS;
            varying vec3 v_normalLS;
            varying vec4 v_orient;
            varying float v_fadeOut;
            #ifndef HALF_PI
            #define HALF_PI 1.5707963267948966
            #endif
            float linearStep(float edge0, float edge1, float x) {
                return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
            }
            vec3 qrotate(vec4 q, vec3 v) {
                return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
            }
            vec4 quaternion(vec3 axis, float halfAngle) {
                return vec4(axis * sin(halfAngle), cos(halfAngle));
            }
            void main() {
                float time = 0.5 * u_time + 4.0 * a_instanceRand.x;
                float scale = 0.75;
                vec3 pos = position;
                vec4 orient = quaternion(a_instanceRotationAxis, (0.5 + a_instanceRand.y) * time);
                pos = qrotate(orient, pos) * scale;
                vec3 nor = qrotate(orient, normal);
                vec3 instancePosition = a_instancePosition;
                instancePosition.y += 0.5 * u_time * (1.0 + a_instanceRand.x);
                float yLimit = 20.0 / u_aspect;
                instancePosition.y = mod(instancePosition.y, yLimit) - 0.5 * yLimit;
                v_fadeOut = abs(instancePosition.y) / (yLimit * 0.5);
                pos *= linearStep(a_instanceRand.w * 0.5, a_instanceRand.w * 0.5 + 0.5, u_activeRatio);
                pos += instancePosition;
                vec4 orientInv = vec4(-orient.xyz, orient.w);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                v_cameraPositionLS = qrotate(orientInv, (cameraPosition - instancePosition) / scale);
                v_positionLS = position * scale;
                v_normalLS = normal;
                v_orient = orient;
                v_viewNormal = normalMatrix * nor;
                v_thickness = thickness;
            }
        `,

        fragDiamond: `
            uniform vec3 u_color;
            uniform vec3 u_bgColor;
            uniform vec4 u_planes[25];
            uniform mat3 normalMatrix;
            varying vec3 v_viewNormal;
            varying float v_thickness;
            varying vec3 v_cameraPositionLS;
            varying vec3 v_positionLS;
            varying vec3 v_normalLS;
            varying vec4 v_orient;
            varying float v_fadeOut;
            float linearStep(float edge0, float edge1, float x) {
                return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
            }
            float plaIntersect(in vec3 ro, in vec3 rd, in vec4 p) {
                return -(dot(ro, p.xyz) + p.w) / dot(rd, p.xyz);
            }
            vec4 getColorShade(vec3 dir, vec3 vn) {
                float d = dot(dir, vn);
                float shade = (1.0 - max(0.0, vn.z)) * v_thickness * 5.0;
                shade *= (pow(linearStep(2.0, -1.0, d), 4.0) * 0.15 + pow(linearStep(1.0, -2.0, d), 5.0) * 7.0);
                vec3 rgb = mix(vec3(0.8), clamp(abs(mod((d + vn.z) * 12.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0), 1.0 - shade);
                return vec4((vec3(u_color) + rgb * 1.2) * shade, 0.035 + (1.0 - v_thickness) * shade * shade) * (1.0 - abs(vn.z));
            }
            vec3 qrotate(vec4 q, vec3 v) {
                return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
            }
            void main() {
                vec3 localDir = normalize(v_positionLS);
                vec3 viewNormal = normalize(v_viewNormal);
                float ior = 2.418;
                vec3 norLS = normalize(v_normalLS);
                vec3 refrLS = refract(normalize(v_positionLS - v_cameraPositionLS), norLS, 1.0 / ior);
                float dist = 100.0;
                vec3 planeDir = vec3(0.0);
                for (int i = 0; i < 25; i++) {
                    vec4 plane = u_planes[i];
                    plane.xyz *= -1.0;
                    plane.w *= 0.7501;
                    float hitDist = plaIntersect(v_positionLS + refrLS * 0.001, refrLS, plane);
                    if (hitDist > 0.0 && hitDist < dist) {
                        dist = hitDist;
                        planeDir = u_planes[i].xyz;
                    }
                }
                vec3 refrPosLS = v_positionLS + refrLS * dist;
                refrLS = refract(refrLS, planeDir, ior);
                vec3 refrLocalDir = qrotate(v_orient, normalize(refrPosLS));
                vec3 viewPlaneNor = normalMatrix * qrotate(v_orient, planeDir);
                vec4 frontColorShade = getColorShade(localDir, viewNormal);
                vec4 backColorShade = getColorShade(refrLocalDir, viewPlaneNor);
                gl_FragColor = frontColorShade * 1.5 + vec4(backColorShade.rgb * 0.75, backColorShade.a * 0.5);
                gl_FragColor.rgb = mix(u_bgColor, gl_FragColor.rgb, linearStep(0.0, 0.1, 1.0 - v_fadeOut));
                gl_FragColor.a = clamp(gl_FragColor.a * 1.5, 0.0, 1.0);
            }
        `,

        vertStickers: `
            attribute float instanceId;
            attribute vec4 instanceUvInfo;
            attribute vec4 instanceRands;
            uniform float u_time;
            uniform float u_activeRatio;
            uniform float u_aspect;
            uniform vec2 u_textureSize;
            varying float v_fadeOut;
            varying vec2 v_uv;
            vec4 hash42(vec2 p) {
                vec4 p4 = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
                p4 += dot(p4, p4.wzxy + 33.33);
                return fract((p4.xxyz + p4.yzzw) * p4.zywx);
            }
            vec2 rotate(vec2 v, float a) {
                float s = sin(a); float c = cos(a);
                mat2 m = mat2(c, s, -s, c);
                return m * v;
            }
            float linearStep(float edge0, float edge1, float x) {
                return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
            }
            void main() {
                vec3 pos = position;
                pos.xy *= instanceUvInfo.zw * u_textureSize * 0.007;
                float t = u_time * mix(0.06, 0.12, instanceRands.x) + instanceRands.y;
                float cycle = floor(t);
                float ratio = fract(t);
                vec4 cycleRands = hash42(vec2(cycle, instanceId));
                pos.xy = rotate(pos.xy, instanceRands.z * 6.28 + sign(cycleRands.z - 0.5) * u_time * mix(0.4, 0.8, cycleRands.y)) * linearStep(instanceRands.w * 0.4, instanceRands.w * 0.4 + 0.6, u_activeRatio);
                float yLimit = 8.0 / u_aspect;
                vec3 instancePos = vec3(mix(-7.0, 7.0, cycleRands.x), yLimit * mix(-1.0, 1.0, ratio), 20.0 + instanceId / float(COUNT));
                pos += instancePos;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                v_uv = instanceUvInfo.xy + instanceUvInfo.zw * vec2(uv.x, 1.0 - uv.y);
                v_uv.y = 1.0 - v_uv.y;
                v_fadeOut = 2.0 * abs(ratio - 0.5);
            }
        `,

        fragStickers: `
            uniform sampler2D u_texture;
            uniform vec3 u_bgColor;
            varying vec2 v_uv;
            varying float v_fadeOut;
            float linearStep(float edge0, float edge1, float x) {
                return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
            }
            void main() {
                vec4 tex = texture2D(u_texture, v_uv);
                gl_FragColor = tex;
                gl_FragColor.rgb = mix(u_bgColor, gl_FragColor.rgb, linearStep(0.0, 0.15, 1.0 - v_fadeOut));
                gl_FragColor.a *= linearStep(0.0, 0.15, 1.0 - v_fadeOut);
            }
        `
    };

    // Authentic Lusion sticker UV atlas
    const STICKER_DATA = [
        {x:1132,y:3,w:195,h:195},{x:744,y:3,w:195,h:256},{x:525,y:3,w:213,h:282},{x:242,y:3,w:277,h:286},
        {x:1055,y:633,w:209,h:209},{x:1076,y:398,w:209,h:209},{x:3,y:772,w:298,h:249},{x:945,y:3,w:181,h:249},
        {x:1291,y:389,w:160,h:197},{x:1055,y:848,w:83,h:122},{x:1132,y:204,w:167,h:179},{x:1270,y:828,w:192,h:193},
        {x:780,y:265,w:182,h:167},{x:564,y:445,w:294,h:184},{x:307,y:683,w:205,h:334},{x:864,y:438,w:206,h:189},
        {x:968,y:258,w:149,h:134},{x:734,y:635,w:165,h:382},{x:605,y:291,w:169,h:141},{x:302,y:445,w:256,h:232},
        {x:518,y:683,w:210,h:266},{x:242,y:295,w:357,h:144},{x:3,y:3,w:233,h:469},{x:905,y:633,w:144,h:340},
        {x:1270,y:613,w:187,h:209},{x:3,y:478,w:293,h:288}
    ];

    // ==========================================
    // 5. Texture & ARMB Packing Helpers
    // ==========================================
    function packArmb(armImg, baseImg) {
        const w = (armImg && armImg.naturalWidth) || (armImg && armImg.width) || 512;
        const h = (armImg && armImg.naturalHeight) || (armImg && armImg.height) || 512;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(w, 1);
        canvas.height = Math.max(h, 1);
        const ctx = canvas.getContext('2d');
        if (armImg && armImg.complete && armImg.naturalWidth > 0) {
            ctx.drawImage(armImg, 0, 0, canvas.width, canvas.height);
        }
        const armData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (baseImg && baseImg.complete && baseImg.naturalWidth > 0) {
            ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);
        }
        const baseData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d1 = armData.data;
        const d2 = baseData.data;
        for (let i = 0; i < d1.length; i += 4) {
            d1[i + 3] = d2[i + 0]; // Albedo into alpha
        }
        ctx.putImageData(armData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.needsUpdate = true;
        return tex;
    }

    function createLedTexture() {
        const e = document.createElement('canvas');
        e.width = e.height = 11;
        const t = e.getContext('2d');
        t.fillStyle = '#000';
        t.fillRect(0, 0, 11, 11);
        t.fillStyle = '#f00';
        t.fillRect(1, 1, 3, 9);
        t.fillStyle = '#0f0';
        t.fillRect(4, 1, 3, 9);
        t.fillStyle = '#00f';
        t.fillRect(7, 1, 3, 9);
        const r = new THREE.CanvasTexture(e);
        r.minFilter = THREE.LinearFilter;
        r.needsUpdate = true;
        return r;
    }

    function createPlaceholderTexture(color = '#222222') {
        const c = document.createElement('canvas');
        c.width = c.height = 2;
        const ctx = c.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 2, 2);
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
    }

    const fetchBuf = async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
        const buf = await res.arrayBuffer();
        return parseBuf(buf);
    };

    const fetchImg = (url) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.warn('[Lusion Astronaut] Image load fallback:', url);
            resolve(img);
        };
        img.src = url;
        if (img.complete && img.naturalWidth > 0) resolve(img);
    });

    const fetchTex = (url) => new Promise((resolve) => {
        new THREE.TextureLoader().load(url, resolve, undefined, () => {
            console.warn('[Lusion Astronaut] Texture load fallback:', url);
            resolve(createPlaceholderTexture());
        });
    });

    // ==========================================
    // 6. Master Lusion Astronaut Engine
    // ==========================================
    class LusionAstronautEngine {
        constructor() {
            this.container = null;
            this.canvas = null;
            this.renderer = null;
            this.scene = null;
            this.camera = null;
            this.isReady = false;
            this.isLoading = false;

            // Shared Uniforms
            this.sharedUniforms = {
                u_time: { value: 0 },
                u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                u_aspect: { value: window.innerWidth / window.innerHeight },
                u_whiteTunnelRatio: { value: 0 },
                u_tunnelTime: { value: 0 },
                u_bgColor: { value: new THREE.Color('#000000') }
            };

            // Astronaut & Clones
            this.CLONES_COUNT = 4;
            this.TOTAL_COUNT = 5;
            this.BONE_COUNT = 53;
            this.transformObjectList = [];
            this.astronautContainer = new THREE.Object3D();
            this.partIdList = ['helmet', 'helmet_glass', 'glove_shoes', 'wearpack', 'card'];
            this.meshes = {};
            this.cloneMeshes = {};
            this.materials = {};
            this.cardNoise = new Simple1DNoise();
            this.cardTime = 0;
            this.cardTextureSize = new THREE.Vector2(5, 23);
            this.isCardActive = false;

            // Broken Glass
            this.PIECE_COUNT = 946;
            this.glassContainer = new THREE.Object3D();
            this.glassMesh = null;
            this.glassFrameCount = 0;

            // White / Blue Tunnel Blocks
            this.whiteTunnelContainer = new THREE.Object3D();
            this.tunnelBlockMesh = null;
            this.tunnelFbm = new BrownianMotion();
            this.tunnelFbm._positionAmplitude = 2;
            this.tunnelFbm._positionFrequency = 1;

            // Diamonds
            this.diamondsMesh = null;

            // Stickers
            this.stickersMesh = null;

            // Scroll State
            this.scrollProgress = 0;
            this.ratios = {
                blackFrameIn: 0,
                blackTitle: 0,
                blackTunnel: 0,
                whiteTunnel: 0,
                whiteFrameOut: 0,
                whiteFrameBreak: 0,
                astronautDrop: 0,
                astronautWait: 0
            };

            // Mouse & Parallax
            this.mouse = new THREE.Vector2(0, 0);
            this.targetMouse = new THREE.Vector2(0, 0);

            // Reusable Math Caches
            this._p0 = new THREE.Vector3();
            this._p1 = new THREE.Vector3();
            this._q0 = new THREE.Quaternion();
            this._q1 = new THREE.Quaternion();
            this._m0 = new THREE.Matrix4();
            this._v0 = new THREE.Vector3();
            this._v1 = new THREE.Vector3();
            this._e0 = new THREE.Euler(0, 0, 0, 'YXZ');

            // Bounds
            this._boundOnScroll = this.onScroll.bind(this);
            this._boundOnResize = this.onResize.bind(this);
            this._boundOnMouseMove = this.onMouseMove.bind(this);
        }

        async init(containerEl) {
            if (this.isLoading || this.isReady) return;
            this.isLoading = true;
            this.container = containerEl || document.getElementById('work-together');
            if (!this.container) {
                console.warn('[Lusion Astronaut] Container element not found.');
                return;
            }

            console.log('[Lusion Astronaut] Initializing 3D engine...');

            // Canvas
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'lusion-astronaut-canvas';
            this.canvas.style.position = 'fixed';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.width = '100vw';
            this.canvas.style.height = '100vh';
            this.canvas.style.pointerEvents = 'none';
            this.canvas.style.zIndex = '5';
            this.canvas.style.opacity = '0';
            this.canvas.style.transition = 'opacity 0.4s ease, background-color 0.4s ease';
            document.body.appendChild(this.canvas);

            // Three Renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.0;

            // Scene & Camera
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 500);
            this.camera.position.set(0, 0, 25);
            this.scene.add(this.camera);

            // Add main groups
            this.scene.add(this.whiteTunnelContainer);
            this.scene.add(this.astronautContainer);
            this.scene.add(this.glassContainer);

            // Setup Transforms for 1 main astronaut + 4 clones
            for (let e = 0; e < this.TOTAL_COUNT; e++) {
                const t = new THREE.Object3D();
                t.position.set(0, 0, 0);
                t.rotation.set(0, 0, 0);
                t.userData.timeShift = e === 0 ? 0 : 2 * Math.random();
                t.userData.cloneTimeShift = Math.random();
                t.userData.motion = new BrownianMotion();
                t.userData.positionDynamic = new SecondOrderDynamics(new THREE.Vector3(), 1, 0.65, 1.3);
                t.userData.rotationDynamic = new SecondOrderDynamics(new THREE.Vector3(), 1, 0.85, 1.1);
                t.userData.pauseLoopTime = 0;
                t.userData.animationTime = 0;
                t.userData.deltaTimeMultiplier = 1;
                this.transformObjectList.push(t);
            }

            // Load all assets
            try {
                await this.loadAssets();
                console.log('[Lusion Astronaut] All authentic Lusion assets loaded successfully!');
            } catch (err) {
                console.error('[Lusion Astronaut] Fatal error during loadAssets:', err);
                window.__lusionError = (err && err.stack) || String(err);
            }

            // Event Listeners
            window.addEventListener('scroll', this._boundOnScroll, { passive: true });
            document.addEventListener('scroll', this._boundOnScroll, { passive: true });
            const scroller = document.querySelector('.ll-scroller') || document.querySelector('.js-scroller');
            if (scroller) scroller.addEventListener('scroll', this._boundOnScroll, { passive: true });
            window.addEventListener('resize', this._boundOnResize, { passive: true });
            window.addEventListener('mousemove', this._boundOnMouseMove, { passive: true });

            this.isReady = true;
            this.isLoading = false;

            // Start Animation Loop
            this.lastTime = performance.now();
            this.animate = this.render.bind(this);
            requestAnimationFrame(this.animate);

            this.onScroll();
        }

        async loadAssets() {
            // 1. Textures & Images
            const [
                faceTex,
                matcapTex,
                earthTex,
                stickersTex,
                whiteBlockTex,
                hArmImg, hBaseImg, hNorTex,
                wArmImg, wBaseImg, wNorTex,
                gArmImg, gBaseImg, gNorTex
            ] = await Promise.all([
                fetchTex('/assets/textures/tunnels/astronaut/face.png'),
                fetchTex('/assets/textures/tunnels/white_matcap.jpg'),
                fetchTex('/assets/textures/tunnels/earth.webp'),
                fetchTex('/assets/textures/tunnels/stickers.png'),
                fetchTex('/assets/textures/tunnels/white_block.webp'),
                fetchImg('/assets/textures/tunnels/astronaut/astronaut_helmet_arm.webp'),
                fetchImg('/assets/textures/tunnels/astronaut/astronaut_helmet_base.webp'),
                fetchTex('/assets/textures/tunnels/astronaut/astronaut_helmet_nor.webp'),
                fetchImg('/assets/textures/tunnels/astronaut/astronaut_wearpack_arm.webp'),
                fetchImg('/assets/textures/tunnels/astronaut/astronaut_wearpack_base.webp'),
                fetchTex('/assets/textures/tunnels/astronaut/astronaut_wearpack_nor.webp'),
                fetchImg('/assets/textures/tunnels/astronaut/astronaut_glove_shoes_arm.webp'),
                fetchImg('/assets/textures/tunnels/astronaut/astronaut_glove_shoes_base.webp'),
                fetchTex('/assets/textures/tunnels/astronaut/astronaut_glove_shoes_nor.webp')
            ]);

            faceTex.minFilter = faceTex.magFilter = THREE.NearestFilter;
            matcapTex.minFilter = THREE.LinearFilter;
            earthTex.minFilter = THREE.LinearFilter;
            stickersTex.minFilter = THREE.LinearFilter;

            const ledTex = createLedTexture();

            // Packed ARMB textures
            const armbTextures = {
                helmet: packArmb(hArmImg, hBaseImg),
                wearpack: packArmb(wArmImg, wBaseImg),
                glove_shoes: packArmb(gArmImg, gBaseImg)
            };

            const norTextures = {
                helmet: hNorTex,
                wearpack: wNorTex,
                glove_shoes: gNorTex
            };

            // 2. Binary Models
            const [
                geoHelmet,
                geoHelmetGlass,
                geoWearpack,
                geoGloveShoes,
                inAnimGeo,
                outAnimGeo,
                animGeo,
                glassGeo,
                glassAnimGeo,
                diamondGeo,
                tunnelBlockBaseGeo,
                tunnelBlockWallGeo
            ] = await Promise.all([
                fetchBuf('/assets/models/tunnels/astronaut_helmet.buf'),
                fetchBuf('/assets/models/tunnels/astronaut_helmet_glass.buf'),
                fetchBuf('/assets/models/tunnels/astronaut_wearpack.buf'),
                fetchBuf('/assets/models/tunnels/astronaut_glove_shoes.buf'),
                fetchBuf('/assets/models/tunnels/astronaut_in_animation.buf'),
                fetchBuf('/assets/models/tunnels/astronaut_out_animation.buf'),
                fetchBuf('/assets/models/tunnels/astronaut_animations.buf'),
                fetchBuf('/assets/models/tunnels/broken_glass.buf'),
                fetchBuf('/assets/models/tunnels/broken_glass_animation.buf'),
                fetchBuf('/assets/models/tunnels/diamond.buf'),
                fetchBuf('/assets/models/tunnels/tunnel_block_base.buf'),
                fetchBuf('/assets/models/tunnels/tunnel_block_wall.buf')
            ]);

            this.inAnimation = inAnimGeo;
            this.outAnimation = outAnimGeo;

            // 3. Process Bone Animation Data Texture
            const animPosArray = animGeo.attributes.position.array;
            const animOrientArray = animGeo.attributes.orient.array;
            const numKeyframes = animPosArray.length / 3;
            this.animFrameCount = numKeyframes / this.BONE_COUNT;

            const animTexW = Math.ceil(Math.sqrt(numKeyframes));
            const animTexH = Math.ceil(numKeyframes / animTexW);
            const totalTexels = animTexW * animTexH;

            const posTexData = new Float32Array(totalTexels * 4);
            const orientTexData = new Float32Array(totalTexels * 4);

            for (let p = 0, g = 0, v = 0; p < numKeyframes; p++, g += 3, v += 4) {
                posTexData[v + 0] = animPosArray[g + 0];
                posTexData[v + 1] = animPosArray[g + 1];
                posTexData[v + 2] = animPosArray[g + 2];
                posTexData[v + 3] = 1;

                orientTexData[v + 0] = animOrientArray[v + 0];
                orientTexData[v + 1] = animOrientArray[v + 1];
                orientTexData[v + 2] = animOrientArray[v + 2];
                orientTexData[v + 3] = animOrientArray[v + 3];
            }

            const animPosTex = new THREE.DataTexture(posTexData, animTexW, animTexH, THREE.RGBAFormat, THREE.FloatType);
            animPosTex.flipY = false;
            animPosTex.needsUpdate = true;

            const animOrientTex = new THREE.DataTexture(orientTexData, animTexW, animTexH, THREE.RGBAFormat, THREE.FloatType);
            animOrientTex.flipY = false;
            animOrientTex.needsUpdate = true;

            // Instance Attributes
            this.instancePosAttribute = new THREE.InstancedBufferAttribute(new Float32Array(3), 3);
            this.instancePosAttribute.usage = THREE.DynamicDrawUsage;
            this.instanceOrientAttribute = new THREE.InstancedBufferAttribute(new Float32Array(4), 4);
            this.instanceOrientAttribute.usage = THREE.DynamicDrawUsage;
            this.instanceAnimBlend1 = new THREE.InstancedBufferAttribute(new Float32Array(3), 3);
            this.instanceAnimBlend1.usage = THREE.DynamicDrawUsage;
            this.instanceAnimBlend2 = new THREE.InstancedBufferAttribute(new Float32Array(3), 3);
            this.instanceAnimBlend2.usage = THREE.DynamicDrawUsage;

            // Clones Instance Attributes
            this.instanceClonePos = new THREE.InstancedBufferAttribute(new Float32Array(this.CLONES_COUNT * 3), 3);
            this.instanceClonePos.usage = THREE.DynamicDrawUsage;
            this.instanceCloneOrient = new THREE.InstancedBufferAttribute(new Float32Array(this.CLONES_COUNT * 4), 4);
            this.instanceCloneOrient.usage = THREE.DynamicDrawUsage;
            this.instanceCloneAnimBlend1 = new THREE.InstancedBufferAttribute(new Float32Array(this.CLONES_COUNT * 3), 3);
            this.instanceCloneAnimBlend1.usage = THREE.DynamicDrawUsage;
            this.instanceCloneAnimBlend2 = new THREE.InstancedBufferAttribute(new Float32Array(this.CLONES_COUNT * 3), 3);
            this.instanceCloneAnimBlend2.usage = THREE.DynamicDrawUsage;

            // Build Astronaut Geometries
            const geos = {
                helmet: geoHelmet,
                helmet_glass: geoHelmetGlass,
                wearpack: geoWearpack,
                glove_shoes: geoGloveShoes
            };

            // Card Face Geometry bound to Head Bone [0, 1] with weights [0.72, 0.28]
            const cardGeo = new THREE.PlaneGeometry(0.24, 0.17).translate(0, 1.685, 0.12);
            cardGeo.setAttribute('boneIndices', new THREE.BufferAttribute(new Float32Array([0, 1, 0, 1, 0, 1, 0, 1]), 2));
            cardGeo.setAttribute('boneWeights', new THREE.BufferAttribute(new Float32Array([0.72, 0.28, 0.72, 0.28, 0.72, 0.28, 0.72, 0.28]), 2));
            cardGeo.setAttribute('tangent', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]), 4));
            geos['card'] = cardGeo;

            // Uniform sets
            this.astronautSharedUniforms = {
                u_time: this.sharedUniforms.u_time,
                u_animationPositionTexture: { value: animPosTex },
                u_animationOrientTexture: { value: animOrientTex },
                u_animationTextureSize: { value: new THREE.Vector2(animTexW, animTexH) },
                u_frameCount: { value: this.animFrameCount },
                u_bgColor: this.sharedUniforms.u_bgColor,
                u_showRatio: { value: 1.0 },
                u_loopLinearBlend: { value: 0 },
                u_ambientColor: { value: new THREE.Color('#566d80') }
            };

            this.astronautWhiteUniforms = {
                ...this.astronautSharedUniforms,
                u_matcapTexture: { value: matcapTex },
                u_frameOutRatio: { value: 0 },
                u_whiteTunnelRatio: { value: 0 },
                u_faceLedLight: { value: 0 },
                u_faceLedColor: { value: new THREE.Color('#aaaafb') },
                u_tintColor: { value: new THREE.Color('#2533c2') },
                u_sunPosition: { value: new THREE.Vector3(-20, 0, 22) },
                u_envTexture: { value: earthTex }
            };

            this.astronautBlackUniforms = {
                ...this.astronautSharedUniforms,
                u_matcapTexture: { value: matcapTex },
                u_frameIn: { value: 0 },
                u_blackTunnelRatio: { value: 0 },
                u_endRatio: { value: 0 },
                u_blackTunnelTexture: { value: earthTex },
                u_sunFactor: { value: 1 },
                u_sunPosition: { value: new THREE.Vector3(-20, 0, 22) },
                u_envTexture: { value: earthTex }
            };

            this.cloneUniforms = {
                u_alpha: { value: 0 }
            };

            // Instantiate Astronaut Parts
            for (const partId of this.partIdList) {
                const baseGeo = geos[partId];
                const instGeo = new THREE.InstancedBufferGeometry();
                for (const attrName in baseGeo.attributes) {
                    instGeo.setAttribute(attrName, baseGeo.attributes[attrName]);
                }
                if (baseGeo.index) instGeo.setIndex(baseGeo.index);

                instGeo.setAttribute('instancePos', this.instancePosAttribute);
                instGeo.setAttribute('instanceOrient', this.instanceOrientAttribute);
                instGeo.setAttribute('instanceAnimationFrameFromToBlend1', this.instanceAnimBlend1);
                instGeo.setAttribute('instanceAnimationFrameFromToBlend2', this.instanceAnimBlend2);

                const partArmb = armbTextures[partId === 'helmet_glass' || partId === 'card' ? 'helmet' : partId];
                const partNor = norTextures[partId === 'helmet_glass' || partId === 'card' ? 'helmet' : partId];

                const whiteMatUniforms = {
                    ...this.astronautWhiteUniforms,
                    u_armbTexture: { value: partArmb },
                    u_norTexture: { value: partNor }
                };

                const blackMatUniforms = {
                    ...this.astronautBlackUniforms,
                    u_armbTexture: { value: partArmb },
                    u_norTexture: { value: partNor }
                };

                if (partId === 'card') {
                    const whiteMat = new THREE.ShaderMaterial({
                        uniforms: {
                            ...this.astronautSharedUniforms,
                            u_cardLedTexture: { value: ledTex },
                            u_cardTexture: { value: faceTex },
                            u_cardColor: { value: new THREE.Color('#99ffff') },
                            u_cardUvOffset: { value: new THREE.Vector2(0, 0) },
                            u_cardTextureSize: { value: this.cardTextureSize },
                            u_cardOpacity: { value: 1 }
                        },
                        vertexShader: SHADERS.vertAstronaut,
                        fragmentShader: SHADERS.fragCard,
                        side: THREE.DoubleSide,
                        transparent: true,
                        depthTest: false,
                        depthWrite: false,
                        blending: THREE.AdditiveBlending
                    });
                    whiteMat.defines.BONE_COUNT = this.BONE_COUNT;
                    this.materials[partId] = { white: whiteMat, black: whiteMat };
                } else {
                    const whiteMat = new THREE.ShaderMaterial({
                        uniforms: whiteMatUniforms,
                        vertexShader: SHADERS.vertAstronaut,
                        fragmentShader: SHADERS.fragWhite,
                        side: THREE.DoubleSide,
                        transparent: true
                    });
                    whiteMat.defines.BONE_COUNT = this.BONE_COUNT;
                    whiteMat.defines.IS_WHITE = true;
                    if (partId === 'helmet_glass') whiteMat.defines.IS_HELMET_GLASS = true;

                    const blackMat = new THREE.ShaderMaterial({
                        uniforms: blackMatUniforms,
                        vertexShader: SHADERS.vertAstronaut,
                        fragmentShader: SHADERS.fragBlack,
                        side: THREE.DoubleSide,
                        transparent: true
                    });
                    blackMat.defines.BONE_COUNT = this.BONE_COUNT;
                    blackMat.defines.IS_BLACK = true;

                    this.materials[partId] = { white: whiteMat, black: blackMat };
                }

                const mesh = new THREE.Mesh(instGeo, this.materials[partId].black);
                mesh.frustumCulled = false;
                this.meshes[partId] = mesh;
                this.astronautContainer.add(mesh);

                // Trailing Clones
                if (partId !== 'card') {
                    const cloneGeo = new THREE.InstancedBufferGeometry();
                    for (const attrName in baseGeo.attributes) {
                        cloneGeo.setAttribute(attrName, baseGeo.attributes[attrName]);
                    }
                    if (baseGeo.index) cloneGeo.setIndex(baseGeo.index);

                    cloneGeo.setAttribute('instancePos', this.instanceClonePos);
                    cloneGeo.setAttribute('instanceOrient', this.instanceCloneOrient);
                    cloneGeo.setAttribute('instanceAnimationFrameFromToBlend1', this.instanceCloneAnimBlend1);
                    cloneGeo.setAttribute('instanceAnimationFrameFromToBlend2', this.instanceCloneAnimBlend2);

                    const cloneMat = new THREE.ShaderMaterial({
                        uniforms: { ...blackMatUniforms, ...this.cloneUniforms },
                        vertexShader: SHADERS.vertAstronaut,
                        fragmentShader: SHADERS.fragBlack,
                        side: THREE.DoubleSide,
                        transparent: true,
                        blending: THREE.AdditiveBlending,
                        depthTest: false
                    });
                    cloneMat.defines.BONE_COUNT = this.BONE_COUNT;
                    cloneMat.defines.IS_BLACK = true;
                    cloneMat.defines.IS_CLONE = true;

                    const cloneMesh = new THREE.Mesh(cloneGeo, cloneMat);
                    cloneMesh.frustumCulled = false;
                    cloneMesh.renderOrder = 1000;
                    this.cloneMeshes[partId] = cloneMesh;
                    this.astronautContainer.add(cloneMesh);
                }
            }

            // 4. Broken Glass Shatter Mesh
            const glassPosArray = glassAnimGeo.attributes.position.array;
            const glassNumFrames = glassPosArray.length / (this.PIECE_COUNT * 3);
            this.glassFrameCount = glassNumFrames;

            const glassPosTexData = new Float32Array((glassPosArray.length / 3) * 4);
            for (let a = 0, l = 0; a < glassPosArray.length; a += 3, l += 4) {
                glassPosTexData[l + 0] = glassPosArray[a + 0];
                glassPosTexData[l + 1] = glassPosArray[a + 1];
                glassPosTexData[l + 2] = glassPosArray[a + 2];
                glassPosTexData[l + 3] = 0;
            }

            const glassPosTex = new THREE.DataTexture(glassPosTexData, this.PIECE_COUNT, glassNumFrames, THREE.RGBAFormat, THREE.FloatType);
            glassPosTex.needsUpdate = true;

            const glassOrientTex = new THREE.DataTexture(glassAnimGeo.attributes.orient.array, this.PIECE_COUNT, glassNumFrames, THREE.RGBAFormat, THREE.FloatType);
            glassOrientTex.needsUpdate = true;

            this.glassUniforms = {
                u_backgroundTexture: { value: matcapTex },
                u_resolution: this.sharedUniforms.u_resolution,
                u_positionTexture: { value: glassPosTex },
                u_orientTexture: { value: glassOrientTex },
                u_textureSize: { value: new THREE.Vector2(this.PIECE_COUNT, glassNumFrames) },
                u_frameFrom: { value: 0 },
                u_frameTo: { value: 0 },
                u_frameRatio: { value: 0 },
                u_fragmentScale: { value: 1.0 }
            };

            const glassMaterial = new THREE.ShaderMaterial({
                uniforms: this.glassUniforms,
                vertexShader: SHADERS.vertGlass,
                fragmentShader: SHADERS.fragGlass,
                transparent: true,
                extensions: { derivatives: true }
            });

            this.glassMesh = new THREE.Mesh(glassGeo, glassMaterial);
            this.glassMesh.frustumCulled = false;
            this.glassMesh.renderOrder = 2000;
            this.glassMesh.visible = false;
            this.glassContainer.add(this.glassMesh);

            // 5. White / Blue Tunnel Blocks Corridor
            const BLOCK_COUNT = 16;
            const blockInstGeo = new THREE.InstancedBufferGeometry();
            for (const c in tunnelBlockWallGeo.attributes) blockInstGeo.setAttribute(c, tunnelBlockWallGeo.attributes[c]);
            blockInstGeo.setIndex(tunnelBlockWallGeo.index);
            const blockIds = new Float32Array(BLOCK_COUNT);
            for (let c = 0; c < BLOCK_COUNT; c++) blockIds[c] = c;
            blockInstGeo.setAttribute('a_instanceId', new THREE.InstancedBufferAttribute(blockIds, 1));

            this.blockUniforms = {
                u_ratio: this.sharedUniforms.u_whiteTunnelRatio,
                u_texture: { value: whiteBlockTex },
                u_ratioInverse: { value: 1.0 },
                u_fbm: { value: this.tunnelFbm._position },
                u_time: this.sharedUniforms.u_time
            };

            const blockMaterial = new THREE.ShaderMaterial({
                uniforms: this.blockUniforms,
                vertexShader: SHADERS.vertBlock,
                fragmentShader: SHADERS.fragBlock,
                extensions: { derivatives: true }
            });
            blockMaterial.defines.BLOCK_COUNT = BLOCK_COUNT;

            this.tunnelBlockMesh = new THREE.Mesh(blockInstGeo, blockMaterial);
            this.tunnelBlockMesh.frustumCulled = false;
            this.tunnelBlockMesh.visible = false;
            this.whiteTunnelContainer.add(this.tunnelBlockMesh);

            // 6. Diamonds Mesh
            const diamondInstGeo = new THREE.InstancedBufferGeometry();
            for (const u in diamondGeo.attributes) diamondInstGeo.attributes[u] = diamondGeo.attributes[u];
            diamondInstGeo.index = diamondGeo.index;

            const rnd = math.getSeedRandomFn('diamonds-3');
            const DIAMOND_COUNT = 64;
            const dPos = new Float32Array(DIAMOND_COUNT * 3);
            const dRot = new Float32Array(DIAMOND_COUNT * 3);
            const dRnd = new Float32Array(DIAMOND_COUNT * 4);
            const tempVec = new THREE.Vector3();

            for (let u = 0, f = 0, p = 0; u < DIAMOND_COUNT; u++, f += 3, p += 4) {
                dPos[f] = 16 * (rnd() * 2 - 1);
                dPos[f + 1] = 16 * (rnd() * 2 - 1);
                dPos[f + 2] = 19 - (DIAMOND_COUNT - u - 1) / (DIAMOND_COUNT - 1) * 8;
                tempVec.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();
                dRot[f] = tempVec.x;
                dRot[f + 1] = tempVec.y;
                dRot[f + 2] = tempVec.z;
                dRnd[p] = rnd();
                dRnd[p + 1] = rnd();
                dRnd[p + 2] = rnd();
                dRnd[p + 3] = rnd();
            }

            diamondInstGeo.setAttribute('a_instancePosition', new THREE.InstancedBufferAttribute(dPos, 3));
            diamondInstGeo.setAttribute('a_instanceRotationAxis', new THREE.InstancedBufferAttribute(dRot, 3));
            diamondInstGeo.setAttribute('a_instanceRand', new THREE.InstancedBufferAttribute(dRnd, 4));

            const diamondPlanes = [
                -0.694747, 0.694747, 0.186157, -0.239229, -0.50859, 0.694747, 0.50859, -0.239229,
                -0.186157, 0.694747, 0.694747, -0.239229, 0.186157, 0.694747, 0.694747, -0.239229,
                0.50859, 0.694747, 0.50859, -0.239229, 0.694747, 0.694747, 0.186157, -0.239229,
                0.694747, 0.694747, -0.186157, -0.239229, 0.50859, 0.694747, -0.50859, -0.239229,
                0.186157, 0.694747, -0.694746, -0.239229, -0.186156, 0.694747, -0.694747, -0.239229,
                -0.508589, 0.694747, -0.50859, -0.239229, -0.694747, 0.694747, -0.186157, -0.239229,
                -0.694747, -0.694747, 0.186157, -0.455518, -0.50859, -0.694747, 0.50859, -0.455518,
                -0.186157, -0.694747, 0.694747, -0.455518, 0.186157, -0.694747, 0.694747, -0.455518,
                0.50859, -0.694747, 0.50859, -0.455518, 0.694746, -0.694747, 0.186157, -0.455518,
                0.694746, -0.694747, -0.186157, -0.455518, 0.50859, -0.694747, -0.50859, -0.455518,
                0.186157, -0.694747, -0.694746, -0.455518, -0.186156, -0.694747, -0.694747, -0.455518,
                -0.508589, -0.694747, -0.50859, -0.455518, -0.694747, -0.694747, -0.186157, -0.455518,
                0, -1, 0, -0.34434
            ];

            const planesVec4 = [];
            for (let i = 0; i < 25; i++) {
                const o = i * 4;
                planesVec4.push(new THREE.Vector4(
                    diamondPlanes[o] !== undefined ? diamondPlanes[o] : 0,
                    diamondPlanes[o + 1] !== undefined ? diamondPlanes[o + 1] : 0,
                    diamondPlanes[o + 2] !== undefined ? diamondPlanes[o + 2] : 0,
                    diamondPlanes[o + 3] !== undefined ? diamondPlanes[o + 3] : 0
                ));
            }

            this.diamondMaterial = new THREE.ShaderMaterial({
                vertexShader: SHADERS.vertDiamond,
                fragmentShader: SHADERS.fragDiamond,
                uniforms: {
                    u_time: this.sharedUniforms.u_time,
                    u_activeRatio: { value: 0 },
                    u_color: { value: new THREE.Color('#689aff') },
                    u_planes: { value: planesVec4 },
                    u_bgColor: this.sharedUniforms.u_bgColor,
                    u_aspect: this.sharedUniforms.u_aspect
                },
                transparent: true,
                blending: THREE.CustomBlending,
                blendEquation: THREE.AddEquation,
                blendSrc: THREE.OneFactor,
                blendDst: THREE.ZeroFactor,
                blendEquationAlpha: THREE.AddEquation,
                blendSrcAlpha: THREE.OneFactor,
                blendDstAlpha: THREE.OneFactor
            });

            this.diamondsMesh = new THREE.Mesh(diamondInstGeo, this.diamondMaterial);
            this.diamondsMesh.frustumCulled = false;
            this.whiteTunnelContainer.add(this.diamondsMesh);

            // 7. Pop-Art Floating Stickers
            const STICKERS_COUNT = 26;
            const stickerPlaneGeo = new THREE.PlaneGeometry(1, 1);
            const stickerInstGeo = new THREE.InstancedBufferGeometry();
            for (const l in stickerPlaneGeo.attributes) stickerInstGeo.attributes[l] = stickerPlaneGeo.attributes[l];
            stickerInstGeo.index = stickerPlaneGeo.index;

            const stId = new Float32Array(STICKERS_COUNT);
            const stUv = new Float32Array(STICKERS_COUNT * 4);
            const stRnd = new Float32Array(STICKERS_COUNT * 4);
            const texW = 1465, texH = 1024;

            for (let l = 0, u = 0; l < STICKERS_COUNT; l++, u += 4) {
                stId[l] = l / STICKERS_COUNT;
                const f = STICKER_DATA[l % STICKER_DATA.length];
                stUv[u + 0] = f.x / texW;
                stUv[u + 1] = f.y / texH;
                stUv[u + 2] = f.w / texW;
                stUv[u + 3] = f.h / texH;
                stRnd[u + 0] = Math.random();
                stRnd[u + 1] = Math.random();
                stRnd[u + 2] = Math.random();
                stRnd[u + 3] = Math.random();
            }

            stickerInstGeo.setAttribute('instanceId', new THREE.InstancedBufferAttribute(stId, 1));
            stickerInstGeo.setAttribute('instanceUvInfo', new THREE.InstancedBufferAttribute(stUv, 4));
            stickerInstGeo.setAttribute('instanceRands', new THREE.InstancedBufferAttribute(stRnd, 4));

            this.stickersMaterial = new THREE.ShaderMaterial({
                vertexShader: SHADERS.vertStickers,
                fragmentShader: SHADERS.fragStickers,
                uniforms: {
                    u_time: this.sharedUniforms.u_time,
                    u_activeRatio: { value: 0 },
                    u_texture: { value: stickersTex },
                    u_textureSize: { value: new THREE.Vector2(texW, texH) },
                    u_bgColor: this.sharedUniforms.u_bgColor,
                    u_aspect: this.sharedUniforms.u_aspect
                },
                transparent: true
            });
            this.stickersMaterial.defines.COUNT = STICKERS_COUNT;

            this.stickersMesh = new THREE.Mesh(stickerInstGeo, this.stickersMaterial);
            this.stickersMesh.frustumCulled = false;
            this.stickersMesh.visible = false;
            this.whiteTunnelContainer.add(this.stickersMesh);
        }

        onMouseMove(e) {
            this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        }

        onResize() {
            if (!this.renderer) return;
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
            this.sharedUniforms.u_resolution.value.set(w, h);
            this.sharedUniforms.u_aspect.value = w / h;
        }

        onScroll() {
            if (!this.container) return;
            const rect = this.container.getBoundingClientRect();
            const winH = window.innerHeight;

            const inView = rect.bottom > 0 && rect.top < winH;
            if (this.canvas) {
                this.canvas.style.opacity = inView ? '1' : '0';
                this.canvas.style.pointerEvents = 'none';
            }

            const totalTravel = rect.height - winH;
            const scrolledDist = -rect.top;
            const p = math.clamp(scrolledDist / (totalTravel > 0 ? totalTravel : 1), 0, 1);
            this.scrollProgress = p;

            // Ratios mapped matching Lusion's range curves
            this.ratios.blackFrameIn = math.saturate(p / 0.15);
            this.ratios.blackTitle = math.fit(p, 0.08, 0.28, 0, 1);
            this.ratios.blackTunnel = math.fit(p, 0.12, 0.38, 0, 1);
            this.ratios.whiteTunnel = math.fit(p, 0.35, 0.65, 0, 1);
            this.ratios.whiteFrameOut = math.fit(p, 0.60, 0.74, 0, 1);
            this.ratios.whiteFrameBreak = math.fit(p, 0.72, 0.85, 0, 1);
            this.ratios.astronautDrop = math.fit(p, 0.82, 0.94, 0, 1);
            this.ratios.astronautWait = math.fit(p, 0.92, 1.00, 0, 1);
        }

        updateTransforms(dt) {
            if (!this.inAnimation || !this.outAnimation) return;

            const isWhite = this.ratios.whiteTunnel > 0.05;
            const dropRatio = this.ratios.astronautDrop;
            const whiteRatio = this.ratios.whiteTunnel;
            const inProgress = ease.cubicIn(this.ratios.blackTitle);

            const tLead = this.transformObjectList[0];

            for (let g = 0; g < this.TOTAL_COUNT; g++) {
                const v = this.transformObjectList[g];
                v.scale.setScalar(1);
                v.position.set(0, 0, 0);
                v.rotation.set(0, 0, 0);

                if (g === 0) {
                    // Main Astronaut
                    let animAttributes, animIndex;
                    if (isWhite || dropRatio > 0) {
                        animAttributes = this.outAnimation.attributes;
                        if (whiteRatio < 1) {
                            animIndex = math.fit(whiteRatio, 0, 1, 0, 79);
                        } else {
                            animIndex = math.fit(dropRatio, 0, 1, 79, 99);
                        }
                    } else {
                        animAttributes = this.inAnimation.attributes;
                        animIndex = 100 * inProgress;
                    }

                    const posArray = animAttributes.position.array;
                    const orientArray = animAttributes.orient.array;
                    const idxFrom = Math.min(Math.floor(animIndex), 99);
                    const idxTo = Math.min(Math.ceil(animIndex), 99);
                    const blend = animIndex - idxFrom;

                    this._p0.fromArray(posArray, idxFrom * 3);
                    this._p1.fromArray(posArray, idxTo * 3);
                    this._p0.lerp(this._p1, blend);
                    v.position.copy(this._p0);

                    this._q0.fromArray(orientArray, idxFrom * 4);
                    this._q1.fromArray(orientArray, idxTo * 4);
                    this._q0.slerp(this._q1, blend);
                    v.quaternion.copy(this._q0);

                    // Authentic drop into footer framing
                    v.position.y -= 0.45 * ease.backInOut(dropRatio);
                    v.updateMatrix();

                    // Brownian micro-drift
                    const motion = v.userData.motion;
                    motion._positionFrequency = 0.2;
                    motion._rotationFrequency = 0.15;
                    motion._positionAmplitude = 0.15;
                    motion._rotationAmplitude = 0.05;
                    motion.update(dt);

                    v.userData.positionDynamic.update(dt, motion._position);
                    this._v0.copy(motion._euler);
                    v.userData.rotationDynamic.update(dt, this._v0);
                    this._e0.x = v.userData.rotationDynamic.value.x;
                    this._e0.y = v.userData.rotationDynamic.value.y;
                    this._e0.z = v.userData.rotationDynamic.value.z;
                    this._v1.set(1, 1, 1);
                    motion._matrix.compose(v.userData.positionDynamic.value, this._q0.setFromEuler(this._e0), this._v1);

                    this._m0.copy(v.matrix);
                    this._m0.multiply(motion._matrix);

                    // Natural mouse parallax tilt in footer
                    if (dropRatio >= 0.85) {
                        const mouseEuler = new THREE.Euler(-this.mouse.y * 0.18, this.mouse.x * 0.28, 0, 'YXZ');
                        const mouseMat = new THREE.Matrix4().makeRotationFromEuler(mouseEuler);
                        this._m0.multiply(mouseMat);
                    }

                    this._m0.decompose(this._v0, this._q0, this._v1);
                    this._v0.toArray(this.instancePosAttribute.array, 0);
                    this._q0.toArray(this.instanceOrientAttribute.array, 0);
                } else {
                    // Clones in black space
                    if (this.ratios.blackTunnel > 0.05 && this.ratios.whiteTunnel < 0.1) {
                        v.position.copy(tLead.position);
                        v.quaternion.copy(tLead.quaternion);
                        v.updateMatrix();

                        v.userData.motion._positionFrequency = 0.2;
                        v.userData.motion._rotationFrequency = 0.6;
                        v.userData.motion._positionAmplitude = 10;
                        v.userData.motion._rotationAmplitude = 8;
                        v.userData.motion.update(dt);

                        this._m0.copy(v.matrix);
                        this._m0.multiply(v.userData.motion._matrix);
                        this._m0.decompose(this._v0, this._q0, this._v1);

                        this._v1.fromArray(this.instancePosAttribute.array, 0);
                        const cloneRatio = g / (this.CLONES_COUNT - 1);
                        const t = math.fit(this.ratios.blackTunnel, cloneRatio * 0.3, 0.7 + cloneRatio * 0.3, 1, 0, ease.sineInOut);
                        this._v0.lerp(this._v1, t);

                        this._v0.toArray(this.instanceClonePos.array, (g - 1) * 3);
                        this._q0.toArray(this.instanceCloneOrient.array, (g - 1) * 4);
                    } else {
                        this.instanceClonePos.array.fill(99999, (g - 1) * 3, g * 3);
                    }
                }
            }

            this.instancePosAttribute.needsUpdate = true;
            this.instanceOrientAttribute.needsUpdate = true;
            this.instanceClonePos.needsUpdate = true;
            this.instanceCloneOrient.needsUpdate = true;
        }

        updateAnimation(dt) {
            const dropRatio = this.ratios.astronautDrop;
            const whiteOutRatio = this.ratios.whiteFrameOut;

            const gBlend = math.fit(dropRatio, 0, 0.1, 0, 1) * math.fit(dropRatio, 0.9, 1, 1, 0);
            const linearFrame = math.fit(whiteOutRatio + dropRatio, 0.9, 2, 90, 139, ease.quartIn);
            const f1 = Math.floor(linearFrame);
            const f2 = Math.ceil(linearFrame);
            const blend2 = linearFrame - f1;

            this.astronautSharedUniforms.u_loopLinearBlend.value = gBlend;

            const cardActive = math.fit(dropRatio, 0.85, 1, 0, 1, ease.cubicIn);
            this.isCardActive = cardActive > 0;

            for (let T = 0; T < this.TOTAL_COUNT; T++) {
                const M = this.transformObjectList[T];
                let speed = 1;
                let loopStart = 0;
                let loopEnd = 89;

                if (dropRatio < 0.5) {
                    speed = math.smoothstep(-0.3, 1, this.ratios.blackTitle) * 0.75;
                    loopStart = 0;
                    loopEnd = 89;
                } else {
                    speed = math.fit(dropRatio, 0.9, 1, 0, 1);
                    loopStart = 140;
                    loopEnd = 287;
                }

                M.userData.animationTime += dt * speed * M.userData.deltaTimeMultiplier;

                const range = loopEnd - loopStart + 1;
                const totalProgress = (M.userData.timeShift + M.userData.animationTime) * 60 % range;
                const frameCurrent = Math.floor(totalProgress) + loopStart;
                const frameNext = (Math.floor(totalProgress) + 1) % range + loopStart;
                const frameBlend = totalProgress % 1;

                if (T === 0) {
                    this.instanceAnimBlend1.array[0] = frameCurrent;
                    this.instanceAnimBlend1.array[1] = frameNext;
                    this.instanceAnimBlend1.array[2] = frameBlend;

                    this.instanceAnimBlend2.array[0] = f1;
                    this.instanceAnimBlend2.array[1] = f2;
                    this.instanceAnimBlend2.array[2] = blend2;
                } else {
                    this.instanceCloneAnimBlend1.array[(T - 1) * 3 + 0] = frameCurrent;
                    this.instanceCloneAnimBlend1.array[(T - 1) * 3 + 1] = frameNext;
                    this.instanceCloneAnimBlend1.array[(T - 1) * 3 + 2] = frameBlend;

                    this.instanceCloneAnimBlend2.array[(T - 1) * 3 + 0] = f1;
                    this.instanceCloneAnimBlend2.array[(T - 1) * 3 + 1] = f2;
                    this.instanceCloneAnimBlend2.array[(T - 1) * 3 + 2] = blend2;
                }
            }

            this.instanceAnimBlend1.needsUpdate = true;
            this.instanceAnimBlend2.needsUpdate = true;
            this.instanceCloneAnimBlend1.needsUpdate = true;
            this.instanceCloneAnimBlend2.needsUpdate = true;
        }

        updateCard(dt) {
            if (!this.materials.card) return;
            this.cardTime = this.isCardActive ? this.cardTime + dt : 0;
            const tx = this.cardTextureSize.x;
            const ty = this.cardTextureSize.y;
            const n = Math.floor(10 * this.cardTime % (tx * (ty + 1)));
            const a = n / (tx * (ty + 1));
            const light = math.linearStep(0, 0.15, a) * math.linearStep(1, 0.9, a);

            this.astronautWhiteUniforms.u_faceLedLight.value = light;
            const cardMat = this.materials.card.white;
            if (cardMat && cardMat.uniforms.u_cardUvOffset) {
                cardMat.uniforms.u_cardUvOffset.value.set(
                    (n % tx) / tx,
                    (ty - Math.floor(n / tx)) / ty
                );
                const noiseVal = math.clamp(0.5 + Math.max(0, this.cardNoise.getFbm(performance.now() * 0.008, 3) + 0.5) * 4, 0, 2);
                cardMat.uniforms.u_cardOpacity.value = noiseVal * (this.isCardActive ? 1 : 0);
            }
        }

        updateGlass() {
            if (!this.glassMesh) return;
            const breakRatio = this.ratios.whiteFrameBreak;

            if (breakRatio > 0 && this.ratios.astronautDrop < 1.0) {
                this.glassMesh.visible = true;
                const totalFrames = this.glassFrameCount;
                const animProgress = breakRatio * (totalFrames - 1);
                const l = Math.floor(animProgress);
                const c = Math.min(l + 1, totalFrames - 1);
                const u = animProgress - l;

                this.glassUniforms.u_frameFrom.value = l;
                this.glassUniforms.u_frameTo.value = c;
                this.glassUniforms.u_frameRatio.value = u;
                this.glassUniforms.u_fragmentScale.value = math.fit(this.ratios.astronautDrop, 0.75, 1, 1, 0);

                // Align glass with camera portal
                this.glassMesh.position.copy(this.camera.position);
                this.glassMesh.quaternion.copy(this.camera.quaternion);
                this.glassMesh.translateZ(-3.5);
                this.glassMesh.scale.setScalar(3.2);
            } else {
                this.glassMesh.visible = false;
            }
        }

        render() {
            requestAnimationFrame(this.animate);
            if (!this.isReady) return;

            this.onScroll();

            const now = performance.now();
            const dt = Math.min((now - this.lastTime) / 1000, 1 / 20);
            this.lastTime = now;

            // Smooth mouse
            this.mouse.lerp(this.targetMouse, 0.08);

            // Time uniforms
            this.sharedUniforms.u_time.value = now * 0.001;
            this.sharedUniforms.u_tunnelTime.value += dt;
            this.sharedUniforms.u_whiteTunnelRatio.value = this.ratios.whiteTunnel;

            const isWhite = this.ratios.whiteTunnel > 0.05 && this.ratios.astronautDrop < 0.85;
            for (const partId of this.partIdList) {
                if (this.meshes[partId]) {
                    this.meshes[partId].material = this.materials[partId][isWhite ? 'white' : 'black'];
                }
            }

            // Dynamic background transitions across cosmic space -> blue/white archway -> transparent footer
            if (this.canvas) {
                if (isWhite) {
                    const whiteFactor = math.fit(this.ratios.whiteTunnel, 0.05, 0.25, 0, 1) * math.fit(this.ratios.astronautDrop, 0.2, 0.85, 1, 0);
                    this.canvas.style.backgroundColor = `rgba(244, 242, 234, ${whiteFactor.toFixed(3)})`;
                    this.sharedUniforms.u_bgColor.value.setRGB(whiteFactor * 0.96, whiteFactor * 0.95, whiteFactor * 0.92);
                } else {
                    const blackFactor = math.fit(this.ratios.blackTunnel, 0.05, 0.2, 0, 1) * math.fit(this.ratios.whiteTunnel, 0.0, 0.05, 1, 0);
                    this.canvas.style.backgroundColor = `rgba(0, 0, 0, ${(blackFactor * 0.95).toFixed(3)})`;
                    this.sharedUniforms.u_bgColor.value.set('#000000');
                }
            }

            // Clones visibility
            const clonesVisible = !isWhite && this.ratios.blackTunnel > 0.05;
            for (const partId in this.cloneMeshes) {
                this.cloneMeshes[partId].visible = clonesVisible;
            }
            this.cloneUniforms.u_alpha.value = math.fit(this.ratios.blackTunnel, 0.05, 0.45, 0.25, 0.9);

            // Tunnel blocks visibility
            if (this.tunnelBlockMesh) {
                const showBlocks = this.ratios.whiteTunnel > 0.05 && this.ratios.whiteFrameOut < 0.95;
                this.tunnelBlockMesh.visible = showBlocks;
                if (showBlocks) {
                    this.blockUniforms.u_ratioInverse.value = 1.0 - this.ratios.whiteTunnel;
                    this.tunnelFbm.update(dt);
                }
            }

            // Diamonds visibility
            if (this.diamondsMesh) {
                const showDiamonds = this.ratios.whiteTunnel > 0.1;
                this.diamondsMesh.visible = showDiamonds;
                this.diamondMaterial.uniforms.u_activeRatio.value = math.fit(this.ratios.whiteTunnel, 0.1, 0.5, 0, 1);
            }

            // Stickers visibility in footer
            if (this.stickersMesh) {
                const showStickers = this.ratios.astronautDrop >= 0.82;
                this.stickersMesh.visible = showStickers;
                this.stickersMaterial.uniforms.u_activeRatio.value = math.fit(this.ratios.astronautDrop, 0.82, 0.98, 0, 1);
            }

            // Card face visibility
            if (this.meshes.card) {
                this.meshes.card.visible = this.ratios.astronautDrop >= 0.85;
            }

            // Update transforms and animations
            this.updateTransforms(dt);
            this.updateAnimation(dt);
            this.updateCard(dt);
            this.updateGlass();

            // Camera Dolly Zoom
            const targetFov = 35 + (isWhite ? math.fit(this.ratios.whiteTunnel, 0, 1, 30, 0) : math.fit(this.ratios.blackTunnel, 0, 1, 0, 15));
            this.camera.fov += (targetFov - this.camera.fov) * 0.1;
            this.camera.updateProjectionMatrix();

            // Render Frame
            this.renderer.render(this.scene, this.camera);
        }
    }

    // Auto-boot on load
    function boot() {
        if (window.__lusionAstronaut) {
            console.log('[Lusion Astronaut] Engine instance already exists, skipping duplicate boot.');
            return;
        }
        const wtSection = document.getElementById('work-together') || document.querySelector('.ll-section--together');
        if (!wtSection) return;

        const engine = new LusionAstronautEngine();
        window.__lusionAstronaut = engine;
        engine.init(wtSection);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
