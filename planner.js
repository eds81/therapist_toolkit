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
// Protective factors come first everywhere in this tool — inputs, the map
// (left side), top factors, interventions, the plan, print and email — to
// lead with the client's strengths and amplify them.
const VALENCE_ORDER = ['protective', 'risk'];
const MAP_LEFT_VALENCE = 'protective';
// A "Start here" orientation comes first, then one step per ring. Two
// curation steps sit between entering factors and the final review: pick
// the top contributors, then choose interventions for each.
const STEP_KEYS = ['orientation', ...RING_ORDER, 'topFactors', 'resourcePlan', 'review'];
const NON_RING_STEP_KEYS = ['orientation', 'topFactors', 'resourcePlan', 'review'];
// Saved progress from before the orientation step existed points one step too
// early; this version number tells the loader to shift it.
const PLANNER_STEPS_VERSION = 2;


// One color per side for factor pills, connectors and rings. (Factors used to
// carry a 1–5 rating that shaded these; pilot clinicians preferred to sort
// their factors afterward instead, so the rating was removed.)
const FACTOR_COLORS = {
  risk: { fill: 'hsl(6, 55%, 77%)', stroke: 'hsl(6, 55%, 65%)', text: 'hsl(6, 60%, 22%)' },
  protective: { fill: 'hsl(112, 28%, 74%)', stroke: 'hsl(112, 28%, 60%)', text: 'hsl(112, 35%, 18%)' }
};

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
// Pills are laid out top-down: padding, then the (possibly multi-line) text.
const MAP_PILL_TOP_PAD = 26;      // pill top edge -> first text baseline
const MAP_PILL_BOTTOM_PAD = 14;   // last text baseline -> pill bottom
const MAP_PILL_H = MAP_PILL_TOP_PAD + MAP_PILL_BOTTOM_PAD; // minimum (single-line) height

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
  let stroke = 'var(--cream-dark)';
  if (hasRisk && hasProt) stroke = 'var(--teal)';
  else if (hasRisk) stroke = FACTOR_COLORS.risk.stroke;
  else if (hasProt) stroke = FACTOR_COLORS.protective.stroke;
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
  // with its own remove button.
  function pillsFor(valence) {
    const rings = onlyCurrentRing && currentRing ? [currentRing] : RING_ORDER;
    const pills = [];
    rings.forEach(ring => {
      const rows = plannerState.factors[ring][valence].map((f, idx) => ({ idx, id: f.id, text: f.text }));
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
      return { ...g, rows, w: uniformW, h };
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
  // Protective pills on the left (read first), risk pills on the right.
  const leftW = MAP_LEFT_VALENCE === 'risk' ? riskW : protW;
  const rightW = MAP_LEFT_VALENCE === 'risk' ? protW : riskW;
  const leftMargin = outerR + MAP_PILL_GAP + leftW + 20;
  const rightMargin = outerR + MAP_PILL_GAP + rightW + 20;
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
      const onLeft = valence === MAP_LEFT_VALENCE;
      const pillX = onLeft ? (cx - outerR - MAP_PILL_GAP - w) : (cx + outerR + MAP_PILL_GAP);
      const lineStartX = onLeft ? pillX + w : pillX;
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
      const color = FACTOR_COLORS[valence].stroke;

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
      const removeX = valence === MAP_LEFT_VALENCE ? pillX - 12 : pillX + w + 12;

      let rowTop = pillTop;
      const rowsHtml = item.rows.map((row, ri) => {
        const rowColor = FACTOR_COLORS[valence].fill;
        const textColor = FACTOR_COLORS[valence].text;
        const firstLineY = rowTop + MAP_PILL_TOP_PAD;

        // Outside the pill on the page background, level with this row's
        // first line of text — always a fixed dark color so it never blends in.
        const removeBtn = locked ? '' : `
          <g class="eco-pill-remove" data-ring="${item.ring}" data-valence="${valence}" data-index="${row.idx}" transform="translate(${removeX.toFixed(1)},${(firstLineY - 6).toFixed(1)})" style="color:var(--text)">
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
            ${divider}${textHtml}
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
  planOrder: [], // top-factor ids in the order the clinician arranged them on the Treatment Plan
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
      stepsVersion: PLANNER_STEPS_VERSION,
      currentStep: plannerState.currentStep,
      furthestStep: plannerState.furthestStep,
      hasGenerated: plannerState.hasGenerated,
      nextFactorId: plannerState.nextFactorId,
      topContributors: plannerState.topContributors,
      interventionsByFactor: plannerState.interventionsByFactor,
      phaseComments: plannerState.phaseComments,
      planOrder: plannerState.planOrder,
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
    // Upgrade factors saved in older shapes (plain strings, objects missing
    // an id, or with the retired 1–5 rating) into the current {id, text} shape.
    const toFactor = f => {
      if (typeof f === 'string') f = { text: f };
      if (!f.id) f.id = plannerState.nextFactorId++;
      return { id: f.id, text: f.text };
    };
    RING_ORDER.forEach(r => {
      if (!saved.factors[r]) return;
      plannerState.factors[r] = {
        risk: (saved.factors[r].risk || []).map(toFactor),
        protective: (saved.factors[r].protective || []).map(toFactor)
      };
    });
    const shift = saved.stepsVersion === PLANNER_STEPS_VERSION ? 0 : 1;
    const clampStep = n => Math.min(STEP_KEYS.length - 1, Math.max(0, (n || 0) + shift));
    plannerState.currentStep = clampStep(saved.currentStep);
    plannerState.furthestStep = clampStep(saved.furthestStep);
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
    if (Array.isArray(saved.planOrder)) {
      plannerState.planOrder = saved.planOrder.filter(id => typeof id === 'number');
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
      planNote: "Individual-level risk (e.g. hopelessness, suicidal thoughts and behaviors, non-suicidal self-injury) makes safety the priority — lead with the Columbia Suicide Severity Rating Scale (C-SSRS) and a Stanley-Brown Safety Plan before moving to skills work."
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
  document.getElementById('plannerSubheading').textContent = p.subheading || '';
  document.getElementById('plannerIntro').innerHTML = String(p.intro || '').split(/\n\s*\n/)
    .map(para => `<p>${escapeXml(para.trim())}</p>`).join('');
  // Five level steps: a note that they can be done in any order.
  const orderNote = document.getElementById('plannerOrderNote');
  orderNote.innerHTML = p.levelOrderNote ? `${icon('ic-compass', 'icon-sm')}<span>${escapeXml(p.levelOrderNote)}</span>` : '';

  // Select Interventions: the Treatment Library, in a new tab.
  const lib = p.libraryLink;
  document.getElementById('plannerLibraryLink').innerHTML = lib && lib.text
    ? `${icon('ic-book-open', 'icon-sm')}<a href="resource-library.html" target="_blank" rel="noopener">${escapeXml(lib.text)} <span class="sr-only">(opens in a new tab)</span>${icon('i-arrow-right', 'icon-xs')}</a>${lib.hint ? `<span class="planner-library-link-hint">${escapeXml(lib.hint)}</span>` : ''}`
    : '';

  // Lead with strengths: protective factors come first throughout the tool.
  const st = p.strengthsFirst;
  const stEl = document.getElementById('plannerStrengths');
  if (st && st.text) {
    stEl.innerHTML = `${icon('ic-sun', 'icon-sm')}<div>${st.heading ? `<strong>${escapeXml(st.heading)}</strong>` : ''}<p>${escapeXml(st.text)}</p></div>`;
    stEl.hidden = false;
  }

  const rl = p.roadmapLink;
  const rlEl = document.getElementById('plannerRoadmapLink');
  if (rl && rl.text) {
    rlEl.innerHTML = `<a href="roadmap.html">${icon('ic-map', 'icon-sm')}<span>${escapeXml(rl.text)}</span> ${icon('i-arrow-right', 'icon-xs')}</a>${rl.hint ? `<span class="planner-roadmap-link-hint">${escapeXml(rl.hint)}</span>` : ''}`;
  } else rlEl.hidden = true;
  renderOrientation(data);
  renderExtensionLinks(p);
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

  // A dropdown of common examples under each input — choosing one adds it to
  // the map right away (CMS: each level's Protective / Risk example options).
  function exampleSelectHtml(r, valence) {
    const opts = (valence === 'risk' ? r.riskOptions : r.protectiveOptions) || [];
    if (!opts.length) return '';
    const kind = valence === 'risk' ? 'risk' : 'protective';
    return `<select class="planner-example-select" data-ring="${r.key}" data-valence="${valence}" aria-label="Add a common ${kind} factor for ${escapeXml(r.label)}">
      <option value="">${escapeXml(p.exampleSelectLabel || 'Or pick a common example…')}</option>
      ${opts.map(o => `<option value="${escapeXml(o)}">${escapeXml(o)}</option>`).join('')}
    </select>`;
  }

  function rowsHtml(valence) {
    return p.rings.map(r => `
      <div class="planner-row" data-ring="${r.key}">
        <label>${r.label}</label>
        <div class="planner-input-group">
          <input type="text" class="planner-input" data-ring="${r.key}" data-valence="${valence}"
                 placeholder="${valence === 'risk' ? r.placeholderRisk : r.placeholderProtective}" />
          <button type="button" class="planner-add-btn planner-add-btn-${valence}" data-ring="${r.key}" data-valence="${valence}" aria-label="${p.addButtonLabel}">${icon('i-plus', 'icon-xs')}</button>
        </div>
        ${exampleSelectHtml(r, valence)}
      </div>`).join('');
  }

  document.getElementById('plannerRiskRows').innerHTML = rowsHtml('risk');
  document.getElementById('plannerProtectiveRows').innerHTML = rowsHtml('protective');

  const orient = p.orientation || {};
  const stepLabels = [orient.stepLabel || 'Start Here'].concat(p.rings.map(r => r.label), ['Top Factors', 'Interventions', 'Treatment Plan']);
  // Each step's icon shows what it covers (the step title still gives its number).
  const STEP_ICONS = { orientation: 'ic-compass', community: 'ic-building', school: 'ic-school', family: 'ic-home', peer: 'ic-users', client: 'ic-user',
    topFactors: 'ic-star', resourcePlan: 'ic-tool', review: 'ic-clipboard' };

  document.getElementById('plannerStepper').innerHTML = `
    <div class="planner-stepper-steps">${stepLabels.map((label, i) => `
      <button type="button" class="planner-step-item" data-step-index="${i}" data-ring="${STEP_KEYS[i]}" aria-label="Step ${i + 1}: ${label}">
        <span class="planner-step-dot">${icon(STEP_ICONS[STEP_KEYS[i]] || 'ic-clipboard', 'step-icon')}</span>
        <span class="planner-step-label">${label}</span>
      </button>`).join('')}
    </div>`;
}

// ── Step 1: Start Here ──
// A short guided tour of the tool's four steps — map the factors (with the
// five-level circle map), choose the top factors, select interventions,
// review the plan — one slide each. A strip across the top shows all four
// and jumps to any of them; Back/Next move through them; "Skip intro" and the
// last slide's "Start mapping" go to the first mapping step.
const ORIENT_RING_ICONS = { community: 'ic-building', school: 'ic-school', family: 'ic-home', peer: 'ic-users', client: 'ic-user' };
const ORIENT_RING_RADII = [140, 113, 86, 59, 32]; // community (outer) → client (center)


// The therapist and client characters (and orientEase) live in characters.js,
// shared with the Treatment Roadmap page.

// Part 1 pills: all share one 6s cycle so they arrive one after another,
// rest together, then fade out as a group before the loop starts again.
function orientPill(fromX, fromY, toX, toY, w, fill, order) {
  const start = 0.06 + order * 0.16, land = start + 0.14;
  const ease = '.45 0 .55 1';
  return `
  <g opacity="0">
    <rect x="${-w / 2}" y="-9" width="${w}" height="18" rx="9" fill="${fill}"/>
    <animateTransform attributeName="transform" type="translate"
      values="${fromX} ${fromY}; ${fromX} ${fromY}; ${toX} ${toY}; ${toX} ${toY}"
      keyTimes="0; ${start.toFixed(2)}; ${land.toFixed(2)}; 1" calcMode="spline" keySplines="0 0 1 1; ${ease}; 0 0 1 1" dur="6s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0; 0; 1; 1; 0; 0"
      keyTimes="0; ${start.toFixed(2)}; ${(start + 0.05).toFixed(2)}; .86; .95; 1" calcMode="spline" keySplines="0 0 1 1; ${ease}; 0 0 1 1; ${ease}; 0 0 1 1" dur="6s" repeatCount="indefinite"/>
  </g>`;
}
const ORIENT_ILLUSTRATIONS = [
  // Part 1 — placing protective and risk factors on the five-level circles
  `<svg viewBox="-56 0 416 230" class="po-illus" aria-hidden="true">
    <g transform="translate(250 112)">
      ${[78, 62, 46, 30, 14].map((r, i) => `<circle r="${r}" fill="${['#E6F0F1', '#D3E8EC', '#BFE0E6', '#A9D7E0', '#CFE6CB'][i]}" stroke="#FFFFFF" stroke-width="2"/>`).join('')}
    </g>
    ${orientPill(130, 82, 196, 60, 46, ORIENT_GREEN_LIGHT, 0)}
    ${orientPill(130, 82, 208, 150, 52, ORIENT_GREEN, 1)}
    ${orientPill(130, 82, 300, 74, 40, ORIENT_RED_LIGHT, 2)}
    ${orientPill(130, 82, 292, 160, 38, ORIENT_RED, 3)}
    ${orientClient(16, 210, 'talk')}
    ${orientTherapist(80, 210, [34, -16], '0 0 0; -16 0 0; 0 0 0')}
  </svg>`,
  // Part 2 — choosing the top factors (a star lands on a card, which moves up)
  `<svg viewBox="-56 0 416 230" class="po-illus" aria-hidden="true">
    <rect x="160" y="22" width="180" height="58" rx="12" fill="#FFFFFF" stroke="${ORIENT_GREEN}" stroke-width="2" stroke-dasharray="6 5"/>
    <text x="250" y="16" text-anchor="middle" font-size="11" font-weight="800" fill="${ORIENT_GREEN}" font-family="Nunito, sans-serif">TOP FACTORS</text>
    ${[0, 1, 2].map(i => `<rect x="176" y="${110 + i * 34}" width="148" height="24" rx="12" fill="${i === 1 ? ORIENT_RED_LIGHT : ORIENT_GREEN_LIGHT}"/>`).join('')}
    <g>
      <rect x="176" y="110" width="148" height="24" rx="12" fill="${ORIENT_GREEN}"/>
      <animateTransform attributeName="transform" type="translate" values="0 0; 0 0; 0 -72; 0 -72; 0 0" keyTimes="0; .25; .5; .9; 1" dur="4s" repeatCount="indefinite"/>
    </g>
    <g transform="translate(330 104)">
      <polygon points="0,-11 3.2,-3.5 11,-3.4 4.8,1.6 7,9.5 0,4.8 -7,9.5 -4.8,1.6 -11,-3.4 -3.2,-3.5" fill="#F5C842" stroke="#B7950B" stroke-width="1">
        <animateTransform attributeName="transform" type="scale" values="0; 1.3; 1; 1; 0" keyTimes="0; .15; .25; .9; 1" dur="4s" repeatCount="indefinite"/>
      </polygon>
    </g>
    ${orientTherapist(90, 210, [40, -26], '0 0 0; -10 0 0; 0 0 0')}
  </svg>`,
  // Part 3 — the Select Interventions screen in miniature: click into the
  // "Type or choose" box, the practice list opens, the highlight moves to one,
  // it's added as an intervention chip, then a Quick Add option turns on.
  `<svg viewBox="-56 0 416 230" class="po-illus" aria-hidden="true" font-family="Nunito, sans-serif">
    <rect x="128" y="10" width="226" height="210" rx="14" fill="#FFFFFF" stroke="#E3DCCB" stroke-width="2"/>
    <rect x="142" y="24" width="64" height="16" rx="8" fill="${ORIENT_GREEN_LIGHT}"/>
    <text x="174" y="35.5" text-anchor="middle" font-size="8.5" font-weight="900" fill="${ORIENT_GREEN}">PROTECTIVE</text>
    <text x="214" y="36.5" font-size="13" font-weight="800" fill="#2B2B2B">close friend</text>
    <rect x="142" y="50" width="198" height="26" rx="13" fill="#FFFFFF" stroke="#D9D1BF" stroke-width="1.5">
      <animate attributeName="stroke" values="#D9D1BF; #D9D1BF; ${ORIENT_TEAL}; ${ORIENT_TEAL}; #D9D1BF; #D9D1BF" keyTimes="0; .1; .14; .5; .54; 1" dur="6s" repeatCount="indefinite"/>
    </rect>
    <text x="156" y="67" font-size="10.5" font-weight="700" fill="#9A9384">Type or choose a practice…</text>
    <g opacity="0">
      <animate attributeName="opacity" values="0; 0; 1; 1; 0; 0" keyTimes="0; .14; .18; .48; .52; 1" dur="6s" repeatCount="indefinite"/>
      <rect x="142" y="80" width="198" height="86" rx="10" fill="#FFFFFF" stroke="${ORIENT_TEAL}" stroke-width="1.5"/>
      <rect x="148" y="86" width="186" height="22" rx="6" fill="#D6F0F4">
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 0; 0 26; 0 26" keyTimes="0; .26; .34; 1" dur="6s" repeatCount="indefinite"/>
        <animate attributeName="fill" values="#D6F0F4; #D6F0F4; ${ORIENT_TEAL}; #D6F0F4" keyTimes="0; .4; .43; .46" dur="6s" repeatCount="indefinite"/>
      </rect>
      <text x="158" y="101" font-size="10.5" font-weight="700" fill="#2B2B2B">Behavioral Activation</text>
      <text x="158" y="127" font-size="10.5" font-weight="800" fill="#2B2B2B">Problem Solving</text>
      <text x="158" y="153" font-size="10.5" font-weight="700" fill="#2B2B2B">Safety Planning</text>
    </g>
    <g opacity="0">
      <animate attributeName="opacity" values="0; 0; 1; 1; 0" keyTimes="0; .52; .56; .95; 1" dur="6s" repeatCount="indefinite"/>
      <rect x="142" y="84" width="112" height="22" rx="11" fill="#D6F0F4"/>
      <text x="153" y="99" font-size="10.5" font-weight="800" fill="${ORIENT_TEAL_DARK}">Problem Solving</text>
      <path d="M241 91 l6 6 M247 91 l-6 6" stroke="${ORIENT_TEAL_DARK}" stroke-width="1.6" stroke-linecap="round"/>
    </g>
    <g opacity="0">
      <animate attributeName="opacity" values="0; 0; 1; 1; 0" keyTimes="0; .56; .6; .95; 1" dur="6s" repeatCount="indefinite"/>
      <text x="142" y="130" font-size="8.5" font-weight="900" fill="${ORIENT_GREEN}">QUICK ADD</text>
      <rect x="142" y="138" width="98" height="22" rx="11" fill="#FFFFFF" stroke="#BEE0B7" stroke-width="1.5">
        <animate attributeName="fill" values="#FFFFFF; #FFFFFF; ${ORIENT_GREEN}; ${ORIENT_GREEN}; #FFFFFF" keyTimes="0; .76; .79; .95; 1" dur="6s" repeatCount="indefinite"/>
      </rect>
      <text x="191" y="153" text-anchor="middle" font-size="10" font-weight="800" fill="${ORIENT_GREEN}">Self compassion
        <animate attributeName="fill" values="${ORIENT_GREEN}; ${ORIENT_GREEN}; #FFFFFF; #FFFFFF; ${ORIENT_GREEN}" keyTimes="0; .76; .79; .95; 1" dur="6s" repeatCount="indefinite"/>
      </text>
      <rect x="246" y="138" width="94" height="22" rx="11" fill="#FFFFFF" stroke="#BEE0B7" stroke-width="1.5"/>
      <text x="293" y="153" text-anchor="middle" font-size="10" font-weight="800" fill="${ORIENT_GREEN}">Pull into hope kit</text>
      <rect x="142" y="166" width="168" height="22" rx="11" fill="#FFFFFF" stroke="#9CC9D0" stroke-width="1.5"/>
      <text x="226" y="181" text-anchor="middle" font-size="10" font-weight="800" fill="${ORIENT_TEAL_DARK}">Integrate into the safety plan</text>
    </g>
    <g>
      <path d="M0 0 L0 15 L4 11 L7.5 18 L10 17 L6.5 10 L12 10 Z" fill="#2B2B2B" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round"/>
      <animateTransform attributeName="transform" type="translate"
        values="118 120; 250 60; 250 60; 250 98; 250 124; 250 124; 290 150; 210 146; 210 146; 118 120"
        keyTimes="0; .1; .2; .28; .36; .5; .66; .74; .9; 1" dur="6s" repeatCount="indefinite"/>
    </g>
    ${orientTherapist(66, 214, [34, -18], '0 0 0; -10 0 0; 0 0 0')}
  </svg>`,
  // Part 4 — the plan goes back into the work with the client: the therapist
  // checks over the plan on her clipboard (it faces her, not the client),
  // then an activity from it comes down to the table between them, and the
  // client responds. The client works with the plan without seeing it.
  `<svg viewBox="-56 0 416 230" class="po-illus" aria-hidden="true">
    <rect x="186" y="34" width="112" height="146" rx="10" fill="#FFFFFF" stroke="${ORIENT_TEAL}" stroke-width="3"/>
    <rect x="218" y="26" width="48" height="16" rx="5" fill="${ORIENT_TEAL}"/>
    ${[0, 1, 2, 3].map(i => `
      <rect x="222" y="${64 + i * 28}" width="62" height="8" rx="4" fill="#E3DCCB"/>
      <path d="M200 ${68 + i * 28} l5 5 l9 -10" stroke="${i < 2 ? ORIENT_GREEN : ORIENT_RED}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="24 60" stroke-dashoffset="28">
        <animate attributeName="stroke-dashoffset" values="28; 28; 0; 0; 28" keyTimes="0; ${(0.04 + i * 0.09).toFixed(2)}; ${(0.12 + i * 0.09).toFixed(2)}; .92; 1" dur="6s" repeatCount="indefinite"/>
      </path>`).join('')}
    <rect x="34" y="176" width="64" height="7" rx="3.5" fill="#C9B79C"/>
    <rect x="62" y="183" width="8" height="27" rx="3" fill="#C9B79C"/>
    <g opacity="0">
      <animateTransform attributeName="transform" type="translate" values="230 96; 230 96; 66 162; 66 162; 66 162" keyTimes="0; .44; .64; .92; 1" dur="6s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0; 0; 1; 1; 0; 0" keyTimes="0; .44; .48; .9; .96; 1" dur="6s" repeatCount="indefinite"/>
      <rect x="-20" y="-14" width="40" height="28" rx="5" fill="#FFFFFF" stroke="${ORIENT_GREEN}" stroke-width="2"/>
      <rect x="-20" y="-14" width="40" height="7" rx="3" fill="${ORIENT_GREEN}"/>
      <circle cx="-9" cy="3.5" r="4" fill="#F5C842"/>
      <rect x="-1" y="0" width="15" height="3.5" rx="1.75" fill="#E3DCCB"/><rect x="-1" y="6" width="11" height="3.5" rx="1.75" fill="#E3DCCB"/>
    </g>
    ${orientClient(20, 210, 'check', 0.68)}
    ${orientTherapist(124, 210, [40, -20], '0 0 0; -8 0 0; 0 0 0')}
  </svg>`,
];

// Which planner steps each part covers (Part 1 = the five levels, …).
ORIENT_ILLUSTRATIONS.forEach((svg, i) => { ORIENT_ILLUSTRATIONS[i] = orientEase(svg); });
const ORIENT_PART_STEPS = [RING_ORDER, ['topFactors'], ['resourcePlan'], ['review']];

function renderOrientation(data) {
  const p = data.planner;
  const o = p.orientation;
  const el = document.getElementById('plannerOrientationSection');
  if (!o) return;
  const lv = o.levels || {};
  const t = o.tour || {};
  const rings = RING_ORDER.map(k => p.rings.find(r => r.key === k)).filter(Boolean);
  const stripEg = x => String(x || '').replace(/^e\.g\.\s*/i, '');
  const firstRingStep = STEP_KEYS.indexOf(RING_ORDER[0]);

  const ringSvg = `
    <svg viewBox="-4 -4 308 308" class="po-map" role="img" aria-label="Five nested circles: community/structural, school, family, peer, and the client at the center">
      ${rings.map((r, i) => `<circle class="po-ring po-ring-${i + 1}" data-level="${r.key}" cx="150" cy="150" r="${ORIENT_RING_RADII[i]}"><title>${escapeXml(r.label)}</title></circle>`).join('')}
      ${rings.map((r, i) => i < rings.length - 1
        ? `<text class="po-ring-label po-ring-label-${i + 1}" data-level="${r.key}" x="150" y="${150 - ORIENT_RING_RADII[i] + 18}">${escapeXml(r.label)}</text>`
        : `<text class="po-ring-label po-ring-label-${i + 1}" data-level="${r.key}" x="150" y="154">${escapeXml(r.label.replace(/\s*\(.*\)/, ''))}</text>`).join('')}
    </svg>`;

  // The five-level circle map, folded away by default to keep Part 1 simple.
  const levelsBlock = `
    <details class="po-levels">
      <summary class="po-levels-toggle">${icon('ic-layers', 'icon-sm')}${escapeXml(lv.toggleLabel || lv.heading || 'See the five levels')}</summary>
      ${lv.hint ? `<p class="po-hint">${escapeXml(lv.hint)}</p>` : ''}
      <div class="po-levels-layout">
        <div class="po-map-wrap">${ringSvg}</div>
        <div>
          <div class="po-level-chips" role="tablist" aria-label="Levels">
            ${rings.map((r, i) => `<button type="button" class="po-level-chip po-level-chip-${i + 1}" role="tab" data-level="${r.key}" aria-selected="false">${icon(ORIENT_RING_ICONS[r.key] || 'ic-layers', 'icon-xs')}${escapeXml(r.label)}</button>`).join('')}
          </div>
          <div class="po-level-detail" role="tabpanel" aria-live="polite"></div>
        </div>
      </div>
    </details>`;

  const steps = o.steps || [];
  // The planner step names (as in the step bar) and numbers each part covers.
  const STEP_NAMES = { topFactors: 'Top Factors', resourcePlan: 'Interventions', review: 'Treatment Plan' };
  const stepName = key => STEP_NAMES[key] || (p.rings.find(r => r.key === key) || {}).label || key;
  const partSteps = i => (ORIENT_PART_STEPS[i] || []).map(key => ({ key, num: STEP_KEYS.indexOf(key) + 1 })).filter(x => x.num > 0);
  const stepRange = list => !list.length ? '' : list.length === 1
    ? `${t.plannerStepWord || 'Step'} ${list[0].num}`
    : `${t.plannerStepsWord || 'Steps'} ${list[0].num}–${list[list.length - 1].num}`;

  const stepSlide = (st, i) => {
    const covers = partSteps(i);
    return `
    <div class="po-stepslide">
      <div class="po-stepslide-grid">
        <div>
          <div class="po-stepslide-head">
            <span class="po-step-badge" aria-hidden="true">${icon(st.icon || 'ic-check-circle')}</span>
            <div>
              <span class="po-step-kicker">${escapeXml(t.stepWord || 'Part')} ${i + 1} of ${steps.length}${covers.length ? ` · ${escapeXml(stepRange(covers))}` : ''}</span>
              <h4>${escapeXml(st.title)}</h4>
            </div>
          </div>
          ${st.summary ? `<p class="po-step-summary">${escapeXml(st.summary)}</p>` : ''}
          ${(st.bullets || []).length ? `<ul class="po-step-list">${st.bullets.map(x => `<li>${escapeXml(x)}</li>`).join('')}</ul>` : ''}
          ${covers.length ? `
          <div class="po-covers">
            <span class="po-covers-label">${escapeXml(t.coversLabel || 'In the planner')}:</span>
            ${covers.map(c => `<button type="button" class="po-jump" data-goto-step="${c.num - 1}"><b>${c.num}</b>${escapeXml(stepName(c.key))}</button>`).join('')}
          </div>` : ''}
        </div>
        <div class="po-illus-wrap">${ORIENT_ILLUSTRATIONS[i] || ''}</div>
      </div>
      ${st.showLevels ? levelsBlock : ''}
      ${i === steps.length - 1 && o.note ? `<p class="po-note">${icon('ic-lock', 'icon-xs')}<span>${escapeXml(o.note)}</span></p>` : ''}
    </div>`;
  };

  // When to use this tool: build the plan over sessions 2–4; by session 4 the
  // plan is ready, and sessions 4–12 follow it. Animated once each time Start
  // Here is shown.
  const tl = o.timeline;
  const total = (tl && tl.sessions) || 12;
  const sw = (tl && tl.sessionsWord) || 'Sessions';
  const timelineHtml = tl ? `
    <div class="po-timeline" style="--sessions:${total}; --build-from:${tl.buildFrom}; --build-to:${tl.buildTo}; --follow-to:${total}">
      <div class="po-tl-head">
        ${icon('ic-clock', 'icon-sm')}
        <strong>${escapeXml(tl.heading || '')}</strong>
      </div>
      <div class="po-tl-road" aria-hidden="true">
        <span class="po-tl-asphalt"></span>
        <span class="po-tl-stretch po-tl-build"></span>
        <span class="po-tl-stretch po-tl-follow"></span>
        <span class="po-tl-dashes"></span>
        ${Array.from({ length: total }, (_, n) => `<span class="po-tl-dot${n + 1 >= tl.buildFrom && n + 1 <= tl.buildTo ? ' is-build' : ''}${n + 1 > tl.buildTo ? ' is-follow' : ''}" style="grid-column:${n + 1}">${n + 1}</span>`).join('')}
        <span class="po-tl-pin" style="grid-column:${tl.buildTo}">
          <span class="po-tl-pin-label">${icon('ic-flag', 'icon-xs')}${escapeXml(tl.readyLabel || '')}</span>
          <svg viewBox="0 0 20 24" width="20" height="24"><path d="M10 23 C2 14 1 11 1 9 A9 9 0 0 1 19 9 C19 11 18 14 10 23 Z" fill="currentColor" stroke="#FFFFFF" stroke-width="2"/><circle cx="10" cy="9" r="3.2" fill="#FFFFFF"/></svg>
        </span>
      </div>
      <div class="po-tl-cards">
        <div class="po-tl-card is-build">
          <span class="po-tl-card-tag">${escapeXml(tl.buildLabel || '')}</span>
          <span class="po-tl-card-range">${escapeXml(sw)} ${tl.buildFrom}–${tl.buildTo}</span>
          <p>${escapeXml(tl.buildText || '')}</p>
        </div>
        <div class="po-tl-card is-follow">
          <span class="po-tl-card-tag">${escapeXml(tl.followLabel || '')}</span>
          <span class="po-tl-card-range">${escapeXml(sw)} ${tl.buildTo}–${total}</span>
          <p>${escapeXml(tl.followText || '')}</p>
        </div>
      </div>
      <p class="sr-only">${escapeXml(tl.srText || '')}</p>
    </div>` : '';

  const slides = steps.map(stepSlide);
  el.innerHTML = `
    <div class="po-tour">
      ${timelineHtml}
      <div class="po-tour-top">
        <ol class="po-stepnav" aria-label="${escapeXml(t.stepsLabel || 'The four steps')}">
          ${steps.map((st, i) => `<li><button type="button" class="po-stepnav-btn" data-slide-to="${i}"><b>${i + 1}</b><span>${escapeXml(st.shortTitle || st.title)}</span></button></li>`).join('')}
        </ol>
        <button type="button" class="po-skip" data-goto-step="${firstRingStep}">${escapeXml(t.skipLabel || 'Skip intro')} ${icon('i-arrow-right', 'icon-xs')}</button>
      </div>
      ${slides.map((html, i) => `<div class="po-slide" data-slide="${i}" hidden>${html}</div>`).join('')}
      <div class="po-tour-nav">
        <button type="button" class="btn btn-outline po-back">${escapeXml(t.backLabel || 'Back')}</button>
        <span class="po-count" aria-live="polite"></span>
        <button type="button" class="btn btn-primary po-next">${escapeXml(t.nextLabel || 'Next')}</button>
        <button type="button" class="btn btn-primary po-start" data-goto-step="${firstRingStep}">${escapeXml(t.startLabel || 'Start mapping')} ${icon('i-arrow-right', 'icon-xs')}</button>
      </div>
    </div>`;

  // ── slide navigation ──
  let current = 0;
  const show = i => {
    current = Math.max(0, Math.min(slides.length - 1, i));
    el.querySelectorAll('.po-slide').forEach(sl => { sl.hidden = parseInt(sl.dataset.slide, 10) !== current; });
    el.querySelectorAll('.po-stepnav-btn').forEach(btn => {
      const n = parseInt(btn.dataset.slideTo, 10);
      btn.classList.toggle('is-current', n === current);
      btn.classList.toggle('is-done', n < current);
      if (n === current) btn.setAttribute('aria-current', 'step'); else btn.removeAttribute('aria-current');
    });
    el.querySelector('.po-back').style.visibility = current === 0 ? 'hidden' : 'visible';
    const last = current === slides.length - 1;
    el.querySelector('.po-next').hidden = last;
    el.querySelector('.po-start').hidden = !last;
    el.querySelector('.po-count').textContent = `${current + 1} of ${slides.length}`;
  };
  el.querySelectorAll('.po-stepnav-btn').forEach(btn => {
    btn.addEventListener('click', () => show(parseInt(btn.dataset.slideTo, 10)));
  });
  el.querySelector('.po-back').addEventListener('click', () => show(current - 1));
  el.querySelector('.po-next').addEventListener('click', () => show(current + 1));
  plannerState.resetOrientationTour = () => {
    show(0);
    // replay the timeline animation each time Start Here is shown
    const tlEl = el.querySelector('.po-timeline');
    if (tlEl) { tlEl.classList.remove('is-playing'); void tlEl.offsetWidth; tlEl.classList.add('is-playing'); }
  };
  // Reduced motion: hold every illustration still.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.querySelectorAll('svg.po-illus').forEach(svg => {
      try { svg.pauseAnimations(); svg.setCurrentTime(1.6); } catch (e) { /* ignore */ }
    });
  }
  show(0);

  // ── five levels: click a ring or a level chip to see it (hover previews on the map) ──
  const detail = el.querySelector('.po-level-detail');
  let pinned = RING_ORDER[0];
  function showLevel(key) {
    const r = rings.find(x => x.key === key);
    const idx = rings.indexOf(r);
    el.querySelectorAll('.po-ring, .po-ring-label').forEach(n => {
      n.classList.toggle('is-active', n.dataset.level === key);
      n.classList.toggle('is-dim', n.dataset.level !== key);
    });
    el.querySelectorAll('.po-level-chip').forEach(c => {
      c.classList.toggle('is-active', c.dataset.level === key);
      c.setAttribute('aria-selected', String(c.dataset.level === key));
    });
    detail.className = `po-level-detail po-level-${idx + 1}`;
    detail.innerHTML = `
      <h5>${icon(ORIENT_RING_ICONS[key] || 'ic-layers', 'icon-sm')}${escapeXml(r.label)}</h5>
      ${r.description ? `<p>${escapeXml(r.description)}</p>` : ''}
      <div class="po-examples">
        <span class="po-eg po-eg-protective"><b>${escapeXml(lv.protectiveLabel || p.protectiveColumnLabel)}</b>${escapeXml(stripEg(r.placeholderProtective))}</span>
        <span class="po-eg po-eg-risk"><b>${escapeXml(lv.riskLabel || p.riskColumnLabel)}</b>${escapeXml(stripEg(r.placeholderRisk))}</span>
      </div>`;
  }
  el.querySelectorAll('.po-ring').forEach(ring => {
    ring.addEventListener('mouseenter', () => showLevel(ring.dataset.level));
    ring.addEventListener('mouseleave', () => showLevel(pinned));
    ring.addEventListener('click', () => { pinned = ring.dataset.level; showLevel(pinned); });
  });
  el.querySelectorAll('.po-level-chip').forEach(chip => {
    chip.addEventListener('click', () => { pinned = chip.dataset.level; showLevel(pinned); });
  });
  showLevel(pinned);
}

// ── "File an extension" (Rise portal) — Phase 2 suggests it, Phase 3 offers a button ──
function renderExtensionLinks(p) {
  const ext = p.extension;
  const el2 = document.getElementById('plannerPhase2Extension');
  const el3 = document.getElementById('plannerPhase3Extension');
  if (!ext || !ext.href) { el2.hidden = true; el3.hidden = true; return; }
  el2.innerHTML = `${icon('ic-refresh', 'icon-sm')}<span>${escapeXml(ext.phase2Text)}</span>
    <a href="${ext.href}" target="_blank" rel="noopener">${escapeXml(ext.phase2LinkText)} ${icon('i-arrow-right', 'icon-xs')}</a>`;
  el3.innerHTML = `${icon('ic-refresh', 'icon-sm')}<span>${escapeXml(ext.phase3Text)}</span>
    <a class="btn btn-primary planner-extension-btn" href="${ext.href}" target="_blank" rel="noopener">${escapeXml(ext.phase3ButtonText)}</a>`;
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
    const onOrientation = STEP_KEYS[plannerState.currentStep] === 'orientation';
    document.getElementById('plannerEmptyState').style.display = any || onOrientation ? 'none' : 'block';
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

  // When you move to another step from further down the page, bring the new
  // step's start up to just under the sticky step bar (no jump if it's already
  // in view, e.g. on first load).
  function scrollToStepStart() {
    if (plannerState.initialRender) return;
    const header = document.getElementById('plannerStepHeader');
    const bar = document.querySelector('.planner-stepper-row');
    const navH = document.getElementById('mainNav').offsetHeight;
    const offset = navH + (getComputedStyle(bar).position === 'sticky' ? bar.offsetHeight : 0) + 12;
    const top = header.getBoundingClientRect().top;
    if (top < offset || top > window.innerHeight * 0.6) {
      window.scrollTo({ top: window.scrollY + top - offset, behavior: 'smooth' });
    }
  }

  function goToStep(index) {
    if (index < 0 || index > STEP_KEYS.length - 1) return;
    plannerState.currentStep = index;
    plannerState.furthestStep = Math.max(plannerState.furthestStep, index);

    const stepKey = STEP_KEYS[index];
    const isRingStep = RING_ORDER.includes(stepKey);
    const isOrientation = stepKey === 'orientation';
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

    // Start Here has its own Back/Next inside the tour, so the planner's own nav stays out of the way.
    document.getElementById('plannerStepNav').hidden = onReview || isOrientation;
    if (isOrientation && plannerState.resetOrientationTour) plannerState.resetOrientationTour();
    document.getElementById('plannerActions').hidden = !onReview;
    document.getElementById('plannerDownloadHint').hidden = !onReview;
    document.getElementById('plannerEmailHint').hidden = !onReview;
    // The generated plan only belongs on Review — once you've generated it,
    // it shouldn't keep trailing along at the bottom of every other step.
    document.getElementById('plannerOutput').hidden = !(onReview && plannerState.hasGenerated);
    // The add-factor forms only belong on ring steps — Review has nothing left
    // to add, and both curation steps (Top Factors, Resources) stand on their own.
    document.getElementById('plannerLayout').hidden = isOrientation || isTopFactorsStep || isResourcePlanStep || onReview;
    // The ecological map belongs on ring steps and Review — both curation
    // steps (Top Factors, Resources) stand on their own without it. Its
    // "Phase 1" header only belongs on Review, since steps 1–5 already have
    // their own per-ring step header above.
    document.getElementById('plannerEcoMapWrap').hidden = isOrientation || isTopFactorsStep || isResourcePlanStep;
    document.getElementById('plannerOrientationSection').hidden = !isOrientation;
    // Smaller map while entering factors, so the whole step (and the sticky
    // step bar) fits on screen; full size on the Treatment Plan.
    document.getElementById('plannerEcoMapWrap').classList.toggle('is-compact', isRingStep);
    document.getElementById('plannerReviewPhase1Head').hidden = !onReview;
    document.getElementById('plannerPriorityStrip').hidden = !onReview;
    document.getElementById('plannerTopFactorsSection').hidden = !isTopFactorsStep;
    document.getElementById('plannerResourcePlanSection').hidden = !isResourcePlanStep;

    if (isTopFactorsStep) renderTopFactorsStep();
    if (isResourcePlanStep) renderInterventionStep();

    // Review gets the same "Step X of Y: Label" header as every other step —
    // no separate custom heading/intro. The last three steps conclude the
    // mapping activity as three named phases.
    let title, hint, definition = '';
    if (isOrientation) {
      title = `Step ${index + 1} of ${STEP_KEYS.length}: ${(p.orientation && p.orientation.title) || 'Start Here'}`;
      hint = (p.orientation && p.orientation.hint) || '';
    } else if (onReview) {
      title = `Step ${index + 1} of ${STEP_KEYS.length}: Treatment Plan`;
      hint = '';
    } else if (isRingStep) {
      const ringData = p.rings.find(r => r.key === stepKey);
      title = `Step ${index + 1} of ${STEP_KEYS.length}: ${ringData.label}`;
      hint = p.stepHint;
      definition = ringData.description || '';
    } else if (isTopFactorsStep) {
      title = `Step ${index + 1} of ${STEP_KEYS.length}: Identify Top Factors Impacting the Client`;
      hint = p.topFactorsHint || 'Drag, or click, your top protective and risk factors into the boxes below. Start with the strengths you want to amplify. At least 3 of each is a good start; add more with the + button or by dropping in extra factors from the lists above.';
    } else {
      title = `Step ${index + 1} of ${STEP_KEYS.length}: Select Interventions`;
      hint = 'Type to choose a strategy or practice for each factor below, or write in your own — add as many as you need per factor.';
    }
    document.getElementById('plannerStepTitle').textContent = title;
    // Each level's definition comes from the same planner.rings[].description
    // used on Start Here, so it's written (and edited in the CMS) once.
    const defEl = document.getElementById('plannerStepDefinition');
    defEl.textContent = definition;
    defEl.hidden = !definition;
    document.getElementById('plannerOrderNote').hidden = !isRingStep || !p.levelOrderNote;
    document.getElementById('plannerStepHint').textContent = hint;
    // Same goal reminder on every step, worded for what that step asks of you.
    const goalStepKey = isRingStep ? 'ring' : stepKey;
    document.getElementById('plannerStepHint').hidden = !hint;
    document.getElementById('plannerStepGoal').innerHTML = isOrientation ? '' : stepGoalHtml(goalStepKey);
    document.getElementById('plannerStepGoal').hidden = isOrientation;

    if (!onReview) {
      document.getElementById('plannerBackBtn').hidden = index === 0;
      // The step right before Review doubles as "Generate" — one click both
      // reviews and generates the plan, instead of a separate button on Review.
      document.getElementById('plannerNextBtn').textContent = index === STEP_KEYS.length - 2 ? p.generateButtonLabel
        : p.nextButtonLabel;
    }

    renderStepperState();
    updateGenerateState();
    scrollToStepStart();
    renderEcoMap();
    persistPlannerState();

    // Review IS the generated output now — keep it current every time you land here.
    if (onReview) generatePlan();
  }

  // The factor rows stay visible (as reference) on both curation steps, so
  // adding/removing a factor from there must refresh whichever
  // curation step is currently showing — otherwise its pool goes stale.
  function refreshActiveCurationStep() {
    const key = STEP_KEYS[plannerState.currentStep];
    if (key === 'topFactors') renderTopFactorsStep();
    if (key === 'resourcePlan') renderInterventionStep();
    // Review shows the generated plan directly, so an edit made there (the
    // factor rows stay visible/editable on Review) needs to regenerate it.
    if (key === 'review') generatePlan();
  }

  function addFactor(ring, valence, text) {
    text = text.trim();
    if (!text) return;
    plannerState.factors[ring][valence].push({ id: plannerState.nextFactorId++, text });
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
      addFactor(ring, valence, input.value);
      input.value = '';
      input.focus();
    });
  });

  // Picking a common example adds it (unless it's already on the map), then resets.
  layout.querySelectorAll('.planner-example-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const { ring, valence } = sel.dataset;
      const text = sel.value;
      if (text && !plannerState.factors[ring][valence].some(f => f.text.toLowerCase() === text.toLowerCase())) {
        addFactor(ring, valence, text);
      }
      sel.value = '';
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

  const ecoMapEl = document.getElementById('plannerEcoMap');
  if (ecoMapEl) {
    ecoMapEl.addEventListener('click', e => {
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
      <span class="planner-chip planner-chip-${f.valence} planner-pool-chip" draggable="true" data-id="${f.id}" data-valence="${f.valence}">
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
        : `<p class="planner-pool-empty">${RING_ORDER.some(r => plannerState.factors[r][valence].length)
            ? `All your ${valence === 'risk' ? 'risk' : 'protective'} factors are selected below.`
            : `No ${valence === 'risk' ? 'risk' : 'protective'} factors entered yet — add some in the steps above.`}</p>`;

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
        // A selected factor can be reordered: drag it onto another slot, or
        // use its up/down buttons (keyboard and screen-reader friendly).
        const lastFilled = slots.reduce((m, sid, j) => (sid !== null ? j : m), -1);
        const firstFilled = slots.findIndex(sid => sid !== null);
        return `<div class="planner-slot is-filled" draggable="true" data-valence="${valence}" data-slot-index="${i}" data-factor-id="${found.id}">
          <span class="planner-slot-num">${i + 1}</span>
          <span class="planner-slot-order">
            <button type="button" class="planner-slot-move" data-slot-move="${valence}:${i}:-1" aria-label="Move up: ${escapeXml(found.text)}"${i === firstFilled ? ' disabled' : ''}>${icon('i-arrow-up', 'icon-xs')}</button>
            <button type="button" class="planner-slot-move" data-slot-move="${valence}:${i}:1" aria-label="Move down: ${escapeXml(found.text)}"${i === lastFilled ? ' disabled' : ''}>${icon('i-arrow-down', 'icon-xs')}</button>
          </span>
          <span class="planner-chip planner-chip-${valence}">
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

  // Reorder the selected top factors within one list. Moving onto a filled
  // slot swaps the two; the Treatment Plan's order follows (and vice versa).
  function moveTopSlot(valence, from, to) {
    const slots = plannerState.topContributors[valence];
    if (to < 0 || to >= slots.length || from === to || slots[from] === null) return false;
    [slots[from], slots[to]] = [slots[to], slots[from]];
    syncPlanOrderFromSlots(valence);
    renderTopFactorsStep();
    persistPlannerState();
    return true;
  }
  // Step 7 → Treatment Plan: that list's plan order becomes the slot order.
  function syncPlanOrderFromSlots(valence) {
    const ids = plannerState.topContributors[valence].filter(id => id !== null);
    const others = VALENCE_ORDER.filter(v => v !== valence);
    const byValence = {};
    others.forEach(v => { byValence[v] = topFactorGroup(v).map(f => f.id); });
    byValence[valence] = ids;
    plannerState.planOrder = VALENCE_ORDER.flatMap(v => byValence[v]);
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
      const moveBtn = e.target.closest('[data-slot-move]');
      if (moveBtn) {
        if (moveBtn.disabled) return;
        const [valence, idx, dir] = moveBtn.dataset.slotMove.split(':');
        const from = parseInt(idx, 10), step = parseInt(dir, 10);
        // skip past empty slots so a move always lands on the next selected factor
        const slots = plannerState.topContributors[valence];
        let to = from + step;
        while (to >= 0 && to < slots.length && slots[to] === null) to += step;
        if (to < 0 || to >= slots.length) return;
        const id = slots[from];
        if (moveTopSlot(valence, from, to)) {
          const again = topFactorsSection.querySelector(`.planner-slot[data-factor-id="${id}"] [data-slot-move$=":${step}"]`);
          const other = topFactorsSection.querySelector(`.planner-slot[data-factor-id="${id}"] [data-slot-move$=":${-step}"]`);
          (again && !again.disabled ? again : other)?.focus();
          const announce = document.getElementById('plannerReorderAnnounce');
          const f = findFactorById(valence, id);
          if (announce && f) announce.textContent = `Moved "${f.text}" to position ${to + 1}.`;
        }
        return;
      }
      const addSlotBtn = e.target.closest('[data-add-slot]');
      if (addSlotBtn) { addTopFactorSlot(addSlotBtn.dataset.addSlot); return; }
      const poolChip = e.target.closest('.planner-pool-chip');
      if (poolChip) placeTopContributor(poolChip.dataset.valence, parseInt(poolChip.dataset.id, 10));
    });
    topFactorsSection.addEventListener('dragstart', e => {
      const slotEl = e.target.closest('.planner-slot.is-filled');
      if (slotEl) {
        e.dataTransfer.setData('text/plain', JSON.stringify({ valence: slotEl.dataset.valence, fromSlot: parseInt(slotEl.dataset.slotIndex, 10) }));
        e.dataTransfer.effectAllowed = 'move';
        slotEl.classList.add('is-dragging');
        return;
      }
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
    topFactorsSection.addEventListener('dragend', () => {
      topFactorsSection.querySelectorAll('.is-dragging, .is-over').forEach(el => el.classList.remove('is-dragging', 'is-over'));
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
      // A selected factor dragged within its list: swap with the slot it lands on.
      if (payload.fromSlot !== undefined) {
        const target = e.target.closest('.planner-slot');
        const slots = plannerState.topContributors[payload.valence];
        const to = target ? parseInt(target.dataset.slotIndex, 10) : slots.length - 1;
        moveTopSlot(payload.valence, payload.fromSlot, to);
        return;
      }
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
      container.innerHTML = `<p class="planner-pool-empty">Pick your top protective and risk factors on the previous step first — each one gets its own intervention here.</p>`;
      return;
    }

    // Protective factors first, under their own heading, then risk factors.
    const quickAdds = (p.protectiveQuickAdds || []).filter(q => q && q.label);
    let lastValence = null;
    container.innerHTML = factors.map(f => {
      let groupHead = '';
      if (f.valence !== lastValence) {
        lastValence = f.valence;
        const lbl = factorGroupLabels(f.valence);
        groupHead = `<div class="intervention-group-head intervention-group-head-${f.valence}">
          <h4 class="intervention-group-heading">${icon(f.valence === 'protective' ? 'ic-shield' : 'ic-alert', 'icon-sm')}${escapeXml(lbl.heading)}</h4>
          ${lbl.hint ? `<p class="intervention-group-hint">${escapeXml(lbl.hint)}</p>` : ''}
        </div>`;
      }
      const chosen = plannerState.interventionsByFactor[f.id] || [];
      const chipsHtml = chosen.map((text, i) => `
        <span class="planner-chip planner-chip-neutral">
          <span class="planner-chip-text">${escapeXml(text)}</span>
          <button type="button" class="planner-chip-remove" data-remove-intervention="${f.id}:${i}" aria-label="Remove">${icon('i-x', 'icon-xs')}</button>
        </span>`).join('');
      // Protective factors: one-click ways to amplify them (toggle on/off).
      const quickHtml = f.valence === 'protective' && quickAdds.length ? `
          <div class="intervention-quick" role="group" aria-label="Quick add for ${escapeXml(f.text)}">
            <span class="intervention-quick-label">${escapeXml(p.protectiveQuickAddLabel || 'Quick add')}:</span>
            ${quickAdds.map(q => {
              const on = chosen.includes(q.label);
              return `<button type="button" class="intervention-quick-btn${q.safetyPlan ? ' is-safety' : ''}" data-quick-factor="${f.id}" data-quick-label="${escapeXml(q.label)}" aria-pressed="${on}">${icon(on ? 'ic-check-circle' : (q.safetyPlan ? 'ic-shield' : 'i-plus'), 'icon-xs')}${escapeXml(q.label)}</button>`;
            }).join('')}
          </div>` : '';
      return groupHead + `
        <div class="intervention-factor-row intervention-factor-row-${f.valence}">
          <div class="intervention-factor-header">
            <span class="planner-note-tag planner-note-tag-${f.valence}">${f.valence === 'risk' ? 'Risk' : 'Protective'}</span>
            <strong class="intervention-factor-name">${escapeXml(f.text)}</strong>
            <span class="intervention-factor-ring">${escapeXml(f.ringLabel)}</span>
          </div>
          <div class="intervention-input-row">
            <div class="intervention-combo">
              <input type="text" class="planner-input intervention-input" autocomplete="off"
                     role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="interventionListbox"
                     data-factor-id="${f.id}" placeholder="Type or choose a strategy/practice…" />
            </div>
            <button type="button" class="btn btn-primary intervention-add-btn" data-factor-id="${f.id}">Add</button>
          </div>${quickHtml}
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
      // Quick add (protective factors): toggle the option on or off
      const quick = e.target.closest('.intervention-quick-btn');
      if (quick) {
        const fid = quick.dataset.quickFactor;
        const label = quick.dataset.quickLabel;
        const list = plannerState.interventionsByFactor[fid] || [];
        const at = list.indexOf(label);
        closeCombo();
        if (at === -1) addIntervention(fid, label); else removeIntervention(fid, at);
        interventionFactorsList.querySelector(`.intervention-quick-btn[data-quick-factor="${fid}"][data-quick-label="${CSS.escape(label)}"]`)?.focus();
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
    plannerState.planOrder = [];
    plannerState.phase3Checks = [];
    document.querySelectorAll('.planner-phase-comment-input').forEach(el => { el.value = ''; });
    document.getElementById('plannerOutput').hidden = true;
    document.getElementById('plannerDownloadBtn').hidden = true;
    document.getElementById('plannerDownloadHint').hidden = true;
    document.getElementById('plannerEmailBtn').hidden = true;
    document.getElementById('plannerEmailHint').hidden = true;
    const firstRingStep = STEP_KEYS.indexOf(RING_ORDER[0]);
    plannerState.currentStep = firstRingStep;
    plannerState.furthestStep = firstRingStep;
    plannerState.hasGenerated = false;
    goToStep(firstRingStep);
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
  document.getElementById('plannerOrientationSection').addEventListener('click', e => {
    const btn = e.target.closest('[data-goto-step]');
    if (btn) goToStep(parseInt(btn.dataset.gotoStep, 10));
  });

  document.querySelectorAll('.planner-phase-comment-input').forEach(el => {
    el.addEventListener('input', () => {
      plannerState.phaseComments[parseInt(el.dataset.phaseIndex, 10)] = el.value;
      persistPlannerState();
    });
  });

  // Phase 3 checklist — delegated so it survives generatePlan() re-rendering
  // the list. Updates state, the progress count, the printed plan and the
  // email summary in place (keeps keyboard focus on the checkbox).
  document.getElementById('plannerPhase3Checklist').addEventListener('change', e => {
    const box = e.target.closest('.planner-checklist-input');
    if (!box) return;
    const i = parseInt(box.dataset.checkIndex, 10);
    plannerState.phase3Checks[i] = box.checked;
    box.closest('.planner-checklist-item').classList.toggle('is-done', box.checked);
    updatePhase3Progress();
    buildPrintSheet(plannerState.data, plannerState.ringLabelByKey, plannerState.data.toolkit.tabs.roadmap.phases, plannerState.lastNotes || []);
    document.getElementById('plannerEmailBtn').href = buildEmailPlanHref(plannerState.data);
    persistPlannerState();
  });

  // ── Treatment Plan: reorder top factors (drag-and-drop, or Move up /
  // Move down buttons). Delegated on the container, which survives
  // generatePlan() re-rendering the table. ──
  const reorderEl = document.getElementById('plannerOutputInterventions');
  const reorderAnnounce = document.getElementById('plannerReorderAnnounce');
  function afterMove(factorId, focusDir) {
    persistPlannerState();
    generatePlan(); // re-renders the table, the printed plan and the email summary
    const movedFactor = selectedTopContributors().find(f => f.id === factorId);
    const order = movedFactor ? topFactorGroup(movedFactor.valence) : [];
    const pos = order.findIndex(f => f.id === factorId);
    if (movedFactor && reorderAnnounce) reorderAnnounce.textContent = `Moved "${movedFactor.text}" to position ${pos + 1} of ${order.length} ${movedFactor.valence} factors.`;
    // Keep keyboard focus on the moved factor's button (or the other one at an end).
    if (focusDir) {
      const btn = reorderEl.querySelector(`.intervention-order-btn[data-factor-id="${factorId}"][data-move="${focusDir}"]`);
      const other = reorderEl.querySelector(`.intervention-order-btn[data-factor-id="${factorId}"][data-move="${focusDir === 'up' ? 'down' : 'up'}"]`);
      (btn && !btn.disabled ? btn : other)?.focus();
    }
  }
  reorderEl.addEventListener('click', e => {
    const btn = e.target.closest('.intervention-order-btn');
    if (!btn || btn.disabled) return;
    const id = parseInt(btn.dataset.factorId, 10);
    const f = selectedTopContributors().find(x => x.id === id);
    if (!f) return;
    const from = topFactorGroup(f.valence).findIndex(x => x.id === id);
    if (moveTopFactor(id, from + (btn.dataset.move === 'up' ? -1 : 1))) afterMove(id, btn.dataset.move);
  });
  let draggingId = null, draggingValence = null;
  reorderEl.addEventListener('dragstart', e => {
    const row = e.target.closest('.intervention-review-row');
    if (!row) return;
    draggingId = parseInt(row.dataset.factorId, 10);
    draggingValence = row.dataset.valence;
    row.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(draggingId));
  });
  reorderEl.addEventListener('dragover', e => {
    const row = e.target.closest('.intervention-review-row');
    // rows only move within their own list (protective or risk)
    if (draggingId === null || !row || row.dataset.valence !== draggingValence) return;
    e.preventDefault();
    const after = e.clientY > row.getBoundingClientRect().top + row.offsetHeight / 2;
    reorderEl.querySelectorAll('.intervention-review-row').forEach(r => r.classList.remove('drop-before', 'drop-after'));
    if (parseInt(row.dataset.factorId, 10) !== draggingId) row.classList.add(after ? 'drop-after' : 'drop-before');
  });
  reorderEl.addEventListener('drop', e => {
    const row = e.target.closest('.intervention-review-row');
    if (draggingId === null || !row || row.dataset.valence !== draggingValence) return;
    e.preventDefault();
    const ids = topFactorGroup(draggingValence).map(f => f.id);
    const targetId = parseInt(row.dataset.factorId, 10);
    const after = row.classList.contains('drop-after');
    let to = ids.indexOf(targetId) + (after ? 1 : 0);
    if (ids.indexOf(draggingId) < to) to -= 1; // removing the dragged row shifts later positions up by one
    const id = draggingId;
    draggingId = null;
    if (moveTopFactor(id, to)) afterMove(id, null);
    else reorderEl.querySelectorAll('.intervention-review-row').forEach(r => r.classList.remove('drop-before', 'drop-after', 'is-dragging'));
  });
  reorderEl.addEventListener('dragend', () => {
    draggingId = null;
    reorderEl.querySelectorAll('.intervention-review-row').forEach(r => r.classList.remove('drop-before', 'drop-after', 'is-dragging'));
  });

  // Restore any previously entered factors (and the step/output the clinician
  // was on) before landing on the current step.
  plannerState.initialRender = true;
  goToStep(plannerState.currentStep); // already generates the plan if this lands on Review
  plannerState.initialRender = false;
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
  // Protective factors first, then risk (VALENCE_ORDER); within each group,
  // the clinician's own order from the Treatment Plan (planOrder), with
  // factors not placed there yet keeping their slot order.
  const rank = id => {
    const i = plannerState.planOrder.indexOf(id);
    return i === -1 ? Infinity : i;
  };
  const list = [];
  VALENCE_ORDER.forEach(valence => {
    const group = [];
    plannerState.topContributors[valence].forEach(id => {
      if (id === null) return;
      const f = topContributorFactor(valence, id);
      if (f) group.push({ ...f, valence });
    });
    group
      .map((f, i) => ({ f, i }))
      .sort((x, y) => (rank(x.f.id) - rank(y.f.id)) || (x.i - y.i))
      .forEach(x => list.push(x.f));
  });
  return list;
}

// The top factors of one kind (protective or risk), in plan order.
function topFactorGroup(valence) {
  return selectedTopContributors().filter(f => f.valence === valence);
}

// Move one top factor to a new position within its own group (protective
// and risk are reordered separately). Its interventions are keyed by factor
// id, so they move with it.
function moveTopFactor(factorId, toIndex) {
  const all = selectedTopContributors();
  const factor = all.find(f => f.id === factorId);
  if (!factor) return false;
  const ids = all.filter(f => f.valence === factor.valence).map(f => f.id);
  const from = ids.indexOf(factorId);
  toIndex = Math.max(0, Math.min(ids.length - 1, toIndex));
  if (toIndex === from) return false;
  ids.splice(from, 1);
  ids.splice(toIndex, 0, factorId);
  const groups = {};
  VALENCE_ORDER.forEach(v => { groups[v] = v === factor.valence ? ids : all.filter(f => f.valence === v).map(f => f.id); });
  plannerState.planOrder = VALENCE_ORDER.flatMap(v => groups[v]);
  // Step 7's slots follow the same order (selected factors first, empty slots after).
  const slots = plannerState.topContributors[factor.valence];
  const empties = slots.length - ids.length;
  plannerState.topContributors[factor.valence] = ids.concat(Array(Math.max(0, empties)).fill(null));
  return true;
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
    return `<ol class="planner-top-list">${items.map(it => `<li>${escapeXml(it.text)} <em>(${escapeXml(it.ringLabel)})</em></li>`).join('')}</ol>`;
  };
  return `
    <h3>Factors</h3>
    <div class="planner-top-contributors">
      <div><h4 class="planner-col-heading-protective">Protective Factors</h4>${listFor('protective')}</div>
      <div><h4 class="planner-col-heading-risk">Risk Factors</h4>${listFor('risk')}</div>
    </div>`;
}

function topContributorsPrintHtml() {
  const listFor = valence => {
    const items = plannerState.topContributors[valence].map(id => id !== null ? topContributorFactor(valence, id) : null).filter(Boolean);
    return items.length ? items.map(it => `${escapeXml(it.text)} (${escapeXml(it.ringLabel)})`).join('; ') : 'None selected';
  };
  return `<h3>Top Contributors</h3><ul><li><strong>Top Protective Factors:</strong> ${listFor('protective')}</li><li><strong>Top Risk Factors:</strong> ${listFor('risk')}</li></ul>`;
}

// Each top factor shown with its ecological placement (which
// ring it was entered under), and whatever intervention(s) were picked for
// it — the curated counterpart to the full list in "Factors" above.
// Labels for the two groups of top factors (CMS: planner.factorGroups).
function factorGroupLabels(valence) {
  const g = (plannerState.data.planner.factorGroups || {})[valence] || {};
  return {
    heading: g.heading || (valence === 'protective' ? 'Protective factors to amplify' : 'Risk factors to reduce'),
    hint: g.hint || ''
  };
}

// The Treatment Plan's interventions, as two separate tables — protective
// factors (to amplify) first, then risk factors (to reduce). Each table can
// be reordered on its own by dragging a row or with Move up / Move down.
function interventionsHtml() {
  const all = selectedTopContributors();
  if (!all.length) {
    return `<h3>Interventions</h3><p class="planner-resource-empty">No top factors selected yet — go back to the Top Contributors step to add some.</p>`;
  }
  const tableFor = valence => {
    const factors = all.filter(f => f.valence === valence);
    const lbl = factorGroupLabels(valence);
    if (!factors.length) {
      return `<div class="intervention-group intervention-group-${valence}">
        <h4 class="intervention-group-heading">${escapeXml(lbl.heading)}</h4>
        <p class="planner-resource-empty">No ${valence} factors selected yet.</p></div>`;
    }
    const rows = factors.map((f, i) => {
      const list = plannerState.interventionsByFactor[f.id] || [];
      const name = escapeXml(f.text);
      const orderCell = `
        <td class="intervention-review-order" data-label="Order">
          <span class="intervention-order-handle" aria-hidden="true" title="Drag to reorder">${icon('ic-grip', 'icon-sm')}</span>
          <span class="intervention-order-num" aria-hidden="true">${i + 1}</span>
          <span class="intervention-order-btns">
            <button type="button" class="intervention-order-btn" data-move="up" data-factor-id="${f.id}" aria-label="Move up: ${name}"${i === 0 ? ' disabled' : ''}>${icon('i-arrow-up', 'icon-xs')}</button>
            <button type="button" class="intervention-order-btn" data-move="down" data-factor-id="${f.id}" aria-label="Move down: ${name}"${i === factors.length - 1 ? ' disabled' : ''}>${icon('i-arrow-down', 'icon-xs')}</button>
          </span>
        </td>`;
      const practices = list.length
        ? `<ul class="intervention-review-chips">${list.map(n => `<li>${escapeXml(n)}</li>`).join('')}</ul>`
        : '<span class="intervention-review-none">No intervention selected yet</span>';
      return `
      <tr class="intervention-review-row intervention-review-row-${f.valence}" draggable="true" data-factor-id="${f.id}" data-valence="${f.valence}">
        ${orderCell}
        <td class="intervention-review-factor" data-label="Factor">
          <span class="intervention-review-factor-top">
            <strong class="intervention-review-factor-text">${name}</strong>
          </span>
          <span class="intervention-review-meta">
            <span class="intervention-review-ring">${escapeXml(f.ringLabel)}</span>
          </span>
        </td>
        <td class="intervention-review-practice-cell" data-label="Intervention(s)">${practices}</td>
      </tr>`;
    });
    return `
      <div class="intervention-group intervention-group-${valence}">
        <h4 class="intervention-group-heading">${icon(valence === 'protective' ? 'ic-shield' : 'ic-alert', 'icon-sm')}${escapeXml(lbl.heading)}</h4>
        ${lbl.hint ? `<p class="intervention-group-hint">${escapeXml(lbl.hint)}</p>` : ''}
        <table class="intervention-review-table">
          <thead><tr><th scope="col"><span class="sr-only">Order</span></th><th scope="col">${valence === 'protective' ? 'Protective factor' : 'Risk factor'}</th><th scope="col">Intervention(s)</th></tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>`;
  };
  return `
    <h3>Interventions</h3>
    <p class="intervention-review-reorder-hint">Drag a factor, or use its arrows, to put each list in the order you will work on it. Its interventions move with it, and the printed plan follows this order.</p>
    ${VALENCE_ORDER.map(tableFor).join('')}`;
}

function myInterventionsPrintHtml() {
  const all = selectedTopContributors();
  if (!all.length) return `<h3>My Interventions</h3><p>No top factors selected.</p>`;
  const tableFor = valence => {
    const factors = all.filter(f => f.valence === valence);
    if (!factors.length) return '';
    const rows = factors.map(f => {
      const list = plannerState.interventionsByFactor[f.id] || [];
      const practices = list.map(name => `<li>${escapeXml(name)}</li>`).join('');
      return `<tr>
      <td>${escapeXml(f.text)}<br><span class="print-int-meta">${escapeXml(f.ringLabel)}</span></td>
      <td>${list.length ? `<ul>${practices}</ul>` : '<em>No intervention selected yet</em>'}</td>
    </tr>`;
    });
    return `<h4 class="print-int-group">${escapeXml(factorGroupLabels(valence).heading)}</h4>
    <table class="print-int-table">
      <thead><tr><th>${valence === 'protective' ? 'Protective factor' : 'Risk factor'}</th><th>Intervention(s)</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;
  };
  return `<h3>My Interventions</h3>${VALENCE_ORDER.map(tableFor).join('')}`;
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

// Progress count shown beside the Phase 3 heading.
function updatePhase3Progress() {
  const c = plannerState.data.planner.phase3Checklist;
  const items = phase3ChecklistItems();
  const done = items.filter((_, i) => plannerState.phase3Checks[i]).length;
  const el = document.getElementById('plannerPhase3Progress');
  if (el) el.textContent = `${done} of ${items.length} ${c.progressLabel || 'complete'}`;
}

// Phase 3 checklist: click an item to check it off and track progress. The
// checked state is saved with the plan and shown in the PDF and email.
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
  const done = items.filter((_, i) => plannerState.phase3Checks[i]).length;
  return `<h3>${escapeXml(c.heading)} <span class="print-check-progress">(${done} of ${items.length} ${escapeXml(c.progressLabel || 'complete')})</span></h3><ul class="print-checklist">${items.map((it, i) => `
    <li>
      <span class="print-check-title">${plannerState.phase3Checks[i] ? '☑' : '☐'} ${escapeXml(it.text)}</span>
      ${it.detail ? `<span class="print-check-detail">${escapeXml(it.detail)}</span>` : ''}
      ${checklistLinks(it).length ? `<span class="print-check-link">${checklistLinks(it).map(l => `${escapeXml(l.text)} →`).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}</span>` : ''}
    </li>`).join('')}</ul>`;
}

// Opt-in "Email My Plan" — a plain-text mailto summary (factors and
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
    protective.forEach(f => lines.push(`  Protective: ${f.text}`));
    risk.forEach(f => lines.push(`  Risk: ${f.text}`));
  });

  const factors = selectedTopContributors();
  VALENCE_ORDER.forEach(valence => {
    const group = factors.filter(f => f.valence === valence);
    if (!group.length) return;
    lines.push('', `${factorGroupLabels(valence).heading}:`);
    group.forEach(f => {
      const list = plannerState.interventionsByFactor[f.id] || [];
      lines.push(`  ${f.text}: ${list.length ? list.join(', ') : 'no intervention selected yet'}`);
    });
  });

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
    VALENCE_ORDER.forEach(valence => {
      const factors = plannerState.factors[ring][valence];
      if (!factors.length) return;
      const rec = RING_RECOMMENDATIONS[ring][valence];
      notes.push({ ringLabel: ringLabelByKey[ring], valence, text: rec.planNote });
    });
  });
  // Notes follow the ecological levels in mapping order (community → client).

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
      <a class="btn btn-outline" href="consultation.html" target="_blank" rel="noopener">Consultation</a>
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
  plannerState.lastNotes = notes;
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

  const fmtFactors = list => list.map(f => f.text).join(', ');
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
    <p class="print-date">Therapist Toolkit Treatment Planning Tool</p>
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

// ── Sticky step bar: a soft shadow once it's pinned under the header ──
window.addEventListener('scroll', () => {
  const bar = document.querySelector('.planner-stepper-row');
  if (!bar) return;
  const pinned = bar.getBoundingClientRect().top <= document.getElementById('mainNav').offsetHeight + 1 && window.scrollY > 0;
  bar.classList.toggle('is-stuck', pinned && getComputedStyle(bar).position === 'sticky');
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

// The Treatment Roadmap used to be a section of this page (#roadmap); it now has its own tab.
if (window.location.hash === '#roadmap') window.location.replace('roadmap.html');

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
    const stepParam = new URLSearchParams(window.location.search).get('step');
    if (stepParam && STEP_KEYS.includes(stepParam)) {
      plannerState.currentStep = STEP_KEYS.indexOf(stepParam);
      plannerState.openedFromLink = true;
    }
    initPlanner();
    if (plannerState.openedFromLink) document.getElementById('plannerDisclaimer').scrollIntoView({ block: 'start' });
    initPhaseStripNav();
    initFadeObserver();
  });
