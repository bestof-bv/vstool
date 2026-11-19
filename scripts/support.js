/* ---------- help and support (0.12.0): support requests with replies, announcements, support access to one project ----------
   The staff of Bestof bv answer in the administration (admin.vstool.hvac-service.be, migration 0018). The app reads its own requests
   (support_threads / support_messages, only those of the signed-in user), sends with support_send, shows the announcements for the user
   (my_announcements) until they are dismissed. Support never sees project contents, unless the owner, an administrator or the project lead
   lets support read one cloud project for a few days (support_grant). */
const Support = {
  threads: [], msgs: {}, ann: [], seenAt: {}, ok: false,
  LS: 'inregelaar.support.v1',
  on() { return !!(Auth.user() && !(typeof Demo !== 'undefined' && Demo.on())); },
  /** requests, replies and announcements; an older server without them: nothing shown */
  async refresh() {
    if (!this.on()) { this.threads = []; this.msgs = {}; this.ann = []; this.ok = false; return; }
    const before = this.unreadIds();
    const [ann, th] = await Promise.all([
      Auth.rpc('my_announcements').catch(() => null),
      Auth.call('/rest/v1/support_threads?select=id,subject,topic,status,created_at,updated_at,user_seen_at&order=updated_at.desc&limit=30', { method: 'GET' }).catch(() => null)]);
    this.ok = Array.isArray(th);
    this.ann = Array.isArray(ann) ? ann : []; this.threads = Array.isArray(th) ? th : [];
    this.msgs = {};
    if (this.threads.length) {
      const ids = this.threads.map(t => t.id).join(',');
      const m = await Auth.call(`/rest/v1/support_messages?select=id,thread_id,from_staff,body,created_at&thread_id=in.(${ids})&order=id`, { method: 'GET' }).catch(() => []);
      for (const x of m || []) (this.msgs[x.thread_id] = this.msgs[x.thread_id] || []).push(x);
    }
    const fresh = this.unreadIds().filter(id => !before.includes(id));
    if (fresh.length && typeof toast === 'function') toast(__('Support answered your request — see Settings › Help and support'));
  },
  unread(t) { const s = Date.parse(t.user_seen_at || 0) || 0; return (this.msgs[t.id] || []).some(m => m.from_staff && Date.parse(m.created_at) > s); },
  unreadIds() { return this.threads.filter(t => this.unread(t)).map(t => t.id); },
  /** a new request (thread empty) or a message in one of mine; the app version, platform and device go along for support */
  async send(body, topic, thread) {
    const meta = { version: APP_VERSION, platform: (typeof Device !== 'undefined' && Device.platform()) || '', app: typeof Platform !== 'undefined' && Platform.native() ? 'APK' : 'web',
      device: (Device.mine() || {}).id || '', org: (Access.s && Access.s.org && Access.s.org.name) || '' };
    const r = await Auth.rpc('support_send', { p_body: body, p_subject: '', p_topic: topic || 'other', p_meta: meta, p_thread: thread || null });
    await this.refresh(); return r && r.thread;
  },
  async seen(id) { const t = this.threads.find(x => x.id === id); if (!t || !this.unread(t)) return; try { await Auth.rpc('support_seen', { p_thread: id }); t.user_seen_at = new Date().toISOString(); } catch (e) { } },
  async dismiss(id) { this.ann = this.ann.filter(a => a.id !== id); try { await Auth.rpc('announcement_dismiss', { p_id: id }); } catch (e) { } },
  /** the text of an announcement in the language of the interface (else Dutch, English, French, any) */
  pick(o) { o = o || {}; const l = (I18N.cur && I18N.cur.ui) || 'en'; return o[l] || o.nl || o.en || o.fr || Object.values(o)[0] || ''; },
  /* -- support access to one cloud project (remembered on this device for the list) -- */
  grants() { let g = {}; try { g = JSON.parse(localStorage.getItem(this.LS) || '{}').grants || {}; } catch (e) { } const now = Date.now();
    for (const k of Object.keys(g)) if (!(Date.parse(g[k]) > now)) delete g[k]; return g; },
  saveGrants(g) { try { localStorage.setItem(this.LS, JSON.stringify({ grants: g })); } catch (e) { } },
  async grant(pid, days) {
    const r = await Auth.rpc('support_grant', { p_project: pid, p_days: days, p_thread: null });
    const g = this.grants(); if (days > 0 && r && r.until) g[pid] = r.until; else delete g[pid]; this.saveGrants(g); return r;
  },
};
