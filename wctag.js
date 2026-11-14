/* =====================================================================
   Wellcon Tag · ระบบแท็กผู้เกี่ยวข้อง (ใช้ร่วมทุกแอป: PM · Claim · Quick Measure · Defect Check / Site Work · Survey)
   ---------------------------------------------------------------------
   การแจ้งเตือนมีแบบเดียว = แท็กคนที่เกี่ยวข้อง
     • ผู้สร้างเอกสาร / ขออนุมัติ → เลือกคน (WCTag.pick) → ส่งแท็ก (WCTag.send) → ตาราง wc_tags (1 แถว / 1 คน)
     • คนที่ถูกแท็ก เปิดแอปครั้งถัดไป → popup แจ้งทันที (WCTag.check) · กระดิ่ง 🔔 แสดงจำนวนที่ยังไม่เสร็จ (WCTag.bell / WCTag.open)
   ใช้:
     WCTag.setup({ sb, app:'claim', me:{ email, name, role }, accounts:[…], projects:[…] })
     const r = await WCTag.pick({ title, project, preset:[emails], approve:[emails] })  →  { to:[emails], note } | null
     await WCTag.send({ project, ref_type, ref_id, title, note, url, to, approve })
   ไม่มีราคา / ข้อมูลการเงินในแท็ก — ใส่เฉพาะชื่อเรื่องและลิงก์
   ===================================================================== */
(function () {
  'use strict';
  if (window.WCTag) return;
  const VER = '1.2.2';   // 1.2.2: ปิดหน้าต่างเลือกคน (✕) แล้วผู้อนุมัติที่ระบบกำหนดยังได้รับแจ้ง · 1.2.1: ผู้บริหาร / ผู้จัดการฝ่าย (เห็นทุกโครงการตามตำแหน่ง) แท็กได้ในทุกโครงการ — เดิมต้องติ๊ก "เห็นทุกโครงการ" เอง · 1.2.0: แท็กในโครงการ = เลือกได้เฉพาะทีมที่ได้รับมอบหมายในโครงการนั้น (+ ผู้บริหารที่ตั้งให้เห็นทุกโครงการ) · 1.1.0: เข้าสู่ระบบครั้งเดียว ข้ามแอป (ตั๋วใช้ครั้งเดียว ?wsso=)
  const ROLE = { pm: 'PM', pm_mgr: 'PM Manager', qs: 'QS', qs_mgr: 'QS Manager', sitemgr: 'Site Manager', site: 'หัวหน้าช่าง', safety: 'Safety', designer: 'Designer',
    design_mgr: 'Design Manager', director: 'Director', superadmin: 'Admin', admin: 'Admin', proc: 'จัดซื้อ', proc_mgr: 'จัดซื้อ', store: 'Store', fin: 'การเงิน', fin_mgr: 'การเงิน',
    hr: 'HR', hr_mgr: 'HR', factory: 'โรงงาน', office: 'Office', driver: 'คนขับรถ' };
  const APP = { pm: 'Wellcon PM', claim: 'Claim', qm: 'วัดหน้างาน', dc: 'Site Work · Defect', si: 'Site Work · Issues', sv: 'Site Work · Survey', lay: 'Layboard', apr: 'Auto PR · ใบขอซื้อ' };
  const S = { sb: null, app: 'pm', me: null, people: [], projects: {}, open: [], sent: [], subs: [], shown: {}, timer: 0, ready: false, busy: false };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').trim().toLowerCase();
  const pad = (n) => String(n).padStart(2, '0');
  const when = (iso) => { if (!iso) return ''; const d = new Date(iso), t = new Date(); const hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); const dd = Math.round((day(t) - day(d)) / 864e5);
    return dd === 0 ? 'วันนี้ ' + hm : dd === 1 ? 'เมื่อวาน ' + hm : pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + hm; };

  // ---------- CSS (โทนน้ำเงินเข้ม + ทอง = ระบบแท็กเดียวกันทุกแอป) ----------
  const CSS = `
.wct-x{all:initial}
.wct-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(20,22,30,.5);display:flex;align-items:flex-end;justify-content:center;font-family:'IBM Plex Sans Thai','Noto Sans Thai',system-ui,sans-serif;color:#1C1F2A;-webkit-text-size-adjust:100%}
.wct-ov.c{align-items:center;padding:16px}
.wct-bx{background:#fff;width:100%;max-width:560px;max-height:92vh;border-radius:20px 20px 0 0;display:flex;flex-direction:column;box-shadow:0 -10px 40px rgba(0,0,0,.25);overflow:hidden}
.wct-ov.c .wct-bx{border-radius:20px;max-height:86vh}
.wct-hd{background:#1F2B45;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}
.wct-hd b{font-size:16px;font-weight:600;flex:1;line-height:1.3}
.wct-hd small{display:block;font-size:12px;font-weight:400;color:#C9D3E6}
.wct-hd .wct-ic{width:36px;height:36px;border-radius:11px;background:#E2B655;color:#1F2B45;display:flex;align-items:center;justify-content:center;font-size:18px;flex:none}
.wct-cl{border:0;background:rgba(255,255,255,.12);color:#fff;width:36px;height:36px;border-radius:10px;font-size:18px;cursor:pointer;flex:none}
.wct-bd{overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:8px;-webkit-overflow-scrolling:touch}
.wct-ft{padding:10px 14px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid #E6E9F0;display:flex;gap:8px;background:#FAFBFD}
.wct-b{flex:1;min-height:48px;border-radius:13px;border:1px solid #D5DBE7;background:#fff;font:600 15px/1.2 inherit;font-family:inherit;color:#1F2B45;cursor:pointer;padding:0 12px}
.wct-b.p{background:#1F2B45;border-color:#1F2B45;color:#fff}
.wct-b.g{background:#E2B655;border-color:#E2B655;color:#1F2B45}
.wct-b:disabled{opacity:.45}
.wct-in{width:100%;box-sizing:border-box;min-height:46px;border:1px solid #D5DBE7;border-radius:12px;padding:10px 12px;font:16px inherit;font-family:inherit;color:#1C1F2A;background:#fff}
.wct-ta{min-height:64px;resize:vertical}
.wct-lb{font-size:12.5px;color:#5A6378;font-weight:600;margin:4px 2px 0}
.wct-chips{display:flex;gap:6px;flex-wrap:wrap}
.wct-chip{display:inline-flex;align-items:center;gap:6px;min-height:36px;border-radius:999px;border:1px solid #D5DBE7;background:#fff;padding:0 12px;font:500 13.5px inherit;font-family:inherit;color:#1F2B45;cursor:pointer}
.wct-chip.on{background:#1F2B45;border-color:#1F2B45;color:#fff}
.wct-chip.ap{background:#FFF4DA;border-color:#E2B655;color:#6B4E00}
.wct-p{display:flex;align-items:center;gap:10px;min-height:52px;border:1px solid #E6E9F0;border-radius:13px;padding:8px 12px;background:#fff;cursor:pointer;text-align:left;font-family:inherit;width:100%}
.wct-p.on{border-color:#1F2B45;background:#EEF2FA;box-shadow:inset 3px 0 0 #1F2B45}
.wct-av{width:34px;height:34px;border-radius:50%;background:#DCE3F1;color:#1F2B45;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex:none}
.wct-p.on .wct-av{background:#1F2B45;color:#fff}
.wct-p .wct-tx{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.3}
.wct-p .wct-tx b{font-size:14.5px;font-weight:600;color:#1C1F2A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wct-p .wct-tx small{font-size:12px;color:#6B7487}
.wct-ck{width:24px;height:24px;border-radius:7px;border:2px solid #C3CBDB;flex:none;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px}
.wct-p.on .wct-ck{background:#1F2B45;border-color:#1F2B45}
.wct-sec{font-size:12px;font-weight:700;color:#8A93A6;letter-spacing:.03em;margin:6px 2px 0}
.wct-it{border:1px solid #E6E9F0;border-radius:14px;padding:11px 12px;background:#fff;display:flex;flex-direction:column;gap:6px}
.wct-it.new{border-color:#E2B655;background:#FFFCF3;box-shadow:inset 4px 0 0 #E2B655}
.wct-it .t{font-size:14.5px;font-weight:600;color:#1C1F2A;line-height:1.4}
.wct-it .m{font-size:12px;color:#6B7487;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.wct-it .n{font-size:13.5px;color:#36405A;background:#F4F6FA;border-radius:9px;padding:7px 10px;white-space:pre-wrap;word-break:break-word}
.wct-it .a{display:flex;gap:6px}
.wct-it .a .wct-b{min-height:42px;font-size:14px}
.wct-tg{font-size:11px;font-weight:700;border-radius:999px;padding:2px 8px;background:#E8ECF5;color:#1F2B45;white-space:nowrap}
.wct-tg.ap{background:#FFE7B0;color:#6B4E00}.wct-tg.ok{background:#E3F1E7;color:#2E6B40}
.wct-em{color:#8A93A6;text-align:center;padding:26px 8px;font-size:14px}
.wct-tabs{display:flex;gap:6px;padding:10px 14px 0}
.wct-bell{position:relative;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;border:1px solid rgba(0,0,0,.08);background:#fff;cursor:pointer;font-size:19px;line-height:1;padding:0;color:#1F2B45;-webkit-tap-highlight-color:transparent}
.wct-bell i{position:absolute;top:-5px;right:-5px;min-width:20px;height:20px;border-radius:999px;background:#D23F2F;color:#fff;font:700 11.5px/20px system-ui,sans-serif;font-style:normal;padding:0 5px;box-sizing:border-box;text-align:center;box-shadow:0 0 0 2px #fff}
.wct-bell.fl{position:fixed;right:14px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:2147482000;width:52px;height:52px;border-radius:16px;background:#1F2B45;color:#fff;border:0;box-shadow:0 6px 20px rgba(31,43,69,.35);font-size:22px}
.wct-toast{position:fixed;left:50%;bottom:calc(120px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#1F2B45;color:#fff;border-radius:12px;padding:10px 16px;font:14px 'IBM Plex Sans Thai',system-ui,sans-serif;z-index:2147483600;max-width:90vw;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.25)}
@media print{.wct-ov,.wct-bell,.wct-toast{display:none!important}}`;
  function css() { if (document.getElementById('wct-css')) return; const s = document.createElement('style'); s.id = 'wct-css'; s.textContent = CSS; document.head.appendChild(s); }
  let toastT = 0;
  function toast(m, ms) { css(); let t = document.querySelector('.wct-toast'); if (!t) { t = document.createElement('div'); t.className = 'wct-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2600); }
  function sheet(html, center) { css(); const ov = document.createElement('div'); ov.className = 'wct-ov' + (center ? ' c' : ''); ov.setAttribute('translate', 'no');
    ov.innerHTML = '<div class="wct-bx" role="dialog" aria-modal="true">' + html + '</div>'; document.body.appendChild(ov); return ov; }

  // ---------- ข้อมูลคน ----------
  const label = (p) => p ? p.name + (p.role ? ' · ' + p.role : '') : '';
  function person(email) { const e = norm(email); return S.people.find(p => p.email === e) || null; }
  // ตำแหน่งที่เห็นทุกโครงการเป็นค่าเริ่มต้น — ชุดเดียวกับแอปหลัก (ROLE_DEFS scope 'all') · ใบขอซื้อ · วัดหน้างาน · Layboard
  const ALL_SCOPE = ['superadmin', 'director', 'store', 'pm_mgr', 'design_mgr', 'qs_mgr', 'fin_mgr', 'hr_mgr'];
  function setPeople(accounts) {
    S.people = (accounts || []).filter(a => a && a.email && String(a.email).indexOf('@') > 0 && a.active !== false && !a.disabled && !a.deleted)
      .map(a => ({ email: norm(a.email), name: String(a.nick || '').trim() || a.name || a.username || a.email, role: ROLE[a.roleKey] || a.title || '', rk: a.roleKey || '',
        projects: Array.isArray(a.projects) ? a.projects : [], all: a.allProj === true || (a.allProj !== false && ALL_SCOPE.includes(a.roleKey || '')) }))   // v1.2.1 กติกาเดียวกับทุกแอป: ติ๊กเอง > ตามตำแหน่ง
      .filter((p, i, A) => A.findIndex(x => x.email === p.email) === i)
      .sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }
  const inProj = (p, pid) => !!pid && (p.projects.includes(pid));
  // v1.2.0 ผู้บริหารสั่ง 14/11/2026: แท็กในโครงการ เลือกได้เฉพาะคนที่ได้รับมอบหมายในโครงการนั้น (+ คนที่ Admin ตั้ง "เห็นทุกโครงการ")
  //   ไม่มีโครงการ (หน้ารวมบริษัท) = เลือกได้ทุกคน · ผู้อนุมัติที่ระบบกำหนด (approve) ยังแท็กได้เสมอ
  const canTag = (p, pid) => !pid || inProj(p, pid) || p.all;

  // ---------- เลือกคนที่จะแท็ก ----------
  // opts: { title, sub, project, preset:[email], approve:[email] (ขออนุมัติ — ล็อกไว้), roles:[rk] (ปุ่มลัดเลือกตามตำแหน่ง), note }
  function pick(opts) {
    opts = opts || {}; const pid = opts.project || '';
    const sel = new Set((opts.preset || []).map(norm).filter(e => e && e !== (S.me && S.me.email) && (!pid || !person(e) || canTag(person(e), pid))));
    const ap = new Set((opts.approve || []).map(norm).filter(e => e && e !== (S.me && S.me.email))); ap.forEach(e => sel.add(e));
    let q = '';
    return new Promise((res) => {
      const ov = sheet(`<div class="wct-hd"><span class="wct-ic">🏷</span><b>${esc(opts.title || 'แท็กผู้เกี่ยวข้อง')}<small>${esc(opts.sub || 'คนที่ถูกแท็กจะเห็นแจ้งเตือนทันทีที่เปิดแอป')}</small></b><button class="wct-cl" data-x aria-label="ปิด">✕</button></div>
        <div class="wct-bd"><div class="wct-chips" data-sel></div>
          <input class="wct-in" data-q placeholder="ค้นหาชื่อ / ตำแหน่ง…" autocomplete="off">
          <div class="wct-chips" data-roles></div>
          <div data-list style="display:flex;flex-direction:column;gap:6px"></div>
          ${opts.note === false ? '' : '<div class="wct-lb">ข้อความถึงคนที่ถูกแท็ก (ไม่บังคับ)</div><textarea class="wct-in wct-ta" data-n maxlength="400" placeholder="เช่น รบกวนตรวจและอนุมัติภายในวันนี้"></textarea>'}</div>
        <div class="wct-ft"><button class="wct-b" data-skip>ไม่แท็ก</button><button class="wct-b p" data-ok>ส่งแท็ก</button></div>`);
      const $ = (s) => ov.querySelector(s);
      const roleBtns = (opts.roles || [['qs', 'qs_mgr'], ['pm', 'pm_mgr']]).map(rs => { const L = S.people.filter(p => rs.includes(p.rk) && (pid ? inProj(p, pid) : true));
        return { rs, L, label: (ROLE[rs[0]] || rs[0]) + (pid ? ' ของโครงการ' : '') }; }).filter(x => x.L.length);
      function draw() {
        $('[data-sel]').innerHTML = [...sel].map(e => { const p = person(e); return `<button class="wct-chip ${ap.has(e) ? 'ap' : 'on'}" data-rm="${esc(e)}">${ap.has(e) ? '✍️ ' : ''}${esc(p ? p.name : e)} ${ap.has(e) ? '' : '✕'}</button>`; }).join('')
          || '<span style="font-size:13px;color:#8A93A6">ยังไม่ได้เลือกใคร</span>';
        $('[data-roles]').innerHTML = roleBtns.map((r, i) => `<button class="wct-chip" data-role="${i}">+ ${esc(r.label)} (${r.L.length})</button>`).join('');
        const qq = norm(q), L = S.people.filter(p => p.email !== (S.me && S.me.email) && canTag(p, pid) && (!qq || norm(p.name + ' ' + p.role + ' ' + p.email).includes(qq)));
        const team = pid ? L.filter(p => inProj(p, pid)) : [], rest = L.filter(p => !team.includes(p));   // มีโครงการ: rest = ผู้บริหารที่เห็นทุกโครงการเท่านั้น
        const row = (p) => `<button class="wct-p${sel.has(p.email) ? ' on' : ''}" data-e="${esc(p.email)}"><span class="wct-av">${esc((p.name || '?').slice(0, 1))}</span><span class="wct-tx"><b>${esc(p.name)}</b><small>${esc(p.role || p.email)}</small></span><i class="wct-ck">${sel.has(p.email) ? '✓' : ''}</i></button>`;
        $('[data-list]').innerHTML = (team.length ? '<div class="wct-sec">ทีมโครงการนี้</div>' + team.map(row).join('') : '') + (rest.length ? '<div class="wct-sec">' + (pid ? 'ผู้บริหาร · ส่วนกลาง (เห็นทุกโครงการ)' : 'พนักงาน') + '</div>' + rest.slice(0, qq ? 80 : 40).map(row).join('') : '')
          || (pid && !qq ? '<p class="wct-em">โครงการนี้ยังไม่มีทีม — ให้ Admin เพิ่มคนในทีมโครงการก่อน</p>' : '<p class="wct-em">ไม่พบชื่อนี้ในทีมโครงการ</p>');
        if (pid && !$('[data-pn]')) $('[data-list]').insertAdjacentHTML('beforebegin', '<div data-pn style="font-size:12px;color:#8A93A6">แท็กได้เฉพาะทีมที่ได้รับมอบหมายในโครงการ' + (S.projects[pid] ? ' ' + esc(S.projects[pid]) : '') + '</div>');
        const n = sel.size; $('[data-ok]').textContent = n ? 'ส่งแท็ก (' + n + ' คน)' : 'ส่งแท็ก'; $('[data-ok]').disabled = !n;
      }
      const done = (v) => { ov.remove(); res(v); };
      ov.addEventListener('click', (e) => {
        if (e.target === ov || e.target.closest('[data-x]')) { done(ap.size ? { to: [...ap], note: '' } : null); return; }   // v1.2.2 ปิดหน้าต่าง = ไม่แท็กเพิ่ม แต่ผู้อนุมัติที่ระบบกำหนดยังได้รับแจ้งเสมอ
        if (e.target.closest('[data-skip]')) { done(ap.size ? { to: [...ap], note: '' } : null); return; }
        if (e.target.closest('[data-ok]')) { const n = $('[data-n]'); done({ to: [...sel], note: n ? n.value.trim() : '' }); return; }
        const r = e.target.closest('[data-rm]'); if (r) { if (!ap.has(r.dataset.rm)) sel.delete(r.dataset.rm); draw(); return; }
        const ro = e.target.closest('[data-role]'); if (ro) { roleBtns[+ro.dataset.role].L.forEach(p => { if (p.email !== (S.me && S.me.email)) sel.add(p.email); }); draw(); return; }
        const p = e.target.closest('[data-e]'); if (p) { const em = p.dataset.e; if (ap.has(em)) return; if (sel.has(em)) sel.delete(em); else sel.add(em); draw(); }
      });
      $('[data-q]').addEventListener('input', (e) => { q = e.target.value; draw(); });
      draw();
    });
  }

  // ---------- ส่งแท็ก ----------
  // { project, ref_type, ref_id, title, note, url, to:[email], approve:[email] } → จำนวนคนที่ส่ง
  async function send(o) {
    if (!S.sb || !S.me) return 0; o = o || {};
    const ap = new Set((o.approve || []).map(norm)); const all = [...new Set([...(o.to || []), ...(o.approve || [])].map(norm))].filter(e => e && e.indexOf('@') > 0 && e !== S.me.email);
    if (!all.length) return 0;
    let url = o.url || location.href; try { url = new URL(url, location.href).href; } catch (e) {}
    const rows = all.map(e => ({ app: o.app || S.app, project: o.project || null, ref_type: String(o.ref_type || ''), ref_id: String(o.ref_id || ''), title: String(o.title || '').slice(0, 200),
      note: o.note ? String(o.note).slice(0, 400) : null, url, kind: ap.has(e) ? 'approve' : 'tag', to_email: e, to_name: (person(e) || {}).name || null, from_email: S.me.email, from_name: S.me.name || null }));
    const r = await S.sb.from('wc_tags').insert(rows);
    if (r.error) { console.error(r.error); toast('ส่งแท็กไม่สำเร็จ: ' + (r.error.message || r.error), 4000); return 0; }
    toast('แท็กแล้ว ' + all.length + ' คน — จะแจ้งเตือนทันทีที่เปิดแอป', 2800); refresh(); return all.length;
  }
  // ปิดแท็กของเรื่องนี้ทั้งหมด (เช่น อนุมัติแล้ว → แท็ก "ขออนุมัติ" ของ QS ทุกคนหายจากกระดิ่ง)
  async function close(o) { if (!S.sb || !o || !o.ref_id) return; let q = S.sb.from('wc_tags').update({ done_at: new Date().toISOString() }).eq('app', o.app || S.app).eq('ref_type', String(o.ref_type || '')).eq('ref_id', String(o.ref_id)).is('done_at', null);
    if (o.kind) q = q.eq('kind', o.kind); const r = await q; if (r.error) console.error(r.error); refresh(); }
  // คนตามตำแหน่งในโครงการ (เช่น QS ของโครงการ) · ไม่มี → หัวหน้าฝ่าย (rk ตัวที่ 2)
  function byRole(pid, rks) { rks = rks || []; let L = S.people.filter(p => rks.includes(p.rk) && inProj(p, pid)); if (!L.length) L = S.people.filter(p => rks.slice(1).includes(p.rk)); return L.map(p => p.email); }
  // เลือก + ส่ง ในขั้นเดียว
  // ผู้อนุมัติ (approve) ได้แจ้งเตือนเสมอ แม้กด "ไม่แท็ก"
  async function tag(o) { o = o || {}; const r = await pick(o); if (!r || !r.to.length) return 0; const A = new Set((o.approve || []).map(norm));
    return send({ ...o, to: r.to.filter(e => !A.has(e)), approve: r.to.filter(e => A.has(e)), note: r.note }); }

  // ---------- โหลด / popup / กระดิ่ง ----------
  async function refresh() {
    if (!S.sb || !S.me || S.busy) return; S.busy = true;
    try {
      const a = await S.sb.from('wc_tags').select('*').eq('to_email', S.me.email).is('done_at', null).order('created_at', { ascending: false }).limit(100);
      if (!a.error) S.open = a.data || [];
      S.ready = !a.error; emit();
    } catch (e) {} S.busy = false;
  }
  const emit = () => { const n = S.open.length, u = S.open.filter(x => !x.seen_at).length; S.subs.forEach(f => { try { f(n, u); } catch (e) {} }); document.querySelectorAll('.wct-bell').forEach(b => paintBell(b)); };
  function paintBell(b) { const n = S.open.length; b.innerHTML = '🔔' + (n ? '<i>' + (n > 99 ? '99+' : n) + '</i>' : ''); b.title = n ? n + ' เรื่องที่คุณถูกแท็ก' : 'แท็ก / แจ้งเตือน'; b.setAttribute('aria-label', b.title); }
  function bell(host, opts) { css(); opts = opts || {}; const b = document.createElement('button'); b.type = 'button'; b.className = 'wct-bell' + (host ? '' : ' fl'); paintBell(b);
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); open(); }); (host || document.body).appendChild(b); return b; }
  async function mark(ids, k) { if (!ids.length) return; const now = new Date().toISOString(); const p = k === 'done' ? { done_at: now, seen_at: now } : { seen_at: now };
    const r = await S.sb.from('wc_tags').update(p).in('id', ids); if (r.error) { toast('บันทึกไม่สำเร็จ', 3000); return; }
    S.open = k === 'done' ? S.open.filter(x => !ids.includes(x.id)) : S.open.map(x => ids.includes(x.id) ? { ...x, seen_at: now } : x); emit(); }
  function item(x, mine) {
    const proj = x.project && S.projects[x.project]; const ap = x.kind === 'approve';
    return `<div class="wct-it${!mine && !x.seen_at ? ' new' : ''}" data-id="${esc(x.id)}"><div class="m">${ap ? '<span class="wct-tg ap">✍️ ขออนุมัติ</span>' : '<span class="wct-tg">🏷 แท็ก</span>'}<span>${esc(APP[x.app] || x.app || '')}</span>${proj ? '<span>· ' + esc(proj) + '</span>' : ''}<span style="margin-left:auto">${esc(when(x.created_at))}</span></div>
      <div class="t">${esc(x.title || '(ไม่มีชื่อเรื่อง)')}</div>
      <div class="m">${mine ? 'ถึง <b style="color:#1F2B45">' + esc(x.to_name || x.to_email) + '</b> · ' + (x.done_at ? '<span class="wct-tg ok">✓ เสร็จแล้ว</span>' : x.seen_at ? 'เห็นแล้ว' : 'ยังไม่เห็น') : 'จาก <b style="color:#1F2B45">' + esc(x.from_name || x.from_email || '—') + '</b>'}</div>
      ${x.note ? '<div class="n">' + esc(x.note) + '</div>' : ''}
      ${mine ? (x.url ? '<div class="a"><button class="wct-b" data-go="' + esc(x.id) + '">เปิดเรื่อง</button></div>' : '') : `<div class="a">${x.url ? `<button class="wct-b p" data-go="${esc(x.id)}">เปิดเรื่อง</button>` : ''}<button class="wct-b" data-done="${esc(x.id)}">✓ ${ap ? 'จัดการแล้ว' : 'รับทราบ'}</button></div>`}</div>`;
  }
  function go(x) { if (!x || !x.url) return; mark([x.id], 'seen').then(() => {}); if (isApp(x.url)) { ticketUrl(x.url).then(v => { location.href = v; }); return; } try { const u = new URL(x.url, location.href);
    if (u.origin === location.origin && u.pathname === location.pathname && u.search === location.search && u.hash !== location.hash) { location.hash = u.hash; location.reload(); return; } location.href = u.href; } catch (e) { location.href = x.url; } }
  // รายการทั้งหมด (กดกระดิ่ง)
  async function open() {
    if (!S.me || !S.sb) { toast('ยังไม่ได้เข้าสู่ระบบ'); return; }
    let tab = 'me'; const ov = sheet(`<div class="wct-hd"><span class="wct-ic">🔔</span><b>แจ้งเตือน · แท็ก<small>เฉพาะเรื่องที่มีคนแท็กคุณ / ขออนุมัติ</small></b><button class="wct-cl" data-x aria-label="ปิด">✕</button></div>
      <div class="wct-tabs"><button class="wct-chip on" data-tab="me">ถึงฉัน</button><button class="wct-chip" data-tab="sent">ฉันแท็กไป</button></div>
      <div class="wct-bd" data-list><div class="wct-em">กำลังโหลด…</div></div>
      <div class="wct-ft"><button class="wct-b" data-x>ปิด</button>${S.onTag ? '<button class="wct-b p" data-here>🏷 แท็กคน</button>' : ''}<button class="wct-b g" data-all>✓ รับทราบทั้งหมด</button></div>`);
    const $ = (s) => ov.querySelector(s);
    const draw = () => { ov.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab)); $('[data-all]').hidden = tab !== 'me' || !S.open.length;
      const L = tab === 'me' ? S.open : S.sent;
      $('[data-list]').innerHTML = L.length ? L.map(x => item(x, tab === 'sent')).join('') : `<div class="wct-em">${tab === 'me' ? 'ไม่มีเรื่องค้าง — ไม่มีใครแท็กคุณ' : 'ยังไม่ได้แท็กใครใน 30 วันที่ผ่านมา'}</div>`; };
    const loadSent = async () => { const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const r = await S.sb.from('wc_tags').select('*').eq('from_email', S.me.email).gte('created_at', since).order('created_at', { ascending: false }).limit(100); S.sent = r.error ? [] : (r.data || []); };
    await refresh(); draw();
    ov.addEventListener('click', async (e) => {
      if (e.target === ov || e.target.closest('[data-x]')) { ov.remove(); const u = S.open.filter(x => !x.seen_at).map(x => x.id); if (u.length) mark(u, 'seen'); return; }
      if (e.target.closest('[data-here]')) { ov.remove(); try { S.onTag(); } catch (x) { console.error(x); } return; }
      const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; if (tab === 'sent') { $('[data-list]').innerHTML = '<div class="wct-em">กำลังโหลด…</div>'; await loadSent(); } draw(); return; }
      const g = e.target.closest('[data-go]'); if (g) { const x = S.open.concat(S.sent).find(y => y.id === g.dataset.go); ov.remove(); go(x); return; }
      const d = e.target.closest('[data-done]'); if (d) { await mark([d.dataset.done], 'done'); draw(); return; }
      if (e.target.closest('[data-all]')) { if (!confirm('รับทราบทั้งหมด ' + S.open.length + ' เรื่อง?')) return; await mark(S.open.map(x => x.id), 'done'); draw(); }
    });
  }
  // popup ตอนเปิดแอป / มีแท็กใหม่ (เฉพาะที่ยังไม่เคยเห็น)
  async function check() {
    await refresh(); const L = S.open.filter(x => !x.seen_at && !S.shown[x.id]); if (!L.length || document.querySelector('.wct-ov')) return;
    L.forEach(x => { S.shown[x.id] = 1; });
    const ov = sheet(`<div class="wct-hd"><span class="wct-ic">🔔</span><b>คุณถูกแท็ก ${L.length} เรื่อง<small>${esc(S.me.name || '')} — มีคนต้องการให้คุณดูเรื่องเหล่านี้</small></b><button class="wct-cl" data-x aria-label="ปิด">✕</button></div>
      <div class="wct-bd">${L.slice(0, 6).map(x => item(x, false)).join('')}${L.length > 6 ? `<div class="wct-em">และอีก ${L.length - 6} เรื่อง — กด “ดูทั้งหมด”</div>` : ''}</div>
      <div class="wct-ft"><button class="wct-b" data-later>ไว้ทีหลัง</button><button class="wct-b p" data-all>ดูทั้งหมด</button></div>`, true);
    const close = () => { ov.remove(); mark(L.map(x => x.id), 'seen'); };
    ov.addEventListener('click', async (e) => {
      if (e.target === ov || e.target.closest('[data-x]') || e.target.closest('[data-later]')) { close(); return; }
      if (e.target.closest('[data-all]')) { close(); open(); return; }
      const g = e.target.closest('[data-go]'); if (g) { ov.remove(); mark(L.map(x => x.id), 'seen'); go(L.find(y => y.id === g.dataset.go)); return; }
      const d = e.target.closest('[data-done]'); if (d) { await mark([d.dataset.done], 'done'); const it = d.closest('.wct-it'); if (it) it.remove(); if (!ov.querySelector('.wct-it')) close(); }
    });
  }

  // ---------- v1.1.0 เข้าสู่ระบบครั้งเดียว ข้ามแอป Wellcon ----------
  // กดลิงก์ / ปุ่มที่ไปอีกแอป (PM ⇄ Site Work · Claim) → ขอ "ตั๋วใช้ครั้งเดียว อายุ 2 นาที" (sso_issue) แนบ ?wsso= → แอปปลายทางแลกตั๋ว (sso_redeem) = เข้าสู่ระบบคนเดิมทันที
  // ลิงก์ที่ถูกส่งต่อ / เปิดซ้ำ ใช้ตั๋วไม่ได้ (ใช้แล้ว / หมดอายุ) → ต้องเข้าสู่ระบบเอง
  const APP_RE = /^https:\/\/(project-management-1(-[a-z0-9-]+)?|wellcon-defect-check(-[a-z0-9-]+)?)\.vercel\.app$/i, LOCAL_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
  function isApp(u) { try { const x = new URL(u, location.href); return x.origin !== location.origin && (APP_RE.test(x.origin) || (LOCAL_RE.test(x.origin) && LOCAL_RE.test(location.origin))); } catch (e) { return false; } }
  async function ticketUrl(u) { if (!S.sb || !S.me) return u; try { const r = await S.sb.rpc('sso_issue', { p_email: S.me.email }); if (r.error || !r.data) return u;
    const x = new URL(u, location.href); x.searchParams.set('wsso', r.data); return x.href; } catch (e) { return u; } }
  const _open = window.open.bind(window);
  window.open = function (u, t, f) {
    if (u && isApp(u) && S.me && S.sb) { const w = _open('', t || '_blank'); if (!w) return _open(u, t, f);
      try { w.document.write('<p style="font:16px system-ui,sans-serif;padding:24px;color:#1F2B45">กำลังเปิด… (เข้าสู่ระบบให้อัตโนมัติ)</p>'); } catch (e) {}
      ticketUrl(u).then(v => { try { w.location.replace(v); } catch (e) { _open(v, t); } }); return w; }
    return _open(u, t, f); };
  document.addEventListener('click', (e) => { const a = e.target && e.target.closest && e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (!isApp(a.href) || !S.me || !S.sb) return; e.preventDefault(); const tg = a.getAttribute('target');
    if (tg && tg !== '_self') window.open(a.href, tg); else ticketUrl(a.href).then(v => { location.href = v; }); }, true);
  // แอปปลายทาง: แลกตั๋ว → อีเมลผู้ใช้ (หรือ null) · ลบ ?wsso= ออกจากแถบที่อยู่ทันที
  async function ssoTake(sb) { let t = ''; try { t = new URLSearchParams(location.search).get('wsso') || ''; } catch (e) {} if (!t) return null;
    try { const u = new URL(location.href); u.searchParams.delete('wsso'); history.replaceState(history.state, '', u.href); } catch (e) {}
    try { const r = await (sb || S.sb).rpc('sso_redeem', { p_t: t }); return r.error ? null : (r.data ? String(r.data).toLowerCase() : null); } catch (e) { return null; } }

  // ---------- ตั้งค่า (เรียกครั้งเดียวหลัง login) ----------
  function setup(o) {
    o = o || {}; S.sb = o.sb || S.sb; S.app = o.app || S.app; if (o.onTag !== undefined) S.onTag = o.onTag;   // onTag = ปุ่ม "🏷 แท็กคน" (เรื่องที่เปิดอยู่) ในแผงกระดิ่ง
    if (o.me && o.me.email) S.me = { email: norm(o.me.email), name: o.me.name || o.me.email, role: o.me.role || '' };
    if (o.accounts) setPeople(o.accounts);
    if (o.projects) { S.projects = {}; (o.projects || []).forEach(p => { if (p && p.id) S.projects[p.id] = p.name || p.project || p.title || p.code || p.id; }); }
    if (!S.me || !S.sb) return;
    if (o.popup !== false) setTimeout(check, o.delay == null ? 900 : o.delay);
    clearInterval(S.timer); S.timer = setInterval(() => { if (document.visibilityState === 'visible') check(); }, 180000);
    if (!S._vis) { S._vis = 1; document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.me) check(); }); }
  }
  function reset() { S.me = null; S.open = []; S.sent = []; S.shown = {}; clearInterval(S.timer); emit(); }
  window.WCTag = { VER, setup, reset, pick, send, tag, close, byRole, check, ssoTake, ticketUrl, isApp, refresh, open, bell, toast, people: () => S.people.slice(), person, onChange: (f) => { S.subs.push(f); f(S.open.length, S.open.filter(x => !x.seen_at).length); },
    count: () => S.open.length, ROLE, _S: S };
})();
