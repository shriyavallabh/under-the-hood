/* Under the Hood — in-browser Python runner (Pyodide).
   Each .pyrun block gets Run/Reset controls. Pyodide (~10 MB) is loaded
   lazily from the CDN on the first Run click, once per page, and every
   block runs in its own namespace so examples never leak into each other. */

(function () {
  "use strict";

  var PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
  var pyodidePromise = null;

  function loadPyodideOnce(statusEl) {
    if (pyodidePromise) return pyodidePromise;
    statusEl.textContent = "Loading Python… (first time only, ~10-20s)";
    pyodidePromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = PYODIDE_URL;
      s.onload = function () {
        window.loadPyodide().then(resolve, reject);
      };
      s.onerror = function () { reject(new Error("Could not load Pyodide — check your internet connection.")); };
      document.head.appendChild(s);
    });
    return pyodidePromise;
  }

  function autoGrow(ta) {
    ta.style.height = "auto";
    ta.style.height = Math.min(560, ta.scrollHeight + 4) + "px";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var blocks = document.querySelectorAll(".pyrun");
    if (!blocks.length) return;

    blocks.forEach(function (block, n) {
      var src = block.querySelector(".py-src");
      if (!src) return;
      var original = src.value.replace(/^\n/, "");
      src.value = original;

      var head = block.querySelector(".pyrun-head");
      if (!head) {
        head = document.createElement("div");
        head.className = "pyrun-head";
        var t = document.createElement("span");
        t.className = "pyrun-title";
        t.textContent = block.dataset.title || "Try it yourself";
        head.appendChild(t);
        block.insertBefore(head, block.firstChild);
      }

      var actions = document.createElement("div");
      actions.className = "pyrun-actions";
      var status = document.createElement("span");
      status.className = "py-status";
      status.setAttribute("aria-live", "polite");
      var runBtn = document.createElement("button");
      runBtn.className = "py-run-btn";
      runBtn.textContent = "Run";
      var resetBtn = document.createElement("button");
      resetBtn.className = "py-reset-btn";
      resetBtn.textContent = "Reset";
      actions.appendChild(status);
      actions.appendChild(resetBtn);
      actions.appendChild(runBtn);
      head.appendChild(actions);

      var out = block.querySelector(".py-out");
      if (!out) {
        out = document.createElement("pre");
        out.className = "py-out";
        out.setAttribute("aria-live", "polite");
        block.appendChild(out);
      }

      autoGrow(src);
      src.addEventListener("input", function () { autoGrow(src); });
      // Tab inserts spaces instead of leaving the editor
      src.addEventListener("keydown", function (e) {
        if (e.key === "Tab") {
          e.preventDefault();
          var st = src.selectionStart, en = src.selectionEnd;
          src.value = src.value.slice(0, st) + "    " + src.value.slice(en);
          src.selectionStart = src.selectionEnd = st + 4;
        }
      });

      resetBtn.addEventListener("click", function () {
        src.value = original;
        out.textContent = "";
        status.textContent = "";
        autoGrow(src);
      });

      runBtn.addEventListener("click", function () {
        runBtn.disabled = true;
        out.textContent = "";
        loadPyodideOnce(status).then(function (py) {
          status.textContent = "Running…";
          var buffer = [];
          py.setStdout({ batched: function (line) { buffer.push(line); } });
          py.setStderr({ batched: function (line) { buffer.push(line); } });
          var ns = py.globals.get("dict")();
          return py.runPythonAsync(src.value, { globals: ns })
            .then(function (result) {
              var text = buffer.join("\n");
              if (result !== undefined && result !== null && String(result) !== "undefined") {
                var r = String(result);
                if (r && r !== "None") text += (text ? "\n" : "") + r;
              }
              out.textContent = text || "(no output — add a print() to see something)";
              status.textContent = "Done";
            })
            .catch(function (err) {
              var text = buffer.join("\n");
              out.textContent = text ? text + "\n" : "";
              var span = document.createElement("span");
              span.className = "py-err";
              span.textContent = String(err.message || err)
                .replace(/^PythonError:\s*/, "");
              out.appendChild(span);
              status.textContent = "Error — read the traceback bottom-up";
            })
            .finally(function () { ns.destroy(); });
        }).catch(function (err) {
          out.textContent = "";
          var span = document.createElement("span");
          span.className = "py-err";
          span.textContent = String(err.message || err);
          out.appendChild(span);
          status.textContent = "";
        }).finally(function () {
          runBtn.disabled = false;
        });
      });
    });
  });
})();
