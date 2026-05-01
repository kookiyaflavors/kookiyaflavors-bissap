/* Kookiya Flavors · Capsule Bissap
   scene.js — Three.js fleur d'hibiscus 5 pétales + éclosion + plongée + ondes CSS.
   Module ES, chargé via <script type="module">.
   Three.js r158+ via unpkg ESM. */

import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.min.js';

(() => {
  'use strict';

  // ─── Guards ──────────────────────────────────────────────
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    document.querySelectorAll('.hero__canvas[data-scene="bissap"]').forEach(c => {
      c.style.display = 'none';
    });
    return;
  }

  const canvas = document.querySelector('.hero__canvas[data-scene="bissap"]');
  if (!canvas) return;
  const hero = canvas.closest('.hero');
  if (!hero) return;

  // ─── Three.js setup ──────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(45, hero.clientWidth / hero.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 3.5);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(hero.clientWidth, hero.clientHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // ─── Lights · ambient + warm + rim cool rose ─────────────
  scene.add(new THREE.AmbientLight(0xFBF3E3, 0.5));

  const dirWarm = new THREE.DirectionalLight(0xFFE5C2, 1.3);
  dirWarm.position.set(-3, 4, 2);
  scene.add(dirWarm);

  const rimRose = new THREE.DirectionalLight(0xF2A7B8, 0.3);
  rimRose.position.set(3, -1, -2);
  scene.add(rimRose);

  // ─── Fleur d'hibiscus · 5 pétales courbés ────────────────
  const flower = new THREE.Group();

  const buildPetalGeo = () => {
    const geo = new THREE.PlaneGeometry(0.6, 1.2, 6, 14);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Cup le pétale (z négatif au centre)
      const cup = -0.18 * Math.pow(y / 0.6, 2);
      // Largeur tapered : pic au milieu, fin à la base et à la pointe
      const t = (y + 0.6) / 1.2; // 0..1
      const xScale = Math.pow(Math.sin(t * Math.PI), 0.55) * 0.95 + 0.12;
      pos.setXYZ(i, x * xScale, y, cup);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  };

  const petalGeo = buildPetalGeo();
  const petalMat = new THREE.MeshPhysicalMaterial({
    color: 0xC1294A,
    roughness: 0.5,
    metalness: 0.05,
    clearcoat: 0.2,
    clearcoatRoughness: 0.5,
    side: THREE.DoubleSide
  });

  const PETAL_INITIAL_ROT_X = -Math.PI / 2.4; // bouton fermé
  const petalPivots = [];
  for (let i = 0; i < 5; i++) {
    const pivot = new THREE.Group();
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.y = 0.6; // décalage au-dessus du pivot
    pivot.add(petal);
    pivot.rotation.y = (i * Math.PI * 2) / 5; // 72° entre pétales
    pivot.rotation.x = PETAL_INITIAL_ROT_X;
    flower.add(pivot);
    petalPivots.push(pivot);
  }

  // ─── Étamines centrales (sphère métal or léger) ──────────
  const stamensGeo = new THREE.SphereGeometry(0.16, 18, 14);
  const stamensMat = new THREE.MeshPhysicalMaterial({
    color: 0xC9933A,
    roughness: 0.3,
    metalness: 0.7
  });
  const stamens = new THREE.Mesh(stamensGeo, stamensMat);
  stamens.position.y = 0.05;
  stamens.scale.setScalar(0); // invisibles au départ, montent après éclosion
  flower.add(stamens);

  scene.add(flower);

  // ─── Particules · 400 rose poudré qui descendent ─────────
  const particleCount = 400;
  const particlePositions = new Float32Array(particleCount * 3);
  const particleVelocities = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const r = Math.cbrt(Math.random()) * 4;
    particlePositions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    particlePositions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    particlePositions[i*3+2] = r * Math.cos(phi);
    particleVelocities[i*3]   = (Math.random() - 0.5) * 0.0005;
    particleVelocities[i*3+1] = -0.005 - Math.random() * 0.003; // dérive y descendante
    particleVelocities[i*3+2] = (Math.random() - 0.5) * 0.0005;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xF2A7B8,
    size: 0.012,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // ─── Drag interaction (rotation Y et X · inertie 0.94) ───
  let dragging = false;
  let dragVelY = 0, dragVelX = 0;
  let lastX = 0, lastY = 0;

  const onPointerDown = (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    dragVelY = (e.clientX - lastX) * 0.005;
    dragVelX = (e.clientY - lastY) * 0.003;
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    canvas.style.cursor = 'grab';
  };

  canvas.style.pointerEvents = 'auto';
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('lostpointercapture', onPointerUp);

  // ─── Scroll trigger : plongée à 50% + ondes CSS ──────────
  let plungeAmount = 0;
  let plungeTriggered = false;
  const wavesEl = hero.querySelector('.hero__waves');

  const updatePlunge = () => {
    const rect = hero.getBoundingClientRect();
    const heroH = hero.offsetHeight;
    const progress = Math.max(0, Math.min(1, -rect.top / heroH));
    const trigger = 0.5;
    plungeAmount = progress > trigger ? (progress - trigger) / (1 - trigger) : 0;
    if (progress > trigger && !plungeTriggered && wavesEl) {
      plungeTriggered = true;
      wavesEl.classList.add('is-active');
      setTimeout(() => wavesEl.classList.remove('is-active'), 1800);
    }
    if (progress < trigger - 0.05) {
      plungeTriggered = false;
    }
  };

  // ─── IntersectionObserver · pause hors viewport ──────────
  let isVisible = true;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { isVisible = e.isIntersecting; });
  }, { rootMargin: '120px' });
  obs.observe(hero);

  // ─── Animation d'éclosion (stagger 80ms × 5 pétales) ─────
  const eclosionStart = performance.now();
  const eclosionDuration = 2500; // ms
  const staggerDelay = 80; // ms
  const easeLuxe = (t) => 1 - Math.pow(1 - t, 3);

  // ─── Animation loop ──────────────────────────────────────
  let time = 0;
  let lastFrameTime = performance.now();

  const tick = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    time += dt;

    if (!isVisible) return;

    updatePlunge();

    // Drag inertie + autonome subtile
    flower.rotation.y += dragVelY;
    flower.rotation.x = Math.max(-0.5, Math.min(0.5, flower.rotation.x + dragVelX));
    dragVelY *= 0.94;
    dragVelX *= 0.94;
    if (Math.abs(dragVelY) < 0.0001 && !dragging) {
      flower.rotation.y += 0.0008;
    }

    // Eclosion stagger
    const elapsed = now - eclosionStart;
    petalPivots.forEach((pivot, i) => {
      const local = Math.max(0, elapsed - i * staggerDelay);
      const t = Math.min(1, local / eclosionDuration);
      const eased = easeLuxe(t);
      pivot.rotation.x = PETAL_INITIAL_ROT_X + (0 - PETAL_INITIAL_ROT_X) * eased;
    });

    // Étamines montent après les pétales (delay 1.2s, durée 1.5s)
    const stamensProgress = Math.min(1, Math.max(0, (elapsed - 1200) / 1500));
    stamens.scale.setScalar(easeLuxe(stamensProgress));

    // Flottement post-éclosion + plongée scroll-driven
    const eclosionDone = elapsed > eclosionDuration + 4 * staggerDelay;
    const floatY = eclosionDone ? Math.sin((time / 5) * Math.PI * 2) * 0.04 : 0;
    flower.position.y = floatY - plungeAmount * 2;

    // Particules dérive descendante + wrap
    const ppos = particleGeo.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      ppos[i*3]   += particleVelocities[i*3];
      ppos[i*3+1] += particleVelocities[i*3+1];
      ppos[i*3+2] += particleVelocities[i*3+2];
      if (ppos[i*3+1] < -4) ppos[i*3+1] = 4;
      if (Math.abs(ppos[i*3])   > 4.5) ppos[i*3]   = -Math.sign(ppos[i*3]) * 4;
      if (Math.abs(ppos[i*3+2]) > 4.5) ppos[i*3+2] = -Math.sign(ppos[i*3+2]) * 4;
    }
    particleGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  };

  if (window.gsap) {
    gsap.ticker.add(tick);
  } else {
    const loop = () => { tick(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  // ─── Resize ──────────────────────────────────────────────
  const onResize = () => {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  window.addEventListener('resize', onResize);

})();
