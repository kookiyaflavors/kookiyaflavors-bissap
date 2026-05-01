/* Kookiya Flavors · Capsule Bissap
   app.js — navigation, sticky bar, progress, ancres, timer, toggle, accordéon
   Sans dépendance externe. GSAP/Lenis/Three.js arrivent dans animations.js et scene.js. */

(() => {
  'use strict';

  const root = document.documentElement;

  // ───── Sticky topbar + indicateur de progression + CTA flottant ─────
  const topbar = document.querySelector('.topbar');
  const progressBar = document.querySelector('.progress-bar');
  const ctaFloat = document.querySelector('[data-cta-float]');
  const lastSection = document.querySelector('#kookiya');

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (y / max) * 100 : 0;

      if (topbar) topbar.classList.toggle('is-visible', y > 80);
      if (progressBar) progressBar.style.width = pct + '%';

      if (ctaFloat && lastSection) {
        const lastTop = lastSection.getBoundingClientRect().top;
        const lastVisible = lastTop < window.innerHeight * 0.75;
        const shouldShow = y > window.innerHeight * 0.3 && !lastVisible;
        ctaFloat.classList.toggle('is-visible', shouldShow);
      }

      ticking = false;
    });
  };

  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ───── Menu d'ancres ─────
  const trigger = document.querySelector('.ancres-trigger');
  const panel = document.querySelector('.ancres-panel');
  const overlay = document.querySelector('.ancres-overlay');
  const closeBtn = document.querySelector('.ancres-panel__close');

  const setPanel = (open) => {
    if (!panel) return;
    panel.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    overlay?.classList.toggle('is-visible', open);
    trigger?.setAttribute('aria-expanded', open ? 'true' : 'false');
    root.classList.toggle('menu-open', open);
    if (open) {
      closeBtn?.focus();
    } else {
      trigger?.focus();
    }
  };

  trigger?.addEventListener('click', () => setPanel(!panel.classList.contains('is-open')));
  closeBtn?.addEventListener('click', () => setPanel(false));
  overlay?.addEventListener('click', () => setPanel(false));
  panel?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setPanel(false)));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel?.classList.contains('is-open')) setPanel(false);
  });

  // ───── Toggle Solo / Avec invités ─────
  document.querySelectorAll('.toggle').forEach(toggle => {
    const options = toggle.querySelectorAll('.toggle__option');
    const pill = toggle.querySelector('.toggle__pill');

    const movePill = (active) => {
      if (!pill || !active) return;
      pill.style.left = active.offsetLeft + 'px';
      pill.style.width = active.offsetWidth + 'px';
    };

    const initial = toggle.querySelector('.toggle__option.is-active') || options[0];
    requestAnimationFrame(() => movePill(initial));

    options.forEach(opt => {
      opt.addEventListener('click', () => {
        options.forEach(o => o.classList.remove('is-active'));
        opt.classList.add('is-active');
        movePill(opt);
        const mode = opt.dataset.mode;
        toggle.dispatchEvent(new CustomEvent('toggle:change', { detail: { mode } }));
      });
    });

    let resizeRaf;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        const active = toggle.querySelector('.toggle__option.is-active');
        movePill(active);
      });
    });
  });

  // ───── Accordéons ─────
  document.querySelectorAll('.accordion__item').forEach(item => {
    const trig = item.querySelector('.accordion__trigger');
    trig?.addEventListener('click', () => {
      const open = item.classList.toggle('is-open');
      trig.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  // ───── Timer interactif ─────
  document.querySelectorAll('.timer').forEach(timer => {
    const startBtn = timer.querySelector('.timer__start');
    const count = timer.querySelector('.timer__count');
    const ring = timer.querySelector('.timer__ring-progress');
    const duration = parseInt(timer.dataset.duration, 10) || 60;
    const r = 92;
    const circumference = 2 * Math.PI * r;

    if (ring) {
      ring.style.strokeDasharray = circumference;
      ring.style.strokeDashoffset = circumference;
    }
    if (count) count.textContent = duration;

    let rafId = null;

    const startTimer = () => {
      if (rafId) return;
      const startTime = performance.now();
      timer.classList.add('is-running');
      timer.classList.remove('is-finished');
      if (startBtn) startBtn.disabled = true;

      const tick = (now) => {
        const elapsed = (now - startTime) / 1000;
        const remaining = Math.max(0, duration - elapsed);
        const progress = Math.min(1, elapsed / duration);

        if (count) count.textContent = Math.ceil(remaining);
        if (ring) ring.style.strokeDashoffset = circumference * (1 - progress);

        if (remaining > 0) {
          rafId = requestAnimationFrame(tick);
        } else {
          rafId = null;
          timer.classList.remove('is-running');
          timer.classList.add('is-finished');
          if (count) count.textContent = '0';
          if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'Recommencer';
          }
        }
      };
      rafId = requestAnimationFrame(tick);
    };

    startBtn?.addEventListener('click', startTimer);
  });

  // ───── CTA Stripe — injection des URLs depuis data.js ─────
  const purchaseUrl = window.BISSAP && window.BISSAP.purchaseUrl;
  if (purchaseUrl) {
    document.querySelectorAll('.cta-float, .cta-inline').forEach(el => {
      el.href = purchaseUrl;
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
    });
  }

  // ───── Toggle Script content swap ─────
  const scriptContainer = document.querySelector('[data-script-content]');
  if (scriptContainer) {
    document.querySelectorAll('.toggle').forEach(toggle => {
      toggle.addEventListener('toggle:change', (e) => {
        const mode = e.detail.mode;
        scriptContainer.querySelectorAll('.script-mode').forEach(el => {
          el.hidden = el.dataset.mode !== mode;
        });
      });
    });
  }

  // ───── Checkboxes sessionStorage (courses + check-list) ─────
  const STORAGE_KEY = 'kookiya-bissap-checks';
  const loadChecks = () => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  };
  const saveChecks = (state) => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { /* sessionStorage indisponible */ }
  };
  const checkState = loadChecks();
  document.querySelectorAll('[data-checklist] input[type="checkbox"]').forEach(box => {
    const key = box.dataset.key;
    if (key && checkState[key]) box.checked = true;
    box.addEventListener('change', () => {
      const current = loadChecks();
      if (box.checked) current[key] = true;
      else delete current[key];
      saveChecks(current);
    });
  });

})();
