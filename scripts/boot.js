/* demo site (0.9.21): the full version from the cache when this browser has one (after sign-in with a valid plan), else the demo.
   The full files live in the cache «vst-full» and the service worker serves them under full/<version>/; without them: the demo. */
(function () {
  var V = "0.9.25", DEMO = ["scripts/i18n.js?v=0.9.25", "scripts/i18n/rep.fr.js?v=0.9.25", "scripts/i18n/rep.nl.js?v=0.9.25", "scripts/i18n/ui.en.js?v=0.9.25", "scripts/i18n/ui.nl.js?v=0.9.25", "scripts/i18n/ui.ru.js?v=0.9.25", "scripts/xlsx.js?v=0.9.25", "scripts/core.js?v=0.9.25", "scripts/catalog.js?v=0.9.25", "scripts/inspark.js?v=0.9.25", "scripts/units.js?v=0.9.25", "scripts/access.js?v=0.9.25", "scripts/plans.js?v=0.9.25", "scripts/cloud.js?v=0.9.25", "scripts/platform.js?v=0.9.25", "scripts/demo_stub.js?v=0.9.25", "scripts/themes.js?v=0.9.25", "scripts/checklist.js?v=0.9.25", "scripts/nota.js?v=0.9.25", "scripts/report.js?v=0.9.25", "scripts/team.js?v=0.9.25", "scripts/ui.js?v=0.9.25", "scripts/ui_edit.js?v=0.9.25", "scripts/ui_plans.js?v=0.9.25", "scripts/ui_team.js?v=0.9.25", "scripts/ui_table.js?v=0.9.25", "scripts/ui_check.js?v=0.9.25", "scripts/ui_cat.js?v=0.9.25", "scripts/ui_ins.js?v=0.9.25", "scripts/ui_units.js?v=0.9.25", "scripts/main.js?v=0.9.25"], f = null;
  try { f = JSON.parse(localStorage.getItem('vst.full.v1') || 'null'); } catch (e) { f = null; }
  var has = !!(f && /^[A-Za-z0-9_.-]+$/.test(f.version) && f.files && f.files.length && navigator.serviceWorker);
  var full = has && !!navigator.serviceWorker.controller;
  /* 0.9.25: the full version is installed but this page is not served by the service worker (iPhone after an update, Ctrl+Shift+R).
     Before: the demo opened with its own (empty) project list, so the working project seemed lost. Now: the worker takes the page over
     (or one reload), then the full version starts with the user's projects. Only when that fails twice: the demo, as before. */
  var tries = 0; try { tries = +sessionStorage.getItem('vst.boot.retry') || 0; } catch (e) { }
  if (has && !full && tries < 2) {
    try { sessionStorage.setItem('vst.boot.retry', String(tries + 1)); } catch (e) { }
    document.body.insertAdjacentHTML('beforeend', '<p style="font:16px system-ui,sans-serif;text-align:center;margin-top:40vh;color:#0F3D3E">Ventilation Setup Tool…</p>');
    var again = function () { location.reload(); };
    navigator.serviceWorker.addEventListener('controllerchange', again);
    navigator.serviceWorker.register('sw.js').then(function () { return navigator.serviceWorker.ready; })
      .then(function (r) { if (navigator.serviceWorker.controller) again(); else if (r.active) r.active.postMessage('claim'); }).catch(again);
    setTimeout(again, 4000);
    return;
  }
  try { sessionStorage.removeItem('vst.boot.retry'); } catch (e) { }
  var list = full ? f.files.filter(function (x) { return /\.js$/.test(x); }).map(function (x) { return 'full/' + f.version + '/' + x; }) : DEMO;
  if (full) { window.VST_EDITION = 'full'; window.VST_FULL = f.version; }
  else document.title = 'Ventilation Setup Tool · Demo'; // 0.9.24: «Demo» only in the tab title of the demo, not in the installed app's name
  var failed = false;
  list.forEach(function (src) {
    var s = document.createElement('script'); s.src = src; s.async = false;
    if (full) s.onerror = function () { if (failed) return; failed = true; try { localStorage.removeItem('vst.full.v1'); } catch (e) { } location.reload(); }; // cache gone: the demo
    document.body.appendChild(s);
  });
})();
