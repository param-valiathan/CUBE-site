/* CUBE site scripts: vanilla JS, no dependencies. Everything degrades gracefully without JS. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ?shot: used for full-page screenshots in review (reveals everything, fixes viewport units) */
  if (/[?&]shot\b/.test(location.search)) { document.documentElement.style.setProperty('--vh', '9px'); document.documentElement.classList.add('review-mode'); }

  /* theme toggle (remembered per browser; falls back silently if storage is blocked) */
  var root = document.documentElement;
  function currentTheme() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  var tt = $("#theme-toggle");
  if (tt) tt.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("cube-theme", next); } catch (e) {}
  });

  /* mobile menu */
  var burger = $("#nav-toggle"), links = $("#nav-links");
  if (burger && links) burger.addEventListener("click", function () {
    var open = links.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  });

  /* scroll progress bar */
  var prog = $("#progress");
  function onScroll() {
    if (!prog) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* reveal on scroll */
  var rev = $$(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    rev.forEach(function (el) { ro.observe(el); });
  } else { rev.forEach(function (el) { el.classList.add("in"); }); }

  /* hero: drifting keypoint network */
  var cv = $("#hero-net");
  if (cv && cv.getContext) {
    var ctx = cv.getContext("2d"), W = 0, H = 0, pts = [], mouse = { x: -999, y: -999 }, run = true;
    var cols = ["#22BFAE", "#48BE78", "#2A9AD9", "#7B4FD6", "#E8AE2E"];
    function size() {
      var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
      var n = Math.max(18, Math.min(58, Math.round(W * H / 22000)));
      pts = [];
      for (var i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, c: cols[i % cols.length], r: 2 + Math.random() * 2.2 });
    }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (!reduce) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
          var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 9000) { p.x += dx * .012; p.y += dy * .012; }
        }
        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j], ax = p.x - q.x, ay = p.y - q.y, dd = ax * ax + ay * ay;
          if (dd < 15000) { ctx.globalAlpha = (1 - dd / 15000) * .38; ctx.strokeStyle = p.c; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
        }
      }
      ctx.globalAlpha = .85;
      pts.forEach(function (p) { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); });
      if (run && !reduce) requestAnimationFrame(frame);
    }
    size(); frame();
    window.addEventListener("resize", function () { size(); if (reduce) frame(); });
    cv.parentElement.addEventListener("pointermove", function (e) { var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) {
      var vis = es[0].isIntersecting; if (vis && !run) { run = true; frame(); } run = vis;
    }).observe(cv);
  }

  /* pause autoplay videos that are off screen */
  $$("video[data-autoplay]").forEach(function (v) {
    if (reduce) { v.removeAttribute("autoplay"); v.pause(); v.controls = true; return; }
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); });
    }, { threshold: 0.25 }).observe(v);
  });

  /* five-step story: the sticky picture and the text are driven directly by the scroll position.
     Nothing is remembered between frames, so scrolling up gives exactly the same picture as scrolling down. */
  var steps = $$(".step"), simgs = $$(".story__stage img"), svis = $("#story-visual");
  if (steps.length > 1 && simgs.length === steps.length) {
    var ticking = false, nSteps = steps.length;
    var smooth = function (x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    var paint = function () {
      ticking = false;
      if (document.documentElement.classList.contains("review-mode")) {
        simgs.forEach(function (m, k) { m.style.opacity = k === 0 ? 1 : 0; });
        return;
      }
      if (!svis || window.getComputedStyle(svis).display === "none") {   /* narrow screens: plain stacked layout */
        steps.forEach(function (s) { s.style.opacity = ""; });
        return;
      }
      var mid = window.innerHeight * 0.5, cs = steps.map(function (s) {
        var r = s.getBoundingClientRect(); return r.top + r.height / 2;
      });
      var pos = 0;
      if (mid >= cs[nSteps - 1]) pos = nSteps - 1;
      else if (mid > cs[0]) {
        for (var i = 0; i < nSteps - 1; i++) {
          if (mid >= cs[i] && mid < cs[i + 1]) {
            /* hold each step for the first quarter, cross-fade over the middle half, hold the next one */
            var f = (mid - cs[i]) / (cs[i + 1] - cs[i]);
            pos = i + (reduce ? Math.round(f) : smooth((f - 0.25) / 0.5));
            break;
          }
        }
      }
      /* pictures: the current one stays solid and the next one fades in on top of it (no see-through dip) */
      var cur = Math.min(nSteps - 1, Math.floor(pos + 1e-6)), frac = pos - cur;
      for (var k = 0; k < nSteps; k++) {
        var o = Math.max(0, 1 - Math.abs(pos - k));            /* text emphasis: 1 at its own step */
        var alpha = k === cur ? 1 : (k === cur + 1 ? frac : 0);
        simgs[k].style.opacity = alpha.toFixed(3);
        simgs[k].style.transform = "scale(" + (0.97 + 0.03 * alpha).toFixed(4) + ")";
        steps[k].style.opacity = (0.28 + 0.72 * o).toFixed(3);
      }
    };
    var request = function () { if (!ticking) { ticking = true; window.requestAnimationFrame(paint); } };
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    window.addEventListener("load", request);
    window.addEventListener("pageshow", request);
    simgs.forEach(function (m) { if (!m.complete) m.addEventListener("load", request); });
    request();
  }

  /* before / after slider */
  $$(".compare").forEach(function (c) {
    var inp = $("input", c);
    function set(v) { c.style.setProperty("--pos", v + "%"); }
    set(50);
    if (inp) inp.addEventListener("input", function () { set(inp.value); });
    if (!reduce) { // gentle intro sweep so people see it is interactive
      var t0 = null, seen = false;
      if ("IntersectionObserver" in window) new IntersectionObserver(function (es, ob) {
        if (!es[0].isIntersecting || seen) return; seen = true; ob.disconnect();
        function step(ts) { t0 = t0 || ts; var k = (ts - t0) / 1600; if (k >= 1) { set(50); if (inp) inp.value = 50; return; }
          var v = 50 + Math.sin(k * Math.PI * 2) * 28 * (1 - k); set(v); if (inp) inp.value = v; requestAnimationFrame(step); }
        requestAnimationFrame(step);
      }, { threshold: .6 }).observe(c);
    }
  });

  /* copy buttons on code blocks */
  $$(".code, .prose pre").forEach(function (b) {
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "copy"; btn.textContent = "Copy";
    btn.addEventListener("click", function () {
      var code = $("code", b), text = (code ? code.innerText : b.innerText).replace(/^\$ /gm, "");
      var done = function () { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = "Copy"; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
      else { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) {} ta.remove(); }
    });
    b.style.position = "relative"; b.appendChild(btn);
  });

  /* gallery filters + lightbox */
  var fbtns = $$(".filter"), shots = $$(".shot");
  fbtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var f = b.getAttribute("data-f");
      fbtns.forEach(function (x) { x.classList.toggle("is-on", x === b); });
      shots.forEach(function (s) { s.style.display = (f === "all" || s.getAttribute("data-t").indexOf(f) > -1) ? "" : "none"; });
    });
  });
  var lb = $("#lightbox");
  if (lb) {
    var lbi = $("img", lb), lbp = $("p", lb);
    shots.forEach(function (s) {
      s.addEventListener("click", function () {
        var im = $("img", s); lbi.src = im.getAttribute("data-full") || im.src; lbi.alt = im.alt;
        lbp.textContent = $("figcaption", s) ? $("figcaption", s).innerText.replace(/\n+/g, " : ") : "";
        lb.classList.add("is-open"); document.body.style.overflow = "hidden";
      });
    });
    function close() { lb.classList.remove("is-open"); document.body.style.overflow = ""; }
    lb.addEventListener("click", function (e) { if (e.target !== lbi) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }


  /* video page: chapter buttons seek the player */
  var player = $("#overview");
  if (player && reduce) { player.removeAttribute("autoplay"); player.pause(); }
  else if (player) { var ap = player.play(); if (ap && ap.catch) ap.catch(function () {}); }
  if (player) $$(".chapter").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = parseFloat(b.getAttribute("data-t")) || 0;
      var go = function () { player.currentTime = t; var p = player.play(); if (p && p.catch) p.catch(function () {}); };
      if (player.readyState > 0) go(); else { player.addEventListener("loadedmetadata", go, { once: true }); player.load(); }
    });
  });

  /* guide: collapsible sections open when a link points inside them; expand/collapse all */
  function openFor(id) { var el = id && document.getElementById(id); var d = el && el.closest("details.fold"); if (d) d.open = true; }
  window.addEventListener("hashchange", function () { openFor(location.hash.slice(1)); });
  openFor(location.hash.slice(1));
  var folds = $$("details.fold");
  if (folds.length > 2) {
    var tools = document.createElement("div"); tools.className = "fold-tools";
    [["Expand all sections", true], ["Collapse all sections", false]].forEach(function (p) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = p[0];
      b.addEventListener("click", function () { folds.forEach(function (d) { d.open = p[1]; }); });
      tools.appendChild(b);
    });
    folds[0].parentNode.insertBefore(tools, folds[0]);
  }

  /* guide: client-side search over the generated index */
  var sbox = $("#doc-search"), sres = $("#search-results"), sdata = null, sload = false;
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function runSearch() {
    var q = sbox.value.trim().toLowerCase();
    if (q.length < 2 || !sdata) { sres.hidden = true; return; }
    var words = q.split(/\s+/), out = [];
    sdata.forEach(function (p) {
      var title = p.t.toLowerCase(), hs = p.h.join(" ").toLowerCase(), body = p.x.toLowerCase(), score = 0, ok = true;
      words.forEach(function (w) {
        var s = (title.indexOf(w) > -1 ? 10 : 0) + (hs.indexOf(w) > -1 ? 5 : 0) + (body.indexOf(w) > -1 ? 1 : 0);
        if (!s) ok = false; score += s;
      });
      if (ok) {
        var i = body.indexOf(words[0]), snip = i > -1 ? p.x.substr(Math.max(0, i - 40), 120) : p.x.substr(0, 100);
        out.push({ p: p, s: score, snip: snip });
      }
    });
    out.sort(function (a, b) { return b.s - a.s; });
    sres.innerHTML = out.length ? out.slice(0, 8).map(function (r) {
      var sn = esc(r.snip); words.forEach(function (w) { sn = sn.replace(new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "<mark>$1</mark>"); });
      return '<a href="' + sbox.getAttribute("data-root") + r.p.u + '"><b>' + esc(r.p.t) + '</b><span>&hellip;' + sn + '&hellip;</span></a>';
    }).join("") : '<div class="none">No matches. Try a different word.</div>';
    sres.hidden = false;
  }
  if (sbox) {
    sbox.addEventListener("focus", function () {
      if (sload) return; sload = true;
      fetch(sbox.getAttribute("data-index")).then(function (r) { return r.json(); }).then(function (d) { sdata = d; runSearch(); }).catch(function () {});
    });
    sbox.addEventListener("input", runSearch);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { sres.hidden = true; } if (e.key === "/" && document.activeElement.tagName !== "INPUT") { e.preventDefault(); sbox.focus(); } });
  }
  /* docs: highlight the current heading in the side navigation */
  var side = $$(".docs__side a[href^='#']");
  if (side.length && "IntersectionObserver" in window) {
    var map = {}; side.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var heads = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var hs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { side.forEach(function (a) { a.classList.remove("is-on"); }); map[e.target.id].classList.add("is-on"); } });
    }, { rootMargin: "-84px 0px -75% 0px" });
    heads.forEach(function (h) { hs.observe(h); });
  }
})();


