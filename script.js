'use strict';

/* =========================================
   UTILITY HELPERS
   ========================================= */
const qs  = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];

function throttle(fn, limit) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= limit) { last = now; fn.apply(this, args); }
  };
}

const clamp       = (v, min, max) => Math.min(Math.max(v, min), max);
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeOutExpo  = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =========================================
   YEAR STAMP
   ========================================= */
function initYearStamp() {
  qsa('#year').forEach(el => { el.textContent = new Date().getFullYear(); });
}

/* =========================================
   SCROLL PROGRESS BAR
   ========================================= */
function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.prepend(bar);
  const update = throttle(() => {
    const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100;
    bar.style.width = clamp(pct, 0, 100) + '%';
  }, 16);
  window.addEventListener('scroll', update, { passive: true });
}

/* =========================================
   NAVBAR
   ========================================= */
function initNavbar() {
  const navbar = qs('#navbar');
  if (!navbar) return;

  const onScroll = throttle(() => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, 80);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const currentFile = location.pathname.split('/').pop() || 'index.html';
  qsa('#navbar .navbar__nav a').forEach(link => {
    const linkFile = (link.getAttribute('href') || '').split('/').pop() || 'index.html';
    if (linkFile === currentFile) {
      qsa('#navbar .navbar__nav a').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    }
  });
}

/* =========================================
   GO-TOP BUTTON
   ========================================= */
function initGoTop() {
  const btn = qs('#goTop');
  if (!btn) return;
  const onScroll = throttle(() => btn.classList.toggle('visible', window.scrollY > 400), 100);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* =========================================
   MOBILE MENU
   ========================================= */
function initMobileMenu() {
  const burger = qs('#burgerBtn');
  const menu   = qs('#mobileMenu');
  if (!burger || !menu) return;

  let isOpen = false;
  let savedScrollY = 0;

  const openMenu = () => {
    if (isOpen) return;
    isOpen = true;
    savedScrollY = window.scrollY;
    burger.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    menu.classList.add('open');
    document.body.style.cssText += ';overflow:hidden;position:fixed;top:-' + savedScrollY + 'px;width:100%;';
    document.addEventListener('keydown', handleKey);
  };

  const closeMenu = () => {
    if (!isOpen) return;
    isOpen = false;
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('open');
    document.body.style.cssText = document.body.style.cssText.replace(/overflow[^;]*;?/g, '').replace(/position[^;]*;?/g, '').replace(/top[^;]*;?/g, '').replace(/width[^;]*;?/g, '');
    window.scrollTo({ top: savedScrollY, behavior: 'instant' });
    burger.focus();
    document.removeEventListener('keydown', handleKey);
  };

  const handleKey = e => { if (e.key === 'Escape') closeMenu(); };

  burger.addEventListener('click', () => isOpen ? closeMenu() : openMenu());
  qsa('#mobileMenu .mobile-menu__links a').forEach(link => link.addEventListener('click', closeMenu));
  menu.addEventListener('click', e => { if (e.target === menu) closeMenu(); });

  window.openMobile  = openMenu;
  window.closeMobile = closeMenu;
}

/* =========================================
   INTERSECTION OBSERVER – SCROLL ANIMATIONS
   ========================================= */
function initScrollAnimations() {
  const elements = qsa('[data-animate], [data-stagger]');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;

      // Add staggered delay for stagger parents
      if (el.hasAttribute('data-stagger')) {
        el.classList.add('visible');
        // Add extra sequential delay beyond CSS nth-child
        qsa('[data-animate]', el).forEach((child, i) => {
          child.style.transitionDelay = (i * 0.08) + 's';
          child.classList.add('visible');
        });
      } else {
        el.classList.add('visible');
      }
      obs.unobserve(el);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  elements.forEach(el => observer.observe(el));
}

/* =========================================
   STAT COUNTER ANIMATION
   ========================================= */
function initStatCounters() {
  const statEls = qsa('.stat-item__num, .mission__metric-num, .dark-stat-item .number');
  if (!statEls.length) return;

  function parseStatText(text) {
    const cleaned = text.trim();
    const match   = cleaned.match(/^([\d,]+\.?\d*)(.*)$/);
    if (!match) return null;
    return { value: parseFloat(match[1].replace(/,/g, '')), suffix: match[2] || '' };
  }

  function formatNumber(num, original) {
    if (original.includes('.')) {
      const dp = (original.split('.')[1] || '').replace(/\D/g, '').length;
      return num.toFixed(dp);
    }
    return Math.round(num).toLocaleString();
  }

  function animateCounter(el) {
    const parsed = parseStatText(el.textContent);
    if (!parsed) return;
    const { value: target, suffix } = parsed;
    const originalText = el.textContent.trim();
    const startTime = performance.now();
    const DURATION  = 1600;

    const tick = now => {
      const progress = clamp((now - startTime) / DURATION, 0, 1);
      const current  = easeOutExpo(progress) * target;
      el.textContent = formatNumber(current, originalText) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = originalText;
    };
    requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  statEls.forEach(el => observer.observe(el));
}

/* =========================================
   PARALLAX ON SECTIONS WITH BG IMAGES
   ========================================= */
function initParallax() {
  const parallaxEls = qsa('.testimonials, .cta-banner, .about-cta');
  if (!parallaxEls.length) return;

  const onScroll = throttle(() => {
    const scrollY = window.scrollY;
    parallaxEls.forEach(el => {
      const rect   = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const vpH    = window.innerHeight;
      const offset = (center - vpH / 2) / vpH;
      el.style.backgroundPositionY = (50 + offset * 12) + '%';
    });
  }, 16);

  window.addEventListener('scroll', onScroll, { passive: true });
}

/* =========================================
   TILT EFFECT ON CARDS
   ========================================= */
function initTiltCards() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const cards = qsa('.svc-card, .value-card, .pricing-card, .blog-card, .team-card, .faq-card, .contact-card, .step-card, .testimonial-card, .mission__metric');
  cards.forEach(card => {
    card.addEventListener('mousemove', throttle(e => {
      const rect = card.getBoundingClientRect();
      const x    = (e.clientX - rect.left) / rect.width  - 0.5;
      const y    = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${y * -5}deg) rotateY(${x * 5}deg) translateY(-6px) scale(1.015)`;
    }, 16));
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

/* =========================================
   BUTTON RIPPLE EFFECT
   ========================================= */
function initButtonRipple() {
  const style = document.createElement('style');
  style.textContent = `
    .btn-ripple {
      position: absolute; border-radius: 50%; transform: scale(0);
      animation: stackly-ripple 550ms cubic-bezier(0.4,0,0.2,1) forwards;
      pointer-events: none; background: rgba(255,255,255,0.22);
    }
    @keyframes stackly-ripple { to { transform: scale(4); opacity: 0; } }
  `;
  document.head.appendChild(style);

  qsa('.btn-primary, .btn-outline, .btn-light').forEach(btn => {
    btn.addEventListener('pointerdown', e => {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px;`;
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    });
  });
}

/* =========================================
   HOVER GLOW + IMG ZOOM (applied to cards)
   ========================================= */
function initSmoothReveal() {
  qsa('.service-card, .svc-card, .value-card, .pricing-card, .blog-card, .team-card, .contact-card, .faq-card, .step-card, .mission__metric, .testimonial-card').forEach(el => {
    el.classList.add('hover-glow');
  });
  qsa('.service-card, .blog-card, .blog-card__thumb').forEach(el => {
    el.classList.add('img-zoom');
  });
}

/* =========================================
   ELECTRIC PARTICLE DOTS (subtle hero decoration)
   ========================================= */
function initHeroParticles() {
  const heroEl = qs('.hero, .svc-hero, .page-hero, .blog-hero, .contact-hero');
  if (!heroEl || prefersReducedMotion()) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:0;opacity:0.4;';
  heroEl.style.position = 'relative';
  heroEl.prepend(canvas);

  const ctx = canvas.getContext('2d');
  const particles = [];
  const PARTICLE_COUNT = 55;

  function resize() {
    canvas.width  = heroEl.offsetWidth;
    canvas.height = heroEl.offsetHeight;
  }
  resize();
  window.addEventListener('resize', throttle(resize, 200));

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x  = Math.random() * canvas.width;
      this.y  = Math.random() * canvas.height;
      this.r  = Math.random() * 2 + 0.5;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = -Math.random() * 0.6 - 0.2;
      this.alpha = Math.random() * 0.5 + 0.2;
      this.life  = 0;
      this.maxLife = Math.random() * 200 + 80;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life++;
      if (this.life > this.maxLife || this.y < -10) this.reset();
    }
    draw() {
      const progress = this.life / this.maxLife;
      const fade = progress < 0.1 ? progress * 10 : progress > 0.8 ? (1 - progress) * 5 : 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(31,110,250,${this.alpha * fade})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = new Particle();
    p.life = Math.floor(Math.random() * p.maxLife); // stagger start
    particles.push(p);
  }

  let animRunning = true;
  const loop = () => {
    if (!animRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  };
  loop();

  // Stop animation when hero leaves viewport
  new IntersectionObserver(entries => {
    animRunning = entries[0].isIntersecting;
    if (animRunning) loop();
  }, { threshold: 0 }).observe(heroEl);
}

/* =========================================
   TYPING EFFECT FOR HERO HEADING
   ========================================= */
function initTypingEffect() {
  // Only for sub-page heroes (not home hero per requirements)
  const targets = qsa('.svc-hero__title em, .blog-hero__title em, .contact-hero__title em, .page-hero__title em');
  if (!targets.length || prefersReducedMotion()) return;

  targets.forEach(target => {
    const text = target.textContent;
    target.textContent = '';
    target.style.borderRight = '2px solid var(--c-primary)';
    target.style.animation = 'blink 0.75s step-end infinite';

    let i = 0;
    const speed = 55;
    const type = () => {
      if (i < text.length) {
        target.textContent += text[i++];
        setTimeout(type, speed);
      } else {
        // Remove cursor after done
        setTimeout(() => {
          target.style.borderRight = 'none';
          target.style.animation   = 'none';
        }, 1000);
      }
    };

    // Wait until element is visible
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setTimeout(type, 500);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(target);
  });
}

/* =========================================
   NEWSLETTER FORM INTERACTION
   ========================================= */
function initNewsletterForms() {
  qsa('.newsletter__btn, .footer__newsletter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const form   = btn.closest('.newsletter__form, .footer__newsletter-form');
      const input  = form && qs('input', form);
      if (input && input.value.trim()) {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '✓ Subscribed!';
        btn.style.background = '#16a34a';
        input.value = '';
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.style.background = '';
        }, 3000);
      }
    });
  });
}

/* =========================================
   CONTACT FORM SUBMIT
   ========================================= */
function initContactForm() {
  const form = qs('.contact-frm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = qs('.contact-frm__submit', form);
    if (!btn) return;
    const original = btn.innerHTML;
    btn.innerHTML = '✓ Message Sent!';
    btn.style.background = '#16a34a';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.background = '';
      btn.disabled = false;
      form.reset();
    }, 3500);
  });
}

/* =========================================
   IMAGE ERROR FALLBACK
   ========================================= */
function initImageFallbacks() {
  qsa('img').forEach(img => {
    img.addEventListener('error', () => {
      img.style.background = 'linear-gradient(135deg, #1F2029, #1F6EFA22)';
      img.style.minHeight  = '80px';
      img.alt = img.alt || '';
    });
  });
}

/* =========================================
   APPLY REDUCED MOTION DEFAULTS
   ========================================= */
function applyReducedMotionDefaults() {
  qsa('[data-animate], [data-stagger]').forEach(el => el.classList.add('visible'));
  qsa('[data-stagger] > *').forEach(el => el.classList.add('visible'));
}

/* =========================================
   INIT
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
  initYearStamp();
  initNavbar();
  initGoTop();
  initMobileMenu();
  initScrollProgress();
  initNewsletterForms();
  initContactForm();
  initImageFallbacks();
  initButtonRipple();

  if (prefersReducedMotion()) {
    applyReducedMotionDefaults();
  } else {
    initScrollAnimations();
    initStatCounters();
    initParallax();
    initTiltCards();
    initSmoothReveal();
    initHeroParticles();
    initTypingEffect();
  }

  console.info('[Stackly] v3.0 initialised');
});
