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

const plannerState = { data: null, factors: {} };
RING_ORDER.forEach(k => { plannerState.factors[k] = { risk: [], protective: [] }; });

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
  document.getElementById('plannerDownloadBtn').textContent = p.downloadButtonLabel;
  document.getElementById('plannerDownloadHint').textContent = p.downloadHint;
  document.getElementById('plannerEmptyState').textContent = p.emptyStateText;

  document.getElementById('plannerRingLabels').innerHTML = p.rings
    .filter(r => r.key !== 'client')
    .map(r => `<div class="planner-ring-label" data-ring="${r.key}">${r.label}</div>`).join('');

  function rowsHtml(valence) {
    return p.rings.map(r => `
      <div class="planner-row" data-ring="${r.key}">
        <label>${r.label}</label>
        <div class="planner-input-group">
          <input type="text" class="planner-input" data-ring="${r.key}" data-valence="${valence}"
                 placeholder="${valence === 'risk' ? r.placeholderRisk : r.placeholderProtective}" />
          <button type="button" class="planner-add-btn planner-add-btn-${valence}" data-ring="${r.key}" data-valence="${valence}" aria-label="${p.addButtonLabel}">${icon('i-plus', 'icon-xs')}</button>
        </div>
        <div class="planner-chips" data-ring="${r.key}" data-valence="${valence}"></div>
      </div>`).join('');
  }

  document.getElementById('plannerRiskRows').innerHTML = rowsHtml('risk');
  document.getElementById('plannerProtectiveRows').innerHTML = rowsHtml('protective');
}

function initPlanner() {
  const layout = document.getElementById('plannerLayout');
  if (!layout) return;

  function renderChips(ring, valence) {
    const container = layout.querySelector(`.planner-chips[data-ring="${ring}"][data-valence="${valence}"]`);
    if (!container) return;
    container.innerHTML = plannerState.factors[ring][valence].map((text, i) => `
      <span class="planner-chip planner-chip-${valence}">
        ${text}
        <button type="button" class="planner-chip-remove" data-ring="${ring}" data-valence="${valence}" data-index="${i}" aria-label="Remove">${icon('i-x', 'icon-xs')}</button>
      </span>`).join('');
  }

  function updateRingActiveState(ring) {
    const svg = document.getElementById('plannerSvg');
    const el = svg.querySelector(`.planner-ring[data-ring="${ring}"]`);
    const label = document.querySelector(`.planner-ring-label[data-ring="${ring}"]`);
    const hasRisk = plannerState.factors[ring].risk.length > 0;
    const hasProtective = plannerState.factors[ring].protective.length > 0;
    if (el) { el.classList.toggle('has-risk', hasRisk); el.classList.toggle('has-protective', hasProtective); }
    if (label) label.classList.toggle('has-factors', hasRisk || hasProtective);
  }

  function updateGenerateState() {
    const any = RING_ORDER.some(r => plannerState.factors[r].risk.length || plannerState.factors[r].protective.length);
    document.getElementById('plannerGenerateBtn').disabled = !any;
    document.getElementById('plannerEmptyState').style.display = any ? 'none' : 'block';
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

    function ringAnchor(ring, side) {
      const el = svg.querySelector(`.planner-ring[data-ring="${ring}"]`);
      const cx = parseFloat(el.getAttribute('cx'));
      const cy = parseFloat(el.getAttribute('cy'));
      const r  = parseFloat(el.getAttribute('r'));
      const angle = (side === 'risk' ? 200 : -20) * Math.PI / 180;
      return {
        x: svgRect.left - layoutRect.left + (cx + r * Math.cos(angle) - vb.x) * scaleX,
        y: svgRect.top  - layoutRect.top  + (cy + r * Math.sin(angle) - vb.y) * scaleY
      };
    }

    layout.querySelectorAll('.planner-chip').forEach(chip => {
      const wrap = chip.closest('.planner-chips');
      const ring = wrap.dataset.ring, valence = wrap.dataset.valence;
      const chipRect = chip.getBoundingClientRect();
      const startX = (valence === 'risk' ? chipRect.right : chipRect.left) - layoutRect.left;
      const startY = chipRect.top + chipRect.height / 2 - layoutRect.top;
      const end = ringAnchor(ring, valence);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', startX);
      line.setAttribute('y1', startY);
      line.setAttribute('x2', end.x);
      line.setAttribute('y2', end.y);
      line.setAttribute('class', `planner-connector planner-connector-${valence}`);
      overlay.appendChild(line);
    });
  }

  function addFactor(ring, valence, text) {
    text = text.trim();
    if (!text) return;
    plannerState.factors[ring][valence].push(text);
    renderChips(ring, valence);
    updateRingActiveState(ring);
    drawConnectors();
    updateGenerateState();
  }

  function removeFactor(ring, valence, index) {
    plannerState.factors[ring][valence].splice(index, 1);
    renderChips(ring, valence);
    updateRingActiveState(ring);
    drawConnectors();
    updateGenerateState();
  }

  layout.querySelectorAll('.planner-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const { ring, valence } = btn.dataset;
      const input = layout.querySelector(`.planner-input[data-ring="${ring}"][data-valence="${valence}"]`);
      addFactor(ring, valence, input.value);
      input.value = '';
      input.focus();
    });
  });

  layout.querySelectorAll('.planner-input').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      addFactor(input.dataset.ring, input.dataset.valence, input.value);
      input.value = '';
    });
  });

  layout.addEventListener('click', e => {
    const removeBtn = e.target.closest('.planner-chip-remove');
    if (!removeBtn) return;
    removeFactor(removeBtn.dataset.ring, removeBtn.dataset.valence, parseInt(removeBtn.dataset.index, 10));
  });

  document.getElementById('plannerGenerateBtn').addEventListener('click', generatePlan);
  document.getElementById('plannerDownloadBtn').addEventListener('click', () => window.print());
  document.getElementById('plannerResetBtn').addEventListener('click', () => {
    RING_ORDER.forEach(r => {
      plannerState.factors[r] = { risk: [], protective: [] };
      renderChips(r, 'risk');
      renderChips(r, 'protective');
      updateRingActiveState(r);
    });
    document.getElementById('plannerOutput').hidden = true;
    document.getElementById('plannerDownloadBtn').hidden = true;
    document.getElementById('plannerDownloadHint').hidden = true;
    drawConnectors();
    updateGenerateState();
  });

  window.addEventListener('resize', drawConnectors);

  updateGenerateState();
  drawConnectors();
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
      phaseScores[rec.phaseIndex] += factors.length;
      notes.push({ ringLabel: ringLabelByKey[ring], valence, text: rec.planNote });
      rec.resourceKeys.forEach(key => {
        (resourceTriggers[key] = resourceTriggers[key] || []).push({ ringLabel: ringLabelByKey[ring], valence });
      });
    });
  });

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
          <span class="planner-note-tag planner-note-tag-${n.valence}">${n.ringLabel} · ${n.valence === 'risk' ? 'Risk' : 'Protective'}</span>
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
      <a class="btn btn-outline" href="about.html#tab-selfcare" target="_blank" rel="noopener">Therapist Self-Care</a>
    </div>`;

  document.getElementById('plannerOutputPlan').innerHTML = planHtml;
  document.getElementById('plannerOutputResources').innerHTML = resourcesHtml;
  document.getElementById('plannerOutputMore').innerHTML = moreHtml;
  buildPrintSheet(data, ringLabelByKey, phases, phaseScores, topScore, notes, resourceCards);

  const output = document.getElementById('plannerOutput');
  output.hidden = false;

  document.getElementById('plannerDownloadBtn').hidden = false;
  document.getElementById('plannerDownloadHint').hidden = false;
  output.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function buildPrintSheet(data, ringLabelByKey, phases, phaseScores, topScore, notes, resourceCards) {
  const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const factorsHtml = RING_ORDER.map(ring => {
    const risk = plannerState.factors[ring].risk;
    const protective = plannerState.factors[ring].protective;
    if (!risk.length && !protective.length) return '';
    return `
      <div class="print-factor-row">
        <strong>${ringLabelByKey[ring]}</strong>
        ${risk.length ? `<p>Risk: ${risk.join(', ')}</p>` : ''}
        ${protective.length ? `<p>Protective: ${protective.join(', ')}</p>` : ''}
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
    initPlanner();
    initFadeObserver();
  });
