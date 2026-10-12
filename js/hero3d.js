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

// Teardrop geometry: a sphere pulled upward into a point
export function teardrop(radius, detail) {
  const g = new THREE.SphereGeometry(radius, detail, detail);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i); const t = THREE.MathUtils.clamp((y / radius + 1) / 2, 0, 1);
    const pinch = 1 - Math.pow(t, 2.2) * 0.85;
    pos.setX(i, pos.getX(i) * pinch); pos.setZ(i, pos.getZ(i) * pinch); pos.setY(i, y + Math.pow(t, 3) * radius * 0.7);
  }
  g.computeVertexNormals(); return g;
}

// "Liquid" vertex deformation shared by any material: continuous ripple, neck stretch, cursor poke
export function makeLiquid() {
  const uniforms = { uTime: { value: 0 }, uWobble: { value: 0 }, uStretch: { value: 0 }, uPoke: { value: new THREE.Vector3() } };
  const key = 'liquid' + Math.random().toString(36).slice(2, 7);
  function liquify(mat) {
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>\nuniform float uTime; uniform float uWobble; uniform float uStretch; uniform vec3 uPoke;`)
        .replace('#include <begin_vertex>', `
          vec3 transformed = vec3(position);
          {
            float t = uTime; vec3 p = position;
            float w = sin(p.y * 3.1 + t * 2.4) * 0.5 + sin(p.x * 4.3 - t * 3.1 + p.z * 2.0) * 0.3 + sin(p.z * 5.2 + t * 2.0 + p.y) * 0.2;
            float amp = 0.03 + uWobble * 0.10;
            transformed += normal * w * amp;
            float low = smoothstep(0.3, -1.6, p.y);
            float tail = low * low;
            transformed.y -= uStretch * tail * 1.15;
            transformed.xz *= 1.0 - uStretch * tail * 0.6;
            transformed += uPoke * (0.6 + 0.4 * sin(p.y * 2.0 + t * 6.0)) * (1.0 - low * 0.5);
          }`);
    };
    mat.customProgramCacheKey = () => key;
  }
  return { uniforms, liquify };
}

export const GLASS_OPTS = {
  color: 0xe8f7ff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 2.2, ior: 1.33,
  clearcoat: 1, clearcoatRoughness: 0.03, attenuationColor: new THREE.Color(0x9fd8f2), attenuationDistance: 3.5, envMapIntensity: 0.9, specularIntensity: 1,
};

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

  const drops = new THREE.Group(); scene.add(drops);

  // Hero drop: real glass
  const glass = new THREE.MeshPhysicalMaterial(GLASS_OPTS);
  const { uniforms: liquid, liquify } = makeLiquid();
  liquify(glass);
  const hero = new THREE.Mesh(teardrop(1.6, isMobile ? 64 : 128), glass);
  hero.position.set(isMobile ? 2.1 : 3.6, isMobile ? 4.6 : 0.3, isMobile ? -2.5 : 0);
  if (isMobile) hero.scale.setScalar(0.7);
  hero.userData = { base: hero.position.clone(), speed: 0.35, amp: 0.22, rot: 0.1 };
  drops.add(hero);
  // Ink outline on the hero drop: a slightly larger back-face shell
  const outlineMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide, transparent: true, opacity: 0.55 }); liquify(outlineMat);
  const outline = new THREE.Mesh(hero.geometry, outlineMat);
  outline.scale.setScalar(1.012); hero.add(outline);

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
  const dripMat = new THREE.MeshPhysicalMaterial({ color: 0xcdeeff, roughness: 0.05, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.85, envMapIntensity: 1.2 });
  const drip = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 24), dripMat); drip.visible = false; scene.add(drip);
  const SPLASH = 16;
  const splash = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 10, 10), dripMat, SPLASH); splash.count = 0; scene.add(splash);
  const splashV = Array.from({ length: SPLASH }, () => new THREE.Vector3()), splashP = Array.from({ length: SPLASH }, () => new THREE.Vector3());
  let splashAlive = 0; const dummy = new THREE.Object3D();
  let splashFloor = -3.1;
  function burst(x, z, floorY = -3.1) {
    splashAlive = SPLASH; splash.count = SPLASH; splashFloor = floorY;
    for (let i = 0; i < SPLASH; i++) { const a = (i / SPLASH) * Math.PI * 2 + Math.random() * 0.4; const sp = 1.4 + Math.random() * 1.6; splashP[i].set(x, floorY, z); splashV[i].set(Math.cos(a) * sp * 0.6, 2.6 + Math.random() * 2.2, Math.sin(a) * sp * 0.6); }
  }
  // Drip timeline (seconds): neck stretches, drip tears off with recoil, falls, splashes
  const PERIOD = 4.8, STRETCH_T = 1.4, FALL = 0.72;
  let dripT0 = 2.0, dripped = false, lastT = 0;
  const easeInOut = (u) => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  // Cursor poke: spring that pushes the drop away from the pointer and jiggles back
  const pokeTarget = new THREE.Vector3(), pokeVel = new THREE.Vector3(), mouseWorld = new THREE.Vector3(), lastMouseWorld = new THREE.Vector3();

  // ---------- Interaction ----------
  const mouse = new THREE.Vector2(0, 0), target = new THREE.Vector2(0, 0);
  window.addEventListener('pointermove', e => { target.x = (e.clientX / window.innerWidth) * 2 - 1; target.y = -(e.clientY / window.innerHeight) * 2 + 1; }, { passive: true });

  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  // On phones the drop lives in a dedicated window between the intro and the buttons
  const stage = document.getElementById('heroStage');
  function fitStage() {
    if (!isMobile || !stage || !stage.offsetHeight) return;
    camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    const r = canvas.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const cx = sr.left + sr.width * 0.5, cy = sr.top + sr.height * 0.5;
    const ndc = new THREE.Vector3(((cx - r.left) / r.width) * 2 - 1, -(((cy - r.top) / r.height) * 2 - 1), 0.5);
    ndc.unproject(camera).sub(camera.position).normalize();
    const k = (0 - camera.position.z) / ndc.z; const pt = ndc.multiplyScalar(k).add(camera.position);
    const pxPerUnit = r.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z);
    const sc = (sr.height * 0.7 / pxPerUnit) / 3.4;
    hero.userData.base.set(pt.x, pt.y + 0.35 * sc, 0); hero.userData.amp = 0.08; hero.userData.scale = sc;
  }
  window.addEventListener('resize', () => { resize(); fitStage(); }); resize(); fitStage();
  setTimeout(fitStage, 400); setTimeout(fitStage, 2000);
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
    const dt = Math.min(0.05, t - lastT); lastT = t;
    const base = hero.userData.scale || (isMobile ? 0.7 : 1);
    hero.scale.setScalar(base);
    shadow.position.x = hero.position.x; shadow.scale.setScalar((isMobile ? base * 1.1 : 1) * (1 + (hero.position.y - hero.userData.base.y) * 0.1 + liquid.uStretch.value * 0.15));
    if (isMobile) shadow.position.y = hero.position.y - 3.55 * base;
    liquid.uTime.value = t;
    liquid.uWobble.value *= Math.pow(0.25, dt); // decay

    // --- cursor poke (pointer projected onto the drop's depth plane)
    mouseWorld.set(mouse.x, mouse.y, 0.5).unproject(camera).sub(camera.position).normalize();
    const k = (hero.position.z - camera.position.z) / mouseWorld.z; mouseWorld.multiplyScalar(k).add(camera.position);
    const toDrop = hero.position.clone().sub(mouseWorld); const d = toDrop.length(); const reach = 2.4 * base;
    const speed = mouseWorld.distanceTo(lastMouseWorld) / Math.max(dt, 1e-3); lastMouseWorld.copy(mouseWorld);
    if (d < reach && speed > 0.2) { const f = (1 - d / reach) * Math.min(1, speed * 0.08); pokeTarget.copy(toDrop).normalize().multiplyScalar(f * 0.35); liquid.uWobble.value = Math.min(1, liquid.uWobble.value + f * 0.6); }
    pokeTarget.multiplyScalar(Math.pow(0.02, dt));
    const pk = liquid.uPoke.value;
    pokeVel.addScaledVector(pokeTarget.clone().sub(pk), 40 * dt).multiplyScalar(Math.pow(0.0005, dt));
    pk.addScaledVector(pokeVel, dt);
    hero.rotation.z = Math.sin(t * 0.4) * 0.06 + pk.x * 0.8;

    // --- drip timeline
    if (!reduced) {
      const u = t - dripT0;
      if (u < STRETCH_T) { liquid.uStretch.value = easeInOut(Math.min(1, u / STRETCH_T)); dripped = false; }
      else {
        const v = u - STRETCH_T;
        liquid.uStretch.value = Math.max(-0.15, Math.exp(-5 * v) * Math.cos(16 * v)); // tear-off recoil
        if (!dripped) { dripped = true; drip.visible = true; liquid.uWobble.value = 1; }
        if (v < FALL) {
          const tipY = hero.position.y - (1.6 + 1.15) * base; const q = v / FALL; const floorY = isMobile ? hero.position.y - 3.6 * base : -3.15;
          drip.position.set(hero.position.x, tipY - q * q * (tipY - floorY), hero.position.z);
          drip.scale.set(1 - q * 0.25, 1 + q * 0.9, 1 - q * 0.25);
        } else if (drip.visible) { drip.visible = false; wMat.uniforms.uDrip.value.set(hero.position.x, -hero.position.z, t); burst(hero.position.x, hero.position.z, isMobile ? hero.position.y - 3.6 * base : -3.1); }
        if (u > PERIOD) dripT0 = t;
      }
    }
    // --- splash crown
    if (splashAlive > 0) {
      let alive = 0;
      for (let i = 0; i < SPLASH; i++) { const v = splashV[i], pp = splashP[i]; if (pp.y < splashFloor - 0.15 && v.y < 0) { dummy.scale.setScalar(0); } else { v.y -= 9.5 * dt; pp.addScaledVector(v, dt); dummy.scale.setScalar(1); alive++; } dummy.position.copy(pp); dummy.updateMatrix(); splash.setMatrixAt(i, dummy.matrix); }
      splash.instanceMatrix.needsUpdate = true; splashAlive = alive; if (!alive) splash.count = 0;
    }
    camera.position.x += (mouse.x * 0.7 - camera.position.x) * 0.04; camera.position.y += (0.6 + mouse.y * 0.45 - camera.position.y) * 0.04;
    camera.lookAt(0, 0.2, 0);
    renderer.render(scene, camera);
  }
  tick();
}
