/* =============================================
   THERAPIST TOOLKIT — NAVIGATING SCHOOLS
   Tips (with an interview guide + roles), Your Client's School Card,
   a printable Mental Health Contact Card, and the Rise school guidelines.
   Everything a therapist types saves in this browser only.
   ============================================= */

function icon(id, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}"><use href="#${id}"/></svg>`;
}

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// One store for the School Card + interview answers (the interview guide's
// answers ARE the card's school context), one for the Contact Card.
const SCHOOL_CARD_KEY = 'therapistToolkitSchoolCard';
const CONTACT_CARD_KEY = 'therapistToolkitContactCard';
// Read-only: the Planning Tool's saved map, for the School ring's factors.
const PLANNER_STORAGE_KEY = 'therapistToolkitPlannerState';

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch (e) { return fallback; }
}
function saveJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable — fail silently */ }
}

const schState = {
  data: null,
  card: { fields: {}, answers: {} },
  contact: { fields: {}, local: '' }
};

// ── Tabs ─────────────────────────────────────
const TAB_KEYS = ['tips', 'card', 'contact', 'guidelines'];

function activateTab(key, focus) {
  if (!TAB_KEYS.includes(key)) return;
  document.querySelectorAll('#schTabsNav .tab-btn').forEach(b => {
    const on = b.dataset.tab === key;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  document.querySelectorAll('.schools-page .tab-panel').forEach(p => {
    p.classList.remove('active', 'tab-entering');
  });
  const panel = document.getElementById(`panel-${key}`);
  panel.classList.add('active');
  requestAnimationFrame(() => panel.classList.add('tab-entering'));
  if (key === 'card') renderCardSide(); // pick up interview answers / map edits made since
  if (focus) history.replaceState(null, '', `#${key}`);
}

// ── Tips ─────────────────────────────────────
function interviewGuideHtml(sp) {
  const g = sp.interviewGuide;
  const rows = g.questions.map((q, i) => {
    const answer = schState.card.answers[i] || '';
    return `
      <li class="schools-q${answer.trim() ? ' is-answered' : ''}">
        <label for="schQ${i}"><span class="schools-q-num">${i + 1}</span>${esc(q)}</label>
        <textarea id="schQ${i}" class="schools-q-input" data-q-index="${i}" rows="1" placeholder="${esc(g.answerPlaceholder)}">${esc(answer)}</textarea>
      </li>`;
  }).join('');
  return `
    <div class="schools-guide">
      <div class="schools-guide-head">
        <h4>${esc(g.heading)}</h4>
        <span class="schools-progress" id="schGuideProgress" aria-live="polite"></span>
      </div>
      <ol class="schools-q-list">${rows}</ol>
      <div class="schools-guide-actions">
        <button type="button" class="btn btn-outline schools-btn-sm" id="schGuidePrintBtn">${icon('i-printer', 'icon-xs')} ${esc(g.printLabel)}</button>
        <span class="schools-hint">${esc(g.printHint)}</span>
      </div>
    </div>`;
}

// "Who does what" — a situation picker above the three role cards (same
// pattern as the Self-Care page's "What do you need right now?" picker):
// choosing a situation highlights whose role it is, dims the others, and
// shows a one-line explanation, announced to screen readers.
function rolesHtml(sp) {
  const picker = sp.rolesPicker;
  return `
    <div class="schools-roles" id="schRoles">
      <h4>${esc(sp.rolesHeading)}</h4>
      ${picker ? `
        <div class="schools-roles-picker">
          <span class="schools-roles-picker-label" id="schRolesPickerLabel">${esc(picker.label)}</span>
          ${picker.intro ? `<p class="schools-roles-picker-intro">${esc(picker.intro)}</p>` : ''}
          <div class="schools-roles-options" role="group" aria-labelledby="schRolesPickerLabel">
            ${picker.options.map((o, i) => `<button type="button" class="schools-roles-option" data-option-index="${i}" aria-pressed="false">${esc(o.label)}</button>`).join('')}
          </div>
          <div class="schools-roles-answer" id="schRolesAnswer" aria-live="polite" hidden></div>
        </div>` : ''}
      <div class="schools-roles-grid">
        ${sp.roles.map((r, i) => `
          <div class="schools-role schools-role-${i + 1}" data-role-key="${esc(r.key || '')}">
            <span class="schools-role-badge" hidden>${esc(picker ? picker.bestFitLabel : '')}</span>
            <strong>${esc(r.who)}</strong>
            <p>${esc(r.role)}</p>
          </div>`).join('')}
      </div>
    </div>`;
}

function selectRoleOption(index) {
  const sp = schState.data.schoolsPage;
  const picker = sp.rolesPicker;
  const root = document.getElementById('schRoles');
  if (!picker || !root) return;
  const current = root.dataset.selected;
  const deselect = index === null || String(index) === current;
  const option = deselect ? null : picker.options[index];
  root.dataset.selected = deselect ? '' : String(index);
  root.classList.toggle('has-selection', !!option);

  root.querySelectorAll('.schools-roles-option').forEach(btn => {
    const on = !!option && btn.dataset.optionIndex === String(index);
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
  const matches = option ? option.matchKeys || [] : [];
  root.querySelectorAll('.schools-role').forEach(card => {
    const match = matches.includes(card.dataset.roleKey);
    card.classList.toggle('is-match', !!option && match);
    card.classList.toggle('is-dimmed', !!option && !match);
    card.querySelector('.schools-role-badge').hidden = !(option && match);
  });

  const answer = document.getElementById('schRolesAnswer');
  if (option) {
    const who = sp.roles.filter(r => matches.includes(r.key)).map(r => r.who).join(' + ');
    answer.innerHTML = `<strong>${esc(who)}</strong><span>${esc(option.note)}</span>
      <button type="button" class="schools-roles-clear">${esc(picker.clearLabel)}</button>`;
    answer.hidden = false;
  } else {
    answer.hidden = true;
    answer.innerHTML = '';
  }
}

function tipLinkHtml(tip) {
  if (tip.linkHref) {
    return `<a class="btn btn-outline schools-btn-sm" href="${esc(tip.linkHref)}" target="_blank" rel="noopener">${icon('i-download', 'icon-xs')} ${esc(tip.linkText)}</a>`;
  }
  if (tip.pendingText) return `<span class="schools-pending">${esc(tip.pendingText)}</span>`;
  return '';
}

function renderTips(sp) {
  document.getElementById('schTips').innerHTML = sp.tips.map((tip, i) => {
    let extra = '';
    if (tip.widget === 'interviewGuide') extra = interviewGuideHtml(sp);
    if (tip.widget === 'roles') extra = rolesHtml(sp);
    const link = tipLinkHtml(tip);
    return `
      <li class="schools-tip" id="tip-${i + 1}">
        <span class="schools-tip-num" aria-hidden="true">${i + 1}</span>
        <div class="schools-tip-body">
          <span class="schools-tip-kicker">Tip ${i + 1}</span>
          <h3>${esc(tip.title)}</h3>
          <p>${esc(tip.body)}</p>
          ${link ? `<div class="schools-tip-link">${link}</div>` : ''}
          ${extra}
        </div>
      </li>`;
  }).join('');
  document.querySelectorAll('.schools-q-input').forEach(autoGrow);
  updateGuideProgress();
}

function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

function updateGuideProgress() {
  const g = schState.data.schoolsPage.interviewGuide;
  const done = g.questions.filter((_, i) => (schState.card.answers[i] || '').trim()).length;
  const el = document.getElementById('schGuideProgress');
  if (el) el.textContent = `${done} of ${g.questions.length} ${g.progressLabel}`;
}

// ── Client School Card ───────────────────────
function fieldHtml(f, value, prefix) {
  const id = `${prefix}-${f.key}`;
  let control;
  if (f.type === 'select') {
    control = `<select id="${id}" data-key="${f.key}">${f.options.map(o =>
      `<option${o === value ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  } else if (f.type === 'textarea') {
    control = `<textarea id="${id}" data-key="${f.key}" rows="3" placeholder="${esc(f.placeholder)}">${esc(value)}</textarea>`;
  } else {
    control = `<input type="text" id="${id}" data-key="${f.key}" value="${esc(value)}" placeholder="${esc(f.placeholder)}" />`;
  }
  const wide = f.type === 'textarea' ? ' is-wide' : '';
  return `<div class="schools-field${wide}"><label for="${id}">${esc(f.label)}</label>${control}</div>`;
}

function renderCardForm(sp) {
  document.getElementById('schCardForm').innerHTML = sp.schoolCard.fields
    .map(f => fieldHtml(f, schState.card.fields[f.key] || (f.type === 'select' ? f.options[0] : ''), 'schCard'))
    .join('');
}

// School-ring factors from the Planning Tool's saved map in this browser.
function schoolFactorsFromMap() {
  const saved = loadJson(PLANNER_STORAGE_KEY, null);
  const ring = saved && saved.factors && saved.factors.school;
  const norm = list => (Array.isArray(list) ? list : []).map(f =>
    typeof f === 'string' ? { text: f, weight: null } : { text: f.text, weight: f.weight });
  return { risk: norm(ring && ring.risk), protective: norm(ring && ring.protective) };
}

function factorListHtml(list, valence) {
  if (!list.length) return '<li class="schools-factor-empty">None</li>';
  return list.map(f => `<li class="schools-factor schools-factor-${valence}">${esc(f.text)}${f.weight ? ` <em>${f.weight}/5</em>` : ''}</li>`).join('');
}

function renderCardSide() {
  const sc = schState.data.schoolsPage.schoolCard;
  const g = schState.data.schoolsPage.interviewGuide;

  const factors = schoolFactorsFromMap();
  const hasFactors = factors.risk.length || factors.protective.length;
  document.getElementById('schCardMap').innerHTML = `
    <h4>${esc(sc.mapHeading)}</h4>
    <p class="schools-side-intro">${esc(sc.mapIntro)}</p>
    ${hasFactors ? `
      <div class="schools-factor-cols">
        <div><span class="schools-factor-label planner-col-heading-risk">${esc(sc.riskLabel)}</span><ul>${factorListHtml(factors.risk, 'risk')}</ul></div>
        <div><span class="schools-factor-label planner-col-heading-protective">${esc(sc.protectiveLabel)}</span><ul>${factorListHtml(factors.protective, 'protective')}</ul></div>
      </div>` : `<p class="schools-side-empty">${esc(sc.mapEmpty)}</p>`}
    <a class="schools-side-link" href="planning-tool.html">${esc(sc.mapLinkLabel)} ${icon('i-arrow-right', 'icon-xs')}</a>`;

  const answered = g.questions
    .map((q, i) => ({ q, a: (schState.card.answers[i] || '').trim() }))
    .filter(x => x.a);
  document.getElementById('schCardInterview').innerHTML = `
    <h4>${esc(sc.interviewHeading)}</h4>
    ${answered.length
      ? `<dl class="schools-answers">${answered.map(x => `<dt>${esc(x.q)}</dt><dd>${esc(x.a)}</dd>`).join('')}</dl>`
      : `<p class="schools-side-empty">${esc(sc.interviewEmpty)}</p>`}
    <button type="button" class="schools-side-link" data-goto-tab="tips" data-goto-anchor="tip-2">${esc(sc.interviewEditLabel)} ${icon('i-arrow-right', 'icon-xs')}</button>`;
}

// ── Contact Card ─────────────────────────────
function renderContactForm(sp) {
  const cc = sp.contactCard;
  document.getElementById('schContactForm').innerHTML =
    cc.therapistFields.map(f => fieldHtml({ ...f, type: 'text' }, schState.contact.fields[f.key] || '', 'schContact')).join('') +
    `<div class="schools-field is-wide">
       <label for="schContactLocal">${esc(cc.localHeading)}</label>
       <textarea id="schContactLocal" data-key="__local" rows="4" placeholder="${esc(cc.localPlaceholder)}">${esc(schState.contact.local)}</textarea>
     </div>`;
}

function contactCardHtml() {
  const cc = schState.data.schoolsPage.contactCard;
  const f = schState.contact.fields;
  const blank = '<span class="cc-blank"></span>';
  const val = key => (f[key] || '').trim() ? esc(f[key].trim()) : blank;
  const local = schState.contact.local.split('\n').map(s => s.trim()).filter(Boolean);
  return `
    <div class="cc-card">
      <div class="cc-header">
        <span class="cc-title">${esc(cc.title)}</span>
        <span class="cc-sub">Rise Against Suicide</span>
      </div>
      <!-- One column, top to bottom: the therapist's details and when to
           contact them, then Rise's contact and when to contact Rise. Every
           detail gets the full card width, so a 30+ character email fits on
           one line. -->
      <div class="cc-section">
        <h5>${esc(cc.therapistHeading)}</h5>
        <div class="cc-body">
          <dl class="cc-details">
            ${cc.therapistFields.map(tf => `
              <div class="cc-detail cc-detail-${esc(tf.key)}"><dt>${esc(tf.label)}</dt><dd>${val(tf.key)}</dd></div>`).join('')}
          </dl>
          <h6>${esc(cc.whenTherapistHeading)}</h6>
          <ul>${cc.whenTherapist.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="cc-section">
        <h5>${esc(cc.riseHeading)}</h5>
        <div class="cc-body">
          <dl class="cc-details">
            <div class="cc-detail cc-detail-email"><dt>${esc(cc.riseContactLabel || 'Email')}</dt><dd>${esc(cc.riseContact)}</dd></div>
          </dl>
          <h6>${esc(cc.whenRiseHeading)}</h6>
          <ul>${cc.whenRise.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="cc-crisis">
        <h5>${icon('i-phone', 'icon-xs')} ${esc(cc.crisisHeading)}</h5>
        <div class="cc-body">
          <ul>${cc.crisis.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        </div>
      </div>
      ${local.length ? `
        <div class="cc-local">
          <h5>${esc(cc.localHeading)}</h5>
          <div class="cc-body">
            <ul>${local.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          </div>
        </div>` : ''}
    </div>`;
}

function renderContactPreview() {
  document.getElementById('schContactPreview').innerHTML = contactCardHtml();
}

// ── Guidelines ───────────────────────────────
function renderGuidelines(sp) {
  const g = sp.guidelines;
  document.getElementById('schGuidelines').innerHTML = `
    <div class="schools-guidelines-head">
      ${icon('i-shield')}
      <div>
        <h3>${esc(g.heading)}</h3>
        <span class="schools-guidelines-source">${esc(g.source)}</span>
      </div>
    </div>
    <p class="schools-panel-intro">${esc(g.intro)}</p>
    <ol class="schools-guidelines-list">${g.items.map(it => `<li>${esc(it)}</li>`).join('')}</ol>
    <div class="schools-guidelines-actions">
      <button type="button" class="btn btn-primary" id="schGuidelinesPrintBtn">${icon('i-printer', 'icon-xs')} ${esc(g.printLabel || 'Print guidelines')}</button>
      ${g.downloadHint ? `<span class="schools-hint">${esc(g.downloadHint)}</span>` : ''}
    </div>`;
}

// ── Printing — each print button fills the one print sheet first ──
// Date + time (with time zone) stamped at the top of every generated PDF,
// so the client, therapist, and school can all tell when it was made.
function printTimestamp() {
  const stamp = new Date().toLocaleString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  });
  return `<p class="print-timestamp">Generated ${stamp}</p>`;
}

function printSheet(html) {
  document.getElementById('schPrintSheet').innerHTML = printTimestamp() + html;
  window.print();
}

// The interview guide and school card print in the same card style as the
// Mental Health Contact Card (cc-* classes): teal header band, teal section
// headings, indented bodies with an accent line, small uppercase labels.
function printCardShell(title, sub, sectionsHtml, extraClass) {
  return `
    <div class="print-card${extraClass ? ' ' + extraClass : ''}">
      <div class="cc-card">
        <div class="cc-header">
          <span class="cc-title">${esc(title)}</span>
          <span class="cc-sub">${esc(sub)}</span>
        </div>
        ${sectionsHtml}
      </div>
    </div>`;
}
function printCardSection(heading, bodyHtml, extraClass) {
  return `
    <div class="cc-section${extraClass ? ' ' + extraClass : ''}">
      <h5>${esc(heading)}</h5>
      <div class="cc-body">${bodyHtml}</div>
    </div>`;
}

function printInterviewGuide() {
  const sp = schState.data.schoolsPage;
  const g = sp.interviewGuide;
  const school = (schState.card.fields.school || '').trim();
  const items = g.questions.map((q, i) => {
    const a = (schState.card.answers[i] || '').trim();
    return `
      <li class="cc-qa">
        <span class="cc-qa-q">${esc(q)}</span>
        ${a ? `<span class="cc-qa-a">${esc(a)}</span>` : '<span class="cc-blank"></span><span class="cc-blank"></span>'}
      </li>`;
  }).join('');
  printSheet(printCardShell(
    g.heading,
    school || 'Rise Against Suicide',
    printCardSection('Questions for your school partner', `<ol class="cc-qa-list">${items}</ol>`)
  ));
}

function printSchoolCard() {
  const sp = schState.data.schoolsPage;
  const sc = sp.schoolCard;
  const factors = schoolFactorsFromMap();
  const blank = '<span class="cc-blank"></span>';
  const details = sc.fields.map(f => {
    const v = (schState.card.fields[f.key] || (f.type === 'select' ? f.options[0] : '')).trim();
    return `<div class="cc-detail${f.type === 'textarea' ? ' cc-detail-long' : ''}"><dt>${esc(f.label)}</dt><dd>${v ? esc(v) : blank}</dd></div>`;
  }).join('');
  const flist = list => list.length
    ? `<ul>${list.map(f => `<li>${esc(f.text)}${f.weight ? ` <span class="cc-muted">(${f.weight}/5)</span>` : ''}</li>`).join('')}</ul>`
    : '<p class="cc-muted">None on the map yet.</p>';
  const answers = sp.interviewGuide.questions
    .map((q, i) => ({ q, a: (schState.card.answers[i] || '').trim() }))
    .filter(x => x.a);
  printSheet(printCardShell(
    sp.tabs.card,
    (schState.card.fields.school || '').trim() || 'Rise Against Suicide',
    printCardSection('School & client', `<dl class="cc-details cc-details-grid">${details}</dl>`) +
    printCardSection(sc.mapHeading, `
      <div class="cc-two-col">
        <div><h6>${esc(sc.riskLabel)}</h6>${flist(factors.risk)}</div>
        <div><h6>${esc(sc.protectiveLabel)}</h6>${flist(factors.protective)}</div>
      </div>`) +
    printCardSection(sc.interviewHeading, answers.length
      ? `<dl class="cc-details cc-details-grid cc-answers-grid">${answers.map(x => `<div class="cc-detail"><dt>${esc(x.q)}</dt><dd class="cc-prewrap">${esc(x.a)}</dd></div>`).join('')}</dl>`
      : `<p class="cc-muted">${esc(sc.interviewEmpty)}</p>`),
    'print-card-compact'
  ));
}

function printGuidelines() {
  const g = schState.data.schoolsPage.guidelines;
  printSheet(printCardShell(
    g.heading,
    g.source,
    printCardSection('Rise protocol in schools', `
      <p class="cc-intro">${esc(g.intro)}</p>
      <ol class="cc-qa-list cc-guidelines-list">${g.items.map(it => `<li class="cc-qa">${esc(it)}</li>`).join('')}</ol>`)
  ));
}

function printContactCard() {
  printSheet(`<div class="print-contact-card">${contactCardHtml()}</div>`);
}

// ── Wiring ───────────────────────────────────
function initInteractions() {
  const sp = schState.data.schoolsPage;

  document.getElementById('schTabsNav').addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (btn) activateTab(btn.dataset.tab, true);
  });

  // Interview answers (Tip 2)
  document.getElementById('schTips').addEventListener('input', e => {
    const el = e.target.closest('.schools-q-input');
    if (!el) return;
    schState.card.answers[el.dataset.qIndex] = el.value;
    el.closest('.schools-q').classList.toggle('is-answered', !!el.value.trim());
    autoGrow(el);
    updateGuideProgress();
    saveJson(SCHOOL_CARD_KEY, schState.card);
  });
  document.getElementById('schTips').addEventListener('click', e => {
    if (e.target.closest('#schGuidePrintBtn')) printInterviewGuide();
    const roleOption = e.target.closest('.schools-roles-option');
    if (roleOption) selectRoleOption(parseInt(roleOption.dataset.optionIndex, 10));
    if (e.target.closest('.schools-roles-clear')) {
      selectRoleOption(null);
      document.querySelector('.schools-roles-option')?.focus();
    }
  });

  // School Card
  const cardForm = document.getElementById('schCardForm');
  const onCardEdit = e => {
    const key = e.target.dataset.key;
    if (!key) return;
    schState.card.fields[key] = e.target.value;
    saveJson(SCHOOL_CARD_KEY, schState.card);
  };
  cardForm.addEventListener('input', onCardEdit);
  cardForm.addEventListener('change', onCardEdit);
  cardForm.addEventListener('submit', e => e.preventDefault());
  document.getElementById('schCardPrintBtn').addEventListener('click', printSchoolCard);
  document.getElementById('schCardResetBtn').addEventListener('click', () => {
    if (!window.confirm('Clear this school card and all interview answers? This cannot be undone.')) return;
    schState.card = { fields: {}, answers: {} };
    try { localStorage.removeItem(SCHOOL_CARD_KEY); } catch (e) { /* ignore */ }
    renderCardForm(sp);
    renderTips(sp);
    renderCardSide();
  });
  document.getElementById('schCardInterview').addEventListener('click', e => {
    const btn = e.target.closest('[data-goto-tab]');
    if (!btn) return;
    activateTab(btn.dataset.gotoTab, true);
    const target = document.getElementById(btn.dataset.gotoAnchor);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Contact Card
  const contactForm = document.getElementById('schContactForm');
  contactForm.addEventListener('input', e => {
    const key = e.target.dataset.key;
    if (!key) return;
    if (key === '__local') schState.contact.local = e.target.value;
    else schState.contact.fields[key] = e.target.value;
    renderContactPreview();
    saveJson(CONTACT_CARD_KEY, schState.contact);
  });
  contactForm.addEventListener('submit', e => e.preventDefault());
  document.getElementById('schContactPrintBtn').addEventListener('click', printContactCard);
  document.getElementById('schGuidelines').addEventListener('click', e => {
    if (e.target.closest('#schGuidelinesPrintBtn')) printGuidelines();
  });

  // The map can be edited in another browser tab — refresh the School factors when it is.
  window.addEventListener('storage', e => { if (e.key === PLANNER_STORAGE_KEY) renderCardSide(); });
}

function render(data) {
  schState.data = data;
  const sp = data.schoolsPage;

  const savedCard = loadJson(SCHOOL_CARD_KEY, {});
  schState.card = { fields: savedCard.fields || {}, answers: savedCard.answers || {} };
  const savedContact = loadJson(CONTACT_CARD_KEY, {});
  schState.contact = { fields: savedContact.fields || {}, local: savedContact.local || '' };

  document.getElementById('schLabel').textContent = sp.sectionLabel;
  document.getElementById('schHeading').textContent = sp.heading;
  document.getElementById('schIntro').textContent = sp.intro;
  document.getElementById('schQuote').innerHTML = `"${esc(sp.quote.text)}"<cite>— ${esc(sp.quote.cite)}</cite>`;

  document.getElementById('schTabsNav').innerHTML = TAB_KEYS.map((key, i) =>
    `<button type="button" class="tab-btn${i === 0 ? ' active' : ''}" role="tab" aria-selected="${i === 0}" data-tab="${key}">${esc(sp.tabs[key])}</button>`
  ).join('');

  renderTips(sp);

  document.getElementById('schCardIntro').textContent = sp.schoolCard.intro;
  document.getElementById('schCardPrintBtn').innerHTML = `${icon('i-printer', 'icon-xs')} ${esc(sp.schoolCard.printLabel)}`;
  document.getElementById('schCardResetBtn').textContent = sp.schoolCard.resetLabel;
  renderCardForm(sp);
  renderCardSide();

  document.getElementById('schContactIntro').textContent = sp.contactCard.intro;
  const note = document.getElementById('schContactNote');
  if (sp.contactCard.prototypeNote) note.innerHTML = `${icon('i-help-circle', 'icon-sm')}<span>${esc(sp.contactCard.prototypeNote)}</span>`;
  else note.hidden = true;
  document.getElementById('schContactPrintBtn').innerHTML = `${icon('i-printer', 'icon-xs')} ${esc(sp.contactCard.printLabel)}`;
  renderContactForm(sp);
  renderContactPreview();

  renderGuidelines(sp);

  document.getElementById('footerLeft').innerHTML =
    `<strong>${data.footer.orgName}</strong><span>${data.footer.subLine}</span>`;
  document.getElementById('footerRight').innerHTML = `<p>${data.footer.fundingText}</p>`;

  initInteractions();
  document.querySelector('.schools-page .tab-panel.active').classList.add('tab-entering');

  // Deep links: schools.html#card, #contact, #guidelines
  const hash = window.location.hash.replace('#', '');
  if (TAB_KEYS.includes(hash)) activateTab(hash, false);
}

// ── Shared page chrome ───────────────────────
function initFadeObserver() {
  const fadeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('[data-fade]').forEach(el => fadeObserver.observe(el));
}

const scrollProgress = document.getElementById('scrollProgress');
window.addEventListener('scroll', () => {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress.style.width = (total > 0 ? window.scrollY / total * 100 : 0) + '%';
}, { passive: true });

const mainNav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
  mainNav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

const hamburgerBtn = document.getElementById('hamburgerBtn');
const navMobile = document.getElementById('navMobile');
const menuUse = hamburgerBtn.querySelector('use');
hamburgerBtn.addEventListener('click', () => {
  const isOpen = navMobile.classList.toggle('open');
  menuUse.setAttribute('href', isOpen ? '#i-x' : '#i-menu');
});
navMobile.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navMobile.classList.remove('open');
    menuUse.setAttribute('href', '#i-menu');
  });
});

loadSiteContent()
  .then(data => {
    render(data);
    initFadeObserver();
  });
