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

// Two tabs: practices you use in session, and handouts & tools you give out.
// Each tab has its own filters; search and filters apply within the tab.
const TABS = ['practices', 'tools'];
const inTab = (item, tab) => (tab === 'practices') === (item.type === PRACTICE_TYPE);

const reslibState = {
  data: null,
  tab: 'practices',
  search: '',
  filters: { theme: new Set(), type: new Set(), audience: new Set() }
};

// Which filter groups each tab offers, in order. Options come from the CMS
// filter lists; the Handouts & Tools type list leaves out practices, and its
// audience list leaves out the CMS "hidden" audiences (e.g. Clinician).
function filterGroups(tab) {
  const f = reslibState.data.filters;
  const hidden = new Set((reslibState.data.tabs && reslibState.data.tabs.hiddenAudiences) || []);
  if (tab === 'practices') return [{ key: 'theme', label: f.themeLabel, options: f.themeOptions }];
  return [
    { key: 'type', label: f.typeLabel, options: f.typeOptions.filter(o => o !== PRACTICE_TYPE) },
    { key: 'audience', label: f.audienceLabel, options: f.audienceOptions.filter(o => !hidden.has(o)) },
    { key: 'theme', label: f.themeLabel, options: f.themeOptions },
  ];
}

function valuesOf(item, key) {
  if (key === 'type') return [item.type];
  return item[key] || [];
}

// Search + every active filter group, optionally ignoring one group (used to
// count what each option in that group would give). Within a group: any of
// the selected options; across groups: all of them.
function matches(item, ignoreKey) {
  const q = reslibState.search.trim().toLowerCase();
  if (q && !(`${item.title} ${item.description || ''}`.toLowerCase().includes(q))) return false;
  return filterGroups(reslibState.tab).every(g => {
    if (g.key === ignoreKey) return true;
    const sel = reslibState.filters[g.key];
    return !sel.size || valuesOf(item, g.key).some(v => sel.has(v));
  });
}

const tabItems = tab => reslibState.data.items.filter(i => inTab(i, tab));

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

function renderTabs() {
  const t = reslibState.data.tabs;
  document.getElementById('reslibTabs').innerHTML = TABS.map(tab => {
    const on = tab === reslibState.tab;
    const n = tabItems(tab).filter(isListed).length;
    return `<button type="button" role="tab" class="reslib-tab${on ? ' is-active' : ''}" data-tab="${tab}" aria-selected="${on}" aria-controls="reslibPanel" tabindex="${on ? 0 : -1}">${icon(tab === 'practices' ? 'ic-star' : 'ic-file-text', 'icon-sm')}${t[tab].label} <span class="reslib-tab-count">${n}</span></button>`;
  }).join('');
  document.getElementById('reslibTabIntro').textContent = t[reslibState.tab].intro;
}

// Filter options with a count each. Options no item in this tab uses are
// hidden; options that would currently give no results are disabled.
function renderFilters() {
  const items = tabItems(reslibState.tab);
  document.getElementById('reslibFilters').innerHTML = filterGroups(reslibState.tab).map(g => {
    const sel = reslibState.filters[g.key];
    const base = items.filter(i => matches(i, g.key)).filter(isListed);
    const chips = g.options.map(opt => {
      if (!items.some(i => valuesOf(i, g.key).includes(opt))) return '';
      const n = base.filter(i => valuesOf(i, g.key).includes(opt)).length;
      const on = sel.has(opt);
      return `<button type="button" class="reslib-chip${on ? ' active' : ''}" data-group="${g.key}" data-value="${escHtml(opt)}" aria-pressed="${on}"${!n && !on ? ' disabled' : ''}>${opt}<span class="reslib-chip-count">${n}</span></button>`;
    }).join('');
    return chips ? `
      <div class="reslib-filter-group">
        <span class="reslib-filter-label">${g.label}</span>
        <div class="reslib-chips">${chips}</div>
      </div>` : '';
  }).join('');
}

function renderResults() {
  const t = reslibState.data.tabs;
  // A–Z by title (cards and the "coming soon" list alike).
  const all = tabItems(reslibState.tab).filter(i => matches(i))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  const items = all.filter(isListed);
  const grid = document.getElementById('reslibGrid');
  const empty = document.getElementById('reslibEmpty');
  const word = items.length === 1 ? t[reslibState.tab].countSingular : t[reslibState.tab].countPlural;
  document.getElementById('reslibCount').textContent = `${items.length} ${word}`;
  grid.innerHTML = items.map(cardHtml).join('');

  // Practices still waiting for a write-up: listed by name below the cards
  // (search and filters apply), each opening its detail view.
  const pending = reslibState.tab === 'practices' ? all.filter(i => !isListed(i)) : [];
  const coming = document.getElementById('reslibComing');
  coming.hidden = !pending.length;
  coming.innerHTML = pending.length ? `
    <h3>${t.comingSoonHeading} <span>${pending.length}</span></h3>
    <p>${t.comingSoonNote}</p>
    <div class="reslib-coming-list">${pending.map(i => `<button type="button" class="reslib-coming-item" data-id="${i.id}">${i.title}</button>`).join('')}</div>` : '';

  empty.textContent = t.emptyText;
  empty.hidden = items.length > 0 || pending.length > 0;
}

function render() {
  renderTabs();
  renderFilters();
  renderResults();
}

function setTab(tab, focus) {
  if (!TABS.includes(tab) || tab === reslibState.tab) return;
  reslibState.tab = tab;
  Object.values(reslibState.filters).forEach(set => set.clear());
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tab);
  history.replaceState(null, '', url);
  render();
  if (focus) document.querySelector(`.reslib-tab[data-tab="${tab}"]`).focus();
}

function initTabsAndFilters() {
  const tabs = document.getElementById('reslibTabs');
  tabs.addEventListener('click', e => {
    const btn = e.target.closest('.reslib-tab');
    if (btn) setTab(btn.dataset.tab);
  });
  tabs.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = TABS.indexOf(reslibState.tab);
    setTab(TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length], true);
  });
  document.getElementById('reslibFilters').addEventListener('click', e => {
    const chip = e.target.closest('.reslib-chip');
    if (!chip || chip.disabled) return;
    const set = reslibState.filters[chip.dataset.group];
    set.has(chip.dataset.value) ? set.delete(chip.dataset.value) : set.add(chip.dataset.value);
    renderFilters();
    renderResults();
    document.querySelector(`.reslib-chip[data-group="${chip.dataset.group}"][data-value="${CSS.escape(chip.dataset.value)}"]`)?.focus();
  });
  document.getElementById('reslibPanel').addEventListener('click', e => {
    const card = e.target.closest('.reslib-card, .reslib-coming-item');
    if (card) openDetail(card.dataset.id);
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
const LINK_GROUP_ICONS = { therapist: 'ic-user', client: 'ic-users', research: 'ic-book-open', other: 'ic-layers' };
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
        <h5>${icon(LINK_GROUP_ICONS[key] || 'ic-layers', 'icon-xs')}${heading}</h5>
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
    renderFilters();
    renderResults();
  });

  document.getElementById('reslibClearBtn').addEventListener('click', () => {
    reslibState.search = '';
    Object.values(reslibState.filters).forEach(set => set.clear());
    searchInput.value = '';
    renderFilters();
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
    document.getElementById('reslibClearBtn').textContent = data.filters.clearLabel;

    // ?tab=tools opens Handouts & Tools; a ?practice= link opens Practices.
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'tools' && !params.get('practice')) reslibState.tab = 'tools';
    render();

    initTabsAndFilters();
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
