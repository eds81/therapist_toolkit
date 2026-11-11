/* =============================================
   COMMUNITY RESOURCES — searchable list of local referrals + map
   (data: content/community-resources.json, editable in the CMS)
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


  referralMarkersLayer = L.layerGroup().addTo(referralMap);
}

// ── Community Resources — searchable list + map ─────────────
// Data: content/community-resources.json → communityResources.items (CMS:
// Community Resources). Search and the section filter narrow the list; the
// map shows a pin for every listed resource that has coordinates.
const crState = { data: null, items: [], section: 'all', query: '', markers: {}, activeId: null };

function esc(str) {
  return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Phone text can hold several numbers ("Boulder: (303) 579-4404; Longmont: …")
// or a short code like 988 — every number becomes a tap-to-call link.
function phoneHtml(text) {
  return esc(text).replace(/(\(?\b\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}\b|\b988\b)/g, m => {
    const digits = m.replace(/\D/g, '');
    return `<a href="tel:${digits}">${m}</a>`;
  });
}
// Web addresses inside referral text become links.
function linkify(text) {
  return esc(text).replace(/https?:\/\/[^\s<]+[^\s<.,)]/g, u => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>`);
}
const hostOf = url => url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];

function sectionLabel(key) {
  const s = crState.data.communityResources.sections.find(x => x.key === key);
  return s ? s.label : '';
}

function matchesQuery(item, q) {
  if (!q) return true;
  const hay = [item.name, item.category, item.description, item.eligibility, item.address, item.languages, item.notes, item.cost, sectionLabel(item.section)]
    .join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(word => hay.includes(word));
}

function visibleItems() {
  return crState.items.filter(i => (crState.section === 'all' || i.section === crState.section) && matchesQuery(i, crState.query));
}

function resourceCardHtml(item) {
  const L = crState.data.communityResources.labels;
  const row = (label, value, html) => value ? `<div class="cr-detail"><dt>${label}</dt><dd>${html || esc(value)}</dd></div>` : '';
  const details = [
    row(L.eligibility, item.eligibility), row(L.cost, item.cost), row(L.payment, item.payment),
    row(L.referral, item.referral, linkify(item.referral)), row(L.languages, item.languages), row(L.notes, item.notes),
    row(L.verified, item.verified),
  ].join('');
  const contact = [
    item.phone ? `<span class="cr-contact cr-phone">${icon('i-phone', 'icon-xs')}<span>${phoneHtml(item.phone)}</span></span>` : '',
    item.website ? `<a class="cr-contact" href="${esc(item.website)}" target="_blank" rel="noopener">${icon('i-globe', 'icon-xs')}<span>${esc(hostOf(item.website))}</span></a>` : '',
    item.email ? `<a class="cr-contact" href="mailto:${esc(item.email)}">${icon('i-mail', 'icon-xs')}<span>${esc(item.email)}</span></a>` : '',
  ].join('');
  const hasPin = typeof item.lat === 'number';
  return `
    <article class="cr-card${crState.activeId === item.id ? ' is-active' : ''}" id="cr-${item.id}" data-id="${item.id}">
      <div class="cr-card-top">
        <span class="cr-section-tag cr-section-${item.section}">${esc(sectionLabel(item.section))}</span>
        ${item.riseVetted ? `<span class="cr-vetted">${icon('i-check', 'icon-xs')}${esc(L.vetted)}</span>` : ''}
      </div>
      <h3>${esc(item.name)}</h3>
      ${item.category ? `<p class="cr-category">${esc(item.category)}</p>` : ''}
      ${item.description ? `<p class="cr-desc">${esc(item.description)}</p>` : ''}
      ${contact ? `<div class="cr-contacts">${contact}</div>` : ''}
      ${item.address ? `<p class="cr-address">${icon('i-map-pin', 'icon-xs')}<span>${esc(item.address)}</span></p>` : ''}
      <div class="cr-card-actions">
        ${details ? `<details class="cr-more"><summary>${esc(L.details)}</summary><dl>${details}</dl></details>` : ''}
        ${hasPin ? `<button type="button" class="cr-map-btn" data-id="${item.id}">${esc(L.showOnMap)}</button>` : ''}
      </div>
    </article>`;
}

function renderSectionChips() {
  const rp = crState.data.referralPage;
  const sections = crState.data.communityResources.sections;
  const count = key => crState.items.filter(i => (key === 'all' || i.section === key) && matchesQuery(i, crState.query)).length;
  document.getElementById('crSections').innerHTML = [{ key: 'all', label: rp.allLabel }].concat(sections).map(s => {
    const on = s.key === crState.section;
    return `<button type="button" class="cr-chip${on ? ' is-active' : ''}" data-section="${s.key}" aria-pressed="${on}">${esc(s.label)} <span>${count(s.key)}</span></button>`;
  }).join('');
  const current = sections.find(s => s.key === crState.section);
  const intro = document.getElementById('crSectionIntro');
  intro.textContent = current ? current.intro : '';
  intro.hidden = !current;
}

function renderResources() {
  const rp = crState.data.referralPage;
  const items = visibleItems();
  document.getElementById('crCount').textContent = `${items.length} ${items.length === 1 ? rp.countSingular : rp.countPlural}`;
  document.getElementById('referralResults').innerHTML = items.length
    ? items.map(resourceCardHtml).join('')
    : `<p class="cr-empty">${esc(rp.emptyText)}</p>`;
  renderReferralMarkers(items);
}

function render_all() {
  renderSectionChips();
  renderResources();
}

// Pins are drawn in CSS (.cr-pin) rather than Leaflet's default image
// marker, whose image path breaks when loaded from a CDN.
const CR_PIN = L.divIcon({ className: 'cr-pin', html: '<span></span>', iconSize: [22, 22], iconAnchor: [11, 22], popupAnchor: [0, -20] });

// One pin per listed resource with coordinates; the view fits the pins.
function renderReferralMarkers(items) {
  if (!referralMarkersLayer) return;
  referralMarkersLayer.clearLayers();
  crState.markers = {};
  const bounds = [];
  items.forEach(item => {
    if (typeof item.lat !== 'number' || typeof item.lng !== 'number') return;
    const marker = L.marker([item.lat, item.lng], { title: item.name, icon: CR_PIN, alt: item.name }).addTo(referralMarkersLayer)
      .bindPopup(`<strong>${esc(item.name)}</strong><br>${esc(item.address)}${item.phone ? `<br>${phoneHtml(item.phone)}` : ''}`);
    marker.on('click', () => highlightCard(item.id, true));
    crState.markers[item.id] = marker;
    bounds.push([item.lat, item.lng]);
  });
  if (bounds.length) referralMap.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
  else referralMap.setView(REFERRAL_DEFAULT_CENTER, REFERRAL_DEFAULT_ZOOM);
}

function highlightCard(id, scroll) {
  crState.activeId = id;
  document.querySelectorAll('.cr-card').forEach(c => c.classList.toggle('is-active', c.dataset.id === id));
  const card = document.getElementById('cr-' + id);
  if (card && scroll) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function initReferralSearch(data) {
  const input = document.getElementById('referralInput');
  const form = document.getElementById('referralForm');
  const update = () => { crState.query = input.value.trim(); render_all(); };
  input.addEventListener('input', update);
  form.addEventListener('submit', e => { e.preventDefault(); update(); document.getElementById('crResultsTop').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  document.getElementById('crSections').addEventListener('click', e => {
    const chip = e.target.closest('.cr-chip');
    if (!chip) return;
    crState.section = chip.dataset.section;
    render_all();
  });
  document.getElementById('referralResults').addEventListener('click', e => {
    const btn = e.target.closest('.cr-map-btn');
    if (!btn) return;
    const marker = crState.markers[btn.dataset.id];
    if (!marker) return;
    highlightCard(btn.dataset.id, false);
    referralMap.setView(marker.getLatLng(), 14);
    marker.openPopup();
    document.getElementById('referralMap').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  render_all();
}

function render(data) {
  const rp = data.referralPage;
  crState.data = data;
  crState.items = (data.communityResources && data.communityResources.items) || [];
  crState.items.forEach((item, i) => { if (!item.id) item.id = 'resource-' + i; });

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
loadSiteContent()
  .then(data => {
    render(data);
    initReferralSearch(data);
    initFadeObserver();
  });
