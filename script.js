'use strict';

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

function initYearStamp() {
  qsa('#year').forEach(el => { el.textContent = new Date().getFullYear(); });
}

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

function initNavbar() {
  const navbar = qs('#navbar');
  if (!navbar) return;

  const onScroll = throttle(() => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }, 80);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const currentFile = location.pathname.split('/').pop() || 'index.html';
  qsa('#navbar .navbar__nav a, #mobileMenu .mobile-menu__links a').forEach(link => {
    const linkFile = (link.getAttribute('href') || '').split('/').pop() || 'index.html';
    if (linkFile === currentFile) {
    
      if (link.closest('.navbar__nav')) {
        qsa('#navbar .navbar__nav a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
      
      if (link.closest('.mobile-menu__links')) {
        qsa('#mobileMenu .mobile-menu__links a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      }
    }
  });
}

function initGoTop() {
  const btn = qs('#goTop');
  if (!btn) return;
  const onScroll = throttle(() => btn.classList.toggle('visible', window.scrollY > 400), 100);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}


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
    document.body.classList.add('mobile-menu-open');
    
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = '100%';
    document.addEventListener('keydown', handleKey);
  };

  const closeMenu = () => {
    if (!isOpen) return;
    isOpen = false;
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('open');
    document.body.classList.remove('mobile-menu-open');
    
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo({ top: savedScrollY, behavior: 'instant' });
    document.removeEventListener('keydown', handleKey);
  };

  const handleKey = e => { if (e.key === 'Escape') closeMenu(); };

  
  const desktopMql = window.matchMedia('(min-width: 992px)');
  desktopMql.addEventListener('change', e => {
    if (e.matches && isOpen) {
      closeMenu();
    }
  });

  burger.addEventListener('click', () => isOpen ? closeMenu() : openMenu());
  qsa('#mobileMenu .mobile-menu__links a, #mobileMenu .mobile-menu__actions a').forEach(link => link.addEventListener('click', closeMenu));
  menu.addEventListener('click', e => { if (e.target === menu) closeMenu(); });

  window.openMobile  = openMenu;
  window.closeMobile = closeMenu;
}


function initScrollAnimations() {
  const elements = qsa('[data-animate], [data-stagger]');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;

      
      if (el.hasAttribute('data-stagger')) {
        el.classList.add('visible');
        
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


function initSmoothReveal() {
  qsa('.service-card, .svc-card, .value-card, .pricing-card, .blog-card, .team-card, .contact-card, .faq-card, .step-card, .mission__metric, .testimonial-card').forEach(el => {
    el.classList.add('hover-glow');
  });
  qsa('.service-card, .blog-card, .blog-card__thumb').forEach(el => {
    el.classList.add('img-zoom');
  });
}


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
    p.life = Math.floor(Math.random() * p.maxLife);
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

  
  new IntersectionObserver(entries => {
    animRunning = entries[0].isIntersecting;
    if (animRunning) loop();
  }, { threshold: 0 }).observe(heroEl);
}


function initTypingEffect() {
  
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
        
        setTimeout(() => {
          target.style.borderRight = 'none';
          target.style.animation   = 'none';
        }, 1000);
      }
    };

    
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setTimeout(type, 500);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(target);
  });
}


function initNewsletterForms() {
  qsa('.newsletter__btn, .footer__newsletter-btn').forEach(btn => {
    const form = btn.closest('.newsletter__form, .footer__newsletter-form, .footer__newsletter-column');
    if (!form) return;

    const input = qs('input', form);
    
    
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          btn.click();
        }
      });
    }

    btn.addEventListener('click', () => {
      const emailVal = input ? input.value.trim() : '';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    
      if (input) input.style.borderColor = '';
      const existingError = form.querySelector('.newsletter-error');
      if (existingError) {
        existingError.remove();
      }

      if (!emailVal || !emailRegex.test(emailVal)) {
        
        if (input) {
          input.style.borderColor = '#ef4444'; 
          
          
          input.addEventListener('input', () => {
            input.style.borderColor = '';
            const err = form.querySelector('.newsletter-error');
            if (err) err.remove();
          }, { once: true });
        }
        
        const errorEl = document.createElement('div');
        errorEl.className = 'newsletter-error';
        errorEl.style.color = '#ef4444';
        errorEl.style.fontSize = '0.78rem';
        errorEl.style.marginTop = '6px';
        errorEl.style.textAlign = 'left';
        errorEl.style.fontWeight = '500';
        errorEl.textContent = 'Please enter a valid email address.';
        
        form.appendChild(errorEl);
      } else {
        
        window.location.href = '404.html';
      }
    });
  });
}


function initContactForm() {
  const form = qs('.contact-frm');
  if (!form) return;

  const firstNameInput = qs('#contact-first', form);
  const lastNameInput = qs('#contact-last', form);
  const emailInput = qs('#contact-email', form);
  const messageInput = qs('#contact-message', form);

  function showError(input, message) {
    clearError(input);
    input.classList.add('invalid');
    const errorEl = document.createElement('span');
    errorEl.className = 'contact-frm__error';
    errorEl.textContent = message;
    input.parentNode.appendChild(errorEl);
  }

  function clearError(input) {
    input.classList.remove('invalid');
    const parent = input.parentNode;
    const existingError = parent.querySelector('.contact-frm__error');
    if (existingError) {
      existingError.remove();
    }
  }

  function validateField(input) {
    clearError(input);
    const val = input.value.trim();

    if (input === firstNameInput || input === lastNameInput) {
      if (!val) {
        showError(input, 'This field is required.');
        return false;
      }
      
      const nameRegex = /^[A-Za-z\s]+$/;
      if (!nameRegex.test(val)) {
        showError(input, 'Name contains only alphabets');
        return false;
      }
    }

    if (input === emailInput) {
      if (!val) {
        showError(input, 'Email is required.');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        showError(input, 'Please enter a valid email address.');
        return false;
      }
    }

    if (input === messageInput) {
      if (!val) {
        showError(input, 'Message is required.');
        return false;
      }
    }

    return true;
  }

  
  if (firstNameInput) firstNameInput.addEventListener('input', () => validateField(firstNameInput));
  if (lastNameInput) lastNameInput.addEventListener('input', () => validateField(lastNameInput));
  if (emailInput) emailInput.addEventListener('input', () => validateField(emailInput));
  if (messageInput) messageInput.addEventListener('input', () => validateField(messageInput));

  form.addEventListener('submit', e => {
    e.preventDefault();

    let isValid = true;
    if (firstNameInput && !validateField(firstNameInput)) isValid = false;
    if (lastNameInput && !validateField(lastNameInput)) isValid = false;
    if (emailInput && !validateField(emailInput)) isValid = false;
    if (messageInput && !validateField(messageInput)) isValid = false;

    if (!isValid) return;

    
    window.location.href = '404.html';
  });
}


function initImageFallbacks() {
  qsa('img').forEach(img => {
    img.addEventListener('error', () => {
      img.style.background = 'linear-gradient(135deg, #1F2029, #1F6EFA22)';
      img.style.minHeight  = '80px';
      img.alt = img.alt || '';
    });
  });
}

function applyReducedMotionDefaults() {
  qsa('[data-animate], [data-stagger]').forEach(el => el.classList.add('visible'));
  qsa('[data-stagger] > *').forEach(el => el.classList.add('visible'));
}

function initLoader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  const percentEl = document.getElementById('preloaderPercent');
  const fillEl = document.getElementById('preloaderFill');
  const statusEl = preloader.querySelector('.charge-status');
  const logoEl = document.getElementById('preloaderLogo');
  const boltEl = preloader.querySelector('.bolt-icon');
  
  if (!percentEl || !fillEl || !statusEl) {
    preloader.classList.add('fade-out');
    setTimeout(() => preloader.style.display = 'none', 400);
    return;
  }

  let count = 0;
  const duration = 1600; 
  const intervalTime = 16;
  const step = 100 / (duration / intervalTime);
  
  const statusPhrases = [
    "Connecting Charger...",
    "Authenticating Vehicle...",
    "Analyzing Battery Health...",
    "Charging EV Stack...",
    "Ready to Go!"
  ];

  
  if (logoEl) logoEl.style.opacity = '1';
  if (boltEl) boltEl.style.opacity = '0';

  const timer = setInterval(() => {
    count += step;
    if (count >= 100) {
      count = 100;
      clearInterval(timer);
      percentEl.textContent = "100%";
      fillEl.style.width = "100%";
      statusEl.textContent = "Ready to Go!";
      if (logoEl) logoEl.style.opacity = '0';
      if (boltEl) boltEl.style.opacity = '1';
      
      setTimeout(() => {
        preloader.classList.add('fade-out');
        setTimeout(() => {
          preloader.style.display = 'none';
        }, 400);
      }, 250);
    } else {
      const rounded = Math.floor(count);
      percentEl.textContent = `${rounded}%`;
      fillEl.style.width = `${rounded}%`;
      

      const logoOpacity = Math.max(0, 1 - count / 50);
      const boltOpacity = Math.max(0, Math.min(1, (count - 35) / 45));
      
      if (logoEl) logoEl.style.opacity = logoOpacity;
      if (boltEl) boltEl.style.opacity = boltOpacity;
      
      if (rounded < 20) {
        statusEl.textContent = statusPhrases[0];
      } else if (rounded < 45) {
        statusEl.textContent = statusPhrases[1];
      } else if (rounded < 70) {
        statusEl.textContent = statusPhrases[2];
      } else {
        statusEl.textContent = statusPhrases[3];
      }
    }
  }, intervalTime);
}

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
  initLoader();

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
