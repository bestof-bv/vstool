/* ---------- access: roles in the organisation, subscription plan, permissions ----------
   The server (accounts, organisations, Google Play subscriptions) is the source of truth; the app keeps the last
   checked session for offline work. Until accounts are live (standalone PWA, artifact) the user is the owner of a
   local organisation with all features. Settings → «Account and access» can preview any role and plan. */
/** edition of this build (0.9.21): 'demo' on the public demo site (scripts/edition.js), else 'full' */
const EDITION = (typeof VST_EDITION === 'string' && VST_EDITION === 'demo') ? 'demo' : 'full';
const DEMO_ED = EDITION === 'demo';
/** limits of the demo: the demo site, and (0.9.22) the demo account of the full version too */
const demoLimited = () => DEMO_ED || Demo.on();
/** the demo edition: 1 own project (+ the example), 20 points a project; no crews, Excel import, backups, own catalogue entries, own style */
const DEMO_LIMITS = { projects: 1, points: 20 };
const DEMO_OFF = new Set(['import.excel', 'package.manage', 'project.backup', 'catalog.edit', 'org.profile', 'org.texts', 'org.languages', 'org.users', 'org.billing']);
const ROLES = ['owner', 'admin', 'lead', 'tech', 'sub', 'viewer'];
const ALL = ROLES, STAFF = ['owner', 'admin', 'lead', 'tech'], LEADS = ['owner', 'admin', 'lead'], ADMINS = ['owner', 'admin'];
/** permission → roles that have it */
const PERMS = {
  'project.create': STAFF,
  'project.delete': LEADS,
  'project.info': STAFF,            // project data, instruments, tolerances
  'project.backup': STAFF,          // backup file of a project (0.9.21: own permission, not in the demo edition)
  'catalog.edit': STAFF,            // own entries in the catalogue of technical sheets
  'structure.edit': STAFF,          // units, codes, masters, design flows (crews: only their own new points)
  'point.add': ['owner', 'admin', 'lead', 'tech', 'sub'],
  'point.delete': LEADS,
  'point.deleteOwn': ['owner', 'admin', 'lead', 'tech', 'sub'],
  'measure.edit': ['owner', 'admin', 'lead', 'tech', 'sub'],
  'import.excel': STAFF,
  'package.manage': LEADS,          // crews: packages, Excel measuring sheets, merge
  'report.edit': LEADS,             // conclusion, remarks, cover, signature
  'checklist.edit': STAFF,          // commissioning checklist (not in crew packages)
  'report.export': ['owner', 'admin', 'lead', 'tech', 'viewer'],
  'org.profile': ADMINS,            // company, logo, address, footer
  'org.texts': ADMINS,              // own report texts and style
  'org.languages': ADMINS,          // own language packs
  'org.users': ADMINS,              // invite users, roles
  'org.billing': ['owner'],         // subscription
};
/** plan → seats and features; a permission that needs a feature is locked in plans without it */
const PLANS = {
  local: { seats: 1, features: ['branding', 'teams', 'roles', 'texts', 'style', 'langpacks'] },
  demo: { seats: 1, features: ['branding', 'teams', 'roles', 'texts', 'style', 'langpacks'], demo: true },
  trial: { seats: 3, days: 14, features: ['branding', 'teams', 'roles', 'texts', 'style', 'langpacks'] },
  solo: { seats: 1, features: ['branding'] },
  team: { seats: 5, features: ['branding', 'teams', 'roles'] },
  business: { seats: 15, features: ['branding', 'teams', 'roles', 'texts', 'style', 'langpacks'] },
  expired: { seats: 0, features: [], readOnly: true },
};
const PLAN_ORDER = ['solo', 'team', 'business'];
const NEEDS = { 'package.manage': 'teams', 'org.users': 'roles', 'org.texts': 'texts', 'org.languages': 'langpacks' };
/** what still works when the subscription has ended or the session is too old offline */
const READONLY_OK = ['report.export', 'org.billing'];
const OFFLINE_DAYS = 14;
/** buttons that also show data: disabled (not hidden) when the role may not change it */
const SHOW_RO = new Set(['editSys', 'fanEdit']);
/** buttons (data-act) → permission */
const ACT_PERM = {
  newProject: 'project.create', example: 'project.create',
  askDelProject: 'project.delete', delProject: 'project.delete',
  addIns: 'project.info', delIns: 'project.info', insDupP: 'project.info', insFill: 'measure.edit', invSend: 'org.users', invCancel: 'org.users', memRemove: 'org.users', backup: 'project.backup',
  catNew: 'catalog.edit', catEdit: 'catalog.edit', catCopy: 'catalog.edit', catDel: 'catalog.edit', catDup: 'catalog.edit', catSave: 'catalog.edit', catTpl: 'catalog.edit',
  addSys: 'structure.edit', editSys: 'structure.edit', askDelSys: 'structure.edit', delSys: 'structure.edit',
  fanAdd: 'structure.edit', fanEdit: 'structure.edit', fanCopy: 'structure.edit', fanDel: 'structure.edit', fanAll: 'structure.edit', sysLeave: 'structure.edit', sysUp: 'structure.edit', sysDown: 'structure.edit', sysSort: 'structure.edit',
  reorder: 'structure.edit', ptUp: 'structure.edit', ptDown: 'structure.edit', // 0.9.18: order on a branch
  addPt: 'point.add', addDevice: 'point.add', addChild: 'point.add', dupPt: 'point.add', bulk: 'point.add', bulkCreate: 'point.add', devKid: 'structure.edit',
  importXlsx: 'import.excel', impApply: 'import.excel', importTpl: 'import.excel',
  pkNew: 'package.manage', pkCreate: 'package.manage', pkMerge: 'package.manage', pkDel: 'package.manage', pkAskDel: 'package.manage', pkCloseRec: 'package.manage', pkAccept: 'package.manage', pkSheet: 'package.manage', pkSend: 'package.manage',
  genConclusion: 'report.edit', genConclusionYes: 'report.edit', clearSig: 'report.edit', cvCrop: 'report.edit', cvDel: 'report.edit', pdfUse: 'report.edit', pgPick: 'report.edit', cropDone: 'report.edit',
  xlsx: 'report.export', pdf: 'report.export', pdfZip: 'report.export', clSet: 'checklist.edit', clReset: 'checklist.edit', clDraft: 'checklist.edit', clGo: 'report.export',
  setStatus: 'measure.edit', moreRd: 'measure.edit', setKind: 'structure.edit', setDir: 'structure.edit', setShape: 'measure.edit', startMeasure: 'measure.edit',
  askDelPhoto: 'measure.edit', delPhoto: 'measure.edit',
  pvPlace: 'measure.edit', pvPlaceOne: 'measure.edit', pvMovePin: 'measure.edit', pinDel: 'measure.edit', pvFrag: 'measure.edit', pvFragHere: 'measure.edit', pvTake: 'measure.edit', pvTakePage: 'measure.edit', phEdit: 'measure.edit',
  docAskDel: 'project.info', docDel: 'project.info', docMoveRev: 'project.info',
  logoDefault: 'org.profile', logoNone: 'org.profile', langTpl: 'org.languages', langDel: 'org.languages',
  styleSel: 'org.profile', styleAskDel: 'org.profile', styleDel: 'org.profile', styleFirmYes: 'org.profile', styleExport: 'org.profile',
  seSave: 'org.profile', seReset: 'org.profile', seLogoDel: 'org.profile', seLogoStd: 'org.profile', seCell: 'org.profile',
};

/** demo account «demo / demo»: to get to know the app without a server. In the app and the PWA the demo has its own
   projects (apart from the projects of the account); reports of the demo are marked DEMO. */
const Demo = {
  LS: 'inregelaar.demo.v1', v: null,
  on() { if (DEMO_ED) return !FullApp.want(); if (this.v === null) { try { this.v = localStorage.getItem(this.LS) === '1'; } catch (e) { this.v = false; } } return this.v; },
  set(on) { if (DEMO_ED) { FullApp.setWant(!on); return; } if (on && FullApp.running()) { FullApp.clear().then(() => location.reload()); return; } this.v = !!on; try { if (on) localStorage.setItem(this.LS, '1'); else localStorage.removeItem(this.LS); } catch (e) { } },
  is(user, pass) { return String(user || '').trim().toLowerCase() === 'demo' && String(pass || '') === 'demo'; },
};

const Access = {
  LS: 'inregelaar.session.v1',
  s: null,
  /** no account yet: owner of a local organisation */
  local() { return { user: { id: 'local', email: '', name: Settings.v.technician || '' }, org: { id: 'local', name: Settings.v.company || '' }, role: 'owner', plan: 'local', status: 'local', until: 0, checkedAt: 0 }; },
  demo() { return { user: { id: 'demo', email: 'demo', name: 'Demo' }, org: { id: 'demo', name: 'Demo' }, role: 'owner', plan: 'demo', status: 'demo', until: 0, checkedAt: 0 }; },
  load() { try { const o = JSON.parse(localStorage.getItem(this.LS) || 'null'); this.s = o && o.role ? o : null; } catch (e) { this.s = null; } return this; },
  /** store the session returned by the server (role, plan, until …) */
  setSession(o) { this.s = Object.assign({}, o, { checkedAt: Date.now() }); try { localStorage.setItem(this.LS, JSON.stringify(this.s)); } catch (e) { } },
  clear() { this.s = null; try { localStorage.removeItem(this.LS); } catch (e) { } },
  /** effective session: server session or local, with the preview of Settings applied */
  cur(real) {
    const base = Demo.on() ? this.demo() : this.s || this.local(); const sim = real ? null : Settings.v.sim;
    const o = Object.assign({}, base, sim && sim.on ? { role: sim.role || base.role, plan: sim.plan || base.plan, preview: true } : {});
    if (!ROLES.includes(o.role)) o.role = 'viewer';
    const now = Date.now();
    if (o.plan !== 'local' && o.until && o.until < now) o.state = 'expired';
    else if (o.status !== 'local' && o.status !== 'demo' && !o.preview && o.checkedAt && now - o.checkedAt > OFFLINE_DAYS * 864e5) o.state = 'offline';
    else o.state = 'ok';
    return o;
  },
  planOf(o) { return o.state === 'expired' || o.state === 'offline' ? PLANS.expired : (PLANS[o.plan] || PLANS.expired); },
  /** the preview of another role or plan only takes away: what the own role and plan do not include stays locked */
  plan() {
    const o = this.cur(); const p = this.planOf(o); if (!o.preview) return p;
    const r = this.planOf(this.cur(true));
    return Object.assign({}, p, { features: p.features.filter(f => r.features.includes(f)), readOnly: !!(p.readOnly || r.readOnly) });
  },
  has(feature) { return this.plan().features.includes(feature); },
  role() { return this.cur().role; },
  /** {ok, kind: 'role' | 'plan' | 'readonly' | 'preview', need} for a session o (role, plan, state) */
  checkAs(o, perm) {
    const roles = PERMS[perm]; if (!roles) return { ok: true };
    const pl = this.planOf(o);
    if (!roles.includes(o.role)) return { ok: false, kind: 'role' };
    if (demoLimited() && DEMO_OFF.has(perm)) return { ok: false, kind: 'demo' };
    if (pl.readOnly && !READONLY_OK.includes(perm)) return { ok: false, kind: 'readonly', state: o.state };
    const f = NEEDS[perm]; if (f && !pl.features.includes(f)) return { ok: false, kind: 'plan', need: PLAN_ORDER.find(k => PLANS[k].features.includes(f)) || 'business' };
    return { ok: true };
  },
  check(perm) {
    const o = this.cur(); const c = this.checkAs(o, perm); if (!c.ok || !o.preview) return c;
    return this.checkAs(this.cur(true), perm).ok ? c : { ok: false, kind: 'preview' };
  },
  can(perm) { return this.check(perm).ok; },
  why(perm) {
    const c = this.check(perm); if (c.ok) return '';
    if (c.kind === 'role') return __('Not available for your role ({role})', { role: L.role ? L.role[this.role()] : this.role() });
    if (c.kind === 'demo') return __('Not in the demo: register for the full version');
    if (c.kind === 'preview') return __('Only shown in the preview: your own role or plan does not include it');
    if (c.kind === 'readonly') return c.state === 'offline' ? __('Connect to the internet to check your subscription') : __('The subscription has ended: you can open and export, not edit');
    return __('Available in the {plan} plan', { plan: (L.plan || {})[c.need] || c.need });
  },
  /** may this point be deleted (package rules + role) */
  canDeletePt(pt) { return this.can('point.delete') || (!!pt.added && this.can('point.deleteOwn')); },
  /** permission needed to change an input */
  fieldPerm(el) {
    const d = el.dataset;
    if (d.set !== undefined) return d.set === 'technician' ? null : 'org.profile';
    if (el.id === 'logoFile' || el.id === 'styleFile') return 'org.profile';
    if (el.dataset.se !== undefined || el.dataset.seText !== undefined || el.dataset.seLogo !== undefined) return 'org.profile';
    if (el.id === 'langFile') return 'org.languages';
    if (el.id === 'importXlsxFile') return 'import.excel';
    if (el.id === 'pkResFile') return 'package.manage';
    if (d.addphoto !== undefined || d.phcap !== undefined) return 'measure.edit';
    if (d.cover !== undefined) return 'report.edit';
    if (d.pk !== undefined) return 'package.manage';
    if (d.bk !== undefined) return 'point.add';
    if (d.adj !== undefined || d.fan !== undefined || d.catpt !== undefined) return 'measure.edit';
    if (d.fanread !== undefined || d.sysjoin !== undefined) return 'structure.edit';
    if (d.inspreset !== undefined || d.insfrom !== undefined || d.docname !== undefined || d.docadd !== undefined || d.docrev !== undefined || d.pvtitle !== undefined) return 'project.info';
    if (d.insdef !== undefined) return 'measure.edit';
    if (d.clNote !== undefined || d.clDnote !== undefined) return 'checklist.edit';
    if (d.f === undefined) return null;
    const f = d.f;
    if (d.pt) return STRUCT_PATHS.includes(f) || f === 'duct.main' ? 'structure.edit' : 'measure.edit';
    if (d.sys) return /^meas\./.test(f) || f === 'note' ? 'measure.edit' : 'structure.edit';
    if (d.ins) return 'project.info';
    if (d.grp) return 'structure.edit';
    if (/^(report|cover)\./.test(f)) return 'report.edit';
    if (/^notes\./.test(f)) return 'measure.edit';
    return 'project.info';
  },
  /** after a render: hide what the role may not do, lock what the plan does not include, disable inputs */
  decorate(root) {
    if (!root) return;
    root.querySelectorAll('[data-act]').forEach(el => {
      const perm = ACT_PERM[el.dataset.act]; if (!perm) return; const c = this.check(perm); if (c.ok) return;
      if (c.kind === 'role') { if (SHOW_RO.has(el.dataset.act)) { el.disabled = true; el.classList.add('ro'); } else el.hidden = true; return; }
      el.classList.add('locked'); el.setAttribute('aria-disabled', 'true'); el.title = this.why(perm);
    });
    root.querySelectorAll('input, select, textarea').forEach(el => {
      if (el.disabled) return; const perm = this.fieldPerm(el); if (!perm) return;
      if (!this.can(perm)) { el.disabled = true; el.closest('label.btn')?.classList.add('locked'); }
    });
  },
  /** click guard: returns false (and explains) when the action is not allowed */
  allow(act) { const perm = ACT_PERM[act]; if (!perm || this.can(perm)) return true; toast(this.why(perm)); return false; },
  /** demo edition: room for one more project / point? (explains when not) */
  demoRoom(kind, p) {
    if (!demoLimited()) return true;
    if (kind === 'project') { const own = Object.values(Store.projects || {}).filter(x => x && !x.example).length; if (own < DEMO_LIMITS.projects) return true; toast(__('Demo: {n} project. Register for the full version.', { n: DEMO_LIMITS.projects })); return false; }
    if (kind === 'point') { if (!p || (p.points || []).length < DEMO_LIMITS.points) return true; toast(__('Demo: up to {n} points a project. Register for the full version.', { n: DEMO_LIMITS.points })); return false; }
    return true;
  },
};
