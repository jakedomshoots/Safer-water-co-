// Journey: Section A-A through the system. Scroll drives the camera along the pipe;
// ink dots start as sediment and turn blueprint-blue as they pass each stage.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gridTexture } from './hero3d.js';

const canvas = document.getElementById('journeyCanvas');
const section = document.getElementById('journey');
const INK = 0x0f3a66, PAPER = 0xeef2f6, RED = 0xd2452d;
if (canvas && section) init();

function init() {
  const isMobile = window.matchMedia('(max-width: 860px)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 2));
  renderer.setClearColor(PAPER, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PAPER, 10, 32);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(3, 8, 6); scene.add(sun);

  // Paper + grid backdrop and floor
  const gridTex = gridTexture(); gridTex.repeat.set(14, 5);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(140, 50), new THREE.MeshBasicMaterial({ map: gridTex })); back.position.set(0, 4, -9); scene.add(back);
  const floorTex = gridTexture(); floorTex.repeat.set(14, 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 40), new THREE.MeshBasicMaterial({ map: floorTex })); floor.rotation.x = -Math.PI / 2; floor.position.y = -2.6; scene.add(floor);

  // ---------- Layout ----------
  const STAGES = 5, SPACING = 7;
  const L = (STAGES - 1) * SPACING / 2 + 6;
  const stageX = Array.from({ length: STAGES }, (_, i) => -((STAGES - 1) * SPACING) / 2 + i * SPACING);
  const PIPE_R = 0.55;

  const lineMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.85 });
  const lineFaint = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.35 });
  const fillWater = new THREE.MeshPhysicalMaterial({ color: 0xc7e9f8, transparent: true, opacity: 0.35, roughness: 0.2, metalness: 0, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });

  // Pipe: translucent fill + drafted longitudinal lines + station rings
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(PIPE_R, PIPE_R, L * 2, 32, 1, true), fillWater); pipe.rotation.z = Math.PI / 2; scene.add(pipe);
  for (const a of [Math.PI / 2, -Math.PI / 2]) { const y = Math.sin(a) * PIPE_R, z = Math.cos(a) * PIPE_R; scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-L, y, z), new THREE.Vector3(L, y, z)]), lineMat)); }
  const ringPts = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; ringPts.push(new THREE.Vector3(0, Math.sin(a) * PIPE_R, Math.cos(a) * PIPE_R)); }
  const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
  for (let x = -L + 1; x < L; x += 2) { const r = new THREE.Line(ringGeo, lineFaint); r.position.x = x; scene.add(r); }
  // Flow arrows along the pipe (drafted)
  const arrowMat = new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.5 });
  for (let x = -L + 2; x < L; x += 3.5) { const a = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 3), arrowMat); a.rotation.z = -Math.PI / 2; a.position.set(x, PIPE_R + 0.35, 0); scene.add(a); }

  // Housings
  const palette = [
    { core: 0xd8b07a, name: 'sediment' },
    { core: 0x2b3440, name: 'carbon' },
    { core: 0x8fd3f0, name: 'softener' },
    { core: 0xb39cff, name: 'uv' },
    { core: 0xffffff, name: 'ro' },
  ];
  const cores = [];
  const h = 3.2, r = 1.15;
  // soft contact shadow texture
  const shC = document.createElement('canvas'); shC.width = shC.height = 256; const sg = shC.getContext('2d');
  const grad = sg.createRadialGradient(128, 128, 10, 128, 128, 128); grad.addColorStop(0, 'rgba(10,44,80,0.35)'); grad.addColorStop(1, 'rgba(10,44,80,0)'); sg.fillStyle = grad; sg.fillRect(0, 0, 256, 256);
  const shadowTex = new THREE.CanvasTexture(shC);
  const bubbleMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uH: { value: h - 0.6 } },
    vertexShader: `attribute float seed; uniform float uTime; uniform float uPR; uniform float uH; varying float vA;
      void main(){ vec3 p = position; p.y = mod(p.y + uTime * (0.25 + seed * 0.5), uH) - uH * 0.5; p.x += sin(uTime * 1.5 + seed * 30.0) * 0.04;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = (1.5 + seed * 3.0) * uPR * (9.0 / -mv.z); vA = 0.35 + seed * 0.4; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; float ring = smoothstep(0.5, 0.38, d) * smoothstep(0.25, 0.38, d); gl_FragColor = vec4(1.0, 1.0, 1.0, (ring + smoothstep(0.2, 0.0, d) * 0.5) * vA); }` });
  const bubbleMats = [bubbleMat];
  stageX.forEach((x, i) => {
    const grp = new THREE.Group(); grp.position.x = x; scene.add(grp);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -2.58; grp.add(shadow);
    if (i !== 3) { const bn = isMobile ? 60 : 140; const bg = new THREE.BufferGeometry(); const bp = new Float32Array(bn * 3), bs = new Float32Array(bn); for (let k = 0; k < bn; k++) { const a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * (r - 0.15); bp[k * 3] = Math.cos(a) * rr; bp[k * 3 + 1] = Math.random() * (h - 0.6); bp[k * 3 + 2] = Math.sin(a) * rr; bs[k] = Math.random(); } bg.setAttribute('position', new THREE.BufferAttribute(bp, 3)); bg.setAttribute('seed', new THREE.BufferAttribute(bs, 1)); grp.add(new THREE.Points(bg, bubbleMat)); }
    const shellGeo = new THREE.CylinderGeometry(r, r, h, 48, 1, true);
    grp.add(new THREE.Mesh(shellGeo, fillWater));
    grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(r, r, h, 24, 1, false), 15), lineMat));
    for (const yy of [h / 2 + 0.14, -h / 2 - 0.14]) {
      const capGeo = new THREE.CylinderGeometry(r + 0.1, r + 0.1, 0.28, 24);
      const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: 0xdfe6ee, roughness: 0.5, metalness: 0.1 })); cap.position.y = yy; grp.add(cap);
      const capL = new THREE.LineSegments(new THREE.EdgesGeometry(capGeo, 15), lineMat); capL.position.y = yy; grp.add(capL);
    }
    // Centerline (drafting convention)
    const cl = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -h / 2 - 1, 0), new THREE.Vector3(0, h / 2 + 1, 0)]), new THREE.LineDashedMaterial({ color: INK, dashSize: 0.25, gapSize: 0.12, transparent: true, opacity: 0.5 })); cl.computeLineDistances(); grp.add(cl);

    const p = palette[i];
    const coreMat = new THREE.MeshStandardMaterial({ color: p.core, emissive: p.core, emissiveIntensity: 0.05, roughness: 0.7, metalness: 0, transparent: true, opacity: 0.92 });
    let coreGeo;
    if (i === 0) coreGeo = new THREE.CylinderGeometry(0.75, 0.75, h - 0.5, 32);
    else if (i === 1) coreGeo = new THREE.CylinderGeometry(0.72, 0.72, h - 0.5, 8);
    else if (i === 2) coreGeo = new THREE.CylinderGeometry(0.78, 0.78, h - 0.5, 32);
    else if (i === 3) coreGeo = new THREE.CylinderGeometry(0.12, 0.12, h - 0.4, 16);
    else coreGeo = new THREE.CylinderGeometry(0.7, 0.7, h - 0.5, 32);
    const core = new THREE.Mesh(coreGeo, coreMat); grp.add(core); cores.push(core);
    grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(coreGeo, 20), lineFaint));
    if (i === 0) for (let k = 0; k < 14; k++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, h - 0.6, 0.35), coreMat); fin.rotation.y = (k / 14) * Math.PI * 2; fin.position.set(Math.cos(fin.rotation.y) * 0.8, 0, -Math.sin(fin.rotation.y) * 0.8); grp.add(fin); }
    if (i === 2) { const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshStandardMaterial({ color: 0x3f8fc4 }), isMobile ? 100 : 220); const d = new THREE.Object3D(); for (let k = 0; k < beads.count; k++) { const a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * 0.78; d.position.set(Math.cos(a) * rr, THREE.MathUtils.randFloatSpread(h - 0.7), Math.sin(a) * rr); d.updateMatrix(); beads.setMatrixAt(k, d.matrix); } grp.add(beads); }
    if (i === 4) for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.TorusGeometry(0.25 + k * 0.11, 0.025, 6, 48), new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.6 })); sp.rotation.x = Math.PI / 2; sp.position.y = -1.2 + k * 0.6; grp.add(sp); }
    if (i === 3) { const glow = new THREE.PointLight(0xb39cff, 0, 6, 2); grp.add(glow); core.userData.glow = glow; }
  });

  // Red marker ring: tracks the active stage (a drafter's "you are here")
  const marker = new THREE.Group();
  marker.add(new THREE.Mesh(new THREE.TorusGeometry(r + 0.35, 0.03, 8, 96), new THREE.MeshBasicMaterial({ color: RED })));
  const tri = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 3), new THREE.MeshBasicMaterial({ color: RED })); tri.position.y = -h / 2 - 0.75; marker.add(tri);
  marker.children[0].rotation.x = Math.PI / 2; marker.position.x = stageX[0]; scene.add(marker);

  // ---------- Particle stream ----------
  const N = isMobile ? 1500 : 5000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), seed = new Float32Array(N), kind = new Float32Array(N);
  for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * (PIPE_R - 0.06); pos[i * 3] = THREE.MathUtils.randFloatSpread(L * 2); pos[i * 3 + 1] = Math.sin(a) * rr; pos[i * 3 + 2] = Math.cos(a) * rr; seed[i] = Math.random(); kind[i] = Math.random() < 0.18 ? 1 : 0; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1)); geo.setAttribute('kind', new THREE.BufferAttribute(kind, 1));
  const streamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uL: { value: L }, uPR: { value: renderer.getPixelRatio() }, uStages: { value: stageX }, uActive: { value: 0 } },
    vertexShader: `attribute float seed; attribute float kind; uniform float uTime; uniform float uL; uniform float uPR; uniform float uStages[5]; uniform float uActive;
      varying vec3 vCol; varying float vAlpha; varying float vKind;
      void main(){ vec3 p = position; p.x = mod(p.x + uTime * (1.6 + seed * 1.2) + uL, uL * 2.0) - uL;
        float sw = uTime * (0.8 + seed) + seed * 6.28; p.y += sin(sw) * 0.04; p.z += cos(sw) * 0.04;
        float c = 0.0; for (int i = 0; i < 5; i++) { c += smoothstep(uStages[i] - 0.6, uStages[i] + 0.6, p.x) * step(float(i), uActive + 0.5); } c /= 5.0;
        vec3 dirty = vec3(0.40, 0.26, 0.12); vec3 mid = vec3(0.10, 0.36, 0.62); vec3 pure = vec3(0.22, 0.62, 0.88);
        vCol = c < 0.5 ? mix(dirty, mid, c * 2.0) : mix(mid, pure, (c - 0.5) * 2.0);
        float passedSed = smoothstep(uStages[0] - 0.4, uStages[0] + 0.4, p.x) * step(0.0, uActive + 0.5);
        vKind = kind; float sizeBase = kind > 0.5 ? (3.5 + seed * 5.5) : (1.8 + seed * 2.6);
        vAlpha = kind > 0.5 ? (1.0 - passedSed) * 0.9 : mix(0.75, 0.9, c);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = sizeBase * mix(1.0, 0.75, c) * uPR * (9.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vCol; varying float vAlpha; varying float vKind;
      void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; float a = vKind > 0.5 ? smoothstep(0.5, 0.38, d) : smoothstep(0.5, 0.15, d); gl_FragColor = vec4(vCol, a * vAlpha); }`,
  });
  scene.add(new THREE.Points(geo, streamMat));

  // ---------- Scroll ----------
  let progress = 0, smooth = 0;
  function updateProgress() { const rect = section.getBoundingClientRect(); const total = rect.height - window.innerHeight; progress = THREE.MathUtils.clamp(-rect.top / total, 0, 1); }
  window.addEventListener('scroll', updateProgress, { passive: true }); updateProgress();
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', () => { resize(); updateProgress(); }); resize();
  let visible = true; new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(section);

  let lastStage = -1;
  const clock = new THREE.Clock(); const look = new THREE.Vector3();
  function tick() {
    requestAnimationFrame(tick); if (!visible) return;
    const t = reduced ? 0 : clock.getElapsedTime();
    smooth += (progress - smooth) * 0.12;
    const x = THREE.MathUtils.lerp(stageX[0], stageX[STAGES - 1], smooth);
    const stage = Math.round(smooth * (STAGES - 1));
    const orbit = Math.sin(smooth * Math.PI * 2.5) * 0.9;
    const wide = camera.aspect > 1.15;
    camera.position.set(x + (wide ? -1.7 : 0.3) + orbit * (wide ? 0.6 : 0.3), (wide ? 1.4 : 2.2) + Math.sin(smooth * Math.PI) * 0.4, wide ? 7.8 : 9.6);
    look.set(x + (wide ? -2.7 : 0.1), wide ? 0.1 : 1.25, 0); camera.lookAt(look);
    bubbleMats.forEach(m => (m.uniforms.uTime.value = t));

    streamMat.uniforms.uActive.value = smooth * (STAGES - 1) + 0.5; streamMat.uniforms.uTime.value = t;
    marker.position.x += (stageX[stage] - marker.position.x) * 0.1; marker.children[0].rotation.z = t * 0.6; marker.children[1].position.y = -h / 2 - 0.75 + Math.sin(t * 3) * 0.06;
    cores.forEach((c, i) => { c.material.emissiveIntensity += (((i === stage) ? (i === 3 ? 1.2 : 0.25) : 0.05) - c.material.emissiveIntensity) * 0.08; if (i !== 3) c.rotation.y = t * 0.15; if (c.userData.glow) c.userData.glow.intensity = c.material.emissiveIntensity * 8; });

    if (stage !== lastStage) { lastStage = stage; section.dispatchEvent(new CustomEvent('journey:stage', { detail: { stage } })); }
    section.dispatchEvent(new CustomEvent('journey:progress', { detail: { p: smooth } }));
    renderer.render(scene, camera);
  }
  tick();
}
