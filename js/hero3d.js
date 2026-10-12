// Hero scene: refractive water droplets, rising bubble field, and a living water surface.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('heroCanvas');
if (canvas) init();

function init() {
  const isMobile = window.matchMedia('(max-width: 860px)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030b16, 0.045);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.4, 9);

  // Environment for refraction / reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // Lights
  const key = new THREE.PointLight(0x8ff2ff, 60, 30, 1.6); key.position.set(4, 4, 4); scene.add(key);
  const rim = new THREE.PointLight(0x1ea7ff, 40, 30, 1.6); rim.position.set(-6, -2, 2); scene.add(rim);
  scene.add(new THREE.AmbientLight(0x1b3b5a, 0.6));

  // ---------- Droplets ----------
  const drops = new THREE.Group();
  scene.add(drops);

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xbff4ff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 1.6, ior: 1.33,
    clearcoat: 1, clearcoatRoughness: 0.05, attenuationColor: new THREE.Color(0x4fd8ff), attenuationDistance: 2.5,
    envMapIntensity: 1.2,
  });
  const glassLite = new THREE.MeshPhysicalMaterial({
    color: 0x8fe9ff, metalness: 0, roughness: 0.08, transparent: true, opacity: 0.55,
    clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.4,
  });

  // Teardrop geometry: a sphere pulled upward at the top
  function teardrop(radius, detail) {
    const g = new THREE.SphereGeometry(radius, detail, detail);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = THREE.MathUtils.clamp((y / radius + 1) / 2, 0, 1); // 0 bottom .. 1 top
      const pinch = 1 - Math.pow(t, 2.2) * 0.85;
      pos.setX(i, pos.getX(i) * pinch);
      pos.setZ(i, pos.getZ(i) * pinch);
      pos.setY(i, y + Math.pow(t, 3) * radius * 0.7);
    }
    g.computeVertexNormals();
    return g;
  }

  const hero = new THREE.Mesh(teardrop(1.55, isMobile ? 48 : 96), glass);
  hero.position.set(isMobile ? 1.4 : 3.4, isMobile ? 3.1 : 0.4, isMobile ? -1.2 : 0);
  if (isMobile) hero.scale.setScalar(0.8);
  drops.add(hero);
  hero.userData = { base: hero.position.clone(), speed: 0.35, amp: 0.25, rot: 0.08 };

  const smallCount = isMobile ? 5 : 9;
  for (let i = 0; i < smallCount; i++) {
    const r = THREE.MathUtils.randFloat(0.12, 0.42);
    const m = new THREE.Mesh(teardrop(r, 32), i % 3 === 0 && !isMobile ? glass : glassLite);
    // keep small drops clear of the headline on desktop: right half, or far back on the left
    const onRight = isMobile || Math.random() < 0.7;
    const px = onRight ? THREE.MathUtils.randFloat(0.5, 7.5) : THREE.MathUtils.randFloat(-7, -4.5);
    m.position.set(px, THREE.MathUtils.randFloatSpread(6), onRight ? THREE.MathUtils.randFloat(-3, 1.5) : THREE.MathUtils.randFloat(-5, -2));
    m.userData = { base: m.position.clone(), speed: THREE.MathUtils.randFloat(0.25, 0.7), amp: THREE.MathUtils.randFloat(0.15, 0.45), rot: THREE.MathUtils.randFloat(0.1, 0.4), phase: Math.random() * Math.PI * 2 };
    drops.add(m);
  }

  // ---------- Bubble field (points) ----------
  const N = isMobile ? 500 : 1400;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(N * 3);
  const pSeed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pPos[i * 3] = THREE.MathUtils.randFloatSpread(24);
    pPos[i * 3 + 1] = THREE.MathUtils.randFloatSpread(14);
    pPos[i * 3 + 2] = THREE.MathUtils.randFloat(-8, 3);
    pSeed[i] = Math.random();
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('seed', new THREE.BufferAttribute(pSeed, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float seed; uniform float uTime; uniform float uPixelRatio; varying float vA;
      void main(){
        vec3 p = position;
        float sp = 0.25 + seed * 0.6;
        p.y = mod(p.y + uTime * sp + 7.0, 14.0) - 7.0;
        p.x += sin(uTime * 0.6 + seed * 20.0) * 0.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float size = (1.2 + seed * 3.0) * uPixelRatio;
        gl_PointSize = size * (14.0 / -mv.z);
        vA = 0.25 + seed * 0.6;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vA;
      void main(){
        vec2 c = gl_PointCoord - 0.5; float d = length(c);
        float a = smoothstep(0.5, 0.0, d) * vA;
        float ring = smoothstep(0.5, 0.42, d) * smoothstep(0.3, 0.42, d) * 0.9;
        vec3 col = mix(vec3(0.31, 0.85, 1.0), vec3(0.9, 1.0, 1.0), ring);
        gl_FragColor = vec4(col, a * 0.8 + ring * 0.4);
      }`,
  });
  scene.add(new THREE.Points(pGeo, pMat));

  // ---------- Water surface ----------
  const wGeo = new THREE.PlaneGeometry(60, 40, isMobile ? 80 : 180, isMobile ? 60 : 120);
  const wMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(0, 0) } },
    vertexShader: `
      uniform float uTime; uniform vec2 uMouse; varying float vH; varying vec3 vPos;
      // simple value noise
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec3 p = position;
        float t = uTime * 0.35;
        float h = noise(p.xy * 0.25 + t) * 0.6 + noise(p.xy * 0.6 - t * 0.7) * 0.25 + sin(p.x * 0.8 + t * 2.0) * 0.12;
        // ripple from mouse
        vec2 m = uMouse * vec2(14.0, 8.0);
        float d = distance(p.xy, m);
        h += sin(d * 3.0 - uTime * 3.0) * exp(-d * 0.45) * 0.35;
        p.z += h;
        vH = h; vPos = p;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      varying float vH; varying vec3 vPos;
      void main(){
        float crest = smoothstep(0.2, 0.9, vH);
        vec3 deep = vec3(0.02, 0.10, 0.22);
        vec3 light = vec3(0.31, 0.85, 1.0);
        vec3 col = mix(deep, light, crest * 0.9);
        // grid-ish caustic lines
        float lines = smoothstep(0.96, 1.0, sin(vPos.x * 2.0 + vH * 6.0) * sin(vPos.y * 2.0 - vH * 5.0));
        col += lines * vec3(0.5, 0.95, 1.0) * 0.6;
        float fade = smoothstep(-20.0, 2.0, vPos.y);
        gl_FragColor = vec4(col, (0.35 + crest * 0.45) * fade);
      }`,
  });
  const water = new THREE.Mesh(wGeo, wMat);
  water.rotation.x = -Math.PI / 2 + 0.08;
  water.position.y = -3.4;
  scene.add(water);

  // ---------- Interaction ----------
  const mouse = new THREE.Vector2(0, 0);
  const target = new THREE.Vector2(0, 0);
  window.addEventListener('pointermove', (e) => {
    target.x = (e.clientX / window.innerWidth) * 2 - 1;
    target.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(canvas);

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = reduced ? 0 : clock.getElapsedTime();
    mouse.lerp(target, 0.05);

    pMat.uniforms.uTime.value = t;
    wMat.uniforms.uTime.value = t;
    wMat.uniforms.uMouse.value.copy(mouse);

    drops.children.forEach((m) => {
      const u = m.userData;
      const ph = u.phase || 0;
      m.position.y = u.base.y + Math.sin(t * u.speed + ph) * u.amp;
      m.position.x = u.base.x + Math.cos(t * u.speed * 0.7 + ph) * u.amp * 0.4;
      m.rotation.y = t * u.rot;
      m.rotation.z = Math.sin(t * 0.4 + ph) * 0.12;
    });
    hero.rotation.y = t * 0.12 + mouse.x * 0.4;
    hero.rotation.x = -mouse.y * 0.25;

    camera.position.x += (mouse.x * 0.8 - camera.position.x) * 0.04;
    camera.position.y += (0.4 + mouse.y * 0.5 - camera.position.y) * 0.04;
    camera.lookAt(0, 0.2, 0);

    renderer.render(scene, camera);
  }
  tick();
}
