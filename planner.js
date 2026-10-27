/* =============================================
   PLANNING TOOL — Client Ecological Formulation & Treatment Plan
   ============================================= */

function icon(id, extraClass) {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}"><use href="#${id}"/></svg>`;
}

// Phase 2 "Select Intervention" strategy/practice options — order doesn't
// matter here, the dropdown sorts alphabetically at render time.
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
  'Dialetical Thinking', 'Cognitive Defusion', 'Diary Card (Parent)', 'Worry Time', 'Silver Linings',
  'Taking Ownership', 'Gratitude', 'Identifying Thoughts, Feelings, Behaviors', 'Stimulus Control',
  'Coping Cards', 'Family Album', 'Counseling about Disinhibiting Effects of Substances'
];

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
// "space the rings evenly: equal gaps between radii." A ring can still grow
// past its base radius at render time if that specific ring's own pills
// need more vertical room than it currently offers (see growRingRadii()).
const MAP_RING_STEP = 46;
const MAP_RING_BASE_R = 50; // client ring's starting radius
const MAP_RING_BASE_RADII = (() => {
  const deepFirst = RING_ORDER.slice().reverse(); // client..community
  const radii = {};
  deepFirst.forEach((ring, i) => { radii[ring] = MAP_RING_BASE_R + i * MAP_RING_STEP; });
  return radii;
})();
const MAP_MIN_RING_GAP = 20; // keeps two rings from ever growing visually indistinct from one another
const MAP_PILL_LINE_H = 22; // viewBox units per wrapped text line
const MAP_PILL_V_GAP = 12; // vertical gap between stacked pills
const MAP_PILL_MIN_W = 100;
const MAP_PILL_MAX_W = 240;
const MAP_PILL_CHAR_W = 9;
const MAP_PILL_GAP = 36; // gap between the outer ring's edge and the pill zone
// Connector routing: one straight horizontal line, pill to ring — never an
// elbow. A horizontal line can only reach a ring when the pill's own y sits
// within that ring's radius, so pills are ordered by ring depth (see
// splitPillsForLayout()/stackHalf() below) and rings grow to fit (see
// growRingRadii()) rather than ever bending a connector.
const MAP_RING_EDGE_MARGIN = 10;  // how far a connector's entry point must stay inside its own ring's edge
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

// ── Connector layout: straight horizontal lines only, zero crossings ──
//
// Every connector is one straight horizontal line, pill to ring — never an
// elbow. Horizontal lines at different y-positions can never touch each
// other, which is what removes the overlap problem entirely, with no lane
// system needed. That only works, though, if every pill's y actually sits
// within its own ring's radius (a straight horizontal line can only reach
// as far as the ring's own circle at that height) — which is what the two
// pieces below guarantee, together, for one whole side (risk or
// protective) at a time:
//
// 1. Pills are split into a "top" half and a "bottom" half (balanced by
//    height, splitting a single ring's own pills between the two halves
//    when it has more than one), each ordered deepest ring (client) at the
//    circle's own vertical center out to the shallowest ring (community)
//    at that half's outer extreme. See splitPillsForLayout()/stackHalf().
// 2. Every ring's actual radius grows, if it needs to, to comfortably
//    reach whichever of its own pills ended up furthest from the vertical
//    center — so every pill is guaranteed to fall inside its own ring's
//    valid span by construction, rather than by relying on how much room
//    happened to be left over. See growRingRadii().

// Splits one side's pills (still grouped by ring) into top/bottom halves,
// balanced by height, splitting a single ring's own pills between both
// halves when it has more than one. Each half comes back already ordered
// deepest ring (client) first through shallowest (community) last — i.e.
// in the order stackHalf() needs to stack outward from the circle's own
// vertical center.
function splitPillsForLayout(pills) {
  const byRing = {};
  RING_ORDER.forEach(r => { byRing[r] = []; });
  pills.forEach(p => byRing[p.ring].push(p));

  const deepFirst = RING_ORDER.slice().reverse(); // client..community
  const top = [], bottom = [];
  let topH = 0, bottomH = 0;
  deepFirst.forEach(ring => {
    const list = byRing[ring];
    if (!list.length) return;
    if (list.length === 1) {
      const item = list[0];
      if (topH <= bottomH) { top.push(item); topH += item.h; }
      else { bottom.push(item); bottomH += item.h; }
      return;
    }
    // More than one pill in this ring — split its own pills across both
    // halves instead of piling all of them onto whichever side is lighter.
    const mid = Math.ceil(list.length / 2);
    const bigger = list.slice(0, mid), smaller = list.slice(mid);
    const biggerH = bigger.reduce((s, p) => s + p.h, 0);
    const smallerH = smaller.reduce((s, p) => s + p.h, 0);
    if (topH <= bottomH) { top.push(...bigger); topH += biggerH; bottom.push(...smaller); bottomH += smallerH; }
    else { bottom.push(...bigger); bottomH += biggerH; top.push(...smaller); topH += smallerH; }
  });
  return { top, bottom };
}

// Stacks one half's pills (already in deepest-first order) outward from
// cy. direction is -1 for the top half (y decreases, growing upward) or
// +1 for the bottom half (y increases, growing downward) — the first item
// (deepest ring) always lands nearest cy, and each later item (a
// shallower ring) lands further out.
function stackHalf(items, direction, cy) {
  let cursor = cy + direction * MAP_PILL_V_GAP;
  return items.map(item => {
    const y = cursor + direction * (item.h / 2);
    cursor = y + direction * (item.h / 2 + MAP_PILL_V_GAP);
    return { item, y };
  });
}

// Grows each ring's radius, if needed, so it comfortably reaches whichever
// of its own pills (on either side, risk or protective — both sides share
// one set of circles) ended up furthest from the vertical center, while
// keeping the rings in equally-stepped, strictly-increasing order.
// neededReach maps ring -> the largest |y - cy| any of its pills actually
// landed at.
function growRingRadii(neededReach) {
  const radii = {};
  let prev = 0;
  RING_ORDER.slice().reverse().forEach(ring => { // client..community
    const base = MAP_RING_BASE_RADII[ring];
    const need = (neededReach[ring] || 0) + MAP_RING_EDGE_MARGIN;
    const r = Math.max(base, need, prev + MAP_MIN_RING_GAP);
    radii[ring] = r;
    prev = r;
  });
  return radii;
}

// Dev-time safety net: confirms no two connectors (from different factors)
// ever come within 8px of each other. Since every connector is a single
// horizontal segment, two can only possibly conflict when their y's are
// within that 8px AND their x-spans overlap — the layout above is built so
// this never actually happens, but this still catches any real regression
// immediately instead of silently shipping an overlap.
function verifyNoConnectorOverlap(segments) {
  const pad = 8; // no two connectors may touch or come within this many px
  const violations = [];
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i], b = segments[j];
      if (a.factorId === b.factorId) continue;
      if (Math.abs(a.y - b.y) > pad) continue;
      const aLo = Math.min(a.x1, a.x2), aHi = Math.max(a.x1, a.x2);
      const bLo = Math.min(b.x1, b.x2), bHi = Math.max(b.x1, b.x2);
      if (aHi + pad < bLo || bHi + pad < aLo) continue;
      violations.push([a, b]);
    }
  }
  if (violations.length) console.warn(`Ecological map: ${violations.length} connector pair(s) within 8px or overlapping`, violations);
  return violations.length === 0;
}

// Dev-time safety net: confirms no connector's horizontal run passes
// through the small arc each ring label occupies near the top of its own
// band. Labels still render after (on top of) the connector lines, so text
// stays legible even in an edge case this estimate misses — this is a
// diagnostic, not the only protection.
function verifyLabelClearance(segments, ringRadii, cx, cy) {
  const violations = [];
  RING_ORDER.filter(r => r !== 'client').forEach(ring => {
    const labelR = mapRingLabelRadius(ringRadii, ring);
    const labelText = (plannerState.ringLabelByKey[ring] || ring).toUpperCase();
    const halfWidthPx = Math.max(20, labelText.length * 3.6);
    const halfAngle = Math.min(1.4, halfWidthPx / labelR);
    const yTop = cy - labelR, yBottom = cy - labelR * Math.cos(halfAngle);
    const xHalf = labelR * Math.sin(halfAngle);
    segments.forEach(seg => {
      if (seg.ring === ring) return; // a ring's own connectors end right at its edge, not through its label
      if (seg.y < yTop - 2 || seg.y > yBottom + 2) return;
      const lo = Math.min(seg.x1, seg.x2), hi = Math.max(seg.x1, seg.x2);
      if (hi < cx - xHalf || lo > cx + xHalf) return;
      violations.push({ ring, seg });
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

  function pillsFor(valence) {
    const list = [];
    const rings = onlyCurrentRing && currentRing ? [currentRing] : RING_ORDER;
    rings.forEach(ring => {
      const sameRing = plannerState.factors[ring][valence];
      sameRing.forEach((f, idx) => {
        list.push({ ring, idx, id: f.id, text: f.text, weight: f.weight });
      });
    });
    return list;
  }
  // Every pill on one side shares one width — the widest any of them
  // naturally wants — so left pills all right-align to one inner edge and
  // right pills all left-align to the other, instead of staggering at
  // different x-positions. Each pill's text is then wrapped against that
  // shared width, which is also what its height (possibly multi-line) ends
  // up depending on.
  function preparedPills(valence) {
    const raw = pillsFor(valence);
    const uniformW = raw.length ? Math.max(...raw.map(item => mapNaturalWidth(item.text))) : MAP_PILL_MIN_W;
    return raw.map(item => {
      const lines = mapWrapAtWidth(item.text, uniformW);
      const h = MAP_PILL_H + (lines.length - 1) * MAP_PILL_LINE_H;
      return { ...item, w: uniformW, h, lines };
    });
  }
  const riskPills = preparedPills('risk');
  const protPills = preparedPills('protective');

  const sumH = list => list.reduce((sum, p) => sum + p.h, 0) + MAP_PILL_V_GAP * Math.max(0, list.length - 1);
  const riskSplit = splitPillsForLayout(riskPills);
  const protSplit = splitPillsForLayout(protPills);
  // The circle stays centered in the canvas; each half just reserves
  // whatever room its own tallest side needs above/below that center.
  const vbH = Math.max(560, 2 * (Math.max(sumH(riskSplit.top), sumH(riskSplit.bottom), sumH(protSplit.top), sumH(protSplit.bottom)) + MAP_PILL_V_GAP) + 90);
  const cy = vbH / 2;

  // Stacking a half only depends on pill heights, not on any ring's
  // radius, so every pill's y is already final at this point.
  const riskTopStacked = stackHalf(riskSplit.top, -1, cy);
  const riskBottomStacked = stackHalf(riskSplit.bottom, 1, cy);
  const protTopStacked = stackHalf(protSplit.top, -1, cy);
  const protBottomStacked = stackHalf(protSplit.bottom, 1, cy);

  // Both sides draw the exact same circles, so every ring's radius is
  // grown (if it needs to be) to fit whichever of its pills — risk or
  // protective — ended up furthest from the vertical center.
  const neededReach = {};
  [...riskTopStacked, ...riskBottomStacked, ...protTopStacked, ...protBottomStacked].forEach(({ item, y }) => {
    const dy = Math.abs(y - cy);
    neededReach[item.ring] = Math.max(neededReach[item.ring] || 0, dy);
  });
  const ringRadii = growRingRadii(neededReach);
  const outerR = ringRadii.community; // anchors the pill zone just outside the outermost ring

  // The viewBox width grows along with the rings — a ring that grew to fit
  // a lot of pills needs a wider canvas too, or its own pills would spill
  // past the edge. Risk and protective pills can have different uniform
  // widths, so the circle's own center (cx) isn't necessarily the
  // viewBox's midpoint — it's wherever the risk-side margin puts it.
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
    <text class="planner-center-label" x="${cx}" y="${cy - 4}" text-anchor="middle">${escapeXml(p.centerLabel)}</text>
    <text class="planner-center-sub" x="${cx}" y="${cy + 13}" text-anchor="middle">${escapeXml(p.centerSub)}</text>`;

  function sideSvg(topStacked, bottomStacked, valence) {
    const records = topStacked.concat(bottomStacked).map(({ item, y }) => {
      const { w, h } = item;
      const ringR = ringRadii[item.ring];
      const dy = y - cy;
      // x = cx ∓ sqrt(r² − (y − cy)²): the one point on this pill's own
      // ring that sits at this exact height — growRingRadii() guarantees
      // every ring reaches far enough that this is always a real point.
      const dx = Math.sqrt(Math.max(0, ringR * ringR - dy * dy));
      const pillX = valence === 'risk' ? (cx - outerR - MAP_PILL_GAP - w) : (cx + outerR + MAP_PILL_GAP);
      const lineStartX = valence === 'risk' ? pillX + w : pillX;
      const entryX = valence === 'risk' ? (cx - dx) : (cx + dx);
      return { item, w, h, y, pillX, lineStartX, entryX };
    });

    let lines = '', pillsHtml = '';
    records.forEach(rec => {
      const { item, w, h, y, pillX, lineStartX, entryX } = rec;
      const { lines: textLines } = item;

      const color = CHIP_COLOR_BY_WEIGHT[valence][item.weight];
      const textColor = item.weight >= 5 ? '#FFFFFF' : (valence === 'risk' ? 'hsl(6,55%,24%)' : 'hsl(112,35%,20%)');
      const textX = pillX + 14;
      const removeX = valence === 'risk' ? pillX - 12 : pillX + w + 12;

      // One straight horizontal line, pill to ring — never an elbow. A
      // small terminal dot caps the endpoint so the ring it belongs to
      // reads unambiguously, even where the line crosses other rings on
      // the way in.
      const connectorPath = `M ${lineStartX.toFixed(1)} ${y.toFixed(1)} L ${entryX.toFixed(1)} ${y.toFixed(1)}`;
      lines += `<path class="planner-connector planner-connector-${valence}" data-ring="${item.ring}" data-factor-id="${item.id}" d="${connectorPath}" fill="none" stroke-width="${MAP_CONNECTOR_WIDTH}" style="stroke:${color}"/>` +
        `<circle class="planner-connector planner-connector-dot planner-connector-${valence}" data-ring="${item.ring}" data-factor-id="${item.id}" cx="${entryX.toFixed(1)}" cy="${y.toFixed(1)}" r="${MAP_ENDPOINT_DOT_R}" style="fill:${color}"/>`;
      connectorSegments.push({ x1: lineStartX, x2: entryX, y, factorId: item.id, ring: item.ring });

      // Laid out from the pill's top edge down: dots first, then the
      // (possibly multi-line) text below them — nothing drifts into
      // overlapping text regardless of how many lines it wrapped to.
      const pillTop = y - h / 2;
      const dotY = pillTop + MAP_PILL_TOP_PAD;
      const firstLineY = dotY + MAP_PILL_DOT_TEXT_GAP;

      // Each dot gets a generously-sized invisible hit circle around the small
      // visible one, so the weight is actually clickable/tappable and not
      // just a tiny 2-3px target.
      const dots = Array.from({ length: 5 }, (_, di) => {
        const dotX = valence === 'risk' ? (pillX + 21 + di * 10) : (pillX + w - 21 - (4 - di) * 10);
        return `
          <g class="eco-wdot-hit" data-ring="${item.ring}" data-valence="${valence}" data-index="${item.idx}" data-value="${di + 1}">
            <circle cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="9" fill="transparent"/>
            <circle class="eco-wdot${di < item.weight ? ' filled' : ''}" cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="3.6"/>
          </g>`;
      }).join('');

      // Aligned with the dot row at the pill's top, clear of the text below.
      // Sits outside the pill on the page background, not inside the
      // colored rect — always a fixed dark color regardless of the pill's
      // own text color (which turns white at weight 5 for contrast against
      // its own near-black fill), so the X never blends into the page.
      const removeBtn = locked ? '' : `
        <g class="eco-pill-remove" data-ring="${item.ring}" data-valence="${valence}" data-index="${item.idx}" transform="translate(${removeX.toFixed(1)},${dotY.toFixed(1)})" style="color:var(--text)">
          <circle r="9" fill="transparent"/>
          <line x1="-4" y1="-4" x2="4" y2="4"/><line x1="-4" y1="4" x2="4" y2="-4"/>
        </g>`;

      // Full text, never truncated — wrapped across as many lines as it
      // needs (computed in preparedPills). Each line is its own sibling
      // <text> element (simpler and just as valid as nested <tspan>s).
      const textHtml = textLines.map((line, li) =>
        `<text x="${textX.toFixed(1)}" y="${(firstLineY + li * MAP_PILL_LINE_H).toFixed(1)}" fill="${textColor}">${escapeXml(line)}</text>`
      ).join('');

      pillsHtml += `
        <g class="eco-pill" data-ring="${item.ring}" data-factor-id="${item.id}" style="color:${textColor}">
          <rect x="${pillX.toFixed(1)}" y="${(y - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(h / 2, 20)}" fill="${color}"/>
          ${textHtml}
          ${dots}${removeBtn}
        </g>`;
    });
    return { lines, pillsHtml };
  }

  const connectorSegments = [];
  const riskSide = sideSvg(riskTopStacked, riskBottomStacked, 'risk');
  const protSide = sideSvg(protTopStacked, protBottomStacked, 'protective');
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

const SAFETY_PLAN_KEYS = ['warningSigns', 'internalCoping', 'distraction', 'askForHelp', 'professionals', 'environment'];

const plannerState = {
  data: null, factors: {}, currentStep: 0, furthestStep: 0, hasGenerated: false,
  nextFactorId: 1, // stable per-factor id so the top-3 picker can track a factor across re-renders
  topContributors: { risk: [null, null, null], protective: [null, null, null] },
  interventionsByFactor: {}, // factor id -> array of intervention strings; each top factor gets its own list
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
      interventionsByFactor: plannerState.interventionsByFactor,
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

  const stepLabels = p.rings.map(r => r.label).concat(['Top Factors', 'Resources', 'Review']);
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
    // The generated plan only belongs on Review — once you've generated it,
    // it shouldn't keep trailing along at the bottom of every other step.
    document.getElementById('plannerOutput').hidden = !(onReview && plannerState.hasGenerated);
    // The add-factor forms only belong on ring steps — Review has nothing left
    // to add, and both curation steps (Top Factors, Resources) stand on their own.
    document.getElementById('plannerLayout').hidden = isTopFactorsStep || isResourcePlanStep || onReview;
    // The ecological map belongs on ring steps and Review — both curation
    // steps (Top Factors, Resources) stand on their own without it.
    document.getElementById('plannerEcoMapWrap').hidden = isTopFactorsStep || isResourcePlanStep;
    document.getElementById('plannerTopFactorsSection').hidden = !isTopFactorsStep;
    document.getElementById('plannerResourcePlanSection').hidden = !isResourcePlanStep;

    if (isTopFactorsStep) renderTopFactorsStep();
    if (isResourcePlanStep) renderInterventionStep();

    // Review gets the same "Step X of Y: Label" header as every other step —
    // no separate custom heading/intro. The last three steps conclude the
    // mapping activity as three named phases.
    let title, hint;
    if (onReview) {
      title = `Step ${index + 1} of ${STEP_KEYS.length}: Review and Next Steps`;
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
  // One shared <datalist> (built once) backs every factor's input — typing
  // filters/suggests from the 71 options, but anything can be typed and
  // added. This replaces a separate dropdown + write-in field with a single
  // compact control per factor.
  function interventionDatalistHtml() {
    const sortedOptions = INTERVENTION_OPTIONS.slice().sort((a, b) => a.localeCompare(b));
    return `<datalist id="interventionOptionsList">${sortedOptions.map(opt => `<option value="${opt}"></option>`).join('')}</datalist>`;
  }

  function renderInterventionStep() {
    const container = document.getElementById('interventionFactorsList');
    if (!container) return;
    const factors = selectedTopContributors();
    if (!factors.length) {
      container.innerHTML = `<p class="planner-pool-empty">Pick your top risk and protective factors on the previous step first — each one gets its own intervention here.</p>`;
      return;
    }

    container.innerHTML = interventionDatalistHtml() + factors.map(f => {
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
            <input type="text" class="planner-input intervention-input" list="interventionOptionsList"
                   data-factor-id="${f.id}" placeholder="Type or choose a strategy/practice…" />
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

  const interventionFactorsList = document.getElementById('interventionFactorsList');
  if (interventionFactorsList) {
    interventionFactorsList.addEventListener('click', e => {
      const addBtn = e.target.closest('.intervention-add-btn');
      if (addBtn) {
        const fid = addBtn.dataset.factorId;
        const input = interventionFactorsList.querySelector(`.intervention-input[data-factor-id="${fid}"]`);
        addIntervention(fid, input.value);
        // renderInterventionStep() rebuilds the whole list, so re-query the
        // fresh input for this factor and refocus it for rapid entry.
        interventionFactorsList.querySelector(`.intervention-input[data-factor-id="${fid}"]`)?.focus();
        return;
      }
      const removeBtn = e.target.closest('[data-remove-intervention]');
      if (removeBtn) {
        const [fid, idx] = removeBtn.dataset.removeIntervention.split(':');
        removeIntervention(fid, parseInt(idx, 10));
      }
    });
    interventionFactorsList.addEventListener('keydown', e => {
      const input = e.target.closest('.intervention-input');
      if (!input || e.key !== 'Enter') return;
      e.preventDefault();
      const fid = input.dataset.factorId;
      addIntervention(fid, input.value);
      interventionFactorsList.querySelector(`.intervention-input[data-factor-id="${fid}"]`)?.focus();
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
    plannerState.interventionsByFactor = {};
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
  return `<h2 class="print-no-break">Top Contributors</h2><ul><li><strong>Top Risk Factors:</strong> ${listFor('risk')}</li><li><strong>Top Protective Factors:</strong> ${listFor('protective')}</li></ul>`;
}

// Each top factor shown with its severity, its ecological placement (which
// ring it was entered under), and whatever intervention(s) were picked for
// it — the curated counterpart to the full list in "Factors" above.
function interventionsHtml() {
  const factors = selectedTopContributors();
  if (!factors.length) {
    return `<h3>Interventions</h3><p class="planner-resource-empty">No top factors selected yet — go back to the Top Contributors step to add some.</p>`;
  }
  const rows = factors.map(f => {
    const list = plannerState.interventionsByFactor[f.id] || [];
    return `<li>
      <div class="intervention-review-header">
        <span class="planner-note-tag planner-note-tag-${f.valence}">${f.valence === 'risk' ? 'Risk' : 'Protective'}</span>
        <strong>${f.text}</strong>
        <span class="intervention-review-ring">${f.ringLabel}</span>
        ${severityDotsHtml(f.valence, f.weight)}
      </div>
      <p class="intervention-review-plan">${list.length ? list.join(', ') : '<em>No intervention selected yet</em>'}</p>
    </li>`;
  });
  return `<h3>Interventions</h3><ul class="planner-top-list intervention-review-list">${rows.join('')}</ul>`;
}

function myInterventionsPrintHtml() {
  const factors = selectedTopContributors();
  if (!factors.length) return `<h2>My Interventions</h2><p>No top factors selected.</p>`;
  const rows = factors.map(f => {
    const list = plannerState.interventionsByFactor[f.id] || [];
    return `<li><strong>${f.valence === 'risk' ? 'Risk' : 'Protective'} · ${f.text}:</strong> ${list.length ? list.join(', ') : 'no intervention selected yet'}</li>`;
  });
  return `<h2>My Interventions</h2><ul>${rows.join('')}</ul>`;
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
  document.getElementById('plannerOutputTopPlan').innerHTML = allFactorsHtml() + interventionsHtml();
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

    ${myInterventionsPrintHtml()}`;
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
fetch('content/site.json')
  .then(res => res.json())
  .then(data => {
    renderPlanner(data);
    renderFooter(data);
    loadPersistedPlannerState();
    initPlanner();
    initFadeObserver();
  });
