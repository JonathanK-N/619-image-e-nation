'use strict';

/* ================================================================
   IMAGE-E-NATION By 6i9 — main.js
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initCursor();
  initNavbar();
  initHeroParallax();
  initScrollReveal();
  initPortfolioFilter();
  initLightbox();
  initCounters();
  initTestimonials();
  initContactForm();
});

/* ─── Loader ─────────────────────────────────────────────────── */
function initLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;

  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('done');
      // Trigger hero after loader fades
      setTimeout(triggerHeroAnimations, 200);
    }, 1800);
  });

  // Fallback: remove loader after 3.5s regardless
  setTimeout(() => {
    if (!loader.classList.contains('done')) {
      loader.classList.add('done');
      setTimeout(triggerHeroAnimations, 200);
    }
  }, 3500);
}

function triggerHeroAnimations() {
  document.querySelectorAll('.animate-hero').forEach(el => {
    const delay = parseInt(el.dataset.delay || '0', 10);
    setTimeout(() => el.classList.add('in'), delay);
  });
}

/* ─── Custom Cursor ──────────────────────────────────────────── */
function initCursor() {
  // Only on hover-capable devices
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const dot = document.getElementById('cursor');
  const ring = document.getElementById('cursor-follower');
  if (!dot || !ring) return;

  let mx = -100, my = -100;
  let rx = -100, ry = -100;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  (function lerp() {
    rx += (mx - rx) * 0.11;
    ry += (my - ry) * 0.11;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(lerp);
  })();

  // Hover state
  const targets = document.querySelectorAll('a, button, .port-item, .svc-card, .filter-btn, .testi-btn, .social-btn');
  targets.forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('c-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('c-hover'));
  });
}

/* ─── Navbar ─────────────────────────────────────────────────── */
function initNavbar() {
  const nav    = document.getElementById('navbar');
  const toggle = document.getElementById('nav-toggle');
  const links  = document.getElementById('nav-links');
  if (!nav) return;

  // Sticky state
  const onScroll = () => nav.classList.toggle('pinned', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = toggle.classList.toggle('open');
      links.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });

    links.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('open');
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (links.classList.contains('open') && !nav.contains(e.target)) {
        toggle.classList.remove('open');
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }
}

/* ─── Hero Parallax ──────────────────────────────────────────── */
function initHeroParallax() {
  const heroBg = document.getElementById('hero-bg');
  if (!heroBg) return;
  const img = heroBg.querySelector('img');
  if (!img) return;

  // Reduce motion check
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const sy = window.scrollY;
        const heroH = heroBg.parentElement.offsetHeight;
        if (sy < heroH * 1.2) {
          img.style.transform = `translateY(${sy * 0.28}px)`;
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ─── Scroll Reveal (IntersectionObserver) ───────────────────── */
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el    = entry.target;
      const delay = parseInt(el.dataset.delay || '0', 10);
      setTimeout(() => el.classList.add('in'), delay);
      obs.unobserve(el);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

  elements.forEach(el => obs.observe(el));
}

/* ─── Portfolio Filter ───────────────────────────────────────── */
function initPortfolioFilter() {
  const btns  = document.querySelectorAll('.filter-btn');
  const items = document.querySelectorAll('.port-item');
  if (!btns.length) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const f = btn.dataset.filter;
      items.forEach(item => {
        const match = f === 'all' || item.dataset.cat === f;
        item.classList.toggle('hidden', !match);
      });
    });
  });
}

/* ─── Lightbox ───────────────────────────────────────────────── */
function initLightbox() {
  const lb      = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lb-img');
  const lbCat   = document.getElementById('lb-cat');
  const lbTitle = document.getElementById('lb-title');
  const lbClose = document.getElementById('lb-close');
  const lbOver  = document.getElementById('lb-overlay');
  if (!lb) return;

  function open(item) {
    const img   = item.querySelector('img');
    const cat   = item.querySelector('.port-cat');
    const title = item.querySelector('h3');
    lbImg.src         = img?.src ?? '';
    lbImg.alt         = img?.alt ?? '';
    lbCat.textContent   = cat?.textContent ?? '';
    lbTitle.textContent = title?.textContent ?? '';
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }

  function close() {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { lbImg.src = ''; }, 500);
  }

  document.querySelectorAll('.port-zoom').forEach(btn => {
    btn.addEventListener('click', () => open(btn.closest('.port-item')));
  });

  lbClose?.addEventListener('click', close);
  lbOver?.addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lb.classList.contains('open')) close();
  });
}

/* ─── Counter Animation ──────────────────────────────────────── */
function initCounters() {
  const counters = document.querySelectorAll('.stat-num[data-target]');
  if (!counters.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      countUp(entry.target);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => obs.observe(c));

  function countUp(el) {
    const target   = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const fps      = 60;
    const steps    = Math.round((duration / 1000) * fps);
    let   step     = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      // Ease-out quad
      const val = Math.round(target * (1 - Math.pow(1 - progress, 2)));
      el.textContent = val.toLocaleString('fr-CA');
      if (step >= steps) {
        el.textContent = target.toLocaleString('fr-CA');
        clearInterval(timer);
      }
    }, 1000 / fps);
  }
}

/* ─── Testimonials Slider ────────────────────────────────────── */
function initTestimonials() {
  const track      = document.getElementById('testi-track');
  const prevBtn    = document.getElementById('testi-prev');
  const nextBtn    = document.getElementById('testi-next');
  const dotsWrap   = document.getElementById('testi-dots');
  if (!track) return;

  const cards  = track.querySelectorAll('.testi-card');
  let current  = 0;
  let autoplay;

  // Build dots
  cards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className   = 'testi-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Témoignage ${i + 1}`);
    dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    dot.addEventListener('click', () => goTo(i));
    dotsWrap?.appendChild(dot);
  });

  function goTo(idx) {
    current = ((idx % cards.length) + cards.length) % cards.length;
    track.style.transform = `translateX(-${current * 100}%)`;

    document.querySelectorAll('.testi-dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
      d.setAttribute('aria-selected', String(i === current));
    });
    resetAutoplay();
  }

  function resetAutoplay() {
    clearInterval(autoplay);
    autoplay = setInterval(() => goTo(current + 1), 5200);
  }

  prevBtn?.addEventListener('click', () => goTo(current - 1));
  nextBtn?.addEventListener('click', () => goTo(current + 1));

  // Swipe / drag support
  let startX = 0;
  let isDrag = false;

  track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const dx = startX - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 48) goTo(current + (dx > 0 ? 1 : -1));
  });

  // Mouse drag
  track.addEventListener('mousedown', e => { startX = e.clientX; isDrag = true; });
  document.addEventListener('mouseup', e => {
    if (!isDrag) return;
    const dx = startX - e.clientX;
    if (Math.abs(dx) > 48) goTo(current + (dx > 0 ? 1 : -1));
    isDrag = false;
  });

  resetAutoplay();
}

/* ─── Contact Form ───────────────────────────────────────────── */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const btn      = form.querySelector('button[type="submit"]');
    const textEl   = btn?.querySelector('.btn-text');
    if (!btn || !textEl) return;

    const orig = textEl.textContent;
    btn.disabled = true;
    textEl.textContent = 'Envoi en cours…';

    // Simulate async send
    setTimeout(() => {
      textEl.textContent = '✓ Message Envoyé';
      btn.style.background = 'var(--c-black-card)';
      btn.style.borderColor = 'var(--c-silver-low)';

      setTimeout(() => {
        btn.disabled = false;
        textEl.textContent = orig;
        btn.style.background = '';
        btn.style.borderColor = '';
        form.reset();
      }, 3200);
    }, 1500);
  });

  // Inline validation on blur
  form.querySelectorAll('[required]').forEach(field => {
    field.addEventListener('blur', () => {
      const empty = !field.value.trim();
      field.style.borderColor = empty ? '#c0392b' : '';
    });
    field.addEventListener('input', () => {
      field.style.borderColor = '';
    });
  });
}
