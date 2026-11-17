/* =============================================
   THERAPIST TOOLKIT — NAV LABELS
   The tab names in the header (and phone menu) come from the CMS
   (Site-wide → Navigation, saved in content/site.json → nav), so they can be
   renamed without touching the HTML. Each page's HTML already has the same
   wording built in, which shows until this loads (or if it can't).
   ============================================= */
(function () {
  fetch('content/site.json', { cache: 'no-cache' })
    .then(res => res.json())
    .then(data => {
      const nav = data.nav;
      if (!nav) return;
      const setText = (el, text) => {
        const span = el && el.querySelector('span');
        if (span && text) span.textContent = text;
      };
      (nav.tools || []).forEach(t => {
        if (!t.page || !t.label) return;
        document.querySelectorAll(`.nav-tools a[href="${t.page}"], #navMobile a[href="${t.page}"]`)
          .forEach(a => setText(a, t.label));
      });
      document.querySelectorAll('.nav-about, .nav-mobile-about').forEach(a => setText(a, nav.aboutLabel));
      const heading = document.querySelector('.nav-mobile-label');
      if (heading && nav.toolsHeading) heading.textContent = nav.toolsHeading;
    })
    .catch(() => {});
})();
