/* =============================================
   ABOUT OUR PARTNERSHIP — research model (Discover, Design, Build, Test),
   why the toolkit exists, toolkit FAQ, team
   ============================================= */

function icon(id, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}"><use href="#${id}"/></svg>`;
}

function linkAttrs(href) {
  // External sites and files (PDFs, images) open in a new tab so people don't lose their place.
  return /^https?:|\.(pdf|png|jpe?g|gif|webp)$/i.test(href) ? ` href="${href}" target="_blank" rel="noopener"` : ` href="${href}"`;
}

function render(data) {
  // PAGE HEADER + CLOSING CALL-TO-ACTION
  const page = data.aboutPage;
  document.getElementById('aboutPageLabel').textContent = page.sectionLabel;
  document.getElementById('aboutPageHeading').textContent = page.heading;
  document.getElementById('aboutPageIntro').textContent = page.intro;

  // Photo beside the header
  const photo = page.photo;
  const photoEl = document.getElementById('aboutPhoto');
  if (photo && photo.src) {
    photoEl.innerHTML = `<img src="${photo.src}" alt="${photo.alt || ''}" />${photo.caption ? `<figcaption>${photo.caption}</figcaption>` : ''}`;
  } else photoEl.hidden = true;

  // In the news (same link as on the home page; edited under Home → Hero)
  const news = data.hero && data.hero.news;
  const newsEl = document.getElementById('aboutNews');
  if (news && news.href) {
    newsEl.innerHTML = `${icon('ic-message', 'icon-sm')}<span>${news.text}</span> <a${linkAttrs(news.href)}>${news.linkText}</a>${news.source ? `<span class="hero-news-source">${news.source}</span>` : ''}`;
  } else newsEl.hidden = true;
  document.getElementById('exploreHeading').textContent = page.explore.heading;
  document.getElementById('exploreBody').textContent = page.explore.body;
  document.getElementById('exploreActions').innerHTML = `
    <a class="btn btn-primary" href="${page.explore.primaryHref}">${page.explore.primaryText}</a>
    <a class="btn btn-outline" href="${page.explore.secondaryHref}">${page.explore.secondaryText}</a>`;

  // RESEARCH MODEL
  document.getElementById('researchLabel').textContent = data.research.sectionLabel;
  document.getElementById('researchHeading').textContent = data.research.heading;
  document.getElementById('researchIntro').innerHTML = data.research.intro;

  const aims = data.research.aims;
  document.getElementById('aimsRow').innerHTML = aims.map((aim, i) => {
    const cardHtml = `
      <div class="aim-card ${aim.colorClass}" data-fade data-delay="${i + 1}">
        <div class="aim-top"><div class="aim-num">${aim.num}</div>${icon(['ic-search', 'ic-edit', 'ic-check-circle'][i] || 'ic-check-circle', 'aim-icon')}</div>
        <h3>${aim.title}</h3>
        <p>${aim.body}</p>
      </div>`;
    const arrowHtml = i < aims.length - 1
      ? `<div class="aim-arrow" data-fade data-delay="${i + 2}">${icon('i-arrow-right')}</div>` : '';
    return cardHtml + arrowHtml;
  }).join('');

  // Discover group outcomes PDF (same link as on the home page; edited under Home → Hero)
  const outcomes = data.hero && data.hero.discoverOutcomes;
  const outcomesEl = document.getElementById('aboutOutcomes');
  if (outcomes) {
    outcomesEl.innerHTML = `${icon('ic-file-text', 'icon-sm')}<span>${outcomes.text}</span> ` + (outcomes.pdf
      ? `<a${linkAttrs(outcomes.pdf)}>${outcomes.linkText}</a>`
      : `<span class="hero-outcomes-pending">${outcomes.linkText} <em>${outcomes.pendingNote || 'coming soon'}</em></span>`);
  } else outcomesEl.hidden = true;

  document.getElementById('quotesHeading').textContent = data.research.quotesHeading;
  document.querySelector('[data-carousel="research"] .carousel-track').innerHTML = data.research.quotes.map(q => `
    <div class="carousel-slide">
      <p class="slide-quote">"${q.text}"</p>
      <footer class="slide-footer">
        <span class="slide-cite">${q.cite}</span>
        <span class="quote-domain">${q.domain}</span>
      </footer>
    </div>`).join('');

  // WHY IT EXISTS
  document.getElementById('whyLabel').textContent = data.why.sectionLabel;
  document.getElementById('whyHeading').textContent = data.why.heading;
  document.getElementById('whyGrid').innerHTML = data.why.cards.map((card, i) => `
    <div class="why-card" data-fade data-delay="${i + 1}">
      <div class="why-icon ${card.colorClass}">${icon(card.icon)}</div>
      <p><strong>${card.lead}</strong> ${card.body} <em>${card.citation}</em>.</p>
    </div>`).join('');
  document.getElementById('whyPullQuote').innerHTML =
    `"${data.why.pullQuote.text}"<cite>— ${data.why.pullQuote.cite}</cite>`;

  // QUESTIONS — the FAQ copy, unchanged, as expandable sections. Its "why"
  // question is the section just above, so it isn't repeated; the original
  // numbers ("3. How Was…") are dropped so the list doesn't skip a number.
  const faq = data.toolkitFaq;
  document.getElementById('faqLabel').textContent = data.faqSection.sectionLabel;
  document.getElementById('faqHeading').textContent = data.faqSection.heading;
  const faqItem = (heading, body, open, ic) => `
    <details class="faq-item"${open ? ' open' : ''}>
      <summary><span class="faq-q">${ic ? icon(ic, 'icon-sm') : ''}<span>${heading.replace(/^\s*\d+\.\s*/, '')}</span></span></summary>
      <div class="faq-item-body">${body}</div>
    </details>`;
  document.getElementById('faqAccordion').innerHTML = [
    faqItem(faq.goal.heading, faq.goal.paragraphs.map(p => `<p>${p}</p>`).join(''), true, 'ic-target'),
    faqItem(faq.how.heading, `<p>${faq.how.intro}</p>` + faq.how.pairs.map(pair => `
      <div class="faq-pair">
        <p class="faq-concern"><strong>Therapist concern:</strong> ${pair.concern}</p>
        <p class="faq-solution"><strong>Toolkit solution:</strong> ${pair.solution}</p>
      </div>`).join(''), false, 'ic-users'),
    faqItem(faq.includes.heading, faq.includes.items.map(it => `
      <div class="faq-includes-item">
        <span class="faq-letter">${it.letter}.</span>
        <p><strong>${it.title}:</strong> ${it.body}</p>
      </div>`).join(''), false, 'ic-layers'),
    faqItem(faq.useIt.heading, `<p>${faq.useIt.intro}</p>` +
      faq.useIt.guidance.map(g => `<p><strong>${g.title}</strong> ${g.body}</p>`).join('') +
      `<ul class="how-to-use-tips">${faq.useIt.tips.map(t => `<li>${t}</li>`).join('')}</ul>` +
      `<p>${faq.useIt.closing.pre} <a href="${faq.useIt.closing.linkHref}">${faq.useIt.closing.linkText}</a> ${faq.useIt.closing.post}</p>`, false, 'ic-compass'),
  ].join('');

  // TEAM
  document.getElementById('teamLabel').textContent = data.team.sectionLabel;
  document.getElementById('teamHeading').textContent = data.team.heading;
  document.getElementById('teamIntro').textContent = data.team.intro;
  document.getElementById('teamCards').innerHTML = data.team.members.map((m, i) => `
    <div class="team-card" data-fade data-delay="${i + 1}">
      ${m.logo
        ? `<div class="team-logo-img"><img src="${m.logo}" alt="${m.title} logo" /></div>`
        : `<div class="team-logo ${m.logoClass}">${m.logoLine1}${m.logoLine2 ? `<br/><span>${m.logoLine2}</span>` : ''}</div>`}
      <h3>${m.title}</h3>
      <p>${m.body}</p>
      <div class="funding-tag">${m.fundingTag}</div>
    </div>`).join('');

  // FOOTER
  document.getElementById('footerLeft').innerHTML =
    `<strong>${data.footer.orgName}</strong><span>${data.footer.subLine}</span>`;
  document.getElementById('footerRight').innerHTML = `<p>${data.footer.fundingText}</p>`;
}

// ── Old deep links ───────────────────────────
// Sections that moved off this page: the Treatment Roadmap and ecosystem now
// live on the Treatment Planning Tool page, and the schools tab has its own page.
function redirectOldLinks() {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'tab-schools') { window.location.replace('schools.html'); return true; }
  if (['tab-roadmap', 'toolkit', 'howToUse', 'about'].includes(hash)) { window.location.replace('planning-tool.html#roadmap'); return true; }
  return false;
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
if (!redirectOldLinks()) {
  loadSiteContent()
    .then(data => {
      render(data);
      initCarousel();
      initFadeObserver();
    });
}
