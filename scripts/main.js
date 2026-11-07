/* ---------- boot ---------- */
I18N.loadCustom();
Settings.load(); useStyle();
Access.load();
Auth.load();
I18N.set('ui', Settings.v.uiLang || 'en'); I18N.set('rep', Settings.v.repLang || 'nl');
document.documentElement.lang = I18N.cur.ui;
Store.loadLocal();
Store.setState(STANDALONE ? 'local' : 'connecting');
/* the first screen waits for the device copy (IndexedDB), so no empty list is shown; at most 1,2 s on a slow device */
let shown = false; const show = () => { if (!shown) { shown = true; render(); } };
Store.loadDevice().then((changed) => {
  if (DEMO_ED && !Object.keys(Store.projects).length) { const ex = exampleProject(); Store.projects[ex.id] = ex; touch(ex); changed = true; addExamplePlan(ex).then(() => { if (S.view === 'home') render(); }); } // demo edition: start with the example
  setTimeout(() => AutoBackup.auto().catch(() => { }), 3000); // 0.9.25: automatic copy of the projects after an update and once a day
  if (!shown) show(); else if (changed && !S.ed && !S.dlg && !(document.activeElement && document.activeElement.matches('input, textarea, select'))) render(); });
setTimeout(show, 1200);
Platform.init();
/* Android app: is a newer APK on the website? (0.9.20) — a banner on the home screen */
const updCheck = (force) => Updater.check(force).then((i) => { if (i && S.view === 'home' && !S.ed && !S.dlg) render(); }).catch(() => { });
setTimeout(updCheck, 2500);
if (window.VST_FULL) setTimeout(() => FullApp.check(), 6000); // the full version of the demo site: newer one on the server, or the plan ended (0.9.21)
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') updCheck(false); });
Store.connect().then((changed) => {
  if (Store.mode !== 'cloud' && Store.state === 'connecting') Store.setState('local');
  if (changed && !S.ed && !S.dlg && !(document.activeElement && document.activeElement.matches('input, textarea, select'))) render();
});
if (STANDALONE && !Platform.native() && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}
/* signed in: role and plan from the server at start and when the connection comes back (offline the last session stays valid for 14 days) */
function cloudSync() {
  if (!cloudOn() || !Auth.user()) return;
  const gate = () => { if (gateOn()) render(); };
  if (!navigator.onLine) { if (gateOn()) { acctState().err = cloudMsg({ code: 'offline' }); gate(); } return; }
  Cloud.refresh().then(() => { if (gateOn()) acctState().err = ''; if (gateOn() || !(document.activeElement && document.activeElement.matches('input, textarea, select'))) render(); })
    .catch(e => { console.warn('cloud', e); if (gateOn()) { acctState().err = cloudMsg(e); gate(); } });
}
/* first a link from an e-mail (confirmation, password reset), then the session from the server */
authFromLink().then((t) => {
  if (!t || t === 'error') { if (t === 'error' && gateOn()) render(); cloudSync(); return; }
  Cloud.refresh().then(() => {
    render();
    if (t === 'recovery') {
      const A = acctState(); A.pwOpen = true; A.info = __('Signed in with the link from the e-mail: choose a new password below.');
      if (!gateOn()) { S.dlg = { type: 'settings' }; renderSheet(); } else render();
    } else toast(__('E-mail address confirmed: you are signed in'));
  }).catch(e => { console.warn('cloud', e); acctState().err = cloudMsg(e); render(); });
});
window.addEventListener('online', cloudSync);
/* the «Password and devices» section of the account card stays open across repaints */
document.addEventListener('toggle', (e) => { const d = e.target; if (d && d.dataset && d.dataset.acctdet !== undefined) acctState().pwOpen = d.open; }, true);
