/* =============================================
   ABOUT PAGE — Why / Toolkit / Our Model / Research / Team
   ============================================= */

function icon(id, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}"><use href="#${id}"/></svg>`;
}

function concernHtml(tab) {
  return tab.concern
    ? `<div class="tab-concern"><span class="tab-concern-label">Therapist concern</span><p>${tab.concern}</p></div>`
    : '';
}

function render(data) {
  // ABOUT / ECOSYSTEM
  document.getElementById('aboutLabel').textContent = data.about.sectionLabel;
  document.getElementById('aboutHeading').innerHTML = `${data.about.headingLine1}<br/>${data.about.headingLine2}`;
  document.getElementById('aboutIntro').textContent = data.about.intro;
  document.getElementById('partnershipNote').innerHTML =
    `${data.about.partnershipNote.text} <a href="${data.about.partnershipNote.linkHref}">${data.about.partnershipNote.linkText}</a>`;
  document.getElementById('ecoHint').textContent = data.about.ecosystemHint;
  document.getElementById('ecoLegend').innerHTML = data.about.ecosystemLegend.map(layer => `
    <div class="eco-legend-item" data-layer="${layer.layer}">
      <div class="eco-swatch eco-swatch-${layer.layer}"></div>
      <div class="eco-legend-body">
        <strong>${layer.title}</strong>
        <p>${layer.body}</p>
        ${layer.tags.length ? `<ul class="eco-tags">${layer.tags.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}
      </div>
    </div>`).join('');

  const steps = data.about.modelSteps;
  document.getElementById('modelSteps').innerHTML = steps.map((step, i) => {
    const stepHtml = `
      <div class="model-step" data-fade data-delay="${i + 1}">
        <div class="step-icon-wrap ${step.colorClass}">${icon(step.icon)}</div>
        <p>${step.text}</p>
      </div>`;
    const arrowHtml = i < steps.length - 1
      ? `<div class="step-arrow" data-fade data-delay="${i + 2}">${icon('i-arrow-right', 'icon-sm')}</div>`
      : '';
    return stepHtml + arrowHtml;
  }).join('');

  // WHY
  document.getElementById('whyLabel').textContent = data.why.sectionLabel;
  document.getElementById('whyHeading').textContent = data.why.heading;
  document.getElementById('whyGrid').innerHTML = data.why.cards.map((card, i) => `
    <div class="why-card" data-fade data-delay="${i + 1}">
      <div class="why-icon ${card.colorClass}">${icon(card.icon)}</div>
      <p><strong>${card.lead}</strong> ${card.body} <em>${card.citation}</em>.</p>
    </div>`).join('');
  document.getElementById('whyPullQuote').innerHTML =
    `"${data.why.pullQuote.text}"<cite>— ${data.why.pullQuote.cite}</cite>`;

  // TOOLKIT
  document.getElementById('toolkitLabel').textContent = data.toolkit.sectionLabel;
  document.getElementById('toolkitHeading').textContent = data.toolkit.heading;
  document.getElementById('toolkitIntro').textContent = data.toolkit.intro;

  const tabs = data.toolkit.tabs;

  const roadmapBtn = `<button class="tab-btn active" data-tab="roadmap">${tabs.roadmap.tabLabel}</button>`;
  const libraryLink = `<a class="tab-btn tab-btn-link" href="resource-library.html">${data.toolkit.libraryLinkLabel}${icon('i-arrow-right', 'icon-xs')}</a>`;
  const schoolsBtn = `<a class="tab-btn tab-btn-link" href="schools.html">${tabs.schools.tabLabel}${icon('i-arrow-right', 'icon-xs')}</a>`;
  const selfCareLink = `<a class="tab-btn tab-btn-link" href="self-care.html">${data.toolkit.selfCareLinkLabel}${icon('i-arrow-right', 'icon-xs')}</a>`;
  document.getElementById('toolkitTabsNav').innerHTML = roadmapBtn + libraryLink + schoolsBtn + selfCareLink;

  const roadmap = tabs.roadmap;
  document.getElementById('tab-roadmap').innerHTML = `
    <div class="tab-layout">
      <div class="tab-text">
        ${concernHtml(roadmap)}
        <h3>${roadmap.heading}</h3>
        <p>${roadmap.intro}</p>
      </div>
      <div class="tab-visual">
        <div class="roadmap">
          ${roadmap.phases.map((phase, i) => {
            const phaseHtml = `
              <div class="roadmap-phase phase-${i + 1}">
                <div class="phase-top">
                  <div class="phase-header">${phase.title}</div>
                  <div class="phase-sessions">${phase.sessions}</div>
                  <ul class="phase-items">${phase.items.map(it => `<li>${it}</li>`).join('')}</ul>
                </div>
                <button class="phase-expand-btn" aria-expanded="false">
                  <span>Sample interventions</span>
                  ${icon('i-plus', 'icon-xs expand-icon')}
                </button>
                <div class="phase-expanded" hidden>
                  <ul>${phase.interventions.map(it => `<li>${it}</li>`).join('')}</ul>
                </div>
              </div>`;
            const arrowHtml = i < roadmap.phases.length - 1
              ? `<div class="phase-arrow">${icon('i-arrow-right')}</div>` : '';
            return phaseHtml + arrowHtml;
          }).join('')}
        </div>
      </div>
    </div>`;

  const schools = tabs.schools;
  document.getElementById('tab-schools').innerHTML = `
    <div class="tab-layout">
      <div class="tab-text">
        ${concernHtml(schools)}
        <h3>${schools.heading}</h3>
        <p>${schools.intro}</p>
        <blockquote class="mini-quote">"${schools.quote.text}"<cite>— ${schools.quote.cite}</cite></blockquote>
      </div>
      <div class="tab-visual">
        <div class="schools-cards">
          ${schools.items.map(it => `
            <div class="school-item">
              <div class="school-icon-wrap">${icon(it.icon)}</div>
              <div>
                <h4>${it.title}</h4>
                <p>${it.body}</p>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;

  // HOW TO USE THIS TOOLKIT
  const howTo = data.toolkit.howToUse;
  document.getElementById('howToUseHeading').textContent = howTo.heading;
  document.getElementById('howToUseIntro').textContent = howTo.intro;
  const STEP_LINK_HREFS = { library: 'resource-library.html', selfcare: 'self-care.html' };
  document.getElementById('howToUseSteps').innerHTML = howTo.steps.map(step => {
    const href = STEP_LINK_HREFS[step.tab];
    const tag = href ? 'a' : 'div';
    const hrefAttr = href ? ` href="${href}"` : '';
    return `
      <${tag} class="how-to-use-step" ${hrefAttr}>
        <div class="how-to-use-icon">${icon(step.icon)}</div>
        <div>
          <h4>${step.title}</h4>
          <p>${step.body}</p>
        </div>
      </${tag}>`;
  }).join('');
  document.getElementById('howToUseTips').innerHTML = howTo.tips.map(t => `<li>${t}</li>`).join('');
  document.getElementById('howToUseFeedback').innerHTML =
    `${howTo.feedback.text} <a href="${howTo.feedback.linkHref}">${howTo.feedback.linkText}</a>`;

  // RESEARCH
  document.getElementById('researchLabel').textContent = data.research.sectionLabel;
  document.getElementById('researchHeading').textContent = data.research.heading;
  document.getElementById('researchIntro').innerHTML = data.research.intro;

  const aims = data.research.aims;
  document.getElementById('aimsRow').innerHTML = aims.map((aim, i) => {
    const cardHtml = `
      <div class="aim-card ${aim.colorClass}" data-fade data-delay="${i + 1}">
        <div class="aim-num">${aim.num}</div>
        <h3>${aim.title}</h3>
        <p>${aim.body}</p>
      </div>`;
    const arrowHtml = i < aims.length - 1
      ? `<div class="aim-arrow" data-fade data-delay="${i + 2}">${icon('i-arrow-right')}</div>` : '';
    return cardHtml + arrowHtml;
  }).join('');

  document.getElementById('quotesHeading').textContent = data.research.quotesHeading;
  document.querySelector('[data-carousel="research"] .carousel-track').innerHTML = data.research.quotes.map(q => `
    <div class="carousel-slide">
      <p class="slide-quote">"${q.text}"</p>
      <footer class="slide-footer">
        <span class="slide-cite">${q.cite}</span>
        <span class="quote-domain">${q.domain}</span>
      </footer>
    </div>`).join('');

  // TEAM
  document.getElementById('teamLabel').textContent = data.team.sectionLabel;
  document.getElementById('teamHeading').textContent = data.team.heading;
  document.getElementById('teamIntro').textContent = data.team.intro;
  document.getElementById('teamCards').innerHTML = data.team.members.map((m, i) => `
    <div class="team-card" data-fade data-delay="${i + 1}">
      <div class="team-logo ${m.logoClass}">${m.logoLine1}${m.logoLine2 ? `<br/><span>${m.logoLine2}</span>` : ''}</div>
      <h3>${m.title}</h3>
      <p>${m.body}</p>
      <div class="funding-tag">${m.fundingTag}</div>
    </div>`).join('');

  // FOOTER
  document.getElementById('footerLeft').innerHTML =
    `<strong>${data.footer.orgName}</strong><span>${data.footer.subLine}</span>`;
  document.getElementById('footerRight').innerHTML = `<p>${data.footer.fundingText}</p>`;
}

// ── Ecosystem diagram ────────────────────────
function initEcosystem() {
  const svg     = document.getElementById('ecoSvg');
  const rings   = document.querySelectorAll('.eco-ring');
  const items   = document.querySelectorAll('.eco-legend-item');
  if (!svg) return;

  function activate(layer) {
    svg.classList.add('has-active');
    rings.forEach(r => r.classList.toggle('eco-active', r.dataset.layer === layer));
    items.forEach(i => i.classList.toggle('eco-active', i.dataset.layer === layer));
  }

  function deactivate() {
    svg.classList.remove('has-active');
    rings.forEach(r => r.classList.remove('eco-active'));
    items.forEach(i => i.classList.remove('eco-active'));
  }

  rings.forEach(ring => {
    ring.setAttribute('tabindex', '0');
    ring.setAttribute('role', 'button');
    ring.addEventListener('mouseenter', () => activate(ring.dataset.layer));
    ring.addEventListener('mouseleave', deactivate);
    ring.addEventListener('focus',      () => activate(ring.dataset.layer));
    ring.addEventListener('blur',       deactivate);
    ring.addEventListener('click',      () => {
      const already = ring.classList.contains('eco-active') && svg.classList.contains('has-active');
      already ? deactivate() : activate(ring.dataset.layer);
    });
  });

  items.forEach(item => {
    item.addEventListener('mouseenter', () => activate(item.dataset.layer));
    item.addEventListener('mouseleave', deactivate);
    item.addEventListener('click', () => {
      const already = item.classList.contains('eco-active');
      already ? deactivate() : activate(item.dataset.layer);
    });
  });
}

// ── Tab switching with fade ──────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      if (btn.classList.contains('active')) return;

      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const panels = document.querySelectorAll('.tab-panel');
      panels.forEach(p => {
        p.classList.remove('active', 'tab-entering');
        p.style.display = 'none';
      });

      const next = document.getElementById('tab-' + target);
      next.style.display = 'block';
      next.getBoundingClientRect();
      next.classList.add('active');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => next.classList.add('tab-entering'));
      });
    });
  });

  const firstPanel = document.querySelector('.tab-panel.active');
  if (firstPanel) {
    firstPanel.classList.add('tab-entering');
  }

  // Deep-link support: about.html#tab-schools (from the Planning Tool's "Explore More"
  // links) activates and scrolls to the matching tab.
  const hash = window.location.hash.replace('#', '');
  // Navigating Schools moved to its own page — keep old links working.
  if (hash === 'tab-schools') { window.location.replace('schools.html'); return; }
  if (hash.startsWith('tab-')) {
    const key = hash.replace('tab-', '');
    const targetBtn = document.querySelector(`.tab-btn[data-tab="${key}"]`);
    if (targetBtn) {
      targetBtn.click();
      document.getElementById('toolkit').scrollIntoView();
    }
  }
}

// ── Expandable roadmap phases ────────────────
function initRoadmapExpand() {
  document.querySelectorAll('.phase-expand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      const content  = btn.nextElementSibling;

      btn.setAttribute('aria-expanded', String(!expanded));
      content.hidden = expanded;
    });
  });
}

// ── Quote carousel ───────────────────────────
function initCarousel() {
  document.querySelectorAll('.carousel').forEach(initCarouselInstance);
}


function initCarouselInstance(carouselEl) {
  const track   = carouselEl.querySelector('.carousel-track');
  const slides  = carouselEl.querySelectorAll('.carousel-slide');
  const dotsEl  = carouselEl.querySelector('.carousel-dots');
  const prevBtn = carouselEl.querySelector('.carousel-prev');
  const nextBtn = carouselEl.querySelector('.carousel-next');

  if (!track || !slides.length) return;

  let current = 0;
  let timer;
  const total = slides.length;

  dotsEl.innerHTML = '';
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Quote ' + (i + 1));
    dot.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(dot);
  });

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsEl.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === current));
    resetTimer();
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  carouselEl.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 6000);
  }

  carouselEl.addEventListener('mouseenter', () => clearInterval(timer));
  carouselEl.addEventListener('mouseleave', resetTimer);

  resetTimer();
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
    initEcosystem();
    initTabs();
    initRoadmapExpand();
    initCarousel();
    initFadeObserver();
  });
