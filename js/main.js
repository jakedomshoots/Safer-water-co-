/* Safer Water Co. — UI interactions */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const hasGsap = typeof gsap !== 'undefined';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- loader + hero intro ---------- */
  const loader = $('#loader');
  document.body.classList.add('is-locked');
  const introDelay = reduced ? 0 : 1500;
  setTimeout(() => {
    loader.classList.add('is-done');
    document.body.classList.remove('is-locked');
    const lines = $$('.hero__title .line > span');
    if (hasGsap && !reduced) {
      gsap.to(lines, { y: 0, duration: 1.2, ease: 'power4.out', stagger: 0.12, delay: 0.1 });
      gsap.to('.hero .reveal', { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 0.5, onComplete: () => $$('.hero .reveal').forEach(el => el.classList.add('is-in')) });
    } else {
      lines.forEach(l => (l.style.transform = 'none'));
      $$('.hero .reveal').forEach(el => el.classList.add('is-in'));
    }
    setTimeout(runCounters, 700);
  }, introDelay);

  /* ---------- cursor ---------- */
  const cursor = $('#cursor');
  if (cursor && window.matchMedia('(hover: hover)').matches) {
    let cx = 0, cy = 0, tx = 0, ty = 0;
    window.addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function loop() { cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`; requestAnimationFrame(loop); })();
    $$('a, button, .hotspot, .ba__handle, input[type=range]').forEach(el => {
      el.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
    });
  }

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('#burger'), menu = $('#mobileMenu');
  burger.addEventListener('click', () => {
    const open = burger.classList.toggle('is-open');
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
    document.body.classList.toggle('is-locked', open);
  });
  $$('a', menu).forEach(a => a.addEventListener('click', () => burger.click()));

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal:not(.hero .reveal)').forEach(el => io.observe(el));
  // stagger siblings
  $$('.cards, .steps, .quotes').forEach(grp => $$('.reveal', grp).forEach((el, i) => (el.style.transitionDelay = `${i * 0.12}s`)));

  /* ---------- counters ---------- */
  function runCounters() {
    $$('[data-count]').forEach(el => {
      const end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || 0), suf = el.dataset.suffix || '';
      const start = performance.now(), dur = 1600;
      const step = now => {
        const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = (end * e).toFixed(dec) + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- drop lab ---------- */
  const DATA = {
    hardness: { level: 'High', pct: 78, title: 'Hard water (calcium & magnesium)', body: 'Floridan Aquifer water picks up dissolved limestone on its way to your tap. That\'s the white crust on your faucets, the film on your glassware, and the reason your water heater works harder every year.', effects: ['Scale in water heaters & appliances', 'Dry skin, dull hair', 'Up to 2× more soap & detergent'], fix: 'High-efficiency softener or salt-free conditioner' },
    chlorine: { level: 'Moderate to high', pct: 66, title: 'Chlorine & chloramine', body: 'Manatee County disinfects with chlorine so the water is safe to drink by the time it reaches you. Once it\'s in your house, it keeps doing what it does best: drying out skin, fading laundry and giving your shower that pool smell.', effects: ['Pool smell at the tap & shower', 'Dry, itchy skin and eczema flare-ups', 'Kills the good bacteria in your gut'], fix: 'Catalytic carbon whole-home filtration' },
    tthm: { level: 'Watch closely', pct: 58, title: 'Disinfection byproducts (TTHMs)', body: 'When chlorine meets natural organic matter from Lake Manatee, it forms trihalomethanes. Regional testing has flagged these in county samples. They are regulated, but most families would rather not drink them, or breathe them in a hot shower.', effects: ['Absorbed through skin & steam', 'Long-term exposure concerns', 'Not removed by fridge filters'], fix: 'Catalytic carbon + reverse osmosis at the tap' },
    sulfur: { level: 'Well water', pct: 85, title: 'Sulfur (hydrogen sulfide)', body: 'Rotten-egg smell when you run the hot water? That\'s hydrogen sulfide gas, common in Manatee County wells. It tarnishes fixtures, stains laundry and makes guests ask what happened in your bathroom.', effects: ['Rotten-egg odor', 'Black stains on silverware & fixtures', 'Corrodes pipes and water heaters'], fix: 'Air-injection oxidation + catalytic carbon' },
    pfas: { level: 'Emerging', pct: 45, title: 'PFAS "forever chemicals"', body: 'Man-made compounds from firefighting foam, coatings and manufacturing. New federal limits took effect in 2024, and they are showing up in Florida water systems. They don\'t break down and most filters don\'t touch them.', effects: ['Linked to hormone & immune effects', 'Builds up in the body over time', 'Requires RO or specialty carbon'], fix: '5-stage reverse osmosis drinking system' },
    sediment: { level: 'Variable', pct: 40, title: 'Sediment, rust & silt', body: 'Aging mains, construction on every corner and seasonal storms stir up grit that ends up in your aerators, icemaker and water heater. It\'s the first thing every system should stop.', effects: ['Clogged aerators & shower heads', 'Cloudy ice', 'Wears out appliance valves'], fix: 'Multi-layer sediment pre-filter' },
  };
  const card = $('#dropCard');
  function showDrop(key) {
    const d = DATA[key]; if (!d) return;
    $$('.hotspot').forEach(h => h.classList.toggle('is-active', h.dataset.key === key));
    $$('.drop-lab__tabs button').forEach(b => b.classList.toggle('is-active', b.dataset.key === key));
    card.classList.remove('is-switching'); void card.offsetWidth; card.classList.add('is-switching');
    $('#dropTitle').textContent = d.title; $('#dropBody').textContent = d.body; $('#dropFix').textContent = d.fix;
    $('#dropLevel').textContent = 'Level: ' + d.level; $('#meterFill').style.width = d.pct + '%';
    $('#dropEffects').innerHTML = d.effects.map(e => `<li>${e}</li>`).join('');
  }
  $$('.hotspot, .drop-lab__tabs button').forEach(el => {
    el.addEventListener('click', () => showDrop(el.dataset.key));
    el.addEventListener('pointerenter', () => { if (el.classList.contains('hotspot')) showDrop(el.dataset.key); });
  });
  $$('.hotspot').forEach(h => { h.setAttribute('tabindex', '0'); h.setAttribute('role', 'button'); h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDrop(h.dataset.key); } }); });
  showDrop('hardness');

  /* ---------- journey steps ---------- */
  const journey = $('#journey');
  if (journey) {
    journey.addEventListener('journey:stage', e => {
      const s = e.detail.stage;
      $$('.journey__step').forEach(el => el.classList.toggle('is-active', +el.dataset.i === s));
      $$('.journey__dot').forEach(el => { el.classList.toggle('is-active', +el.dataset.i === s); el.classList.toggle('is-done', +el.dataset.i < s); });
    });
  }

  /* ---------- before / after ---------- */
  const ba = $('#ba'), handle = $('#baHandle'), after = $('.ba__side--after');
  if (ba) {
    let dragging = false;
    const setPos = x => {
      const r = ba.getBoundingClientRect();
      const p = Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100));
      handle.style.left = p + '%'; after.style.clipPath = `inset(0 0 0 ${p}%)`; handle.setAttribute('aria-valuenow', Math.round(p));
    };
    ba.addEventListener('pointerdown', e => { dragging = true; setPos(e.clientX); ba.setPointerCapture(e.pointerId); });
    ba.addEventListener('pointermove', e => { if (dragging) setPos(e.clientX); });
    ba.addEventListener('pointerup', () => (dragging = false));
    ba.addEventListener('pointercancel', () => (dragging = false));
    handle.addEventListener('keydown', e => {
      const cur = parseFloat(handle.style.left) || 50; const r = ba.getBoundingClientRect();
      if (e.key === 'ArrowLeft') setPos(r.left + ((cur - 4) / 100) * r.width);
      if (e.key === 'ArrowRight') setPos(r.left + ((cur + 4) / 100) * r.width);
    });
    // auto-tease once when in view
    const tease = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting || reduced) return; tease.disconnect();
      if (hasGsap) { const o = { p: 50 }; gsap.to(o, { p: 30, duration: 1, ease: 'power2.inOut', yoyo: true, repeat: 1, onUpdate: () => { const r = ba.getBoundingClientRect(); setPos(r.left + (o.p / 100) * r.width); } }); }
    }, { threshold: 0.6 });
    tease.observe(ba);
  }

  /* ---------- calculator ---------- */
  const inP = $('#inPeople'), inH = $('#inHard'), inB = $('#inBottle');
  const money = n => '$' + Math.round(n).toLocaleString();
  function calc() {
    const people = +inP.value, hard = +inH.value, bottles = +inB.value;
    const hf = Math.max(0, (hard - 3) / 22);                 // 0..1 hardness factor
    const soap = people * 95 * (0.6 + hf * 1.4);             // extra soap, detergent, cleaners
    const appliance = 180 + hf * 420 + people * 25;           // energy loss, early replacement
    const bottle = bottles * 52 * 6.5;                        // cases per year
    const plumb = 60 + hf * 260;                              // fixtures, valves, heater elements
    const total = soap + appliance + bottle + plumb;
    $('#cSoap').textContent = money(soap); $('#cAppliance').textContent = money(appliance);
    $('#cBottle').textContent = money(bottle); $('#cPlumb').textContent = money(plumb);
    $('#calcTotal').textContent = money(total);
    $('#ringFg').style.strokeDashoffset = 540 - Math.min(1, total / 4000) * 540;
    $('#outPeople').textContent = people; $('#outHard').textContent = hard; $('#outBottle').textContent = bottles;
    [inP, inH, inB].forEach(i => i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min)) * 100 + '%'));
  }
  if (inP) { [inP, inH, inB].forEach(i => i.addEventListener('input', calc)); calc(); }

  /* ---------- 3D tilt cards + glow ---------- */
  if (window.matchMedia('(hover: hover)').matches && !reduced) {
    $$('.tilt').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.transform = `rotateY(${(x - 0.5) * 10}deg) rotateX(${(0.5 - y) * 10}deg) translateZ(6px)`;
        c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
      });
      c.addEventListener('pointerleave', () => (c.style.transform = ''));
    });
    /* magnetic buttons */
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2; b.style.transform = `translate(${x * 0.18}px, ${y * 0.25}px)`; });
      b.addEventListener('pointerleave', () => (b.style.transform = ''));
    });
  }

  /* ---------- form ---------- */
  const form = $('#leadForm');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    $$('[required]', form).forEach(i => { const bad = !i.value.trim(); i.classList.toggle('is-error', bad); if (bad) ok = false; });
    if (!ok) return;
    // TODO: wire to your CRM / email endpoint (Formspree, Netlify Forms, HubSpot, etc.)
    form.classList.add('is-sent');
    form.querySelector('button').textContent = 'Request sent ✓';
    form.querySelector('button').disabled = true;
  });

  $('#year').textContent = new Date().getFullYear();
})();
