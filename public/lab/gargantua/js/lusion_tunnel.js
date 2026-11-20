// Lusion.co authentic multi-stage Black Hole Tunnel Experience
// 1. GoalBlackTunnel: 4D conformal twist dark sci-fi greeble tunnel
// 2. GoalWhiteTunnel: Modular pristine white tunnel with FBM curvature and floating stickers
// 3. GoalTunnelAstronaut: Authentic suited astronaut floating in zero-G
// 4. GoalTunnelGlass: Physical 946-shard screen break & chromatic dispersion with audio
import * as THREE from 'three';
import { parseBuf } from './buf_loader.js';

// ------------------------------------------------------------------ Shaders
const goalBlackTunnelTransformShader = /* glsl */`
uniform float u_blackTunnelTransformRatio;
vec3 goalBlackTunnelTransform(vec3 pos) {
    float t = u_blackTunnelTransformRatio * 6.2831853;
    float zWeight = pos.z * 0.025;
    float angle = t * zWeight * zWeight * sign(zWeight);
    float sa = sin(angle);
    float ca = cos(angle);
    mat2 m2 = mat2(ca, -sa, sa, ca);
    pos.xy = m2 * pos.xy;
    pos.z += t * 1.0;
    pos = pos.xzy;
    float rad = 20.0;
    pos /= rad;
    vec3 a = pos;
    vec2 pq = vec2(-1.0, 0.5) * t;
    float ada = dot(a, a);
    vec4 b = vec4(2.0 * a, ada - 1.0) / (1.0 + ada);
    vec4 pq_cs = vec4(cos(pq), sin(pq)).xzyw;
    vec2 np1 = vec2(-1.0, 1.0);
    vec4 c = (b.xxyy * np1.yxyy * pq_cs + b.zzww * np1.yyxy * pq_cs.yxwz).xzyw;
    pos = c.xyz / (1.0 - c.w);
    pos = pos.xzy;
    return pos * rad;
}
`;

const blackVert = /* glsl */`
#define IS_HD 1
attribute float ao;
attribute float areaRatio;
attribute float cluster;
attribute float height;
attribute vec3 center;
attribute vec3 instancePos;
attribute vec3 instanceGridIds;
attribute vec3 instanceAxis;
attribute vec4 tangent;
uniform float u_time;
uniform float u_showRatio;
uniform float u_offsetZ;
varying vec3 v_worldPosition;
varying vec4 v_worldTangent;
varying vec3 v_worldNormal;
varying float v_ao;
varying float v_opacity;
varying float v_emission;
varying vec2 v_uv;
varying vec4 v_rands;
varying float v_depth;

#define PI 3.14159265359
vec3 qrotate(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
vec4 quaternion(vec3 axis, float angle) { float halfAngle = angle * 0.5; return vec4(axis * sin(halfAngle), cos(halfAngle)); }
float linearStep(float edge0, float edge1, float x) { return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0); }
vec4 hash44(vec4 p4) {
    p4 = fract(p4 * vec4(0.1031, 0.1030, 0.0973, 0.1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}
vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) { return normalize((vec4(dir, 0.0) * matrix).xyz); }

${goalBlackTunnelTransformShader}

void main() {
    vec3 pos = position;
    vec3 nor = normal;
    vec3 tang = tangent.xyz;
    float blockId = floor(pos.x + 0.5);

    vec4 q;
    vec3 offsetInstanceGridIds = instanceGridIds;
    offsetInstanceGridIds.z -= floor(u_offsetZ / float(GRID_SIZE)) * 2.0;
    vec4 instanceRand1s = hash44(floor(vec4(offsetInstanceGridIds + 0.5, blockId + cluster)));
    v_rands = hash44(floor(vec4(offsetInstanceGridIds + 0.5, 100.0)));

    float showRatio = u_showRatio * (1.0 - step(10.5, instanceGridIds.z) * mod(u_offsetZ / float(GRID_SIZE), 1.0));
    pos = mix(center, pos, clamp(showRatio, 0.0, 1.0));

    pos.x -= blockId;
    float blockOffset = sin(u_time * 2.0 + cos(u_time * 4.0 + 0.2 + offsetInstanceGridIds.z)) * 0.15 * instanceRand1s.y;
    pos.y = pos.y * height + (0.025 + blockOffset);
    float variation = floor(instanceRand1s.x * 8.0);
    q = quaternion(vec3(0.0, 0.0, variation > 3.5 ? -1.0 : 1.0), (mod(blockId, 4.0) + mod(variation, 4.0)) * PI * 0.5);
    pos = qrotate(q, pos);
    nor = qrotate(q, nor);
    tang = qrotate(q, tang);

    q = quaternion(instanceAxis, PI * 0.5);
    pos = qrotate(q, pos) * float(GRID_SIZE) + instancePos;
    nor = qrotate(q, nor);
    tang = qrotate(q, tang);
    pos.z += mod(u_offsetZ, float(GRID_SIZE));
    v_depth = -pos.z;

    pos = goalBlackTunnelTransform(pos);

    v_ao = ao;
    v_emission = areaRatio < 0.25 ? sin(pos.z * 0.25 - u_time * 2.0) * 0.5 + 0.5 : 0.0;
    v_opacity = linearStep(65.0, 25.0, length(pos.xy)) * linearStep(110.0, 85.0, cameraPosition.z - pos.z) * u_showRatio;

    v_worldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    v_worldTangent = vec4(inverseTransformDirection(normalMatrix * tang, viewMatrix), tangent.w);
    v_worldNormal = inverseTransformDirection(normalMatrix * nor, viewMatrix);
    v_uv = uv;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const blackFrag = /* glsl */`
#define IS_HD 1
uniform sampler2D u_greebleArmbTexture;
uniform sampler2D u_greebleNormalTexture;
uniform vec2 u_resolution;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform float u_glow;
varying vec3 v_worldPosition;
varying vec4 v_worldTangent;
varying vec3 v_worldNormal;
varying vec4 v_rands;
varying float v_ao;
varying float v_opacity;
varying float v_emission;
varying float v_depth;
varying vec2 v_uv;

void main() {
    float faceDirection = gl_FrontFacing ? 1.0 : -1.0;
    vec3 worldNormal = normalize(v_worldNormal) * faceDirection;
    vec3 worldTangent = normalize(v_worldTangent.xyz) * faceDirection;
    vec3 worldBinormal = normalize(cross(worldNormal, worldTangent)) * -v_worldTangent.w;
    worldTangent = normalize(cross(worldBinormal, worldNormal));

    vec3 tangentSpaceNormal = normalize(texture2D(u_greebleNormalTexture, v_uv).xyz - 0.5);
    worldNormal = normalize(tangentSpaceNormal.x * worldTangent + tangentSpaceNormal.y * worldBinormal + tangentSpaceNormal.z * worldNormal);

    vec4 armb = texture2D(u_greebleArmbTexture, v_uv);
    float ao = v_ao * armb.r;

    vec3 lightPos = vec3(0.0, 0.0, -20.0);
    vec3 toLight = normalize(lightPos - v_worldPosition);
    float diffuse = max(dot(worldNormal, toLight) * 0.5 + 0.5, 0.1);

    vec3 color1 = u_color1;
    vec3 color2 = u_color2;
    vec3 baseColor = 0.45 + mix(color1, color2, v_rands.x) * 1.1;
    vec3 emissiveColor = mix(color1, color2, v_rands.y) * 4.5 * u_glow;

    vec3 col = baseColor * vec3(ao * 0.8 * diffuse) + emissiveColor * v_emission;
    col *= v_opacity;

    gl_FragColor = vec4(col, v_opacity);
}
`;

const whiteBlockVert = /* glsl */`
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
varying float v_fog;

vec3 deform(in vec3 pos) {
    float blockCount = float(BLOCK_COUNT);
    float ratio = mix(0.1, 1.0, u_ratioInverse);
    float lengthRatio = -pos.z / blockCount;
    float scalar = mix(0.25, ratio, lengthRatio);
    pos.x *= 1.0 + scalar * 0.5 * sin(lengthRatio * 6.283184);
    pos.y *= 1.0 + scalar * 0.5 * cos(lengthRatio * 6.283184 + 3.1415926);
    float angleRatio = smoothstep(0.25, 1.0, u_ratioInverse);
    float angle = (angleRatio + angleRatio * lengthRatio * lengthRatio) * -6.283184;
    float s = sin(angle);
    float c = cos(angle);
    mat2 m = mat2(c, -s, s, c);
    pos.xy = m * pos.xy;
    pos.y += ratio * sin(ratio * lengthRatio * 3.141592 * 4.0) * 0.25;
    pos.z -= (cos(ratio * 1.5 + (1.0 - ratio) * lengthRatio * 3.141592 * 0.5) * 0.5 + 0.5 - 1.0) * blockCount;
    pos.z *= 1.0 + 16.0 * (ratio * lengthRatio * lengthRatio) + 2.0 * ratio * (sin(8.0 * lengthRatio) * 0.5 + 0.5);
    pos.z *= (1.0 - ratio * ratio * ratio) * 0.9 + 0.1;
    pos.z += blockCount / 4.0;
    return pos * 15.0;
}

vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) { return normalize((vec4(dir, 0.0) * matrix).xyz); }

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
    v_fog = -0.005 * mvPosition.z / mvPosition.w;
    gl_Position = projectionMatrix * mvPosition;

    v_worldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    v_worldNormal = inverseTransformDirection(normalMatrix * nor, viewMatrix);
    v_uv = uv;
}
`;

const whiteBlockFrag = /* glsl */`
uniform sampler2D u_texture;
uniform float u_ratioInverse;
uniform vec3 u_fbm;
uniform float u_opacity;
varying vec3 v_localPosition;
varying vec2 v_uv;
varying vec3 v_worldPosition;
varying vec3 v_worldNormal;
varying vec3 v_viewPosition;
varying float v_lengthRatio;
varying float v_fog;
uniform float u_time;

float sphOcclusion(in vec3 pos, in vec3 nor, in vec4 sph) {
    vec3 di = sph.xyz - pos;
    float l = length(di);
    float nl = dot(nor, di / l);
    float h = l / sph.w;
    float h2 = h * h;
    return max(0.0, nl) / h2;
}

void main() {
    vec4 sph = vec4(u_fbm.x * 2.0, u_fbm.y * 2.0 + 1.0, 0.0, 2.5);
    vec3 worldNormal = normalize(v_worldNormal);
    float ao = 1.0 - sphOcclusion(v_worldPosition, worldNormal, sph) * 2.0 * smoothstep(0.8, 0.5, u_ratioInverse);
    float shade = texture2D(u_texture, v_uv).r;
    float brightness = pow(max(0.0, v_lengthRatio), 4.5);

    vec3 baseColor = vec3(0.92, 0.94, 0.98);
    vec3 col = baseColor * (0.4 + shade * 0.6) * ao + brightness * vec3(1.2, 1.25, 1.4);

    gl_FragColor = vec4(col * u_opacity, (shade * 0.8 + 0.2) * u_opacity);
}
`;

const glassVert = /* glsl */`
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
    vec3 dir = radius > 0.0001 ? position / radius : vec3(0.0);
    vec3 posFrom = qrotate(pieceOrientFrom, dir);
    vec3 posTo = qrotate(pieceOrientTo, dir);
    v_localDir = normalize(mix(posFrom, posTo, u_frameRatio));
    vec3 pos = v_localDir * radius + mix(piecePosFrom, piecePosTo, u_frameRatio);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    v_viewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;

const glassFrag = /* glsl */`
varying vec3 v_viewPosition;
varying vec3 v_localDir;
uniform float u_alpha;

void main() {
    vec3 fdx = dFdx(v_viewPosition);
    vec3 fdy = dFdy(v_viewPosition);
    vec3 viewNormal = normalize(cross(fdx, fdy));
    float edge = pow(1.0 - abs(viewNormal.z), 2.5);

    // Prismatic chromatic dispersion on shard edges
    vec3 dispersion = clamp(abs(mod(edge * 5.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    vec3 col = vec3(0.9, 0.95, 1.0) * (0.6 + edge * 2.0) + dispersion * 1.8;

    gl_FragColor = vec4(col, (edge * 0.8 + 0.25) * u_alpha);
}
`;

// ------------------------------------------------------------------ Module implementation
export class LusionTesseract {
    constructor() {
        this.root = new THREE.Group();
        this.loaded = false;
        this.glassBroken = false;
        this.tunnelDeltaTime = 0;
        this.tunnelTime = 0;
        this.pt = 0;
    }

    async init() {
        const texLoader = new THREE.TextureLoader();
        const loadTex = (url) => new Promise((resolve) => texLoader.load(url, resolve, undefined, () => resolve(null)));

        // 1. Assets for Black Tunnel
        const [gridBaseGeo, gridStructGeo, greebleArm, greebleNor] = await Promise.all([
            parseBuf(await (await fetch('assets/models/tunnels/grid_base_hd.buf')).arrayBuffer()),
            parseBuf(await (await fetch('assets/models/tunnels/grid_structure_hd.buf')).arrayBuffer()),
            loadTex('assets/textures/tunnels/grids/greeble_arm.webp'),
            loadTex('assets/textures/tunnels/grids/greeble_nor.webp'),
        ]);

        if (greebleArm) { greebleArm.wrapS = greebleArm.wrapT = THREE.RepeatWrapping; }
        if (greebleNor) { greebleNor.wrapS = greebleNor.wrapT = THREE.RepeatWrapping; }

        const GRID_SIZE = 20;
        const blackInstGeo = new THREE.InstancedBufferGeometry();
        for (const attr in gridBaseGeo.attributes) blackInstGeo.attributes[attr] = gridBaseGeo.attributes[attr];
        blackInstGeo.index = gridBaseGeo.index;
        blackInstGeo.setAttribute('instancePos', new THREE.InstancedBufferAttribute(gridStructGeo.attributes.position.array, 3));
        blackInstGeo.setAttribute('instanceGridIds', new THREE.InstancedBufferAttribute(gridStructGeo.attributes.gridIds.array, 3));
        blackInstGeo.setAttribute('instanceAxis', new THREE.InstancedBufferAttribute(gridStructGeo.attributes.rotAxis.array, 3));

        this.blackUniforms = {
            u_time: { value: 0 },
            u_showRatio: { value: 1.0 },
            u_offsetZ: { value: 0 },
            u_blackTunnelTransformRatio: { value: 0.15 },
            u_color1: { value: new THREE.Color('#00b5a6') },
            u_color2: { value: new THREE.Color('#0099ff') },
            u_glow: { value: 1.0 },
            u_greebleArmbTexture: { value: greebleArm },
            u_greebleNormalTexture: { value: greebleNor },
            u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        };

        const blackMat = new THREE.ShaderMaterial({
            uniforms: this.blackUniforms,
            vertexShader: blackVert,
            fragmentShader: blackFrag,
            side: THREE.DoubleSide,
            transparent: true,
            defines: { GRID_SIZE, IS_HD: 1 }
        });
        this.blackMesh = new THREE.Mesh(blackInstGeo, blackMat);
        this.blackMesh.frustumCulled = false;
        this.root.add(this.blackMesh);

        // 2. Assets for White Tunnel
        const BLOCK_COUNT = 16;
        const [wallGeo, baseGeo, whiteTex] = await Promise.all([
            parseBuf(await (await fetch('assets/models/tunnels/tunnel_block_wall.buf')).arrayBuffer()),
            parseBuf(await (await fetch('assets/models/tunnels/tunnel_block_base.buf')).arrayBuffer()),
            loadTex('assets/textures/tunnels/white_block.webp'),
        ]);

        const ids = new Float32Array(BLOCK_COUNT);
        for (let i = 0; i < BLOCK_COUNT; i++) ids[i] = i;

        const makeWhiteInst = (geo) => {
            const ig = new THREE.InstancedBufferGeometry();
            for (const a in geo.attributes) ig.attributes[a] = geo.attributes[a];
            ig.setIndex(geo.index);
            ig.setAttribute('a_instanceId', new THREE.InstancedBufferAttribute(ids, 1));
            return ig;
        };

        this.whiteUniforms = {
            u_time: { value: 0 },
            u_ratio: { value: 0.5 },
            u_ratioInverse: { value: 0.5 },
            u_texture: { value: whiteTex },
            u_fbm: { value: new THREE.Vector3(0, 0, 0) },
            u_opacity: { value: 0.0 }
        };

        const whiteMat = new THREE.ShaderMaterial({
            uniforms: this.whiteUniforms,
            vertexShader: whiteBlockVert,
            fragmentShader: whiteBlockFrag,
            side: THREE.DoubleSide,
            transparent: true,
            defines: { BLOCK_COUNT }
        });

        this.whiteWall = new THREE.Mesh(makeWhiteInst(wallGeo), whiteMat);
        this.whiteBase = new THREE.Mesh(makeWhiteInst(baseGeo), whiteMat);
        this.whiteWall.frustumCulled = false;
        this.whiteBase.frustumCulled = false;
        this.whiteGroup = new THREE.Group();
        this.whiteGroup.add(this.whiteWall, this.whiteBase);
        this.root.add(this.whiteGroup);

        // Floating stickers decal layer in white tunnel
        const stickersTex = await loadTex('assets/textures/tunnels/stickers.png');
        if (stickersTex) {
            const stickerGeo = new THREE.PlaneGeometry(1.4, 1.4);
            const stickerMat = new THREE.MeshBasicMaterial({ map: stickersTex, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
            this.stickerGroup = new THREE.Group();
            for (let i = 0; i < 12; i++) {
                const sm = new THREE.Mesh(stickerGeo, stickerMat);
                const a = (i / 12) * Math.PI * 2;
                sm.position.set(Math.cos(a) * 3.8, Math.sin(a) * 3.8, -i * 8 - 4);
                sm.rotation.set(Math.random() * 0.4, Math.random() * 0.4, Math.random() * Math.PI);
                this.stickerGroup.add(sm);
            }
            this.whiteGroup.add(this.stickerGroup);
        }

        // 3. Authentic Suited Lusion Astronaut
        const [hGeo, hgGeo, wGeo, gsGeo, hBase, hNor, wBase, wNor, gsBase, gsNor, faceTex] = await Promise.all([
            parseBuf(await (await fetch('assets/models/tunnels/astronaut_helmet.buf')).arrayBuffer()),
            parseBuf(await (await fetch('assets/models/tunnels/astronaut_helmet_glass.buf')).arrayBuffer()),
            parseBuf(await (await fetch('assets/models/tunnels/astronaut_wearpack.buf')).arrayBuffer()),
            parseBuf(await (await fetch('assets/models/tunnels/astronaut_glove_shoes.buf')).arrayBuffer()),
            loadTex('assets/textures/tunnels/astronaut/astronaut_helmet_base.webp'),
            loadTex('assets/textures/tunnels/astronaut/astronaut_helmet_nor.webp'),
            loadTex('assets/textures/tunnels/astronaut/astronaut_wearpack_base.webp'),
            loadTex('assets/textures/tunnels/astronaut/astronaut_wearpack_nor.webp'),
            loadTex('assets/textures/tunnels/astronaut/astronaut_glove_shoes_base.webp'),
            loadTex('assets/textures/tunnels/astronaut/astronaut_glove_shoes_nor.webp'),
            loadTex('assets/textures/tunnels/astronaut/face.png')
        ]);

        this.astronautGroup = new THREE.Group();
        const makeSuitPart = (geo, map, normalMap) => {
            const mat = new THREE.MeshStandardMaterial({
                map: map || null,
                normalMap: normalMap || null,
                roughness: 0.35,
                metalness: 0.25,
                color: 0xeeeeee
            });
            const m = new THREE.Mesh(geo, mat);
            m.castShadow = true;
            m.frustumCulled = false;
            return m;
        };

        const helmet = makeSuitPart(hGeo, hBase, hNor);
        const wearpack = makeSuitPart(wGeo, wBase, wNor);
        const gloves = makeSuitPart(gsGeo, gsBase, gsNor);

        // Gold reflective visor
        const visorMat = new THREE.MeshPhysicalMaterial({
            color: 0xffb733,
            metalness: 0.95,
            roughness: 0.08,
            reflectivity: 1.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.04
        });
        const visor = new THREE.Mesh(hgGeo, visorMat);
        visor.frustumCulled = false;

        // Face inside helmet
        let faceMesh = null;
        if (faceTex) {
            const faceGeo = new THREE.PlaneGeometry(0.32, 0.38);
            const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, opacity: 0.75 });
            faceMesh = new THREE.Mesh(faceGeo, faceMat);
            faceMesh.position.set(0, 0.12, 0.15);
        }

        this.astronautGroup.add(helmet, visor, wearpack, gloves);
        if (faceMesh) this.astronautGroup.add(faceMesh);
        this.astronautGroup.scale.setScalar(1.2);
        this.root.add(this.astronautGroup);

        // 4. Broken Glass Shatter System (946 shards)
        const [glassGeo, glassAnimData] = await Promise.all([
            parseBuf(await (await fetch('assets/models/tunnels/broken_glass.buf')).arrayBuffer()),
            (async () => {
                const ab = await (await fetch('assets/models/tunnels/broken_glass_animation.buf')).arrayBuffer();
                return parseBuf(ab);
            })()
        ]);

        const PIECE_COUNT = 946;
        const posArray = glassAnimData.attributes.position.array;
        const orientArray = glassAnimData.attributes.orient.array;
        const frameCount = posArray.length / (PIECE_COUNT * 3);

        const posRGBA = new Float32Array(PIECE_COUNT * frameCount * 4);
        for (let a = 0, l = 0; a < posArray.length; a += 3, l += 4) {
            posRGBA[l] = posArray[a];
            posRGBA[l + 1] = posArray[a + 1];
            posRGBA[l + 2] = posArray[a + 2];
            posRGBA[l + 3] = 0;
        }

        const posTex = new THREE.DataTexture(posRGBA, PIECE_COUNT, frameCount, THREE.RGBAFormat, THREE.FloatType);
        posTex.needsUpdate = true;
        const orientTex = new THREE.DataTexture(orientArray, PIECE_COUNT, frameCount, THREE.RGBAFormat, THREE.FloatType);
        orientTex.needsUpdate = true;

        this.glassUniforms = {
            u_positionTexture: { value: posTex },
            u_orientTexture: { value: orientTex },
            u_textureSize: { value: new THREE.Vector2(PIECE_COUNT, frameCount) },
            u_frameFrom: { value: 0 },
            u_frameTo: { value: 1 },
            u_frameRatio: { value: 0 },
            u_fragmentScale: { value: 1.0 },
            u_alpha: { value: 0.0 }
        };

        const gMat = new THREE.ShaderMaterial({
            uniforms: this.glassUniforms,
            vertexShader: glassVert,
            fragmentShader: glassFrag,
            transparent: true,
            side: THREE.DoubleSide
        });

        this.glassMesh = new THREE.Mesh(glassGeo, gMat);
        this.glassMesh.frustumCulled = false;
        this.glassMesh.visible = false;
        this.root.add(this.glassMesh);

        this.loaded = true;
    }

    reset() {
        this.glassBroken = false;
        this.pt = 0;
        if (this.glassMesh) this.glassMesh.visible = false;
    }

    update(time, dt, pt, camera, sound) {
        if (!this.loaded) return;
        this.pt = pt;
        this.tunnelDeltaTime = dt;
        this.tunnelTime += dt;

        // Sequence Progression:
        // 0.00 - 0.35: Dark Tech Greeble Tunnel (4D conformal Hopf twist)
        // 0.30 - 0.75: Modular White Tunnel take-over with FBM distortion & stickers
        // 0.45 - 0.90: Astronaut floats into view, reaching forward
        // 0.86 - 0.96: Glass Screen Breakthrough! 946 shards explode with audio
        // 0.95 - 1.00: Plunge into the void -> ready to loop

        const blackRatio = THREE.MathUtils.clamp((0.35 - pt) / 0.35, 0, 1);
        const whiteRatio = THREE.MathUtils.clamp((pt - 0.28) / 0.35, 0, 1) * THREE.MathUtils.clamp((0.92 - pt) / 0.15, 0, 1);
        const astroRatio = THREE.MathUtils.clamp((pt - 0.40) / 0.25, 0, 1) * THREE.MathUtils.clamp((0.96 - pt) / 0.1, 0, 1);
        const glassRatio = THREE.MathUtils.clamp((pt - 0.86) / 0.10, 0, 1);

        // 1. Black Tunnel
        this.blackUniforms.u_time.value = this.tunnelTime;
        this.blackUniforms.u_offsetZ.value = -this.tunnelTime * 18.0;
        this.blackUniforms.u_blackTunnelTransformRatio.value = 0.12 + Math.sin(time * 0.4) * 0.08;
        this.blackUniforms.u_showRatio.value = blackRatio;
        this.blackMesh.visible = blackRatio > 0.001;

        // 2. White Tunnel
        this.whiteUniforms.u_time.value = this.tunnelTime;
        this.whiteUniforms.u_ratio.value = whiteRatio;
        this.whiteUniforms.u_ratioInverse.value = 1.0 - whiteRatio;
        this.whiteUniforms.u_opacity.value = whiteRatio;
        this.whiteUniforms.u_fbm.value.set(Math.sin(time * 0.8) * 0.8, Math.cos(time * 0.6) * 0.6, 0);
        this.whiteGroup.visible = whiteRatio > 0.001;
        if (this.stickerGroup) {
            this.stickerGroup.position.z = Math.sin(time * 0.5) * 1.5;
        }

        // 3. Floating Astronaut
        if (astroRatio > 0.001) {
            this.astronautGroup.visible = true;
            const distZ = THREE.MathUtils.lerp(-18.0, -2.4, Math.min(1.0, (pt - 0.40) / 0.46));
            this.astronautGroup.position.set(
                Math.sin(time * 0.7) * 0.25,
                Math.cos(time * 0.5) * 0.2 - 0.1,
                camera.position.z + distZ
            );
            // Natural zero-G tumbling
            this.astronautGroup.rotation.set(
                Math.sin(time * 0.4) * 0.35 + 0.1,
                Math.cos(time * 0.3) * 0.45 + Math.PI,
                Math.sin(time * 0.5) * 0.2
            );
        } else {
            this.astronautGroup.visible = false;
        }

        // 4. Glass Screen Breakthrough
        if (pt >= 0.86 && pt < 0.98) {
            this.glassMesh.visible = true;
            this.glassMesh.position.copy(camera.position);
            this.glassMesh.quaternion.copy(camera.quaternion);
            this.glassMesh.translateZ(-0.95);

            const frameVal = glassRatio * 14.0;
            const fFrom = Math.floor(frameVal);
            const fTo = Math.min(14, fFrom + 1);
            const fRatio = frameVal - fFrom;

            this.glassUniforms.u_frameFrom.value = fFrom;
            this.glassUniforms.u_frameTo.value = fTo;
            this.glassUniforms.u_frameRatio.value = fRatio;
            this.glassUniforms.u_fragmentScale.value = 1.0 + glassRatio * 0.6;
            this.glassUniforms.u_alpha.value = 1.0 - Math.pow(glassRatio, 3.0);

            if (!this.glassBroken && sound) {
                this.glassBroken = true;
                sound.playGlassBreak();
            }
        } else {
            this.glassMesh.visible = false;
        }
    }
}
