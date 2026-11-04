/* =============================================
   SELF-CARE AND SUPPORT PAGE
   ============================================= */

function icon(id, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}"><use href="#${id}"/></svg>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function render(data) {
  const sc = data.selfCarePage;

  document.getElementById('scLabel').textContent = sc.sectionLabel;
  document.getElementById('scHeading').textContent = sc.heading;
  document.getElementById('scIntro').textContent = sc.intro;

  const tabOrder = ['overview', 'why', 'wins', 'consult'];
  document.getElementById('scTabsNav').innerHTML = tabOrder.map((key, i) => `
    <button class="tab-btn${i === 0 ? ' active' : ''}" data-panel="panel-${key}">${sc.tabs[key]}</button>`).join('');

  document.getElementById('scConcern').innerHTML =
    `<span class="tab-concern-label">Therapist concern</span><p>${sc.concern}</p>`;
  document.getElementById('scQuote').innerHTML = `"${sc.quote.text}"<cite>— ${sc.quote.cite}</cite>`;

  document.getElementById('scItems').innerHTML = sc.items.map(it => `
    <div class="sc-item">
      <div class="sc-icon-wrap">${icon(it.icon)}</div>
      <h4>${it.title}</h4>
      <p>${it.body}</p>
    </div>`).join('');

  document.getElementById('scWhyIntro').textContent = sc.why.intro;
  document.getElementById('scWhyGrid').innerHTML = sc.why.cards.map((card, i) => `
    <div class="why-card" data-fade data-delay="${i + 1}">
      <div class="why-icon ${card.colorClass}">${icon(card.icon)}</div>
      <p><strong>${card.lead}</strong> ${card.body}${card.citation ? ` <em>${card.citation}</em>.` : ''}</p>
    </div>`).join('');

  document.getElementById('scTestimonialsHeading').textContent = sc.testimonialsHeading;
  document.getElementById('scTestimonialTrack').innerHTML = sc.testimonials.map(t => `
    <div class="carousel-slide">
      <p class="slide-quote">"${t.text}"</p>
      <footer class="slide-footer">
        <span class="slide-cite">${t.cite}</span>
        <span class="quote-domain">${t.theme}</span>
      </footer>
    </div>`).join('');

  document.getElementById('scWowIntro').textContent = sc.wallOfWins.intro;
  document.getElementById('scWowNoteText').textContent = sc.wallOfWins.prototypeNote;
  document.getElementById('wowNameInput').placeholder = sc.wallOfWins.nameFieldPlaceholder;
  document.getElementById('wowTextInput').placeholder = sc.wallOfWins.formPlaceholder;
  document.getElementById('wowSubmitBtn').textContent = sc.wallOfWins.submitLabel;

  document.getElementById('scConsultEyebrow').textContent = sc.consult.eyebrow;
  document.getElementById('scConsultHeading').textContent = sc.consult.heading;
  document.getElementById('scConsultIntro').textContent = sc.consult.intro;
  document.getElementById('scConsultNeedLabel').textContent = sc.consult.needPicker.label;
  document.getElementById('scConsultNeedPills').innerHTML = sc.consult.needPicker.options.map((opt, i) => `
    <button type="button" class="consult-need-pill" data-pill-index="${i}" aria-pressed="false">${opt.label}</button>`).join('');
  document.getElementById('scConsultGrid').innerHTML = sc.consult.cards.map(card => {
    const href = (card.schedulingUrl && card.schedulingUrl.trim()) ? card.schedulingUrl.trim() : card.mailto;
    const secondary = card.secondaryHref
      ? `<a class="consult-card-secondary" href="${card.secondaryHref}">${card.secondaryText}</a>`
      : `<span class="consult-card-secondary">${card.secondaryText}</span>`;
    return `
    <div class="consult-card" data-key="${card.key}">
      <span class="consult-card-badge">Best fit</span>
      <div class="consult-icon">${icon(card.icon)}</div>
      <h4 class="consult-card-title">${card.title}</h4>
      <p class="consult-card-subtitle">${card.subtitle}</p>
      <ul class="consult-card-bestfor">${card.bestFor.map(b => `<li>${b}</li>`).join('')}</ul>
      <dl class="consult-card-dl">
        <div class="consult-card-dl-row"><dt>Format</dt><dd>${card.format}</dd></div>
        <div class="consult-card-dl-row"><dt>Reply</dt><dd>${card.reply}</dd></div>
        <div class="consult-card-dl-row"><dt>Note</dt><dd>${card.note}</dd></div>
      </dl>
      <div class="consult-card-actions">
        <a class="btn btn-outline consult-card-btn" href="${href}">${card.buttonLabel}</a>
        ${secondary}
      </div>
    </div>`;
  }).join('');
  document.getElementById('scConsultNote').textContent = sc.consult.prototypeNote;

  document.getElementById('scGateHeading').textContent = sc.gate.heading;
  document.getElementById('scGateIntro').textContent = sc.gate.intro;
  document.getElementById('scGateLabel').textContent = sc.gate.label;
  document.getElementById('scGateSubmit').textContent = sc.gate.buttonLabel;
  document.getElementById('scGateError').textContent = sc.gate.errorText;

  document.getElementById('scMindfulnessHeading').textContent = sc.mindfulness.heading;
  document.getElementById('scMindfulnessIntro').textContent = sc.mindfulness.intro;
  document.getElementById('mindfulPre').innerHTML = mindfulCardHtml(sc.mindfulness.pre, 'pre');
  document.getElementById('mindfulPost').innerHTML = mindfulCardHtml(sc.mindfulness.post, 'post');

  document.getElementById('scPeerHeading').textContent = sc.peerTherapists.heading;
  document.getElementById('scPeerIntro').textContent = sc.peerTherapists.intro;
  document.getElementById('scPeerNote').textContent = sc.peerTherapists.prototypeNote;
  document.getElementById('scPeerGrid').innerHTML = sc.peerTherapists.list.map(t => `
    <div class="peer-card">
      <div class="peer-avatar" aria-hidden="true">${icon('i-user')}</div>
      <span class="peer-tag">${icon('i-users', 'icon-xs')}One-on-One Peer Support</span>
      <h5>${t.name}</h5>
      <p class="peer-role">${t.role}</p>
      <p class="peer-bio">${t.bio}</p>
    </div>`).join('');

  document.getElementById('footerLeft').innerHTML =
    `<strong>${data.footer.orgName}</strong><span>${data.footer.subLine}</span>`;
  document.getElementById('footerRight').innerHTML = `<p>${data.footer.fundingText}</p>`;
}

// ── Pre/Post-Session Mindfulness — same interaction pattern (expand to
// reveal a paced breathing cycle + short prompts), different accent/copy ──
function mindfulCardHtml(config, variant) {
  return `
    <div class="mindful-card-head">
      <div class="mindful-icon">${icon(config.icon)}</div>
      <div>
        <h5>${config.title}</h5>
        <p class="mindful-subtitle">${config.subtitle}</p>
      </div>
    </div>
    <p class="mindful-intro">${config.intro}</p>
    <button type="button" class="btn btn-outline mindful-start-btn" data-mindful-start="${variant}">${config.startLabel}</button>
    <div class="mindful-practice" data-mindful-practice="${variant}" hidden>
      <div class="mindful-breath" data-mindful-breath="${variant}">
        <div class="mindful-breath-circle">
          <span class="mindful-breath-label" data-mindful-breathlabel="${variant}">Breathe in</span>
        </div>
      </div>
      <ul class="mindful-prompts">${config.prompts.map(p => `<li>${p}</li>`).join('')}</ul>
      <button type="button" class="btn btn-primary mindful-stop-btn" data-mindful-stop="${variant}">${config.stopLabel}</button>
    </div>`;
}

function initMindfulness() {
  const BREATH_PHASES = [
    { label: 'Breathe in', ms: 4000 },
    { label: 'Hold', ms: 2000 },
    { label: 'Breathe out', ms: 4000 }
  ];
  const timers = {};

  function startPractice(variant) {
    const practice = document.querySelector(`[data-mindful-practice="${variant}"]`);
    const circle = document.querySelector(`[data-mindful-breath="${variant}"]`);
    const label = document.querySelector(`[data-mindful-breathlabel="${variant}"]`);
    if (!practice) return;
    practice.hidden = false;
    circle.classList.add('is-breathing');
    let phaseIndex = 0;
    (function cyclePhase() {
      const phase = BREATH_PHASES[phaseIndex % BREATH_PHASES.length];
      label.textContent = phase.label;
      timers[variant] = setTimeout(() => { phaseIndex++; cyclePhase(); }, phase.ms);
    })();
    practice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function stopPractice(variant) {
    const practice = document.querySelector(`[data-mindful-practice="${variant}"]`);
    const circle = document.querySelector(`[data-mindful-breath="${variant}"]`);
    clearTimeout(timers[variant]);
    if (practice) practice.hidden = true;
    if (circle) circle.classList.remove('is-breathing');
  }

  document.querySelectorAll('[data-mindful-start]').forEach(btn => {
    btn.addEventListener('click', () => startPractice(btn.dataset.mindfulStart));
  });
  document.querySelectorAll('[data-mindful-stop]').forEach(btn => {
    btn.addEventListener('click', () => stopPractice(btn.dataset.mindfulStop));
  });
}

// ── Access gate — simple client-side UX gate for this prototype, not
// secure authentication. Unlock state only lives for this browser tab. ──
const SC_GATE_PASSWORD = '2026';
const SC_GATE_SESSION_KEY = 'scSelfCareUnlocked';

function initSelfCareGate() {
  const backdrop = document.getElementById('scGateBackdrop');
  const mainContent = document.getElementById('scMainContent');
  const form = document.getElementById('scGateForm');
  const input = document.getElementById('scGatePassword');
  const errorEl = document.getElementById('scGateError');
  const closeBtn = document.getElementById('scGateClose');

  function unlock() {
    try { sessionStorage.setItem(SC_GATE_SESSION_KEY, '1'); } catch (e) { /* ignore */ }
    backdrop.hidden = true;
    mainContent.hidden = false;
    document.body.classList.remove('scgate-open');
  }

  let alreadyUnlocked = false;
  try { alreadyUnlocked = sessionStorage.getItem(SC_GATE_SESSION_KEY) === '1'; } catch (e) { /* ignore */ }

  if (alreadyUnlocked) {
    unlock();
  } else {
    document.body.classList.add('scgate-open');
    requestAnimationFrame(() => input.focus());
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (input.value === SC_GATE_PASSWORD) {
      errorEl.hidden = true;
      input.classList.remove('has-error');
      unlock();
    } else {
      errorEl.hidden = false;
      input.classList.add('has-error');
      input.setAttribute('aria-invalid', 'true');
      input.select();
      input.focus();
    }
  });

  // "X" out of the password screen entirely rather than dismiss it in
  // place — there's no unlocked content to fall back to, so leave the page.
  closeBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}

// Gate doesn't depend on fetched content, so it runs immediately — the
// page is locked from the very first paint, not just after data loads.
initSelfCareGate();

// ── Carousel ──────────────────────────────────
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

function initCarousel() {
  document.querySelectorAll('.carousel').forEach(initCarouselInstance);
}

// ── Wall of Wins (visual prototype only — nothing persists) ─
let wowPosts = [];

function renderWowGrid() {
  document.getElementById('wowGrid').innerHTML = wowPosts.map(p => `
    <div class="wow-card${p.isNew ? ' wow-card-new' : ''}">
      <p>${escapeHtml(p.text)}</p>
      <span class="wow-author">— ${escapeHtml(p.author)}</span>
    </div>`).join('');
}

function initWallOfWins(config) {
  wowPosts = config.seedPosts.map(p => ({ ...p, isNew: false }));
  renderWowGrid();

  const nameInput = document.getElementById('wowNameInput');
  const textInput = document.getElementById('wowTextInput');
  const submitBtn = document.getElementById('wowSubmitBtn');

  function submit() {
    const text = textInput.value.trim();
    if (!text) return;
    const author = nameInput.value.trim() || config.defaultAuthor;
    wowPosts.unshift({ author, text, isNew: true });
    renderWowGrid();
    textInput.value = '';
    nameInput.value = '';
    textInput.focus();
  }

  submitBtn.addEventListener('click', submit);
  textInput.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
}

// ── Talk to Someone — need picker ─────────────
// Highlights whichever contact card best matches the pill the user picked.
// The "active" pill is tracked by its own index (not by matchKey), since
// two pills can point at the same card — clicking the already-active pill
// clears the selection back to the neutral state.
function initConsultNeedPicker(consult) {
  const pills = Array.from(document.querySelectorAll('.consult-need-pill'));
  const cards = Array.from(document.querySelectorAll('.consult-card'));
  const announceEl = document.getElementById('scConsultAnnounce');
  if (!pills.length || !cards.length) return;

  let activeIndex = null;

  function update() {
    const activeKey = activeIndex != null ? consult.needPicker.options[activeIndex].matchKey : null;
    pills.forEach((pill, i) => pill.setAttribute('aria-pressed', String(i === activeIndex)));
    cards.forEach(card => {
      const isMatch = !!activeKey && card.dataset.key === activeKey;
      card.classList.toggle('is-active', isMatch);
      card.classList.toggle('is-dimmed', !!activeKey && !isMatch);
    });
    if (activeKey) {
      const card = consult.cards.find(c => c.key === activeKey);
      announceEl.textContent = card ? `Best fit: ${card.title}` : '';
    } else {
      announceEl.textContent = '';
    }
  }

  pills.forEach((pill, i) => {
    pill.addEventListener('click', () => {
      activeIndex = activeIndex === i ? null : i;
      update();
    });
  });
}

// ── Tab switching ─────────────────────────────
function initTabs() {
  document.querySelectorAll('#scTabsNav .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      document.querySelectorAll('#scTabsNav .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.remove('active', 'tab-entering');
        p.style.display = 'none';
      });

      const next = document.getElementById(btn.dataset.panel);
      next.style.display = 'block';
      next.getBoundingClientRect();
      next.classList.add('active');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => next.classList.add('tab-entering'));
      });
    });
  });

  const firstPanel = document.querySelector('.tab-panel.active');
  if (firstPanel) firstPanel.classList.add('tab-entering');
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
    initTabs();
    initCarousel();
    initWallOfWins(data.selfCarePage.wallOfWins);
    initConsultNeedPicker(data.selfCarePage.consult);
    initMindfulness();
    initFadeObserver();
  });
