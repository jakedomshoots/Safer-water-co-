/* Safer Water Co. — UI (blueprint edition) */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const hasGsap = typeof gsap !== 'undefined';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;

  /* ---------- loader ---------- */
  const loader = $('#loader'), pct = $('#loaderPct');
  document.body.classList.add('is-locked');
  const introDelay = reduced ? 0 : 1700;
  if (!reduced) { const t0 = performance.now(); (function tick() { const p = Math.min(100, Math.round(((performance.now() - t0) / 1450) * 100)); pct.textContent = String(p).padStart(2, '0') + '%'; if (p < 100) requestAnimationFrame(tick); })(); }
  setTimeout(() => {
    loader.classList.add('is-done');
    document.body.classList.remove('is-locked');
    const lines = $$('.hero__title .line > span');
    if (hasGsap && !reduced) {
      gsap.to(lines, { y: 0, duration: 1.1, ease: 'power4.out', stagger: 0.1 });
      gsap.to('.hero .reveal', { opacity: 1, y: 0, duration: .9, ease: 'power3.out', stagger: 0.1, delay: 0.45, onComplete: () => $$('.hero .reveal').forEach(el => el.classList.add('is-in')) });
      gsap.from('.hero__notes > *', { opacity: 0, duration: .8, stagger: .15, delay: 1 });
    } else { lines.forEach(l => (l.style.transform = 'none')); $$('.hero .reveal').forEach(el => el.classList.add('is-in')); }
    setTimeout(() => { $('.hero .mark')?.classList.add('is-in'); runCounters($('.hero')); }, 900);
  }, introDelay);

  /* ---------- red-pencil marks ---------- */
  const MARKS = {
    circle: { vb: '0 0 100 100', d: 'M8 55 C 6 22, 40 6, 62 8 C 92 10, 100 40, 94 62 C 88 88, 48 98, 22 90 C 4 84, 2 64, 14 48' },
    underline: { vb: '0 0 100 10', d: 'M2 6 C 25 3, 55 8, 98 4' },
  };
  $$('.mark').forEach(m => {
    const k = MARKS[m.dataset.mark] || MARKS.underline;
    m.insertAdjacentHTML('beforeend', `<svg viewBox="${k.vb}" preserveAspectRatio="none" aria-hidden="true"><path d="${k.d}"/></svg>`);
  });

  /* ---------- crosshair cursor ---------- */
  const xh = $('#xh'), xhRead = $('#xhRead');
  if (xh && canHover) {
    let cx = 0, cy = 0, tx = 0, ty = 0, on = false;
    window.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; if (!on) { on = true; xh.classList.add('is-on'); } }, { passive: true });
    document.addEventListener('mouseleave', () => { on = false; xh.classList.remove('is-on'); });
    (function loop() { cx += (tx - cx) * 0.35; cy += (ty - cy) * 0.35; xh.style.transform = `translate(${cx}px, ${cy}px)`; xhRead.textContent = `X ${String(Math.round(cx)).padStart(4, '0')} · Y ${String(Math.round(cy + window.scrollY)).padStart(4, '0')}`; requestAnimationFrame(loop); })();
    document.addEventListener('pointerover', e => { xh.classList.toggle('is-hover', !!e.target.closest('a, button, .callout, .ba__handle, input, select, .dwg, .dial')); });
  }

  /* ---------- header: sheet indicator + nav state ---------- */
  const hdr = $('#hdr');
  const onScroll = () => hdr.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const sheetNo = $('#sheetNo'), sheetName = $('#sheetName');
  const sheetIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const n = e.target.dataset.sheet, nm = e.target.dataset.name;
      if (sheetNo && n) { sheetNo.textContent = n; sheetName.textContent = nm; }
      $$('.hdr__nav a').forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  $$('section.sheet[data-sheet]').forEach(s => sheetIO.observe(s));

  const burger = $('#burger'), menu = $('#mobileMenu');
  burger.addEventListener('click', () => { const open = burger.classList.toggle('is-open'); menu.classList.toggle('is-open', open); burger.setAttribute('aria-expanded', open); document.body.classList.toggle('is-locked', open); });
  $$('a', menu).forEach(a => a.addEventListener('click', () => burger.click()));

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); $$('.mark', e.target).forEach(m => m.classList.add('is-in')); if (e.target.classList.contains('mark')) e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal:not(.hero .reveal), .legend, h2 .mark').forEach(el => io.observe(el));
  $$('.sheets, .details, .notes__grid').forEach(grp => $$('.reveal', grp).forEach((el, i) => (el.style.transitionDelay = `${i * 0.1}s`)));

  /* ---------- counters ---------- */
  function runCounters(scope = document) {
    $$('[data-count]', scope).forEach(el => {
      const end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || 0);
      const start = performance.now(), dur = 1400;
      const step = now => { const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = (end * e).toFixed(dec); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }

  /* ---------- sheet 02: drop lab ---------- */
  const DATA = {
    hardness: { n: 1, level: 'High', pct: 78, title: 'Hard water (calcium & magnesium)', body: 'Floridan Aquifer water picks up dissolved limestone on its way to your tap. That\'s the white crust on your faucets, the film on your glassware, and the reason your water heater works harder every year.', effects: ['Scale in water heaters & appliances', 'Dry skin, dull hair', 'Up to 2× more soap & detergent'], fix: 'High-efficiency softener or salt-free conditioner' },
    chlorine: { n: 2, level: 'Moderate to high', pct: 66, title: 'Chlorine & chloramine', body: 'Manatee County disinfects with chlorine so the water is safe by the time it reaches you. Once it\'s in your house it keeps working: drying out skin, fading laundry and giving your shower that pool smell.', effects: ['Pool smell at the tap & shower', 'Dry, itchy skin and eczema flare-ups', 'Hard on the good bacteria in your gut'], fix: 'Catalytic carbon whole-home filtration' },
    tthm: { n: 3, level: 'Watch closely', pct: 58, title: 'Disinfection byproducts (TTHMs)', body: 'When chlorine meets natural organic matter from Lake Manatee it forms trihalomethanes. Regional testing has flagged these in county samples. They are regulated, but most families would rather not drink them, or breathe them in a hot shower.', effects: ['Absorbed through skin & steam', 'Long-term exposure concerns', 'Not removed by fridge filters'], fix: 'Catalytic carbon + reverse osmosis at the tap' },
    sulfur: { n: 4, level: 'Well water', pct: 85, title: 'Sulfur (hydrogen sulfide)', body: 'Rotten-egg smell when you run the hot water? That\'s hydrogen sulfide gas, common in Manatee County wells. It tarnishes fixtures, stains laundry and makes guests ask what happened in your bathroom.', effects: ['Rotten-egg odor', 'Black stains on silverware & fixtures', 'Corrodes pipes and water heaters'], fix: 'Air-injection oxidation + catalytic carbon' },
    pfas: { n: 5, level: 'Emerging', pct: 45, title: 'PFAS "forever chemicals"', body: 'Man-made compounds from firefighting foam, coatings and manufacturing. New federal limits took effect in 2024 and they are showing up in Florida water systems. They don\'t break down and most filters don\'t touch them.', effects: ['Linked to hormone & immune effects', 'Builds up in the body over time', 'Requires RO or specialty carbon'], fix: '5-stage reverse osmosis drinking system' },
    sediment: { n: 6, level: 'Variable', pct: 40, title: 'Sediment, rust & silt', body: 'Aging mains, construction on every corner and seasonal storms stir up grit that ends up in your aerators, icemaker and water heater. It\'s the first thing every system should stop.', effects: ['Clogged aerators & shower heads', 'Cloudy ice', 'Wears out appliance valves'], fix: 'Multi-layer sediment pre-filter' },
  };
  const card = $('#dropCard');
  function showDrop(key) {
    const d = DATA[key]; if (!d) return;
    $$('.callout').forEach(h => h.classList.toggle('is-active', h.dataset.key === key));
    $$('.tabs button').forEach(b => b.classList.toggle('is-active', b.dataset.key === key));
    card.classList.remove('is-switching'); void card.offsetWidth; card.classList.add('is-switching');
    $('#dropNo').textContent = 'Detail ' + d.n; $('#dropTitle').textContent = d.title; $('#dropBody').textContent = d.body; $('#dropFix').textContent = d.fix;
    $('#dropLevel').textContent = 'Level · ' + d.level; $('#meterFill').style.width = d.pct + '%';
    $('#dropEffects').innerHTML = d.effects.map(e => `<li>${e}</li>`).join('');
  }
  $$('.callout, .tabs button').forEach(el => { el.addEventListener('click', () => showDrop(el.dataset.key)); if (el.classList.contains('callout')) el.addEventListener('pointerenter', () => showDrop(el.dataset.key)); });
  $$('.callout').forEach(h => { h.setAttribute('tabindex', '0'); h.setAttribute('role', 'button'); h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDrop(h.dataset.key); } }); });
  showDrop('hardness');

  /* ---------- sheet 03: journey overlay ---------- */
  const journey = $('#journey'), jCursor = $('#journeyCursor');
  if (journey) {
    journey.addEventListener('journey:stage', e => {
      const s = e.detail.stage;
      $$('.callout-card').forEach(el => el.classList.toggle('is-active', +el.dataset.i === s));
      $$('.journey__stn').forEach(el => el.classList.toggle('is-active', +el.dataset.i === s));
    });
    journey.addEventListener('journey:progress', e => { if (jCursor) jCursor.style.left = (e.detail.p * 100) + '%'; });
  }

  /* ---------- sheet 04: existing / proposed ---------- */
  const ba = $('#ba'), handle = $('#baHandle'), after = $('.ba__side--after');
  if (ba) {
    let dragging = false;
    const setPos = x => { const r = ba.getBoundingClientRect(); const p = Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)); handle.style.left = p + '%'; after.style.clipPath = `inset(0 0 0 ${p}%)`; handle.setAttribute('aria-valuenow', Math.round(p)); };
    ba.addEventListener('pointerdown', e => { dragging = true; setPos(e.clientX); ba.setPointerCapture(e.pointerId); });
    ba.addEventListener('pointermove', e => { if (dragging) setPos(e.clientX); });
    ba.addEventListener('pointerup', () => (dragging = false)); ba.addEventListener('pointercancel', () => (dragging = false));
    handle.addEventListener('keydown', e => { const cur = parseFloat(handle.style.left) || 50; const r = ba.getBoundingClientRect(); if (e.key === 'ArrowLeft') setPos(r.left + ((cur - 4) / 100) * r.width); if (e.key === 'ArrowRight') setPos(r.left + ((cur + 4) / 100) * r.width); });
    const tease = new IntersectionObserver(([en]) => { if (!en.isIntersecting || reduced) return; tease.disconnect(); if (hasGsap) { const o = { p: 50 }; gsap.to(o, { p: 28, duration: 1.1, ease: 'power2.inOut', yoyo: true, repeat: 1, delay: .6, onUpdate: () => { const r = ba.getBoundingClientRect(); setPos(r.left + (o.p / 100) * r.width); } }); } }, { threshold: 0.6 });
    tease.observe(ba);
  }

  /* ---------- sheet 06: takeoff ---------- */
  const inP = $('#inPeople'), inH = $('#inHard'), inB = $('#inBottle');
  const money = n => '$' + Math.round(n).toLocaleString();
  function calc() {
    const people = +inP.value, hard = +inH.value, bottles = +inB.value;
    const hf = Math.max(0, (hard - 3) / 22);
    const soap = people * 95 * (0.6 + hf * 1.4), appliance = 180 + hf * 420 + people * 25, bottle = bottles * 52 * 6.5, plumb = 60 + hf * 260;
    const total = soap + appliance + bottle + plumb;
    const set = (id, v) => { $('#c' + id).textContent = money(v); $('#b' + id).style.width = (total ? (v / total) * 100 : 0) + '%'; };
    set('Soap', soap); set('Appliance', appliance); set('Bottle', bottle); set('Plumb', plumb);
    $('#calcTotal').textContent = money(total);
    $('#outPeople').textContent = people; $('#outHard').textContent = hard; $('#outBottle').textContent = bottles;
    [inP, inH, inB].forEach(i => i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min)) * 100 + '%'));
  }
  if (inP) { [inP, inH, inB].forEach(i => i.addEventListener('input', calc)); calc(); }

  /* ---------- sheet 10: work order ---------- */
  const wo = $('#woNo'); if (wo) wo.textContent = 'SW-' + String(Math.floor(10000 + Math.random() * 89999));
  const form = $('#leadForm');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    $$('[required]', form).forEach(i => { const bad = !i.value.trim(); i.classList.toggle('is-error', bad); if (bad) ok = false; });
    if (!ok) return;
    // TODO: wire to your CRM / email endpoint (Formspree, Netlify Forms, HubSpot, etc.)
    form.classList.add('is-sent');
    const b = form.querySelector('button'); b.querySelector('span').textContent = 'Work order received'; b.disabled = true;
  });

  const y = new Date().getFullYear();
  $('#year').textContent = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  $$('.yr').forEach(el => (el.textContent = y));
})();
