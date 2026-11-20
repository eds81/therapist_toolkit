/* =============================================
   THERAPIST TOOLKIT — ILLUSTRATED CHARACTERS
   The (original) therapist and client drawn as inline SVG, used by the
   Treatment Planning Tool's Start Here tour and the Treatment Roadmap's
   phase cards. Looping SMIL animation; pages pause it for people who prefer
   reduced motion. Purely decorative.
   ============================================= */
// ── Colors and the therapist ──
const ORIENT_SKIN = '#E9B994', ORIENT_HAIR = '#5B3A29', ORIENT_TEAL = '#0091A8', ORIENT_TEAL_DARK = '#006E82';
const ORIENT_GREEN = '#5E9A56', ORIENT_GREEN_LIGHT = '#CFE6CB', ORIENT_RED = '#D0675B', ORIENT_RED_LIGHT = '#F6D3CE';
// The therapist, standing at (x, y = feet). armTo: where the hand reaches.
function orientTherapist(x, y, armTo, armMove) {
  const [ax, ay] = armTo;
  const sleeve = ORIENT_TEAL_DARK;
  return `
  <g transform="translate(${x} ${y})">
    <ellipse cx="0" cy="0" rx="28" ry="4.5" fill="#00000012"/>
    <g>
      <animateTransform attributeName="transform" type="translate" values="0 0; 0 -1.6; 0 0" keyTimes="0; .5; 1" calcMode="spline" keySplines=".45 0 .55 1; .45 0 .55 1" dur="3.2s" repeatCount="indefinite"/>
      <rect x="-11" y="-42" width="9" height="42" rx="4.5" fill="#3E4B57"/>
      <rect x="2" y="-42" width="9" height="42" rx="4.5" fill="#3E4B57"/>
      <path d="M-22 -36 C-23 -62 -20 -80 0 -82 C20 -80 23 -62 22 -36 Q0 -31 -22 -36 Z" fill="${ORIENT_TEAL}"/>
      <path d="M-7 -82 L0 -73 L7 -82 Z" fill="#FFFFFF"/>
      <g transform="translate(0 5)">
      <!-- back of the hair, then the neck on top of it (so it runs from under the chin to the collar), then the face -->
      <path d="M-17 -104 C-19 -124 -10 -129 0 -129 C10 -129 19 -124 17 -104 L17 -92 C10 -88 -10 -88 -17 -92 Z" fill="${ORIENT_HAIR}"/>
      <rect x="-5" y="-97" width="10" height="14" rx="3.5" fill="${ORIENT_SKIN}"/>
      <circle cx="0" cy="-106" r="15" fill="${ORIENT_SKIN}"/>
      <path d="M-15.5 -106 C-15 -120 -6 -123 3 -122 C11 -121 15.5 -115 15.5 -108 C10 -114 2 -116 -6 -113 C-10 -111 -13 -109 -15.5 -106 Z" fill="${ORIENT_HAIR}"/>
      <circle cx="-5.5" cy="-104" r="1.7" fill="#2B2B2B"/><circle cx="5.5" cy="-104" r="1.7" fill="#2B2B2B"/>
      <circle cx="-9" cy="-99" r="2.4" fill="#F0A48C" opacity=".45"/><circle cx="9" cy="-99" r="2.4" fill="#F0A48C" opacity=".45"/>
      <path d="M-4 -98 Q0 -94.5 4 -98" stroke="#2B2B2B" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      </g>
      <path d="M-17 -72 Q-23 -58 -21 -44" stroke="${sleeve}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <circle cx="-21" cy="-42" r="4.5" fill="${ORIENT_SKIN}"/>
      <g transform="translate(16 -72)">
        <g>
          ${armMove ? `<animateTransform attributeName="transform" type="rotate" values="${armMove}" keyTimes="0; .5; 1" calcMode="spline" keySplines=".45 0 .55 1; .45 0 .55 1" dur="2.8s" repeatCount="indefinite"/>` : ''}
          <path d="M0 0 Q${(ax * 0.55).toFixed(1)} ${(ay * 0.2).toFixed(1)} ${ax} ${ay}" stroke="${sleeve}" stroke-width="8" fill="none" stroke-linecap="round"/>
          <circle cx="${ax}" cy="${ay}" r="5" fill="${ORIENT_SKIN}"/>
        </g>
      </g>
    </g>
  </g>`;
}

// The client — a teen, standing beside the therapist and contributing: a
// speech bubble pops up (heart, star, idea, or a check) on each loop, and
// they nod along. Original character, like the therapist.
const ORIENT_CLIENT_SKIN = '#B9784C', ORIENT_CLIENT_HAIR = '#2E211B', ORIENT_HOODIE = '#E07B39';
const ORIENT_BUBBLE_ICONS = {
  talk: `<circle cx="-6" cy="0" r="2.2" fill="#9A9384"/><circle cx="0" cy="0" r="2.2" fill="#9A9384"/><circle cx="6" cy="0" r="2.2" fill="#9A9384"/>`,
  star: `<polygon points="0,-8 2.4,-2.6 8,-2.5 3.6,1.2 5.2,7 0,3.6 -5.2,7 -3.6,1.2 -8,-2.5 -2.4,-2.6" fill="#F5C842" stroke="#B7950B" stroke-width=".8"/>`,
  idea: `<circle cx="0" cy="-2" r="5.5" fill="#F5C842"/><rect x="-2.6" y="3" width="5.2" height="3.6" rx="1" fill="#9A9384"/>`,
  check: `<path d="M-5 0 L-1.5 3.5 L5.5 -4" stroke="#5E9A56" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
};
function orientClient(x, y, bubble, popAt) {
  const a = popAt === undefined ? 0.12 : popAt;
  const hold = Math.max(a + 0.14, 0.8);
  const bubbleTimes = [0, a, a + 0.08, a + 0.12, hold, Math.min(hold + 0.06, 0.98), 1].map(t => +t.toFixed(2)).join('; ');
  const skin = ORIENT_CLIENT_SKIN, hair = ORIENT_CLIENT_HAIR, hoodie = ORIENT_HOODIE, hoodieDark = '#C4652B';
  return `
  <g transform="translate(${x} ${y})">
    <ellipse cx="0" cy="0" rx="22" ry="4" fill="#00000012"/>
    <g>
      <animateTransform attributeName="transform" type="translate" values="0 0; 0 -1.2; 0 0" keyTimes="0; .5; 1" calcMode="spline" keySplines=".45 0 .55 1; .45 0 .55 1" dur="3s" repeatCount="indefinite"/>
      <rect x="-9" y="-34" width="8" height="34" rx="4" fill="#3D5A80"/>
      <rect x="1" y="-34" width="8" height="34" rx="4" fill="#3D5A80"/>
      <path d="M-17 -60 C-20 -67 -12 -72 0 -72 C12 -72 20 -67 17 -60 Z" fill="${hoodieDark}"/>
      <path d="M-18 -30 C-19 -50 -16 -66 0 -68 C16 -66 19 -50 18 -30 Q0 -26 -18 -30 Z" fill="${hoodie}"/>
      <path d="M-15 -60 Q-20 -48 -10 -38" stroke="${hoodieDark}" stroke-width="6.5" fill="none" stroke-linecap="round"/>
      <path d="M15 -60 Q20 -48 10 -38" stroke="${hoodieDark}" stroke-width="6.5" fill="none" stroke-linecap="round"/>
      <rect x="-11" y="-42" width="22" height="10" rx="4" fill="${hoodieDark}"/>
      <path d="M-3 -66 v8 M3 -66 v8" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round"/>
      <rect x="-4" y="-73" width="8" height="8" rx="3" fill="${skin}"/>
      <ellipse cx="0" cy="-84" rx="14" ry="12.5" fill="${hair}"/>
      <circle cx="0" cy="-79" r="12" fill="${skin}"/>
      <path d="M-12.5 -82 C-12 -91 -5 -94 0 -94 C6 -94 12.5 -91 12.5 -82 C9 -86 4 -87.5 0 -87.5 C-4 -87.5 -9 -86 -12.5 -82 Z" fill="${hair}"/>
      <circle cx="-4.5" cy="-78" r="1.5" fill="#2B2B2B"/><circle cx="4.5" cy="-78" r="1.5" fill="#2B2B2B"/>
      <circle cx="-8" cy="-73.5" r="2.1" fill="#E58F73" opacity=".35"/><circle cx="8" cy="-73.5" r="2.1" fill="#E58F73" opacity=".35"/>
      <path d="M-3.5 -73 Q0 -70.2 3.5 -73" stroke="#2B2B2B" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <g transform="translate(18 -104)">
        <g>
          <animateTransform attributeName="transform" type="scale" values="0; 0; 1.08; 1; 1; 0; 0" keyTimes="${bubbleTimes}" calcMode="spline" keySplines="0 0 1 1; .45 0 .55 1; .45 0 .55 1; 0 0 1 1; .45 0 .55 1; 0 0 1 1" dur="6s" repeatCount="indefinite"/>
          <path d="M-15 -12 h30 a6 6 0 0 1 6 6 v12 a6 6 0 0 1 -6 6 h-18 l-8 7 l1 -7 h-5 a6 6 0 0 1 -6 -6 v-12 a6 6 0 0 1 6 -6 Z" fill="#FFFFFF" stroke="#D9D1BF" stroke-width="1.5"/>
          ${ORIENT_BUBBLE_ICONS[bubble] || ''}
        </g>
      </g>
    </g>
  </g>`;
}


// Ease every looping animation in and out (one spline per segment), so the
// illustrations move smoothly instead of at a constant, mechanical speed.
function orientEase(svg) {
  return svg.replace(/<(animate|animateTransform)\b([^>]*?)(\/?)>/g, (m, tag, attrs, close) => {
    if (/calcMode=/.test(attrs)) return m;
    const values = (attrs.match(/values="([^"]*)"/) || [])[1];
    if (!values) return m;
    const n = values.split(';').length - 1;
    if (n < 1) return m;
    let extra = '';
    if (!/keyTimes=/.test(attrs)) extra += ` keyTimes="${Array.from({ length: n + 1 }, (_, i) => +(i / n).toFixed(3)).join('; ')}"`;
    extra += ` calcMode="spline" keySplines="${Array(n).fill('.45 0 .55 1').join('; ')}"`;
    return `<${tag}${attrs}${extra}${close}>`;
  });
}
