/* =============================================
   PLANNING TOOL — Client Ecological Formulation & Treatment Plan
   ============================================= */

function icon(id, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}"><use href="#${id}"/></svg>`;
}

const RESOURCE_TYPE_ICON = {
  'Assessment Tool': 'i-clipboard',
  'Worksheet': 'i-file-text',
  'Handout': 'i-book',
  'Referral List': 'i-map-pin',
  'Tip Sheet': 'i-share-2'
};

function triggerTagsHtml(triggers) {
  const unique = [...new Set(triggers.map(t => `${t.ringLabel}|${t.valence}`))].map(s => {
    const [ringLabel, valence] = s.split('|');
    return { ringLabel, valence };
  });
  return `<div class="planner-resource-triggers">${unique.map(t => `
    <span class="planner-note-tag planner-note-tag-${t.valence}">${t.ringLabel} · ${t.valence === 'risk' ? 'Risk' : 'Protective'}</span>`).join('')}</div>`;
}

function recommendedBadgeHtml() {
  return `<span class="planner-recommended-badge">${icon('i-star', 'icon-xs')}Recommended</span>`;
}

// Shared inner markup for a single resource-library item — reused by the
// Resource Plan pool, its tray, the Review page's "My Resource Plan", and
// the printable output, so all four stay visually in sync.
function resourceCardBodyHtml(c) {
  return `
    ${c.icon ? icon(c.icon) : ''}
    <div>
      ${c.matched ? recommendedBadgeHtml() : ''}
      <span class="planner-resource-type">${c.type}</span>
      <strong>${c.title}</strong>
      ${c.triggers.length ? triggerTagsHtml(c.triggers) : ''}
      <p class="planner-resource-desc">${c.description}</p>
    </div>`;
}

function resourceCardHtml(c) {
  return `<div class="planner-resource-card${c.matched ? ' is-recommended' : ''}">${resourceCardBodyHtml(c)}</div>`;
}

// ── Planner: Client Ecological Formulation & Treatment Plan ──
const RING_ORDER = ['community', 'school', 'family', 'peer', 'client'];
// Two curation steps sit between entering factors and the final review: pick
// the top 3 contributors, then build a downloadable resource plan.
const STEP_KEYS = [...RING_ORDER, 'topFactors', 'resourcePlan', 'review'];
const NON_RING_STEP_KEYS = ['topFactors', 'resourcePlan', 'review'];

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

// ── Ecological map geometry — the whole diagram (rings, ring labels, risk/
// protective pills, connector lines) is one self-contained SVG computed
// entirely in viewBox units, so it scales as a single unit and the exact
// same markup can be reused for the printed/downloaded plan. ──
const MAP_VB_W = 1000;
const MAP_RING_CX = 500;
// Outer rings are compressed more than inner ones (not an even step) so the
// overall circle reads smaller without shrinking the client ring back down
// to a size that made "current context" overflow it.
const MAP_RING_RADII = { community: 182, school: 154, family: 122, peer: 86, client: 46 };
const MAP_RING_MAX_R = MAP_RING_RADII.community; // anchors the pill zone just outside the outermost ring
const MAP_PILL_SLOT_H = 46;
const MAP_PILL_H = 36;
const MAP_PILL_MIN_W = 90;
const MAP_PILL_MAX_W = 220;
const MAP_PILL_MAX_CHARS = 20;
const MAP_PILL_CHAR_W = 8;
const MAP_PILL_GAP = 36; // gap between the outer ring's edge and the pill zone

function mapRingRadius(ring) {
  return MAP_RING_RADII[ring];
}

// Midpoint radius between a ring and the next ring inward — where that
// ring's curved label sits, so it reads inside its own band instead of
// overlapping the ring line or the next label out.
function mapRingLabelRadius(ring) {
  // Uppercase glyphs sit above their baseline, so placing the arc at the
  // band's midpoint left the text hugging the outer line with empty space
  // below it. Anchor the baseline near the inner line instead — the glyphs
  // then grow upward into the band, reading close to its bottom edge.
  const i = RING_ORDER.indexOf(ring);
  const innerRing = RING_ORDER[i + 1];
  const nudge = ring === 'community' ? 4 : 0; // sits a hair high otherwise — pull it down slightly
  return mapRingRadius(innerRing) + 14 - nudge;
}

// Same "balanced fan" solve used before: aim for an even vertical spread
// (community highest, client lowest) and work out whatever angle each
// ring's own radius needs to actually reach it, so every connector line
// lands on its own ring instead of clustering in one half of the circle.
function mapRingAngleRad(ring, valence) {
  const r = mapRingRadius(ring);
  const i = RING_ORDER.indexOf(ring);
  const targetY = (i - 2) * 34;
  const sinA = Math.max(-0.92, Math.min(0.92, targetY / r));
  return valence === 'risk' ? Math.PI - Math.asin(sinA) : Math.asin(sinA);
}

function escapeXml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function mapTruncate(text) {
  if (text.length <= MAP_PILL_MAX_CHARS) return text;
  return text.slice(0, MAP_PILL_MAX_CHARS - 1) + '…';
}

function mapPillWidth(text) {
  const w = text.length * MAP_PILL_CHAR_W + 56; // + room for weight dots and padding
  return Math.max(MAP_PILL_MIN_W, Math.min(MAP_PILL_MAX_W, w));
}

function mapRingVisual(ring) {
  const riskFactors = plannerState.factors[ring].risk;
  const protFactors = plannerState.factors[ring].protective;
  const hasRisk = riskFactors.length > 0, hasProt = protFactors.length > 0;
  const riskMax = hasRisk ? Math.max(...riskFactors.map(f => f.weight)) : 0;
  const protMax = hasProt ? Math.max(...protFactors.map(f => f.weight)) : 0;
  const overallMax = Math.max(riskMax, protMax);
  let stroke = 'var(--cream-dark)';
  if (hasRisk && hasProt) stroke = 'var(--teal)';
  else if (hasRisk) stroke = CHIP_COLOR_BY_WEIGHT.risk[riskMax];
  else if (hasProt) stroke = CHIP_COLOR_BY_WEIGHT.protective[protMax];
  return { stroke, strokeWidth: overallMax ? RING_STROKE_BY_WEIGHT[overallMax] : RING_STROKE_DEFAULT, hasRisk, hasProt };
}

// Builds the full map as one <svg> markup string — reused identically for
// the on-screen wizard/review AND the printed plan (no stripped-down copy).
function buildEcoMapSvg(opts) {
  opts = opts || {};
  const currentRing = opts.currentRing || null;
  const locked = !!opts.locked;
  const idPrefix = opts.idPrefix || 'map';
  const p = plannerState.data.planner;

  function pillsFor(valence) {
    const list = [];
    RING_ORDER.forEach(ring => {
      plannerState.factors[ring][valence].forEach((f, idx) => {
        list.push({ ring, idx, id: f.id, text: f.text, weight: f.weight });
      });
    });
    return list;
  }
  const riskPills = pillsFor('risk');
  const protPills = pillsFor('protective');
  const maxCount = Math.max(riskPills.length, protPills.length, 1);
  const vbH = Math.max(560, maxCount * MAP_PILL_SLOT_H + 90);
  const cx = MAP_RING_CX, cy = vbH / 2;

  const ringsSvg = RING_ORDER.map(ring => {
    const r = mapRingRadius(ring);
    const v = mapRingVisual(ring);
    const dash = ring === currentRing ? ' stroke-dasharray="5 3"' : '';
    return `<circle class="planner-ring" data-ring="${ring}" cx="${cx}" cy="${cy}" r="${r}" style="stroke:${v.stroke}" stroke-width="${v.strokeWidth}"${dash}/>`;
  }).join('');

  const currentIndicator = currentRing
    ? `<circle class="planner-current-step-ring" cx="${cx}" cy="${cy}" r="${mapRingRadius(currentRing) + 7}"/>`
    : '';

  // Each label curves along the midline of its own ring's band (rather than
  // sitting as straight text above the ring) so it reads inside that
  // section without overlapping the band above it.
  const labelsSvg = RING_ORDER.filter(r => r !== 'client').map(ring => {
    const labelR = mapRingLabelRadius(ring);
    const hasFactors = plannerState.factors[ring].risk.length || plannerState.factors[ring].protective.length;
    const label = (plannerState.ringLabelByKey[ring] || ring).toUpperCase();
    const pathId = `${idPrefix}-labelarc-${ring}`;
    return `
      <path id="${pathId}" d="M ${(cx - labelR).toFixed(1)} ${cy} A ${labelR} ${labelR} 0 0 1 ${(cx + labelR).toFixed(1)} ${cy}" fill="none" stroke="none"/>
      <text class="planner-ring-label${hasFactors ? ' has-factors' : ''}" data-ring="${ring}">
        <textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${escapeXml(label)}</textPath>
      </text>`;
  }).join('');

  const centerSvg = `
    <text class="planner-center-label" x="${cx}" y="${cy - 4}" text-anchor="middle">${escapeXml(p.centerLabel)}</text>
    <text class="planner-center-sub" x="${cx}" y="${cy + 13}" text-anchor="middle">${escapeXml(p.centerSub)}</text>`;

  function sideSvg(pills, valence) {
    const n = pills.length;
    const startY = cy - ((n - 1) * MAP_PILL_SLOT_H) / 2;
    let lines = '', pillsHtml = '';
    pills.forEach((item, i) => {
      const y = startY + i * MAP_PILL_SLOT_H;
      const text = mapTruncate(item.text);
      const w = mapPillWidth(text);
      const color = CHIP_COLOR_BY_WEIGHT[valence][item.weight];
      const textColor = item.weight >= 5 ? '#FFFFFF' : (valence === 'risk' ? 'hsl(6,55%,24%)' : 'hsl(112,35%,20%)');
      const angle = mapRingAngleRad(item.ring, valence);
      const ringR = mapRingRadius(item.ring);
      const endX = cx + ringR * Math.cos(angle);
      const endY = cy + ringR * Math.sin(angle);
      const style = CONNECTOR_STYLE_BY_WEIGHT[item.weight] || CONNECTOR_STYLE_BY_WEIGHT[DEFAULT_WEIGHT];
      const pillX = valence === 'risk' ? (MAP_RING_CX - MAP_RING_MAX_R - MAP_PILL_GAP - w) : (MAP_RING_CX + MAP_RING_MAX_R + MAP_PILL_GAP);
      const lineStartX = valence === 'risk' ? pillX + w : pillX;
      const textX = pillX + 14;
      const removeX = valence === 'risk' ? pillX - 12 : pillX + w + 12;

      lines += `<line class="planner-connector planner-connector-${valence}" data-ring="${item.ring}" x1="${lineStartX}" y1="${y}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}" stroke-width="${style.width}" stroke-opacity="${style.opacity}"${style.dash ? ` stroke-dasharray="${style.dash}"` : ''} style="stroke:${color}"/>`;

      // Each dot gets a generously-sized invisible hit circle around the small
      // visible one, so the weight is actually clickable/tappable and not
      // just a tiny 2-3px target.
      const dots = Array.from({ length: 5 }, (_, di) => {
        const dotX = valence === 'risk' ? (pillX + 21 + di * 10) : (pillX + w - 21 - (4 - di) * 10);
        const dotY = y + 12;
        return `
          <g class="eco-wdot-hit" data-ring="${item.ring}" data-valence="${valence}" data-index="${item.idx}" data-value="${di + 1}">
            <circle cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="8" fill="transparent"/>
            <circle class="eco-wdot${di < item.weight ? ' filled' : ''}" cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="3.2"/>
          </g>`;
      }).join('');

      const removeBtn = locked ? '' : `
        <g class="eco-pill-remove" data-ring="${item.ring}" data-valence="${valence}" data-index="${item.idx}" transform="translate(${removeX.toFixed(1)},${y.toFixed(1)})">
          <circle r="9" fill="transparent"/>
          <line x1="-4" y1="-4" x2="4" y2="4"/><line x1="-4" y1="4" x2="4" y2="-4"/>
        </g>`;

      pillsHtml += `
        <g class="eco-pill" data-ring="${item.ring}" style="color:${textColor}">
          <rect x="${pillX.toFixed(1)}" y="${(y - MAP_PILL_H / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${MAP_PILL_H}" rx="${MAP_PILL_H / 2}" fill="${color}"/>
          <text x="${textX.toFixed(1)}" y="${(y + 6).toFixed(1)}" fill="${textColor}">${escapeXml(text)}</text>
          ${dots}${removeBtn}
        </g>`;
    });
    return { lines, pillsHtml };
  }

  const riskSide = sideSvg(riskPills, 'risk');
  const protSide = sideSvg(protPills, 'protective');

  return `<svg viewBox="0 0 ${MAP_VB_W} ${vbH}" class="planner-eco-svg${locked ? ' is-locked' : ''}" role="img" aria-label="Concentric circle diagram of client ecological formulation">
    ${riskSide.lines}${protSide.lines}
    ${ringsSvg}${currentIndicator}
    ${labelsSvg}${centerSvg}
    ${riskSide.pillsHtml}${protSide.pillsHtml}
  </svg>`;
}

const SAFETY_PLAN_KEYS = ['warningSigns', 'internalCoping', 'distraction', 'askForHelp', 'professionals', 'environment'];

const plannerState = {
  data: null, resourcesData: null, factors: {}, currentStep: 0, furthestStep: 0, hasGenerated: false,
  nextFactorId: 1, // stable per-factor id so the top-3 picker can track a factor across re-renders
  topContributors: { risk: [null, null, null], protective: [null, null, null] },
  resourcePlan: [], // array of resource-card keys the clinician dragged into their plan
  safetyPlanItems: {}, // editable, typed safety-plan content — same shape as the standalone tool
  safetyPlanSeeded: false, // auto-fills once from entered factors, then it's fully the clinician's own
  safetyPlanPicked: null, // { key, index, text } — transient click-to-move state, not persisted
  ringLabelByKey: {}
};
SAFETY_PLAN_KEYS.forEach(k => { plannerState.safetyPlanItems[k] = []; });
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
      hasGenerated: plannerState.hasGenerated,
      nextFactorId: plannerState.nextFactorId,
      topContributors: plannerState.topContributors,
      resourcePlan: plannerState.resourcePlan,
      safetyPlanItems: plannerState.safetyPlanItems,
      safetyPlanSeeded: plannerState.safetyPlanSeeded
    }));
  } catch (e) { /* localStorage unavailable (private browsing, quota, etc.) — fail silently */ }
}

function loadPersistedPlannerState() {
  try {
    const raw = localStorage.getItem(PLANNER_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved || !saved.factors) return;
    plannerState.nextFactorId = saved.nextFactorId || 1;
    // Upgrade factors saved before weighting/ids existed (plain strings, or
    // objects missing an id) into the current {id, text, weight} shape.
    const toFactor = f => {
      if (typeof f === 'string') f = { text: f, weight: DEFAULT_WEIGHT };
      if (!f.id) f.id = plannerState.nextFactorId++;
      return f;
    };
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
    if (saved.topContributors) {
      const fix = list => {
        const clean = Array.isArray(list) ? list.slice(0, 3) : [];
        while (clean.length < 3) clean.push(null);
        return clean;
      };
      plannerState.topContributors = {
        risk: fix(saved.topContributors.risk),
        protective: fix(saved.topContributors.protective)
      };
    }
    if (Array.isArray(saved.resourcePlan)) plannerState.resourcePlan = saved.resourcePlan;
    if (saved.safetyPlanItems) {
      SAFETY_PLAN_KEYS.forEach(k => {
        if (Array.isArray(saved.safetyPlanItems[k])) plannerState.safetyPlanItems[k] = saved.safetyPlanItems[k];
      });
    }
    plannerState.safetyPlanSeeded = !!saved.safetyPlanSeeded;

    // Self-heal browsers that got stuck "seeded" with nothing in it (e.g. from
    // reaching Review before any factors existed, under an earlier version of
    // this guard) — if there's real factor data now but the safety plan is
    // still completely empty, let it seed for real on the next regenerate.
    const hasAnyFactor = RING_ORDER.some(r => plannerState.factors[r].risk.length || plannerState.factors[r].protective.length);
    const hasAnySafetyPlanItem = SAFETY_PLAN_KEYS.some(k => plannerState.safetyPlanItems[k].length > 0);
    if (plannerState.safetyPlanSeeded && !hasAnySafetyPlanItem && hasAnyFactor) {
      plannerState.safetyPlanSeeded = false;
    }
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
  plannerState.ringLabelByKey = {};
  p.rings.forEach(r => { plannerState.ringLabelByKey[r.key] = r.label; });

  document.getElementById('plannerLabel').textContent = p.sectionLabel;
  document.getElementById('plannerHeading').textContent = p.heading;
  document.getElementById('plannerIntro').textContent = p.intro;
  document.getElementById('plannerDisclaimer').innerHTML = `${icon('i-shield', 'icon-sm')}<span>${p.disclaimer}</span>`;
  document.getElementById('plannerRiskLabel').textContent = p.riskColumnLabel;
  document.getElementById('plannerProtectiveLabel').textContent = p.protectiveColumnLabel;
  document.getElementById('plannerRestartLink').textContent = p.resetButtonLabel;
  document.getElementById('plannerDownloadBtn').textContent = p.downloadButtonLabel;
  document.getElementById('plannerDownloadHint').textContent = p.downloadHint;
  document.getElementById('plannerEmptyState').textContent = p.emptyStateText;
  document.getElementById('plannerBackBtn').textContent = p.backButtonLabel;

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
      </div>`).join('');
  }

  document.getElementById('plannerRiskRows').innerHTML = rowsHtml('risk');
  document.getElementById('plannerProtectiveRows').innerHTML = rowsHtml('protective');

  const stepLabels = p.rings.map(r => r.label).concat(['Top 3', 'Resources', 'Review']);
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
      const isNonRingStep = NON_RING_STEP_KEYS.includes(item.dataset.ring);
      item.classList.toggle('is-ring-match', active && item.dataset.ring === ring);
      item.classList.toggle('is-ring-dim', active && !isNonRingStep && item.dataset.ring !== ring);
    });
    document.querySelectorAll('.planner-ring-label[data-ring]').forEach(lbl => {
      lbl.classList.toggle('is-ring-match', active && lbl.dataset.ring === ring);
      lbl.classList.toggle('is-ring-dim', active && lbl.dataset.ring !== ring);
    });
    document.querySelectorAll('.planner-ring[data-ring]').forEach(el => {
      el.classList.toggle('is-ring-match', active && el.dataset.ring === ring);
      el.classList.toggle('is-ring-dim', active && el.dataset.ring !== ring);
    });
    document.querySelectorAll('.planner-connector[data-ring]').forEach(line => {
      line.classList.toggle('is-ring-match', active && line.dataset.ring === ring);
      line.classList.toggle('is-ring-dim', active && line.dataset.ring !== ring);
    });
    document.querySelectorAll('.eco-pill[data-ring]').forEach(pill => {
      pill.classList.toggle('is-ring-match', active && pill.dataset.ring === ring);
      pill.classList.toggle('is-ring-dim', active && pill.dataset.ring !== ring);
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
    if (stepItem && !NON_RING_STEP_KEYS.includes(stepItem.dataset.ring)) return stepItem.dataset.ring;
    const label = target.closest('.planner-row > label, .planner-ring-label[data-ring]');
    if (label) return label.dataset.ring || label.closest('.planner-row').dataset.ring;
    const ring = target.closest('.planner-ring[data-ring], .eco-pill[data-ring]');
    if (ring) return ring.dataset.ring;
    return null;
  }
  if (plannerSection) {
    plannerSection.addEventListener('mouseover', e => {
      const ring = ringFromHoverTarget(e.target);
      if (ring) setReviewHighlight(ring);
    });
    plannerSection.addEventListener('mouseout', e => {
      const hoverable = e.target.closest('.planner-step-item[data-ring], .planner-row > label, .planner-ring-label[data-ring], .planner-ring[data-ring], .eco-pill[data-ring]');
      if (!hoverable || hoverable.contains(e.relatedTarget)) return;
      setReviewHighlight(null);
    });
    plannerSection.addEventListener('focusin', e => {
      const stepItem = e.target.closest('.planner-step-item[data-ring]');
      if (stepItem && !NON_RING_STEP_KEYS.includes(stepItem.dataset.ring)) setReviewHighlight(stepItem.dataset.ring);
    });
    plannerSection.addEventListener('focusout', e => {
      if (e.target.closest('.planner-step-item[data-ring]')) setReviewHighlight(null);
    });
  }

  // Rebuilds the whole map SVG from current state and re-applies whatever
  // hover highlight was active — this one call replaces the old separate
  // chip-render / ring-color / connector-line / current-step-indicator steps,
  // since the entire map now regenerates together as a single unit.
  function renderEcoMap() {
    const container = document.getElementById('plannerEcoMap');
    if (!container) return;
    const stepKey = STEP_KEYS[plannerState.currentStep];
    const onReview = stepKey === 'review';
    const currentRing = RING_ORDER.includes(stepKey) ? stepKey : null;
    container.innerHTML = buildEcoMapSvg({ currentRing, locked: onReview, idPrefix: 'live' });
    applyReviewHighlight(reviewHighlightState.ring);
  }

  function updateGenerateState() {
    const any = RING_ORDER.some(r => plannerState.factors[r].risk.length || plannerState.factors[r].protective.length);
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

  function goToStep(index) {
    if (index < 0 || index > STEP_KEYS.length - 1) return;
    plannerState.currentStep = index;
    plannerState.furthestStep = Math.max(plannerState.furthestStep, index);

    const stepKey = STEP_KEYS[index];
    const isRingStep = RING_ORDER.includes(stepKey);
    const isTopFactorsStep = stepKey === 'topFactors';
    const isResourcePlanStep = stepKey === 'resourcePlan';
    const onReview = stepKey === 'review';

    reviewHighlightState.ring = null;
    applyReviewHighlight(null);

    // Only an actual ring step narrows the risk/protective rows down to one
    // ring — every other step (including the two curation steps) shows the
    // full map as context, with its own module appearing beneath it.
    document.querySelectorAll('.planner-row').forEach(row => {
      row.classList.toggle('step-hidden', isRingStep && row.dataset.ring !== stepKey);
    });

    document.getElementById('plannerStepNav').hidden = onReview;
    document.getElementById('plannerActions').hidden = !onReview;
    document.getElementById('plannerDownloadHint').hidden = !onReview;
    // The generated plan only belongs on Review — once you've generated it,
    // it shouldn't keep trailing along at the bottom of every other step.
    document.getElementById('plannerOutput').hidden = !(onReview && plannerState.hasGenerated);
    // The add-factor forms only belong on ring steps — Review has nothing left
    // to add, and both curation steps (Top 3, Resources) stand on their own.
    document.getElementById('plannerLayout').hidden = isTopFactorsStep || isResourcePlanStep || onReview;
    // The ecological map belongs on ring steps and Review — both curation
    // steps (Top 3, Resources) stand on their own without it.
    document.getElementById('plannerEcoMapWrap').hidden = isTopFactorsStep || isResourcePlanStep;
    document.getElementById('plannerTopFactorsSection').hidden = !isTopFactorsStep;
    document.getElementById('plannerResourcePlanSection').hidden = !isResourcePlanStep;

    if (isTopFactorsStep) renderTopFactorsStep();
    if (isResourcePlanStep) {
      // Top 3 is only editable on its own step — here it's a clean, read-only
      // recap (same format as Review) above the resource pool/tray.
      document.getElementById('plannerResourceStepTopSummary').innerHTML = topContributorsHtml();
      renderResourcePlanStep();
    }

    // Review gets the same "Step X of Y: Label" header as every other step —
    // no separate custom heading/intro.
    let title, hint;
    if (onReview) {
      title = `Step ${index + 1} of ${STEP_KEYS.length}: Review`;
      hint = '';
    } else if (isRingStep) {
      const ringData = p.rings.find(r => r.key === stepKey);
      title = `Step ${index + 1} of ${STEP_KEYS.length}: ${ringData.label}`;
      hint = p.stepHint;
    } else if (isTopFactorsStep) {
      title = `Step ${index + 1} of ${STEP_KEYS.length}: Top Contributors`;
      hint = 'Drag — or click — your top 3 risk factors and top 3 protective factors into the boxes below.';
    } else {
      title = `Step ${index + 1} of ${STEP_KEYS.length}: Resource Plan`;
      hint = 'Drag — or click the + on — resources to add them to your plan. Download it on the next step.';
    }
    document.getElementById('plannerStepTitle').textContent = title;
    document.getElementById('plannerStepHint').textContent = hint;

    if (!onReview) {
      document.getElementById('plannerBackBtn').hidden = index === 0;
      // The step right before Review doubles as "Generate" — one click both
      // reviews and generates the plan, instead of a separate button on Review.
      document.getElementById('plannerNextBtn').textContent = index === STEP_KEYS.length - 2 ? p.generateButtonLabel : p.nextButtonLabel;
    }

    renderStepperState();
    renderEcoMap();
    persistPlannerState();

    // Review IS the generated output now — keep it current every time you land here.
    if (onReview) generatePlan();
  }

  // The factor rows stay visible (as reference) on both curation steps, so
  // adding/removing/reweighting a factor from there must refresh whichever
  // curation step is currently showing — otherwise its pool goes stale.
  function refreshActiveCurationStep() {
    const key = STEP_KEYS[plannerState.currentStep];
    if (key === 'topFactors') renderTopFactorsStep();
    if (key === 'resourcePlan') renderResourcePlanStep();
    // Review shows the generated plan directly, so an edit made there (the
    // factor rows stay visible/editable on Review) needs to regenerate it.
    if (key === 'review') generatePlan();
  }

  function addFactor(ring, valence, text, weight) {
    text = text.trim();
    if (!text) return;
    weight = parseInt(weight, 10);
    if (!weight || weight < 1 || weight > 5) weight = DEFAULT_WEIGHT;
    plannerState.factors[ring][valence].push({ id: plannerState.nextFactorId++, text, weight });
    renderEcoMap();
    updateGenerateState();
    refreshActiveCurationStep();
    persistPlannerState();
  }

  function removeFactor(ring, valence, index) {
    const removed = plannerState.factors[ring][valence][index];
    plannerState.factors[ring][valence].splice(index, 1);
    // A removed factor can't stay picked as a top contributor.
    if (removed) {
      const slots = plannerState.topContributors[valence];
      const slotIndex = slots.indexOf(removed.id);
      if (slotIndex !== -1) slots[slotIndex] = null;
    }
    renderEcoMap();
    updateGenerateState();
    refreshActiveCurationStep();
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
    factor.weight = parseInt(weight, 10);
    renderEcoMap();
    refreshActiveCurationStep();
    persistPlannerState();
  }

  const ecoMapEl = document.getElementById('plannerEcoMap');
  if (ecoMapEl) {
    ecoMapEl.addEventListener('click', e => {
      const dot = e.target.closest('.eco-wdot-hit');
      if (dot) {
        setFactorWeight(dot.dataset.ring, dot.dataset.valence, parseInt(dot.dataset.index, 10), parseInt(dot.dataset.value, 10));
        return;
      }
      const removeBtn = e.target.closest('.eco-pill-remove');
      if (!removeBtn) return;
      removeFactor(removeBtn.dataset.ring, removeBtn.dataset.valence, parseInt(removeBtn.dataset.index, 10));
    });
  }

  // ── Step: Top Contributors — drag (or click) the top 3 risk and top 3
  // protective factors, pooled from every ring, into the selected slots. ──
  function findFactorById(valence, id) {
    for (const ring of RING_ORDER) {
      const f = plannerState.factors[ring][valence].find(x => x.id === id);
      if (f) return { ...f, ring, ringLabel: plannerState.ringLabelByKey[ring] };
    }
    return null;
  }

  function renderTopFactorsStep() {
    const section = document.getElementById('plannerTopFactorsSection');
    if (!section) return;

    const poolChipHtml = f => `
      <span class="planner-chip planner-chip-${f.valence} w${f.weight} planner-pool-chip" draggable="true" data-id="${f.id}" data-valence="${f.valence}">
        <span class="planner-chip-text">${f.text}</span>
        <span class="planner-chip-ring-tag">${f.ringLabel}</span>
      </span>`;

    ['risk', 'protective'].forEach(valence => {
      const slots = plannerState.topContributors[valence];
      const selectedIds = new Set(slots.filter(id => id !== null));
      const pool = [];
      RING_ORDER.forEach(ring => {
        plannerState.factors[ring][valence].forEach(f => {
          if (!selectedIds.has(f.id)) pool.push({ ...f, valence, ring, ringLabel: plannerState.ringLabelByKey[ring] });
        });
      });

      const poolEl = document.getElementById(valence === 'risk' ? 'plannerRiskPool' : 'plannerProtectivePool');
      poolEl.innerHTML = pool.length
        ? pool.map(poolChipHtml).join('')
        : `<p class="planner-pool-empty">No ${valence === 'risk' ? 'risk' : 'protective'} factors entered yet — add some in the steps above.</p>`;

      const slotsEl = document.getElementById(valence === 'risk' ? 'plannerRiskSlots' : 'plannerProtectiveSlots');
      slotsEl.innerHTML = slots.map((id, i) => {
        const found = id !== null ? findFactorById(valence, id) : null;
        if (!found) {
          return `<div class="planner-slot" data-valence="${valence}" data-slot-index="${i}">
            <span class="planner-slot-num">${i + 1}</span>
            <span class="planner-slot-hint">Drag or click a ${valence === 'risk' ? 'risk' : 'protective'} factor</span>
          </div>`;
        }
        return `<div class="planner-slot is-filled" data-valence="${valence}" data-slot-index="${i}">
          <span class="planner-slot-num">${i + 1}</span>
          <span class="planner-chip planner-chip-${valence} w${found.weight}">
            <span class="planner-chip-text">${found.text}</span>
            <span class="planner-chip-ring-tag">${found.ringLabel}</span>
            <button type="button" class="planner-chip-remove" data-clear-slot="${valence}:${i}" aria-label="Remove">${icon('i-x', 'icon-xs')}</button>
          </span>
        </div>`;
      }).join('');
    });
  }

  function placeTopContributor(valence, factorId, slotIndex) {
    const slots = plannerState.topContributors[valence];
    if (slots.includes(factorId)) return;
    const targetIndex = slotIndex !== undefined ? slotIndex : slots.indexOf(null);
    if (targetIndex === -1 || targetIndex === undefined) return;
    slots[targetIndex] = factorId;
    renderTopFactorsStep();
    persistPlannerState();
  }

  function clearTopContributor(valence, slotIndex) {
    plannerState.topContributors[valence][slotIndex] = null;
    renderTopFactorsStep();
    persistPlannerState();
  }

  const topFactorsSection = document.getElementById('plannerTopFactorsSection');
  if (topFactorsSection) {
    topFactorsSection.addEventListener('click', e => {
      const clearBtn = e.target.closest('[data-clear-slot]');
      if (clearBtn) {
        const [valence, idx] = clearBtn.dataset.clearSlot.split(':');
        clearTopContributor(valence, parseInt(idx, 10));
        return;
      }
      const poolChip = e.target.closest('.planner-pool-chip');
      if (poolChip) placeTopContributor(poolChip.dataset.valence, parseInt(poolChip.dataset.id, 10));
    });
    topFactorsSection.addEventListener('dragstart', e => {
      const chip = e.target.closest('.planner-pool-chip');
      if (!chip) return;
      e.dataTransfer.setData('text/plain', JSON.stringify({ id: parseInt(chip.dataset.id, 10), valence: chip.dataset.valence }));
      e.dataTransfer.effectAllowed = 'move';
    });
    topFactorsSection.addEventListener('dragover', e => {
      const slot = e.target.closest('.planner-slot');
      if (!slot) return;
      e.preventDefault();
      slot.classList.add('is-over');
    });
    topFactorsSection.addEventListener('dragleave', e => {
      const slot = e.target.closest('.planner-slot');
      if (slot) slot.classList.remove('is-over');
    });
    topFactorsSection.addEventListener('drop', e => {
      const slot = e.target.closest('.planner-slot');
      if (!slot) return;
      e.preventDefault();
      slot.classList.remove('is-over');
      let payload;
      try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return; }
      if (!payload || payload.valence !== slot.dataset.valence) return;
      placeTopContributor(payload.valence, payload.id, parseInt(slot.dataset.slotIndex, 10));
    });
  }

  // ── Step: Resource Plan — drag (or click +) matched resources into a tray
  // that gets saved and included in the downloadable plan. ──
  function resourcePoolCardHtml(c) {
    return `
      <div class="planner-resource-card planner-resource-pool-card${c.matched ? ' is-recommended' : ''}" draggable="true" data-key="${c.key}">
        ${resourceCardBodyHtml(c)}
        <button type="button" class="planner-resource-add" data-add-key="${c.key}" aria-label="Add to plan">${icon('i-plus', 'icon-xs')}</button>
      </div>`;
  }

  function resourceTrayCardHtml(c) {
    return `
      <div class="planner-resource-card planner-resource-tray-card${c.matched ? ' is-recommended' : ''}" data-key="${c.key}">
        ${resourceCardBodyHtml(c)}
        <button type="button" class="planner-chip-remove" data-remove-key="${c.key}" aria-label="Remove from plan">${icon('i-x', 'icon-xs')}</button>
      </div>`;
  }

  function renderResourcePlanStep() {
    const section = document.getElementById('plannerResourcePlanSection');
    if (!section) return;
    const allCards = computeResourceCards();
    const selectedKeys = new Set(plannerState.resourcePlan);

    const poolEl = document.getElementById('plannerResourcePool');
    const poolCards = allCards.filter(c => !selectedKeys.has(c.key));
    poolEl.innerHTML = poolCards.length
      ? poolCards.map(resourcePoolCardHtml).join('')
      : `<p class="planner-pool-empty">All resources are already in your plan.</p>`;

    const trayEl = document.getElementById('plannerResourceTray');
    const trayCards = plannerState.resourcePlan.map(k => allCards.find(c => c.key === k)).filter(Boolean);
    trayEl.innerHTML = trayCards.map(resourceTrayCardHtml).join('');
    document.getElementById('plannerTrayEmptyHint').style.display = trayCards.length ? 'none' : 'block';
  }

  function addToResourcePlan(key) {
    if (!key || plannerState.resourcePlan.includes(key)) return;
    plannerState.resourcePlan.push(key);
    renderResourcePlanStep();
    persistPlannerState();
  }

  function removeFromResourcePlan(key) {
    plannerState.resourcePlan = plannerState.resourcePlan.filter(k => k !== key);
    renderResourcePlanStep();
    persistPlannerState();
  }

  const resourcePlanSection = document.getElementById('plannerResourcePlanSection');
  if (resourcePlanSection) {
    resourcePlanSection.addEventListener('click', e => {
      const addBtn = e.target.closest('[data-add-key]');
      if (addBtn) { addToResourcePlan(addBtn.dataset.addKey); return; }
      const removeBtn = e.target.closest('[data-remove-key]');
      if (removeBtn) removeFromResourcePlan(removeBtn.dataset.removeKey);
    });
    resourcePlanSection.addEventListener('dragstart', e => {
      const card = e.target.closest('.planner-resource-pool-card');
      if (card) e.dataTransfer.setData('text/plain', card.dataset.key);
    });
    const trayEl = document.getElementById('plannerResourceTray');
    trayEl.addEventListener('dragover', e => { e.preventDefault(); trayEl.classList.add('is-over'); });
    trayEl.addEventListener('dragleave', () => trayEl.classList.remove('is-over'));
    trayEl.addEventListener('drop', e => {
      e.preventDefault();
      trayEl.classList.remove('is-over');
      addToResourcePlan(e.dataTransfer.getData('text/plain'));
    });
  }

  // ── Draft Safety Plan editor on Review — typeable, same list pattern as
  // the standalone Make A Safety Plan tool. ──
  function addSafetyPlanItem(key, text) {
    text = text.trim();
    if (!text) return;
    plannerState.safetyPlanItems[key].push(text);
    document.getElementById('plannerOutputSafetyPlan').innerHTML = safetyPlanEditorHtml(plannerState.data);
    persistPlannerState();
  }

  function removeSafetyPlanItem(key, index) {
    plannerState.safetyPlanItems[key].splice(index, 1);
    if (plannerState.safetyPlanPicked && plannerState.safetyPlanPicked.key === key && plannerState.safetyPlanPicked.index === index) {
      plannerState.safetyPlanPicked = null;
    }
    document.getElementById('plannerOutputSafetyPlan').innerHTML = safetyPlanEditorHtml(plannerState.data);
    persistPlannerState();
  }

  // Moves an item from one safety-plan section to another — e.g. an
  // auto-seeded factor that really belongs under a different heading.
  function moveSafetyPlanItem(fromKey, fromIndex, toKey) {
    if (fromKey === toKey) return;
    const fromList = plannerState.safetyPlanItems[fromKey];
    if (!fromList || fromIndex < 0 || fromIndex >= fromList.length) return;
    const [text] = fromList.splice(fromIndex, 1);
    plannerState.safetyPlanItems[toKey].push(text);
    plannerState.safetyPlanPicked = null;
    document.getElementById('plannerOutputSafetyPlan').innerHTML = safetyPlanEditorHtml(plannerState.data);
    persistPlannerState();
  }

  const safetyPlanOutputEl = document.getElementById('plannerOutputSafetyPlan');
  if (safetyPlanOutputEl) {
    safetyPlanOutputEl.addEventListener('click', e => {
      const addBtn = e.target.closest('[data-sp-add]');
      if (addBtn) {
        const key = addBtn.dataset.spAdd;
        const input = safetyPlanOutputEl.querySelector(`.sp-editor-input[data-sp-key="${key}"]`);
        addSafetyPlanItem(key, input.value);
        input.value = '';
        input.focus();
        return;
      }
      const removeBtn = e.target.closest('[data-sp-remove]');
      if (removeBtn) {
        const [key, idx] = removeBtn.dataset.spRemove.split(':');
        removeSafetyPlanItem(key, parseInt(idx, 10));
        return;
      }
      // Touch-friendly move: tap a chip to pick it up, tap a different
      // section to drop it there (or tap the same chip again to cancel).
      const chip = e.target.closest('.sp-movable-chip');
      if (chip) {
        const key = chip.dataset.spOriginKey;
        const index = parseInt(chip.dataset.spOriginIndex, 10);
        const picked = plannerState.safetyPlanPicked;
        if (picked && picked.key === key && picked.index === index) {
          plannerState.safetyPlanPicked = null;
        } else {
          plannerState.safetyPlanPicked = { key, index, text: plannerState.safetyPlanItems[key][index] };
        }
        document.getElementById('plannerOutputSafetyPlan').innerHTML = safetyPlanEditorHtml(plannerState.data);
        return;
      }
      const section = e.target.closest('.safety-plan-section');
      if (section && plannerState.safetyPlanPicked) {
        const picked = plannerState.safetyPlanPicked;
        if (section.dataset.spSection !== picked.key) {
          moveSafetyPlanItem(picked.key, picked.index, section.dataset.spSection);
        } else {
          plannerState.safetyPlanPicked = null;
          document.getElementById('plannerOutputSafetyPlan').innerHTML = safetyPlanEditorHtml(plannerState.data);
        }
      }
    });
    safetyPlanOutputEl.addEventListener('keydown', e => {
      const input = e.target.closest('.sp-editor-input');
      if (input && e.key === 'Enter') {
        e.preventDefault();
        addSafetyPlanItem(input.dataset.spKey, input.value);
        input.value = '';
        return;
      }
      if (e.key === 'Escape' && plannerState.safetyPlanPicked) {
        plannerState.safetyPlanPicked = null;
        document.getElementById('plannerOutputSafetyPlan').innerHTML = safetyPlanEditorHtml(plannerState.data);
      }
    });
    safetyPlanOutputEl.addEventListener('dragstart', e => {
      const chip = e.target.closest('.sp-movable-chip');
      if (!chip) return;
      e.dataTransfer.setData('text/plain', JSON.stringify({
        key: chip.dataset.spOriginKey, index: parseInt(chip.dataset.spOriginIndex, 10)
      }));
      e.dataTransfer.effectAllowed = 'move';
    });
    safetyPlanOutputEl.addEventListener('dragover', e => {
      const section = e.target.closest('.safety-plan-section');
      if (!section) return;
      e.preventDefault();
      section.classList.add('is-drop-over');
    });
    safetyPlanOutputEl.addEventListener('dragleave', e => {
      const section = e.target.closest('.safety-plan-section');
      if (section) section.classList.remove('is-drop-over');
    });
    safetyPlanOutputEl.addEventListener('drop', e => {
      const section = e.target.closest('.safety-plan-section');
      if (!section) return;
      e.preventDefault();
      section.classList.remove('is-drop-over');
      let payload;
      try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return; }
      if (payload) moveSafetyPlanItem(payload.key, payload.index, section.dataset.spSection);
    });
  }

  function resetPlanner() {
    RING_ORDER.forEach(r => {
      plannerState.factors[r] = { risk: [], protective: [] };
    });
    plannerState.topContributors = { risk: [null, null, null], protective: [null, null, null] };
    plannerState.resourcePlan = [];
    SAFETY_PLAN_KEYS.forEach(k => { plannerState.safetyPlanItems[k] = []; });
    plannerState.safetyPlanSeeded = false;
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

  document.getElementById('plannerDownloadBtn').addEventListener('click', () => {
    // Regenerate right before printing so the PDF always reflects whatever
    // was just typed into the safety plan, even if nothing else changed.
    generatePlan();
    window.print();
  });
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

  // Restore any previously entered factors (and the step/output the clinician
  // was on) before landing on the current step.
  goToStep(plannerState.currentStep); // already generates the plan if this lands on Review
  updateGenerateState();
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

// The very first time Review generates a plan, seed the editable safety plan
// from the entered risk/protective factors. After that it's the clinician's
// own list — regenerating the rest of the plan never overwrites it again.
// Only latches "seeded" once there was actually something to seed — reaching
// Review before any factors exist must not permanently lock the plan empty.
function seedSafetyPlanItemsIfNeeded(data) {
  if (plannerState.safetyPlanSeeded) return;
  const { itemsByKey } = buildSafetyPlanData(data, plannerState.ringLabelByKey);
  const producedAnything = Object.values(itemsByKey).some(list => list.length > 0);
  if (!producedAnything) return;
  Object.keys(itemsByKey).forEach(key => {
    plannerState.safetyPlanItems[key] = itemsByKey[key].map(it => it.text);
  });
  plannerState.safetyPlanSeeded = true;
  persistPlannerState();
}

// Same structure as the standalone Make A Safety Plan tool — one typeable,
// addable/removable list per section — but living inside the Review box and
// started off with a draft pulled from the factors already entered.
function safetyPlanEditorHtml(data) {
  const sections = data.planner.safetyPlan.sections;
  const picked = plannerState.safetyPlanPicked;
  const body = sections.map(cfg => {
    const items = plannerState.safetyPlanItems[cfg.key] || [];
    const isDropTarget = picked && picked.key !== cfg.key;
    const chips = items.map((text, i) => {
      const isPicked = picked && picked.key === cfg.key && picked.index === i;
      return `
      <span class="planner-chip planner-chip-neutral sp-movable-chip${isPicked ? ' is-picked' : ''}" draggable="true" data-sp-origin-key="${cfg.key}" data-sp-origin-index="${i}">
        <span class="planner-chip-text">${text}</span>
        <button type="button" class="planner-chip-remove" data-sp-remove="${cfg.key}:${i}" aria-label="Remove">${icon('i-x', 'icon-xs')}</button>
      </span>`;
    }).join('');
    return `
      <div class="safety-plan-section${isDropTarget ? ' sp-drop-target' : ''}" data-sp-section="${cfg.key}">
        <h4>${cfg.title}</h4>
        ${cfg.intro ? `<p class="safety-plan-intro">${cfg.intro}</p>` : ''}
        ${cfg.staticText ? `<p class="safety-plan-static">${cfg.staticText}</p>` : ''}
        <div class="planner-input-group">
          <input type="text" class="planner-input sp-editor-input" data-sp-key="${cfg.key}" placeholder="Add an item…" />
          <button type="button" class="planner-add-btn" data-sp-add="${cfg.key}" aria-label="Add">${icon('i-plus', 'icon-xs')}</button>
        </div>
        <div class="planner-chips">${chips || `<p class="safety-plan-empty">${cfg.emptyText || 'Nothing added yet.'}</p>`}</div>
      </div>`;
  }).join('');
  return `
    <h3>${data.planner.outputHeadings.safetyPlan}</h3>
    <div class="safety-plan-disclaimer">${icon('i-shield', 'icon-sm')}<span>${data.planner.safetyPlan.disclaimer}</span></div>
    <p class="sp-move-hint">Drag an item into a different section to move it — or on touch, tap it, then tap the section to drop it in.${picked ? ` Moving "<strong>${picked.text}</strong>" — tap it again, or press Escape, to cancel.` : ''}</p>
    ${body}`;
}

function safetyPlanPrintHtml(data) {
  const sections = data.planner.safetyPlan.sections;
  const body = sections.map(cfg => {
    const its = plannerState.safetyPlanItems[cfg.key] || [];
    const list = its.length
      ? `<ul>${its.map(t => `<li>${t}</li>`).join('')}</ul>`
      : `<p class="print-empty">${cfg.emptyText || 'Nothing added.'}</p>`;
    return `
      <div class="print-sp-section">
        <h3>${cfg.title}</h3>
        ${cfg.intro ? `<p class="print-sp-intro">${cfg.intro}</p>` : ''}
        ${cfg.staticText ? `<p class="print-sp-intro">${cfg.staticText}</p>` : ''}
        ${list}
      </div>`;
  }).join('');
  return `<h2>${data.planner.outputHeadings.safetyPlan}</h2>${body}`;
}

// resourceKey (as used by RING_RECOMMENDATIONS) -> the matching Audience
// tag on individual items in content/resources.json.
const RESOURCE_KEY_AUDIENCE = { clinician: 'Clinician', community: 'Community', family: 'Family', youth: 'Youth', schools: 'Schools' };

// Shared by the Resource Plan step, the auto-generated "My Resource Plan"
// output, and the printable output, so all three stay in sync off one
// source of truth. Returns the actual Resource Library items (from
// content/resources.json) every time, not a filtered-down subset — each
// card carries a `matched` flag + its triggering factors, so the UI can
// highlight recommendations without hiding the rest of the library.
function computeResourceCards() {
  const resourceTriggers = {}; // resourceKey -> [{ ringLabel, valence }]

  RING_ORDER.forEach(ring => {
    ['risk', 'protective'].forEach(valence => {
      const factors = plannerState.factors[ring][valence];
      if (!factors.length) return;
      const rec = RING_RECOMMENDATIONS[ring][valence];
      rec.resourceKeys.forEach(key => {
        (resourceTriggers[key] = resourceTriggers[key] || []).push({ ringLabel: plannerState.ringLabelByKey[ring], valence });
      });
    });
  });

  const items = (plannerState.resourcesData && plannerState.resourcesData.items) || [];
  return items.map(item => {
    const triggers = Object.keys(RESOURCE_KEY_AUDIENCE)
      .filter(key => resourceTriggers[key] && item.audience.includes(RESOURCE_KEY_AUDIENCE[key]))
      .flatMap(key => resourceTriggers[key]);
    return {
      key: item.id, title: item.title, type: item.type,
      icon: RESOURCE_TYPE_ICON[item.type] || 'i-file-text',
      description: item.description,
      triggers, matched: triggers.length > 0
    };
  });
}

function topContributorFactor(valence, id) {
  for (const ring of RING_ORDER) {
    const f = plannerState.factors[ring][valence].find(x => x.id === id);
    if (f) return { ...f, ringLabel: plannerState.ringLabelByKey[ring] };
  }
  return null;
}

function topContributorsHtml() {
  const listFor = valence => {
    const items = plannerState.topContributors[valence].map(id => id !== null ? topContributorFactor(valence, id) : null).filter(Boolean);
    if (!items.length) return `<p class="planner-resource-empty">No ${valence === 'risk' ? 'risk' : 'protective'} contributors selected.</p>`;
    return `<ol class="planner-top-list">${items.map(it => `<li>${it.text} <em>(${it.ringLabel} · ${it.weight}/5)</em></li>`).join('')}</ol>`;
  };
  return `
    <h3>Top Contributors</h3>
    <div class="planner-top-contributors">
      <div><h4 class="planner-col-heading-risk">Top Risk Factors</h4>${listFor('risk')}</div>
      <div><h4 class="planner-col-heading-protective">Top Protective Factors</h4>${listFor('protective')}</div>
    </div>`;
}

function topContributorsPrintHtml() {
  const listFor = valence => {
    const items = plannerState.topContributors[valence].map(id => id !== null ? topContributorFactor(valence, id) : null).filter(Boolean);
    return items.length ? items.map(it => `${it.text} (${it.ringLabel} · ${it.weight}/5)`).join('; ') : 'None selected';
  };
  return `<h2 class="print-no-break">Top Contributors</h2><ul><li><strong>Top Risk Factors:</strong> ${listFor('risk')}</li><li><strong>Top Protective Factors:</strong> ${listFor('protective')}</li></ul>`;
}

function myResourcePlanCards(data) {
  const allCards = computeResourceCards();
  return plannerState.resourcePlan.map(k => allCards.find(c => c.key === k)).filter(Boolean);
}

function myResourcePlanHtml(data) {
  const cards = myResourcePlanCards(data);
  return `
    <h3>My Resource Plan</h3>
    <div class="planner-resource-grid">
      ${cards.length ? cards.map(resourceCardHtml).join('') : '<p class="planner-resource-empty">No resources added to your plan yet — go back to the Resource Plan step to add some.</p>'}
    </div>`;
}

function myResourcePlanPrintHtml(data) {
  const cards = myResourcePlanCards(data);
  return cards.length ? `<div class="planner-resource-grid">${cards.map(resourceCardHtml).join('')}</div>` : '<p>No resources added to the plan.</p>';
}

function generatePlan() {
  const data = plannerState.data;
  const phases = data.toolkit.tabs.roadmap.phases;
  const ringLabelByKey = plannerState.ringLabelByKey;

  const phaseScores = phases.map(() => 0);
  const notes = [];

  RING_ORDER.forEach(ring => {
    ['risk', 'protective'].forEach(valence => {
      const factors = plannerState.factors[ring][valence];
      if (!factors.length) return;
      const rec = RING_RECOMMENDATIONS[ring][valence];
      const weightSum = factors.reduce((sum, f) => sum + f.weight, 0);
      const maxWeight = Math.max(...factors.map(f => f.weight));
      phaseScores[rec.phaseIndex] += weightSum;
      notes.push({ ringLabel: ringLabelByKey[ring], valence, text: rec.planNote, weight: maxWeight });
    });
  });

  notes.sort((a, b) => b.weight - a.weight);

  const topScore = Math.max(...phaseScores);

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

  seedSafetyPlanItemsIfNeeded(data);
  document.getElementById('plannerOutputPlan').innerHTML = planHtml;
  document.getElementById('plannerOutputSafetyPlan').innerHTML = safetyPlanEditorHtml(data);
  document.getElementById('plannerOutputTopPlan').innerHTML = topContributorsHtml() + myResourcePlanHtml(data);
  document.getElementById('plannerOutputMore').innerHTML = moreHtml;
  buildPrintSheet(data, ringLabelByKey, phases, phaseScores, topScore, notes);

  // generatePlan() can also run on page load to restore a previously-generated
  // plan — only actually reveal it if that restore lands back on Review;
  // goToStep() owns hiding it everywhere else.
  const onReviewNow = STEP_KEYS[plannerState.currentStep] === 'review';
  const output = document.getElementById('plannerOutput');
  output.hidden = !onReviewNow;

  document.getElementById('plannerDownloadBtn').hidden = false;
  document.getElementById('plannerDownloadHint').hidden = !onReviewNow;
  if (onReviewNow) output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  plannerState.hasGenerated = true;
  persistPlannerState();
}

// Builds the SAME unified SVG map used on screen (rings, labels, pills, and
// connector lines all in one viewBox) rather than a separate stripped-down
// print version, so the PDF always matches what the clinician sees live.
function buildPrintDiagramHtml() {
  return `<div class="planner-ecomap-wrap print-diagram-wrap">${buildEcoMapSvg({ currentRing: null, locked: true, idPrefix: 'print' })}</div>`;
}

function buildPrintSheet(data, ringLabelByKey, phases, phaseScores, topScore, notes) {
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

  document.getElementById('plannerPrintSheet').innerHTML = `
    <h1>Client Ecological Formulation &amp; Treatment Plan</h1>
    <p class="print-date">Generated ${dateStr} — Therapist Toolkit Planning Tool</p>
    <p class="print-disclaimer">${data.planner.disclaimer}</p>

    <h2>Ecological Map</h2>
    ${buildPrintDiagramHtml()}

    <h2>Factors Entered</h2>
    ${factorsHtml || '<p>None entered.</p>'}

    ${topContributorsPrintHtml()}

    <h2>${data.planner.outputHeadings.plan}</h2>
    <ul>${phasesHtml}</ul>
    <ul>${notesHtml}</ul>

    ${safetyPlanPrintHtml(data)}

    <h2>My Resource Plan</h2>
    ${myResourcePlanPrintHtml(data)}`;
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

// A print triggered via the OS/keyboard (not the Download button) skips the
// generatePlan() call that button normally does first — regenerate here too
// so that path always reflects the latest edits and uses print dimensions.
window.addEventListener('beforeprint', () => {
  if (plannerState.data && STEP_KEYS[plannerState.currentStep] === 'review') generatePlan();
});

// ── Load content, render, then wire up interactions ──
// The Resource Plan step pulls its cards straight from the same
// content/resources.json dataset that powers the Resource Library page.
Promise.all([
  fetch('content/site.json').then(res => res.json()),
  fetch('content/resources.json').then(res => res.json())
]).then(([data, resourcesData]) => {
  plannerState.resourcesData = resourcesData;
  renderPlanner(data);
  renderFooter(data);
  loadPersistedPlannerState();
  initPlanner();
  initFadeObserver();
});
