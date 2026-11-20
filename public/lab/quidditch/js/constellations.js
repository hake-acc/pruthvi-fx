// Floating Geometric Constellation Polyhedra
// Matches Robert Borghesi's Dracarys: Delicate 3D wireframe polyhedra (icosahedra, octahedra, dodecahedra)
// with glowing cyan vertex nodes and delicate connective wireframe lines drifting in 3D orbit.
import * as THREE from 'three';

const lineVert = /* glsl */`
    attribute float aAlpha;
    varying float vAlpha;
    uniform float uTime;

    void main() {
        vAlpha = aAlpha;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPos;
    }
`;

const lineFrag = /* glsl */`
    precision highp float;
    varying float vAlpha;
    uniform vec3 uColor;
    uniform float uGlow;

    void main() {
        gl_FragColor = vec4(uColor * uGlow, vAlpha * 0.45);
    }
`;

const nodeVert = /* glsl */`
    attribute float aSize;
    attribute float aPhase;
    uniform float uTime;
    varying float vPhase;

    void main() {
        vPhase = aPhase;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPos;
        float pulse = 1.0 + sin(uTime * 2.5 + aPhase) * 0.3;
        gl_PointSize = clamp(aSize * pulse * (110.0 / -mvPos.z), 1.5, 6.0);
    }
`;

const nodeFrag = /* glsl */`
    precision highp float;
    varying float vPhase;
    uniform vec3 uColor;

    void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        if (d > 0.5) discard;

        float core = exp(-d * 10.0);
        float halo = smoothstep(0.5, 0.05, d);
        vec3 col = mix(uColor, vec3(1.0), core * 0.9);

        gl_FragColor = vec4(col, (core + halo * 0.4) * 0.85);
    }
`;

export function createConstellations() {
    const group = new THREE.Group();
    const polyhedra = [];

    const geos = [
        new THREE.IcosahedronGeometry(0.75, 0),
        new THREE.OctahedronGeometry(0.65, 0),
        new THREE.DodecahedronGeometry(0.7, 0),
        new THREE.IcosahedronGeometry(0.60, 0),
        new THREE.OctahedronGeometry(0.80, 0),
    ];

    const configs = [
        { pos: new THREE.Vector3(-3.8, 1.4, -1.8), rotSpeed: new THREE.Vector3(0.12, 0.20, 0.08) },
        { pos: new THREE.Vector3(3.9, 1.8, -1.2), rotSpeed: new THREE.Vector3(-0.16, 0.15, 0.12) },
        { pos: new THREE.Vector3(-3.2, 2.6, 1.8), rotSpeed: new THREE.Vector3(0.10, -0.18, 0.14) },
        { pos: new THREE.Vector3(3.4, 1.1, 2.0), rotSpeed: new THREE.Vector3(0.14, 0.12, -0.10) },
        { pos: new THREE.Vector3(-4.4, 2.2, 0.6), rotSpeed: new THREE.Vector3(-0.12, -0.14, 0.18) },
    ];

    configs.forEach((cfg, i) => {
        const polyGroup = new THREE.Group();
        polyGroup.position.copy(cfg.pos);

        const baseGeo = geos[i % geos.length];
        const wireGeo = new THREE.WireframeGeometry(baseGeo);

        const lineMat = new THREE.ShaderMaterial({
            vertexShader: lineVert,
            fragmentShader: lineFrag,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(0x38bdf8) },
                uGlow: { value: 1.0 }
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const lines = new THREE.LineSegments(wireGeo, lineMat);
        polyGroup.add(lines);

        const posAttr = baseGeo.attributes.position;
        const vCount = posAttr.count;
        const nodeGeo = new THREE.BufferGeometry();
        nodeGeo.setAttribute('position', posAttr);

        const sizes = new Float32Array(vCount);
        const phases = new Float32Array(vCount);
        for (let j = 0; j < vCount; j++) {
            sizes[j] = 2.0 + Math.random() * 1.5;
            phases[j] = Math.random() * Math.PI * 2;
        }
        nodeGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        nodeGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

        const nodeMat = new THREE.ShaderMaterial({
            vertexShader: nodeVert,
            fragmentShader: nodeFrag,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(0x70e1ff) }
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const nodes = new THREE.Points(nodeGeo, nodeMat);
        polyGroup.add(nodes);

        group.add(polyGroup);
        polyhedra.push({
            group: polyGroup,
            basePos: cfg.pos.clone(),
            rotSpeed: cfg.rotSpeed,
            lineMat,
            nodeMat,
            seed: i * 2.3
        });
    });

    return {
        group,
        update: (time, dt) => {
            polyhedra.forEach(p => {
                p.lineMat.uniforms.uTime.value = time;
                p.nodeMat.uniforms.uTime.value = time;

                p.group.position.y = p.basePos.y + Math.sin(time * 0.7 + p.seed) * 0.18;
                p.group.position.x = p.basePos.x + Math.cos(time * 0.5 + p.seed) * 0.14;
                p.group.position.z = p.basePos.z + Math.sin(time * 0.4 + p.seed) * 0.12;

                p.group.rotation.x += p.rotSpeed.x * dt;
                p.group.rotation.y += p.rotSpeed.y * dt;
                p.group.rotation.z += p.rotSpeed.z * dt;
            });
        }
    };
}
