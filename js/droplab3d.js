// Sheet 02: the liquid drop as an interactive figure. Six callouts are anchored to points on
// the drop's surface and projected to the screen every frame; specks inside the drop change
// with the selected contaminant.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gridTexture, teardrop, makeLiquid, GLASS_OPTS } from './hero3d.js';

const wrap = document.getElementById('lab3d');
const canvas = document.getElementById('labCanvas');
const INK = 0x0a2c50, PAPER = 0xeef2f6;
if (wrap && canvas) init();

function init() {
  const isMobile = window.matchMedia('(max-width: 860px)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setClearColor(PAPER, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(0, 0.35, 8.6);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 6, 6); scene.add(key);

  // Drafting grid backdrop + centerlines
  const gridTex = gridTexture(); gridTex.repeat.set(2.4, 3);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(24, 30), new THREE.MeshBasicMaterial({ map: gridTex })); paper.position.z = -5; scene.add(paper);
  const dash = new THREE.LineDashedMaterial({ color: INK, dashSize: 0.3, gapSize: 0.15, transparent: true, opacity: 0.45 });
  for (const pts of [[new THREE.Vector3(0, -3.6, -1), new THREE.Vector3(0, 3.6, -1)], [new THREE.Vector3(-3.2, -0.2, -1), new THREE.Vector3(3.2, -0.2, -1)]]) {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), dash); l.computeLineDistances(); scene.add(l);
  }

  // The drop
  const { uniforms: liquid, liquify } = makeLiquid();
  const glass = new THREE.MeshPhysicalMaterial(GLASS_OPTS); liquify(glass);
  const drop = new THREE.Mesh(teardrop(1.55, isMobile ? 64 : 112), glass);
  drop.position.y = 0.15; scene.add(drop);
  const outlineMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide, transparent: true, opacity: 0.6 }); liquify(outlineMat);
  const outline = new THREE.Mesh(drop.geometry, outlineMat); outline.scale.setScalar(1.012); drop.add(outline);

  // Contact shadow
  const shC = document.createElement('canvas'); shC.width = shC.height = 256; const sg = shC.getContext('2d');
  const grad = sg.createRadialGradient(128, 128, 10, 128, 128, 128); grad.addColorStop(0, 'rgba(10,44,80,0.22)'); grad.addColorStop(1, 'rgba(10,44,80,0)'); sg.fillStyle = grad; sg.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shC), transparent: true, depthWrite: false }));
  shadow.position.y = -1.95; scene.add(shadow);

  // Specks inside the drop: colour / size / motion change with the selected contaminant
  const SPECK = {
    hardness: { col: [0.95, 0.96, 0.9], size: 3.4, alpha: 0.9, chunk: 0.2, speed: 0.15 },
    chlorine: { col: [0.72, 0.86, 0.45], size: 2.0, alpha: 0.7, chunk: 0.0, speed: 0.5 },
    tthm:     { col: [0.45, 0.5, 0.55], size: 1.9, alpha: 0.6, chunk: 0.0, speed: 0.35 },
    sulfur:   { col: [0.92, 0.78, 0.25], size: 2.6, alpha: 0.8, chunk: 0.1, speed: 0.6 },
    pfas:     { col: [0.78, 0.35, 0.55], size: 1.7, alpha: 0.75, chunk: 0.0, speed: 0.25 },
    sediment: { col: [0.45, 0.3, 0.15], size: 2.8, alpha: 0.95, chunk: 0.6, speed: 0.1 },
  };
  const N = isMobile ? 160 : 320;
  const pg = new THREE.BufferGeometry(); const pp = new Float32Array(N * 3), ps = new Float32Array(N);
  for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, r = Math.pow(Math.random(), 0.6) * 1.15, y = THREE.MathUtils.randFloat(-1.3, 0.9); pp[i * 3] = Math.cos(a) * r * (1 - Math.max(0, y) * 0.45); pp[i * 3 + 1] = y; pp[i * 3 + 2] = Math.sin(a) * r * (1 - Math.max(0, y) * 0.45); ps[i] = Math.random(); }
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('seed', new THREE.BufferAttribute(ps, 1));
  const speckMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uCol: { value: new THREE.Vector3(0.95, 0.96, 0.9) }, uSize: { value: 2.2 }, uAlpha: { value: 0.9 }, uChunk: { value: 0.2 }, uSpeed: { value: 0.15 }, uMix: { value: 1 } },
    vertexShader: `attribute float seed; uniform float uTime, uPR, uSize, uChunk, uSpeed, uMix; varying float vA; varying float vS;
      void main(){ vec3 p = position; float t = uTime * uSpeed;
        p.y += sin(t * (0.6 + seed) + seed * 10.0) * 0.12; p.x += cos(t * 0.8 + seed * 7.0) * 0.08; p.z += sin(t * 0.7 + seed * 5.0) * 0.08;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float big = step(1.0 - uChunk, seed); vS = big;
        gl_PointSize = (uSize + big * uSize * 1.6) * (0.5 + seed * 0.8) * uPR * (10.0 / -mv.z) * uMix;
        vA = 0.4 + seed * 0.6; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uCol; uniform float uAlpha; varying float vA; varying float vS;
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; float a = vS > 0.5 ? smoothstep(0.5, 0.4, d) : smoothstep(0.5, 0.1, d); gl_FragColor = vec4(uCol, a * vA * uAlpha); }`,
  });
  const specks = new THREE.Points(pg, speckMat); drop.add(specks);
  let target = SPECK.hardness, mixTo = 1;
  document.addEventListener('drop:select', (e) => { const k = e.detail?.key; if (SPECK[k]) { target = SPECK[k]; mixTo = 0; liquid.uWobble.value = Math.min(1, liquid.uWobble.value + 0.5); } });

  // Callout anchors on the drop surface (local coordinates), projected each frame
  const anchors = {
    sediment: new THREE.Vector3(0.05, 1.25, 1.0),
    chlorine: new THREE.Vector3(0.8, 0.45, 1.25),
    hardness: new THREE.Vector3(-0.95, -0.25, 1.15),
    sulfur:   new THREE.Vector3(1.15, -0.55, 0.9),
    tthm:     new THREE.Vector3(0.15, -1.05, 1.3),
    pfas:     new THREE.Vector3(-0.95, -1.05, 0.95),
  };
  const offsets = { sediment: [-150, -60], chlorine: [140, -70], hardness: [-150, 10], sulfur: [140, 30], tthm: [100, 120], pfas: [-130, 110] };
  const btns = {}; wrap.querySelectorAll('.callout').forEach(b => (btns[b.dataset.key] = b));
  const lines = wrap.querySelector('.lab3d__lines');
  const lineEls = {}; Object.keys(anchors).forEach(k => { const l = document.createElementNS('http://www.w3.org/2000/svg', 'line'); l.dataset.key = k; lines.appendChild(l); lineEls[k] = l; const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); dot.setAttribute('r', 3); dot.dataset.key = k; lines.appendChild(dot); lineEls[k + ':dot'] = dot; });

  const v = new THREE.Vector3();
  function placeCallouts(w, h) {
    const scale = Math.min(1, w / 460);
    for (const k in anchors) {
      v.copy(anchors[k]).applyMatrix4(drop.matrixWorld).project(camera);
      const ax = (v.x * 0.5 + 0.5) * w, ay = (-v.y * 0.5 + 0.5) * h;
      const bx = THREE.MathUtils.clamp(ax + offsets[k][0] * scale, 18, w - 18), by = THREE.MathUtils.clamp(ay + offsets[k][1] * scale, 18, h - 18);
      const b = btns[k]; if (b) { b.style.left = bx + 'px'; b.style.top = by + 'px'; }
      const l = lineEls[k]; l.setAttribute('x1', bx); l.setAttribute('y1', by); l.setAttribute('x2', ax); l.setAttribute('y2', ay);
      const d = lineEls[k + ':dot']; d.setAttribute('cx', ax); d.setAttribute('cy', ay);
    }
  }

  // Pointer poke (desktop) + gentle drag-to-rotate on touch
  const mouse = new THREE.Vector2(0, 0), mouseWorld = new THREE.Vector3(), lastMouseWorld = new THREE.Vector3(), pokeTarget = new THREE.Vector3(), pokeVel = new THREE.Vector3();
  let hover = false;
  wrap.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); hover = true; }, { passive: true });
  wrap.addEventListener('pointerleave', () => (hover = false));

  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); lines.setAttribute('viewBox', `0 0 ${w} ${h}`); }
  window.addEventListener('resize', resize); resize();
  let visible = true; new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(wrap);

  const clock = new THREE.Clock(); let lastT = 0;
  function tick() {
    requestAnimationFrame(tick); if (!visible) return;
    const t = reduced ? 0 : clock.getElapsedTime(); const dt = Math.min(0.05, t - lastT); lastT = t;
    liquid.uTime.value = t; liquid.uWobble.value *= Math.pow(0.25, dt);
    drop.rotation.y = Math.sin(t * 0.25) * 0.35; drop.rotation.z = Math.sin(t * 0.4) * 0.04;
    drop.position.y = 0.15 + Math.sin(t * 0.8) * 0.06;

    if (hover) {
      mouseWorld.set(mouse.x, mouse.y, 0.5).unproject(camera).sub(camera.position).normalize();
      const k = (drop.position.z - camera.position.z) / mouseWorld.z; mouseWorld.multiplyScalar(k).add(camera.position);
      const toDrop = drop.position.clone().sub(mouseWorld); const d = toDrop.length();
      const speed = mouseWorld.distanceTo(lastMouseWorld) / Math.max(dt, 1e-3); lastMouseWorld.copy(mouseWorld);
      if (d < 2.3 && speed > 0.2) { const f = (1 - d / 2.3) * Math.min(1, speed * 0.08); pokeTarget.copy(toDrop).normalize().multiplyScalar(f * 0.3); liquid.uWobble.value = Math.min(1, liquid.uWobble.value + f * 0.5); }
    }
    pokeTarget.multiplyScalar(Math.pow(0.02, dt));
    const pk = liquid.uPoke.value; pokeVel.addScaledVector(pokeTarget.clone().sub(pk), 40 * dt).multiplyScalar(Math.pow(0.0005, dt)); pk.addScaledVector(pokeVel, dt);

    // speck crossfade to the selected contaminant
    const u = speckMat.uniforms; u.uTime.value = t;
    if (mixTo === 0) { u.uMix.value = Math.max(0, u.uMix.value - dt * 5); if (u.uMix.value === 0) { u.uCol.value.fromArray(target.col); u.uSize.value = target.size; u.uAlpha.value = target.alpha; u.uChunk.value = target.chunk; u.uSpeed.value = target.speed; mixTo = 1; } }
    else u.uMix.value = Math.min(1, u.uMix.value + dt * 4);

    drop.updateMatrixWorld();
    placeCallouts(canvas.clientWidth, canvas.clientHeight);
    renderer.render(scene, camera);
  }
  tick();
}
