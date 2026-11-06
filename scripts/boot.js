/* demo site (0.9.21): the full version from the cache when this browser has one (after sign-in with a valid plan), else the demo.
   The full files live in the cache «vst-full» and the service worker serves them under full/<version>/; without them: the demo. */
(function () {
  var V = "0.9.22", DEMO = ["scripts/i18n.js?v=0.9.22", "scripts/i18n/rep.fr.js?v=0.9.22", "scripts/i18n/rep.nl.js?v=0.9.22", "scripts/i18n/ui.en.js?v=0.9.22", "scripts/i18n/ui.nl.js?v=0.9.22", "scripts/i18n/ui.ru.js?v=0.9.22", "scripts/xlsx.js?v=0.9.22", "scripts/core.js?v=0.9.22", "scripts/catalog.js?v=0.9.22", "scripts/inspark.js?v=0.9.22", "scripts/units.js?v=0.9.22", "scripts/access.js?v=0.9.22", "scripts/plans.js?v=0.9.22", "scripts/cloud.js?v=0.9.22", "scripts/platform.js?v=0.9.22", "scripts/demo_stub.js?v=0.9.22", "scripts/themes.js?v=0.9.22", "scripts/checklist.js?v=0.9.22", "scripts/nota.js?v=0.9.22", "scripts/report.js?v=0.9.22", "scripts/team.js?v=0.9.22", "scripts/ui.js?v=0.9.22", "scripts/ui_edit.js?v=0.9.22", "scripts/ui_plans.js?v=0.9.22", "scripts/ui_team.js?v=0.9.22", "scripts/ui_table.js?v=0.9.22", "scripts/ui_check.js?v=0.9.22", "scripts/ui_cat.js?v=0.9.22", "scripts/ui_ins.js?v=0.9.22", "scripts/ui_units.js?v=0.9.22", "scripts/main.js?v=0.9.22"], f = null;
  try { f = JSON.parse(localStorage.getItem('vst.full.v1') || 'null'); } catch (e) { f = null; }
  var full = !!(f && /^[A-Za-z0-9_.-]+$/.test(f.version) && f.files && f.files.length && navigator.serviceWorker && navigator.serviceWorker.controller);
  var list = full ? f.files.filter(function (x) { return /\.js$/.test(x); }).map(function (x) { return 'full/' + f.version + '/' + x; }) : DEMO;
  if (full) { window.VST_EDITION = 'full'; window.VST_FULL = f.version; }
  var failed = false;
  list.forEach(function (src) {
    var s = document.createElement('script'); s.src = src; s.async = false;
    if (full) s.onerror = function () { if (failed) return; failed = true; try { localStorage.removeItem('vst.full.v1'); } catch (e) { } location.reload(); }; // cache gone: the demo
    document.body.appendChild(s);
  });
})();
