/* =============================================
   FIND A REFERRAL — search UI shell + dynamic map
   No real referral data yet: both the results list and the map stay
   empty until a vetted dataset/API is connected. See getReferralResults()
   and renderReferralMarkers() below for where that plugs in.
   ============================================= */

function icon(id, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}"><use href="#${id}"/></svg>`;
}

// Default map view — centered on Boulder, CO (Rise Against Suicide × CU Boulder)
// until real referral locations exist to fit the view to instead.
const REFERRAL_DEFAULT_CENTER = [40.0150, -105.2705];
const REFERRAL_DEFAULT_ZOOM = 11;

let referralMap = null;
let referralMarkersLayer = null;

function initReferralMap() {
  referralMap = L.map('referralMap', { scrollWheelZoom: false })
    .setView(REFERRAL_DEFAULT_CENTER, REFERRAL_DEFAULT_ZOOM);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
  }).addTo(referralMap);

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
  });

  referralMarkersLayer = L.layerGroup().addTo(referralMap);
}

// Plots whatever results came back. Each result is expected to eventually
// carry { lat, lng, title } once a real dataset exists — for now this is
// always called with an empty array, so the map just stays on its default
// view with no pins (never fabricated).
function renderReferralMarkers(results) {
  if (!referralMarkersLayer) return;
  referralMarkersLayer.clearLayers();
  if (!results.length) return;
  const bounds = [];
  results.forEach(r => {
    if (typeof r.lat !== 'number' || typeof r.lng !== 'number') return;
    L.marker([r.lat, r.lng]).addTo(referralMarkersLayer).bindPopup(r.title || '');
    bounds.push([r.lat, r.lng]);
  });
  if (bounds.length) referralMap.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
}

// ── Find a Referral — search state, logic, results, and data source kept
// separate so a real referral dataset/API can later replace
// getReferralResults() without touching the input handling or rendering. ──
const referralState = { status: 'idle' }; // idle | loading | done

// Data source placeholder — swap this for a real API/dataset later. It
// intentionally never returns fabricated facilities.
async function getReferralResults(query) {
  await new Promise(resolve => setTimeout(resolve, 450));
  return [];
}

function renderReferralResults(rp) {
  const el = document.getElementById('referralResults');
  if (referralState.status === 'idle') { el.innerHTML = ''; return; }
  if (referralState.status === 'loading') {
    el.innerHTML = `<p class="referral-status">${rp.loadingText}</p>`;
    return;
  }
  // status === 'done' — no dataset yet, so every search lands here.
  // Once real results exist, map them into result cards above this fallback.
  el.innerHTML = `
    <div class="referral-empty">
      <div class="referral-empty-icon" aria-hidden="true">${icon('i-help-circle')}</div>
      <p class="referral-empty-heading">${rp.comingSoonHeading}</p>
      <p class="referral-empty-body">${rp.comingSoonBody}</p>
    </div>`;
}

function initReferralSearch(data) {
  const rp = data.referralPage;
  const form = document.getElementById('referralForm');
  const input = document.getElementById('referralInput');
  const errorEl = document.getElementById('referralError');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) {
      errorEl.textContent = rp.noInputError;
      errorEl.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    errorEl.hidden = true;
    input.removeAttribute('aria-invalid');
    referralState.status = 'loading';
    renderReferralResults(rp);
    const results = await getReferralResults(query);
    referralState.status = 'done';
    renderReferralResults(rp);
    renderReferralMarkers(results);
  });
}

function render(data) {
  const rp = data.referralPage;

  document.getElementById('refLabel').textContent = rp.sectionLabel;
  document.getElementById('refHeading').textContent = rp.heading;
  document.getElementById('refIntro').textContent = rp.intro;
  document.getElementById('refDisclaimer').textContent = rp.disclaimer;

  document.getElementById('referralLabel').textContent = rp.label;
  document.getElementById('referralInput').placeholder = rp.placeholder;
  document.getElementById('referralSearchBtn').innerHTML = `${icon('i-search', 'icon-xs')}<span>${rp.buttonLabel}</span>`;

  document.getElementById('refResultsHeading').textContent = rp.resultsHeading;
  document.getElementById('refMapHeading').textContent = rp.mapHeading;
  document.getElementById('refMapCaption').textContent = rp.mapEmptyCaption;

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
initReferralMap();
fetch('content/site.json')
  .then(res => res.json())
  .then(data => {
    render(data);
    initReferralSearch(data);
    initFadeObserver();
  });
