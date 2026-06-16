/* =============================================
   THERAPIST TOOLKIT — INTERACTIONS
   ============================================= */

// ── Ecosystem diagram ────────────────────────
(function initEcosystem() {
  const svg     = document.getElementById('ecoSvg');
  const rings   = document.querySelectorAll('.eco-ring');
  const items   = document.querySelectorAll('.eco-legend-item');
  if (!svg) return;

  function activate(layer) {
    svg.classList.add('has-active');
    rings.forEach(r => r.classList.toggle('eco-active', r.dataset.layer === layer));
    items.forEach(i => i.classList.toggle('eco-active', i.dataset.layer === layer));
  }

  function deactivate() {
    svg.classList.remove('has-active');
    rings.forEach(r => r.classList.remove('eco-active'));
    items.forEach(i => i.classList.remove('eco-active'));
  }

  // Ring hover + click
  rings.forEach(ring => {
    ring.setAttribute('tabindex', '0');
    ring.setAttribute('role', 'button');
    ring.addEventListener('mouseenter', () => activate(ring.dataset.layer));
    ring.addEventListener('mouseleave', deactivate);
    ring.addEventListener('focus',      () => activate(ring.dataset.layer));
    ring.addEventListener('blur',       deactivate);
    ring.addEventListener('click',      () => {
      const already = ring.classList.contains('eco-active') && svg.classList.contains('has-active');
      already ? deactivate() : activate(ring.dataset.layer);
    });
  });

  // Legend item hover + click
  items.forEach(item => {
    item.addEventListener('mouseenter', () => activate(item.dataset.layer));
    item.addEventListener('mouseleave', deactivate);
    item.addEventListener('click', () => {
      const already = item.classList.contains('eco-active');
      already ? deactivate() : activate(item.dataset.layer);
    });
  });
})();

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

// ── Active nav link on scroll ────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav-links a[href^="#"]');

const navObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
    });
  });
}, { threshold: 0.4 });

sections.forEach(s => navObserver.observe(s));

// ── Scroll fade-in animations ────────────────
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

// ── Stat counters ────────────────────────────
function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1200;
  const start = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    // ease out
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const statObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    if (el.dataset.count) animateCount(el);
    statObserver.unobserve(el);
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-num[data-count]').forEach(el => statObserver.observe(el));

// ── Tab switching with fade ──────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    if (btn.classList.contains('active')) return;

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(p => {
      p.classList.remove('active', 'tab-entering');
      p.style.display = 'none';
    });

    const next = document.getElementById('tab-' + target);
    next.style.display = 'block';
    // force reflow then animate in
    next.getBoundingClientRect();
    next.classList.add('active');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => next.classList.add('tab-entering'));
    });
  });
});

// set initial active panel visible
const firstPanel = document.querySelector('.tab-panel.active');
if (firstPanel) {
  firstPanel.classList.add('tab-entering');
}

// ── Expandable roadmap phases ────────────────
document.querySelectorAll('.phase-expand-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const content  = btn.nextElementSibling;

    btn.setAttribute('aria-expanded', String(!expanded));
    if (expanded) {
      content.hidden = true;
    } else {
      content.hidden = false;
    }
  });
});

// ── Quote carousel ───────────────────────────
(function initCarousel() {
  const track   = document.querySelector('.carousel-track');
  const slides  = document.querySelectorAll('.carousel-slide');
  const dotsEl  = document.getElementById('carouselDots');
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');

  if (!track || !slides.length) return;

  let current = 0;
  let timer;
  const total = slides.length;

  // Build dots
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Quote ' + (i + 1));
    dot.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(dot);
  });

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsEl.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === current));
    resetTimer();
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  // Keyboard support
  document.querySelector('.carousel').addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 6000);
  }

  // Pause on hover
  const carouselEl = document.querySelector('.carousel');
  carouselEl.addEventListener('mouseenter', () => clearInterval(timer));
  carouselEl.addEventListener('mouseleave', resetTimer);

  resetTimer();
})();
