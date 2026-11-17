/* =============================================
   CONSULTATION — "Talk to Someone" (contact options + need picker) and
   Peer Therapist One-on-One Support. Moved unchanged from the Self-Care &
   Support page; content is in content/consultation.json.
   ============================================= */

function icon(id, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}"><use href="#${id}"/></svg>`;
}

function render(data) {
  const consult = data.consult;
  const peers = data.peerTherapists;

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
  document.getElementById('scConsultNote').textContent = consult.prototypeNote;

  document.getElementById('scPeerHeading').textContent = peers.heading;
  document.getElementById('scPeerIntro').textContent = peers.intro;
  document.getElementById('scPeerNote').textContent = peers.prototypeNote;
  document.getElementById('scPeerGrid').innerHTML = peers.list.map(t => `
    <div class="peer-card">
      <div class="peer-avatar" aria-hidden="true">${icon('i-user')}</div>
      <span class="peer-tag">${icon('i-users', 'icon-xs')}One-on-One Peer Support</span>
      <h5>${t.name}</h5>
      <p class="peer-role">${t.role}</p>
      <p class="peer-bio">${t.bio}</p>
    </div>`).join('');

  // The password screen's text is shared with Self-Care & Support.
  const gate = data.selfCarePage.gate;
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
  initConsultNeedPicker(data.consult);
  // #peers (the "Or browse peer therapists" link, or an old Self-Care link)
  if (window.location.hash === '#peers') document.getElementById('peers').scrollIntoView();
});
