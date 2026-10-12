// Journey scene: scroll-driven camera travels along a pipe through five filtration stages
// while a particle stream visibly cleans up as it passes each one.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('journeyCanvas');
const section = document.getElementById('journey');
if (canvas && section) init();

function init() {
  const isMobile = window.matchMedia('(max-width: 860px)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030b16, 0.05);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.AmbientLight(0x1b3b5a, 0.8));
  const sun = new THREE.DirectionalLight(0xbff4ff, 2.2); sun.position.set(3, 6, 5); scene.add(sun);

  // ---------- Layout ----------
  const STAGES = 5;
  const SPACING = 7;
  const L = (STAGES - 1) * SPACING / 2 + 6;   // half-length of the pipe
  const stageX = Array.from({ length: STAGES }, (_, i) => -((STAGES - 1) * SPACING) / 2 + i * SPACING);
  const PIPE_R = 0.55;

  // Stage palette: core colour, glow colour
  const palette = [
    { core: 0xd9a05b, glow: 0xffb86b, name: 'sediment' },
    { core: 0x151b22, glow: 0x4fd8ff, name: 'carbon' },
    { core: 0x2fb8ff, glow: 0x8ff2ff, name: 'softener' },
    { core: 0x9a7bff, glow: 0xc9b6ff, name: 'uv' },
    { core: 0xffffff, glow: 0xffffff, name: 'ro' },
  ];

  // Pipe
  const pipeMat = new THREE.MeshPhysicalMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.09, roughness: 0.15, metalness: 0, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(PIPE_R, PIPE_R, L * 2, 48, 1, true), pipeMat);
  pipe.rotation.z = Math.PI / 2;
  scene.add(pipe);
  // Pipe edge lines
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x4fd8ff, transparent: true, opacity: 0.35 });
  for (const a of [Math.PI / 2, -Math.PI / 2, 0, Math.PI]) {
    const y = Math.sin(a) * PIPE_R, z = Math.cos(a) * PIPE_R;
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-L, y, z), new THREE.Vector3(L, y, z)]);
    scene.add(new THREE.Line(g, edgeMat));
  }

  // Housings
  const housingGlass = new THREE.MeshPhysicalMaterial({ color: 0xcdf3ff, transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x9fb4c8, metalness: 0.9, roughness: 0.25 });
  const stageLights = [];
  const cores = [];
  stageX.forEach((x, i) => {
    const grp = new THREE.Group(); grp.position.x = x; scene.add(grp);
    const h = 3.2, r = 1.15;
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 64, 1, true), housingGlass);
    grp.add(shell);
    const capTop = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.08, r + 0.08, 0.28, 64), capMat); capTop.position.y = h / 2 + 0.14; grp.add(capTop);
    const capBot = capTop.clone(); capBot.position.y = -h / 2 - 0.14; grp.add(capBot);
    // rings
    for (const yy of [-0.9, 0, 0.9]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.02, 0.025, 12, 96), new THREE.MeshStandardMaterial({ color: 0x4fd8ff, emissive: 0x4fd8ff, emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.3 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = yy; grp.add(ring);
    }
    // core
    const p = palette[i];
    const coreMat = new THREE.MeshPhysicalMaterial({ color: p.core, emissive: p.glow, emissiveIntensity: 0.15, roughness: 0.6, metalness: 0.1, transparent: true, opacity: 0.9 });
    let coreGeo;
    if (i === 0) coreGeo = new THREE.CylinderGeometry(0.75, 0.75, h - 0.5, 48);                // pleated-ish sediment core
    else if (i === 1) coreGeo = new THREE.CylinderGeometry(0.72, 0.72, h - 0.5, 8);            // carbon block
    else if (i === 2) coreGeo = new THREE.CylinderGeometry(0.78, 0.78, h - 0.5, 48);           // resin bed
    else if (i === 3) coreGeo = new THREE.CylinderGeometry(0.12, 0.12, h - 0.4, 24);           // UV lamp
    else coreGeo = new THREE.CylinderGeometry(0.7, 0.7, h - 0.5, 48);                          // RO membrane
    const core = new THREE.Mesh(coreGeo, coreMat); grp.add(core);
    cores.push(core);
    // sediment core: pleats
    if (i === 0) for (let k = 0; k < 14; k++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, h - 0.6, 0.35), coreMat); fin.rotation.y = (k / 14) * Math.PI * 2; fin.position.set(Math.cos(fin.rotation.y) * 0.8, 0, -Math.sin(fin.rotation.y) * 0.8); grp.add(fin); }
    // resin beads for softener
    if (i === 2) { const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 10), new THREE.MeshStandardMaterial({ color: 0x8ff2ff, emissive: 0x4fd8ff, emissiveIntensity: 0.4 }), isMobile ? 120 : 260); const d = new THREE.Object3D(); for (let k = 0; k < beads.count; k++) { const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 0.78; d.position.set(Math.cos(a) * rr, THREE.MathUtils.randFloatSpread(h - 0.7), Math.sin(a) * rr); d.updateMatrix(); beads.setMatrixAt(k, d.matrix); } grp.add(beads); }
    // RO membrane spiral
    if (i === 4) for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.TorusGeometry(0.25 + k * 0.11, 0.03, 8, 64), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x8ff2ff, emissiveIntensity: 0.5 })); sp.rotation.x = Math.PI / 2; sp.position.y = -1.2 + k * 0.6; grp.add(sp); }

    const light = new THREE.PointLight(p.glow, 0, 10, 1.8); light.position.set(0, 0, 1.8); grp.add(light);
    stageLights.push(light);
  });

  // ---------- Particle stream ----------
  const N = isMobile ? 2500 : 6000;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), seed = new Float32Array(N), kind = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * (PIPE_R - 0.06);
    pos[i * 3] = THREE.MathUtils.randFloatSpread(L * 2);
    pos[i * 3 + 1] = Math.sin(a) * rr; pos[i * 3 + 2] = Math.cos(a) * rr;
    seed[i] = Math.random();
    kind[i] = Math.random() < 0.18 ? 1 : 0; // 1 = chunky sediment
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('kind', new THREE.BufferAttribute(kind, 1));
  const streamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    uniforms: { uTime: { value: 0 }, uL: { value: L }, uPR: { value: renderer.getPixelRatio() }, uStages: { value: stageX }, uActive: { value: 0 } },
    vertexShader: `
      attribute float seed; attribute float kind; uniform float uTime; uniform float uL; uniform float uPR; uniform float uStages[5]; uniform float uActive;
      varying vec3 vCol; varying float vAlpha; varying float vKind;
      void main(){
        vec3 p = position;
        float speed = 1.6 + seed * 1.2;
        p.x = mod(p.x + uTime * speed + uL, uL * 2.0) - uL;
        // gentle swirl inside pipe
        float sw = uTime * (0.8 + seed) + seed * 6.28;
        p.y += sin(sw) * 0.04; p.z += cos(sw) * 0.04;

        // cleanliness: how many stages this particle has passed (soft edges)
        float c = 0.0;
        for (int i = 0; i < 5; i++) { c += smoothstep(uStages[i] - 0.6, uStages[i] + 0.6, p.x) * step(float(i), uActive + 0.5); }
        c /= 5.0;

        vec3 dirty = vec3(0.55, 0.38, 0.18);
        vec3 mid = vec3(0.35, 0.65, 0.85);
        vec3 pure = vec3(0.75, 0.97, 1.0);
        vCol = c < 0.5 ? mix(dirty, mid, c * 2.0) : mix(mid, pure, (c - 0.5) * 2.0);

        float passedSed = smoothstep(uStages[0] - 0.4, uStages[0] + 0.4, p.x) * step(0.0, uActive + 0.5);
        vKind = kind;
        float sizeBase = kind > 0.5 ? (3.0 + seed * 5.0) : (1.2 + seed * 2.2);
        // sediment chunks vanish after stage 1
        vAlpha = kind > 0.5 ? (1.0 - passedSed) * 0.95 : mix(0.55, 0.95, c);
        float shrink = kind > 0.5 ? 1.0 : mix(1.0, 0.7, c);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = sizeBase * shrink * uPR * (9.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vCol; varying float vAlpha; varying float vKind;
      void main(){
        vec2 c = gl_PointCoord - 0.5; float d = length(c);
        if (d > 0.5) discard;
        float a = vKind > 0.5 ? smoothstep(0.5, 0.35, d) : smoothstep(0.5, 0.05, d);
        gl_FragColor = vec4(vCol, a * vAlpha);
      }`,
  });
  scene.add(new THREE.Points(geo, streamMat));

  // Floor glow plane for depth
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(L * 2 + 20, 20), new THREE.MeshBasicMaterial({ color: 0x0a2038, transparent: true, opacity: 0.6 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.6; scene.add(floor);
  const grid = new THREE.GridHelper(80, 40, 0x1a4a6a, 0x0e2a44); grid.position.y = -2.59; grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);

  // ---------- Scroll ----------
  let progress = 0, smooth = 0;
  function updateProgress() {
    const rect = section.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    progress = THREE.MathUtils.clamp(-rect.top / total, 0, 1);
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', () => { resize(); updateProgress(); });
  resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(section);

  let lastStage = -1;
  const clock = new THREE.Clock();
  const look = new THREE.Vector3();
  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = reduced ? 0 : clock.getElapsedTime();
    smooth += (progress - smooth) * 0.08;

    // camera travel: stage i is centered when smooth = i/(STAGES-1)
    const x = THREE.MathUtils.lerp(stageX[0], stageX[STAGES - 1], smooth);
    const stage = Math.round(smooth * (STAGES - 1));
    const orbit = Math.sin(smooth * Math.PI * 2.5) * 0.9;
    const camDist = isMobile ? 9.5 : 7.2;
    camera.position.set(x + 1.2 + orbit, 1.4 + Math.sin(smooth * Math.PI) * 0.6, camDist);
    look.set(x + 0.3, isMobile ? 0.8 : -0.1, 0);
    camera.lookAt(look);

    // stage activation
    streamMat.uniforms.uActive.value = smooth * (STAGES - 1) + 0.5;
    streamMat.uniforms.uTime.value = t;
    stageLights.forEach((l, i) => { l.intensity += (((i === stage) ? 14 : 2) - l.intensity) * 0.08; });
    cores.forEach((c, i) => { c.material.emissiveIntensity += (((i === stage) ? (i === 3 ? 2.5 : 0.7) : 0.15) - c.material.emissiveIntensity) * 0.08; c.rotation.y = t * 0.2 * (i === 3 ? 0 : 1); });

    if (stage !== lastStage) { lastStage = stage; section.dispatchEvent(new CustomEvent('journey:stage', { detail: { stage } })); }
    renderer.render(scene, camera);
  }
  tick();
}
