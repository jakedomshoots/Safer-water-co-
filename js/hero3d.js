// Hero: a glass droplet refracting a drafted grid, wireframe companion drops,
// ink-dot bubbles and a wireframe water surface that ripples under the cursor.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('heroCanvas');

const INK = 0x0f3a66, PAPER = 0xeef2f6;

export function gridTexture(size = 1024, cells = 10, minor = 5) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#eef2f6'; g.fillRect(0, 0, size, size);
  const step = size / cells;
  for (let i = 0; i <= cells; i++) {
    for (let j = 1; j < minor; j++) { g.strokeStyle = 'rgba(15,58,102,0.09)'; g.lineWidth = 1; const p = i * step + (j * step) / minor; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, size); g.moveTo(0, p); g.lineTo(size, p); g.stroke(); }
    g.strokeStyle = 'rgba(15,58,102,0.2)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step, size); g.moveTo(0, i * step); g.lineTo(size, i * step); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

if (canvas) init();

function init() {
  const isMobile = window.matchMedia('(max-width: 860px)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 2));
  renderer.setClearColor(PAPER, 1);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PAPER, 14, 40);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0.6, 10);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 6, 6); scene.add(key);

  // Drafting paper backdrop (the big drop refracts this)
  const gridTex = gridTexture();
  gridTex.repeat.set(6, 4);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshBasicMaterial({ map: gridTex }));
  paper.position.z = -7; scene.add(paper);

  // ---------- Teardrop geometry ----------
  function teardrop(radius, detail) {
    const g = new THREE.SphereGeometry(radius, detail, detail);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i); const t = THREE.MathUtils.clamp((y / radius + 1) / 2, 0, 1);
      const pinch = 1 - Math.pow(t, 2.2) * 0.85;
      pos.setX(i, pos.getX(i) * pinch); pos.setZ(i, pos.getZ(i) * pinch); pos.setY(i, y + Math.pow(t, 3) * radius * 0.7);
    }
    g.computeVertexNormals(); return g;
  }

  const drops = new THREE.Group(); scene.add(drops);

  // Hero drop: real glass
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xe8f7ff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 2.2, ior: 1.33,
    clearcoat: 1, clearcoatRoughness: 0.03, attenuationColor: new THREE.Color(0x9fd8f2), attenuationDistance: 3.5, envMapIntensity: 0.9, specularIntensity: 1,
  });
  const hero = new THREE.Mesh(teardrop(1.6, isMobile ? 48 : 96), glass);
  hero.position.set(isMobile ? 2.1 : 3.6, isMobile ? 4.6 : 0.3, isMobile ? -2.5 : 0);
  if (isMobile) hero.scale.setScalar(0.7);
  hero.userData = { base: hero.position.clone(), speed: 0.35, amp: 0.22, rot: 0.1 };
  drops.add(hero);
  // Ink outline on the hero drop: a slightly larger back-face shell
  const outline = new THREE.Mesh(hero.geometry, new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide, transparent: true, opacity: 0.55 }));
  outline.scale.setScalar(1.012); hero.add(outline);

  // Companion drops: drafted wireframe meshes
  const wireMat = new THREE.MeshBasicMaterial({ color: INK, wireframe: true, transparent: true, opacity: 0.32 });
  const fillMat = new THREE.MeshBasicMaterial({ color: 0xc7e9f8, transparent: true, opacity: 0.35 });
  const smallCount = isMobile ? 4 : 8;
  for (let i = 0; i < smallCount; i++) {
    const r = THREE.MathUtils.randFloat(0.22, 0.55);
    const geo = teardrop(r, 14);
    const m = new THREE.Mesh(geo, fillMat); m.add(new THREE.Mesh(geo, wireMat));
    const onRight = isMobile || Math.random() < 0.7;
    const px = onRight ? THREE.MathUtils.randFloat(0.6, 8) : THREE.MathUtils.randFloat(-7.5, -5);
    m.position.set(px, THREE.MathUtils.randFloatSpread(6), onRight ? THREE.MathUtils.randFloat(-3, 1) : THREE.MathUtils.randFloat(-5, -2));
    m.userData = { base: m.position.clone(), speed: THREE.MathUtils.randFloat(0.25, 0.6), amp: THREE.MathUtils.randFloat(0.15, 0.4), rot: THREE.MathUtils.randFloat(0.1, 0.35), phase: Math.random() * 6.28 };
    drops.add(m);
  }

  // ---------- Ink-dot bubbles ----------
  const N = isMobile ? 350 : 900;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(N * 3), pSeed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pPos[i * 3] = THREE.MathUtils.randFloatSpread(26); pPos[i * 3 + 1] = THREE.MathUtils.randFloatSpread(14); pPos[i * 3 + 2] = THREE.MathUtils.randFloat(-6, 2); pSeed[i] = Math.random(); }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('seed', new THREE.BufferAttribute(pSeed, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float seed; uniform float uTime; uniform float uPR; varying float vA;
      void main(){ vec3 p = position; p.y = mod(p.y + uTime * (0.2 + seed * 0.5) + 7.0, 14.0) - 7.0; p.x += sin(uTime * 0.5 + seed * 20.0) * 0.3;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = (1.5 + seed * 2.5) * uPR * (12.0 / -mv.z); vA = 0.25 + seed * 0.5; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
      float ring = smoothstep(0.5, 0.4, d) * smoothstep(0.28, 0.4, d); float core = smoothstep(0.18, 0.0, d);
      gl_FragColor = vec4(vec3(0.06, 0.23, 0.4), (ring + core * 0.6) * vA); }`,
  });
  scene.add(new THREE.Points(pGeo, pMat));

  // ---------- Wireframe water surface ----------
  const wGeo = new THREE.PlaneGeometry(60, 36, isMobile ? 48 : 90, isMobile ? 28 : 54);
  const wMat = new THREE.ShaderMaterial({
    wireframe: true, transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(0, 0) }, uDrip: { value: new THREE.Vector3(0, 0, -100) } },
    vertexShader: `uniform float uTime; uniform vec2 uMouse; uniform vec3 uDrip; varying float vH; varying vec3 vPos;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      void main(){ vec3 p = position; float t = uTime * 0.3;
        float h = noise(p.xy * 0.22 + t) * 0.7 + noise(p.xy * 0.55 - t * 0.6) * 0.25 + sin(p.x * 0.7 + t * 2.0) * 0.12;
        vec2 m = uMouse * vec2(15.0, 8.0); float d = distance(p.xy, m); h += sin(d * 2.6 - uTime * 3.0) * exp(-d * 0.4) * 0.45;
        float age = uTime - uDrip.z; float dd = distance(p.xy, uDrip.xy); float ring = sin(dd * 3.2 - age * 6.0) * exp(-dd * 0.35) * exp(-age * 0.9) * step(0.0, age) * smoothstep(age * 4.0 + 0.5, age * 4.0 - 1.5, dd) * 0.9; h += ring;
        p.z += h; vH = h; vPos = p; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `varying float vH; varying vec3 vPos; void main(){ float fade = smoothstep(-18.0, 0.0, vPos.y) * smoothstep(34.0, 10.0, abs(vPos.x));
      float crest = smoothstep(0.1, 0.9, vH); vec3 col = mix(vec3(0.06, 0.23, 0.4), vec3(0.82, 0.27, 0.18), crest * 0.35);
      gl_FragColor = vec4(col, (0.16 + crest * 0.3) * fade); }`,
  });
  const water = new THREE.Mesh(wGeo, wMat);
  water.rotation.x = -Math.PI / 2 + 0.1; water.position.y = -3.2; scene.add(water);

  // Contact shadow under the hero drop + a small drip that falls and rings the water
  const shC = document.createElement('canvas'); shC.width = shC.height = 256; const sg = shC.getContext('2d');
  const grad = sg.createRadialGradient(128, 128, 10, 128, 128, 128); grad.addColorStop(0, 'rgba(10,44,80,0.28)'); grad.addColorStop(1, 'rgba(10,44,80,0)'); sg.fillStyle = grad; sg.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shC), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2 + 0.1; shadow.position.set(hero.position.x, -3.15, hero.position.z); scene.add(shadow);
  const drip = new THREE.Mesh(teardrop(0.14, 24), glass); drip.visible = false; scene.add(drip);
  let dripT0 = 2.5; const DRIP_EVERY = 5.5, FALL = 0.9;

  // ---------- Interaction ----------
  const mouse = new THREE.Vector2(0, 0), target = new THREE.Vector2(0, 0);
  window.addEventListener('pointermove', e => { target.x = (e.clientX / window.innerWidth) * 2 - 1; target.y = -(e.clientY / window.innerHeight) * 2 + 1; }, { passive: true });

  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize); resize();
  let visible = true; new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(canvas);

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick); if (!visible) return;
    const t = reduced ? 0 : clock.getElapsedTime();
    mouse.lerp(target, 0.05);
    pMat.uniforms.uTime.value = t; wMat.uniforms.uTime.value = t; wMat.uniforms.uMouse.value.copy(mouse);
    gridTex.offset.y = t * 0.004;
    drops.children.forEach(m => { const u = m.userData, ph = u.phase || 0; m.position.y = u.base.y + Math.sin(t * u.speed + ph) * u.amp; m.position.x = u.base.x + Math.cos(t * u.speed * 0.7 + ph) * u.amp * 0.4; m.rotation.y = t * u.rot; m.rotation.z = Math.sin(t * 0.4 + ph) * 0.1; });
    hero.rotation.y = t * 0.12 + mouse.x * 0.4; hero.rotation.x = -mouse.y * 0.22;
    const wob = 1 + Math.sin(t * 2.1) * 0.012; hero.scale.set((isMobile ? 0.7 : 1) / wob, (isMobile ? 0.7 : 1) * wob, (isMobile ? 0.7 : 1) / wob);
    shadow.position.x = hero.position.x; shadow.scale.setScalar(1 + (hero.position.y - hero.userData.base.y) * 0.1);
    // drip cycle
    if (!reduced && t > dripT0) {
      const age = t - dripT0;
      if (age < FALL) { drip.visible = true; const bottom = hero.position.y - 1.7 * (isMobile ? 0.7 : 1); const yy = bottom - (age / FALL) * (age / FALL) * (bottom + 3.2); drip.position.set(hero.position.x, yy, hero.position.z); drip.scale.setScalar(0.6 + age * 0.5); }
      else { if (drip.visible) { drip.visible = false; wMat.uniforms.uDrip.value.set(hero.position.x, -hero.position.z, t); } if (age > DRIP_EVERY) dripT0 = t + 0.2; }
    }
    camera.position.x += (mouse.x * 0.7 - camera.position.x) * 0.04; camera.position.y += (0.6 + mouse.y * 0.45 - camera.position.y) * 0.04;
    camera.lookAt(0, 0.2, 0);
    renderer.render(scene, camera);
  }
  tick();
}
