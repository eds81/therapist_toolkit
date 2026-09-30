/* =============================================
   PLANNING TOOL — Client Ecological Formulation & Treatment Plan
   ============================================= */

function icon(id, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}"><use href="#${id}"/></svg>`;
}

function triggerTagsHtml(triggers) {
  const unique = [...new Set(triggers.map(t => `${t.ringLabel}|${t.valence}`))].map(s => {
    const [ringLabel, valence] = s.split('|');
    return { ringLabel, valence };
  });
  return `<div class="planner-resource-triggers">${unique.map(t => `
    <span class="planner-note-tag planner-note-tag-${t.valence}">${t.ringLabel} · ${t.valence === 'risk' ? 'Risk' : 'Protective'}</span>`).join('')}</div>`;
}

function resourceCardHtml(c) {
  return `
    <div class="planner-resource-card">
      ${c.icon ? icon(c.icon) : ''}
      <div>
        <strong>${c.title}</strong>
        ${triggerTagsHtml(c.triggers)}
        <ul>${c.items.slice(0, 4).map(it => `<li>${it}</li>`).join('')}</ul>
      </div>
    </div>`;
}

// ── Planner: Client Ecological Formulation & Treatment Plan ──
const RING_ORDER = ['community', 'school', 'family', 'peer', 'client'];
const STEP_KEYS = [...RING_ORDER, 'review'];

// How much a given factor is impacting the client (risk) or how strong a
// support it is (protective). Drives phase-priority scoring and sort order.
const WEIGHT_LEVELS = [
  { value: 1, label: 'Minimal' },
  { value: 2, label: 'Mild' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'High' },
  { value: 5, label: 'Severe' }
];
const DEFAULT_WEIGHT = 3;

// Connector line styling per weight — a gentle, organic progression rather
// than a harsh jump: soft and faint at 1, fuller and solid at 5.
const CONNECTOR_STYLE_BY_WEIGHT = {
  1: { width: 1,    dash: '1 4', opacity: 0.4 },
  2: { width: 1.75, dash: '3 3', opacity: 0.55 },
  3: { width: 2.5,  dash: '5 2', opacity: 0.7 },
  4: { width: 3.5,  dash: null, opacity: 0.85 },
  5: { width: 5,    dash: null, opacity: 1 }
};

// Same ramp used for the chip border colors (styles.css .planner-chip-*.w*)
// — capped at the site's existing risk/protective accent colors (#C0392B /
// #5E9A56) rather than inventing new, more jarring hues.
const CHIP_COLOR_BY_WEIGHT = {
  risk: {
    1: 'hsl(6, 45%, 88%)',
    2: 'hsl(6, 50%, 78%)',
    3: 'hsl(6, 55%, 65%)',
    4: 'hsl(6, 60%, 50%)',
    5: 'hsl(6, 64%, 36%)'
  },
  protective: {
    1: 'hsl(112, 28%, 85%)',
    2: 'hsl(112, 28%, 75%)',
    3: 'hsl(112, 28%, 62%)',
    4: 'hsl(112, 28%, 48%)',
    5: 'hsl(112, 28%, 34%)'
  }
};

// Ring outline thickness reflects the heaviest factor mapped to it — a subtle
// but legible progression, not a bold block.
const RING_STROKE_BY_WEIGHT = { 1: 2, 2: 2.5, 3: 3.5, 4: 4.5, 5: 6 };
const RING_STROKE_DEFAULT = 1.5;

const plannerState = { data: null, factors: {}, currentStep: 0, furthestStep: 0, hasGenerated: false };
RING_ORDER.forEach(k => { plannerState.factors[k] = { risk: [], protective: [] }; });

// Persist progress in this browser only (nothing is sent anywhere) so switching
// tabs or reloading doesn't lose an in-progress formulation.
const PLANNER_STORAGE_KEY = 'therapistToolkitPlannerState';

function persistPlannerState() {
  try {
    localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify({
      factors: plannerState.factors,
      currentStep: plannerState.currentStep,
      furthestStep: plannerState.furthestStep,
      hasGenerated: plannerState.hasGenerated
    }));
  } catch (e) { /* localStorage unavailable (private browsing, quota, etc.) — fail silently */ }
}

function loadPersistedPlannerState() {
  try {
    const raw = localStorage.getItem(PLANNER_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved || !saved.factors) return;
    // Upgrade factors saved before weighting existed (plain strings) into {text, weight}.
    const toFactor = f => (typeof f === 'string' ? { text: f, weight: DEFAULT_WEIGHT } : f);
    RING_ORDER.forEach(r => {
      if (!saved.factors[r]) return;
      plannerState.factors[r] = {
        risk: (saved.factors[r].risk || []).map(toFactor),
        protective: (saved.factors[r].protective || []).map(toFactor)
      };
    });
    plannerState.currentStep = saved.currentStep || 0;
    plannerState.furthestStep = saved.furthestStep || 0;
    plannerState.hasGenerated = !!saved.hasGenerated;
  } catch (e) { /* ignore corrupt or inaccessible storage */ }
}

// Maps each ecological level to the Roadmap phase and resource category it most
// directly informs. Content is drawn from the existing toolkit sections —
// this is a decision-support starting point, not a substitute for clinical judgment.
const RING_RECOMMENDATIONS = {
  client: {
    risk: {
      phaseIndex: 0, resourceKeys: ['clinician', 'youth'],
      planNote: "Individual-level risk (e.g. hopelessness, suicidal ideation) makes safety the priority — lead with the Columbia Suicide Severity Rating Scale (C-SSRS) and a Stanley-Brown Safety Plan before moving to skills work."
    },
    protective: {
      phaseIndex: 2, resourceKeys: ['youth'],
      planNote: "Existing coping and treatment skills are a strength to reinforce directly in relapse-prevention planning rather than starting from scratch."
    }
  },
  peer: {
    risk: {
      phaseIndex: 1, resourceKeys: ['youth', 'community'],
      planNote: "Social isolation is a target for behavioral activation and support-seeking skills — help the client identify and re-engage safe peer connections, or connect them to community peer support if none exist."
    },
    protective: {
      phaseIndex: 2, resourceKeys: ['youth'],
      planNote: "A supportive peer can be named explicitly in the safety plan as a support-seeking contact — use a safety planning template to formalize it."
    }
  },
  family: {
    risk: {
      phaseIndex: 0, resourceKeys: ['family', 'clinician'],
      planNote: "Family conflict raises the stakes on caregiver psychoeducation and a safety plan that accounts for the home environment (e.g. means restriction)."
    },
    protective: {
      phaseIndex: 2, resourceKeys: ['family'],
      planNote: "A supportive caregiver should be included directly in safety planning, family engagement, and the warm handoff to ongoing care."
    }
  },
  school: {
    risk: {
      phaseIndex: 1, resourceKeys: ['schools', 'youth'],
      planNote: "Academic stress is a common driver of distress — consider coordinating with school staff and using coping-skills work focused on stress management."
    },
    protective: {
      phaseIndex: 2, resourceKeys: ['schools'],
      planNote: "A trusted teacher or staff member can be named as a support-seeking resource in the safety plan and included in transition planning."
    }
  },
  community: {
    risk: {
      phaseIndex: 2, resourceKeys: ['community', 'clinician'],
      planNote: "Limited healthcare access means linkage-to-care and referral planning need to start early, not just at termination."
    },
    protective: {
      phaseIndex: 2, resourceKeys: ['community'],
      planNote: "Existing community resources should be confirmed and included in the transition and linkage-to-care plan."
    }
  }
};

function renderPlanner(data) {
  plannerState.data = data;
  const p = data.planner;

  document.getElementById('plannerLabel').textContent = p.sectionLabel;
  document.getElementById('plannerHeading').textContent = p.heading;
  document.getElementById('plannerIntro').textContent = p.intro;
  document.getElementById('plannerDisclaimer').innerHTML = `${icon('i-shield', 'icon-sm')}<span>${p.disclaimer}</span>`;
  document.getElementById('plannerRiskLabel').textContent = p.riskColumnLabel;
  document.getElementById('plannerProtectiveLabel').textContent = p.protectiveColumnLabel;
  document.getElementById('plannerCenterLabel').textContent = p.centerLabel;
  document.getElementById('plannerCenterSub').textContent = p.centerSub;
  document.getElementById('plannerGenerateBtn').textContent = p.generateButtonLabel;
  document.getElementById('plannerResetBtn').textContent = p.resetButtonLabel;
  document.getElementById('plannerRestartLink').textContent = p.resetButtonLabel;
  document.getElementById('plannerDownloadBtn').textContent = p.downloadButtonLabel;
  document.getElementById('plannerDownloadHint').textContent = p.downloadHint;
  document.getElementById('plannerEmptyState').textContent = p.emptyStateText;
  document.getElementById('plannerBackBtn').textContent = p.backButtonLabel;
  document.getElementById('plannerReviewHeading').textContent = p.reviewHeading;
  document.getElementById('plannerReviewIntro').textContent = p.reviewIntro;

  document.getElementById('plannerRingLabels').innerHTML = p.rings
    .filter(r => r.key !== 'client')
    .map(r => `<div class="planner-ring-label" data-ring="${r.key}">${r.label}</div>`).join('');

  function weightOptionsHtml() {
    return WEIGHT_LEVELS.map(w => `<option value="${w.value}"${w.value === 3 ? ' selected' : ''}>${w.value} — ${w.label}</option>`).join('');
  }

  function rowsHtml(valence) {
    return p.rings.map(r => `
      <div class="planner-row" data-ring="${r.key}">
        <label>${r.label}</label>
        <div class="planner-input-group">
          <input type="text" class="planner-input" data-ring="${r.key}" data-valence="${valence}"
                 placeholder="${valence === 'risk' ? r.placeholderRisk : r.placeholderProtective}" />
          <select class="planner-weight-select" data-ring="${r.key}" data-valence="${valence}"
                  title="${valence === 'risk' ? 'How much is this impacting the client?' : 'How strong is this protective factor?'}">
            ${weightOptionsHtml()}
          </select>
          <button type="button" class="planner-add-btn planner-add-btn-${valence}" data-ring="${r.key}" data-valence="${valence}" aria-label="${p.addButtonLabel}">${icon('i-plus', 'icon-xs')}</button>
        </div>
        <div class="planner-chips" data-ring="${r.key}" data-valence="${valence}"></div>
      </div>`).join('');
  }

  document.getElementById('plannerRiskRows').innerHTML = rowsHtml('risk');
  document.getElementById('plannerProtectiveRows').innerHTML = rowsHtml('protective');

  const stepLabels = p.rings.map(r => r.label).concat(['Review']);
  document.getElementById('plannerStepper').innerHTML = stepLabels.map((label, i) => `
    <button type="button" class="planner-step-item" data-step-index="${i}" data-ring="${STEP_KEYS[i]}">
      <span class="planner-step-dot">${i + 1}</span>
      <span class="planner-step-label">${label}</span>
    </button>`).join('');
}

function initPlanner() {
  const layout = document.getElementById('plannerLayout');
  if (!layout) return;

  // ── Review-step hover highlight: hovering a ring's name (top stepper or a
  // row label) spotlights that ring's factors and circle, and fades the rest.
  const reviewHighlightState = { ring: null };

  function applyReviewHighlight(ring) {
    const active = !!ring;
    document.querySelectorAll('.planner-row[data-ring]').forEach(row => {
      row.classList.toggle('is-ring-match', active && row.dataset.ring === ring);
      row.classList.toggle('is-ring-dim', active && row.dataset.ring !== ring);
    });
    document.querySelectorAll('.planner-step-item[data-ring]').forEach(item => {
      const isReview = item.dataset.ring === 'review';
      item.classList.toggle('is-ring-match', active && item.dataset.ring === ring);
      item.classList.toggle('is-ring-dim', active && !isReview && item.dataset.ring !== ring);
    });
    document.querySelectorAll('.planner-ring-label[data-ring]').forEach(lbl => {
      lbl.classList.toggle('is-ring-match', active && lbl.dataset.ring === ring);
      lbl.classList.toggle('is-ring-dim', active && lbl.dataset.ring !== ring);
    });
    const svg = document.getElementById('plannerSvg');
    if (svg) {
      svg.querySelectorAll('.planner-ring[data-ring]').forEach(el => {
        el.classList.toggle('is-ring-match', active && el.dataset.ring === ring);
        el.classList.toggle('is-ring-dim', active && el.dataset.ring !== ring);
      });
    }
    document.querySelectorAll('.planner-connector[data-ring]').forEach(line => {
      line.classList.toggle('is-ring-match', active && line.dataset.ring === ring);
      line.classList.toggle('is-ring-dim', active && line.dataset.ring !== ring);
    });
  }

  function setReviewHighlight(ring) {
    if (STEP_KEYS[plannerState.currentStep] !== 'review') return;
    reviewHighlightState.ring = ring;
    applyReviewHighlight(ring);
  }

  const plannerSection = document.getElementById('planner');
  function ringFromHoverTarget(target) {
    const stepItem = target.closest('.planner-step-item[data-ring]');
    if (stepItem && stepItem.dataset.ring !== 'review') return stepItem.dataset.ring;
    const label = target.closest('.planner-row > label, .planner-ring-label[data-ring]');
    if (label) return label.dataset.ring || label.closest('.planner-row').dataset.ring;
    const ring = target.closest('.planner-ring[data-ring]');
    if (ring) return ring.dataset.ring;
    return null;
  }
  if (plannerSection) {
    plannerSection.addEventListener('mouseover', e => {
      const ring = ringFromHoverTarget(e.target);
      if (ring) setReviewHighlight(ring);
    });
    plannerSection.addEventListener('mouseout', e => {
      const hoverable = e.target.closest('.planner-step-item[data-ring], .planner-row > label, .planner-ring-label[data-ring], .planner-ring[data-ring]');
      if (!hoverable || hoverable.contains(e.relatedTarget)) return;
      setReviewHighlight(null);
    });
    plannerSection.addEventListener('focusin', e => {
      const stepItem = e.target.closest('.planner-step-item[data-ring]');
      if (stepItem && stepItem.dataset.ring !== 'review') setReviewHighlight(stepItem.dataset.ring);
    });
    plannerSection.addEventListener('focusout', e => {
      if (e.target.closest('.planner-step-item[data-ring]')) setReviewHighlight(null);
    });
  }

  function weightDotsHtml(ring, valence, index, weight) {
    return `<span class="planner-chip-weight" role="group" aria-label="Impact level, ${weight} of 5">${
      Array.from({ length: 5 }, (_, i) => `
        <button type="button" class="wdot${i < weight ? ' filled' : ''}"
                data-ring="${ring}" data-valence="${valence}" data-index="${index}" data-value="${i + 1}"
                aria-label="Set impact to ${i + 1}" title="${WEIGHT_LEVELS[i].value} — ${WEIGHT_LEVELS[i].label}"></button>`).join('')
    }</span>`;
  }

  function renderChips(ring, valence) {
    const container = layout.querySelector(`.planner-chips[data-ring="${ring}"][data-valence="${valence}"]`);
    if (!container) return;
    container.innerHTML = plannerState.factors[ring][valence].map((factor, i) => `
      <span class="planner-chip planner-chip-${valence} w${factor.weight}" data-weight="${factor.weight}">
        <span class="planner-chip-text">${factor.text}</span>
        ${weightDotsHtml(ring, valence, i, factor.weight)}
        <button type="button" class="planner-chip-remove" data-ring="${ring}" data-valence="${valence}" data-index="${i}" aria-label="Remove">${icon('i-x', 'icon-xs')}</button>
      </span>`).join('');
  }

  function updateRingActiveState(ring) {
    const svg = document.getElementById('plannerSvg');
    const el = svg.querySelector(`.planner-ring[data-ring="${ring}"]`);
    const label = document.querySelector(`.planner-ring-label[data-ring="${ring}"]`);
    const riskFactors = plannerState.factors[ring].risk;
    const protectiveFactors = plannerState.factors[ring].protective;
    const hasRisk = riskFactors.length > 0;
    const hasProtective = protectiveFactors.length > 0;

    if (el) {
      el.classList.toggle('has-risk', hasRisk);
      el.classList.toggle('has-protective', hasProtective);

      const riskMax = hasRisk ? Math.max(...riskFactors.map(f => f.weight)) : 0;
      const protMax = hasProtective ? Math.max(...protectiveFactors.map(f => f.weight)) : 0;
      const overallMax = Math.max(riskMax, protMax);

      let stroke = '';
      if (hasRisk && hasProtective) stroke = 'var(--teal)';
      else if (hasRisk) stroke = CHIP_COLOR_BY_WEIGHT.risk[riskMax];
      else if (hasProtective) stroke = CHIP_COLOR_BY_WEIGHT.protective[protMax];

      el.style.stroke = stroke;
      el.setAttribute('stroke-width', overallMax ? RING_STROKE_BY_WEIGHT[overallMax] : RING_STROKE_DEFAULT);
    }
    if (label) label.classList.toggle('has-factors', hasRisk || hasProtective);
  }

  function updateGenerateState() {
    const any = RING_ORDER.some(r => plannerState.factors[r].risk.length || plannerState.factors[r].protective.length);
    document.getElementById('plannerGenerateBtn').disabled = !any;
    document.getElementById('plannerEmptyState').style.display = any ? 'none' : 'block';
  }

  // ── Wizard: one ecological level per step, full map only on Review ──
  const p = plannerState.data.planner;

  function renderStepperState() {
    document.querySelectorAll('.planner-step-item').forEach(item => {
      const i = parseInt(item.dataset.stepIndex, 10);
      item.classList.toggle('is-current', i === plannerState.currentStep);
      item.classList.toggle('is-done', i < plannerState.currentStep);
      item.classList.add('is-clickable'); // free navigation — every step is reachable at any time
    });
  }

  // Rings always reflect what's actually been entered — jumping around the
  // wizard never hides already-entered factors. is-current-step just shows
  // where you are right now.
  function updateDiagramReveal() {
    RING_ORDER.forEach(ring => {
      updateRingActiveState(ring);
      const el = document.querySelector(`.planner-ring[data-ring="${ring}"]`);
      if (el) el.classList.toggle('is-current-step', ring === STEP_KEYS[plannerState.currentStep]);
    });
  }

  function goToStep(index) {
    if (index < 0 || index > STEP_KEYS.length - 1) return;
    plannerState.currentStep = index;
    plannerState.furthestStep = Math.max(plannerState.furthestStep, index);

    const onReview = STEP_KEYS[index] === 'review';
    const currentRing = onReview ? null : STEP_KEYS[index];

    reviewHighlightState.ring = null;
    applyReviewHighlight(null);

    document.querySelectorAll('.planner-row').forEach(row => {
      row.classList.toggle('step-hidden', !onReview && row.dataset.ring !== currentRing);
    });

    document.getElementById('plannerStepHeader').hidden = onReview;
    document.getElementById('plannerStepNav').hidden = onReview;
    document.getElementById('plannerReviewHeader').hidden = !onReview;
    document.getElementById('plannerActions').hidden = !onReview;

    if (!onReview) {
      const ringData = p.rings.find(r => r.key === currentRing);
      document.getElementById('plannerStepTitle').textContent = `Step ${index + 1} of ${STEP_KEYS.length}: ${ringData.label}`;
      document.getElementById('plannerStepHint').textContent = p.stepHint;
      document.getElementById('plannerBackBtn').hidden = index === 0;
      document.getElementById('plannerNextBtn').textContent = index === RING_ORDER.length - 1 ? p.reviewButtonLabel : p.nextButtonLabel;
    }

    renderStepperState();
    updateDiagramReveal();
    drawConnectors();
    persistPlannerState();
  }

  function drawConnectors() {
    const overlay = document.getElementById('plannerConnectors');
    const svg = document.getElementById('plannerSvg');
    if (!overlay || !svg) return;

    const layoutRect = layout.getBoundingClientRect();
    overlay.setAttribute('width', layoutRect.width);
    overlay.setAttribute('height', layoutRect.height);
    overlay.setAttribute('viewBox', `0 0 ${layoutRect.width} ${layoutRect.height}`);
    overlay.innerHTML = '';

    if (window.innerWidth <= 900) return; // columns stack on mobile; connectors would misalign

    const svgRect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const scaleX = svgRect.width / vb.width;
    const scaleY = svgRect.height / vb.height;

    // Fan each ring's anchor out to its own angle (rather than one fixed angle
    // shared by every ring) so a line only travels as far up/down as its own
    // row needs to — it no longer has to cut diagonally across the rows in
    // between to reach a single shared point.
    function ringAnchor(ring, side) {
      const el = svg.querySelector(`.planner-ring[data-ring="${ring}"]`);
      const cx = parseFloat(el.getAttribute('cx'));
      const cy = parseFloat(el.getAttribute('cy'));
      const r  = parseFloat(el.getAttribute('r'));
      const i = RING_ORDER.indexOf(ring);
      const step = 30 * i; // community (i=0) aims highest, client (i=4) aims lowest
      const angleDeg = side === 'risk' ? 240 - step : -60 + step;
      const angle = angleDeg * Math.PI / 180;
      return {
        x: svgRect.left - layoutRect.left + (cx + r * Math.cos(angle) - vb.x) * scaleX,
        y: svgRect.top  - layoutRect.top  + (cy + r * Math.sin(angle) - vb.y) * scaleY
      };
    }

    layout.querySelectorAll('.planner-chip').forEach(chip => {
      if (chip.offsetParent === null) return; // skip chips in step-hidden rows
      const wrap = chip.closest('.planner-chips');
      const ring = wrap.dataset.ring, valence = wrap.dataset.valence;
      const chipRect = chip.getBoundingClientRect();
      const startX = (valence === 'risk' ? chipRect.right : chipRect.left) - layoutRect.left;
      const startY = chipRect.top + chipRect.height / 2 - layoutRect.top;
      const end = ringAnchor(ring, valence);

      const weight = parseInt(chip.dataset.weight, 10) || DEFAULT_WEIGHT;
      const style = CONNECTOR_STYLE_BY_WEIGHT[weight] || CONNECTOR_STYLE_BY_WEIGHT[DEFAULT_WEIGHT];
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', startX);
      line.setAttribute('y1', startY);
      line.setAttribute('x2', end.x);
      line.setAttribute('y2', end.y);
      line.setAttribute('stroke-width', style.width);
      line.setAttribute('stroke-opacity', style.opacity);
      if (style.dash) line.setAttribute('stroke-dasharray', style.dash);
      line.setAttribute('class', `planner-connector planner-connector-${valence}`);
      line.setAttribute('data-ring', ring);
      line.style.stroke = CHIP_COLOR_BY_WEIGHT[valence][weight]; // matches this exact chip's color
      overlay.appendChild(line);
    });

    applyReviewHighlight(reviewHighlightState.ring);
  }

  function addFactor(ring, valence, text, weight) {
    text = text.trim();
    if (!text) return;
    weight = parseInt(weight, 10);
    if (!weight || weight < 1 || weight > 5) weight = DEFAULT_WEIGHT;
    plannerState.factors[ring][valence].push({ text, weight });
    renderChips(ring, valence);
    updateRingActiveState(ring);
    drawConnectors();
    updateGenerateState();
    persistPlannerState();
  }

  function removeFactor(ring, valence, index) {
    plannerState.factors[ring][valence].splice(index, 1);
    renderChips(ring, valence);
    updateRingActiveState(ring);
    drawConnectors();
    updateGenerateState();
    persistPlannerState();
  }

  layout.querySelectorAll('.planner-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { ring, valence } = btn.dataset;
      const input = layout.querySelector(`.planner-input[data-ring="${ring}"][data-valence="${valence}"]`);
      const weightSelect = layout.querySelector(`.planner-weight-select[data-ring="${ring}"][data-valence="${valence}"]`);
      addFactor(ring, valence, input.value, weightSelect.value);
      input.value = '';
      input.focus();
    });
  });

  layout.querySelectorAll('.planner-input').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const weightSelect = layout.querySelector(`.planner-weight-select[data-ring="${input.dataset.ring}"][data-valence="${input.dataset.valence}"]`);
      addFactor(input.dataset.ring, input.dataset.valence, input.value, weightSelect.value);
      input.value = '';
    });
  });

  function setFactorWeight(ring, valence, index, weight) {
    const factor = plannerState.factors[ring][valence][index];
    if (!factor) return;
    factor.weight = weight;
    renderChips(ring, valence);
    updateRingActiveState(ring);
    drawConnectors();
    persistPlannerState();
  }

  layout.addEventListener('click', e => {
    const dot = e.target.closest('.wdot');
    if (dot) {
      setFactorWeight(dot.dataset.ring, dot.dataset.valence, parseInt(dot.dataset.index, 10), parseInt(dot.dataset.value, 10));
      return;
    }
    const removeBtn = e.target.closest('.planner-chip-remove');
    if (!removeBtn) return;
    removeFactor(removeBtn.dataset.ring, removeBtn.dataset.valence, parseInt(removeBtn.dataset.index, 10));
  });

  function resetPlanner() {
    RING_ORDER.forEach(r => {
      plannerState.factors[r] = { risk: [], protective: [] };
      renderChips(r, 'risk');
      renderChips(r, 'protective');
    });
    document.getElementById('plannerOutput').hidden = true;
    document.getElementById('plannerDownloadBtn').hidden = true;
    document.getElementById('plannerDownloadHint').hidden = true;
    plannerState.currentStep = 0;
    plannerState.furthestStep = 0;
    plannerState.hasGenerated = false;
    goToStep(0);
    updateGenerateState();
    try { localStorage.removeItem(PLANNER_STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  document.getElementById('plannerGenerateBtn').addEventListener('click', generatePlan);
  document.getElementById('plannerDownloadBtn').addEventListener('click', () => window.print());
  document.getElementById('plannerResetBtn').addEventListener('click', resetPlanner);
  document.getElementById('plannerRestartLink').addEventListener('click', resetPlanner);

  document.getElementById('plannerBackBtn').addEventListener('click', () => {
    goToStep(Math.max(0, plannerState.currentStep - 1));
  });
  document.getElementById('plannerNextBtn').addEventListener('click', () => {
    goToStep(Math.min(STEP_KEYS.length - 1, plannerState.currentStep + 1));
  });
  document.querySelectorAll('.planner-step-item').forEach(item => {
    item.addEventListener('click', () => goToStep(parseInt(item.dataset.stepIndex, 10)));
  });

  window.addEventListener('resize', drawConnectors);

  // Restore any previously entered factors (and the step/output the clinician
  // was on) before landing on the current step.
  RING_ORDER.forEach(r => {
    renderChips(r, 'risk');
    renderChips(r, 'protective');
  });
  goToStep(plannerState.currentStep);
  updateGenerateState();
  if (plannerState.hasGenerated) generatePlan();
}

// Auto-drafts a Stanley-Brown-style safety plan from entered factors. Always
// flagged as a starting draft — the clinician still completes it with the client.
function buildSafetyPlanData(data, ringLabelByKey) {
  function itemsFor(rings, valence, sortByWeight) {
    const out = [];
    rings.forEach(ring => {
      plannerState.factors[ring][valence].forEach(f => out.push({ text: f.text, weight: f.weight, ring: ringLabelByKey[ring] }));
    });
    if (sortByWeight) out.sort((a, b) => b.weight - a.weight);
    return out;
  }
  return {
    sections: data.planner.safetyPlan.sections,
    disclaimer: data.planner.safetyPlan.disclaimer,
    itemsByKey: {
      warningSigns:   itemsFor(RING_ORDER, 'risk', true),
      internalCoping: itemsFor(['client'], 'protective'),
      distraction:    itemsFor(['peer', 'school'], 'protective'),
      askForHelp:     itemsFor(['family', 'peer'], 'protective'),
      professionals:  itemsFor(['community'], 'protective')
    }
  };
}

function safetyPlanHtml(data, ringLabelByKey) {
  const { sections, itemsByKey, disclaimer } = buildSafetyPlanData(data, ringLabelByKey);
  const body = sections.map(cfg => {
    if (cfg.staticText) {
      return `<div class="safety-plan-section"><h4>${cfg.title}</h4><p class="safety-plan-static">${cfg.staticText}</p></div>`;
    }
    const items = itemsByKey[cfg.key] || [];
    return `<div class="safety-plan-section"><h4>${cfg.title}</h4>${
      items.length ? `<ul>${items.map(it => `<li>${it.text} <em>(${it.ring} · ${it.weight}/5)</em></li>`).join('')}</ul>` : `<p class="safety-plan-empty">${cfg.emptyText}</p>`
    }</div>`;
  }).join('');
  return `
    <h3>${data.planner.outputHeadings.safetyPlan}</h3>
    <div class="safety-plan-disclaimer">${icon('i-shield', 'icon-sm')}<span>${disclaimer}</span></div>
    ${body}`;
}

function safetyPlanPrintHtml(data, ringLabelByKey) {
  const { sections, itemsByKey } = buildSafetyPlanData(data, ringLabelByKey);
  const items = sections.map(cfg => {
    if (cfg.staticText) return `<li><strong>${cfg.title}:</strong> ${cfg.staticText}</li>`;
    const its = itemsByKey[cfg.key] || [];
    return `<li><strong>${cfg.title}:</strong> ${its.length ? its.map(it => `${it.text} (${it.ring} · ${it.weight}/5)`).join('; ') : cfg.emptyText}</li>`;
  }).join('');
  return `<h2>${data.planner.outputHeadings.safetyPlan}</h2><ul>${items}</ul>`;
}

function generatePlan() {
  const data = plannerState.data;
  const phases = data.toolkit.tabs.roadmap.phases;
  const library = data.resourceCategories;
  const schools = data.toolkit.tabs.schools;

  const phaseScores = phases.map(() => 0);
  const notes = [];
  const resourceTriggers = {}; // resourceKey -> [{ ringLabel, valence }]
  const ringLabelByKey = {};
  data.planner.rings.forEach(r => ringLabelByKey[r.key] = r.label);

  RING_ORDER.forEach(ring => {
    ['risk', 'protective'].forEach(valence => {
      const factors = plannerState.factors[ring][valence];
      if (!factors.length) return;
      const rec = RING_RECOMMENDATIONS[ring][valence];
      const weightSum = factors.reduce((sum, f) => sum + f.weight, 0);
      const maxWeight = Math.max(...factors.map(f => f.weight));
      phaseScores[rec.phaseIndex] += weightSum;
      notes.push({ ringLabel: ringLabelByKey[ring], valence, text: rec.planNote, weight: maxWeight });
      rec.resourceKeys.forEach(key => {
        (resourceTriggers[key] = resourceTriggers[key] || []).push({ ringLabel: ringLabelByKey[ring], valence });
      });
    });
  });

  notes.sort((a, b) => b.weight - a.weight);

  const topScore = Math.max(...phaseScores);

  const RESOURCE_MAP = {
    clinician: library.find(c => c.title === 'Clinician Resources'),
    community: library.find(c => c.title === 'Community Referrals'),
    family:    library.find(c => c.title === 'Parent & Family'),
    youth:     library.find(c => c.title === 'Youth-Facing'),
    schools:   { icon: 'i-school', title: schools.heading, items: schools.items.map(it => it.title) }
  };

  const planHtml = `
    <h3>${data.planner.outputHeadings.plan}</h3>
    <div class="planner-phase-strip">
      ${phases.map((ph, i) => `
        <div class="planner-phase-card phase-${i + 1}${phaseScores[i] === topScore && topScore > 0 ? ' is-priority' : ''}">
          ${phaseScores[i] === topScore && topScore > 0 ? '<span class="planner-priority-badge">Priority focus</span>' : ''}
          <strong>${ph.title}</strong>
          <span>${ph.sessions}</span>
        </div>`).join('')}
    </div>
    <ul class="planner-notes">
      ${notes.map(n => `
        <li>
          <span class="planner-note-tag planner-note-tag-${n.valence}">${n.ringLabel} · ${n.valence === 'risk' ? 'Risk' : 'Protective'} · ${WEIGHT_LEVELS[n.weight - 1].label} (${n.weight}/5)</span>
          <p>${n.text}</p>
        </li>`).join('')}
    </ul>`;

  const resourceCards = Object.keys(resourceTriggers)
    .map(k => RESOURCE_MAP[k] && { ...RESOURCE_MAP[k], triggers: resourceTriggers[k] })
    .filter(Boolean);

  const resourcesHtml = `
    <h3>${data.planner.outputHeadings.resources}</h3>
    <div class="planner-resource-grid">
      ${resourceCards.map(resourceCardHtml).join('')}
      ${resourceCards.length === 0 ? '<p class="planner-resource-empty">Browse the full Resource Library below for vetted materials.</p>' : ''}
    </div>
    <p class="planner-resource-cta">
      Need more? <a href="resource-library.html" target="_blank" rel="noopener">Search the full Resource Library →</a>
    </p>`;

  // The Toolkit (Roadmap/Schools/Self-Care) now lives on the About page, not this
  // page — these open in a new tab so the clinician doesn't lose their in-progress plan.
  const moreHtml = `
    <h3>${data.planner.outputHeadings.more}</h3>
    <div class="planner-more-links">
      <a class="btn btn-outline" href="about.html#tab-roadmap" target="_blank" rel="noopener">Treatment Roadmap</a>
      <a class="btn btn-primary" href="resource-library.html" target="_blank" rel="noopener">Browse Full Resource Library</a>
      <a class="btn btn-outline" href="about.html#tab-schools" target="_blank" rel="noopener">Navigating Schools</a>
      <a class="btn btn-outline" href="self-care.html" target="_blank" rel="noopener">Self-Care &amp; Support</a>
    </div>`;

  document.getElementById('plannerOutputPlan').innerHTML = planHtml;
  document.getElementById('plannerOutputSafetyPlan').innerHTML = safetyPlanHtml(data, ringLabelByKey);
  document.getElementById('plannerOutputResources').innerHTML = resourcesHtml;
  document.getElementById('plannerOutputMore').innerHTML = moreHtml;
  buildPrintSheet(data, ringLabelByKey, phases, phaseScores, topScore, notes, resourceCards);

  const output = document.getElementById('plannerOutput');
  output.hidden = false;

  document.getElementById('plannerDownloadBtn').hidden = false;
  document.getElementById('plannerDownloadHint').hidden = false;
  output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  plannerState.hasGenerated = true;
  persistPlannerState();
}

function buildPrintSheet(data, ringLabelByKey, phases, phaseScores, topScore, notes, resourceCards) {
  const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const fmtFactors = list => list.map(f => `${f.text} (${f.weight}/5)`).join(', ');
  const factorsHtml = RING_ORDER.map(ring => {
    const risk = plannerState.factors[ring].risk;
    const protective = plannerState.factors[ring].protective;
    if (!risk.length && !protective.length) return '';
    return `
      <div class="print-factor-row">
        <strong>${ringLabelByKey[ring]}</strong>
        ${risk.length ? `<p>Risk: ${fmtFactors(risk)}</p>` : ''}
        ${protective.length ? `<p>Protective: ${fmtFactors(protective)}</p>` : ''}
      </div>`;
  }).join('');

  const phasesHtml = phases.map((ph, i) => `
    <li>${ph.title} (${ph.sessions})${phaseScores[i] === topScore && topScore > 0 ? ' — Priority focus' : ''}</li>`).join('');

  const notesHtml = notes.map(n => `
    <li><strong>${n.ringLabel} · ${n.valence === 'risk' ? 'Risk' : 'Protective'}:</strong> ${n.text}</li>`).join('');

  const resourcesHtml = resourceCards.length
    ? `<div class="planner-resource-grid">${resourceCards.map(resourceCardHtml).join('')}</div>`
    : '<p>See the full Resource Library in the toolkit.</p>';

  document.getElementById('plannerPrintSheet').innerHTML = `
    <h1>Client Ecological Formulation &amp; Treatment Plan</h1>
    <p class="print-date">Generated ${dateStr} — Therapist Toolkit Planning Tool</p>
    <p class="print-disclaimer">${data.planner.disclaimer}</p>

    <h2>Factors Entered</h2>
    ${factorsHtml || '<p>None entered.</p>'}

    <h2>${data.planner.outputHeadings.plan}</h2>
    <ul>${phasesHtml}</ul>
    <ul>${notesHtml}</ul>

    ${safetyPlanPrintHtml(data, ringLabelByKey)}

    <h2>${data.planner.outputHeadings.resources}</h2>
    ${resourcesHtml}`;
}

function renderFooter(data) {
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
fetch('content/site.json')
  .then(res => res.json())
  .then(data => {
    renderPlanner(data);
    renderFooter(data);
    loadPersistedPlannerState();
    initPlanner();
    initFadeObserver();
  });
