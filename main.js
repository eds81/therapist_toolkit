/* =============================================
   THERAPIST TOOLKIT — HOME PAGE (hero + what's inside + footer)
   ============================================= */

function icon(id, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}"><use href="#${id}"/></svg>`;
}

// ── Tool previews for "What's inside" ─────────
// Simplified sketches of each tool's real screen, so the card shows what the
// tool looks like. Purely decorative (the card text says what it does).
const TOOL_PREVIEWS = {
  planner: `
    <svg viewBox="0 0 240 130" class="pv-svg">
      <circle cx="120" cy="65" r="56" class="pv-ring"/><circle cx="120" cy="65" r="42" class="pv-ring"/>
      <circle cx="120" cy="65" r="28" class="pv-ring"/><circle cx="120" cy="65" r="14" class="pv-ring pv-ring-core"/>
      <line x1="58" y1="30" x2="80" y2="40" class="pv-line pv-risk-line"/><line x1="58" y1="72" x2="94" y2="68" class="pv-line pv-risk-line"/>
      <line x1="182" y1="44" x2="158" y2="50" class="pv-line pv-prot-line"/><line x1="182" y1="90" x2="133" y2="70" class="pv-line pv-prot-line"/>
      <rect x="8" y="20" width="50" height="20" rx="10" class="pv-risk-1"/><rect x="8" y="62" width="50" height="20" rx="10" class="pv-risk-2"/>
      <rect x="182" y="34" width="50" height="20" rx="10" class="pv-prot-1"/><rect x="182" y="80" width="50" height="20" rx="10" class="pv-prot-2"/>
    </svg>`,
  safety: `
    <div class="pv-paper">
      <div class="pv-paper-title">My Safety Plan</div>
      ${['Warning signs', 'Coping strategies', 'Supports', 'Professional supports', 'Safer environment'].map((t, i) =>
        `<div class="pv-step"><span class="pv-step-num">${i + 1}</span><span class="pv-step-text">${t}</span><span class="pv-bar"></span></div>`).join('')}
    </div>`,
  // A practice's pop-up card, as it opens in the Treatment Library
  library: `
    <div class="pv-ebp">
      <div class="pv-ebp-top"><span class="pv-ebp-icon">${icon('ic-star')}</span><span class="pv-badge">Evidence-Based Practice</span></div>
      <div class="pv-ebp-title">Safety Planning</div>
      <span class="pv-ebp-theme">Risk Assessment &amp; Safety Planning</span>
      <span class="pv-bar pv-bar-long"></span><span class="pv-bar"></span>
      <div class="pv-ebp-links">
        <div><span class="pv-label">For therapists</span><span class="pv-ebp-link">Safety plan template</span></div>
        <div><span class="pv-label">For clients &amp; families</span><span class="pv-ebp-link">Make A Safety Plan</span></div>
      </div>
    </div>`,
  community: `
    <div class="pv-stack">
      <div class="pv-search"><span class="pv-search-dot"></span>City, ZIP or facility</div>
      <div class="pv-map">
        <span class="pv-road pv-road-h"></span><span class="pv-road pv-road-v"></span>
        <span class="pv-pin" style="left:22%;top:30%"></span><span class="pv-pin" style="left:58%;top:55%"></span><span class="pv-pin" style="left:76%;top:24%"></span>
      </div>
    </div>`,
  schools: `
    <div class="pv-card">
      <div class="pv-card-head">Mental Health Contact Card</div>
      <div class="pv-card-body">
        <span class="pv-label">Rise therapist</span><span class="pv-bar pv-bar-long"></span>
        <span class="pv-label">Best times to reach me</span><span class="pv-bar"></span>
        <div class="pv-crisis">In a crisis: call or text 988</div>
      </div>
    </div>`,
  selfcare: `
    <div class="pv-selfcare">
      <div class="pv-breathe"><span>Breathe</span></div>
      <div class="pv-pills"><span>Talk to someone</span><span>Wall of wins</span><span>Peer support</span></div>
    </div>`,
};

// One icon per tool, used wherever that tool is named on the home page.
const TOOL_ICONS = { planner: 'ic-target', safety: 'ic-shield', library: 'ic-book-open', community: 'ic-map-pin', schools: 'ic-school', selfcare: 'ic-heart' };

// An external link opens in a new tab.
function linkAttrs(href) {
  return /^https?:/.test(href) ? ` href="${href}" target="_blank" rel="noopener"` : ` href="${href}"`;
}

function render(data) {
  // HERO — the two badges link to the partner organizations' websites
  document.getElementById('heroBadges').innerHTML = data.hero.badges.map((b, i) => {
    const badge = typeof b === 'string' ? { text: b } : b;
    const cls = `badge ${i === 0 ? 'badge-teal' : 'badge-green'}`;
    return badge.href
      ? `<a class="${cls} badge-link"${linkAttrs(badge.href)}>${badge.text}</a>`
      : `<span class="${cls}">${badge.text}</span>`;
  }).join('');
  document.getElementById('heroHeadline').innerHTML = `${data.hero.headlineLine1}<br/>${data.hero.headlineLine2}`;
  document.getElementById('heroSub').innerHTML = data.hero.sub;
  document.getElementById('heroActions').innerHTML = `
    <a href="${data.hero.ctaPrimary.href}" class="btn btn-primary">${data.hero.ctaPrimary.text}</a>
    <a href="${data.hero.ctaSecondary.href}" class="btn btn-outline">${data.hero.ctaSecondary.text}</a>`;

  // Discover group outcomes PDF — shown as "coming soon" until a PDF is uploaded
  const outcomes = data.hero.discoverOutcomes;
  const outcomesEl = document.getElementById('heroOutcomes');
  if (outcomes) {
    outcomesEl.innerHTML = `${icon('ic-file-text', 'icon-sm')}<span>${outcomes.text}</span> ` + (outcomes.pdf
      ? `<a${linkAttrs(outcomes.pdf)}>${outcomes.linkText}</a>`
      : `<span class="hero-outcomes-pending">${outcomes.linkText} <em>${outcomes.pendingNote || 'coming soon'}</em></span>`);
  } else outcomesEl.hidden = true;

  // Photo — a labeled placeholder until the photo is uploaded
  const photo = data.hero.photo;
  const photoEl = document.getElementById('heroPhoto');
  if (!photo) photoEl.hidden = true;
  else if (photo.src) {
    photoEl.innerHTML = `<img src="${photo.src}" alt="${photo.alt || ''}" />${photo.caption ? `<figcaption>${photo.caption}</figcaption>` : ''}`;
  } else {
    photoEl.classList.add('is-placeholder');
    photoEl.innerHTML = `<div class="hero-photo-empty" role="img" aria-label="${photo.placeholder}">${icon('ic-users')}<span>${photo.placeholder}</span></div>`;
  }

  // WHAT'S INSIDE
  const tour = data.tour;
  document.getElementById('tourLabel').textContent = tour.sectionLabel;
  document.getElementById('tourHeading').textContent = tour.heading;
  document.getElementById('tourIntro').textContent = tour.intro;
  document.getElementById('tourGrid').innerHTML = tour.tools.map((t, i) => `
    <a class="tour-card tour-card-${t.key}" href="${t.href}" data-fade data-delay="${(i % 3) + 1}">
      <div class="tour-preview" aria-hidden="true">${TOOL_PREVIEWS[t.key] || ''}</div>
      <div class="tour-body">
        <h3 class="tour-title">${icon(TOOL_ICONS[t.key] || 'ic-layers', 'icon-sm')}<span>${t.title}</span></h3>
        <p>${t.tagline}</p>
        <p class="tour-when"><strong>${tour.useWhenLabel}:</strong> ${t.useWhen}</p>
        <span class="tour-open">${tour.openLabel} ${t.title} ${icon('i-arrow-right', 'icon-xs')}</span>
      </div>
    </a>`).join('');

  // FOOTER
  document.getElementById('footerLeft').innerHTML =
    `<strong>${data.footer.orgName}</strong><span>${data.footer.subLine}</span>`;
  document.getElementById('footerRight').innerHTML = `<p>${data.footer.fundingText}</p>`;
}

// ── Scroll fade-in animations ────────────────
function initFadeObserver() {
  const fadeEls = document.querySelectorAll('[data-fade]');
  const fadeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  fadeEls.forEach(el => fadeObserver.observe(el));
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

// ── Load content, render, then wire up interactions ──
loadSiteContent()
  .then(data => {
    render(data);
    initFadeObserver();
  });
