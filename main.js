/* =============================================
   THERAPIST TOOLKIT — HOME PAGE (hero + FAQ + footer)
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
  library: `
    <div class="pv-stack">
      <div class="pv-search"><span class="pv-search-dot"></span>Search resources…</div>
      <div class="pv-chips"><span>Worksheet</span><span>Handout</span><span class="is-on">Family</span><span>Schools</span></div>
      <div class="pv-result"><span class="pv-badge">Handout</span><span class="pv-bar pv-bar-long"></span></div>
      <div class="pv-result"><span class="pv-badge">Worksheet</span><span class="pv-bar"></span></div>
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

function render(data) {
  // HERO
  document.getElementById('heroBadges').innerHTML = data.hero.badges
    .map((b, i) => `<span class="badge ${i === 0 ? 'badge-teal' : 'badge-green'}">${b}</span>`)
    .join('');
  document.getElementById('heroHeadline').innerHTML = `${data.hero.headlineLine1}<br/>${data.hero.headlineLine2}`;
  document.getElementById('heroSub').innerHTML = data.hero.sub;
  document.getElementById('heroActions').innerHTML = `
    <a href="${data.hero.ctaPrimary.href}" class="btn btn-primary">${data.hero.ctaPrimary.text}</a>
    <a href="${data.hero.ctaSecondary.href}" class="btn btn-outline">${data.hero.ctaSecondary.text}</a>`;
  document.getElementById('heroStats').innerHTML = data.hero.stats.map(stat => stat.count !== undefined ? `
    <div class="stat-card">
      <span class="stat-num" data-count="${stat.count}" data-suffix="${stat.suffix}">${stat.count}${stat.suffix}</span>
      <span class="stat-label">${stat.label}</span>
    </div>` : `
    <div class="stat-card">
      <span class="stat-num stat-text">${stat.text}</span>
      <span class="stat-label">${stat.label}</span>
    </div>`).join('');

  // WHAT'S INSIDE
  const tour = data.tour;
  const toolByKey = {};
  tour.tools.forEach(t => { toolByKey[t.key] = t; });
  document.getElementById('tourLabel').textContent = tour.sectionLabel;
  document.getElementById('tourHeading').textContent = tour.heading;
  document.getElementById('tourIntro').textContent = tour.intro;
  document.getElementById('tourGrid').innerHTML = tour.tools.map((t, i) => `
    <a class="tour-card tour-card-${t.key}" href="${t.href}" data-fade data-delay="${(i % 3) + 1}">
      <div class="tour-preview" aria-hidden="true">${TOOL_PREVIEWS[t.key] || ''}</div>
      <div class="tour-body">
        <h3>${t.title}</h3>
        <p>${t.tagline}</p>
        <p class="tour-when"><strong>${tour.useWhenLabel}:</strong> ${t.useWhen}</p>
        <span class="tour-open">${tour.openLabel} ${t.title} ${icon('i-arrow-right', 'icon-xs')}</span>
      </div>
    </a>`).join('');

  // HOW IT FITS TOGETHER
  const journey = data.journey;
  const phases = data.toolkit.tabs.roadmap.phases;
  const chip = key => {
    const t = toolByKey[key];
    return t ? `<a class="journey-chip journey-chip-${key}" href="${t.href}">${t.title}</a>` : '';
  };
  document.getElementById('journeyLabel').textContent = journey.sectionLabel;
  document.getElementById('journeyHeading').textContent = journey.heading;
  document.getElementById('journeyIntro').textContent = journey.intro;
  document.getElementById('journeyPhases').innerHTML = journey.phases.map((jp, i) => {
    const ph = phases[i] || {};
    return `
      <div class="journey-phase journey-phase-${i + 1}">
        <div class="journey-phase-head">
          <span class="journey-phase-num">${i + 1}</span>
          <div>
            <strong>${ph.title || ''}</strong>
            <span>${ph.sessions || ''}</span>
          </div>
        </div>
        <p>${jp.note}</p>
        <div class="journey-chips">${jp.tools.map(chip).join('')}</div>
      </div>`;
  }).join('');
  document.getElementById('journeyThroughout').innerHTML = `
    <span class="journey-throughout-title">${journey.throughoutTitle}</span>
    ${journey.throughout.map(x => `<span class="journey-throughout-item">${chip(x.tool)}<span>${x.note}</span></span>`).join('')}`;

  // WHY IT EXISTS
  document.getElementById('whyLabel').textContent = data.whySummary.sectionLabel;
  document.getElementById('whyHeading').textContent = data.whySummary.heading;
  document.getElementById('whyGrid').innerHTML = data.why.cards.map((card, i) => `
    <div class="why-card" data-fade data-delay="${i + 1}">
      <div class="why-icon ${card.colorClass}">${icon(card.icon)}</div>
      <p><strong>${card.lead}</strong> ${card.body} <em>${card.citation}</em>.</p>
    </div>`).join('');
  const whyLink = document.getElementById('whyLink');
  whyLink.href = data.whySummary.linkHref;
  whyLink.innerHTML = `${data.whySummary.linkText} ${icon('i-arrow-right', 'icon-xs')}`;

  // QUESTIONS — the FAQ copy, unchanged, as expandable sections. Its "why"
  // section already appears above as the research cards, so it isn't repeated.
  const faq = data.toolkitFaq;
  document.getElementById('faqLabel').textContent = data.faqSection.sectionLabel;
  document.getElementById('faqHeading').textContent = data.faqSection.heading;
  // The FAQ headings carry their original numbers ("3. How Was…"); with
  // "Why" shown above as cards the numbering would skip, so drop it here.
  const faqItem = (heading, body, open) => `
    <details class="faq-item"${open ? ' open' : ''}>
      <summary><span>${heading.replace(/^\s*\d+\.\s*/, '')}</span></summary>
      <div class="faq-item-body">${body}</div>
    </details>`;
  document.getElementById('faqAccordion').innerHTML = [
    faqItem(faq.goal.heading, faq.goal.paragraphs.map(p => `<p>${p}</p>`).join(''), true),
    faqItem(faq.how.heading, `<p>${faq.how.intro}</p>` + faq.how.pairs.map(pair => `
      <div class="faq-pair">
        <p class="faq-concern"><strong>Therapist concern:</strong> ${pair.concern}</p>
        <p class="faq-solution"><strong>Toolkit solution:</strong> ${pair.solution}</p>
      </div>`).join('')),
    faqItem(faq.includes.heading, faq.includes.items.map(it => `
      <div class="faq-includes-item">
        <span class="faq-letter">${it.letter}.</span>
        <p><strong>${it.title}:</strong> ${it.body}</p>
      </div>`).join('')),
    faqItem(faq.useIt.heading, `<p>${faq.useIt.intro}</p>` +
      faq.useIt.guidance.map(g => `<p><strong>${g.title}</strong> ${g.body}</p>`).join('') +
      `<ul class="how-to-use-tips">${faq.useIt.tips.map(t => `<li>${t}</li>`).join('')}</ul>` +
      `<p>${faq.useIt.closing.pre} <a href="${faq.useIt.closing.linkHref}">${faq.useIt.closing.linkText}</a> ${faq.useIt.closing.post}</p>`),
  ].join('');

  // FOOTER
  document.getElementById('footerLeft').innerHTML =
    `<strong>${data.footer.orgName}</strong><span>${data.footer.subLine}</span>`;
  document.getElementById('footerRight').innerHTML = `<p>${data.footer.fundingText}</p>`;
}

// ── Stat counters ────────────────────────────
function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1200;
  const start = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function initStatCounters() {
  const statObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.dataset.count) animateCount(el);
      statObserver.unobserve(el);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-num[data-count]').forEach(el => statObserver.observe(el));
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
    initStatCounters();
    initFadeObserver();
  });
