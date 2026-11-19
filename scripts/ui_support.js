/* ---------- help and support in the interface (0.12.0): announcements on the start screen, the card «Help and support» in the settings ---------- */
const SUP_TOPICS = () => ({ other: __('General question'), device: __('Devices and access'), billing: __('Subscription and invoice'), report: __('Report'), ai: __('AI helper'), bug: __('Something does not work') });
const supState = () => (S.sup = S.sup || { open: null, busy: false, err: '', info: '', topic: 'other', days: 7 });

/** announcements of Bestof bv for this user (dismissed ones stay away) and a line when support answered */
function annBannerHTML() {
  if (typeof Support === 'undefined' || !Support.on()) return '';
  const a = Support.ann.map(x => `<div class="banner ${x.level === 'warn' ? '' : 'info'} ann"><span><b>${esc(Support.pick(x.title))}</b>${Support.pick(x.body) ? ' — ' + esc(Support.pick(x.body)) : ''}</span>
    <button class="btn sm ghost" data-act="annDismiss" data-v="${esc(x.id)}" aria-label="${__h('Close')}">${__h('OK')}</button></div>`).join('');
  const n = Support.unreadIds().length;
  return a + (n ? `<div class="banner info ann"><span>${__h('Support answered your request')}</span><button class="btn sm primary" data-act="supOpen">${__h('Read')}</button></div>` : '');
}

function supportCard() {
  if (typeof Support === 'undefined' || !Support.on() || !Support.ok) return '';
  const st = supState(); const busy = st.busy ? ' disabled' : ''; const T = SUP_TOPICS();
  const status = { open: __('waiting for support'), answered: __('answered'), closed: __('closed') };
  const list = Support.threads.map(t => { const open = st.open === t.id; const un = Support.unread(t);
    return `<div class="stack-s" style="border-top:1px solid var(--line);padding-top:8px">
      <div class="row small"><button class="btn sm ghost" data-act="supThread" data-v="${esc(t.id)}">${open ? '▾' : '▸'} ${un ? '● ' : ''}${esc(t.subject || T[t.topic] || '—')}</button><span class="spacer"></span>
        <span class="muted">${esc(status[t.status] || t.status)} · ${esc(fmtDate(Date.parse(t.updated_at)))}</span></div>
      ${open ? `${(Support.msgs[t.id] || []).map(m => `<div class="small" style="padding:8px 10px;border-radius:8px;white-space:pre-wrap;${m.from_staff ? 'background:var(--accent-soft)' : 'border:1px solid var(--line)'}">
          <span class="muted">${m.from_staff ? __h('Support') : __h('You')} · ${esc(fmtDate(Date.parse(m.created_at)))}</span><br>${esc(m.body)}</div>`).join('')}
        <label class="field" for="sup-r-${esc(t.id)}">${lbl(__('Your answer'))}<textarea id="sup-r-${esc(t.id)}" data-supreply="${esc(t.id)}" style="min-height:64px"></textarea></label>
        <div class="row"><button class="btn sm" data-act="supReply" data-v="${esc(t.id)}"${busy}>${__h('Send')}</button></div>` : ''}</div>`; }).join('');
  // support access: only cloud projects, for the owner, an administrator or the project lead
  const role = (Access.cur() || {}).role; const canGrant = ['owner', 'admin', 'lead'].includes(role);
  const cloud = Object.values(Store.projects).filter(p => typeof SYNC !== 'undefined' && SYNC.shared(p)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const g = Support.grants();
  const pname = (id) => { const p = Store.projects[id]; return p ? (p.info && p.info.nr ? p.info.nr + ' · ' : '') + ((p.info && p.info.name) || id) : id; };
  return `<section class="card" id="sup-card"><h3>${__h('Help and support')}</h3>
    <p class="small muted" style="margin:0">${__h('Ask Bestof bv a question or report a problem; the answer appears here. The app version and this device go along with the request.')}</p>
    <div class="grid2"><label class="field" for="sup-topic">${lbl(__('Subject'))}<select id="sup-topic" data-supf="topic">${Object.entries(T).map(([k, v]) => `<option value="${k}"${st.topic === k ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label></div>
    <label class="field" for="sup-new">${lbl(__('Your question'))}<textarea id="sup-new" data-supf="body" style="min-height:80px"></textarea></label>
    <div class="row"><button class="btn sm primary" data-act="supSend"${busy}>${__h('Send to support')}</button><span class="spacer"></span><button class="btn sm ghost" data-act="supRefresh"${busy}>${__h('Refresh')}</button></div>
    ${st.err ? `<div class="small warn">${esc(st.err)}</div>` : ''}${st.info ? `<div class="small" style="color:var(--ok)">${esc(st.info)}</div>` : ''}
    ${Support.threads.length ? `<span class="label">${__h('Your requests')}</span>${list}` : ''}
    ${canGrant ? `<div class="stack-s" style="border-top:1px solid var(--line);padding-top:10px"><span class="label">${__h('Support access to a project')}</span>
      <span class="small muted">${__h('Support never sees the contents of your projects. To solve a problem you can let support read one cloud project for a few days; you can take it back at any time.')}</span>
      ${cloud.length ? `<div class="grid2"><label class="field" for="sup-proj">${lbl(__('Project'))}<select id="sup-proj" data-supf="proj">${cloud.map(p => `<option value="${esc(p.id)}">${esc(pname(p.id))}</option>`).join('')}</select></label>
        <label class="field" for="sup-days">${lbl(__('For'))}<select id="sup-days" data-supf="days">${[3, 7, 14].map(d => `<option value="${d}"${+st.days === d ? ' selected' : ''}>${esc(__('{n} days', { n: d }))}</option>`).join('')}</select></label></div>
        <div class="row"><button class="btn sm" data-act="supGrant"${busy}>${__h('Give access')}</button></div>`
      : `<span class="small muted">${__h('Only projects shared in the cloud of the organisation can be opened for support.')}</span>`}
      ${Object.entries(g).map(([id, until]) => `<div class="row small"><span>${esc(pname(id))} · ${__h('support can read it until {d}', { d: fmtDate(Date.parse(until)) })}</span><span class="spacer"></span>
        <button class="btn sm ghost" data-act="supUngrant" data-v="${esc(id)}"${busy}>${__h('Take back')}</button></div>`).join('')}</div>` : ''}
  </section>`;
}
/** a support action with busy state and a message in the card */
async function supRun(fn, ok) {
  const st = supState(); st.busy = true; st.err = ''; st.info = ''; renderSheet();
  try { await fn(); st.info = ok || ''; } catch (e) { console.error(e); st.err = e && e.code === 'rate' ? __('Too many messages in a short time: try again later') : cloudMsg(e); }
  st.busy = false; renderSheet();
}
function supAction(act, t) {
  const st = supState(); const v = (sel) => { const el = document.querySelector(sel); return el ? el.value : ''; };
  switch (act) {
    case 'annDismiss': Support.dismiss(t.dataset.v).then(() => render()); render(); return true;
    case 'supOpen': { const u = Support.unreadIds()[0]; if (u) { st.open = u; Support.seen(u).then(() => { if (S.view === 'home') render(); }); } S.dlg = { type: 'settings' }; pushNav(); renderSheet(); setTimeout(() => { const c = document.getElementById('sup-card'); if (c) c.scrollIntoView({ block: 'start' }); }, 60); return true; }
    case 'supRefresh': supRun(() => Support.refresh(), __('Updated')); return true;
    case 'supThread': { const id = t.dataset.v; st.open = st.open === id ? null : id; if (st.open) Support.seen(id).then(() => { if (S.view === 'home') render(); }); renderSheet(); return true; }
    case 'supSend': { st.topic = v('#sup-topic') || 'other'; const b = v('#sup-new').trim(); if (!b) { st.err = __('Write your question first'); renderSheet(); return true; }
      supRun(async () => { st.open = await Support.send(b, st.topic, null); }, __('Sent: support answers here, usually within one working day')); return true; }
    case 'supReply': { const id = t.dataset.v; const b = v(`[data-supreply="${CSS.escape(id)}"]`).trim(); if (!b) return true;
      supRun(() => Support.send(b, '', id), __('Sent')); return true; }
    case 'supGrant': { const pid = v('#sup-proj'); st.days = +v('#sup-days') || 7; if (!pid) return true;
      supRun(() => Support.grant(pid, st.days), __('Support can read this project for {n} days', { n: st.days })); return true; }
    case 'supUngrant': supRun(() => Support.grant(t.dataset.v, 0), __('Support access taken back')); return true;
  }
  return false;
}
