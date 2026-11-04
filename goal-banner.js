/* =============================================
   THERAPIST TOOLKIT — SHARED GOAL BANNER
   Fills every [data-goal-banner] element with the site-wide goal
   (reducing suicidal ideation) plus a page-specific context line,
   both edited in the CMS under "The Goal". Usage:
     <div class="goal-banner" data-goal-banner="planner"></div>
   ============================================= */
(function () {
  const slots = document.querySelectorAll('[data-goal-banner]');
  if (!slots.length) return;
  fetch('content/site.json')
    .then(res => res.json())
    .then(data => {
      const goal = data.goal;
      if (!goal) return;
      slots.forEach(el => {
        const context = (goal.contexts || {})[el.dataset.goalBanner] || '';
        el.innerHTML = `
          <span class="goal-banner-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
            </svg>
          </span>
          <div class="goal-banner-body">
            <span class="goal-banner-label">${goal.label}</span>
            <strong class="goal-banner-headline">${goal.headline}</strong>
            ${context ? `<p class="goal-banner-context">${context}</p>` : ''}
          </div>`;
        el.hidden = false;
      });
    })
    .catch(() => {});
})();
