/* Under the Hood — site engine
   Builds the sidebar from nav.json, tracks progress in localStorage,
   and wires every interactive component (quiz, walkthrough, stepper,
   flip cards, bars, meters, reveal animations). No dependencies. */

(function () {
  "use strict";

  var IN_CHAPTERS = /\/chapters\//.test(location.pathname);
  var ROOT = IN_CHAPTERS ? "../" : "";
  var PROGRESS_KEY = "uth-progress";
  var THEME_KEY = "uth-theme";

  /* ---------------- helpers ---------------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function getProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}"); }
    catch (e) { return {}; }
  }

  function setDone(id, done) {
    var p = getProgress();
    if (done) p[id] = true; else delete p[id];
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  }

  function flatten(nav) {
    var out = [];
    nav.acts.forEach(function (act) {
      act.chapters.forEach(function (ch) { out.push({ act: act, ch: ch }); });
    });
    return out;
  }

  /* ---------------- theme ---------------- */

  function currentTheme() {
    return document.documentElement.dataset.theme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }

  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    localStorage.setItem(THEME_KEY, t);
  }

  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  /* ---------------- sidebar ---------------- */

  function buildSidebar(nav) {
    var side = document.getElementById("sidebar");
    if (!side) return;
    side.innerHTML = "";

    var currentId = document.body.dataset.chapter || null;
    var progress = getProgress();
    var flat = flatten(nav);
    var doneCount = flat.filter(function (x) { return progress[x.ch.id]; }).length;

    var head = el("div", "side-head");
    var title = el("div", "side-title");
    var tlink = el("a", null, nav.site.title);
    tlink.href = ROOT + "index.html";
    title.appendChild(tlink);
    head.appendChild(title);
    head.appendChild(el("div", "side-sub", nav.site.subtitle));

    var prog = el("div", "side-progress");
    var plabel = el("div", "side-progress-label");
    plabel.appendChild(el("span", null, "Your journey"));
    plabel.appendChild(el("span", null, doneCount + " / " + flat.length));
    var meter = el("div", "meter");
    var fill = el("span");
    fill.style.width = (flat.length ? (100 * doneCount / flat.length) : 0) + "%";
    meter.appendChild(fill);
    prog.appendChild(plabel);
    prog.appendChild(meter);
    head.appendChild(prog);

    var tools = el("div", "side-tools");
    var search = el("input", "side-search");
    search.type = "search";
    search.placeholder = "Find a chapter…";
    search.setAttribute("aria-label", "Search chapters");
    var toggle = el("button", "theme-toggle");
    toggle.setAttribute("aria-label", "Switch between light and dark theme");
    toggle.innerHTML = currentTheme() === "dark" ? SUN : MOON;
    toggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      toggle.innerHTML = next === "dark" ? SUN : MOON;
    });
    tools.appendChild(search);
    tools.appendChild(toggle);
    head.appendChild(tools);
    side.appendChild(head);

    nav.acts.forEach(function (act) {
      var details = el("details", "side-act");
      var isCurrent = act.chapters.some(function (c) { return c.id === currentId; });
      if (isCurrent) details.open = true;

      var sum = el("summary");
      sum.appendChild(el("span", "side-act-num", act.num));
      sum.appendChild(el("span", null, act.title));
      var actDone = act.chapters.filter(function (c) { return progress[c.id]; }).length;
      sum.appendChild(el("span", "side-act-done", actDone + "/" + act.chapters.length));
      details.appendChild(sum);

      var list = el("ol", "side-ch");
      act.chapters.forEach(function (ch) {
        var li = el("li");
        var a = el("a");
        a.href = ROOT + "chapters/" + ch.slug;
        if (ch.id === currentId) a.className = "current";
        var tick = el("span", "tick" + (progress[ch.id] ? " done" : ""));
        tick.dataset.tickFor = ch.id;
        a.appendChild(tick);
        a.appendChild(el("span", null, ch.title));
        li.dataset.search = (ch.title + " " + ch.tagline).toLowerCase();
        li.appendChild(a);
        list.appendChild(li);
      });
      details.appendChild(list);
      side.appendChild(details);
    });

    search.addEventListener("input", function () {
      var q = search.value.trim().toLowerCase();
      side.querySelectorAll(".side-act").forEach(function (d) {
        var any = false;
        d.querySelectorAll("li").forEach(function (li) {
          var hit = !q || li.dataset.search.indexOf(q) !== -1;
          li.style.display = hit ? "" : "none";
          if (hit) any = true;
        });
        d.style.display = any ? "" : "none";
        if (q) d.open = true;
      });
    });

    // mobile toggle
    if (!document.querySelector(".nav-toggle")) {
      var mt = el("button", "nav-toggle", "Chapters");
      mt.setAttribute("aria-label", "Toggle chapter navigation");
      mt.addEventListener("click", function () { document.body.classList.toggle("nav-open"); });
      document.body.appendChild(mt);
    }
  }

  /* ---------------- storybook artwork ---------------- */

  function artFigure(src, alt, cls) {
    var fig = el("figure", cls);
    var img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    img.loading = "lazy";
    img.onerror = function () { fig.remove(); };
    fig.appendChild(img);
    return fig;
  }

  /* ---------------- chapter footer nav + completion ---------------- */

  function buildChapterExtras(nav) {
    var currentId = document.body.dataset.chapter;
    if (!currentId) return;
    var flat = flatten(nav);
    var idx = flat.findIndex(function (x) { return x.ch.id === currentId; });
    if (idx === -1) return;

    // inject this act's storybook illustration under the hero
    var hero = document.querySelector(".ch-hero");
    if (hero && !document.querySelector(".ch-art")) {
      var act = flat[idx].act;
      hero.insertAdjacentElement("afterend",
        artFigure(ROOT + "assets/img/" + act.id + ".jpg",
          "Hand-drawn illustration for Act " + act.num + ": " + act.title, "ch-art"));
    }

    var host = document.querySelector("[data-chnav]");
    if (host) {
      host.innerHTML = "";
      if (idx > 0) {
        var prev = flat[idx - 1];
        var a = el("a", "prev");
        a.href = prev.ch.slug;
        a.appendChild(el("span", "dir", "Previous"));
        a.appendChild(el("span", "ch-nav-title", prev.ch.title));
        host.appendChild(a);
      }
      if (idx < flat.length - 1) {
        var next = flat[idx + 1];
        var b = el("a", "next");
        b.href = next.ch.slug;
        b.appendChild(el("span", "dir", "Next"));
        b.appendChild(el("span", "ch-nav-title", next.ch.title));
        host.appendChild(b);
      }
    }

    var btn = document.querySelector("[data-complete]");
    if (btn) {
      var refresh = function () {
        var done = !!getProgress()[currentId];
        btn.classList.toggle("done", done);
        btn.textContent = done ? "Completed — well done" : "Mark chapter complete";
      };
      refresh();
      btn.addEventListener("click", function () {
        var done = !!getProgress()[currentId];
        setDone(currentId, !done);
        refresh();
        buildSidebar(nav); // refresh ticks + meter
        if (!done) {
          var wrap = btn.parentElement;
          var b = el("span", "burst");
          wrap.appendChild(b);
          setTimeout(function () { b.remove(); }, 800);
        }
      });

      // keyboard navigation between chapters
      document.addEventListener("keydown", function (e) {
        var t = e.target.tagName;
        if (t === "INPUT" || t === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.key === "ArrowLeft" && idx > 0) location.href = flat[idx - 1].ch.slug;
        if (e.key === "ArrowRight" && idx < flat.length - 1) location.href = flat[idx + 1].ch.slug;
      });
    }
  }

  /* ---------------- index page ---------------- */

  function buildIndex(nav) {
    var host = document.getElementById("curriculum");
    if (!host) return;
    var progress = getProgress();
    var flat = flatten(nav);
    var doneCount = flat.filter(function (x) { return progress[x.ch.id]; }).length;

    var hp = document.querySelector("[data-home-progress]");
    if (hp) {
      hp.innerHTML = "";
      var meter = el("div", "meter");
      var fill = el("span");
      fill.style.width = (flat.length ? (100 * doneCount / flat.length) : 0) + "%";
      meter.appendChild(fill);
      hp.appendChild(meter);
      hp.appendChild(el("div", "home-progress-label",
        doneCount === 0
          ? flat.length + " chapters ahead of you. Start with Act I — or jump anywhere."
          : doneCount + " of " + flat.length + " chapters complete. Keep going."));
    }

    var heroEl = document.querySelector(".home-hero");
    if (heroEl && !document.querySelector(".home-art")) {
      heroEl.appendChild(artFigure("assets/img/home.jpg", "Hand-drawn illustration: lifting the hood of a wondrous machine", "home-art"));
    }

    host.innerHTML = "";
    var grid = el("div", "act-grid");
    nav.acts.forEach(function (act) {
      var card = el("section", "act-card reveal");
      card.appendChild(artFigure("assets/img/" + act.id + ".jpg", "Act " + act.num + " illustration", "act-art"));
      card.appendChild(el("div", "act-num", "Act " + act.num));
      card.appendChild(el("h2", null, act.title));
      card.appendChild(el("p", "act-theme", act.theme));

      var actDone = act.chapters.filter(function (c) { return progress[c.id]; }).length;
      var meter = el("div", "meter");
      var fill = el("span");
      fill.style.width = (100 * actDone / act.chapters.length) + "%";
      meter.appendChild(fill);
      card.appendChild(meter);

      var ol = el("ol");
      act.chapters.forEach(function (ch) {
        var li = el("li");
        var a = el("a");
        a.href = "chapters/" + ch.slug;
        a.title = ch.tagline;
        var tick = el("span", "tick" + (progress[ch.id] ? " done" : ""));
        a.appendChild(tick);
        a.appendChild(el("span", null, ch.title));
        li.appendChild(a);
        ol.appendChild(li);
      });
      card.appendChild(ol);
      grid.appendChild(card);
    });
    host.appendChild(grid);
  }

  /* ---------------- quiz ---------------- */

  function wireQuizzes() {
    document.querySelectorAll(".quiz .q").forEach(function (q) {
      var answer = (q.dataset.answer || "").trim().toLowerCase();
      q.querySelectorAll(".q-opts button").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (q.classList.contains("answered")) return;
          var pick = (btn.dataset.opt || "").trim().toLowerCase();
          if (pick === answer) {
            btn.classList.add("right");
            q.classList.add("answered");
            q.querySelectorAll(".q-opts button").forEach(function (b) { b.disabled = true; });
          } else {
            btn.classList.add("wrong");
            btn.disabled = true;
          }
        });
      });
    });
  }

  /* ---------------- walkthrough ---------------- */

  function wireWalkthroughs() {
    document.querySelectorAll(".walkthrough").forEach(function (w) {
      var lines = w.querySelectorAll(".wl-line");
      var annotated = 0;
      lines.forEach(function (line) {
        var note = line.querySelector(".wl-note");
        var code = line.querySelector("code");
        if (!note || !code) { line.classList.add("plain"); return; }
        annotated++;
        code.setAttribute("tabindex", "0");
        code.setAttribute("role", "button");
        code.setAttribute("aria-expanded", "false");
        var toggle = function () {
          var open = line.classList.toggle("open");
          code.setAttribute("aria-expanded", open ? "true" : "false");
        };
        code.addEventListener("click", toggle);
        code.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
        });
      });
      if (annotated && !w.querySelector(".wl-hint")) {
        w.appendChild(el("div", "wl-hint",
          "Click any line marked + to unfold what it does. " + annotated + " lines are annotated."));
      }
    });
  }

  /* ---------------- stepper ---------------- */

  function wireSteppers() {
    document.querySelectorAll(".stepper").forEach(function (s) {
      var steps = Array.prototype.slice.call(s.querySelectorAll(":scope > .step, :scope > .stepper-stage > .step"));
      if (!steps.length) return;

      // ensure a stage wrapper
      if (!s.querySelector(".stepper-stage")) {
        var stage = el("div", "stepper-stage");
        steps.forEach(function (st) { stage.appendChild(st); });
        s.insertBefore(stage, s.firstChild);
      }

      var i = 0;
      var controls = el("div", "stepper-controls");
      var back = el("button", null, "Back");
      var dots = el("div", "stepper-dots");
      var count = el("span", "stepper-count");
      var next = el("button", null, "Next");
      steps.forEach(function (_, k) {
        var d = el("i");
        d.addEventListener("click", function () { show(k); });
        dots.appendChild(d);
      });
      controls.appendChild(back);
      controls.appendChild(dots);
      controls.appendChild(count);
      controls.appendChild(next);
      s.appendChild(controls);

      function show(k) {
        i = Math.max(0, Math.min(steps.length - 1, k));
        steps.forEach(function (st, n) { st.classList.toggle("active", n === i); });
        dots.querySelectorAll("i").forEach(function (d, n) { d.classList.toggle("on", n === i); });
        back.disabled = i === 0;
        next.textContent = i === steps.length - 1 ? "Replay" : "Next";
        count.textContent = (i + 1) + " / " + steps.length;
      }
      back.addEventListener("click", function () { show(i - 1); });
      next.addEventListener("click", function () { show(i === steps.length - 1 ? 0 : i + 1); });
      show(0);
    });
  }

  /* ---------------- flip cards ---------------- */

  function wireFlips() {
    document.querySelectorAll(".flip").forEach(function (f) {
      if (!f.querySelector(".flip-inner")) {
        var inner = el("span", "flip-inner");
        while (f.firstChild) inner.appendChild(f.firstChild);
        f.appendChild(inner);
      }
      f.addEventListener("click", function () { f.classList.toggle("flipped"); });
    });
  }

  /* ---------------- viz bars & meters ---------------- */

  function wireBars() {
    document.querySelectorAll("[data-bars]").forEach(function (box) {
      var bars = Array.prototype.slice.call(box.querySelectorAll(".bar"));
      if (!bars.length) return;
      var unit = box.dataset.unit || "";
      var titleText = box.dataset.title || "";
      var max = Math.max.apply(null, bars.map(function (b) { return parseFloat(b.dataset.value) || 0; }));
      box.classList.add("viz-bars");
      box.innerHTML = "";
      if (titleText) box.appendChild(el("div", "vb-title", titleText));
      bars.forEach(function (b) {
        var v = parseFloat(b.dataset.value) || 0;
        var row = el("div", "vb-row");
        row.appendChild(el("span", "vb-label", b.dataset.label || ""));
        var track = el("div", "vb-track");
        var fill = el("div", "vb-fill");
        fill.style.width = (max ? (100 * v / max) : 0) + "%";
        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(el("span", "vb-value",
          (b.dataset.display || v.toLocaleString()) + (unit ? " " + unit : "")));
        box.appendChild(row);
      });
      if (box.dataset.note) box.appendChild(el("div", "vb-note", box.dataset.note));
    });

    document.querySelectorAll("[data-meter]").forEach(function (m) {
      var v = Math.max(0, Math.min(100, parseFloat(m.dataset.value) || 0));
      m.classList.add("meter");
      m.innerHTML = "";
      var fill = el("span");
      fill.style.width = v + "%";
      m.appendChild(fill);
    });
  }

  /* ---------------- reveal on scroll ---------------- */

  function wireReveal() {
    var targets = document.querySelectorAll(
      "#main .panel, #main .quiz, #main .stepper, #main .walkthrough, #main .pyrun, " +
      "#main .flipgrid, #main .viz-tiles, #main .viz-bars, #main .takeaways, #main .tbl, #main .reveal"
    );
    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (t) { t.classList.add("reveal", "in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    targets.forEach(function (t, i) {
      t.classList.add("reveal");
      t.style.transitionDelay = (i % 4) * 70 + "ms";
      io.observe(t);
    });
  }

  /* ---------------- boot ---------------- */

  document.addEventListener("DOMContentLoaded", function () {
    wireQuizzes();
    wireWalkthroughs();
    wireSteppers();
    wireFlips();
    wireBars();
    wireReveal();

    fetch(ROOT + "nav.json")
      .then(function (r) { return r.json(); })
      .then(function (nav) {
        buildSidebar(nav);
        buildChapterExtras(nav);
        buildIndex(nav);
      })
      .catch(function () {
        var side = document.getElementById("sidebar");
        if (side) side.innerHTML =
          '<div class="side-head"><div class="side-title">Under the Hood</div>' +
          '<div class="side-sub">Serve this folder over HTTP to enable navigation — run:' +
          ' <code>python3 -m http.server 8788</code> inside the academy folder, then open' +
          ' <code>http://localhost:8788</code>.</div></div>';
      });
  });
})();
