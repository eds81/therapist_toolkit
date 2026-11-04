/* =============================================
   THERAPIST TOOLKIT — HOME PAGE (hero + FAQ + footer)
   ============================================= */

function icon(id, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}"><use href="#${id}"/></svg>`;
}

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

  // TOOLKIT FAQ (verbatim client copy)
  const faq = data.toolkitFaq;
  document.getElementById('faqLabel').textContent = faq.sectionLabel;

  document.getElementById('faqGoalHeading').textContent = faq.goal.heading;
  document.getElementById('faqGoalBody').innerHTML = faq.goal.paragraphs.map(p => `<p>${p}</p>`).join('');

  document.getElementById('faqWhyHeading').textContent = faq.why.heading;
  document.getElementById('faqWhyGrid').innerHTML = data.why.cards.map(card => `
    <div class="why-card">
      <div class="why-icon ${card.colorClass}">${icon(card.icon)}</div>
      <p><strong>${card.lead}</strong> ${card.body} <em>${card.citation}</em>.</p>
    </div>`).join('');

  document.getElementById('faqHowHeading').textContent = faq.how.heading;
  document.getElementById('faqHowIntro').textContent = faq.how.intro;
  document.getElementById('faqHowPairs').innerHTML = faq.how.pairs.map(pair => `
    <div class="faq-pair">
      <p class="faq-concern"><strong>Therapist concern:</strong> ${pair.concern}</p>
      <p class="faq-solution"><strong>Toolkit solution:</strong> ${pair.solution}</p>
    </div>`).join('');

  document.getElementById('faqIncludesHeading').textContent = faq.includes.heading;
  document.getElementById('faqIncludesList').innerHTML = faq.includes.items.map(it => `
    <div class="faq-includes-item">
      <span class="faq-letter">${it.letter}.</span>
      <p><strong>${it.title}:</strong> ${it.body}</p>
    </div>`).join('');

  document.getElementById('faqUseHeading').textContent = faq.useIt.heading;
  document.getElementById('faqUseIntro').textContent = faq.useIt.intro;
  document.getElementById('faqUseGuidance').innerHTML = faq.useIt.guidance.map(g => `
    <p><strong>${g.title}</strong> ${g.body}</p>`).join('');
  document.getElementById('faqUseTips').innerHTML = faq.useIt.tips.map(t => `<li>${t}</li>`).join('');
  document.getElementById('faqUseClosing').innerHTML =
    `${faq.useIt.closing.pre} <a href="${faq.useIt.closing.linkHref}">${faq.useIt.closing.linkText}</a> ${faq.useIt.closing.post}`;

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
