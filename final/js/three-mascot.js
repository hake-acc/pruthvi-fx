/**
 * Pruthvi FX - High Performance Three.js 3D Mascot
 * Eliminates CPU-heavy SVG Lottie DOM mutations for locked 60-120fps desktop rendering.
 * Features:
 * - 3D Sphere geometry rendered via WebGL GPU composite layer
 * - 1:1 visual match with reference iridescent metallic sphere
 * - 4 interactive facial expressions (happy, playful, open smile, wink)
 * - Inertial pointer spring-tilt physics on mouse movement
 * - Elastic squish/bounce response on click
 * - Preserves native hover dialog tag ("click!!") and click sound
 * - Automatic visibility pause to consume zero idle CPU
 */
(function () {
  'use strict';

  function init() {
    const wrapper =
      document.querySelector('.wrapper[data-v-39512f8f]') ||
      document.querySelector('.wrapper');

    if (!wrapper) {
      setTimeout(init, 50);
      return;
    }

    if (wrapper.querySelector('.three-mascot-canvas')) {
      return;
    }

    if (typeof THREE === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => buildMascot(wrapper);
      document.head.appendChild(script);
    } else {
      buildMascot(wrapper);
    }
  }

  function buildMascot(wrapper) {
    if (wrapper.querySelector('.three-mascot-canvas')) return;

    // Hide CPU-heavy SVG Lottie animation
    const lottieContainers = wrapper.querySelectorAll('.lottie-animation-container');
    lottieContainers.forEach((el) => {
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
    });

    const width = 64;
    const height = 64;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    const canvas = document.createElement('canvas');
    canvas.className = 'three-mascot-canvas logo';
    canvas.setAttribute('data-v-39512f8f', '');
    canvas.style.cssText =
      'width: 100%; height: 100%; display: block; cursor: pointer; outline: none; border-radius: 50%; user-select: none; -webkit-user-drag: none;';

    const tagWrapper = wrapper.querySelector('.logo-tag-wrapper');
    if (tagWrapper) {
      wrapper.insertBefore(canvas, tagWrapper);
    } else {
      wrapper.appendChild(canvas);
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 2;
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(pixelRatio);

    const textureLoader = new THREE.TextureLoader();
    const facePaths = [
      '/images/mascot/face_0.png',
      '/images/mascot/face_1.png',
      '/images/mascot/face_2.png',
      '/images/mascot/face_3.png'
    ];

    const textures = facePaths.map((p) => {
      const tex = textureLoader.load(p, () => {
        renderer.render(scene, camera);
      });
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      return tex;
    });

    const vertexShader = `
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vUv = vec2(position.x * 0.5 + 0.5, position.y * 0.5 + 0.5);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform sampler2D uTexture;
      varying vec3 vNormal;
      varying vec2 vUv;

      void main() {
        if (vNormal.z < 0.0) discard;
        vec4 tex = texture2D(uTexture, vUv);
        gl_FragColor = tex;
      }
    `;

    const sphereGeo = new THREE.SphereGeometry(1.0, 64, 64);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: textures[0] }
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true
    });

    const mesh = new THREE.Mesh(sphereGeo, material);
    scene.add(mesh);

    let targetRotX = 0;
    let targetRotY = 0;
    let currentScale = 1.0;
    let targetScale = 1.0;
    let currentFace = 0;
    let t = 0;
    let isPaused = false;

    // Smooth cursor tracking across viewport
    window.addEventListener(
      'mousemove',
      (e) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        targetRotY = nx * 0.42;
        targetRotX = -ny * 0.42;
      },
      { passive: true }
    );

    // Interactive squish & face cycle on click
    wrapper.addEventListener('click', () => {
      currentFace = (currentFace + 1) % textures.length;
      material.uniforms.uTexture.value = textures[currentFace];
      targetScale = 0.86;
      setTimeout(() => {
        targetScale = 1.0;
      }, 120);

      // Play boutique click audio if available
      try {
        const audio = new Audio('/sounds/click.mp3');
        audio.volume = 0.35;
        audio.play().catch(() => {});
      } catch (_) {}
    });

    document.addEventListener('visibilitychange', () => {
      isPaused = document.hidden;
    });

    function render() {
      requestAnimationFrame(render);
      if (isPaused) return;

      t += 0.026;
      mesh.rotation.y += (targetRotY - mesh.rotation.y) * 0.08;
      mesh.rotation.x += (targetRotX - mesh.rotation.x) * 0.08;

      mesh.position.y = Math.sin(t) * 0.035;

      currentScale += (targetScale - currentScale) * 0.16;
      mesh.scale.set(currentScale, currentScale, currentScale);

      renderer.render(scene, camera);
    }
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.addEventListener('load', init);
})();
