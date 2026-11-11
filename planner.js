/* =============================================
   PLANNING TOOL — Client Ecological Formulation & Treatment Plan
   ============================================= */

function icon(id, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}"><use href="#${id}"/></svg>`;
}

// Phase 2 "Select Intervention" strategy/practice options — order doesn't
// matter here, the dropdown sorts alphabetically at render time. Any
// Evidence-Based Practice added to the Treatment Library (CMS) is added to
// this list once the library loads (see sortedInterventions()).
const INTERVENTION_OPTIONS = [
  'Psychoeducation', "Elicit Client Issues/Concerns", 'Agenda Setting', 'Treatment Goal Setting/Review',
  "Tracking/Review Client's Progress", 'Homework Assignment/Review', 'Individualized/Flexible Treatment Delivery',
  'Therapeutic Alliance/Relationship Building', 'Addressing Treatment Barriers', 'Digital/App-Based Tools',
  'Commitment to Safety', 'Safety Planning', 'Means Safety/Lethal Means Restriction', 'Safety Skills',
  'Distress Tolerance', 'Emotion Regulation', 'Impulse Control', 'Mindfulness', 'Problem Solving',
  'Interpersonal Effectiveness Skills', 'Assertiveness Training', 'Behavioral Activation/Activity Scheduling',
  'Cognitive Restructuring', 'Exposure', 'Trauma Narrative', 'Modeling', 'Skills Practice/Role Play',
  'Performance Feedback', 'Positive Reinforcement/Rewards', 'Live Caregiver-Youth Coaching', 'Antecedent Management',
  'Differential Reinforcement/Planned Ignoring', 'Redirection/Distraction', "Following the Child's Lead",
  'Parent-Child Quality Time', 'Effective Commands', 'Consequences', 'Behavioral Contracting', 'Caregiver Coping',
  'Youth Education/Academic Support', 'End of Session Positive', 'Progressive Muscle Relaxation', 'If-Then Planning',
  'Facing Your Inner Critic', 'Self-Compassion', 'Affect Identification/Feeling Thermometer', 'Feeling Thermometer',
  'Common Reactions to Trauma', 'Caregiver Emotion Coaching', 'Caregiver Support for Safety Plan',
  'Drawing on Strengths', 'Chain/Functional Analysis', 'Praise/Reinforcement', 'Crisis Survival Skills',
  'Diary Card (Youth)', 'Motivational Interviewing', 'Pros/Cons', 'Thanks Notes', 'Hope Box',
  'Dialectical Thinking', 'Cognitive Defusion', 'Diary Card (Parent)', 'Worry Time', 'Silver Linings',
  'Taking Ownership', 'Gratitude', 'Identifying Thoughts, Feelings, Behaviors', 'Stimulus Control',
  'Coping Cards', 'Family Album', 'Counseling about Disinhibiting Effects of Substances'
];

// Descriptions for the options above live in the Treatment Library
// (content/resources.json) as items of this type, matched by title, so the
// hover preview on Select Interventions and the library page share one source.
const PRACTICE_TYPE = 'Evidence-Based Practice';
const practiceLibrary = {}; // lowercased title -> Treatment Library item
function practiceInfo(name) { return practiceLibrary[name.toLowerCase()] || null; }
function treatmentLibraryHref(name) { return `resource-library.html?practice=${encodeURIComponent(name)}`; }
function practiceDescription(name) {
  const info = practiceInfo(name);
  return info && info.description ? info.description : '';
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

// Small filled/unfilled dot row showing a factor's severity (1–5), colored
// with the exact same weight ramp used for its pill on the ecological map —
// reused on Select Interventions so the clinician-assigned severity (and its
// color darkness) stays visible while picking strategies for that factor.
function severityDotsHtml(valence, weight) {
  const label = WEIGHT_LEVELS[weight - 1] ? WEIGHT_LEVELS[weight - 1].label : '';
  const color = CHIP_COLOR_BY_WEIGHT[valence][weight] || CHIP_COLOR_BY_WEIGHT[valence][DEFAULT_WEIGHT];
  const dots = [1, 2, 3, 4, 5].map(n => {
    const filled = n <= weight;
    return `<span class="intervention-severity-dot${filled ? ' filled' : ''}"${filled ? ` style="background:${color}"` : ''}></span>`;
  }).join('');
  return `<span class="intervention-severity" title="Severity: ${label} (${weight}/5)" aria-label="Severity ${weight} of 5, ${label}">${dots}</span>`;
}

// Every ring outline is drawn at the same thickness — only color changes
// with what's mapped to a given ring.
const RING_STROKE_WIDTH = 4;

// ── Ecological map geometry — the whole diagram (rings, ring labels, risk/
// protective pills, connector lines) is one self-contained SVG computed
// entirely in viewBox units, so it scales as a single unit and the exact
// same markup can be reused for the printed/downloaded plan. ──
// Rings are spaced in equal steps outward from the client ring (center) —
// "space the rings evenly: equal gaps between radii."
const MAP_RING_STEP = 46;
const MAP_RING_BASE_R = 50; // client ring's starting radius
const MAP_RING_BASE_RADII = (() => {
  const deepFirst = RING_ORDER.slice().reverse(); // client..community
  const radii = {};
  deepFirst.forEach((ring, i) => { radii[ring] = MAP_RING_BASE_R + i * MAP_RING_STEP; });
  return radii;
})();
const MAP_PILL_LINE_H = 22; // viewBox units per wrapped text line
const MAP_PILL_V_GAP = 12; // vertical gap between stacked pills
const MAP_PILL_MIN_W = 100;
const MAP_PILL_MAX_W = 240;
const MAP_PILL_CHAR_W = 9;
const MAP_PILL_GAP = 36; // gap between the outer ring's edge and the pill zone
// Connector routing: one straight line per pill, aimed at the circle's
// center and stopping at that pill's own ring — see stackColumn() below.
const MAP_CONNECTOR_WIDTH = 3;
const MAP_ENDPOINT_DOT_R = 4;
// Pills are laid out top-down: the weight dots sit in their own row above
// the text, then the (possibly multi-line) text follows below.
const MAP_PILL_TOP_PAD = 16;   // pill top edge -> dot row
const MAP_PILL_DOT_TEXT_GAP = 26; // dot row -> first text baseline
const MAP_PILL_BOTTOM_PAD = 14;   // last text baseline -> pill bottom
const MAP_PILL_H = MAP_PILL_TOP_PAD + MAP_PILL_DOT_TEXT_GAP + MAP_PILL_BOTTOM_PAD; // minimum (single-line) height

function mapRingRadius(ringRadii, ring) {
  return ringRadii[ring];
}

// Midpoint radius between a ring and the next ring inward — where that
// ring's curved label sits, so it reads inside its own band instead of
// overlapping the ring line or the next label out.
function mapRingLabelRadius(ringRadii, ring) {
  // Uppercase glyphs sit above their baseline, so placing the arc at the
  // band's midpoint left the text hugging the outer line with empty space
  // below it. Anchor the baseline near the inner line instead — the glyphs
  // then grow upward into the band, reading close to its bottom edge.
  const i = RING_ORDER.indexOf(ring);
  const innerRing = RING_ORDER[i + 1];
  const nudge = ring === 'community' ? 4 : 0; // sits a hair high otherwise — pull it down slightly
  return mapRingRadius(ringRadii, innerRing) + 14 - nudge;
}

// ── Connector layout: one column per side, outer ring → inner ring ──
//
// Each side (risk on the left, protective on the right) is a single column
// of pills read top to bottom in ring order — Community / Structural first,
// then School, Family, Peer, and Client last — so scanning down the map
// moves steadily inward instead of bouncing between outer and inner rings.
//
// Every connector is one straight line, pill to ring — never an elbow —
// aimed at the circle's own center and stopping at the pill's ring. Lines
// aimed at one common point can only ever meet at that point, and no line
// reaches it (each stops at its ring, all of which have a radius > 0), so
// no two connectors can cross by construction. Pills in one column also
// sit at distinct heights, so no two lines share a direction either.

// Stacks one side's pills (already in outer → inner ring order) into a
// single column vertically centered on cy, top to bottom.
function stackColumn(items, cy) {
  const total = items.reduce((s, p) => s + p.h, 0) + MAP_PILL_V_GAP * Math.max(0, items.length - 1);
  let cursor = cy - total / 2;
  return items.map(item => {
    const y = cursor + item.h / 2;
    cursor += item.h + MAP_PILL_V_GAP;
    return { item, y };
  });
}

// Shortest distance between two line segments (all in viewBox units).
function segmentDistance(a, b) {
  const pts = (s) => [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }];
  const pointToSeg = (p, s) => {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - s.x1) * dx + (p.y - s.y1) * dy) / len2));
    return Math.hypot(p.x - (s.x1 + t * dx), p.y - (s.y1 + t * dy));
  };
  const cross = (o, p, q) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const [a1, a2] = pts(a), [b1, b2] = pts(b);
  const d1 = cross(a1, a2, b1), d2 = cross(a1, a2, b2), d3 = cross(b1, b2, a1), d4 = cross(b1, b2, a2);
  if (((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))) return 0; // proper intersection
  return Math.min(pointToSeg(a1, b), pointToSeg(a2, b), pointToSeg(b1, a), pointToSeg(b2, a));
}

// Dev-time safety net: confirms no two connectors (from different factors)
// cross or come within a few px of each other. The center-aimed layout
// above makes this impossible by construction — this just catches any
// real regression immediately instead of silently shipping an overlap.
function verifyNoConnectorOverlap(segments) {
  const pad = 4;
  const violations = [];
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i], b = segments[j];
      if (a.factorId === b.factorId) continue;
      if (segmentDistance(a, b) < pad) violations.push([a, b]);
    }
  }
  if (violations.length) console.warn(`Ecological map: ${violations.length} connector pair(s) crossing or within ${pad}px`, violations);
  return violations.length === 0;
}

// Dev-time safety net: confirms no connector passes through the small arc
// each ring label occupies near the top of its own band. Labels still
// render after (on top of) the connector lines, so text stays legible even
// in an edge case this estimate misses — this is a diagnostic, not the
// only protection.
function verifyLabelClearance(segments, ringRadii, cx, cy) {
  const violations = [];
  RING_ORDER.filter(r => r !== 'client').forEach(ring => {
    const labelR = mapRingLabelRadius(ringRadii, ring);
    const labelText = (plannerState.ringLabelByKey[ring] || ring).toUpperCase();
    const halfWidthPx = Math.max(20, labelText.length * 3.6);
    const halfAngle = Math.min(1.4, halfWidthPx / labelR);
    segments.forEach(seg => {
      if (seg.ring === ring) return; // a ring's own connectors end right at its edge, not through its label
      for (let k = 0; k <= 40; k++) {
        const t = k / 40;
        const x = seg.x1 + (seg.x2 - seg.x1) * t, y = seg.y1 + (seg.y2 - seg.y1) * t;
        const r = Math.hypot(x - cx, y - cy);
        if (r < labelR - 14 || r > labelR + 4 || y > cy) continue;
        const angleFromTop = Math.abs(Math.atan2(x - cx, cy - y));
        if (angleFromTop <= halfAngle) { violations.push({ ring, seg }); return; }
      }
    });
  });
  if (violations.length) console.warn(`Ecological map: ${violations.length} connector(s) pass through a ring label's band`, violations);
  return violations.length === 0;
}

function escapeXml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// All pills on one side share a single width (see preparedPills() below),
// so sizing happens in two steps. First, how wide a given factor's text
// would want to be completely unwrapped (capped) — used only to find the
// widest pill on a side.
function mapNaturalWidth(text) {
  return Math.max(MAP_PILL_MIN_W, Math.min(MAP_PILL_MAX_W, String(text).length * MAP_PILL_CHAR_W + 56));
}

// Full factor text always shows — never truncated with "…" — so it wraps
// onto as many lines as it needs instead, against whatever width every
// pill on this side ended up sharing. Greedy word-wrap.
function mapWrapAtWidth(text, w) {
  const availChars = Math.floor((w - 56) / MAP_PILL_CHAR_W);
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach(word => {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > availChars) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function mapRingVisual(ring) {
  const riskFactors = plannerState.factors[ring].risk;
  const protFactors = plannerState.factors[ring].protective;
  const hasRisk = riskFactors.length > 0, hasProt = protFactors.length > 0;
  const riskMax = hasRisk ? Math.max(...riskFactors.map(f => f.weight)) : 0;
  const protMax = hasProt ? Math.max(...protFactors.map(f => f.weight)) : 0;
  let stroke = 'var(--cream-dark)';
  if (hasRisk && hasProt) stroke = 'var(--teal)';
  else if (hasRisk) stroke = CHIP_COLOR_BY_WEIGHT.risk[riskMax];
  else if (hasProt) stroke = CHIP_COLOR_BY_WEIGHT.protective[protMax];
  return { stroke, strokeWidth: RING_STROKE_WIDTH, hasRisk, hasProt };
}

// Builds the full map as one <svg> markup string — reused identically for
// the on-screen wizard/review AND the printed plan (no stripped-down copy).
function buildEcoMapSvg(opts) {
  opts = opts || {};
  const currentRing = opts.currentRing || null;
  const locked = !!opts.locked;
  const idPrefix = opts.idPrefix || 'map';
  // On a ring step (steps 1–5), only that ring's own factors show as pills —
  // e.g. School's factors don't appear while working on Peer. Review and the
  // other curation steps pass this as false and still see every ring.
  const onlyCurrentRing = !!opts.onlyCurrentRing;
  const p = plannerState.data.planner;

  // One pill per ring per side — never more than 5 pills on either side. A
  // ring with several factors gets one pill with a row per factor, each row
  // keeping its own severity color, weight dots, and remove button.
  function pillsFor(valence) {
    const rings = onlyCurrentRing && currentRing ? [currentRing] : RING_ORDER;
    const pills = [];
    rings.forEach(ring => {
      const rows = plannerState.factors[ring][valence].map((f, idx) => ({ idx, id: f.id, text: f.text, weight: f.weight }));
      if (rows.length) pills.push({ ring, id: `${valence}-${ring}`, rows }); // group id drives hover/highlight
    });
    return pills;
  }
  // Every pill on one side shares one width — the widest any factor's text
  // naturally wants — so left pills all right-align to one inner edge and
  // right pills all left-align to the other. Each row's text wraps against
  // that shared width; a pill's height is the sum of its rows' heights.
  function preparedPills(valence) {
    const groups = pillsFor(valence);
    const allRows = groups.flatMap(g => g.rows);
    const uniformW = allRows.length ? Math.max(...allRows.map(r => mapNaturalWidth(r.text))) : MAP_PILL_MIN_W;
    return groups.map(g => {
      const rows = g.rows.map(r => {
        const lines = mapWrapAtWidth(r.text, uniformW);
        return { ...r, lines, h: MAP_PILL_H + (lines.length - 1) * MAP_PILL_LINE_H };
      });
      const h = rows.reduce((sum, r) => sum + r.h, 0);
      const weight = Math.max(...rows.map(r => r.weight)); // connector takes the strongest row's color
      return { ...g, rows, w: uniformW, h, weight };
    });
  }
  const riskPills = preparedPills('risk');
  const protPills = preparedPills('protective');

  const sumH = list => list.reduce((sum, p) => sum + p.h, 0) + MAP_PILL_V_GAP * Math.max(0, list.length - 1);
  // One column per side, centered on the circle's vertical center. The
  // canvas is tall enough for whichever is taller: the longer column or
  // the circle itself.
  const ringRadii = { ...MAP_RING_BASE_RADII };
  const vbH = Math.max(560, Math.max(sumH(riskPills), sumH(protPills)) + 2 * MAP_PILL_V_GAP + 60, 2 * ringRadii.community + 90);
  const cy = vbH / 2;
  const riskStacked = stackColumn(riskPills, cy);
  const protStacked = stackColumn(protPills, cy);
  const outerR = ringRadii.community; // anchors the pill zone just outside the outermost ring

  // Risk and protective pills can have different uniform widths, so the
  // circle's own center (cx) isn't necessarily the viewBox's midpoint —
  // it's wherever the risk-side margin puts it.
  const riskW = riskPills.length ? riskPills[0].w : MAP_PILL_MIN_W;
  const protW = protPills.length ? protPills[0].w : MAP_PILL_MIN_W;
  const leftMargin = outerR + MAP_PILL_GAP + riskW + 20;
  const rightMargin = outerR + MAP_PILL_GAP + protW + 20;
  const vbW = leftMargin + rightMargin;
  const cx = leftMargin;

  // The current-step ring (steps 1–5) reuses the exact same solid-yellow
  // "is-ring-match" treatment as the Review hover-highlight, instead of its
  // own separate dashed indicator — one consistent visual language for
  // "this is the ring you're looking at" everywhere in the tool.
  const ringsSvg = RING_ORDER.map(ring => {
    const r = ringRadii[ring];
    const v = mapRingVisual(ring);
    const isCurrent = ring === currentRing;
    // A separate class from is-ring-match: applyReviewHighlight() toggles
    // is-ring-match off on every ring whenever nothing is hovered, which
    // would otherwise strip this right back off on every re-render.
    return `<circle class="planner-ring${isCurrent ? ' is-current-ring' : ''}" data-ring="${ring}" cx="${cx}" cy="${cy}" r="${r}" style="stroke:${v.stroke}" stroke-width="${v.strokeWidth}"/>`;
  }).join('');

  // Each label curves along the midline of its own ring's band (rather than
  // sitting as straight text above the ring) so it reads inside that
  // section without overlapping the band above it. Labels render after
  // (on top of) the connector lines below, so the text stays legible even
  // in the rare case a connector's estimated clearance (see
  // verifyLabelClearance) runs close.
  const labelsSvg = RING_ORDER.filter(r => r !== 'client').map(ring => {
    const labelR = mapRingLabelRadius(ringRadii, ring);
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
    <text class="planner-center-label" data-ring="client" x="${cx}" y="${cy - 4}" text-anchor="middle">${escapeXml(p.centerLabel)}</text>
    <text class="planner-center-sub" data-ring="client" x="${cx}" y="${cy + 13}" text-anchor="middle">${escapeXml(p.centerSub)}</text>`;

  function sideSvg(stacked, valence) {
    const records = stacked.map(({ item, y }) => {
      const { w, h } = item;
      const ringR = ringRadii[item.ring];
      const pillX = valence === 'risk' ? (cx - outerR - MAP_PILL_GAP - w) : (cx + outerR + MAP_PILL_GAP);
      const lineStartX = valence === 'risk' ? pillX + w : pillX;
      // Aim straight at the circle's center and stop where that line meets
      // this pill's own ring: center + (unit vector toward the pill) × r.
      const vx = lineStartX - cx, vy = y - cy;
      const len = Math.hypot(vx, vy) || 1;
      const entryX = cx + (vx / len) * ringR;
      const entryY = cy + (vy / len) * ringR;
      return { item, w, h, y, pillX, lineStartX, entryX, entryY };
    });

    let lines = '', pillsHtml = '';
    records.forEach(rec => {
      const { item, w, h, y, pillX, lineStartX, entryX, entryY } = rec;
      const color = CHIP_COLOR_BY_WEIGHT[valence][item.weight];

      // One straight line, pill to ring — never an elbow. A small terminal
      // dot caps the endpoint so the ring it belongs to reads
      // unambiguously, even where the line crosses other rings on the way in.
      const connectorPath = `M ${lineStartX.toFixed(1)} ${y.toFixed(1)} L ${entryX.toFixed(1)} ${entryY.toFixed(1)}`;
      lines += `<path class="planner-connector planner-connector-${valence}" data-ring="${item.ring}" data-factor-id="${item.id}" d="${connectorPath}" fill="none" stroke-width="${MAP_CONNECTOR_WIDTH}" style="stroke:${color}"/>` +
        `<circle class="planner-connector planner-connector-dot planner-connector-${valence}" data-ring="${item.ring}" data-factor-id="${item.id}" cx="${entryX.toFixed(1)}" cy="${entryY.toFixed(1)}" r="${MAP_ENDPOINT_DOT_R}" style="fill:${color}"/>`;
      connectorSegments.push({ x1: lineStartX, y1: y, x2: entryX, y2: entryY, factorId: item.id, ring: item.ring });

      const pillTop = y - h / 2;
      const clipId = `${idPrefix}-pillclip-${item.id}`;
      const textX = pillX + 14;
      const removeX = valence === 'risk' ? pillX - 12 : pillX + w + 12;

      let rowTop = pillTop;
      const rowsHtml = item.rows.map((row, ri) => {
        const rowColor = CHIP_COLOR_BY_WEIGHT[valence][row.weight];
        const textColor = row.weight >= 5 ? '#FFFFFF' : (valence === 'risk' ? 'hsl(6,55%,24%)' : 'hsl(112,35%,20%)');
        // Laid out from the row's top edge down: dots first, then the
        // (possibly multi-line) text below them.
        const dotY = rowTop + MAP_PILL_TOP_PAD;
        const firstLineY = dotY + MAP_PILL_DOT_TEXT_GAP;

        // Each dot gets a generously-sized invisible hit circle around the
        // small visible one, so the weight is actually clickable/tappable.
        const dots = Array.from({ length: 5 }, (_, di) => {
          const dotX = valence === 'risk' ? (pillX + 21 + di * 10) : (pillX + w - 21 - (4 - di) * 10);
          return `
            <g class="eco-wdot-hit" data-ring="${item.ring}" data-valence="${valence}" data-index="${row.idx}" data-value="${di + 1}">
              <circle cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="9" fill="transparent"/>
              <circle class="eco-wdot${di < row.weight ? ' filled' : ''}" cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="3.6"/>
            </g>`;
        }).join('');

        // Outside the pill on the page background, aligned with this row's
        // dot row — always a fixed dark color so it never blends in.
        const removeBtn = locked ? '' : `
          <g class="eco-pill-remove" data-ring="${item.ring}" data-valence="${valence}" data-index="${row.idx}" transform="translate(${removeX.toFixed(1)},${dotY.toFixed(1)})" style="color:var(--text)">
            <circle r="9" fill="transparent"/>
            <line x1="-4" y1="-4" x2="4" y2="4"/><line x1="-4" y1="4" x2="4" y2="-4"/>
          </g>`;

        // Full text, never truncated — wrapped across as many lines as needed.
        const textHtml = row.lines.map((line, li) =>
          `<text x="${textX.toFixed(1)}" y="${(firstLineY + li * MAP_PILL_LINE_H).toFixed(1)}" fill="${textColor}">${escapeXml(line)}</text>`
        ).join('');

        // A thin divider between rows of the same pill.
        const divider = ri > 0
          ? `<line class="eco-pill-divider" x1="${pillX.toFixed(1)}" y1="${rowTop.toFixed(1)}" x2="${(pillX + w).toFixed(1)}" y2="${rowTop.toFixed(1)}"/>` : '';

        const html = `
          <g class="eco-pill-row" style="color:${textColor}">
            <rect class="eco-pill-row-bg" x="${pillX.toFixed(1)}" y="${rowTop.toFixed(1)}" width="${w.toFixed(1)}" height="${row.h.toFixed(1)}" fill="${rowColor}" clip-path="url(#${clipId})"/>
            ${divider}${textHtml}${dots}
          </g>${removeBtn}`;
        rowTop += row.h;
        return html;
      }).join('');

      pillsHtml += `
        <g class="eco-pill" data-ring="${item.ring}" data-factor-id="${item.id}">
          <clipPath id="${clipId}"><rect x="${pillX.toFixed(1)}" y="${pillTop.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="20"/></clipPath>
          ${rowsHtml}
          <rect class="eco-pill-outline" x="${pillX.toFixed(1)}" y="${pillTop.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="20" fill="none"/>
        </g>`;
    });
    return { lines, pillsHtml };
  }

  const connectorSegments = [];
  const riskSide = sideSvg(riskStacked, 'risk');
  const protSide = sideSvg(protStacked, 'protective');
  verifyNoConnectorOverlap(connectorSegments);
  verifyLabelClearance(connectorSegments, ringRadii, cx, cy);

  // Paint order matters here: rings (with their opaque fill) go down first,
  // THEN the connector lines on top of that fill — otherwise every ring
  // drawn after a line would paint right over it, making lines to inner
  // rings look like they stop at the outermost ring instead of visibly
  // crossing through it. Pills stay on top of everything.
  return `<svg viewBox="0 0 ${vbW} ${vbH}" class="planner-eco-svg${locked ? ' is-locked' : ''}" role="img" aria-label="Concentric circle diagram of client ecological formulation">
    ${ringsSvg}
    ${riskSide.lines}${protSide.lines}
    ${labelsSvg}${centerSvg}
    ${riskSide.pillsHtml}${protSide.pillsHtml}
  </svg>`;
}

const plannerState = {
  data: null, factors: {}, currentStep: 0, furthestStep: 0, hasGenerated: false,
  nextFactorId: 1, // stable per-factor id so the top-3 picker can track a factor across re-renders
  topContributors: { risk: [null, null, null], protective: [null, null, null] },
  interventionsByFactor: {}, // factor id -> array of intervention strings; each top factor gets its own list
  phaseComments: ['', '', ''], // freeform notes per Phase 1/2/3, shown on Review and in the printed plan
  phase3Checks: [], // checked state of each Phase 3 checklist item, by index
  ringLabelByKey: {}
};
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
      interventionsByFactor: plannerState.interventionsByFactor,
      phaseComments: plannerState.phaseComments,
      phase3Checks: plannerState.phase3Checks
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
      // At least 3 slots, but never truncate — a clinician may have added a
      // 4th/5th/6th+ factor beyond the original 3.
      const fix = list => {
        const clean = Array.isArray(list) ? list.slice() : [];
        while (clean.length < 3) clean.push(null);
        return clean;
      };
      plannerState.topContributors = {
        risk: fix(saved.topContributors.risk),
        protective: fix(saved.topContributors.protective)
      };
    }
    if (saved.interventionsByFactor && typeof saved.interventionsByFactor === 'object') {
      plannerState.interventionsByFactor = saved.interventionsByFactor;
    }
    if (Array.isArray(saved.phaseComments)) {
      plannerState.phaseComments = [0, 1, 2].map(i => saved.phaseComments[i] || '');
    }
    if (Array.isArray(saved.phase3Checks)) {
      plannerState.phase3Checks = saved.phase3Checks.map(Boolean);
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
  document.getElementById('plannerEcoMapRiskTitle').textContent = p.ecoMapRiskLabel;
  document.getElementById('plannerEcoMapProtectiveTitle').textContent = p.ecoMapProtectiveLabel;
  document.getElementById('plannerRestartLink').textContent = p.resetButtonLabel;
  document.getElementById('plannerDownloadBtn').textContent = p.downloadButtonLabel;
  document.getElementById('plannerDownloadHint').textContent = p.downloadHint;
  document.getElementById('plannerEmptyState').textContent = p.emptyStateText;
  document.getElementById('plannerBackBtn').textContent = p.backButtonLabel;

  // Review's three phase headers reuse the same Phase 1/2/3 titles and
  // session ranges as the Treatment Roadmap, so they stay in sync with that
  // content instead of needing their own separate copy.
  const roadmapPhases = data.toolkit.tabs.roadmap.phases;
  [1, 2, 3].forEach(n => {
    const ph = roadmapPhases[n - 1];
    if (!ph) return;
    document.getElementById(`plannerPhase${n}Title`).textContent = ph.title;
    document.getElementById(`plannerPhase${n}Sessions`).textContent = ph.sessions;
    document.getElementById(`plannerPhase${n}Goal`).innerHTML = phaseGoalHtml(n - 1);
    document.getElementById(`plannerPhase${n}CommentLabel`).textContent = p.phaseCommentLabel;
    document.getElementById(`plannerPhase${n}CommentInput`).placeholder = p.phaseCommentPlaceholder;
  });
  document.getElementById('plannerEmailBtn').textContent = p.emailPlan.buttonLabel;
  document.getElementById('plannerEmailHint').textContent = p.emailPlan.hint;

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

  const stepLabels = p.rings.map(r => r.label).concat(['Top Factors', 'Resources', 'Review']);
  // Each step's icon shows what it covers (the step title still gives its number).
  const STEP_ICONS = { community: 'ic-building', school: 'ic-school', family: 'ic-home', peer: 'ic-users', client: 'ic-user',
    topFactors: 'ic-star', resourcePlan: 'ic-tool', review: 'ic-clipboard' };
  document.getElementById('plannerStepper').innerHTML = stepLabels.map((label, i) => `
    <button type="button" class="planner-step-item" data-step-index="${i}" data-ring="${STEP_KEYS[i]}" aria-label="Step ${i + 1}: ${label}">
      <span class="planner-step-dot">${icon(STEP_ICONS[STEP_KEYS[i]] || 'ic-clipboard', 'step-icon')}</span>
      <span class="planner-step-label">${label}</span>
    </button>`).join('');
}

function initPlanner() {
  const layout = document.getElementById('plannerLayout');
  if (!layout) return;

  // ── Ring hover highlight (ring steps and Review alike): hovering a ring's
  // name (left stepper or a row label) spotlights that ring's factors and
  // circle, and fades the rest.
  const reviewHighlightState = { ring: null };

  // On ring steps (1–5), the circles and ring/center wording default to
  // "current ring lit, the rest lighter" even with nothing hovered — hovering
  // a different ring/pill temporarily previews that one instead (see
  // applyRingHighlight, shared with the pill-hover system below).
  function defaultHighlightRing() {
    const stepKey = STEP_KEYS[plannerState.currentStep];
    return RING_ORDER.includes(stepKey) ? stepKey : null;
  }

  function applyRingHighlight() {
    const hoveredPillRing = pillHighlightState.factorId != null
      ? document.querySelector(`.eco-pill[data-factor-id="${pillHighlightState.factorId}"]`)?.dataset.ring
      : null;
    const ring = hoveredPillRing || reviewHighlightState.ring || defaultHighlightRing();
    const active = !!ring;
    document.querySelectorAll('.planner-ring[data-ring]').forEach(el => {
      el.classList.toggle('is-ring-match', active && el.dataset.ring === ring);
      el.classList.toggle('is-ring-dim', active && el.dataset.ring !== ring);
    });
    document.querySelectorAll('.planner-ring-label[data-ring], .planner-center-label[data-ring], .planner-center-sub[data-ring]').forEach(lbl => {
      lbl.classList.toggle('is-ring-match', active && lbl.dataset.ring === ring);
      lbl.classList.toggle('is-ring-dim', active && lbl.dataset.ring !== ring);
    });
  }

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
    document.querySelectorAll('.planner-connector[data-ring]').forEach(line => {
      line.classList.toggle('is-ring-match', active && line.dataset.ring === ring);
      line.classList.toggle('is-ring-dim', active && line.dataset.ring !== ring);
    });
    document.querySelectorAll('.eco-pill[data-ring]').forEach(pill => {
      pill.classList.toggle('is-ring-match', active && pill.dataset.ring === ring);
      pill.classList.toggle('is-ring-dim', active && pill.dataset.ring !== ring);
    });
    applyRingHighlight();
  }

  function setReviewHighlight(ring) {
    reviewHighlightState.ring = ring;
    applyReviewHighlight(ring);
  }

  const plannerSection = document.getElementById('planner');
  function ringFromHoverTarget(target) {
    const stepItem = target.closest('.planner-step-item[data-ring]');
    if (stepItem && !NON_RING_STEP_KEYS.includes(stepItem.dataset.ring)) return stepItem.dataset.ring;
    const label = target.closest('.planner-row > label, .planner-ring-label[data-ring]');
    if (label) return label.dataset.ring || label.closest('.planner-row').dataset.ring;
    const ring = target.closest('.planner-ring[data-ring]');
    if (ring) return ring.dataset.ring;
    return null;
  }

  // Hovering one specific pill (anywhere the map shows, not just Review)
  // isolates just that one connector line instead of the whole ring — with
  // several factors in play, it's the only reliable way to tell exactly
  // which line a given bubble belongs to.
  const pillHighlightState = { factorId: null };
  function applyPillHighlight(factorId) {
    const active = factorId != null;
    document.querySelectorAll('.eco-pill[data-factor-id]').forEach(pill => {
      pill.classList.toggle('is-pill-match', active && pill.dataset.factorId === String(factorId));
      pill.classList.toggle('is-pill-dim', active && pill.dataset.factorId !== String(factorId));
    });
    document.querySelectorAll('.planner-connector[data-factor-id]').forEach(line => {
      line.classList.toggle('is-pill-match', active && line.dataset.factorId === String(factorId));
      line.classList.toggle('is-pill-dim', active && line.dataset.factorId !== String(factorId));
    });

    // Also spotlight the ring this pill belongs to — same is-ring-match/
    // is-ring-dim treatment as hovering that ring/layer directly, just
    // triggered from the pill instead (shared with applyReviewHighlight;
    // falls back to the step's default ring when no pill is hovered).
    applyRingHighlight();
  }
  function setPillHighlight(factorId) {
    pillHighlightState.factorId = factorId;
    applyPillHighlight(factorId);
  }

  if (plannerSection) {
    plannerSection.addEventListener('mouseover', e => {
      const pill = e.target.closest('.eco-pill[data-factor-id]');
      if (pill) { setPillHighlight(pill.dataset.factorId); return; }
      const ring = ringFromHoverTarget(e.target);
      if (ring) setReviewHighlight(ring);
    });
    plannerSection.addEventListener('mouseout', e => {
      const pill = e.target.closest('.eco-pill[data-factor-id]');
      if (pill) { if (!pill.contains(e.relatedTarget)) setPillHighlight(null); return; }
      const hoverable = e.target.closest('.planner-step-item[data-ring], .planner-row > label, .planner-ring-label[data-ring], .planner-ring[data-ring]');
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
    container.innerHTML = buildEcoMapSvg({ currentRing, locked: onReview, idPrefix: 'live', onlyCurrentRing: !!currentRing });
    applyReviewHighlight(reviewHighlightState.ring);
    applyPillHighlight(pillHighlightState.factorId);
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
    document.getElementById('plannerEmailHint').hidden = !onReview;
    // The generated plan only belongs on Review — once you've generated it,
    // it shouldn't keep trailing along at the bottom of every other step.
    document.getElementById('plannerOutput').hidden = !(onReview && plannerState.hasGenerated);
    // The add-factor forms only belong on ring steps — Review has nothing left
    // to add, and both curation steps (Top Factors, Resources) stand on their own.
    document.getElementById('plannerLayout').hidden = isTopFactorsStep || isResourcePlanStep || onReview;
    // The ecological map belongs on ring steps and Review — both curation
    // steps (Top Factors, Resources) stand on their own without it. Its
    // "Phase 1" header only belongs on Review, since steps 1–5 already have
    // their own per-ring step header above.
    document.getElementById('plannerEcoMapWrap').hidden = isTopFactorsStep || isResourcePlanStep;
    document.getElementById('plannerReviewPhase1Head').hidden = !onReview;
    document.getElementById('plannerPriorityStrip').hidden = !onReview;
    document.getElementById('plannerTopFactorsSection').hidden = !isTopFactorsStep;
    document.getElementById('plannerResourcePlanSection').hidden = !isResourcePlanStep;

    if (isTopFactorsStep) renderTopFactorsStep();
    if (isResourcePlanStep) renderInterventionStep();

    // Review gets the same "Step X of Y: Label" header as every other step —
    // no separate custom heading/intro. The last three steps conclude the
    // mapping activity as three named phases.
    let title, hint;
    if (onReview) {
      title = `Step ${index + 1} of ${STEP_KEYS.length}: Treatment Plan`;
      hint = '';
    } else if (isRingStep) {
      const ringData = p.rings.find(r => r.key === stepKey);
      title = `Step ${index + 1} of ${STEP_KEYS.length}: ${ringData.label}`;
      hint = p.stepHint;
    } else if (isTopFactorsStep) {
      title = `Step ${index + 1} of ${STEP_KEYS.length}: Identify Top Factors Impacting the Client`;
      hint = 'Drag — or click — your top risk and protective factors into the boxes below. At least 3 of each is a good start — add a 4th, 5th, or more with the + button or by dropping in extra factors from the lists above.';
    } else {
      title = `Step ${index + 1} of ${STEP_KEYS.length}: Select Interventions`;
      hint = 'Type to choose a strategy or practice for each factor below, or write in your own — add as many as you need per factor.';
    }
    document.getElementById('plannerStepTitle').textContent = title;
    document.getElementById('plannerStepHint').textContent = hint;
    // Same goal reminder on every step, worded for what that step asks of you.
    const goalStepKey = isRingStep ? 'ring' : stepKey;
    document.getElementById('plannerStepGoal').innerHTML = stepGoalHtml(goalStepKey);

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
    if (key === 'resourcePlan') renderInterventionStep();
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
          // The original 3 slots are a permanent floor and stay empty-but-
          // present; a 4th+ empty slot (e.g. right after clicking "+") can
          // be removed outright so an accidental add is easy to undo.
          const removable = i >= 3;
          return `<div class="planner-slot" data-valence="${valence}" data-slot-index="${i}">
            <span class="planner-slot-num">${i + 1}</span>
            <span class="planner-slot-hint">Drag or click a ${valence === 'risk' ? 'risk' : 'protective'} factor</span>
            ${removable ? `<button type="button" class="planner-chip-remove" data-clear-slot="${valence}:${i}" aria-label="Remove this slot">${icon('i-x', 'icon-xs')}</button>` : ''}
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
      }).join('') + `
        <button type="button" class="planner-add-slot-btn" data-add-slot="${valence}">${icon('i-plus', 'icon-xs')} Add another ${valence === 'risk' ? 'risk' : 'protective'} factor</button>`;
    });
  }

  function placeTopContributor(valence, factorId, slotIndex) {
    const slots = plannerState.topContributors[valence];
    if (slots.includes(factorId)) return;
    let targetIndex = slotIndex !== undefined ? slotIndex : slots.indexOf(null);
    // No empty slot (specific or otherwise) — grow a new one for this pick,
    // so dropping/clicking a 4th+ factor always works, not just the first 3.
    if (targetIndex === -1 || targetIndex === undefined) targetIndex = slots.length;
    slots[targetIndex] = factorId;
    renderTopFactorsStep();
    persistPlannerState();
  }

  // Clearing one of the original 3 slots just empties it (that floor always
  // shows); clearing a 4th+ slot removes it entirely.
  function clearTopContributor(valence, slotIndex) {
    const slots = plannerState.topContributors[valence];
    if (slotIndex >= 3) slots.splice(slotIndex, 1);
    else slots[slotIndex] = null;
    renderTopFactorsStep();
    persistPlannerState();
  }

  function addTopFactorSlot(valence) {
    plannerState.topContributors[valence].push(null);
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
      const addSlotBtn = e.target.closest('[data-add-slot]');
      if (addSlotBtn) { addTopFactorSlot(addSlotBtn.dataset.addSlot); return; }
      const poolChip = e.target.closest('.planner-pool-chip');
      if (poolChip) placeTopContributor(poolChip.dataset.valence, parseInt(poolChip.dataset.id, 10));
    });
    topFactorsSection.addEventListener('dragstart', e => {
      const chip = e.target.closest('.planner-pool-chip');
      if (!chip) return;
      e.dataTransfer.setData('text/plain', JSON.stringify({ id: parseInt(chip.dataset.id, 10), valence: chip.dataset.valence }));
      e.dataTransfer.effectAllowed = 'move';
    });
    // Dropping anywhere in a valence's slot zone works, not just on an empty
    // slot box — if every current slot is full, it grows a new one, so a
    // 4th/5th/6th+ factor can be dropped in directly.
    topFactorsSection.addEventListener('dragover', e => {
      const container = e.target.closest('.planner-slots');
      if (!container) return;
      e.preventDefault();
      container.classList.add('is-over');
    });
    topFactorsSection.addEventListener('dragleave', e => {
      const container = e.target.closest('.planner-slots');
      if (container) container.classList.remove('is-over');
    });
    topFactorsSection.addEventListener('drop', e => {
      const container = e.target.closest('.planner-slots');
      if (!container) return;
      e.preventDefault();
      container.classList.remove('is-over');
      let payload;
      try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return; }
      if (!payload || payload.valence !== container.dataset.valence) return;
      const emptySlot = e.target.closest('.planner-slot:not(.is-filled)');
      placeTopContributor(payload.valence, payload.id, emptySlot ? parseInt(emptySlot.dataset.slotIndex, 10) : undefined);
    });
  }

  // ── Step: Phase 2 — Select Intervention. Every selected top factor (up to
  // 3 risk + 3 protective) gets its own picker — a dropdown plus a write-in
  // field — so each factor ends up with at least one assigned
  // strategy/practice, with multiple allowed per factor. ──
  // Each factor's input opens a custom suggestion dropdown (a native
  // <datalist> can't show anything on hover). Typing filters the 71
  // options, but anything can still be typed and added. Hovering (or
  // arrowing to) an option previews its description with a link to that
  // practice in the Treatment Library.
  function renderInterventionStep() {
    const container = document.getElementById('interventionFactorsList');
    if (!container) return;
    const factors = selectedTopContributors();
    if (!factors.length) {
      container.innerHTML = `<p class="planner-pool-empty">Pick your top risk and protective factors on the previous step first — each one gets its own intervention here.</p>`;
      return;
    }

    container.innerHTML = factors.map(f => {
      const chosen = plannerState.interventionsByFactor[f.id] || [];
      const chipsHtml = chosen.map((text, i) => `
        <span class="planner-chip planner-chip-neutral">
          <span class="planner-chip-text">${escapeXml(text)}</span>
          <button type="button" class="planner-chip-remove" data-remove-intervention="${f.id}:${i}" aria-label="Remove">${icon('i-x', 'icon-xs')}</button>
        </span>`).join('');
      return `
        <div class="intervention-factor-row">
          <div class="intervention-factor-header">
            <span class="planner-note-tag planner-note-tag-${f.valence}">${f.valence === 'risk' ? 'Risk' : 'Protective'}</span>
            <strong class="intervention-factor-name">${escapeXml(f.text)}</strong>
            ${severityDotsHtml(f.valence, f.weight)}
          </div>
          <div class="intervention-input-row">
            <div class="intervention-combo">
              <input type="text" class="planner-input intervention-input" autocomplete="off"
                     role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="interventionListbox"
                     data-factor-id="${f.id}" placeholder="Type or choose a strategy/practice…" />
            </div>
            <button type="button" class="btn btn-primary intervention-add-btn" data-factor-id="${f.id}">Add</button>
          </div>
          ${chipsHtml ? `<div class="intervention-selected-list">${chipsHtml}</div>` : ''}
        </div>`;
    }).join('');
  }

  function addIntervention(factorId, text) {
    text = text.trim();
    if (!text) return;
    const list = plannerState.interventionsByFactor[factorId] = plannerState.interventionsByFactor[factorId] || [];
    if (list.includes(text)) return;
    list.push(text);
    renderInterventionStep();
    persistPlannerState();
  }

  function removeIntervention(factorId, index) {
    const list = plannerState.interventionsByFactor[factorId];
    if (!list) return;
    list.splice(index, 1);
    renderInterventionStep();
    persistPlannerState();
  }

  // ── Intervention suggestion dropdown — one shared panel that moves into
  // whichever factor's combo is focused. Left: filtered options. Right (or
  // below, on narrow screens): a preview of the hovered/arrowed option with
  // its description and a "Learn more" link into the Treatment Library. ──
  // Built-in options plus every practice in the Treatment Library, so a
  // practice added in the CMS shows up here too. Sorted on each use because
  // the library can finish loading after this step first renders.
  function sortedInterventions() {
    const byKey = new Map();
    INTERVENTION_OPTIONS.concat(Object.values(practiceLibrary).map(p => p.title))
      .forEach(name => { const k = name.trim().toLowerCase(); if (!byKey.has(k)) byKey.set(k, name.trim()); });
    return [...byKey.values()].sort((a, b) => a.localeCompare(b));
  }
  const combo = { input: null, panel: null, options: [], active: -1, pointerType: 'mouse' };

  function comboPanel() {
    if (combo.panel && document.contains(combo.panel)) return combo.panel;
    const panel = document.createElement('div');
    panel.className = 'intervention-dropdown';
    panel.innerHTML = `
      <ul class="intervention-options" id="interventionListbox" role="listbox" aria-label="Strategies and practices"></ul>
      <div class="intervention-preview" aria-live="polite"></div>`;
    // Keep focus in the input when picking with the mouse.
    panel.addEventListener('mousedown', e => { if (!e.target.closest('a, button')) e.preventDefault(); });
    panel.addEventListener('pointerdown', e => { combo.pointerType = e.pointerType || 'mouse'; });
    panel.addEventListener('mouseover', e => {
      const li = e.target.closest('.intervention-option');
      if (li) setComboActive(parseInt(li.dataset.index, 10), false);
    });
    panel.addEventListener('click', e => {
      const addBtn = e.target.closest('.intervention-preview-add');
      if (addBtn) { pickComboOption(combo.options[combo.active]); return; }
      const li = e.target.closest('.intervention-option');
      if (!li) return;
      const index = parseInt(li.dataset.index, 10);
      // Touch has no hover, so the first tap previews and the preview's
      // "Add" button confirms; a mouse click adds straight away.
      if (combo.pointerType === 'touch' && combo.active !== index) setComboActive(index, false);
      else pickComboOption(combo.options[index]);
    });
    combo.panel = panel;
    return panel;
  }

  function practicePreviewHtml(name) {
    const info = practiceInfo(name);
    const description = info && info.description
      ? escapeXml(info.description)
      : '<em>Description coming soon.</em>';
    return `
      <h4>${escapeXml(name)}</h4>
      <p>${description}</p>
      <div class="intervention-preview-actions">
        <a class="btn btn-outline intervention-learn-more" href="${treatmentLibraryHref(name)}" target="_blank" rel="noopener">Learn more</a>
        <button type="button" class="btn btn-primary intervention-preview-add">Add</button>
      </div>`;
  }

  function setComboActive(index, scroll) {
    const panel = comboPanel();
    combo.active = index;
    panel.querySelectorAll('.intervention-option').forEach((li, i) => {
      const on = i === index;
      li.classList.toggle('is-active', on);
      li.setAttribute('aria-selected', String(on));
      if (on && scroll) li.scrollIntoView({ block: 'nearest' });
    });
    const preview = panel.querySelector('.intervention-preview');
    if (index >= 0 && combo.options[index]) {
      preview.innerHTML = practicePreviewHtml(combo.options[index]);
      combo.input.setAttribute('aria-activedescendant', `interventionOption${index}`);
    } else {
      preview.innerHTML = `<p class="intervention-preview-hint">Hover over a practice to see what it is.</p>`;
      combo.input && combo.input.removeAttribute('aria-activedescendant');
    }
  }

  function openCombo(input) {
    const panel = comboPanel();
    if (combo.input && combo.input !== input) combo.input.setAttribute('aria-expanded', 'false');
    combo.input = input;
    const q = input.value.trim().toLowerCase();
    const all = sortedInterventions();
    combo.options = q ? all.filter(opt => opt.toLowerCase().includes(q)) : all;
    const list = panel.querySelector('.intervention-options');
    list.innerHTML = combo.options.length
      ? combo.options.map((opt, i) => `<li class="intervention-option" id="interventionOption${i}" role="option" aria-selected="false" data-index="${i}">${escapeXml(opt)}</li>`).join('')
      : `<li class="intervention-option-empty">No match — press Enter or Add to use &ldquo;${escapeXml(input.value.trim())}&rdquo;.</li>`;
    if (panel.parentElement !== input.parentElement) input.parentElement.appendChild(panel);
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    setComboActive(-1, false);
  }

  function closeCombo() {
    if (combo.panel) combo.panel.hidden = true;
    if (combo.input) {
      combo.input.setAttribute('aria-expanded', 'false');
      combo.input.removeAttribute('aria-activedescendant');
    }
    combo.active = -1;
  }

  function pickComboOption(value) {
    if (!combo.input || !value) return;
    const fid = combo.input.dataset.factorId;
    closeCombo();
    addIntervention(fid, value);
    // renderInterventionStep() rebuilds the whole list, so re-query the
    // fresh input for this factor and refocus it for rapid entry.
    interventionFactorsList.querySelector(`.intervention-input[data-factor-id="${fid}"]`)?.focus({ preventScroll: true });
  }

  const interventionFactorsList = document.getElementById('interventionFactorsList');
  if (interventionFactorsList) {
    interventionFactorsList.addEventListener('click', e => {
      const input = e.target.closest('.intervention-input');
      if (input) { openCombo(input); return; }
      const addBtn = e.target.closest('.intervention-add-btn');
      if (addBtn) {
        const fid = addBtn.dataset.factorId;
        const field = interventionFactorsList.querySelector(`.intervention-input[data-factor-id="${fid}"]`);
        closeCombo();
        addIntervention(fid, field.value);
        interventionFactorsList.querySelector(`.intervention-input[data-factor-id="${fid}"]`)?.focus();
        return;
      }
      const removeBtn = e.target.closest('[data-remove-intervention]');
      if (removeBtn) {
        const [fid, idx] = removeBtn.dataset.removeIntervention.split(':');
        removeIntervention(fid, parseInt(idx, 10));
      }
    });
    interventionFactorsList.addEventListener('input', e => {
      const input = e.target.closest('.intervention-input');
      if (input) openCombo(input);
    });
    interventionFactorsList.addEventListener('keydown', e => {
      const input = e.target.closest('.intervention-input');
      if (!input) return;
      const open = combo.panel && !combo.panel.hidden && combo.input === input;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!open) { openCombo(input); return; }
        const n = combo.options.length;
        if (!n) return;
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setComboActive(combo.active < 0 ? (step > 0 ? 0 : n - 1) : (combo.active + step + n) % n, true);
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        closeCombo();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (open && combo.active >= 0) { pickComboOption(combo.options[combo.active]); return; }
        const fid = input.dataset.factorId;
        closeCombo();
        addIntervention(fid, input.value);
        interventionFactorsList.querySelector(`.intervention-input[data-factor-id="${fid}"]`)?.focus();
      }
    });
    // Close when focus or a click lands outside the open combo.
    interventionFactorsList.addEventListener('focusout', e => {
      if (!combo.input || !combo.panel || combo.panel.hidden) return;
      const wrap = combo.input.parentElement;
      if (e.relatedTarget && !wrap.contains(e.relatedTarget)) closeCombo();
    });
    document.addEventListener('mousedown', e => {
      if (!combo.panel || combo.panel.hidden) return;
      if (!e.target.closest('.intervention-combo')) closeCombo();
    });
  }

  function resetPlanner() {
    RING_ORDER.forEach(r => {
      plannerState.factors[r] = { risk: [], protective: [] };
    });
    plannerState.topContributors = { risk: [null, null, null], protective: [null, null, null] };
    plannerState.interventionsByFactor = {};
    plannerState.phaseComments = ['', '', ''];
    plannerState.phase3Checks = [];
    document.querySelectorAll('.planner-phase-comment-input').forEach(el => { el.value = ''; });
    document.getElementById('plannerOutput').hidden = true;
    document.getElementById('plannerDownloadBtn').hidden = true;
    document.getElementById('plannerDownloadHint').hidden = true;
    document.getElementById('plannerEmailBtn').hidden = true;
    document.getElementById('plannerEmailHint').hidden = true;
    plannerState.currentStep = 0;
    plannerState.furthestStep = 0;
    plannerState.hasGenerated = false;
    goToStep(0);
    updateGenerateState();
    try { localStorage.removeItem(PLANNER_STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  document.getElementById('plannerDownloadBtn').addEventListener('click', () => {
    // Regenerate right before printing so the PDF always reflects the
    // latest factors and interventions, even if nothing else changed.
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

  document.querySelectorAll('.planner-phase-comment-input').forEach(el => {
    el.addEventListener('input', () => {
      plannerState.phaseComments[parseInt(el.dataset.phaseIndex, 10)] = el.value;
      persistPlannerState();
    });
  });

  // Phase 3 checklist — delegated so it survives generatePlan() re-rendering
  // the list. Updates state, the progress count, and the email summary in
  // place rather than re-rendering (keeps keyboard focus on the checkbox).
  document.getElementById('plannerPhase3Checklist').addEventListener('change', e => {
    const box = e.target.closest('.planner-checklist-input');
    if (!box) return;
    const i = parseInt(box.dataset.checkIndex, 10);
    plannerState.phase3Checks[i] = box.checked;
    box.closest('.planner-checklist-item').classList.toggle('is-done', box.checked);
    updatePhase3Progress();
    document.getElementById('plannerEmailBtn').href = buildEmailPlanHref(plannerState.data);
    persistPlannerState();
  });

  // Restore any previously entered factors (and the step/output the clinician
  // was on) before landing on the current step.
  goToStep(plannerState.currentStep); // already generates the plan if this lands on Review
  updateGenerateState();
}

function topContributorFactor(valence, id) {
  for (const ring of RING_ORDER) {
    const f = plannerState.factors[ring][valence].find(x => x.id === id);
    if (f) return { ...f, ringLabel: plannerState.ringLabelByKey[ring] };
  }
  return null;
}

// All currently-selected top-3 factors (up to 6: 3 risk + 3 protective), each
// tagged with its valence — the Select Intervention step and the generated
// "My Interventions" output both key off this same list.
function selectedTopContributors() {
  const list = [];
  ['risk', 'protective'].forEach(valence => {
    plannerState.topContributors[valence].forEach(id => {
      if (id === null) return;
      const f = topContributorFactor(valence, id);
      if (f) list.push({ ...f, valence });
    });
  });
  return list;
}

// All factors the clinician has entered (not just the top 3) — every
// ring, both risk and protective — so Review's "Factors" section is the
// complete picture, separate from the curated "Interventions" section below.
function allFactorsList(valence) {
  const list = [];
  RING_ORDER.forEach(ring => {
    plannerState.factors[ring][valence].forEach(f => {
      list.push({ ...f, ring, ringLabel: plannerState.ringLabelByKey[ring] });
    });
  });
  return list;
}

function allFactorsHtml() {
  const listFor = valence => {
    const items = allFactorsList(valence);
    if (!items.length) return `<p class="planner-resource-empty">No ${valence === 'risk' ? 'risk' : 'protective'} factors entered.</p>`;
    return `<ol class="planner-top-list">${items.map(it => `<li>${it.text} <em>(${it.ringLabel} · ${it.weight}/5)</em></li>`).join('')}</ol>`;
  };
  return `
    <h3>Factors</h3>
    <div class="planner-top-contributors">
      <div><h4 class="planner-col-heading-risk">Risk Factors</h4>${listFor('risk')}</div>
      <div><h4 class="planner-col-heading-protective">Protective Factors</h4>${listFor('protective')}</div>
    </div>`;
}

function topContributorsPrintHtml() {
  const listFor = valence => {
    const items = plannerState.topContributors[valence].map(id => id !== null ? topContributorFactor(valence, id) : null).filter(Boolean);
    return items.length ? items.map(it => `${it.text} (${it.ringLabel} · ${it.weight}/5)`).join('; ') : 'None selected';
  };
  return `<h3>Top Contributors</h3><ul><li><strong>Top Risk Factors:</strong> ${listFor('risk')}</li><li><strong>Top Protective Factors:</strong> ${listFor('protective')}</li></ul>`;
}

// Each top factor shown with its severity, its ecological placement (which
// ring it was entered under), and whatever intervention(s) were picked for
// it — the curated counterpart to the full list in "Factors" above.
function interventionsHtml() {
  const factors = selectedTopContributors();
  if (!factors.length) {
    return `<h3>Interventions</h3><p class="planner-resource-empty">No top factors selected yet — go back to the Top Contributors step to add some.</p>`;
  }
  // Two columns — each top factor on the left, the intervention(s) chosen
  // for it on the right — so it's clear which strategy targets which factor.
  const rows = factors.map(f => {
    const list = plannerState.interventionsByFactor[f.id] || [];
    // Names only (no descriptions) as chips, so the column scans quickly.
    const practices = list.length
      ? `<ul class="intervention-review-chips">${list.map(name => `<li>${escapeXml(name)}</li>`).join('')}</ul>`
      : '<span class="intervention-review-none">No intervention selected yet</span>';
    return `
      <tr class="intervention-review-row intervention-review-row-${f.valence}">
        <td class="intervention-review-factor" data-label="Factor">
          <span class="intervention-review-factor-top">
            <span class="planner-note-tag planner-note-tag-${f.valence}">${f.valence === 'risk' ? 'Risk' : 'Protective'}</span>
            <strong class="intervention-review-factor-text">${escapeXml(f.text)}</strong>
          </span>
          <span class="intervention-review-meta">
            <span class="intervention-review-ring">${escapeXml(f.ringLabel)}</span>
            ${severityDotsHtml(f.valence, f.weight)}
          </span>
        </td>
        <td class="intervention-review-practice-cell" data-label="Intervention(s)">${practices}</td>
      </tr>`;
  });
  return `
    <h3>Interventions</h3>
    <table class="intervention-review-table">
      <thead><tr><th scope="col">Factor</th><th scope="col">Intervention(s)</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;
}

function myInterventionsPrintHtml() {
  const factors = selectedTopContributors();
  if (!factors.length) return `<h3>My Interventions</h3><p>No top factors selected.</p>`;
  const rows = factors.map(f => {
    const list = plannerState.interventionsByFactor[f.id] || [];
    const practices = list.map(name => `<li>${escapeXml(name)}</li>`).join('');
    return `<tr>
      <td><strong>${f.valence === 'risk' ? 'Risk' : 'Protective'}</strong> · ${escapeXml(f.text)}<br><span class="print-int-meta">${escapeXml(f.ringLabel)} · ${f.weight}/5</span></td>
      <td>${list.length ? `<ul>${practices}</ul>` : '<em>No intervention selected yet</em>'}</td>
    </tr>`;
  });
  return `<h3>My Interventions</h3>
    <table class="print-int-table">
      <thead><tr><th>Factor</th><th>Intervention(s)</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;
}

// ── Treatment goal (reducing suicidal ideation) — shown on every step, under each
// Review phase heading, and in the printed plan + email summary. ──
function plannerGoal() {
  return (plannerState.data && plannerState.data.planner.goal) || null;
}
function goalTagHtml(g) {
  return `<span class="planner-goal-tag"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>${escapeXml(g.label)}</span>`;
}
function stepGoalHtml(stepKey) {
  const g = plannerGoal();
  const text = g && g.steps && g.steps[stepKey];
  return text ? `${goalTagHtml(g)}<span>${escapeXml(text)}</span>` : '';
}
// Each phase repeats the same goal statement, then says how that phase
// moves toward it ("In this phase") and gives a yes/no check question.
function phaseGoal(i) {
  const g = plannerGoal();
  const ph = g && g.phases && g.phases[i];
  if (!ph) return null;
  return typeof ph === 'string' ? { focus: ph, check: '' } : ph;
}
function phaseGoalHtml(i) {
  const g = plannerGoal();
  const ph = phaseGoal(i);
  if (!ph) return '';
  return `
    <span class="planner-phase-goal-head">${goalTagHtml(g)}<strong>${escapeXml(g.statement)}</strong></span>
    ${ph.focus ? `<span class="planner-phase-goal-row"><em>${escapeXml(g.focusLabel || 'In this phase')}:</em> ${escapeXml(ph.focus)}</span>` : ''}
    ${ph.check ? `<span class="planner-phase-goal-row planner-phase-goal-check"><em>${escapeXml(g.checkLabel || 'Check')}:</em> ${escapeXml(ph.check)}</span>` : ''}`;
}
function phaseGoalPrintHtml(i) {
  const g = plannerGoal();
  const ph = phaseGoal(i);
  if (!ph) return '';
  return `<div class="print-phase-goal">
    <p><strong>${escapeXml(g.label)}: ${escapeXml(g.statement)}</strong></p>
    ${ph.focus ? `<p><em>${escapeXml(g.focusLabel || 'In this phase')}:</em> ${escapeXml(ph.focus)}</p>` : ''}
    ${ph.check ? `<p><em>${escapeXml(g.checkLabel || 'Check')}:</em> ${escapeXml(ph.check)}</p>` : ''}
  </div>`;
}

// ── Phase 3 checklist (Consolidate & Next Steps) ──
function phase3ChecklistItems() {
  const c = plannerState.data.planner.phase3Checklist;
  return c && Array.isArray(c.items) ? c.items : [];
}

// An item's links: the "links" list, or the older single linkText/linkHref.
function checklistLinks(it) {
  if (Array.isArray(it.links)) return it.links.filter(l => l && l.text && l.href);
  return it.linkText && it.linkHref ? [{ text: it.linkText, href: it.linkHref }] : [];
}

function updatePhase3Progress() {
  const c = plannerState.data.planner.phase3Checklist;
  const items = phase3ChecklistItems();
  const done = items.filter((_, i) => plannerState.phase3Checks[i]).length;
  const el = document.getElementById('plannerPhase3Progress');
  if (el) el.textContent = `${done} of ${items.length} ${c.progressLabel || 'complete'}`;
}

function phase3ChecklistHtml() {
  const c = plannerState.data.planner.phase3Checklist;
  const items = phase3ChecklistItems();
  if (!items.length) return '';
  const rows = items.map((it, i) => {
    const checked = !!plannerState.phase3Checks[i];
    const link = checklistLinks(it)
      .map(l => `<a class="planner-checklist-link" href="${escapeXml(l.href)}" target="_blank" rel="noopener">${escapeXml(l.text)} →</a>`)
      .join('');
    return `
      <li class="planner-checklist-item${checked ? ' is-done' : ''}">
        <label>
          <input type="checkbox" class="planner-checklist-input" data-check-index="${i}"${checked ? ' checked' : ''}/>
          <span class="planner-checklist-box" aria-hidden="true"></span>
          ${it.icon ? `<span class="planner-checklist-icon" aria-hidden="true">${icon(it.icon, 'icon-sm')}</span>` : ''}
          <span class="planner-checklist-text">
            <strong>${escapeXml(it.text)}</strong>
            ${it.detail ? `<span class="planner-checklist-detail">${escapeXml(it.detail)}</span>` : ''}
          </span>
        </label>${link ? `<div class="planner-checklist-link-row">${link}</div>` : ''}
      </li>`;
  }).join('');
  return `
    <div class="planner-checklist-head">
      <h3>${escapeXml(c.heading)}</h3>
      <span class="planner-checklist-progress" id="plannerPhase3Progress" aria-live="polite"></span>
    </div>
    ${c.intro ? `<p class="planner-checklist-intro">${escapeXml(c.intro)}</p>` : ''}
    <ul class="planner-checklist-list">${rows}</ul>`;
}

function phase3ChecklistPrintHtml() {
  const c = plannerState.data.planner.phase3Checklist;
  const items = phase3ChecklistItems();
  if (!items.length) return '';
  return `<h3>${escapeXml(c.heading)}</h3><ul class="print-checklist">${items.map((it, i) => `
    <li>
      <span class="print-check-title">${plannerState.phase3Checks[i] ? '☑' : '☐'} ${escapeXml(it.text)}</span>
      ${it.detail ? `<span class="print-check-detail">${escapeXml(it.detail)}</span>` : ''}
      ${checklistLinks(it).length ? `<span class="print-check-link">${checklistLinks(it).map(l => `${escapeXml(l.text)} →`).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}</span>` : ''}
    </li>`).join('')}</ul>`;
}

// Opt-in "Email My Plan" — a plain-text mailto summary (factors, severities,
// interventions), not the formatted PDF. No backend exists on this static
// site to send mail directly, so this opens the clinician's own email
// client, pre-filled, and lets them review/send it themselves — the same
// pattern every other "contact us" link on the site already uses.
function buildEmailPlanSummary(data) {
  const lines = ['Therapist Toolkit — Plan Summary'];
  const goal = plannerGoal();
  if (goal) lines.push(`${goal.label}: ${goal.statement}`);
  lines.push('');
  RING_ORDER.forEach(ring => {
    const risk = plannerState.factors[ring].risk;
    const protective = plannerState.factors[ring].protective;
    if (!risk.length && !protective.length) return;
    lines.push(`${plannerState.ringLabelByKey[ring]}:`);
    risk.forEach(f => lines.push(`  Risk: ${f.text} (${f.weight}/5)`));
    protective.forEach(f => lines.push(`  Protective: ${f.text} (${f.weight}/5)`));
  });

  const factors = selectedTopContributors();
  if (factors.length) {
    lines.push('', 'Top Factors & Interventions:');
    factors.forEach(f => {
      const list = plannerState.interventionsByFactor[f.id] || [];
      lines.push(`  ${f.valence === 'risk' ? 'Risk' : 'Protective'} · ${f.text}: ${list.length ? list.join(', ') : 'no intervention selected yet'}`);
    });
  }

  const checklist = phase3ChecklistItems();
  if (checklist.length) {
    lines.push('', `${data.planner.phase3Checklist.heading}:`);
    checklist.forEach((it, i) => lines.push(`  [${plannerState.phase3Checks[i] ? 'x' : ' '}] ${it.text}`));
  }
  return lines.join('\n');
}

function buildEmailPlanHref(data) {
  const subject = encodeURIComponent('Therapist Toolkit — Plan Summary');
  const body = encodeURIComponent(buildEmailPlanSummary(data));
  return `mailto:${data.planner.emailPlan.address}?subject=${subject}&body=${body}`;
}

// The strip's three cards all look the same by default (see styles.css) —
// hover/focus is handled purely in CSS, and clicking a card both jumps to
// that phase's section and marks the clicked card "current" until another
// one is clicked.
function initPhaseStripNav() {
  const strip = document.getElementById('plannerPriorityStrip');
  if (!strip) return;
  const targets = [
    document.getElementById('plannerReviewPhase1Head'),
    document.getElementById('plannerReviewPhase2Head'),
    document.getElementById('plannerReviewPhase3Head')
  ];
  function activateCard(card) {
    strip.querySelectorAll('.planner-phase-card').forEach(c => c.classList.toggle('is-current', c === card));
    const target = targets[parseInt(card.dataset.phaseIndex, 10)];
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  strip.addEventListener('click', e => {
    const card = e.target.closest('.planner-phase-card');
    if (card) activateCard(card);
  });
  strip.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.planner-phase-card');
    if (!card) return;
    e.preventDefault();
    activateCard(card);
  });
}

function generatePlan() {
  const data = plannerState.data;
  const phases = data.toolkit.tabs.roadmap.phases;
  const ringLabelByKey = plannerState.ringLabelByKey;

  const notes = [];

  RING_ORDER.forEach(ring => {
    ['risk', 'protective'].forEach(valence => {
      const factors = plannerState.factors[ring][valence];
      if (!factors.length) return;
      const rec = RING_RECOMMENDATIONS[ring][valence];
      const maxWeight = Math.max(...factors.map(f => f.weight));
      notes.push({ ringLabel: ringLabelByKey[ring], valence, text: rec.planNote, weight: maxWeight });
    });
  });

  notes.sort((a, b) => b.weight - a.weight);

  // A plain, unscored, clickable strip — all three cards look the same
  // until hovered/focused or clicked (see initPhaseStripNav/styles.css).
  const priorityStripHtml = phases.map((ph, i) => `
    <div class="planner-phase-card phase-${i + 1}" data-phase-index="${i}" role="button" tabindex="0">
      ${icon(['ic-search', 'ic-tool', 'ic-flag'][i] || 'ic-flag', 'phase-card-icon')}
      <strong>${ph.title}</strong>
      <span>${ph.sessions}</span>
    </div>`).join('');

  // Links out to the other standalone pages — these open in a new tab so
  // the clinician doesn't lose their in-progress plan.
  const moreHtml = `
    <h3>${data.planner.outputHeadings.more}</h3>
    <div class="planner-more-links">
      <a class="btn btn-primary" href="resource-library.html" target="_blank" rel="noopener">Treatment Library</a>
      <a class="btn btn-outline" href="find-referral.html" target="_blank" rel="noopener">Community Resources</a>
      <a class="btn btn-outline" href="schools.html" target="_blank" rel="noopener">Navigating Schools</a>
      <a class="btn btn-outline" href="self-care.html" target="_blank" rel="noopener">Self Care and Support for Therapists</a>
      <a class="btn btn-outline" href="safety-plan.html" target="_blank" rel="noopener">Make a Safety Plan For Your Client</a>
    </div>`;

  // Factors (Phase 1, alongside the map) and Interventions (Phase 2) render
  // into separate blocks now that Review is organized by phase, rather than
  // one combined "Top Plan" block. The priority strip sits above all three
  // phase sections, not nested inside Phase 1.
  document.getElementById('plannerPriorityStrip').innerHTML = priorityStripHtml;
  document.getElementById('plannerOutputTopPlan').innerHTML = allFactorsHtml();
  document.getElementById('plannerOutputInterventions').innerHTML = interventionsHtml();
  document.getElementById('plannerOutputMore').innerHTML = moreHtml;
  const checklistEl = document.getElementById('plannerPhase3Checklist');
  checklistEl.innerHTML = phase3ChecklistHtml();
  checklistEl.hidden = !phase3ChecklistItems().length;
  updatePhase3Progress();
  [1, 2, 3].forEach(n => {
    const el = document.getElementById(`plannerPhase${n}CommentInput`);
    if (el && document.activeElement !== el) el.value = plannerState.phaseComments[n - 1] || '';
  });
  buildPrintSheet(data, ringLabelByKey, phases, notes);

  // generatePlan() can also run on page load to restore a previously-generated
  // plan — only actually reveal it if that restore lands back on Review;
  // goToStep() owns hiding it everywhere else.
  const onReviewNow = STEP_KEYS[plannerState.currentStep] === 'review';
  const output = document.getElementById('plannerOutput');
  output.hidden = !onReviewNow;

  document.getElementById('plannerDownloadBtn').hidden = false;
  document.getElementById('plannerDownloadHint').hidden = !onReviewNow;
  const emailBtn = document.getElementById('plannerEmailBtn');
  emailBtn.href = buildEmailPlanHref(data);
  emailBtn.hidden = false;
  document.getElementById('plannerEmailHint').hidden = !onReviewNow;

  plannerState.hasGenerated = true;
  persistPlannerState();
}

// Builds the SAME unified SVG map used on screen (rings, labels, pills, and
// connector lines all in one viewBox) rather than a separate stripped-down
// print version, so the PDF always matches what the clinician sees live.
function buildPrintDiagramHtml() {
  const p = plannerState.data.planner;
  const titlesHtml = `
    <div class="planner-ecomap-titles">
      <span class="planner-ecomap-title planner-ecomap-title-risk">${escapeXml(p.ecoMapRiskLabel)}</span>
      <span class="planner-ecomap-title planner-ecomap-title-protective">${escapeXml(p.ecoMapProtectiveLabel)}</span>
    </div>`;
  return `<div class="planner-ecomap-wrap print-diagram-wrap">${titlesHtml}${buildEcoMapSvg({ currentRing: null, locked: true, idPrefix: 'print' })}</div>`;
}

// Date + time (with time zone) stamped at the top of every generated PDF,
// so the client, therapist, and school can all tell when it was made.
function printTimestamp() {
  const stamp = new Date().toLocaleString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  });
  return `<p class="print-timestamp">Generated ${stamp}</p>`;
}

function buildPrintSheet(data, ringLabelByKey, phases, notes) {

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

  // Whatever the clinician typed into that phase's Comments box on screen.
  const phaseCommentHtml = i => {
    const comment = (plannerState.phaseComments[i] || '').trim();
    return comment ? `<h3>Comments</h3><p class="print-phase-comment">${escapeXml(comment)}</p>` : '';
  };

  const notesHtml = notes.map(n => `
    <li><strong>${n.ringLabel} · ${n.valence === 'risk' ? 'Risk' : 'Protective'}:</strong> ${n.text}</li>`).join('');

  // Same order as the on-screen Treatment Plan step: each Phase 1/2/3
  // heading directly above the content and comment that live under it
  // there, rather than a separate combined phase list.
  document.getElementById('plannerPrintSheet').innerHTML = `
    ${printTimestamp()}
    <h1>Client Ecological Formulation &amp; Treatment Plan</h1>
    <p class="print-date">Therapist Toolkit Planning Tool</p>
    ${plannerGoal() ? `<p class="print-goal">Treatment ${escapeXml(plannerGoal().label.toLowerCase())}: ${escapeXml(plannerGoal().statement)}.</p>` : ''}
    <p class="print-disclaimer">${data.planner.disclaimer}</p>

    <h2>Ecological Map</h2>
    ${buildPrintDiagramHtml()}

    <h2>${phases[0].title} (${phases[0].sessions})</h2>
    ${phaseGoalPrintHtml(0)}
    <h3>Factors Entered</h3>
    ${factorsHtml || '<p>None entered.</p>'}
    ${topContributorsPrintHtml()}
    ${phaseCommentHtml(0)}

    <h2>${phases[1].title} (${phases[1].sessions})</h2>
    ${phaseGoalPrintHtml(1)}
    ${myInterventionsPrintHtml()}
    ${phaseCommentHtml(1)}

    <h2>${phases[2].title} (${phases[2].sessions})</h2>
    ${phaseGoalPrintHtml(2)}
    ${phase3ChecklistPrintHtml()}
    ${phaseCommentHtml(2)}

    <h2>Clinical Guidance Notes</h2>
    <ul>${notesHtml || '<li>None.</li>'}</ul>`;
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
fetch('content/resources.json', { cache: 'no-cache' }) // always check for the latest library
  .then(res => res.json())
  .then(data => {
    (data.items || []).forEach(item => {
      if (item.type === PRACTICE_TYPE) practiceLibrary[item.title.toLowerCase()] = item;
    });
    // Descriptions can arrive after Review has already rendered.
    if (plannerState.data && STEP_KEYS[plannerState.currentStep] === 'review') generatePlan();
  })
  .catch(() => {}); // previews fall back to "Description coming soon."

loadSiteContent()
  .then(data => {
    renderPlanner(data);
    renderFooter(data);
    loadPersistedPlannerState();
    initPlanner();
    initPhaseStripNav();
    initFadeObserver();
  });
