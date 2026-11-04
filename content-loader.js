/* =============================================
   THERAPIST TOOLKIT — SITE CONTENT LOADER
   The site's text is split into one file per page so each page has its own
   entry in the CMS (Decap ties each CMS entry to exactly one file). This
   loads every part and combines them into the single content object the
   page scripts have always used, so their data.* references are unchanged.
   ============================================= */
const SITE_CONTENT_FILES = [
  'site',                 // site-wide: goal banner + footer
  'home',                 // hero + toolkit FAQ
  'about',                // about, why, toolkit/roadmap, research, team
  'planner',              // Planning Tool
  'safety-plan',          // Make A Safety Plan
  'community-resources',  // Community Resources
  'schools',              // Navigating Schools
  'self-care'             // Self-Care & Support
];

function loadSiteContent() {
  return Promise.all(SITE_CONTENT_FILES.map(name =>
    fetch(`content/${name}.json`).then(res => {
      if (!res.ok) throw new Error(`Could not load content/${name}.json (${res.status})`);
      return res.json();
    })
  )).then(parts => Object.assign({}, ...parts));
}
