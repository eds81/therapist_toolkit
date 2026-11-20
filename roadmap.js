/* =============================================
   TREATMENT ROADMAP — a high-level overview of the three phases of a Rise
   treatment, with links into the Treatment Planning Tool
   ============================================= */

function icon(id, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}"><use href="#${id}"/></svg>`;
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const TOOL_ICONS = { planner: 'ic-target', safety: 'ic-shield', library: 'ic-book-open', community: 'ic-map-pin', schools: 'ic-school', selfcare: 'ic-heart' };
const PHASE_ICONS = ['ic-search', 'ic-tool', 'ic-flag'];
// Each "Plan Phase N" button opens the Treatment Planning Tool on the first
// step of that phase (planner.js reads ?step=).
const PHASE_PLANNER_STEP = ['community', 'resourcePlan', 'review'];
const ORIENT_ORANGE_ROAD = '#E8772E';


// ── Phase scenes: the therapist and client from the Treatment Planning
// Tool (characters.js), one short looping scene per phase. ──
const ROADMAP_SCENES = [
  // Phase 1 — Assess & Understand: the client shares, and they build the
  // safety plan together (its steps check off one by one)
  `<svg viewBox="0 0 300 210" class="journey-illus-svg" aria-hidden="true">
    <g transform="translate(150 96)">
      <path d="M0 -50 L34 -38 V-6 C34 22 14 38 0 46 C-14 38 -34 22 -34 -6 V-38 Z" fill="#FFFFFF" stroke="${ORIENT_TEAL}" stroke-width="3" stroke-linejoin="round"/>
      ${[0, 1, 2].map(i => `
        <rect x="-8" y="${-28 + i * 18}" width="26" height="6" rx="3" fill="#E3DCCB"/>
        <path d="M-22 ${-25 + i * 18} l4 4 l7 -8" stroke="${ORIENT_GREEN}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="20 60" stroke-dashoffset="24">
          <animate attributeName="stroke-dashoffset" values="24; 24; 0; 0; 24" keyTimes="0; ${(0.3 + i * 0.14).toFixed(2)}; ${(0.38 + i * 0.14).toFixed(2)}; .92; 1" dur="6s" repeatCount="indefinite"/>
        </path>`).join('')}
    </g>
    ${orientTherapist(72, 200, [34, -10], '0 0 0; -10 0 0; 0 0 0')}
    ${orientClient(238, 200, 'talk', 0.08)}
  </svg>`,
  // Phase 2 — Train & Teach Skills: practicing a skill together (a breathing
  // circle grows and shrinks between them); the client gets an idea
  `<svg viewBox="0 0 300 210" class="journey-illus-svg" aria-hidden="true">
    <g transform="translate(152 104)">
      <circle r="44" fill="#E6F0F1"/>
      <circle r="30" fill="#BFE0E6">
        <animate attributeName="r" values="22; 40; 40; 22; 22" keyTimes="0; .35; .5; .85; 1" dur="6s" repeatCount="indefinite"/>
      </circle>
      <circle r="14" fill="#FFFFFF"/>
      <text y="4" text-anchor="middle" font-size="9.5" font-weight="900" fill="${ORIENT_TEAL_DARK}" font-family="Nunito, sans-serif">BREATHE</text>
    </g>
    ${orientTherapist(66, 200, [36, -14], '0 0 0; -8 0 0; 0 0 0')}
    ${orientClient(240, 200, 'idea', 0.45)}
  </svg>`,
  // Phase 3 — Consolidate & Next Steps: the client walks on toward their
  // next step in care while the therapist waves them on
  `<svg viewBox="0 0 300 210" class="journey-illus-svg" aria-hidden="true">
    <path d="M96 196 C150 180 200 196 286 176" stroke="#E3DCCB" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M96 196 C150 180 200 196 286 176" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="6 9"/>
    <g transform="translate(272 172)">
      <line x1="0" y1="0" x2="0" y2="-62" stroke="#6E6656" stroke-width="3" stroke-linecap="round"/>
      <path d="M0 -62 L28 -54 L0 -44 Z" fill="${ORIENT_GREEN}">
        <animateTransform attributeName="transform" type="skewY" values="0; -4; 0; 4; 0" dur="2.4s" repeatCount="indefinite"/>
      </path>
    </g>
    <g>
      <animateTransform attributeName="transform" type="translate" values="0 0; 0 0; 96 -8; 96 -8; 96 -8" keyTimes="0; .1; .7; .9; 1" dur="6s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="1; 1; 1; 0; 0; 1" keyTimes="0; .1; .82; .9; .97; 1" dur="6s" repeatCount="indefinite"/>
      ${orientClient(142, 200, 'check', 0.4)}
    </g>
    ${orientTherapist(58, 202, [26, -40], '0 0 0; -22 0 0; 0 0 0')}
  </svg>`,
].map(orientEase);


// ── The road across the top of the phase cards. Sessions 1–12 are marked
// along it; each phase's pin sits at the middle of its stretch. A dot travels
// the road on a loop, and as it passes through a phase that phase's stretch
// of road, pin and card light up (initRoad). ──
const ROAD_SESSIONS = 12;
const ROAD_LOOP_SECONDS = 15;
const ROAD_PATH = 'M 0 100 C 100 100 120 54 200 54 C 330 54 470 96 600 96 C 730 96 870 54 1000 54 C 1090 54 1110 92 1200 92';
// Which sessions each phase covers (from "Sessions 1–4" etc.); defaults to 1–4, 5–8, 9–12.
function phaseSessionRanges(phases) {
  return [0, 1, 2].map(i => {
    const m = String((phases[i] || {}).sessions || '').match(/(\d+)\s*[–-]\s*(\d+)/);
    return m ? [+m[1], +m[2]] : [i * 4 + 1, i * 4 + 4];
  });
}
function roadHtml(page) {
  const road = page.road || {};
  return `
  <svg viewBox="0 -24 1200 174" class="roadmap-road-svg" preserveAspectRatio="xMidYMid meet"
       role="slider" tabindex="0" aria-label="${escapeHtml(road.sliderLabel || 'Treatment session')}" aria-valuemin="1" aria-valuemax="${ROAD_SESSIONS}" aria-valuenow="1">
    <path d="${ROAD_PATH}" stroke="#D9D1BF" stroke-width="40" fill="none" stroke-linecap="round"/>
    <path id="roadmapRoadPath" d="${ROAD_PATH}" stroke="#4A5560" stroke-width="32" fill="none" stroke-linecap="round"/>
    <g class="road-phase-segs"></g>
    <path d="${ROAD_PATH}" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-dasharray="14 12" opacity=".55"/>
    <g class="road-sessions"></g>
    <g class="road-pins"></g>
    <g transform="translate(18 100)">
      <rect x="-14" y="26" width="48" height="22" rx="11" fill="#FFFFFF" stroke="#D9D1BF" stroke-width="2"/>
      <text x="10" y="41" text-anchor="middle" font-size="12" font-weight="900" fill="#4A5560" font-family="Nunito, sans-serif">${escapeHtml(road.startLabel || 'Start')}</text>
    </g>
    <g transform="translate(1176 92)">
      <line x1="0" y1="0" x2="0" y2="-62" stroke="#4A5560" stroke-width="3" stroke-linecap="round"/>
      <path d="M0 -62 L26 -54 L0 -45 Z" fill="${ORIENT_GREEN}">
        <animateTransform attributeName="transform" type="skewY" values="0; -5; 0; 5; 0" dur="2.6s" repeatCount="indefinite"/>
      </path>
      <text x="-6" y="30" text-anchor="end" font-size="12" font-weight="900" fill="#4A5560" font-family="Nunito, sans-serif">${escapeHtml(road.endLabel || 'Finish')}</text>
    </g>
    <g class="road-dot">
      <circle r="10" fill="#F5C842" stroke="#FFFFFF" stroke-width="3"/>
      <animateMotion dur="${ROAD_LOOP_SECONDS}s" repeatCount="indefinite" keyPoints="0; 1" keyTimes="0; 1" calcMode="linear">
        <mpath href="#roadmapRoadPath"/>
      </animateMotion>
    </g>
  </svg>`;
}

// Place the session markers, phase stretches and pins along the actual road
// (equal distances per session), then follow the dot and light up its phase.
function initRoad(phases) {
  const svg = document.querySelector('.roadmap-road-svg');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const path = svg.querySelector('#roadmapRoadPath');
  const L = path.getTotalLength();
  const ranges = phaseSessionRanges(phases);
  const colors = [ORIENT_ORANGE_ROAD, ORIENT_GREEN, ORIENT_TEAL];
  const at = frac => path.getPointAtLength(L * frac);
  const sessionFrac = n => (n - 0.5) / ROAD_SESSIONS; // center of session n's stretch

  // each phase's stretch of road (lit up while the dot is in it)
  const segs = svg.querySelector('.road-phase-segs');
  ranges.forEach(([from, to], i) => {
    const seg = document.createElementNS(NS, 'path');
    seg.setAttribute('d', ROAD_PATH);
    seg.setAttribute('class', `road-seg road-seg-${i + 1}`);
    seg.setAttribute('stroke', colors[i]);
    seg.setAttribute('stroke-width', '32');
    seg.setAttribute('fill', 'none');
    const start = L * (from - 1) / ROAD_SESSIONS, len = L * (to - from + 1) / ROAD_SESSIONS;
    seg.setAttribute('stroke-dasharray', `0 ${start.toFixed(1)} ${len.toFixed(1)} ${L.toFixed(1)}`);
    segs.appendChild(seg);
  });

  // session markers 1–12, on the road
  const sessions = svg.querySelector('.road-sessions');
  for (let n = 1; n <= ROAD_SESSIONS; n++) {
    const p = at(sessionFrac(n));
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'road-session');
    g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    g.innerHTML = `<circle r="11" fill="#FFFFFF" stroke="#4A5560" stroke-width="2"/><text y="4.5" text-anchor="middle" font-size="12" font-weight="900" fill="#4A5560" font-family="Nunito, sans-serif">${n}</text>`;
    sessions.appendChild(g);
  }

  // one numbered pin per phase, standing on the middle of its stretch
  const pins = svg.querySelector('.road-pins');
  ranges.forEach(([from, to], i) => {
    const p = at(((from - 1) + (to - from + 1) / 2) / ROAD_SESSIONS);
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', `road-pin road-pin-${i + 1}`);
    g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${(p.y - 14).toFixed(1)})`);
    g.innerHTML = `<g class="road-pin-shape"><path d="M0 6 C-13 -8 -16 -16 -16 -24 A16 16 0 0 1 16 -24 C16 -16 13 -8 0 6 Z" fill="${colors[i]}" stroke="#FFFFFF" stroke-width="3"/><text x="0" y="-19" text-anchor="middle" font-size="15" font-weight="900" fill="#FFFFFF" font-family="Nunito, sans-serif">${i + 1}</text></g>`;
    pins.appendChild(g);
  });

  const cards = [...document.querySelectorAll('#journeyPhases .journey-phase')];
  const sessionEls = [...svg.querySelectorAll('.road-session')];
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phaseNames = phases.map(ph => ph.title || '');

  // light up the session the dot is in, and its phase (stretch, pin, card)
  let lastSession = 0;
  function showSession(session) {
    if (session === lastSession) return;
    lastSession = session;
    const phase = ranges.findIndex(([from, to]) => session >= from && session <= to);
    sessionEls.forEach((el, k) => {
      el.classList.toggle('is-passed', k + 1 < session);
      el.classList.toggle('is-current', k + 1 === session);
    });
    svg.querySelectorAll('.road-seg').forEach((el, k) => el.classList.toggle('is-active', k === phase));
    svg.querySelectorAll('.road-pin').forEach((el, k) => el.classList.toggle('is-active', k === phase));
    cards.forEach((el, k) => el.classList.toggle('is-current-phase', k === phase));
    svg.setAttribute('aria-valuenow', String(session));
    svg.setAttribute('aria-valuetext', `Session ${session}${phase > -1 ? `, ${phaseNames[phase]}` : ''}`);
  }
  const sessionAt = frac => Math.min(ROAD_SESSIONS, Math.floor(frac * ROAD_SESSIONS) + 1);
  const currentFrac = () => (svg.getCurrentTime() % ROAD_LOOP_SECONDS) / ROAD_LOOP_SECONDS;
  // put the dot at a point along the road (0–1); holds it there while paused
  function moveDotTo(frac) {
    frac = Math.max(0, Math.min(0.9999, frac));
    svg.setCurrentTime(frac * ROAD_LOOP_SECONDS);
    showSession(sessionAt(frac));
  }

  if (reduced) { svg.pauseAnimations(); moveDotTo(sessionFrac(1)); }
  else {
    (function tick() {
      showSession(sessionAt(currentFrac()));
      requestAnimationFrame(tick);
    })();
  }

  // nearest point on the road to the pointer, as a fraction of its length
  const samples = Array.from({ length: 241 }, (_, i) => { const pt = path.getPointAtLength(L * i / 240); return [pt.x, pt.y]; });
  function fracFromEvent(e) {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    let best = 0, bestD = Infinity;
    samples.forEach(([x, y], i) => { const d = (x - pt.x) ** 2 + (y - pt.y) ** 2; if (d < bestD) { bestD = d; best = i; } });
    return best / 240;
  }
  // hover (or drag) scrubs the dot; leaving or a short pause after a tap resumes it
  let resumeTimer = null;
  const hold = () => { clearTimeout(resumeTimer); svg.pauseAnimations(); svg.classList.add('is-scrubbing'); };
  const resume = (delay) => {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { svg.classList.remove('is-scrubbing'); if (!reduced) svg.unpauseAnimations(); }, delay || 0);
  };
  svg.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' && !e.buttons) return;
    const f = fracFromEvent(e); if (f === null) return;
    hold(); moveDotTo(f);
  });
  svg.addEventListener('pointerdown', e => {
    const f = fracFromEvent(e); if (f === null) return;
    hold(); moveDotTo(f);
    if (e.pointerType === 'touch') svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') resume(2200); });
  svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') resume(0); });
  svg.addEventListener('click', () => { resume(1600); }); // set the start point, then carry on from there
  // keyboard: arrows step one session; Home/End jump to the ends
  svg.addEventListener('keydown', e => {
    const steps = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
    let target = null;
    if (e.key in steps) target = Math.max(1, Math.min(ROAD_SESSIONS, (lastSession || 1) + steps[e.key]));
    if (e.key === 'Home') target = 1;
    if (e.key === 'End') target = ROAD_SESSIONS;
    if (target === null) return;
    e.preventDefault();
    hold(); moveDotTo(sessionFrac(target));
  });
  svg.addEventListener('blur', () => resume(0));
}

function render(data) {
  const page = data.roadmapPage;
  const journey = data.journey;
  const phases = (data.toolkit && data.toolkit.tabs.roadmap.phases) || [];
  const ext = data.planner && data.planner.extension;

  document.getElementById('roadmapLabel').textContent = page.sectionLabel;
  document.getElementById('roadmapHeading').textContent = page.heading;
  document.getElementById('roadmapIntro').textContent = page.intro;
  const top = document.getElementById('roadmapCtaTop');
  top.href = page.cta.href;
  top.innerHTML = `${icon('ic-target', 'icon-sm')}${escapeHtml(page.cta.buttonText)} ${icon('i-arrow-right', 'icon-xs')}`;

  const toolByKey = {};
  ((data.tour && data.tour.tools) || []).forEach(t => { toolByKey[t.key] = t; });
  const chip = key => {
    const t = toolByKey[key];
    return t ? `<a class="journey-chip journey-chip-${key}" href="${t.href}">${icon(TOOL_ICONS[key] || 'ic-layers', 'icon-xs')}${escapeHtml(t.title)}</a>` : '';
  };

  document.getElementById('roadmapRoad').innerHTML =
    ((page.road && page.road.hint) ? `<p class="roadmap-road-hint">${escapeHtml(page.road.hint)}</p>` : '') + roadHtml(page);
  document.getElementById('journeyHeading').textContent = journey.heading;
  document.getElementById('journeyIntro').textContent = journey.intro;
  document.getElementById('journeyPhases').innerHTML = journey.phases.map((jp, i) => {
    const ph = phases[i] || {};
    let extHtml = '';
    if (ext && ext.href && i === 1) extHtml = `<a class="journey-extension" href="${ext.href}" target="_blank" rel="noopener">${icon('ic-refresh', 'icon-xs')}${escapeHtml(ext.phase2LinkText)}</a>`;
    if (ext && ext.href && i === 2) extHtml = `<a class="journey-extension" href="${ext.href}" target="_blank" rel="noopener">${icon('ic-refresh', 'icon-xs')}${escapeHtml(ext.phase3ButtonText)}</a>`;
    return `
      <div class="journey-phase journey-phase-${i + 1}">
        ${ROADMAP_SCENES[i] ? `<div class="journey-illus">${ROADMAP_SCENES[i]}</div>` : ''}
        <div class="journey-phase-head">
          <span class="journey-phase-num">${i + 1}</span>
          <div>
            <strong>${escapeHtml(ph.title || '')}</strong>
            <span>${escapeHtml(ph.sessions || '')}</span>
          </div>
        </div>
        <p>${escapeHtml(jp.note)}</p>
        ${(ph.items || []).length ? `<ul class="journey-focus">${ph.items.map(it => `<li>${escapeHtml(it)}</li>`).join('')}</ul>` : ''}
        <div class="journey-chips">${jp.tools.map(chip).join('')}</div>
        ${(ph.interventions || []).length ? `
        <details class="journey-interventions">
          <summary>Sample interventions</summary>
          <ul>${ph.interventions.map(it => `<li>${escapeHtml(it)}</li>`).join('')}</ul>
        </details>` : ''}
        <div class="journey-phase-actions">
          <a class="journey-goto" href="planning-tool.html?step=${PHASE_PLANNER_STEP[i] || 'community'}">${icon(PHASE_ICONS[i] || 'ic-flag', 'icon-xs')}${escapeHtml(page.planPhaseLabel || 'Plan Phase')} ${i + 1} ${icon('i-arrow-right', 'icon-xs')}</a>
          ${extHtml}
        </div>
      </div>`;
  }).join('');

  document.getElementById('roadmapCtaHeading').textContent = page.cta.heading;
  document.getElementById('roadmapCtaBody').textContent = page.cta.body;
  document.getElementById('roadmapCtaActions').innerHTML =
    `<a class="btn btn-primary" href="${page.cta.href}">${escapeHtml(page.cta.buttonText)}</a>`;

  document.getElementById('footerLeft').innerHTML =
    `<strong>${data.footer.orgName}</strong><span>${data.footer.subLine}</span>`;
  document.getElementById('footerRight').innerHTML = `<p>${data.footer.fundingText}</p>`;
}

// ── Scroll fade-in animations ────────────────
function initFadeObserver() {
  const fadeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('[data-fade]').forEach(el => fadeObserver.observe(el));
}

// ── Scroll progress bar ──────────────────────
const scrollProgress = document.getElementById('scrollProgress');
window.addEventListener('scroll', () => {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress.style.width = (window.scrollY / total * 100) + '%';
}, { passive: true });

// ── Nav scrolled state ───────────────────────
const mainNav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  mainNav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── Mobile nav ───────────────────────────────
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navMobile    = document.getElementById('navMobile');
const useEl = hamburgerBtn.querySelector('use');
hamburgerBtn.addEventListener('click', () => {
  const isOpen = navMobile.classList.toggle('open');
  useEl.setAttribute('href', isOpen ? '#i-x' : '#i-menu');
});
navMobile.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navMobile.classList.remove('open');
    useEl.setAttribute('href', '#i-menu');
  });
});

loadSiteContent().then(data => {
  render(data);
  initRoad((data.toolkit && data.toolkit.tabs.roadmap.phases) || []);
  initFadeObserver();
  // Reduced motion: hold the phase scenes still.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('svg.journey-illus-svg, svg.roadmap-road-svg').forEach(svg => {
      try { svg.pauseAnimations(); svg.setCurrentTime(2.4); } catch (e) { /* ignore */ }
    });
  }
});
