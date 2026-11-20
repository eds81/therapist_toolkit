/* =============================================
   CONSULTATION — "Talk to Someone" (contact options + need picker) and
   Peer Therapist One-on-One Support. Moved unchanged from the Self-Care &
   Support page; content is in content/consultation.json.
   ============================================= */

function icon(id, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}"><use href="#${id}"/></svg>`;
}

// A photo, or a labeled placeholder until one is added in the CMS.
function photoHtml(src, alt, placeholder, cls) {
  return src
    ? `<div class="${cls}"><img src="${src}" alt="${alt}" /></div>`
    : `<div class="${cls} is-placeholder" role="img" aria-label="${placeholder}">${icon('i-user')}<span>${placeholder}</span></div>`;
}

function render(data) {
  const consult = data.consult;
  const peers = data.peerTherapists;
  const page = data.consultationPage || {};
  const photoText = page.photoPlaceholder || 'Photo coming soon';

  document.getElementById('scConsultEyebrow').textContent = consult.eyebrow;
  document.getElementById('scConsultHeading').textContent = consult.heading;
  document.getElementById('scConsultIntro').textContent = consult.intro;
  document.getElementById('scConsultNeedLabel').textContent = consult.needPicker.label;
  document.getElementById('scConsultNeedPills').innerHTML = consult.needPicker.options.map((opt, i) => `
    <button type="button" class="consult-need-pill" data-pill-index="${i}" aria-pressed="false">${opt.label}</button>`).join('');
  document.getElementById('scConsultGrid').innerHTML = consult.cards.map(card => {
    const href = (card.schedulingUrl && card.schedulingUrl.trim()) ? card.schedulingUrl.trim() : card.mailto;
    const secondary = card.secondaryHref
      ? `<a class="consult-card-secondary" href="${card.secondaryHref}">${card.secondaryText}</a>`
      : `<span class="consult-card-secondary">${card.secondaryText}</span>`;
    return `
    <div class="consult-card" data-key="${card.key}">
      <span class="consult-card-badge">Best fit</span>
      ${photoHtml(card.photo, card.title, photoText, 'consult-photo')}
      <h4 class="consult-card-title">${card.title}</h4>
      <p class="consult-card-subtitle">${card.subtitle}</p>
      <ul class="consult-card-bestfor">${card.bestFor.map(b => `<li>${b}</li>`).join('')}</ul>
      <div class="consult-card-actions">
        <a class="btn btn-outline consult-card-btn" href="${href}">${card.buttonLabel}</a>
        ${secondary}
      </div>
    </div>`;
  }).join('');
  document.getElementById('scConsultNote').textContent = consult.prototypeNote;

  document.getElementById('scPeerHeading').textContent = peers.heading;
  document.getElementById('scPeerIntro').textContent = peers.intro;
  document.getElementById('scPeerNote').textContent = peers.prototypeNote;
  document.getElementById('scPeerGrid').innerHTML = peers.list.map(t => `
    <div class="peer-card">
      ${photoHtml(t.photo, t.name, photoText, 'peer-photo')}
      <span class="peer-tag">${icon('i-users', 'icon-xs')}One-on-One Peer Support</span>
      <h5>${t.name}</h5>
      <p class="peer-role">${t.role}</p>
      <p class="peer-bio">${t.bio}</p>
    </div>`).join('');

  // This page's own password-screen text (falls back to Self-Care's).
  const gate = page.gate || data.selfCarePage.gate;
  document.getElementById('scGateHeading').textContent = gate.heading;
  document.getElementById('scGateIntro').textContent = gate.intro;
  document.getElementById('scGateLabel').textContent = gate.label;
  document.getElementById('scGateSubmit').textContent = gate.buttonLabel;
  document.getElementById('scGateError').textContent = gate.errorText;

  document.getElementById('footerLeft').innerHTML =
    `<strong>${data.footer.orgName}</strong><span>${data.footer.subLine}</span>`;
  document.getElementById('footerRight').innerHTML = `<p>${data.footer.fundingText}</p>`;
}

// ── Access gate — the same simple client-side UX gate as Self-Care & Support
// (not secure authentication), and the same unlock key: unlocking either
// page unlocks both for this browser tab. ──
const SC_GATE_PASSWORD = '2026';
const SC_GATE_SESSION_KEY = 'scSelfCareUnlocked';

function initGate() {
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

  closeBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}

initGate();

// ── Talk to Someone — choosing a contact ─────
// • Hovering a card highlights it (CSS). Hovering the peer therapist card
//   also shows the Peer Therapist One-on-One Support profiles below; they
//   stay open while you move down to them, until another card is hovered or
//   another choice is made.
// • Clicking a card selects it. A "What do you need?" pill selects its
//   best-fit card — only then does the card show the "Best fit" badge.
// • Clicking the selected card (or the active pill) again clears it.
function initConsultPicker(consult, peers) {
  const pills = Array.from(document.querySelectorAll('.consult-need-pill'));
  const cards = Array.from(document.querySelectorAll('.consult-card'));
  const announceEl = document.getElementById('scConsultAnnounce');
  const peerSection = document.getElementById('peers');
  const peerKey = (peers && peers.showWithCard) || 'peer';
  if (!cards.length) return;

  let activePill = null; // index of the pressed pill, if a pill made the choice
  let activeKey = null;  // the selected card's key
  let hoverKey = null;   // the last card hovered (sticky — see above)

  function update() {
    pills.forEach((pill, i) => pill.setAttribute('aria-pressed', String(i === activePill)));
    cards.forEach(card => {
      const isMatch = !!activeKey && card.dataset.key === activeKey;
      card.classList.toggle('is-active', isMatch);
      card.classList.toggle('is-best-fit', isMatch && activePill !== null);
      card.classList.toggle('is-dimmed', !!activeKey && !isMatch);
      card.setAttribute('aria-current', isMatch ? 'true' : 'false');
    });
    const showPeers = activeKey === peerKey || (hoverKey === peerKey && (activeKey === null || activeKey === peerKey));
    if (peerSection) peerSection.hidden = !showPeers;
  }
  function announce() {
    const card = activeKey && consult.cards.find(c => c.key === activeKey);
    const showPeers = peerSection && !peerSection.hidden;
    announceEl.textContent = card ? `${activePill !== null ? 'Best fit' : 'Selected'}: ${card.title}${showPeers ? '. Peer therapist profiles are shown below.' : ''}` : '';
  }

  pills.forEach((pill, i) => {
    pill.addEventListener('click', () => {
      if (activePill === i) { activePill = null; activeKey = null; }
      else { activePill = i; activeKey = consult.needPicker.options[i].matchKey; }
      hoverKey = null;
      update(); announce();
    });
  });

  cards.forEach(card => {
    card.addEventListener('click', e => {
      // links and buttons inside the card keep doing their own thing
      if (e.target.closest('a, button')) return;
      activePill = null;
      activeKey = activeKey === card.dataset.key ? null : card.dataset.key;
      update(); announce();
    });
    card.addEventListener('mouseenter', () => { hoverKey = card.dataset.key; update(); });
  });

  // "Click to browse peer therapists ↓" (and an old #peers link): select the peer card and show them
  function revealPeers(scroll) {
    activePill = null; activeKey = peerKey; update(); announce();
    if (scroll && peerSection) peerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.querySelectorAll('.consult-card-secondary[href="#peers"]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); revealPeers(true); });
  });
  if (window.location.hash === '#peers') revealPeers(true);
  update();
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
  initConsultPicker(data.consult, data.peerTherapists);
});
