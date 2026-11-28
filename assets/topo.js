/* topo.js — vanille, sans dépendance. Fonctionne sans JS : les tracés sont statiques. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var norm = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  $$('.js-only, [data-chips]').forEach(function (el) { el.hidden = false; });

  /* ---------- menu de navigation : fermé par un clic ailleurs, Échap ou le choix d'un lien ---------- */
  var navMenu = $('[data-nav-menu]');
  if (navMenu) {
    document.addEventListener('click', function (e) { if (navMenu.open && !navMenu.contains(e.target)) navMenu.open = false; });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navMenu.open) { navMenu.open = false; navMenu.querySelector('summary').focus(); }
    });
    navMenu.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) navMenu.open = false; });
  }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- page secteur : voie <-> tracé ---------- */
  var routes = $$('.route');
  if (routes.length) {
    var wraps = $$('.photo-wrap');
    var pinned = null;

    // les photos sont relues à chaque fois : la vue agrandie en ajoute une copie
    var clear = function () {
      $$('.is-active').forEach(function (e) { e.classList.remove('is-active'); });
      $$('.photo-wrap').forEach(function (w) { w.classList.remove('has-active'); });
    };
    var show = function (id) {
      clear();
      if (!id) return;
      $$('[data-route="' + id + '"], [data-pr="' + id + '"]').forEach(function (e) { e.classList.add('is-active'); });
      $$('.photo-wrap').forEach(function (w) { if ($('[data-route="' + id + '"]', w)) w.classList.add('has-active'); });
    };
    var pin = function (id) {
      pinned = pinned === id ? null : id;
      show(pinned);
    };
    var revealPhoto = function (id) {
      var t = $('.photo-wrap [data-route="' + id + '"]');
      if (!t) return;
      var w = t.closest('.photo-wrap'), r = w.getBoundingClientRect();
      if (r.top < 60 || r.bottom > window.innerHeight) {
        w.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      }
    };
    var target = function (e) { return e.target.closest && e.target.closest('[data-route]'); };

    /* ---------- infobulle de voie (amélioration progressive) ---------- */
    var main = $('main') || document.body;
    var seeLabel = main.getAttribute('data-see-in-list') || '';
    var tip = document.createElement('div');
    tip.className = 'route-tip';
    tip.id = 'route-tip';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    document.body.appendChild(tip);
    var tipId = null, tipTouch = false, tipDesc = null;

    var hideTip = function () {
      if (tipDesc) { tipDesc.removeAttribute('aria-describedby'); tipDesc = null; }
      tipId = null; tipTouch = false; tipShape = null;
      tip.classList.remove('is-open', 'is-touch');
      tip.hidden = true;
    };
    // fiche de la liste clonée, sans id ni data-route (rien ne doit réagir dessus)
    var fill = function (id, touch) {
      var li = document.getElementById(id);
      if (!li) return false;
      tip.textContent = '';
      var card = document.createElement('div');
      card.className = li.className.replace(/\b(route|has-line|is-active|is-off)\b/g, '').trim();
      card.style.cssText = li.style.cssText;
      Array.prototype.forEach.call(li.children, function (c) {
        var k = c.cloneNode(true);
        $$('[id]', k).forEach(function (n) { n.removeAttribute('id'); });
        card.appendChild(k);
      });
      tip.style.cssText = li.style.cssText;
      tip.appendChild(card);
      if (touch && seeLabel) {
        var go = document.createElement('a');
        go.className = 'route-tip-go';
        go.href = '#' + id;
        go.textContent = seeLabel + ' ↓';
        tip.appendChild(go);
      }
      return true;
    };
    // Emprise à l'écran de la voie de l'infobulle (tipShape) : points échantillonnés le long de ses
    // tracés (partie commune d'un départ commun comprise) et boîtes de sa pastille, de ses cotations,
    // relais et nom. L'infobulle ne doit jamais la recouvrir.
    var tipShape = null;
    var routeShape = function (id, wrap) {
      var pts = [], boxes = [];
      if (!wrap) return { pts: pts, boxes: boxes };
      $$('[data-route="' + id + '"]', wrap).forEach(function (n) {
        if (n.matches('g.line, g.leader')) {
          var p = n.querySelector('path.halo') || n.querySelector('path');
          var ctm = p && p.getScreenCTM && p.getScreenCTM();
          if (!ctm || !p.getTotalLength) return;
          var len = p.getTotalLength(), k = Math.min(400, Math.max(2, Math.ceil(len / 3)));
          for (var i = 0; i <= k; i++) {
            var q = p.getPointAtLength(len * i / k);
            pts.push([ctm.a * q.x + ctm.c * q.y + ctm.e, ctm.b * q.x + ctm.d * q.y + ctm.f]);
          }
        } else {
          var b = n.getBoundingClientRect();
          if (b.width || b.height) boxes.push(b);
        }
      });
      return { pts: pts, boxes: boxes };
    };
    // nombre d'éléments de la voie sous le rectangle (l, t, w, h), marge comprise (épaisseur du trait)
    var overlap = function (s, l, t, w, h) {
      var pad = 10, n = 0, r = l + w + pad, b = t + h + pad;
      l -= pad; t -= pad;
      for (var i = 0; i < s.pts.length; i++) {
        var p = s.pts[i];
        if (p[0] >= l && p[0] <= r && p[1] >= t && p[1] <= b) n++;
      }
      for (var j = 0; j < s.boxes.length; j++) {
        var o = s.boxes[j];
        if (o.left < r && o.right > l && o.top < b && o.bottom > t) n += 20;
      }
      return n;
    };
    // x,y : point (pointeur ou doigt) ; r : rectangle d'ancrage (pastille) ; up : préfère au-dessus (doigt).
    // Position préférée d'abord ; si elle recouvre la voie, la place libre la plus proche (grille sur la
    // fenêtre) ; sans place libre, la moins recouvrante.
    var place = function (x, y, r, up) {
      var vw = document.documentElement.clientWidth, vh = window.innerHeight, m = 8;
      var w = tip.offsetWidth, h = tip.offsetHeight, l, t;
      if (r) {
        l = r.left + r.width / 2 - w / 2;
        t = r.bottom + 8;
        if (t + h > vh - m) t = r.top - 8 - h;
        x = r.left + r.width / 2; y = r.top + r.height / 2;
      } else if (up) {
        l = x - w / 2;
        t = y - 28 - h;
        if (t < m) t = y + 28;
      } else {
        l = x + 14; t = y + 18;
        if (l + w > vw - m) l = x - 14 - w;
        if (t + h > vh - m) t = y - 12 - h;
      }
      var maxL = Math.max(m, vw - w - m), maxT = Math.max(m, vh - h - m);
      l = Math.max(m, Math.min(l, maxL));
      t = Math.max(m, Math.min(t, maxT));
      var s = tipShape;
      if (s && overlap(s, l, t, w, h)) {
        // candidats : grille de la fenêtre, triés par distance au point visé (centre de l'infobulle)
        var cand = [], step = 24;
        for (var ct = m; ct <= maxT; ct += step) {
          for (var cl = m; cl <= maxL; cl += step) {
            var dx = cl + w / 2 - x, dy = ct + h / 2 - y;
            cand.push([dx * dx + dy * dy, cl, ct]);
          }
        }
        cand.push([Infinity, maxL, maxT]);
        cand.sort(function (a, b) { return a[0] - b[0]; });
        var best = null, bestN = Infinity;
        for (var c = 0; c < cand.length; c++) {
          var n = overlap(s, cand[c][1], cand[c][2], w, h);
          if (n < bestN) { bestN = n; best = cand[c]; }
          if (!n) break;
        }
        if (best) { l = best[1]; t = best[2]; }
      }
      tip.style.left = l + 'px';
      tip.style.top = t + 'px';
    };
    var openTip = function (t, x, y, touch, anchored) {
      var id = t.dataset.route;
      if (t.classList.contains('is-off') || !fill(id, touch)) { hideTip(); return; }
      if (tipDesc) tipDesc.removeAttribute('aria-describedby');
      var wrap = t.closest('.photo-wrap');
      var bt = $('.badge[data-route="' + id + '"]', wrap);
      tipDesc = bt;
      if (bt) bt.setAttribute('aria-describedby', 'route-tip');
      tipId = id; tipTouch = !!touch;
      tip.classList.toggle('is-touch', !!touch);
      tip.hidden = false;
      tipShape = routeShape(id, wrap);
      place(x, y, anchored && bt ? bt.getBoundingClientRect() : null, touch);
      void tip.offsetWidth; // mesurée et placée avant de passer à opacité 1
      tip.classList.add('is-open');
    };
    var closeTip = function () { hideTip(); show(pinned); };
    var goList = function (id) {
      hideTip();
      pinned = id; show(id);
      if (location.hash === '#' + id) {
        var li = document.getElementById(id);
        if (li) li.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
      } else location.hash = id;
    };
    var photoTarget = function (e) {
      var n = e.target.closest && e.target.closest('[data-route]');
      return n && n.closest('.photo-wrap') ? n : null;
    };

    var moveAt = null, moveRaf = 0;
    // survol souris : mise en évidence + infobulle (suit le pointeur sur le tracé, ancrée à la pastille)
    document.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse') return;
      var t = target(e);
      if (!t || t.classList.contains('is-off')) return;
      show(t.dataset.route);
      if (photoTarget(e)) openTip(t, e.clientX, e.clientY, false, t.classList.contains('badge'));
    });
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || !tipId || tipTouch) return;
      var t = photoTarget(e);
      if (!t || t.dataset.route !== tipId || t.classList.contains('badge')) return;
      // une seule mise en place par image : la recherche d'une place libre a un coût
      moveAt = [e.clientX, e.clientY];
      if (!moveRaf) moveRaf = requestAnimationFrame(function () { moveRaf = 0; if (tipId && moveAt) place(moveAt[0], moveAt[1], null, false); });
    });
    document.addEventListener('pointerout', function (e) {
      if (e.pointerType !== 'mouse') return;
      var t = target(e);
      if (!t) return;
      var to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('[data-route]') : null;
      if (to && to.dataset.route === t.dataset.route) return; // on reste sur la même voie
      show(pinned);
      hideTip();
    });
    // focus clavier : infobulle ancrée à la pastille ; Échap la ferme
    document.addEventListener('focusin', function (e) {
      var t = target(e);
      if (!t) return;
      show(t.dataset.route);
      var vis;
      try { vis = t.matches(':focus-visible'); } catch (x) { vis = false; }
      if (vis && t.classList.contains('badge')) openTip(t, 0, 0, false, true);
    });
    document.addEventListener('focusout', function () {
      // l'infobulle tactile reste ouverte (le focus change au tap) ; sinon retour au repos
      if (tipTouch) show(tipId); else closeTip();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && tipId) closeTip(); });
    window.addEventListener('scroll', function () { if (tipId) closeTip(); }, { passive: true });
    window.addEventListener('resize', function () { if (tipId) closeTip(); });

    // tactile : appui court = infobulle ; appui long = épingle et défile jusqu'à la fiche
    var LONG = 450, SLOP = 10;
    var press = null, mute = 0;
    var cancelPress = function () { if (press) { clearTimeout(press.timer); press = null; } };
    wraps.forEach(function (w) {
      w.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
    document.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      mute = 0; // nouvel appui : le clic précédent, s'il devait venir, est passé
      cancelPress();
      var t = photoTarget(e);
      if (!t || t.classList.contains('is-off')) return;
      var me = { t: t, id: t.dataset.route, x: e.clientX, y: e.clientY, pid: e.pointerId, long: false };
      me.timer = setTimeout(function () {
        me.long = true;
        if (navigator.vibrate) navigator.vibrate(10);
        goList(me.id);
      }, LONG);
      press = me;
    });
    document.addEventListener('pointermove', function (e) {
      if (!press || e.pointerId !== press.pid) return;
      if (Math.abs(e.clientX - press.x) > SLOP || Math.abs(e.clientY - press.y) > SLOP) cancelPress();
    });
    document.addEventListener('pointercancel', function (e) { if (e.pointerType !== 'mouse') cancelPress(); });
    document.addEventListener('pointerup', function (e) {
      if (e.pointerType === 'mouse') return;
      var p = press;
      cancelPress();
      if (p) {
        mute = Date.now() + 500; // le clic qui suit (pastille = ancre, ou page déjà défilée) ne doit rien faire
        if (p.long) return;
        show(p.id);
        openTip(p.t, e.clientX, e.clientY, true, false);
        return;
      }
      if (tipId && tipTouch && !e.target.closest('.route-tip')) closeTip(); // dans l'infobulle : fermée au clic, voir plus bas
    });
    tip.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('.route-tip-go');
      e.preventDefault();
      if (a) goList(tipId); else closeTip(); // tap sur l'infobulle hors lien : fermeture
    });
    document.addEventListener('click', function (e) {
      if (Date.now() < mute) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);

    // clic / tap : épingle la voie (un second tap la libère)
    document.addEventListener('click', function (e) {
      var t = target(e);
      if (!t) {
        if (pinned && !e.target.closest('.chips') && !e.target.closest('.route-tip')) { pinned = null; clear(); }
        return;
      }
      var id = t.dataset.route;
      if (t.tagName === 'A') { pinned = id; show(id); return; } // l'ancre défile jusqu'à la voie
      if (t.classList.contains('route') && $('.photo-wrap [data-route="' + id + '"]')) {
        pin(id);
        if (pinned) revealPhoto(id);
      }
    });
    // lien direct #voie-12
    var fromHash = function () {
      var id = decodeURIComponent(location.hash.slice(1));
      if (/^voie-/.test(id) && document.getElementById(id)) { pinned = id; show(id); }
    };
    window.addEventListener('hashchange', fromHash);
    fromHash();

    /* ---------- grande voie : une longueur du tableau <-> son morceau de tracé ---------- */
    var pitchPin = null; // { pr, n } : longueur épinglée par un clic
    var lightPitch = function (pr, n) {
      $$('.is-pitch').forEach(function (e) { e.classList.remove('is-pitch'); });
      if (!pr) return;
      $$('[data-pr="' + pr + '"][data-pitch="' + n + '"]').forEach(function (e) { e.classList.add('is-pitch'); });
    };
    var restorePitch = function () { if (pitchPin) lightPitch(pitchPin.pr, pitchPin.n); else lightPitch(); };
    var pitchOf = function (e) { return e.target.closest && e.target.closest('[data-pitch]'); };
    document.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse') return;
      var t = pitchOf(e);
      if (t) lightPitch(t.dataset.pr, t.dataset.pitch);
    });
    document.addEventListener('pointerout', function (e) {
      if (e.pointerType !== 'mouse') return;
      var t = pitchOf(e);
      if (!t) return;
      var to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('[data-pitch]') : null;
      if (to && to.dataset.pr === t.dataset.pr && to.dataset.pitch === t.dataset.pitch) return;
      restorePitch();
    });
    document.addEventListener('focusin', function (e) { var t = pitchOf(e); if (t) lightPitch(t.dataset.pr, t.dataset.pitch); });
    document.addEventListener('focusout', function (e) { if (pitchOf(e)) restorePitch(); });
    document.addEventListener('click', function (e) {
      var t = pitchOf(e);
      if (!t) return;
      var same = pitchPin && pitchPin.pr === t.dataset.pr && pitchPin.n === t.dataset.pitch;
      pitchPin = same ? null : { pr: t.dataset.pr, n: t.dataset.pitch };
      $$('.pitch[aria-pressed]').forEach(function (r) { r.setAttribute('aria-pressed', 'false'); });
      if (pitchPin) $$('.pitch[data-pr="' + pitchPin.pr + '"][data-pitch="' + pitchPin.n + '"]').forEach(function (r) { r.setAttribute('aria-pressed', 'true'); });
      restorePitch();
    });
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.pitch')) { e.preventDefault(); e.target.click(); }
    });

    /* filtre par bande de cotation */
    var chips = $$('.chip');
    var active = {};
    var apply = function () {
      var any = Object.keys(active).length > 0;
      routes.forEach(function (r) { r.classList.toggle('is-off', any && !active[r.dataset.band]); });
      wraps.forEach(function (w) {
        w.classList.toggle('is-filtering', any);
        $$('.line, .relay, .badge, .grade-tag, .name-tag, .pitch-tag', w).forEach(function (e) { e.classList.toggle('is-off', any && !active[e.dataset.band]); });
      });
      if (pinned && any) {
        var p = document.getElementById(pinned);
        if (p && p.classList.contains('is-off')) { pinned = null; clear(); }
      }
    };
    chips.forEach(function (c) {
      // pas de puce pour une bande absente du secteur
      if (!routes.some(function (r) { return r.dataset.band === c.dataset.band; })) { c.remove(); return; }
      c.addEventListener('click', function () {
        var b = c.dataset.band, on = c.getAttribute('aria-pressed') !== 'true';
        c.setAttribute('aria-pressed', on);
        if (on) active[b] = true; else delete active[b];
        apply();
      });
    });
  }

  /* ---------- index des voies : recherche, filtres et tri ---------- */
  var list = $('[data-list]');
  if (list) {
    var rows = $$('.row', list);
    var q = $('[data-search]');
    var sel = $('[data-sort]');
    var count = $('[data-count]');
    var empty = $('[data-empty]');
    var chipBox = $('[data-chips-index]');
    var siteSel = $('[data-site-filter]');
    var secSel = $('[data-sector-filter]');
    var lenMin = $('[data-len-min]');
    var lenMax = $('[data-len-max]');
    var resetBtn = $('[data-reset]');
    var unit = count.textContent.replace(/^\d+\s*/, '');
    var bands = {};
    rows.forEach(function (r) {
      r.dataset.key = norm([r.dataset.name, r.dataset.num, r.dataset.sector, r.dataset.grade, r.dataset.opener].join(' '));
      bands[r.dataset.band] = true;
    });
    // pas de puce pour une bande absente du topo
    var bandChips = $$('.chip', chipBox).filter(function (c) {
      if (bands[c.dataset.band]) return true;
      c.parentNode.removeChild(c);
      return false;
    });
    // aucune longueur renseignée : pas de filtre de longueur
    if (lenMin && !rows.some(function (r) { return +r.dataset.length > 0; })) {
      lenMin = lenMax = null;
      var fs = $('.length');
      if (fs) fs.hidden = true;
    }
    var bandOn = {};
    // options de secteur : celles du site choisi (toutes sans choix de site)
    var secOpts = secSel ? $$('option', secSel) : [];
    var fillSectors = function () {
      if (!secSel) return;
      var site = siteSel ? siteSel.value : '', cur = secSel.value;
      secSel.textContent = '';
      secOpts.forEach(function (o, i) {
        if (i === 0 || !site || o.dataset.site === site) secSel.appendChild(o);
      });
      secSel.value = cur;
      if (secSel.value !== cur) secSel.selectedIndex = 0;
    };
    var num = function (el) { var v = parseInt(el.value, 10); return isNaN(v) ? null : v; };
    // état dans l'adresse (?q=…&b=6a,6b&site=…&sec=…&min=…&max=…) : lien partageable
    var saveState = function () {
      if (!window.history || !history.replaceState) return;
      var p = new URLSearchParams();
      if (q.value.trim()) p.set('q', q.value.trim());
      var bs = Object.keys(bandOn);
      if (bs.length) p.set('b', bs.join(','));
      if (siteSel && siteSel.value) p.set('site', siteSel.value);
      if (secSel && secSel.value) p.set('sec', secSel.value);
      if (lenMin && lenMin.value) p.set('min', lenMin.value);
      if (lenMax && lenMax.value) p.set('max', lenMax.value);
      var s = p.toString();
      try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash); } catch (e) { /* adresse non modifiable */ }
    };
    var update = function (keep) {
      var terms = norm(q.value).split(/\s+/).filter(Boolean), n = 0;
      var any = Object.keys(bandOn).length > 0;
      var site = siteSel ? siteSel.value : '', sec = secSel ? secSel.value : '';
      var lo = lenMin ? num(lenMin) : null, hi = lenMax ? num(lenMax) : null;
      rows.forEach(function (r) {
        var d = r.dataset, ok = terms.every(function (t) { return d.key.indexOf(t) >= 0; });
        if (ok && any) ok = !!bandOn[d.band];
        if (ok && site) ok = d.site === site;
        if (ok && sec) ok = d.sector === sec;
        if (ok && (lo !== null || hi !== null)) {
          var l = +d.length; // longueur inconnue (0) : écartée dès qu'on filtre sur la longueur
          ok = l > 0 && (lo === null || l >= lo) && (hi === null || l <= hi);
        }
        r.classList.toggle('is-off', !ok);
        if (ok) n++;
      });
      count.textContent = n + ' ' + unit;
      empty.hidden = n > 0;
      if (!keep) saveState();
    };
    var cmp = {
      name: function (a, b) { return norm(a.dataset.name).localeCompare(norm(b.dataset.name)); },
      grade: function (a, b) { return (+b.dataset.rank) - (+a.dataset.rank) || cmp.name(a, b); },
      sector: function (a, b) { return a.dataset.sector.localeCompare(b.dataset.sector) || (parseFloat(a.dataset.num) - parseFloat(b.dataset.num)); }
    };
    q.addEventListener('input', function () { update(); });
    // pas de script en ligne (CSP) : on neutralise ici l'envoi du formulaire de recherche
    if (q.form) q.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = $('.row:not(.is-off) a', list);
      if (first) first.focus();
    });
    bandChips.forEach(function (c) {
      c.addEventListener('click', function () {
        var b = c.dataset.band, on = c.getAttribute('aria-pressed') !== 'true';
        c.setAttribute('aria-pressed', on);
        if (on) bandOn[b] = true; else delete bandOn[b];
        update();
      });
    });
    if (siteSel) siteSel.addEventListener('change', function () { fillSectors(); update(); });
    if (secSel) secSel.addEventListener('change', function () { update(); });
    [lenMin, lenMax].forEach(function (el) { if (el) el.addEventListener('input', function () { update(); }); });
    if (resetBtn) resetBtn.addEventListener('click', function () {
      q.value = '';
      bandOn = {};
      bandChips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      if (siteSel) siteSel.value = '';
      fillSectors();
      if (secSel) secSel.selectedIndex = 0;
      if (lenMin) lenMin.value = '';
      if (lenMax) lenMax.value = '';
      update();
      q.focus();
    });
    if (sel) sel.addEventListener('change', function () {
      rows.slice().sort(cmp[sel.value]).forEach(function (r) { list.appendChild(r); });
    });
    // clavier : « / » va à la recherche ; flèches bas/haut parcourent les résultats visibles ; Échap vide la recherche
    document.addEventListener('keydown', function (e) {
      var t = e.target, typing = t.matches && t.matches('input, select, textarea');
      if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); q.focus(); q.select(); return; }
      if (e.key === 'Escape' && t === q && q.value) { q.value = ''; update(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var links = $$('.row:not(.is-off) a', list), i = links.indexOf(t);
      if (t === q && e.key === 'ArrowDown' && links.length) { e.preventDefault(); links[0].focus(); }
      else if (i >= 0) {
        e.preventDefault();
        if (e.key === 'ArrowDown' && i + 1 < links.length) links[i + 1].focus();
        else if (e.key === 'ArrowUp') (i > 0 ? links[i - 1] : q).focus();
      }
    });
    // état initial depuis l'adresse
    var params = new URLSearchParams(location.search);
    q.value = params.get('q') || '';
    (params.get('b') || '').split(',').forEach(function (b) {
      var c = bandChips.filter(function (x) { return x.dataset.band === b; })[0];
      if (c) { bandOn[b] = true; c.setAttribute('aria-pressed', 'true'); }
    });
    if (siteSel && params.get('site')) siteSel.value = params.get('site');
    fillSectors();
    if (secSel && params.get('sec')) secSel.value = params.get('sec');
    if (lenMin) lenMin.value = params.get('min') || '';
    if (lenMax) lenMax.value = params.get('max') || '';
    update(true);
  }

  /* ---------- coordonnées copiables ---------- */
  var fallbackCopy = function (txt) {
    var ta = document.createElement('textarea');
    ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  };
  $$('[data-copy]').forEach(function (b) {
    b.hidden = false;
    var label = b.textContent;
    b.addEventListener('click', function () {
      var txt = b.dataset.copy, done = function () {
        b.textContent = b.dataset.done;
        setTimeout(function () { b.textContent = label; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, function () { if (fallbackCopy(txt)) done(); });
      } else if (fallbackCopy(txt)) done();
    });
  });

  /* ---------- lecture hors ligne : service worker du site (publié à côté du manifeste) ---------- */
  var manifest = $('link[rel="manifest"]');
  var note = $('[data-offline]');
  // Économiseur de données : pas d'enregistrement (donc aucun préchargement) ; un service
  // worker déjà installé continue de servir le site, et le préchargement est de toute façon
  // sauté par sw.js tant que l'économiseur est actif.
  var saveData = navigator.connection && navigator.connection.saveData;
  if (manifest && 'serviceWorker' in navigator && !saveData) {
    var showNote = function (state) {
      if (!note) return;
      note.hidden = !state;
      note.textContent = state ? note.dataset[state] : '';
      note.classList.toggle('is-ready', state === 'ready');
    };
    var swUrl = new URL('sw.js', new URL(manifest.getAttribute('href'), location.href)).href;
    var register = function () {
      navigator.serviceWorker.register(swUrl).then(function (reg) {
        var w = reg.installing;
        if (w && !navigator.serviceWorker.controller) {
          showNote('wait');
          w.addEventListener('statechange', function () { if (w.state === 'redundant') showNote(null); });
        }
      }).catch(function () { /* hors contexte sécurisé ou refusé : le site reste utilisable en ligne */ });
      // « prêt » : un service worker actif a terminé le préchargement (l'activation suit l'installation)
      navigator.serviceWorker.ready.then(function () { showNote('ready'); });
    };
    // après le chargement et quand le navigateur est inactif : le préchargement ne
    // concurrence ni l'image principale ni le premier affichage
    var whenIdle = function () {
      if (window.requestIdleCallback) requestIdleCallback(register, { timeout: 5000 });
      else setTimeout(register, 2000);
    };
    if (document.readyState === 'complete') whenIdle();
    else window.addEventListener('load', whenIdle);
  }

  // Fenêtre de choix des PDF (accueil) : un lien [data-dialog] ouvre la fenêtre <dialog>
  // nommée ; sans JavaScript, le lien télécharge le PDF complet. Un clic hors de la
  // fenêtre la ferme.
  document.querySelectorAll('a[data-dialog]').forEach(function (a) {
    var dlg = /** @type {HTMLDialogElement | null} */ (document.getElementById(a.getAttribute('data-dialog') || ''));
    if (!dlg || typeof dlg.showModal !== 'function') return;
    a.addEventListener('click', function (ev) { ev.preventDefault(); dlg.showModal(); });
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg) dlg.close(); });
  });

  /* ---------- vue agrandie d'une photo : plein écran, pincer ou molette pour zoomer, glisser pour se déplacer ---------- */
  // La copie de la photo est élargie (et non mise à l'échelle) : les tracés restent fins, les
  // pastilles lisibles, et les cotations masquées sur une photo étroite réapparaissent (voir le CSS).
  var zoomMain = $('[data-zoom-labels]');
  if (zoomMain) {
    var zl = (zoomMain.getAttribute('data-zoom-labels') || '').split('|');
    var openZoom = function (wrap) {
      var ar = parseFloat(getComputedStyle(wrap).getPropertyValue('--ar')) || (wrap.offsetWidth / wrap.offsetHeight) || 1.5;
      var box = document.createElement('div');
      box.className = 'zoomer';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', $('img', wrap) ? $('img', wrap).alt : '');
      var scroller = document.createElement('div');
      scroller.className = 'zoom-scroll';
      var copy = wrap.cloneNode(true);
      copy.classList.add('zoom-copy');
      $$('[data-zoom]', copy).forEach(function (b) { b.remove(); });
      scroller.appendChild(copy);
      var bar = document.createElement('div');
      bar.className = 'zoom-bar';
      var mk = function (txt, label, fn) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = txt; b.setAttribute('aria-label', label); b.title = label;
        b.addEventListener('click', fn);
        bar.appendChild(b);
        return b;
      };
      box.appendChild(scroller);
      box.appendChild(bar);
      var scale = 1, base = 0;
      var fit = function () { base = Math.min(scroller.clientWidth, scroller.clientHeight * ar); };
      // échelle s autour du point (x, y) de la fenêtre (centre par défaut)
      var setScale = function (s, x, y) {
        s = Math.max(1, Math.min(6, s));
        var r = scroller.getBoundingClientRect();
        if (x == null) { x = r.left + r.width / 2; y = r.top + r.height / 2; }
        var c = copy.getBoundingClientRect();
        var fx = (x - c.left) / c.width, fy = (y - c.top) / c.height;
        scale = s;
        copy.style.width = Math.round(base * s) + 'px';
        var n = copy.getBoundingClientRect();
        scroller.scrollLeft += (n.left + fx * n.width) - x;
        scroller.scrollTop += (n.top + fy * n.height) - y;
      };
      var img = $('img', copy);
      var sharpen = function () { if (img) img.sizes = Math.round(base * scale) + 'px'; }; // grande variante au besoin
      mk('−', zl[2] || '−', function () { setScale(scale / 1.6); sharpen(); });
      mk('+', zl[1] || '+', function () { setScale(scale * 1.6); sharpen(); });
      var closeBtn = mk('×', zl[0] || '×', function () { history.back(); });
      closeBtn.classList.add('zoom-close');

      // gestes : un doigt (ou la souris) déplace, deux doigts zooment ; un geste n'est pas un clic
      var pts = {}, pinch = null, drag = null, moved = false, lastTap = 0, shTimer = 0;
      var count = function () { return Object.keys(pts).length; };
      scroller.addEventListener('pointerdown', function (e) {
        pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        moved = false;
        if (count() === 2) {
          var k = Object.keys(pts), a = pts[k[0]], b = pts[k[1]];
          pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: scale };
          drag = null;
        } else if (count() === 1) {
          drag = { x: e.clientX, y: e.clientY, l: scroller.scrollLeft, t: scroller.scrollTop };
        }
      });
      scroller.addEventListener('pointermove', function (e) {
        if (!pts[e.pointerId]) return;
        pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        if (pinch && count() >= 2) {
          var k = Object.keys(pts), a = pts[k[0]], b = pts[k[1]];
          setScale(pinch.s * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d), (a.x + b.x) / 2, (a.y + b.y) / 2);
          moved = true;
        } else if (drag) {
          var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
          scroller.scrollLeft = drag.l - dx; scroller.scrollTop = drag.t - dy;
        }
      });
      var up = function (e) {
        delete pts[e.pointerId];
        if (count() < 2 && pinch) { pinch = null; sharpen(); }
        if (!count()) {
          drag = null;
          // double toucher : bascule entre la vue entière et un zoom ×3 à cet endroit
          if (!moved && e.type === 'pointerup' && e.pointerType !== 'mouse') {
            var now = Date.now();
            if (now - lastTap < 300) { setScale(scale > 1.5 ? 1 : 3, e.clientX, e.clientY); sharpen(); lastTap = 0; } else lastTap = now;
          }
        }
      };
      scroller.addEventListener('pointerup', up);
      scroller.addEventListener('pointercancel', up);
      scroller.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
      scroller.addEventListener('dblclick', function (e) { setScale(scale > 1.5 ? 1 : 3, e.clientX, e.clientY); sharpen(); });
      scroller.addEventListener('wheel', function (e) {
        e.preventDefault();
        setScale(scale * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
        clearTimeout(shTimer); shTimer = setTimeout(sharpen, 200);
      }, { passive: false });

      var onKey = function (e) { if (e.key === 'Escape') { e.preventDefault(); history.back(); } else if (e.key === '+' || e.key === '=') setScale(scale * 1.6); else if (e.key === '-') setScale(scale / 1.6); };
      var close = function () {
        window.removeEventListener('popstate', onPop);
        window.removeEventListener('hashchange', onHash);
        document.removeEventListener('keydown', onKey, true);
        window.removeEventListener('resize', onResize);
        box.remove();
        document.documentElement.classList.remove('zoom-open');
        var b = $('[data-zoom]', wrap); if (b) b.focus();
      };
      var onPop = function () { close(); };
      // appui long sur une voie (aller à la fiche) : la vue se ferme et la page défile jusqu'à la fiche
      var onHash = function () { window.removeEventListener('popstate', onPop); close(); };
      var onResize = function () { fit(); setScale(scale); };
      history.pushState({ zoom: 1 }, '');
      window.addEventListener('popstate', onPop);
      window.addEventListener('hashchange', onHash);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('resize', onResize);
      document.documentElement.classList.add('zoom-open');
      document.body.appendChild(box);
      fit();
      copy.style.width = Math.round(base) + 'px';
      closeBtn.focus();
    };
    $$('[data-zoom]').forEach(function (b) {
      b.hidden = false;
      b.addEventListener('click', function (e) { e.stopPropagation(); openZoom(b.closest('.photo-wrap')); });
    });
  }
})();
