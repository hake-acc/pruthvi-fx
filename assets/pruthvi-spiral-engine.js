/**
 * Pruthvi FX — 3D WebGL Cylindrical Spiral Project Browser
 * Foundation adapted from Aarav Pilania & Pacôme Pertant (ISC License)
 * Engineered for Minecraft 100 Days, Hardcore & SMP Thumbnail Showcase
 */

(function () {
  'use strict';

  class PruthviSpiralEngine {
    constructor(containerId, options = {}) {
      this.container = document.getElementById(containerId);
      if (!this.container || typeof THREE === 'undefined') return;

      this.options = Object.assign({
        radius: 460,
        heightStep: 85,
        angleStep: 0.38,
        cardWidth: 260,
        cardHeight: 146,
        onCardClick: null,
        onHoverChange: null
      }, options);

      this.projects = [];
      this.meshes = [];
      this.textures = [];

      this.scrollProgress = 0;
      this.targetScroll = 0;
      this.velocity = 0;
      this.isDragging = false;
      this.dragStartY = 0;
      this.dragStartScroll = 0;
      this.lastPointerY = 0;

      this.raycaster = new THREE.Raycaster();
      this.pointer = new THREE.Vector2(-999, -999);
      this.hoveredMesh = null;
      this.rafId = null;
      this.isActive = false;

      this.initScene();
    }

    initScene() {
      const width = this.container.clientWidth || window.innerWidth;
      const height = this.container.clientHeight || (window.innerHeight * 0.85);

      // 1. Scene & Fog
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x06040a, 0.00085);

      // 2. Camera
      this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
      this.camera.position.set(0, 0, 920);

      // 3. Renderer
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.container.appendChild(this.renderer.domElement);

      // 4. Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
      this.scene.add(ambientLight);

      const purplePoint = new THREE.PointLight(0xa855f7, 3.5, 1600);
      purplePoint.position.set(0, 200, 600);
      this.scene.add(purplePoint);

      const cyanPoint = new THREE.PointLight(0x06b6d4, 2.0, 1400);
      cyanPoint.position.set(0, -300, 500);
      this.scene.add(cyanPoint);

      this.bindEvents();
    }

    createCurvedPlaneGeometry(width, height, radius, segments = 16) {
      const geom = new THREE.PlaneGeometry(width, height, segments, 1);
      const pos = geom.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        // Curve along cylinder circumference: z = R - sqrt(R^2 - x^2) ~ -(x^2)/(2R)
        const z = -((x * x) / (2 * radius));
        pos.setZ(i, z);
      }
      geom.computeVertexNormals();
      return geom;
    }

    loadProjects(projects) {
      this.projects = projects;
      this.meshes.forEach(m => this.scene.remove(m));
      this.meshes = [];

      const geom = this.createCurvedPlaneGeometry(
        this.options.cardWidth,
        this.options.cardHeight,
        this.options.radius
      );

      const textureLoader = new THREE.TextureLoader();

      projects.forEach((proj, idx) => {
        // Create card group
        const group = new THREE.Group();
        group.userData = { project: proj, index: idx };

        // Texture with fallback material
        const texture = textureLoader.load(proj.image);
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        this.textures.push(texture);

        const material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.25,
          metalness: 0.1,
          emissive: new THREE.Color(0x2e1065),
          emissiveIntensity: 0.15,
          side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geom, material);
        mesh.userData = { project: proj, index: idx };
        group.add(mesh);

        // Subtle glowing border plane behind card
        const borderGeom = this.createCurvedPlaneGeometry(
          this.options.cardWidth + 8,
          this.options.cardHeight + 8,
          this.options.radius
        );
        const borderMat = new THREE.MeshBasicMaterial({
          color: 0x8b5cf6,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide
        });
        const borderMesh = new THREE.Mesh(borderGeom, borderMat);
        borderMesh.position.z = -1.5;
        group.add(borderMesh);
        group.borderMesh = borderMesh;

        this.scene.add(group);
        this.meshes.push(group);
      });

      this.updateMeshPositions();
    }

    updateMeshPositions() {
      const count = this.meshes.length;
      if (!count) return;

      const totalSpan = count * this.options.heightStep;

      this.meshes.forEach((group, idx) => {
        // Continuous wrapping helix formula
        const rawProgress = (idx - this.scrollProgress);
        const angle = rawProgress * this.options.angleStep;
        const y = -rawProgress * this.options.heightStep;

        const x = Math.sin(angle) * this.options.radius;
        const z = Math.cos(angle) * this.options.radius - this.options.radius;

        group.position.set(x, y, z);
        group.rotation.y = angle;

        // Depth dimming & opacity
        const distFromCenter = Math.abs(y);
        const alpha = Math.max(0.15, 1 - distFromCenter / 1200);

        const mesh = group.children[0];
        if (mesh && mesh.material) {
          mesh.material.opacity = alpha;
        }

        // Elevate hovered card
        if (this.hoveredMesh === mesh) {
          group.scale.set(1.08, 1.08, 1.08);
          if (group.borderMesh) {
            group.borderMesh.material.opacity = 0.95;
            group.borderMesh.material.color.setHex(0xc084fc);
          }
          if (mesh.material.emissive) {
            mesh.material.emissive.setHex(0x7c3aed);
            mesh.material.emissiveIntensity = 0.45;
          }
        } else {
          group.scale.set(1.0, 1.0, 1.0);
          if (group.borderMesh) {
            group.borderMesh.material.opacity = 0.35;
            group.borderMesh.material.color.setHex(0x8b5cf6);
          }
          if (mesh && mesh.material && mesh.material.emissive) {
            mesh.material.emissive.setHex(0x2e1065);
            mesh.material.emissiveIntensity = 0.15;
          }
        }
      });
    }

    bindEvents() {
      const dom = this.renderer.domElement;

      // Wheel
      dom.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.targetScroll += e.deltaY * 0.0035;
        this.clampScroll();
      }, { passive: false });

      // Pointer Drag
      const onPointerDown = (e) => {
        this.isDragging = true;
        this.dragStartY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
        this.dragStartScroll = this.targetScroll;
        this.lastPointerY = this.dragStartY;
        this.velocity = 0;
        dom.style.cursor = 'grabbing';
      };

      const onPointerMove = (e) => {
        const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;

        // Update raycaster coords
        const rect = dom.getBoundingClientRect();
        this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        if (this.isDragging) {
          const deltaY = clientY - this.lastPointerY;
          this.velocity = -deltaY * 0.008;
          this.targetScroll += this.velocity;
          this.lastPointerY = clientY;
          this.clampScroll();
        }
      };

      const onPointerUp = () => {
        this.isDragging = false;
        dom.style.cursor = 'grab';
      };

      dom.addEventListener('mousedown', onPointerDown);
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);

      dom.addEventListener('touchstart', onPointerDown, { passive: true });
      window.addEventListener('touchmove', onPointerMove, { passive: true });
      window.addEventListener('touchend', onPointerUp);

      // Click raycast
      dom.addEventListener('click', (e) => {
        if (Math.abs(this.velocity) > 0.02) return; // ignore click during fast drag

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const clickable = this.meshes.map(g => g.children[0]);
        const intersects = this.raycaster.intersectObjects(clickable);

        if (intersects.length > 0) {
          const hit = intersects[0].object;
          if (this.options.onCardClick && hit.userData.project) {
            this.options.onCardClick(hit.userData.project, hit.userData.index);
          }
        }
      });

      // Resize
      window.addEventListener('resize', () => {
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || (window.innerHeight * 0.85);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      });
    }

    clampScroll() {
      const maxScroll = Math.max(0, this.meshes.length - 1);
      this.targetScroll = Math.max(-0.5, Math.min(maxScroll + 0.5, this.targetScroll));
    }

    checkRaycastHover() {
      if (this.isDragging) return;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const clickable = this.meshes.map(g => g.children[0]);
      const intersects = this.raycaster.intersectObjects(clickable);

      const nextHover = intersects.length > 0 ? intersects[0].object : null;
      if (nextHover !== this.hoveredMesh) {
        this.hoveredMesh = nextHover;
        if (this.options.onHoverChange) {
          this.options.onHoverChange(this.hoveredMesh ? this.hoveredMesh.userData.project : null);
        }
      }
    }

    tick() {
      if (!this.isActive) return;

      // Friction momentum
      if (!this.isDragging && Math.abs(this.velocity) > 0.0001) {
        this.targetScroll += this.velocity;
        this.velocity *= 0.91;
        this.clampScroll();
      }

      // Smooth camera interpolation
      const diff = this.targetScroll - this.scrollProgress;
      this.scrollProgress += diff * 0.09;

      this.checkRaycastHover();
      this.updateMeshPositions();
      this.renderer.render(this.scene, this.camera);

      this.rafId = requestAnimationFrame(() => this.tick());
    }

    start() {
      if (this.isActive) return;
      this.isActive = true;
      this.tick();
    }

    stop() {
      this.isActive = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
    }

    destroy() {
      this.stop();
      this.meshes.forEach(g => {
        this.scene.remove(g);
        g.children.forEach(c => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) c.material.dispose();
        });
      });
      this.textures.forEach(t => t.dispose());
      if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }

  window.PruthviSpiralEngine = PruthviSpiralEngine;
})();
