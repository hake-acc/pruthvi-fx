import * as THREE from 'three';

export function parseBuf(arrayBuffer) {
    const e = arrayBuffer;
    let t = new Uint32Array(e, 0, 1)[0];
    let r = JSON.parse(new TextDecoder().decode(new Uint8Array(e, 4, t)));
    let n = r.vertexCount, a = r.indexCount, l = 4 + t;
    let c = new THREE.BufferGeometry();
    let u = r.attributes, f = false, p = {};
    for (let _ = 0, T = u.length; _ < T; _++) {
        let M = u[_], S = M.id, b = S === 'indices' ? a : n, C = M.componentSize;
        let w = globalThis[M.storageType];
        let R = new w(e, l, b * C), E = w.BYTES_PER_ELEMENT, I;
        if (M.needsPack) {
            let F = M.packedComponents, k = F.length, L = M.storageType.indexOf('Int') === 0, D = 1 << (E * 8), ne = L ? D * 0.5 : 0, re = 1 / D;
            I = new Float32Array(b * C);
            for (let ce = 0, z = 0; ce < b; ce++) {
                for (let j = 0; j < k; j++) {
                    let X = F[j];
                    I[z] = (R[z] + ne) * re * X.delta + X.from;
                    z++;
                }
            }
        } else {
            p[S] = l;
            I = R;
        }
        if (S === 'normal') f = true;
        if (S === 'indices') c.setIndex(new THREE.BufferAttribute(I, 1));
        else c.setAttribute(S, new THREE.BufferAttribute(I, C));
        l += b * C * E;
    }
    return c;
}

export async function loadBuf(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.statusText}`);
    const ab = await res.arrayBuffer();
    return parseBuf(ab);
}
