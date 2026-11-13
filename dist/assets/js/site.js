/* Cako The Cake Shop: page behaviour. No dependencies. */
(function () {
  'use strict';

  var OPEN = 11 * 60;   // 11:00 am, Pune time
  var CLOSE = 24 * 60;  // 12:00 midnight
  var PHONE = '918446966779';
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------ Pune clock */
  var clockFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hourCycle: 'h23'
  });
  var dayFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  });

  function puneNow() {
    var parts = clockFmt.formatToParts(new Date());
    var h = 0, m = 0;
    parts.forEach(function (p) {
      if (p.type === 'hour') h = parseInt(p.value, 10) % 24;
      if (p.type === 'minute') m = parseInt(p.value, 10);
    });
    return { h: h, m: m, t: h * 60 + m };
  }

  function puneDate(offsetDays) {
    var d = new Date(Date.now() + (offsetDays || 0) * 864e5);
    return dayFmt.format(d); // YYYY-MM-DD in Pune
  }

  function span(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    if (h && m) return h + ' hr ' + m + ' min';
    if (h) return h + ' hr';
    return m <= 1 ? '1 min' : m + ' min';
  }

  function clock(h, m) {
    var ap = h < 12 ? 'am' : 'pm';
    var hh = h % 12 || 12;
    return hh + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
  }

  function fill(tpl, map) {
    return String(tpl || '').replace(/\{(\w+)\}/g, function (_, k) { return map[k] != null ? map[k] : ''; });
  }

  var hoursLines = Array.prototype.slice.call(document.querySelectorAll('[data-hours]'));
  var liveNodes = Array.prototype.slice.call(document.querySelectorAll('[data-live]'));

  function renderStatus() {
    var n = puneNow();
    var open = n.t >= OPEN && n.t < CLOSE;
    var left = CLOSE - n.t;
    var until = n.t < OPEN ? OPEN - n.t : CLOSE - n.t + OPEN;
    var map = { left: span(left), until: span(until), time: clock(n.h, n.m) };

    root.classList.toggle('is-closed', !open);
    root.classList.toggle('is-open', open);

    liveNodes.forEach(function (el) {
      var tpl = el.getAttribute(open ? 'data-open' : 'data-closed');
      if (tpl != null) el.innerHTML = fill(tpl, map);
      // a live line that only makes sense with the clock running stays hidden without script
      var holder = el.closest('.live');
      if (holder && holder.hidden) holder.hidden = false;
    });

    var p = open ? (n.t - OPEN) / (CLOSE - OPEN) : 0;
    hoursLines.forEach(function (line) {
      var labelEl = line.querySelector('[data-hours-label]');
      // the label slides along with the mark and never leaves the line (shifted by its own width)
      if (labelEl) labelEl.textContent = fill(line.getAttribute(open ? 'data-open' : 'data-closed'), map);
      line.style.setProperty('--p', p.toFixed(4));
      line.style.setProperty('--lp', p.toFixed(4));
      line.setAttribute('aria-label', fill(line.getAttribute('data-aria'), map) + ' ' + (labelEl ? labelEl.textContent : ''));
    });
  }

  // the one moment on load: the hours line draws from 11 am to now
  if (!reduceMotion) {
    hoursLines.forEach(function (line) { line.style.setProperty('--p', '0'); line.style.setProperty('--lp', '0'); });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        hoursLines.forEach(function (line) { line.classList.add('hours--animate'); });
        renderStatus();
      });
    });
  } else {
    renderStatus();
  }
  setInterval(renderStatus, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) renderStatus(); });

  /* ------------------------------------------------------------ header */
  var top = document.querySelector('.top');
  function onScroll() { if (top) top.classList.toggle('is-solid', window.scrollY > 24); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ------------------------------------------------------------ phone menu: a real modal while open */
  var menuBtn = document.querySelector('[data-menu-open]');
  var menu = document.getElementById('menu');
  var menuClose = document.querySelector('[data-menu-close]');
  function setInert(on) {
    // everything but the menu leaves the tab order and the accessibility tree while the menu is open
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el !== menu && el.tagName !== 'SCRIPT') el.inert = on;
    });
  }
  function setMenu(open, restoreFocus) {
    if (!menu || !menuBtn) return;
    menu.hidden = !open;
    setInert(open);
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) { (menuClose || menu).focus(); } else if (restoreFocus !== false) { menuBtn.focus(); }
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
    if (menuClose) menuClose.addEventListener('click', function () { setMenu(false); });
    menu.addEventListener('click', function (e) {
      // a link inside the menu closes it and lets the page jump to the link's section
      if (e.target.closest('a')) setMenu(false, false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });
    // a tablet rotated past the desktop breakpoint loses the close button, so close the menu then
    var wide = window.matchMedia('(min-width: 960px)');
    var closeIfWide = function (e) { if (e.matches && !menu.hidden) setMenu(false, false); };
    if (wide.addEventListener) wide.addEventListener('change', closeIfWide); else if (wide.addListener) wide.addListener(closeIfWide);
  }

  /* ------------------------------------------------------------ order slip */
  var form = document.getElementById('order-form');
  if (form) {
    var nameIn = form.querySelector('#slip-name');
    var occasionIn = form.querySelector('#slip-occasion');
    var cakeIn = form.querySelector('#slip-cake');
    var dateWrap = form.querySelector('.slip__date');
    var dateIn = form.querySelector('#slip-date');
    var send = document.querySelector('[data-send]');
    var pick = document.querySelector('.slip__pick');
    var cakeTop = document.querySelector('.cake-top');
    var titleEl = cakeTop && cakeTop.querySelector('title');
    var lineEl = cakeTop && cakeTop.querySelector('.pipe-line');
    var nameEl = cakeTop && cakeTop.querySelector('.pipe-name');
    var example = nameEl ? nameEl.getAttribute('data-example') : '';
    var NAME_MAX = 140; // the inner ganache disc's chord at the name's baseline, less the piping edge
    var shown = '';
    var engaged = false; // the example name shows only until the visitor starts filling in the slip
    var litTimer = 0;

    if (dateIn) {
      dateIn.min = puneDate(0);
      dateIn.max = puneDate(60);
    }

    function radioValue(name) {
      var r = form.querySelector('input[name="' + name + '"]:checked');
      return r ? r.value : '';
    }

    function niceDate(iso) {
      var parts = iso.split('-');
      if (parts.length !== 3) return iso;
      var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
      return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    function whenText() {
      var w = radioValue('when');
      if (w === 'date') return dateIn && dateIn.value ? niceDate(dateIn.value) : form.getAttribute('data-when-unset');
      var opt = form.querySelector('input[name="when"]:checked');
      return opt ? opt.getAttribute('data-say') : '';
    }

    // fit the piped name inside the disc by its measured width, not its letter count
    function fitName(base) {
      nameEl.style.fontSize = base + 'px';
      var w = 0;
      try { w = nameEl.getComputedTextLength(); } catch (err) { w = 0; }
      if (w > NAME_MAX) nameEl.style.fontSize = Math.max(11, base * NAME_MAX / w).toFixed(1) + 'px';
    }

    function pipeName(text, typing) {
      if (!nameEl) return;
      var isExample = !text;
      // before the visitor engages, the example shows how the writing looks; after, the cake shows the real order
      var value = isExample ? (engaged || (occasionIn && occasionIn.value === '') ? '' : example) : text;
      var len = value.length;
      var size = len > 16 ? 16 : len > 12 ? 19 : len > 9 ? 23 : len > 6 ? 27 : 30;
      var wasExample = nameEl.classList.contains('is-example');
      nameEl.classList.toggle('is-example', isExample);
      var grew = typing && !isExample && !reduceMotion &&
        value.length === shown.length + 1 && value.indexOf(shown) === 0;
      if (grew) {
        if (wasExample) nameEl.textContent = '';
        var t = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        t.textContent = value.slice(-1);
        t.setAttribute('class', 'new');
        nameEl.appendChild(t);
      } else {
        nameEl.textContent = value;
      }
      fitName(size);
      shown = isExample ? '' : value;
    }

    function describeCake() {
      if (!titleEl) return;
      var typed = (nameIn.value || '').trim();
      var words = [occasionIn ? occasionIn.value : '', typed || (nameEl ? nameEl.textContent : '')].filter(Boolean).join(', ');
      titleEl.textContent = 'Preview of the writing on the cake: ' + (words || 'no writing') +
        (!typed && nameEl && nameEl.textContent ? ' (example name)' : '');
    }

    function lightCandles() {
      if (!cakeTop || reduceMotion) return;
      cakeTop.classList.remove('is-lit');
      cakeTop.getBoundingClientRect(); // flush styles so the flicker restarts
      cakeTop.classList.add('is-lit');
      clearTimeout(litTimer);
      litTimer = setTimeout(function () { cakeTop.classList.remove('is-lit'); }, 3800);
    }

    function message() {
      var name = (nameIn.value || '').trim();
      var occ = occasionIn ? occasionIn.value : '';
      var onCake = [occ, name].filter(Boolean).join(' ');
      var map = {
        cake: cakeIn.value || '(flavour to choose)',
        size: radioValue('size'),
        when: whenText(),
        message: onCake || form.getAttribute('data-no-message')
      };
      return fill(form.getAttribute('data-template'), map).replace(/\\n/g, '\n');
    }

    function update(fromTyping) {
      if (lineEl && occasionIn) lineEl.textContent = occasionIn.value || ' ';
      pipeName((nameIn.value || '').trim(), fromTyping);
      describeCake();
      if (pick) { pick.textContent = cakeIn.value; pick.hidden = !cakeIn.value; }
      if (dateWrap) dateWrap.hidden = radioValue('when') !== 'date';
      if (send) send.href = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(message());
    }

    var cakeError = document.getElementById('slip-cake-error');
    var dateError = document.getElementById('slip-date-error');
    var sentNote = document.querySelector('[data-sent]');
    function showCakeError(on) {
      if (!cakeError) return;
      cakeError.hidden = !on;
      if (on) cakeIn.setAttribute('aria-invalid', 'true'); else cakeIn.removeAttribute('aria-invalid');
    }
    function showDateError(on) {
      if (!dateError || !dateIn) return;
      dateError.hidden = !on;
      if (on) dateIn.setAttribute('aria-invalid', 'true'); else dateIn.removeAttribute('aria-invalid');
    }
    if (send) {
      send.addEventListener('click', function (e) {
        update(false);
        if (!cakeIn.value) {
          e.preventDefault();
          showCakeError(true);
          cakeIn.focus();
          return;
        }
        // an empty date is fine ("a date I will confirm"); a typed date outside today to 60 days is not
        if (radioValue('when') === 'date' && dateIn && dateIn.value && !dateIn.validity.valid) {
          e.preventDefault();
          showDateError(true);
          dateIn.focus();
          return;
        }
        if (sentNote) sentNote.hidden = false;
      });
    }

    form.addEventListener('focusin', function (e) {
      if (!engaged) { engaged = true; update(false); }
      // the segmented options are visually hidden radios: keep their visible label clear of the phone bar
      if (e.target.matches && e.target.matches('.seg input')) {
        var l = form.querySelector('label[for="' + e.target.id + '"]');
        if (l) l.scrollIntoView({ block: 'nearest' });
      }
    });
    nameIn.addEventListener('input', function () { update(true); });
    nameIn.addEventListener('change', lightCandles);
    form.addEventListener('change', function (e) {
      if (e.target === cakeIn && cakeIn.value) showCakeError(false);
      if ((e.target === dateIn && dateIn.validity.valid) || (e.target.name === 'when' && e.target.value !== 'date')) showDateError(false);
      if (e.target !== nameIn) update(false);
      // reveal the date field in view without moving focus (a radio change must not change context)
      if (e.target.name === 'when' && e.target.value === 'date' && dateWrap) dateWrap.scrollIntoView({ block: 'nearest' });
    });
    // Enter in a field moves to the send button rather than opening WhatsApp mid-choice
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      update(false);
      if (send) send.focus();
    });
    update(false);
    // re-measure the piped name once the icing face has loaded
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { update(false); });

    // every cake on the counter has its own link that opens the slip with it chosen
    function chooseCake(slug, focus) {
      var opt = cakeIn.querySelector('option[data-slug="' + slug + '"]');
      if (!opt) return false;
      cakeIn.value = opt.value;
      showCakeError(false);
      update(false);
      lightCandles();
      if (focus) {
        var slip = document.getElementById('order');
        if (slip) slip.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        setTimeout(function () { nameIn.focus({ preventScroll: true }); }, reduceMotion ? 0 : 450);
      }
      return true;
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-order-cake]');
      if (!a) return;
      e.preventDefault();
      var slug = a.getAttribute('data-order-cake');
      if (chooseCake(slug, true) && history.replaceState) history.replaceState(null, '', '#order-' + slug);
    });
    function fromHash() {
      var m = /^#order-([a-z0-9-]+)$/.exec(location.hash);
      if (m) chooseCake(m[1], true);
    }
    window.addEventListener('hashchange', fromHash);
    fromHash();
  }

  /* ------------------------------------------------------------ the map: Google's frame loads near the visit
     section; the address-and-directions panel under it stays visible until it does, and offline for good */
  var mapBox = document.querySelector('.map');
  var mapFrame = mapBox && mapBox.querySelector('iframe');
  if (mapFrame) {
    if (navigator.onLine === false) {
      mapFrame.remove();
    } else {
      mapFrame.addEventListener('load', function () { mapBox.classList.add('is-loaded'); });
    }
  }
  /* ------------------------------------------------------------ gentle reveal on scroll */
  root.classList.add('js');
  var reveal = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveal.forEach(function (el) { io.observe(el); });
  } else { reveal.forEach(function (el) { el.classList.add('is-in'); }); }

  /* ------------------------------------------------------------ cake filter (cakes page) */
  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  var count = document.querySelector('[data-count]');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var cat = chip.getAttribute('data-filter'), n = 0;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      document.querySelectorAll('.grid > .cake').forEach(function (card) {
        var show = cat === 'all' || card.getAttribute('data-cat') === cat;
        card.hidden = !show; if (show) n++;
      });
      if (count) count.textContent = n + (n === 1 ? ' cake' : ' cakes');
    });
  });
})();
