/* Cako motion layer: GSAP + ScrollTrigger + Lenis. Everything here is decoration; the page works without it. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var loader = document.querySelector('.loader');
  var hasGsap = window.gsap && window.ScrollTrigger;

  function done() { if (loader) loader.remove(); root.classList.remove('intro'); root.classList.add('is-ready'); }
  if (reduce || !hasGsap) {
    done();
    root.classList.add('no-motion');
    initRing(false);
    return;
  }
  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);
  root.classList.add('has-motion');

  /* ---------------------------------------------------------------- smooth scroll */
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', window.ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (a && a.getAttribute('href').length > 1 && document.querySelector(a.getAttribute('href'))) {
        e.preventDefault(); lenis.scrollTo(a.getAttribute('href'), { offset: -80 });
      }
    });
  }

  /* ---------------------------------------------------------------- split text helpers */
  // screen readers read one hidden copy of the sentence, not the animated pieces
  function srText(el, t) { var v = document.createElement('span'); v.className = 'visually-hidden'; v.textContent = t; el.appendChild(v); }
  function splitChars(el) {
    var text = el.textContent.trim(); el.textContent = ''; srText(el, text);
    // chars live inside a no-wrap word, so a line only ever breaks between words
    text.split(/\s+/).forEach(function (word, i) {
      if (i) el.appendChild(document.createTextNode(' '));
      var w = document.createElement('span'); w.className = 'wch'; w.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (ch) { var s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; w.appendChild(s); });
      el.appendChild(w);
    });
    return el.querySelectorAll('.ch');
  }
  function splitWords(el) {
    var t = el.textContent.trim(), words = t.split(/\s+/); el.textContent = ''; srText(el, t);
    words.forEach(function (w, i) {
      var o = document.createElement('span'); o.className = 'wd'; o.setAttribute('aria-hidden', 'true');
      var inner = document.createElement('span'); inner.textContent = w; o.appendChild(inner); el.appendChild(o);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return el.querySelectorAll('.wd > span');
  }

  /* ---------------------------------------------------------------- intro: once per visit */
  var heroChars = [];
  document.querySelectorAll('[data-split]').forEach(function (el) { heroChars.push.apply(heroChars, splitChars(el)); });
  gsap.set(heroChars, { yPercent: 110 });
  gsap.set('[data-fade]', { autoAlpha: 0, y: 24 });

  function intro() {
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(heroChars, { yPercent: 0, duration: 1.1, stagger: 0.03 })
      .to('[data-fade]', { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, '-=0.8')
      .fromTo('.xhero__frame', { '--ct': '100%' }, { '--ct': '0%', duration: 1.3 }, 0.1)
      .from('.xhero__frame img', { scale: 1.35, duration: 1.6 }, 0.1)
      .from('.xhero__ghost', { yPercent: 30, autoAlpha: 0, duration: 1.6 }, 0);
  }
  var seen = false;
  try { seen = sessionStorage.getItem('cako-intro') === '1'; sessionStorage.setItem('cako-intro', '1'); } catch (e) {}
  if (loader && !seen) {
    var count = loader.querySelector('.loader__count'), n = { v: 0 };
    gsap.timeline({ onComplete: function () { done(); intro(); } })
      .from(loader.querySelector('img'), { scale: 0.4, rotate: -40, autoAlpha: 0, duration: 0.8, ease: 'back.out(1.6)' })
      .to(n, { v: 100, duration: 1.1, ease: 'power2.inOut', onUpdate: function () { count.textContent = Math.round(n.v); } }, 0.1)
      .to(loader, { '--lc': '100%', duration: 0.9, ease: 'expo.inOut' });
  } else { done(); intro(); }

  /* ---------------------------------------------------------------- hero: the window opens as you scroll */
  var frame = document.querySelector('.xhero__frame');
  if (frame && window.matchMedia('(min-width: 960px)').matches) {
    gsap.timeline({ scrollTrigger: { trigger: '.xhero', start: 'top top', end: '+=90%', scrub: 0.6, pin: true } })
      .to(frame, { '--cr': '0px', '--cb': '0px', width: '100vw', right: 0, top: 0, bottom: 0, ease: 'none' }, 0)
      .to('.xhero__copy', { yPercent: -30, autoAlpha: 0, ease: 'none' }, 0)
      .to('.xhero__ghost', { yPercent: -40, ease: 'none' }, 0)
      .to('.xhero__hours', { autoAlpha: 0, ease: 'none' }, 0)
      .to('.spin-badge', { scale: 1.4, x: 40, ease: 'none' }, 0);
  }
  var glow = document.querySelector('.xhero__glow');
  if (glow && fine) {
    window.addEventListener('pointermove', function (e) {
      glow.style.setProperty('--gx', e.clientX + 'px'); glow.style.setProperty('--gy', e.clientY + 'px');
    }, { passive: true });
  }

  /* ---------------------------------------------------------------- headings rise word by word */
  document.querySelectorAll('[data-split-words]').forEach(function (el) {
    var w = splitWords(el);
    gsap.from(w, { yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  gsap.utils.toArray('.section [data-fade], .ring-sec [data-fade]').forEach(function (el) {
    gsap.to(el, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });

  /* ---------------------------------------------------------------- images unmask from below */
  gsap.utils.toArray('[data-clip]').forEach(function (el) {
    gsap.fromTo(el, { '--clip': '100%' }, { '--clip': '0%', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 80%' } });
    var im = el.querySelector('img'); if (im) gsap.from(im, { scale: 1.3, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 80%' } });
  });
  gsap.utils.toArray('.grid .cake, .rail .cake').forEach(function (el) {
    gsap.from(el, { y: 50, autoAlpha: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
  });

  /* ---------------------------------------------------------------- the sentence lights up word by word */
  document.querySelectorAll('[data-words]').forEach(function (el) {
    var w = splitWords(el);
    gsap.fromTo(w, { opacity: 0.14 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 75%', end: 'bottom 45%', scrub: true } });
  });

  /* ---------------------------------------------------------------- featured cakes slide sideways (desktop) */
  var track = document.querySelector('[data-hscroll]');
  if (track) {
    gsap.matchMedia().add('(min-width: 960px)', function () {
      var dist = function () { return track.scrollWidth - window.innerWidth + 64; };
      gsap.to(track, { x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: '.hscroll', start: 'top top', end: function () { return '+=' + dist(); }, pin: '.hscroll__pin', scrub: 0.8, invalidateOnRefresh: true } });
    });
  }

  /* ---------------------------------------------------------------- parallax */
  gsap.utils.toArray('[data-speed]').forEach(function (el) {
    var s = parseFloat(el.getAttribute('data-speed'));
    gsap.to(el, { yPercent: s * -100, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.to('.marquee__track', { xPercent: -8, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------------------------------------------------------------- tilt tiles */
  if (fine) {
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      var rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
      var ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 12); rx(-((e.clientY - r.top) / r.height - 0.5) * 12);
      });
      el.addEventListener('pointerleave', function () { rx(0); ry(0); });
    });

    /* magnetic buttons */
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      var x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }), y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointermove', function (e) { var r = el.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.3); y((e.clientY - r.top - r.height / 2) * 0.4); });
      el.addEventListener('pointerleave', function () { x(0); y(0); });
    });

    /* cursor: a dot that grows into a label over cakes */
    var cur = document.querySelector('.cursor');
    if (cur) {
      root.classList.add('has-cursor');
      var cx = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' }), cy = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
      var label = cur.querySelector('.cursor__label');
      window.addEventListener('pointermove', function (e) { cx(e.clientX); cy(e.clientY); }, { passive: true });
      document.addEventListener('pointerover', function (e) {
        var t = e.target.closest('[data-cursor], a, button, input, select, label');
        cur.classList.toggle('is-link', !!t);
        var c = t && t.closest('[data-cursor]');
        cur.classList.toggle('is-label', !!c); label.textContent = c ? c.getAttribute('data-cursor') : '';
      });
      document.addEventListener('pointerleave', function () { cur.classList.remove('is-link', 'is-label'); });
    }
  }

  initRing(true);
  window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });

  /* ---------------------------------------------------------------- 3D cake ring: drag to spin, eases back to a slow turn */
  function initRing(animate) {
    var ring = document.querySelector('[data-ring]');
    if (!ring) return;
    var stage = ring.querySelector('.ring__stage');
    var items = Array.prototype.slice.call(ring.querySelectorAll('.ring__item'));
    var n = items.length, step = 360 / n;
    function layout() {
      var w = items[0].offsetWidth || 200;
      var radius = Math.round(w / 2 / Math.tan(Math.PI / n)) + 40;
      items.forEach(function (it, i) { it.style.transform = 'rotateY(' + (i * step) + 'deg) translateZ(' + radius + 'px)'; });
    }
    if (!animate) return; // without motion the ring stays a plain swipeable row (CSS default)
    ring.classList.add('is-3d');
    layout(); window.addEventListener('resize', layout);
    var angle = 0, vel = -0.08, dragging = false, lastX = 0, moved = 0;
    window.gsap.ticker.add(function () {
      if (!dragging) { vel += (-0.08 - vel) * 0.02; angle += vel; }
      stage.style.transform = 'rotateX(-6deg) rotateY(' + angle + 'deg)';
    });
    ring.addEventListener('pointerdown', function (e) { dragging = true; moved = 0; lastX = e.clientX; ring.setPointerCapture(e.pointerId); ring.classList.add('is-drag'); });
    ring.addEventListener('pointermove', function (e) {
      if (!dragging) return; var dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx); vel = dx * 0.25; angle += vel;
    });
    function up() { dragging = false; ring.classList.remove('is-drag'); }
    ring.addEventListener('pointerup', up); ring.addEventListener('pointercancel', up);
    // a drag is not a click on the cake underneath
    ring.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
  }
})();
