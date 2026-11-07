/* Ventilation Setup Tool — offline cache
   The page itself (index.html, manifest) comes from the network first, so an update is used at the next start with internet;
   without internet (or after 4 s without an answer) the saved copy opens. Scripts and icons: saved copy first, refreshed in the background.
   0.9.18: the app is index.html + styles/app.css + scripts/*.js; their URLs carry ?v=<version> and are matched exactly. */
const CACHE = 'vst-demo-v44';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'vendor/jspdf.umd.min.js', 'vendor/jspdf.plugin.autotable.min.js', 'vendor/pdf.min.js', 'vendor/pdf.worker.min.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png', 'icons/apple-touch-icon.png', 'icons/favicon-64.png', "styles/app.css?v=0.9.25", "styles/Outfit-ui.woff", "scripts/edition.js?v=0.9.25", "scripts/boot.js?v=0.9.25", "scripts/i18n.js?v=0.9.25", "scripts/i18n/rep.fr.js?v=0.9.25", "scripts/i18n/rep.nl.js?v=0.9.25", "scripts/i18n/ui.en.js?v=0.9.25", "scripts/i18n/ui.nl.js?v=0.9.25", "scripts/i18n/ui.ru.js?v=0.9.25", "scripts/xlsx.js?v=0.9.25", "scripts/core.js?v=0.9.25", "scripts/catalog.js?v=0.9.25", "scripts/inspark.js?v=0.9.25", "scripts/units.js?v=0.9.25", "scripts/access.js?v=0.9.25", "scripts/plans.js?v=0.9.25", "scripts/cloud.js?v=0.9.25", "scripts/platform.js?v=0.9.25", "scripts/demo_stub.js?v=0.9.25", "scripts/themes.js?v=0.9.25", "scripts/checklist.js?v=0.9.25", "scripts/nota.js?v=0.9.25", "scripts/report.js?v=0.9.25", "scripts/team.js?v=0.9.25", "scripts/ui.js?v=0.9.25", "scripts/ui_edit.js?v=0.9.25", "scripts/ui_plans.js?v=0.9.25", "scripts/ui_team.js?v=0.9.25", "scripts/ui_table.js?v=0.9.25", "scripts/ui_check.js?v=0.9.25", "scripts/ui_cat.js?v=0.9.25", "scripts/ui_ins.js?v=0.9.25", "scripts/ui_units.js?v=0.9.25", "scripts/main.js?v=0.9.25"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== 'vst-full').map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
// 0.9.25: a page that opened without this worker in control (iPhone after an update, Ctrl+Shift+R) asks to be taken over, so the full version of the demo site can load
self.addEventListener('message', (e) => { if (e.data === 'claim') e.waitUntil(self.clients.claim()); });
const save = (req, res) => { if (res && res.ok && res.type === 'basic') { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return res; };
function networkFirst(req) {
  return new Promise((resolve) => {
    let done = false; const finish = (r) => { if (!done && r) { done = true; resolve(r); } };
    const saved = () => caches.match(req, { ignoreSearch: true }).then((h) => h || caches.match('index.html'));
    const timer = setTimeout(() => saved().then(finish), 4000);
    fetch(req).then((res) => { clearTimeout(timer); finish(save(req, res)); })
      .catch(() => { clearTimeout(timer); saved().then((h) => finish(h || Response.error())); });
  });
}
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.includes('/full/')) { // 0.9.21: the full version of the demo site, put into «vst-full» after sign-in
    e.respondWith(caches.open('vst-full').then((c) => c.match(req, { ignoreSearch: true })).then((hit) => hit || new Response('', { status: 404 })));
  } else if (url.origin === location.origin) {
    const page = req.mode === 'navigate' || /\/$|\/index\.html$|\.webmanifest$/.test(url.pathname);
    if (page) { e.respondWith(networkFirst(req)); return; }
    const exact = /\/(scripts|styles)\//.test(url.pathname); // 0.9.18: style and script files carry ?v=<version>: an update never mixes old and new files
    e.respondWith(caches.match(req, { ignoreSearch: !exact }).then((hit) => {
      const net = fetch(req).then((res) => save(req, res)).catch(() => hit);
      return hit || net;
    }));
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return res; })));
  }
});
