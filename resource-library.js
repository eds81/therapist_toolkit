/* =============================================
   RESOURCE LIBRARY — search, filter, detail view
   ============================================= */

function icon(id, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}"><use href="#${id}"/></svg>`;
}

const TYPE_ICON = {
  'Assessment Tool': 'i-clipboard',
  'Worksheet': 'i-file-text',
  'Handout': 'i-book',
  'Referral List': 'i-map-pin',
  'Tip Sheet': 'i-share-2',
  'Evidence-Based Practice': 'i-star'
};

// Evidence-based practices are the strategies offered on the Planning Tool's
// Select Interventions step; its "Learn more" link opens one here via
// ?practice=<title>. A practice only shows in the grid once it has a
// description, but the link still opens its detail view either way.
const PRACTICE_TYPE = 'Evidence-Based Practice';
const isListed = item => item.type !== PRACTICE_TYPE || Boolean(item.description);

const AUDIENCE_ICON = {
  Clinician: 'i-clipboard',
  Youth: 'i-star',
  Family: 'i-family',
  Community: 'i-map-pin',
  Schools: 'i-school'
};

const reslibState = {
  data: null,
  search: '',
  audience: new Set(),
  type: new Set(),
  theme: new Set()
};

function matchesFilters(item) {
  const q = reslibState.search.trim().toLowerCase();
  if (q && !(`${item.title} ${item.description}`.toLowerCase().includes(q))) return false;
  if (reslibState.audience.size && !item.audience.some(a => reslibState.audience.has(a))) return false;
  if (reslibState.type.size && !reslibState.type.has(item.type)) return false;
  if (reslibState.theme.size && !item.theme.some(t => reslibState.theme.has(t))) return false;
  return true;
}

function cardHtml(item) {
  return `
    <button type="button" class="reslib-card" data-id="${item.id}">
      <div class="reslib-card-icon">${icon(TYPE_ICON[item.type] || 'i-file-text')}</div>
      <div class="reslib-card-body">
        <span class="reslib-card-type">${item.type}</span>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <div class="reslib-card-theme">
          ${item.theme.map(t => `<span class="reslib-theme-tag">${t}</span>`).join('')}
        </div>
        <div class="reslib-card-audience">
          ${item.audience.map(a => `<span class="reslib-audience-tag">${a}</span>`).join('')}
        </div>
      </div>
    </button>`;
}

function renderResults() {
  const items = reslibState.data.items.filter(isListed).filter(matchesFilters);
  const grid = document.getElementById('reslibGrid');
  const empty = document.getElementById('reslibEmpty');
  const count = document.getElementById('reslibCount');

  count.textContent = `${items.length} resource${items.length === 1 ? '' : 's'}`;
  grid.innerHTML = items.map(cardHtml).join('');
  empty.hidden = items.length > 0;

  grid.querySelectorAll('.reslib-card').forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
  });
}

function renderChips(containerId, options, activeSet, onToggle) {
  const container = document.getElementById(containerId);
  container.innerHTML = options.map(opt => `
    <button type="button" class="reslib-chip${activeSet.has(opt) ? ' active' : ''}" data-value="${opt}">${opt}</button>`).join('');
  container.querySelectorAll('.reslib-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const val = chip.dataset.value;
      activeSet.has(val) ? activeSet.delete(val) : activeSet.add(val);
      chip.classList.toggle('active');
      renderResults();
    });
  });
}

function findByTitle(title) {
  const t = title.trim().toLowerCase();
  return reslibState.data.items.find(i => i.title.trim().toLowerCase() === t);
}

function relatedResourcesHtml(item) {
  const related = (item.relatedResources || []).map(findByTitle).filter(Boolean);
  if (!related.length) return '';
  return `
    <h4>Resources</h4>
    <ul class="reslib-related">
      ${related.map(r => `<li><button type="button" class="reslib-related-link" data-id="${r.id}">${icon(TYPE_ICON[r.type] || 'i-file-text', 'icon-xs')}${r.title}<span>${r.type}</span></button></li>`).join('')}
    </ul>`;
}

// A practice's links, grouped the way the team's library sheet groups them.
// Links still waiting for a web address show as "link coming soon".
const LINK_GROUPS = [
  ['therapist', 'For therapists'],
  ['client', 'For clients & families'],
  ['research', 'Research'],
  ['other', 'More resources'],
];
function escHtml(str) {
  return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function practiceLinksHtml(item) {
  const links = Array.isArray(item.links) ? item.links.filter(l => l && l.label) : [];
  if (!links.length) return '';
  const groups = LINK_GROUPS.map(([key, heading]) => {
    const list = links.filter(l => (l.group || 'other') === key);
    if (!list.length) return '';
    return `
      <div class="reslib-link-group">
        <h5>${heading}</h5>
        <ul>${list.map(l => l.url
          ? `<li><a href="${escHtml(l.url)}"${/^https?:/.test(l.url) ? ' target="_blank" rel="noopener"' : ''}>${escHtml(l.label)}${icon('i-arrow-right', 'icon-xs')}</a></li>`
          : `<li><span class="reslib-link-pending">${escHtml(l.label)} <em>link coming soon</em></span></li>`).join('')}</ul>
      </div>`;
  }).join('');
  return `<h4>Resources</h4><div class="reslib-link-groups">${groups}</div>`;
}

function fileHtml(item) {
  if (item.fileUrl) return `<a class="btn btn-primary reslib-download" href="${item.fileUrl}" target="_blank" rel="noopener">${icon('i-download', 'icon-sm')} Download PDF</a>`;
  if (item.type === PRACTICE_TYPE) return '';
  return `<span class="reslib-coming-soon">${icon('i-file-text', 'icon-sm')} PDF coming soon</span>`;
}

function openDetail(idOrItem) {
  const item = typeof idOrItem === 'string' ? reslibState.data.items.find(i => i.id === idOrItem) : idOrItem;
  if (!item) return;
  const isPractice = item.type === PRACTICE_TYPE;

  document.getElementById('reslibModalBody').innerHTML = `
    <div class="reslib-modal-icon">${icon(TYPE_ICON[item.type] || 'i-file-text')}</div>
    <span class="reslib-card-type">${item.type}</span>
    <h2 id="reslibModalTitle">${item.title}</h2>
    <div class="reslib-card-theme">
      ${item.theme.map(t => `<span class="reslib-theme-tag">${t}</span>`).join('')}
    </div>
    <div class="reslib-card-audience">
      ${item.audience.map(a => `<span class="reslib-audience-tag">${icon(AUDIENCE_ICON[a] || 'i-star', 'icon-xs')}${a}</span>`).join('')}
    </div>

    <h4>Description</h4>
    <p>${item.description || (isPractice ? '<em>A full write-up for this practice is coming soon.</em>' : '')}</p>

    ${isPractice && item.details ? `<h4>About this practice</h4><p>${item.details}</p>` : ''}

    ${item.evidence ? `<h4>Why it works</h4><p>${item.evidence}</p>` : ''}

    ${isPractice ? practiceLinksHtml(item) : ''}

    ${relatedResourcesHtml(item)}

    ${fileHtml(item)}
  `;
  document.querySelectorAll('#reslibModalBody .reslib-related-link').forEach(btn => {
    btn.addEventListener('click', () => openDetail(btn.dataset.id));
  });

  document.getElementById('reslibModalBackdrop').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  document.getElementById('reslibModalBackdrop').hidden = true;
  document.body.style.overflow = '';
}

function initModal() {
  document.getElementById('reslibModalClose').addEventListener('click', closeDetail);
  document.getElementById('reslibModalBackdrop').addEventListener('click', e => {
    if (e.target.id === 'reslibModalBackdrop') closeDetail();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDetail();
  });
}

function initSearchAndClear() {
  const searchInput = document.getElementById('reslibSearch');
  searchInput.addEventListener('input', () => {
    reslibState.search = searchInput.value;
    renderResults();
  });

  document.getElementById('reslibClearBtn').addEventListener('click', () => {
    reslibState.search = '';
    reslibState.audience.clear();
    reslibState.type.clear();
    reslibState.theme.clear();
    searchInput.value = '';
    document.querySelectorAll('.reslib-chip.active').forEach(c => c.classList.remove('active'));
    renderResults();
  });
}

function initMobileNav() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navMobile = document.getElementById('navMobile');
  const useEl = hamburgerBtn.querySelector('use');
  hamburgerBtn.addEventListener('click', () => {
    const isOpen = navMobile.classList.toggle('open');
    useEl.setAttribute('href', isOpen ? '#i-x' : '#i-menu');
  });
}

fetch('content/resources.json', { cache: 'no-cache' }) // always check for the latest library
  .then(res => res.json())
  .then(data => {
    // Items added in the CMS have no "id" field — give each a stable one
    // (from its title) so its card can still open its detail view.
    (data.items || []).forEach((item, i) => {
      if (!item.id) item.id = 'item-' + (item.title || i).toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (!Array.isArray(item.audience)) item.audience = [];
      if (!Array.isArray(item.theme)) item.theme = [];
    });
    reslibState.data = data;

    document.getElementById('reslibHeading').textContent = data.intro.heading;
    document.getElementById('reslibSub').textContent = data.intro.sub;
    document.getElementById('reslibPdfNotice').textContent = data.intro.pdfNotice;
    document.getElementById('reslibSearch').placeholder = data.filters.searchPlaceholder;
    document.getElementById('reslibAudienceLabel').textContent = data.filters.audienceLabel;
    document.getElementById('reslibTypeLabel').textContent = data.filters.typeLabel;
    document.getElementById('reslibThemeLabel').textContent = data.filters.themeLabel;
    document.getElementById('reslibClearBtn').textContent = data.filters.clearLabel;

    renderChips('reslibAudienceChips', data.filters.audienceOptions, reslibState.audience);
    renderChips('reslibTypeChips', data.filters.typeOptions, reslibState.type);
    renderChips('reslibThemeChips', data.filters.themeOptions, reslibState.theme);
    renderResults();

    initSearchAndClear();
    initModal();
    initMobileNav();
    openLinkedPractice();
  });

// Planning Tool "Learn more" links land here as ?practice=<title>.
function openLinkedPractice() {
  const name = new URLSearchParams(window.location.search).get('practice');
  if (!name) return;
  openDetail(findByTitle(name) || {
    title: name, type: PRACTICE_TYPE, audience: ['Clinician'], theme: [],
    description: '', evidence: '', fileUrl: ''
  });
}
