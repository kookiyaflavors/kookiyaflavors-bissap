/* Kookiya Flavors · Capsule Bissap
   animations.js — Lenis smooth scroll + GSAP ScrollTrigger reveals + pinned territoires.
   Charge après lenis.min.js, gsap.min.js, ScrollTrigger.min.js. */

(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mouvement réduit : pas de Lenis, pas de scroll-driven, GSAP duration 0.
  if (reduceMotion) {
    if (window.gsap) gsap.defaults({ duration: 0 });
    return;
  }

  if (!window.gsap || !window.ScrollTrigger || !window.Lenis) {
    console.warn('[Kookiya Bissap] GSAP / ScrollTrigger / Lenis manquant — animations désactivées.');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ─── Lenis smooth scroll inertiel ──────────────────────
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    smoothWheel: true,
    smoothTouch: false
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  document.documentElement.classList.add('lenis');
  window.__kookiya_lenis = lenis;

  // ─── Reveals · sections fade-up au scroll ──────────────
  const sections = document.querySelectorAll('main > section:not(.hero)');
  sections.forEach((sec) => {
    gsap.fromTo(sec,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sec,
          start: 'top 82%',
          once: true
        }
      }
    );
  });

  // ─── Stagger reveals · grilles, listes, cartes ─────────
  const staggerContainers = document.querySelectorAll('.card-grid, .sens-grid, .palette-grid, .contient, .accordion, .creations__track');
  staggerContainers.forEach((grid) => {
    const items = Array.from(grid.children);
    if (!items.length) return;
    gsap.fromTo(items,
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.85,
        ease: 'power2.out',
        stagger: 0.07,
        scrollTrigger: {
          trigger: grid,
          start: 'top 88%',
          once: true
        }
      }
    );
  });

  // ─── Hero · parallax + scroll-out caméra qui s'éloigne ─
  const hero = document.querySelector('.hero');
  if (hero) {
    const lede = hero.querySelector('.lede');
    const canvas = hero.querySelector('.hero__canvas');
    const fallback = hero.querySelector('.hero__canvas-fallback');
    const scrollIndicator = hero.querySelector('.hero__scroll-indicator');

    if (lede) {
      gsap.to(lede, {
        y: () => window.innerHeight * 0.25,
        opacity: 0.3,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5
        }
      });
    }

    if (canvas) {
      gsap.to(canvas, {
        opacity: 0.3,
        scale: 1.05,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5
        }
      });
    }

    if (fallback) {
      gsap.to(fallback, {
        opacity: 0.5,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5
        }
      });
    }

    if (scrollIndicator) {
      gsap.to(scrollIndicator, {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: '20% top',
          scrub: true
        }
      });
    }
  }

  // ─── Cursor custom desktop · mix-blend-mode difference, lerp 0.15 ──
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const cursor = document.createElement('div');
    cursor.className = 'cursor-custom';
    document.body.appendChild(cursor);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;
    let firstMove = false;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!firstMove) {
        firstMove = true;
        cursorX = mouseX;
        cursorY = mouseY;
        cursor.classList.add('is-ready');
      }
    });

    gsap.ticker.add(() => {
      cursorX += (mouseX - cursorX) * 0.15;
      cursorY += (mouseY - cursorY) * 0.15;
      cursor.style.transform = `translate(${cursorX}px, ${cursorY}px) translate(-50%, -50%)`;
    });

    const hoverables = 'a, button, .toggle__option, .accordion__trigger, .timer__start, [data-cta-stripe]';
    document.querySelectorAll(hoverables).forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });

    document.querySelectorAll('.hero__canvas').forEach(c => {
      c.addEventListener('mouseenter', () => cursor.classList.add('is-grab'));
      c.addEventListener('mouseleave', () => cursor.classList.remove('is-grab'));
    });
  }

  // ─── Pinned horizontal · Section 02 territoires ────────
  const territoires = document.querySelector('.territoires');
  const territoiresPin = document.querySelector('[data-territoires-pin]');
  const territoiresTrack = document.querySelector('[data-territoires-track]');

  if (territoires && territoiresPin && territoiresTrack && window.matchMedia('(min-width: 900px)').matches) {
    territoires.classList.add('is-pinned');

    const getMaxX = () => {
      const trackWidth = territoiresTrack.scrollWidth;
      const viewWidth = territoiresPin.clientWidth || window.innerWidth;
      return Math.max(0, trackWidth - viewWidth);
    };

    gsap.to(territoiresTrack, {
      x: () => -getMaxX(),
      ease: 'none',
      scrollTrigger: {
        trigger: territoiresPin,
        start: 'top top',
        end: () => `+=${getMaxX() + window.innerHeight * 0.5}`,
        pin: true,
        pinSpacing: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1
      }
    });

    let resizeRaf;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
  }

})();
