/* =============================================
   MAKE A SAFETY PLAN
   Step-by-step Stanley-Brown style safety plan builder
   ============================================= */

function icon(id, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}"><use href="#${id}"/></svg>`;
}

const SP_STEP_KEYS = ['warningSigns', 'internalCoping', 'distraction', 'askForHelp', 'professionals', 'environment'];
const STEP_KEYS = [...SP_STEP_KEYS, 'review'];

const spState = { data: null, items: {}, currentStep: 0 };
SP_STEP_KEYS.forEach(k => { spState.items[k] = []; });

const SP_STORAGE_KEY = 'therapistToolkitSafetyPlanState';

function persistSpState() {
  try {
    localStorage.setItem(SP_STORAGE_KEY, JSON.stringify({
      items: spState.items,
      currentStep: spState.currentStep
    }));
  } catch (e) { /* localStorage unavailable — fail silently */ }
}

function loadPersistedSpState() {
  try {
    const raw = localStorage.getItem(SP_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved || !saved.items) return;
    SP_STEP_KEYS.forEach(k => {
      if (Array.isArray(saved.items[k])) spState.items[k] = saved.items[k];
    });
    spState.currentStep = saved.currentStep || 0;
  } catch (e) { /* ignore corrupt or inaccessible storage */ }
}

function render(data) {
  spState.data = data;
  const p = data.safetyPlanPage;

  document.getElementById('spLabel').textContent = p.sectionLabel;
  document.getElementById('spHeading').textContent = p.heading;
  document.getElementById('spIntro').textContent = p.intro;
  document.getElementById('spCrisisBanner').innerHTML = `${icon('i-phone', 'icon-sm')}<span>${p.crisisBanner}</span>`;
  document.getElementById('spDisclaimer').innerHTML = `${icon('i-shield', 'icon-sm')}<span>${p.disclaimer}</span>`;
  document.getElementById('spReviewHeading').textContent = p.reviewHeading;
  document.getElementById('spReviewIntro').textContent = p.reviewIntro;
  document.getElementById('spBackBtn').textContent = p.backButtonLabel;
  document.getElementById('spDownloadBtn').textContent = p.downloadButtonLabel;
  document.getElementById('spDownloadHint').textContent = p.downloadHint;
  document.getElementById('spResetBtn').textContent = p.resetButtonLabel;
  document.getElementById('spRestartLink').textContent = p.resetButtonLabel;
  document.getElementById('spEmptyState').textContent = p.emptyStateText;

  document.getElementById('spSteps').innerHTML = p.steps.map(step => `
    <div class="sp-step" data-step="${step.key}">
      <h3>${step.heading}</h3>
      <p class="sp-step-intro">${step.intro}</p>
      <div class="planner-input-group">
        <input type="text" class="planner-input" data-step="${step.key}" placeholder="${step.placeholder}" />
        <button type="button" class="planner-add-btn" data-step="${step.key}" aria-label="${step.addButtonLabel}">${icon('i-plus', 'icon-xs')}</button>
      </div>
      <div class="planner-chips sp-chips" data-step="${step.key}"></div>
    </div>`).join('');

  const stepLabels = p.steps.map(s => s.stepLabel).concat(['Review']);
  document.getElementById('spStepper').innerHTML = stepLabels.map((label, i) => `
    <button type="button" class="planner-step-item" data-step-index="${i}">
      <span class="planner-step-dot">${i + 1}</span>
      <span class="planner-step-label">${label}</span>
    </button>`).join('');

  document.getElementById('footerLeft').innerHTML =
    `<strong>${data.footer.orgName}</strong><span>${data.footer.subLine}</span>`;
  document.getElementById('footerRight').innerHTML = `<p>${data.footer.fundingText}</p>`;
}

function initSafetyPlan() {
  const section = document.getElementById('safetyPlan');
  if (!section) return;
  const p = spState.data.safetyPlanPage;

  function renderChips(key) {
    const container = section.querySelector(`.sp-chips[data-step="${key}"]`);
    if (!container) return;
    container.innerHTML = spState.items[key].map((text, i) => `
      <span class="planner-chip planner-chip-neutral">
        <span class="planner-chip-text">${text}</span>
        <button type="button" class="planner-chip-remove" data-step="${key}" data-index="${i}" aria-label="Remove">${icon('i-x', 'icon-xs')}</button>
      </span>`).join('');
  }

  function updateActionState() {
    const any = SP_STEP_KEYS.some(k => spState.items[k].length);
    document.getElementById('spDownloadBtn').disabled = !any;
    document.getElementById('spEmptyState').style.display = any ? 'none' : 'block';
  }

  function renderStepperState() {
    document.querySelectorAll('.planner-step-item').forEach(item => {
      const i = parseInt(item.dataset.stepIndex, 10);
      item.classList.toggle('is-current', i === spState.currentStep);
      item.classList.toggle('is-done', i < spState.currentStep);
      item.classList.add('is-clickable'); // free navigation — every step is reachable at any time
    });
  }

  function buildPrintSheet() {
    const sections = p.steps.map(step => {
      const items = spState.items[step.key];
      const list = items.length
        ? `<ul>${items.map(t => `<li>${t}</li>`).join('')}</ul>`
        : `<p class="print-empty">Nothing entered for this step.</p>`;
      return `<h2>${step.heading}</h2>${list}`;
    }).join('');

    document.getElementById('spPrintSheet').innerHTML = `
      <h1>${spState.data.footer.orgName} — Safety Plan</h1>
      <p class="print-date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p class="print-disclaimer">${p.crisisBanner}</p>
      ${sections}
    `;
  }

  function addItem(key, text) {
    text = text.trim();
    if (!text) return;
    spState.items[key].push(text);
    renderChips(key);
    updateActionState();
    buildPrintSheet();
    persistSpState();
  }

  function removeItem(key, index) {
    spState.items[key].splice(index, 1);
    renderChips(key);
    updateActionState();
    buildPrintSheet();
    persistSpState();
  }

  function goToStep(index) {
    if (index < 0 || index > STEP_KEYS.length - 1) return;
    spState.currentStep = index;

    const onReview = STEP_KEYS[index] === 'review';
    const currentKey = onReview ? null : STEP_KEYS[index];

    document.querySelectorAll('.sp-step').forEach(stepEl => {
      stepEl.classList.toggle('step-hidden', !onReview && stepEl.dataset.step !== currentKey);
    });

    document.getElementById('spStepHeader').hidden = onReview;
    document.getElementById('spStepNav').hidden = onReview;
    document.getElementById('spReviewHeader').hidden = !onReview;
    document.getElementById('spActions').hidden = !onReview;

    if (!onReview) {
      const stepData = p.steps.find(s => s.key === currentKey);
      document.getElementById('spStepTitle').textContent = `Step ${index + 1} of ${STEP_KEYS.length}: ${stepData.stepLabel}`;
      document.getElementById('spStepHint').textContent = p.stepHint;
      document.getElementById('spBackBtn').hidden = index === 0;
      document.getElementById('spNextBtn').textContent = index === p.steps.length - 1 ? p.reviewButtonLabel : p.nextButtonLabel;
    }

    renderStepperState();
    persistSpState();
  }

  section.querySelectorAll('.planner-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = section.querySelector(`.planner-input[data-step="${btn.dataset.step}"]`);
      addItem(btn.dataset.step, input.value);
      input.value = '';
      input.focus();
    });
  });

  section.querySelectorAll('.planner-input').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      addItem(input.dataset.step, input.value);
      input.value = '';
    });
  });

  section.addEventListener('click', e => {
    const removeBtn = e.target.closest('.planner-chip-remove');
    if (!removeBtn) return;
    removeItem(removeBtn.dataset.step, parseInt(removeBtn.dataset.index, 10));
  });

  function resetSafetyPlan() {
    SP_STEP_KEYS.forEach(k => {
      spState.items[k] = [];
      renderChips(k);
    });
    spState.currentStep = 0;
    goToStep(0);
    updateActionState();
    try { localStorage.removeItem(SP_STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  document.getElementById('spDownloadBtn').addEventListener('click', () => { buildPrintSheet(); window.print(); });
  document.getElementById('spResetBtn').addEventListener('click', resetSafetyPlan);
  document.getElementById('spRestartLink').addEventListener('click', resetSafetyPlan);

  document.getElementById('spBackBtn').addEventListener('click', () => goToStep(spState.currentStep - 1));
  document.getElementById('spNextBtn').addEventListener('click', () => goToStep(spState.currentStep + 1));
  document.querySelectorAll('.planner-step-item').forEach(item => {
    item.addEventListener('click', () => goToStep(parseInt(item.dataset.stepIndex, 10)));
  });

  // Restore any previously entered items before landing on the saved step.
  SP_STEP_KEYS.forEach(k => renderChips(k));
  updateActionState();
  buildPrintSheet();
  goToStep(spState.currentStep);
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
loadPersistedSpState();
fetch('content/site.json')
  .then(res => res.json())
  .then(data => {
    render(data);
    initSafetyPlan();
    initFadeObserver();
  });
