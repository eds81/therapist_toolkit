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

  document.getElementById('journeyHeading').textContent = journey.heading;
  document.getElementById('journeyIntro').textContent = journey.intro;
  document.getElementById('journeyPhases').innerHTML = journey.phases.map((jp, i) => {
    const ph = phases[i] || {};
    let extHtml = '';
    if (ext && ext.href && i === 1) extHtml = `<a class="journey-extension" href="${ext.href}" target="_blank" rel="noopener">${icon('ic-refresh', 'icon-xs')}${escapeHtml(ext.phase2LinkText)}</a>`;
    if (ext && ext.href && i === 2) extHtml = `<a class="journey-extension" href="${ext.href}" target="_blank" rel="noopener">${icon('ic-refresh', 'icon-xs')}${escapeHtml(ext.phase3ButtonText)}</a>`;
    return `
      <div class="journey-phase journey-phase-${i + 1}">
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
  initFadeObserver();
});
