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
  initDynamicContent();
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

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const btn    = form.querySelector('button[type="submit"]');
    const textEl = btn?.querySelector('.btn-text');
    if (!btn || !textEl) return;

    const orig = textEl.textContent;
    btn.disabled = true;
    textEl.textContent = 'Envoi en cours…';

    const data = {
      name: form.querySelector('[name="name"]').value,
      email: form.querySelector('[name="email"]').value,
      phone: form.querySelector('[name="phone"]').value,
      event_type: form.querySelector('[name="event_type"]').value,
      message: form.querySelector('[name="message"]').value
    };

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      // Réinitialise le bouton et affiche l'animation de confirmation
      btn.disabled = false;
      textEl.textContent = orig;
      form.reset();
      showBookingSuccess();
    } catch {
      textEl.textContent = '✗ Erreur';
      setTimeout(() => { btn.disabled = false; textEl.textContent = orig; }, 2000);
    }
  });

  form.querySelectorAll('[required]').forEach(field => {
    field.addEventListener('blur', () => {
      field.style.borderColor = !field.value.trim() ? '#c0392b' : '';
    });
    field.addEventListener('input', () => { field.style.borderColor = ''; });
  });

  // Overlay de confirmation
  const overlay = document.getElementById('booking-success');
  const closeBtn = document.getElementById('bs-close');
  window.showBookingSuccess = () => {
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  const hide = () => {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  };
  closeBtn?.addEventListener('click', hide);
  overlay?.querySelector('.bs-backdrop')?.addEventListener('click', hide);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay?.classList.contains('open')) hide();
  });
}

/* ─── Load Dynamic Content ───────────────────────────────────── */
const esc = (s = '') => String(s).replace(/[&<>"']/g, m => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
));

const SVC_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';

function initDynamicContent() {
  fetch('/api/content').then(r => r.json()).then(c => {
    // Hero
    const heroImg = document.querySelector('.hero-bg img');
    if (heroImg && c.hero?.image) heroImg.src = c.hero.image;
    const heroEyebrow = document.querySelector('.hero-eyebrow');
    if (heroEyebrow && c.hero?.eyebrow) heroEyebrow.textContent = c.hero.eyebrow;
    const heroDesc = document.querySelector('.hero-desc');
    if (heroDesc && c.hero?.description) heroDesc.innerHTML = c.hero.description;

    // About
    const aboutMain = document.querySelector('.about-img-main img');
    if (aboutMain && c.about?.imageMain) aboutMain.src = c.about.imageMain;
    const aboutSecond = document.querySelector('.about-img-second img');
    if (aboutSecond && c.about?.imageSecond) aboutSecond.src = c.about.imageSecond;
    const kpiNum = document.querySelector('.kpi-num');
    if (kpiNum && c.about?.kpiNum) kpiNum.textContent = c.about.kpiNum;
    const kpiLabel = document.querySelector('.kpi-label');
    if (kpiLabel && c.about?.kpiLabel) kpiLabel.textContent = c.about.kpiLabel;

    // Contact
    const cPhone = document.querySelector('[data-contact="phone"]');
    if (cPhone && c.contact?.phone) cPhone.textContent = c.contact.phone;
    const cEmail = document.querySelector('[data-contact="email"]');
    if (cEmail && c.contact?.email) cEmail.textContent = c.contact.email;
    const cLoc = document.querySelector('[data-contact="location"]');
    if (cLoc && c.contact?.location) cLoc.textContent = c.contact.location;

    // Services
    const svcGrid = document.getElementById('services-grid');
    if (svcGrid && Array.isArray(c.services) && c.services.length) {
      svcGrid.innerHTML = c.services.map((s, i) => `
        <div class="svc-card reveal-up" data-delay="${i * 80}">
          <div class="svc-num">${esc(s.num)}</div>
          <div class="svc-icon">${SVC_ICON}</div>
          <h3 class="svc-title">${esc(s.title)}</h3>
          <p class="svc-desc">${esc(s.desc)}</p>
          <div class="svc-bg"><img src="${esc(s.image)}" alt="" loading="lazy" aria-hidden="true"></div>
        </div>`).join('');
    }

    // Stats
    const statsGrid = document.getElementById('stats-grid');
    if (statsGrid && Array.isArray(c.stats) && c.stats.length) {
      statsGrid.innerHTML = c.stats.map((s, i) => `
        <div class="stat-item reveal-up" data-delay="${i * 100}">
          <div class="stat-wrap">
            <span class="stat-num" data-target="${parseInt(s.num, 10) || 0}">0</span><span class="stat-suf">${esc(s.suffix)}</span>
          </div>
          <div class="stat-lbl">${esc(s.label)}</div>
        </div>`).join('');
      initCounters();
    }

    // Pricing
    if (c.pricing) {
      const pEye = document.getElementById('pricing-eyebrow');
      if (pEye && c.pricing.eyebrow) pEye.textContent = c.pricing.eyebrow;
      const pTitle = document.getElementById('pricing-title');
      if (pTitle && c.pricing.title) pTitle.innerHTML = c.pricing.title;
      const pNote = document.getElementById('pricing-note');
      if (pNote) pNote.textContent = c.pricing.note || '';
      const pGrid = document.getElementById('pricing-grid');
      if (pGrid && Array.isArray(c.pricing.categories) && c.pricing.categories.length) {
        pGrid.innerHTML = c.pricing.categories.map((cat, i) => `
          <div class="price-card${cat.feature ? ' price-card--feature' : ''} reveal-up" data-delay="${i * 80}">
            <h3 class="price-cat">${esc(cat.title)}</h3>
            <ul class="price-list">
              ${(cat.items || []).map(it => `
                <li><span class="price-label">${esc(it.label)}</span><span class="price-value">${esc(it.price)}</span></li>`).join('')}
            </ul>
          </div>`).join('');
      }
    }

    // Portfolio
    const portGrid = document.getElementById('portfolio-grid');
    if (portGrid && Array.isArray(c.portfolio) && c.portfolio.length) {
      portGrid.innerHTML = c.portfolio.map(p => `
        <div class="port-item${p.size ? ' port-item--' + esc(p.size) : ''}" data-cat="${esc(p.cat)}">
          <img src="${esc(p.image)}" alt="${esc(p.catLabel)} — ${esc(p.title)}" loading="lazy">
          <div class="port-overlay">
            <div class="port-meta"><span class="port-cat">${esc(p.catLabel)}</span><h3>${esc(p.title)}</h3></div>
            <button class="port-zoom" aria-label="Agrandir ${esc(p.title)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>`).join('');
      initPortfolioFilter();
      initLightbox();
    }

    // Re-reveal freshly injected content
    initScrollReveal();
  }).catch(() => {});

  // Load approved reviews
  fetch('/api/reviews').then(r => r.json()).then(reviews => {
    if (!reviews.length) return;
    const track = document.getElementById('testi-track');
    if (!track) return;
    track.innerHTML = reviews.map(r => `
      <div class="testi-card" role="listitem">
        <div class="testi-stars" aria-label="${r.rating} étoiles">${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}</div>
        <blockquote class="testi-quote">"${r.message}"</blockquote>
        <div class="testi-author">
          <div class="testi-avatar" aria-hidden="true">${r.name.split(' ').map(w => w[0]).join('.').toUpperCase()}</div>
          <div>
            <div class="testi-name">${r.name}</div>
            <div class="testi-role">${r.role || 'Client'}</div>
          </div>
        </div>
      </div>
    `).join('');
    // Re-init testimonials slider
    initTestimonials();
  }).catch(() => {});
}
