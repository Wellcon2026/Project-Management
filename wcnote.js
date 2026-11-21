/* =====================================================================
   Wellcon Note · บันทึก · งานของฉัน (v1.0.0 — ผู้บริหารสั่ง 20/11/2026)
   ---------------------------------------------------------------------
   ที่เดียวรวม 4 เรื่องของแต่ละคน — เปิดจากการ์ด "บันทึก · งานของฉัน" บนหน้าแรกทุกตำแหน่ง
     1) บันทึกของฉัน   — โน้ตที่ฉันเขียน (🔒 ส่วนตัว เห็นคนเดียว / 👥 ทีมโครงการเห็น)
     2) บันทึกโครงการ  — โน้ตสาธารณะของโครงการที่ฉันอยู่ในทีม
     3) แท็กถึงฉัน     — เรื่องที่มีคนแท็ก (wc_tags) + โน้ตที่มีคนแชร์ / มอบหมายให้ฉัน
     4) งานค้าง        — งานคงค้างโครงการที่มอบหมายให้ฉัน + โน้ตที่มีกำหนดวันและยังไม่เสร็จ
   เชื่อมปฏิทิน / แผนงาน: โน้ตที่มีโครงการ + วันที่ ติ๊ก "แสดงในปฏิทินโครงการ" → ขึ้นในปฏิทินโครงการ + ปฏิทินพื้นที่ทำงาน
     · เลือก "งานในแผนงาน" ของโครงการได้ (ใช้วันจบของงานนั้นเป็นกำหนดได้) · ปุ่มเปิดแผนงาน / ปฏิทินจากโน้ต
   ข้อมูล: ใช้โน้ตชุดเดิมของแอป (app_state 'notes' คีย์ proj:<pid> / proj:_gen) ผ่าน bridge จากแอปหลัก — ไม่มีตารางใหม่
   ใช้:  WCNote.open(bridge, { tab, focus })   (bridge สร้างโดย index.html → _noteBridge())
   ไม่มีราคา / ต้นทุนในหน้านี้
   ===================================================================== */
(function () {
  'use strict';
  if (window.WCNote) return;
  const VER = '1.5.0';   // 1.5.0: แท็บแท็กถึงฉัน = หน้ากระดิ่งเดิมครบ (📥 ถึงฉัน / 📤 ฉันแท็กไป · ✓ รับทราบทั้งหมด · 🏷 แท็กคน) · วางในภาพรวมโครงการ (เฉพาะโครงการนั้น) · 1.4.0: 1.4.0: วางหน้าบันทึกชุดเดียวกันในหน้าอื่นได้ (inline · [data-wn-host]) — พื้นที่ทำงานของฉัน / หน้า Home ใช้หน้าตาเดียวกับหน้านี้ · 1.3.0: ใส่เวลาในบันทึกได้ (time 'HH:MM') — แสดงบนป้ายวันที่ · เรียงตามเวลาในวันเดียวกัน · ขึ้นในปฏิทิน · 1.2.0: เรียงตามวันที่จะถึงก่อน (กำลังจะถึง → เลยกำหนด → ไม่มีกำหนดวัน → เสร็จแล้ว) · 1.1.0: แยกแท็บ 🔒 ส่วนตัว / 👥 สาธารณะ (โครงการ) ชัดเจน + ตัวกรอง “เฉพาะของฉัน” · 1.0.1: ค้นหาแล้วไฮไลต์คำที่พบ (สีเหลือง) + บอกจำนวนที่พบ
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').trim().toLowerCase();
  const pad = (n) => String(n).padStart(2, '0');
  const isoToday = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const dmy = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
  const when = (iso) => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; const t = new Date(); const hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); const dd = Math.round((day(t) - day(d)) / 864e5);
    return dd === 0 ? 'วันนี้ ' + hm : dd === 1 ? 'เมื่อวาน ' + hm : pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
  const daysTo = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return null; const a = new Date(+m[1], +m[2] - 1, +m[3]); const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((a - t) / 864e5); };
  // เรียง: กำลังจะถึง (วันนี้ → ไกล) · เลยกำหนด (เพิ่งเลย → นานแล้ว) · ไม่มีกำหนดวัน (ล่าสุดก่อน)
  const byDue = (L) => { const up = [], late = [], none = [];
    L.forEach(x => { const d = daysTo(x.due); if (d == null) none.push(x); else if (d >= 0) up.push(x); else late.push(x); });
    const ds = (a, b) => (String(a.due) + ' ' + (okTime(a.time) ? a.time : '99:99')).localeCompare(String(b.due) + ' ' + (okTime(b.time) ? b.time : '99:99'));   // วันเดียวกัน: มีเวลาก่อน เรียงตามเวลา
    up.sort(ds); late.sort((a, b) => ds(b, a)); none.sort((a, b) => String(b.editedAt || b.at || '').localeCompare(String(a.editedAt || a.at || '')));
    return { up, late, none }; };
  const okTime = (t) => /^\d{2}:\d{2}$/.test(String(t || ''));
  const nowHM = () => { const x = new Date(); return pad(x.getHours()) + ':' + pad(x.getMinutes()); };
  const dueChip = (iso, done, time) => { const d = daysTo(iso); if (d == null) return ''; const tm = okTime(time) ? time : '';
    const pastT = !done && d === 0 && tm && tm < nowHM();   // วันนี้ แต่เลยเวลาแล้ว
    const cls = done ? 'ok' : (d < 0 || pastT) ? 'late' : d <= 2 ? 'soon' : '';
    const tx = done ? 'เสร็จแล้ว' : d < 0 ? 'เลยกำหนด ' + (-d) + ' วัน' : d === 0 ? (pastT ? 'เลยเวลาแล้ว' : 'วันนี้') : d === 1 ? 'พรุ่งนี้' : 'อีก ' + d + ' วัน';
    return `<span class="wn-tg ${cls}">⏰ ${esc(dmy(iso))}${tm ? ' · ' + esc(tm) + ' น.' : ''} · ${tx}</span>`; };
  // ไฮไลต์คำค้นในข้อความ (ตัด / escape ทีละช่วง — ไม่แทรก HTML ในข้อความผู้ใช้)
  const hl = (s) => { const t = String(s == null ? '' : s), q = String(S.q || '').trim(); if (!q) return esc(t);
    const lt = t.toLowerCase(), lq = q.toLowerCase(); let out = '', i = 0, j;
    while ((j = lt.indexOf(lq, i)) >= 0) { out += esc(t.slice(i, j)) + '<mark class="wn-hl">' + esc(t.slice(j, j + q.length)) + '</mark>'; i = j + q.length; }
    return out + esc(t.slice(i)); };
  const first = (s, n) => { const t = String(s || '').trim().split('\n')[0]; return t.length > (n || 80) ? t.slice(0, n || 80) + '…' : t; };

  const CSS = `
.wn-ov{position:fixed;inset:0;z-index:2147482500;background:rgba(20,19,16,.55);display:flex;align-items:flex-end;justify-content:center;font-family:'IBM Plex Sans Thai','Noto Sans Thai',system-ui,sans-serif;color:#22231C;-webkit-text-size-adjust:100%}
@media(min-width:760px){.wn-ov{align-items:center;padding:20px}}
.wn-bx{background:#F7F3EA;width:100%;max-width:880px;height:94vh;border-radius:20px 20px 0 0;display:flex;flex-direction:column;box-shadow:0 -10px 40px rgba(0,0,0,.3);overflow:hidden}
@media(min-width:760px){.wn-bx{border-radius:20px;height:88vh}}
.wn-bx.ed{max-width:560px;height:auto;max-height:94vh}
.wn-hd{background:#1C1B18;color:#F6F1E8;padding:14px 16px 12px;display:flex;align-items:center;gap:10px;flex:none}
.wn-hd .ic{width:40px;height:40px;border-radius:12px;background:#C9A961;color:#1C1B18;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none}
.wn-hd b{flex:1;font-size:17px;line-height:1.25;min-width:0}.wn-hd b small{display:block;font-size:12px;font-weight:400;color:#D9CFBD}
.wn-x{border:0;background:rgba(255,255,255,.12);color:#fff;width:40px;height:40px;border-radius:11px;font-size:18px;cursor:pointer;flex:none}
.wn-tabs{display:flex;gap:6px;padding:10px 12px;background:#1C1B18;overflow-x:auto;flex:none;-webkit-overflow-scrolling:touch}
.wn-tab{flex:none;min-height:40px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:transparent;color:#E8E1D3;padding:0 14px;font:600 14px inherit;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.wn-tab.on{background:#C9A961;border-color:#C9A961;color:#1C1B18}
.wn-tab i{font-style:normal;font-size:11.5px;font-weight:700;border-radius:999px;padding:1px 7px;background:rgba(255,255,255,.16)}.wn-tab.on i{background:#1C1B18;color:#E2BC66}.wn-tab i.u{background:#C0392B;color:#fff}
.wn-bar{display:flex;gap:8px;padding:10px 12px 4px;flex-wrap:wrap;flex:none;align-items:center}
.wn-in{min-height:42px;border:1.5px solid #E3DACB;border-radius:11px;padding:8px 11px;background:#fff;font:15px inherit;font-family:inherit;color:#22231C;box-sizing:border-box;min-width:0}
.wn-bar .wn-in{flex:1 1 200px}
.wn-chips{display:flex;gap:6px;overflow-x:auto;padding:4px 12px 6px;flex:none;-webkit-overflow-scrolling:touch}
.wn-chip{flex:none;min-height:34px;border-radius:999px;border:1px solid #E3DACB;background:#fff;padding:0 12px;font:500 13px inherit;font-family:inherit;color:#4A4840;cursor:pointer;white-space:nowrap}
.wn-chip.on{background:#1C1B18;border-color:#1C1B18;color:#E2BC66}
.wn-bd{flex:1;overflow:auto;padding:6px 12px 14px;display:flex;flex-direction:column;gap:8px;-webkit-overflow-scrolling:touch}
.wn-sec{font-size:12px;font-weight:700;color:#8A8375;letter-spacing:.03em;margin:8px 2px 0}
.wn-it{background:#FFFDF8;border:1px solid #E3DACB;border-radius:14px;padding:11px 12px;display:flex;flex-direction:column;gap:7px}
.wn-it.foc{border-color:#C9A961;box-shadow:0 0 0 3px rgba(201,169,97,.35)}
.wn-it.done .wn-t{color:#9A958A;text-decoration:line-through}
.wn-it.new{border-color:#C9A961;background:#FFFBF1;box-shadow:inset 4px 0 0 #C9A961}
.wn-t{font-size:15px;line-height:1.5;white-space:pre-wrap;word-break:break-word;color:#22231C}
.wn-m{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12px;color:#6B6758}
.wn-tg{font-size:11.5px;font-weight:600;border-radius:999px;padding:2px 9px;background:#EFE9DC;color:#4A4840;white-space:nowrap}
.wn-tg.pv{background:#ECE6F5;color:#5B3E96}.wn-tg.pb{background:#E1EEF4;color:#2A6B8A}.wn-tg.sh{background:#FFF0D6;color:#8A5E14}
.wn-tg.late{background:#FBE3DE;color:#B4442E}.wn-tg.soon{background:#FAF1D6;color:#8A6D10}.wn-tg.ok{background:#E6EFE0;color:#2E7D46}.wn-tg.cal{background:#E9F2DF;color:#4D7C0F}.wn-tg.pl{background:#DDF1EE;color:#0D6D63}
.wn-a{display:flex;gap:6px;flex-wrap:wrap}
.wn-b{min-height:38px;border-radius:11px;border:1px solid #E3DACB;background:#fff;font:600 13.5px inherit;font-family:inherit;color:#22231C;padding:0 12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.wn-b.p{background:#1C1B18;border-color:#1C1B18;color:#E2BC66}.wn-b.g{background:#C9A961;border-color:#C9A961;color:#1C1B18}.wn-b.bad{color:#B4442E;border-color:#EBC3B8}.wn-b.ok{background:#2E7D46;border-color:#2E7D46;color:#fff}
.wn-b.big{min-height:48px;font-size:15px;flex:1;justify-content:center}
.wn-ft{flex:none;padding:10px 12px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid #E3DACB;display:flex;gap:8px;background:#FFFDF8}
.wn-em{color:#8A8375;text-align:center;padding:30px 10px;font-size:14px;line-height:1.7}
.wn-ck{display:flex;gap:10px;align-items:flex-start;cursor:pointer}
.wn-ck input{width:22px;height:22px;flex:none;margin-top:2px;accent-color:#2E7D46}
.wn-f{display:flex;flex-direction:column;gap:4px}.wn-f>span{font-size:12.5px;color:#6B6758;font-weight:600}
.wn-f textarea{min-height:120px;resize:vertical;line-height:1.55}
.wn-seg{display:flex;gap:6px;flex-wrap:wrap}.wn-seg button{flex:1 1 140px}
.wn-seg .on{background:#1C1B18;border-color:#1C1B18;color:#E2BC66}
.wn-box{background:#FFFDF8;border:1px solid #E3DACB;border-radius:13px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.wn-hint{font-size:12px;color:#8A8375;line-height:1.5}
.wn-hl{background:#FFE066;color:#22231C;border-radius:3px;padding:0 1px;box-shadow:0 0 0 1px #F2C200}
.wn-cnt{font-size:12.5px;color:#6B6758;padding:2px 2px 0}
.wn-toast{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#1C1B18;color:#fff;border-radius:12px;padding:10px 16px;font:14px 'IBM Plex Sans Thai',system-ui,sans-serif;z-index:2147483600;max-width:90vw;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.25)}
@media print{.wn-ov,.wn-toast{display:none!important}}
.wn-inl .wn-bx{height:auto;max-width:none;border-radius:18px;box-shadow:0 8px 24px rgba(28,27,24,.08);border:1px solid #E3DACB}
.wn-inl .wn-bd{max-height:min(560px,70vh)}
.wn-inl .wn-ft{padding-bottom:12px}
.wn-inl .wn-x{width:auto;padding:0 12px;font-size:13px;font-weight:600;font-family:inherit}`;
  function css() { if (document.getElementById('wn-css')) return; const s = document.createElement('style'); s.id = 'wn-css'; s.textContent = CSS; document.head.appendChild(s); }
  let toastT = 0;
  function toast(m, ms) { css(); let t = document.querySelector('.wn-toast'); if (!t) { t = document.createElement('div'); t.className = 'wn-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2600); }

  const OV = { B: null, ov: null, tab: 'mine', q: '', proj: '', who: '', focus: '', sig: '', timer: 0 };
  let S = OV;   // บริบทที่กำลังวาด / จัดการ (หน้าต่างเต็มจอ หรือ ช่องที่วางในหน้าอื่น)
  const INL = [];   // ช่องที่วางในหน้าอื่น (inline)
  const run = (c, fn) => { const k = S; S = c; try { return fn(); } finally { S = k; } };

  // ---------- รวบรวมข้อมูล ----------
  function allNotes() {
    const B = S.B, N = B.notes() || {}, out = [];
    Object.keys(N).forEach(k => { if (k.indexOf('proj:') !== 0 || !Array.isArray(N[k])) return; const pid = k.slice(5); if (S.pid && pid !== S.pid) return;
      N[k].forEach(n => { if (n && n.id && B.visible(n)) out.push({ ...n, _pid: pid, _k: k }); }); });
    return out;
  }
  function data() {
    const B = S.B, me = B.me(), em = norm(me.email), notes = allNotes();
    const mineN = notes.filter(n => norm(n.email) === em);
    const projN = notes.filter(n => (n.vis || 'public') === 'public');   // สาธารณะ: ทีมโครงการเห็น (รวมโน้ตทั่วไปแบบเดิมที่ทุกคนเห็น)
    const privN = mineN.filter(n => (n.vis || 'public') !== 'public');   // ส่วนตัว: เห็นคนเดียว / แชร์เฉพาะคน
    const toMeN = notes.filter(n => norm(n.email) !== em && (norm(n.asg) === em || (n.vis === 'people' && (n.shareTo || []).map(norm).includes(em))));
    const tags = ((window.WCTag && WCTag._S && Array.isArray(WCTag._S.open)) ? WCTag._S.open.slice() : []).filter(x => !S.pid || x.project === S.pid);
    const rem = (B.rem() || []).filter(r => !r.done && (!S.pid || r.pid === S.pid)).map(r => ({ ...r, _rem: true }));
    const todoN = notes.filter(n => !n.done && ((norm(n.asg) === em) || (norm(n.email) === em && n.due && !n.asg)));
    const todo = [...rem, ...todoN].sort((a, b) => String(a.due || '9999').localeCompare(String(b.due || '9999')));
    const late = todo.filter(x => { const d = daysTo(x.due); return d != null && d < 0; }).length;
    return { me, em, notes, mineN, privN, projN, toMeN, tags, todo, late, unseen: tags.filter(x => !x.seen_at).length };
  }
  const pname = (pid) => pid === '_gen' ? 'ทั่วไป (ไม่ระบุโครงการ)' : ((S.B.projects().find(p => p.id === pid) || {}).name || S.B.projName(pid) || 'โครงการ');

  // ---------- การ์ดโน้ต ----------
  function visTag(n) { const v = n.vis || 'public'; if (v === 'private') return '<span class="wn-tg pv">🔒 ส่วนตัว</span>';
    if (v === 'people') return `<span class="wn-tg sh">👤 แชร์ ${((n.shareTo || []).length) || ''} คน</span>`; return '<span class="wn-tg pb">👥 ทีมโครงการ</span>'; }
  function noteCard(n, d) {
    const mine = norm(n.email) === d.em, admin = !!d.me.admin, can = mine || admin; const asgMe = norm(n.asg) === d.em;
    const chips = [visTag(n), `<span>📁 ${esc(pname(n._pid))}</span>`];
    if (n.due) chips.push(dueChip(n.due, n.done, n.time)); else if (n.done) chips.push('<span class="wn-tg ok">✓ เสร็จแล้ว</span>');
    if (n.cal && n.due && n._pid !== '_gen') chips.push('<span class="wn-tg cal">📅 อยู่ในปฏิทิน</span>');
    if (n.plan && n.plan.t) chips.push(`<span class="wn-tg pl">🗓 แผนงาน: ${esc(first(n.plan.t, 40))}</span>`);
    if (n.asg) chips.push(`<span class="wn-tg sh">📌 ${asgMe ? 'มอบหมายให้ฉัน' : 'มอบหมาย: ' + esc(S.B.nameOf(n.asg))}</span>`);
    const by = mine ? 'ฉัน' : (n.by || S.B.nameOf(n.email) || '—');
    const acts = [];
    if (!n.done && (mine || asgMe) && (n.due || n.asg)) acts.push(`<button class="wn-b ok" data-done="${esc(n._k)}|${esc(n.id)}">✓ เสร็จ</button>`);
    if (n.done && (mine || asgMe)) acts.push(`<button class="wn-b" data-undone="${esc(n._k)}|${esc(n.id)}">↺ ยังไม่เสร็จ</button>`);
    if (mine) acts.push(`<button class="wn-b" data-edit="${esc(n._k)}|${esc(n.id)}">✎ แก้ไข</button>`);
    if (mine && window.WCTag) acts.push(`<button class="wn-b" data-tagn="${esc(n._k)}|${esc(n.id)}">🏷 แท็กคน</button>`);
    if (n.cal && n.due && n._pid !== '_gen') acts.push(`<button class="wn-b" data-cal="${esc(n._pid)}|${esc(n.due)}">📅 ปฏิทิน</button>`);
    if (n.plan && n.plan.id && n._pid !== '_gen') acts.push(`<button class="wn-b" data-plan="${esc(n._pid)}">🗓 แผนงาน</button>`);
    if (can) acts.push(`<button class="wn-b bad" data-del="${esc(n._k)}|${esc(n.id)}">ลบ</button>`);
    return `<div class="wn-it${n.done ? ' done' : ''}${S.focus === n.id ? ' foc' : ''}" data-nid="${esc(n.id)}"><div class="wn-t">${hl(n.text || '')}</div>
      <div class="wn-m">${chips.join('')}</div><div class="wn-m"><span>โดย <b style="color:#22231C">${hl(by)}</b> · ${esc(when(n.editedAt || n.at))}${n.editedAt ? ' · แก้ไขแล้ว' : ''}</span></div>
      ${acts.length ? '<div class="wn-a">' + acts.join('') + '</div>' : ''}</div>`;
  }
  function tagCard(x) {
    const ap = x.kind === 'approve';
    return `<div class="wn-it${x.seen_at ? '' : ' new'}"><div class="wn-m">${ap ? '<span class="wn-tg soon">✍️ ขออนุมัติ</span>' : '<span class="wn-tg">🏷 แท็ก</span>'}${x.project ? '<span>📁 ' + esc(pname(x.project)) + '</span>' : ''}<span style="margin-left:auto">${esc(when(x.created_at))}</span></div>
      <div class="wn-t" style="font-weight:600">${hl(x.title || '(ไม่มีชื่อเรื่อง)')}</div>
      <div class="wn-m">จาก <b style="color:#22231C">${hl(x.from_name || x.from_email || '—')}</b></div>${x.note ? '<div class="wn-t" style="background:#F3EEE3;border-radius:10px;padding:7px 10px;font-size:14px">' + hl(x.note) + '</div>' : ''}
      <div class="wn-a">${x.url ? `<button class="wn-b p" data-tgo="${esc(x.id)}">เปิดเรื่อง</button>` : ''}<button class="wn-b" data-tdone="${esc(x.id)}">✓ ${ap ? 'จัดการแล้ว' : 'รับทราบ'}</button></div></div>`;
  }
  function sentCard(x) {
    const st = x.done_at ? '<span class="wn-tg ok">✓ เสร็จแล้ว</span>' : x.seen_at ? '<span class="wn-tg">👁 เห็นแล้ว</span>' : '<span class="wn-tg soon">ยังไม่เห็น</span>';
    return `<div class="wn-it"><div class="wn-m"><span class="wn-tg">${x.kind === 'approve' ? '✍️ ขออนุมัติ' : '🏷 แท็ก'}</span>${x.project ? '<span>📁 ' + esc(pname(x.project)) + '</span>' : ''}<span style="margin-left:auto">${esc(when(x.created_at))}</span></div>
      <div class="wn-t" style="font-weight:600">${hl(x.title || '(ไม่มีชื่อเรื่อง)')}</div>
      <div class="wn-m">ถึง <b style="color:#22231C">${hl(x.to_name || x.to_email || '—')}</b> ${st}</div>${x.note ? '<div class="wn-t" style="background:#F3EEE3;border-radius:10px;padding:7px 10px;font-size:14px">' + hl(x.note) + '</div>' : ''}
      ${x.url ? `<div class="wn-a"><button class="wn-b" data-tgo="${esc(x.id)}">เปิดเรื่อง</button></div>` : ''}</div>`;
  }
  const SEEN = {};   // แท็กที่แสดงแล้ว → บอกระบบว่าเห็นแล้ว (เหมือนปิดหน้ากระดิ่งเดิม)
  function remCard(r) {
    return `<div class="wn-it"><label class="wn-ck"><input type="checkbox" data-rem="${esc(r.pid)}|${esc(r.id)}"><span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
      <span class="wn-t">${hl(r.text || '')}</span><span class="wn-m"><span class="wn-tg">📋 งานคงค้างโครงการ</span><span>📁 ${esc(pname(r.pid))}</span>${r.due ? dueChip(r.due, false) : ''}${r.by ? '<span>มอบหมายโดย ' + esc(r.by) + '</span>' : ''}</span></span></label></div>`;
  }
  function todoNote(n, d) {
    return `<div class="wn-it${S.focus === n.id ? ' foc' : ''}"><label class="wn-ck"><input type="checkbox" data-done="${esc(n._k)}|${esc(n.id)}"><span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
      <span class="wn-t">${hl(n.text || '')}</span><span class="wn-m"><span class="wn-tg">📝 โน้ต</span><span>📁 ${esc(pname(n._pid))}</span>${n.due ? dueChip(n.due, false, n.time) : ''}${norm(n.email) !== d.em ? '<span>จาก ' + esc(n.by || S.B.nameOf(n.email)) + '</span>' : ''}${n.plan && n.plan.t ? '<span class="wn-tg pl">🗓 ' + esc(first(n.plan.t, 30)) + '</span>' : ''}</span></span></label></div>`;
  }

  // ---------- หน้าหลัก ----------
  function render() {
    if (!S.B) return; const bx = S.inline ? S.box : (S.ov && S.ov.querySelector('.wn-bx')); if (!bx) return; const d = data();
    const T = [['mine', '🔒 ส่วนตัว', d.privN.filter(n => !n.done).length, 0], ['proj', '👥 สาธารณะ · โครงการ', d.projN.filter(n => !n.done).length, 0],
      ['tag', '🏷 แท็กถึงฉัน', d.tags.length + d.toMeN.filter(n => !n.done).length, d.unseen], ['todo', '✅ งานค้าง', d.todo.length, d.late]];
    const q = norm(S.q).trim(), match = (s) => !q || norm(s).includes(q);
    let body = '', chips = '';
    const projChips = (L) => { const ids = [...new Set(L.map(n => n._pid))]; if (ids.length < 2 || S.pid) return '';
      return `<div class="wn-chips"><button class="wn-chip${!S.proj ? ' on' : ''}" data-pj="">ทุกโครงการ</button>${ids.map(id => `<button class="wn-chip${S.proj === id ? ' on' : ''}" data-pj="${esc(id)}">${esc(pname(id))}</button>`).join('')}</div>`; };
    const byProj = (L) => L.filter(n => !S.proj || n._pid === S.proj);
    const newest = (a, b) => String(b.editedAt || b.at || '').localeCompare(String(a.editedAt || a.at || ''));
    const groups = (L, card) => { const g = byDue(L), sec = (t, A) => A.length ? '<div class="wn-sec">' + t + ' (' + A.length + ')</div>' + A.map(card).join('') : '';
      return sec('📅 กำลังจะถึง', g.up) + sec('⚠️ เลยกำหนด', g.late) + sec('🗒 ไม่มีกำหนดวัน', g.none); };
    const listDone = (L, em) => { const open = L.filter(n => !n.done), dn = L.filter(n => n.done);
      return open.length || dn.length ? groups(open, n => noteCard(n, d)) + (dn.length ? '<div class="wn-sec">✓ เสร็จแล้ว</div>' + dn.slice(0, 30).map(n => noteCard(n, d)).join('') : '') : em; };
    if (S.tab === 'mine') {
      const L = byProj(d.privN).filter(n => match(n.text)).sort(newest); chips = projChips(d.privN);
      body = '<div class="wn-hint" style="padding:2px 2px 0">🔒 บันทึกส่วนตัว — เห็นเฉพาะคุณ (👤 = แชร์เฉพาะคนที่แท็ก)</div>' + listDone(L, '<div class="wn-em">ยังไม่มีบันทึกส่วนตัว<br>กด “＋ บันทึกใหม่” แล้วเลือก “🔒 ส่วนตัว” — เห็นคนเดียว<br>ใส่วันที่แล้วขึ้นในแท็บ “งานค้าง” / ลงปฏิทินได้</div>');
    } else if (S.tab === 'proj') {
      const base = d.projN.filter(n => S.who !== 'me' || norm(n.email) === d.em);
      const L = byProj(base).filter(n => match(n.text + ' ' + (n.by || ''))).sort(newest);
      const nMe = d.projN.filter(n => norm(n.email) === d.em).length;
      chips = `<div class="wn-chips"><button class="wn-chip${S.who !== 'me' ? ' on' : ''}" data-who="">👥 ทุกคน (${d.projN.length})</button><button class="wn-chip${S.who === 'me' ? ' on' : ''}" data-who="me">✍️ เฉพาะของฉัน (${nMe})</button></div>` + projChips(base);
      body = '<div class="wn-hint" style="padding:2px 2px 0">👥 บันทึกสาธารณะ — ทีมโครงการเห็นทุกคน</div>' + listDone(L, '<div class="wn-em">ยังไม่มีบันทึกสาธารณะ<br>(บันทึกที่เลือก “👥 ทีมโครงการเห็น” ของโครงการที่คุณอยู่ในทีม จะขึ้นที่นี่)</div>');
    } else if (S.tab === 'tag') {
      const sub = S.tagSub === 'sent' ? 'sent' : 'me', T0 = window.WCTag && WCTag._S ? WCTag._S : {};
      chips = `<div class="wn-chips"><button class="wn-chip${sub === 'me' ? ' on' : ''}" data-tsub="me">📥 ถึงฉัน (${d.tags.length + d.toMeN.filter(n => !n.done).length})</button><button class="wn-chip${sub === 'sent' ? ' on' : ''}" data-tsub="sent">📤 ฉันแท็กไป</button></div>`;
      if (sub === 'sent') {
        const L = (Array.isArray(T0.sent) ? T0.sent : []).filter(x => (!S.pid || x.project === S.pid) && match(x.title + ' ' + (x.note || '') + ' ' + (x.to_name || '')));
        body = S.sentBusy ? '<div class="wn-em">กำลังโหลด…</div>' : S.sentErr && !L.length ? '<div class="wn-em">โหลดรายการไม่สำเร็จ — ตรวจอินเทอร์เน็ต แล้วกด “📤 ฉันแท็กไป” อีกครั้ง</div>' : L.length ? '<div class="wn-sec">เรื่องที่คุณแท็กคนอื่น · 30 วันล่าสุด (' + L.length + ')</div>' + L.map(sentCard).join('') : '<div class="wn-em">ยังไม่ได้แท็กใครใน 30 วันที่ผ่านมา</div>';
      } else {
        const tg = d.tags.filter(x => match(x.title + ' ' + (x.note || '') + ' ' + (x.from_name || ''))), nn = d.toMeN.filter(n => match(n.text)).sort(newest);
        body = (tg.length ? '<div class="wn-sec">มีคนแท็กคุณ (' + tg.length + ')</div>' + tg.map(tagCard).join('') : '')
          + (nn.length ? '<div class="wn-sec">โน้ตที่แชร์ / มอบหมายให้คุณ (' + nn.length + ')</div>' + nn.map(n => noteCard(n, d)).join('') : '')
          || '<div class="wn-em">ไม่มีเรื่องค้าง — ยังไม่มีใครแท็กคุณ</div>';
        const un = d.tags.filter(x => !x.seen_at && !SEEN[x.id]).map(x => x.id); if (un.length && window.WCTag && WCTag.markSeen) { un.forEach(id => { SEEN[id] = 1; }); setTimeout(() => { try { WCTag.markSeen(un); } catch (e) {} }, 1500); }
      }
    } else {
      const L = d.todo.filter(x => match(x.text));
      body = L.length ? '<div class="wn-hint" style="padding:2px 2px 0">ติ๊กช่องเมื่อทำเสร็จ · วันที่ใกล้ถึงขึ้นก่อน</div>' + groups(L, x => x._rem ? remCard(x) : todoNote(x, d))
        : '<div class="wn-em">ไม่มีงานค้าง 🎉<br>งานคงค้างที่ PM มอบหมายให้คุณ และโน้ตที่มีกำหนดวัน จะขึ้นที่นี่</div>';
    }
    bx.innerHTML = `<div class="wn-hd"><span class="ic">📝</span><b>Notes<small>บันทึก · งานของฉัน${S.pid ? ' · ' + esc(pname(S.pid)) : ' · ' + esc(d.me.name || '')} · ส่วนตัว / โครงการ · แท็ก · งานค้าง</small></b>${S.inline ? '<button class="wn-x" data-full title="เปิดเต็มจอ">⤢ เต็มจอ</button>' : '<button class="wn-x" data-x aria-label="ปิด">✕</button>'}</div>
      <div class="wn-tabs">${T.map(t => `<button class="wn-tab${S.tab === t[0] ? ' on' : ''}" data-tab="${t[0]}">${t[1]}${t[2] ? ' <i' + (t[3] ? ' class="u"' : '') + '>' + t[2] + '</i>' : ''}</button>`).join('')}</div>
      <div class="wn-bar"><input class="wn-in" type="search" data-q placeholder="ค้นหาในบันทึก…" value="${esc(S.q)}" autocomplete="off">${S.tab === 'tag' && window.WCTag && WCTag._S && WCTag._S.onTag ? '<button class="wn-b" data-there>🏷 แท็กคน</button>' : ''}${S.tab === 'tag' && S.tagSub !== 'sent' && d.tags.length && window.WCTag && WCTag.markDone ? '<button class="wn-b" data-tackall>✓ รับทราบทั้งหมด</button>' : ''}</div>
      ${chips}<div class="wn-bd">${q ? '<div class="wn-cnt">🔎 คำว่า “<b>' + esc(S.q.trim()) + '</b>” พบ ' + (body.split('<mark class="wn-hl">').length - 1) + ' จุด ใน ' + (body.split('class="wn-it').length - 1) + ' รายการ</div>' : ''}${body}</div>
      <div class="wn-ft">${S.inline ? '' : '<button class="wn-b big" data-x>ปิด</button>'}<button class="wn-b g big" data-new>＋ บันทึกใหม่</button></div>`;
    S.sig = sig();
    if (q && !S.focus && !S.inline) { const m = bx.querySelector('.wn-hl'); if (m) { try { m.scrollIntoView({ block: 'nearest' }); } catch (e) {} } }   // ข้อความยาว → เลื่อนให้เห็นคำแรกที่พบ
    if (S.focus && !S.inline) { const f = bx.querySelector('.wn-it.foc'); if (f) { try { f.scrollIntoView({ block: 'center' }); } catch (e) {} } }
  }
  function sig() { try { const B = S.B; return JSON.stringify([B.notes(), B.rem(), window.WCTag && WCTag._S ? WCTag._S.open.map(x => x.id + (x.seen_at || '')) : []]).length + ':' + JSON.stringify(B.notes()).slice(-200); } catch (e) { return ''; } }

  const findNote = (key) => { const [k, id] = String(key).split('|'); const L = ((S.B.notes() || {})[k] || []); return { k, id, n: L.find(x => x.id === id) }; };
  async function onClick(e) {
    const t = e.target; const B = S.B; if (!B) return; const C = S; const later = () => setTimeout(() => run(C, render), 60);
    if (!C.inline && (t === S.ov || t.closest('[data-x]'))) { close(); return; }
    if (t.closest('[data-full]')) { open(B, { tab: C.tab, pid: C.pid }); return; }
    const tb = t.closest('[data-tab]'); if (tb) { S.tab = tb.dataset.tab; S.proj = ''; render(); return; }
    const pj = t.closest('[data-pj]'); if (pj) { S.proj = pj.dataset.pj; render(); return; }
    const wh = t.closest('[data-who]'); if (wh) { S.who = wh.dataset.who; S.proj = ''; render(); return; }
    if (t.closest('[data-new]')) { editor(null); return; }
    const ts = t.closest('[data-tsub]'); if (ts) { C.tagSub = ts.dataset.tsub; if (C.tagSub === 'sent' && window.WCTag && WCTag.loadSent) { C.sentBusy = true; C.sentErr = false; render(); try { await Promise.race([WCTag.loadSent(), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 8000))]); } catch (x) { C.sentErr = true; } C.sentBusy = false; run(C, render); } else render(); return; }
    if (t.closest('[data-there]')) { if (!C.inline) close(); if (window.WCTag && WCTag.here) WCTag.here(); return; }
    if (t.closest('[data-tackall]')) { const ids = (WCTag._S.open || []).filter(x => !C.pid || x.project === C.pid).map(x => x.id); if (!ids.length || !confirm('รับทราบทั้งหมด ' + ids.length + ' เรื่อง?')) return; await WCTag.markDone(ids); toast('รับทราบแล้ว ' + ids.length + ' เรื่อง'); run(C, render); return; }
    const ed = t.closest('[data-edit]'); if (ed) { const f = findNote(ed.dataset.edit); if (f.n) editor({ ...f.n, _pid: f.k.slice(5), _k: f.k }); return; }
    const dn = t.closest('[data-done]'); if (dn) { const f = findNote(dn.dataset.done); if (f.n) { B.update(f.k, f.id, { done: true, doneAt: new Date().toISOString(), doneBy: B.me().name || '' }); toast('ปิดงานแล้ว ✓'); } later(); return; }
    const ud = t.closest('[data-undone]'); if (ud) { const f = findNote(ud.dataset.undone); if (f.n) B.update(f.k, f.id, { done: false, doneAt: '', doneBy: '' }); later(); return; }
    const dl = t.closest('[data-del]'); if (dl) { const f = findNote(dl.dataset.del); if (f.n && confirm('ลบบันทึกนี้?\n\n' + first(f.n.text, 120))) { B.del(f.k, f.id); toast('ลบบันทึกแล้ว'); later(); } return; }
    const cl = t.closest('[data-cal]'); if (cl) { const [pid, iso] = cl.dataset.cal.split('|'); close(); B.openCal(pid, iso); return; }
    const pl = t.closest('[data-plan]'); if (pl) { close(); B.openPlan(pl.dataset.plan); return; }
    const tn = t.closest('[data-tagn]'); if (tn) { const f = findNote(tn.dataset.tagn); if (f.n) tagNote(f.k, f.n); return; }
    const rm = t.closest('[data-rem]'); if (rm) { const [pid, id] = rm.dataset.rem.split('|'); B.remToggle(pid, id); toast('ปิดงานคงค้างแล้ว ✓'); later(); return; }
    const tg = t.closest('[data-tgo]'); if (tg && window.WCTag) { const x = (WCTag._S.open || []).concat(WCTag._S.sent || []).find(y => y.id === tg.dataset.tgo); if (x) { close(); if (WCTag.go) WCTag.go(x); else if (x.url) location.href = x.url; } return; }
    const td = t.closest('[data-tdone]'); if (td && window.WCTag && WCTag.markDone) { await WCTag.markDone([td.dataset.tdone]); toast('รับทราบแล้ว'); run(C, render); return; }
  }

  // ---------- แท็กคนในโน้ต ----------
  async function tagNote(k, n) {
    const B = S.B, C = S, pid = k.slice(5); if (!window.WCTag) return;
    const r = await WCTag.pick({ title: 'แท็กคนในบันทึกนี้', sub: 'คนที่ถูกแท็กเห็นบันทึกนี้ในแท็บ “แท็กถึงฉัน” และได้แจ้งเตือนเมื่อเปิดแอป', project: pid === '_gen' ? '' : pid });
    if (!r || !r.to || !r.to.length) return;
    if ((n.vis || 'public') !== 'public') { const cur = (n.shareTo || []).map(norm); B.update(k, n.id, { vis: 'people', shareTo: [...new Set([...cur, ...r.to.map(norm)])] }); }
    await WCTag.send({ project: pid === '_gen' ? null : pid, ref_type: 'note', ref_id: n.id, title: '📝 ' + first(n.text, 90), note: r.note || '', url: B.noteUrl(n.id), to: r.to });
    setTimeout(() => run(C, render), 80);
  }

  // ---------- เพิ่ม / แก้ไขบันทึก ----------
  function editor(n0) {
    const B = S.B, C = S, me = B.me(), P = B.projects(); const isNew = !n0;
    const f = { text: n0 ? n0.text || '' : '', pid: n0 ? n0._pid : (C.pid || (C.proj && C.proj !== '_gen' ? C.proj : (B.curPid() && P.some(p => p.id === B.curPid()) ? B.curPid() : '_gen'))),
      vis: n0 ? (n0.vis || 'public') : 'private', due: n0 ? n0.due || '' : '', time: n0 && okTime(n0.time) ? n0.time : '', cal: n0 ? !!n0.cal : false, plan: n0 && n0.plan ? { ...n0.plan } : null };
    const ov = document.createElement('div'); ov.className = 'wn-ov'; ov.style.zIndex = '2147482600'; ov.setAttribute('translate', 'no');
    ov.innerHTML = '<div class="wn-bx ed" role="dialog" aria-modal="true"></div>'; document.body.appendChild(ov); const bx = ov.firstChild;
    const draw = () => {
      const gen = f.pid === '_gen'; if (gen && f.vis === 'public') f.vis = 'private'; if (gen) { f.cal = false; f.plan = null; }
      const plans = gen ? [] : (B.plans(f.pid) || []);
      bx.innerHTML = `<div class="wn-hd"><span class="ic">${isNew ? '＋' : '✎'}</span><b>${isNew ? 'บันทึกใหม่' : 'แก้ไขบันทึก'}<small>${esc(me.name || '')}</small></b><button class="wn-x" data-c aria-label="ปิด">✕</button></div>
        <div class="wn-bd" style="padding:12px;gap:12px">
          <label class="wn-f"><span>ข้อความ</span><textarea class="wn-in" data-f="text" maxlength="4000" placeholder="เช่น โทรตาม supplier หินอ่อน เรื่องวันส่ง / ตรวจระดับฝ้าห้อง 1203 ก่อนปิดฝ้า">${esc(f.text)}</textarea></label>
          <label class="wn-f"><span>โครงการ</span><select class="wn-in" data-f="pid"><option value="_gen"${gen ? ' selected' : ''}>— ทั่วไป (ไม่ระบุโครงการ) —</option>${P.map(p => `<option value="${esc(p.id)}"${f.pid === p.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
          <div class="wn-f"><span>ใครเห็น</span><div class="wn-seg"><button class="wn-b${f.vis === 'private' ? ' on' : ''}" data-vis="private">🔒 ส่วนตัว — เห็นคนเดียว</button><button class="wn-b${f.vis === 'public' ? ' on' : ''}" data-vis="public"${gen ? ' disabled style="opacity:.45"' : ''}>👥 ทีมโครงการเห็น</button></div>
            ${f.vis === 'people' ? `<div class="wn-hint">👤 แชร์ให้ ${(n0 && n0.shareTo || []).length} คน (จากการแท็ก) · กดเลือกด้านบนเพื่อเปลี่ยน</div>` : ''}${gen ? '<div class="wn-hint">บันทึกทั่วไปเป็นแบบส่วนตัว — เลือกโครงการถ้าต้องการให้ทีมเห็น / ลงปฏิทิน</div>' : ''}</div>
          <div class="wn-f"><span>กำหนดวัน / เวลา (ไม่บังคับ) — มีวันที่ = ขึ้นในแท็บ “งานค้าง”</span><div style="display:flex;gap:8px;flex-wrap:wrap"><input class="wn-in" type="date" data-f="due" value="${esc(f.due)}" aria-label="วันที่" style="flex:1 1 170px"><input class="wn-in" type="time" data-f="time" value="${esc(f.time)}" aria-label="เวลา" style="flex:0 1 140px">${f.time ? '<button class="wn-b" data-notime type="button" title="ไม่ระบุเวลา">✕ เวลา</button>' : ''}</div></div>
          ${gen ? '' : `<div class="wn-box"><b style="font-size:14px">เชื่อมกับปฏิทิน / แผนงานโครงการ</b>
            <label class="wn-ck"><input type="checkbox" data-f="cal"${f.cal ? ' checked' : ''}><span>📅 แสดงในปฏิทินโครงการ<br><span class="wn-hint">ขึ้นในหน้า “ปฏิทิน” และปฏิทินพื้นที่ทำงาน ตามวันที่กำหนด${f.vis === 'private' ? ' · บันทึกส่วนตัว = เห็นในปฏิทินเฉพาะคุณ' : ''}</span></span></label>
            <label class="wn-f"><span>🗓 งานในแผนงาน (ไม่บังคับ)</span><select class="wn-in" data-f="plan"><option value="">— ไม่เชื่อม —</option>${plans.map(r => `<option value="${esc(r.id)}"${f.plan && f.plan.id === r.id ? ' selected' : ''}>${esc(first(r.title, 60))}${r.end ? ' · จบ ' + esc(dmy(r.end)) : ''}${r.sched && r.sched !== 'แผนงานหลัก' ? ' · ' + esc(r.sched) : ''}</option>`).join('')}</select>
              ${plans.length ? '' : '<span class="wn-hint">โครงการนี้ยังไม่มีแผนงาน</span>'}${f.plan && f.plan.e && f.plan.e !== f.due ? `<button class="wn-b" data-usend style="align-self:flex-start">ใช้วันจบงาน ${esc(dmy(f.plan.e))} เป็นกำหนดวัน</button>` : ''}</label></div>`}
        </div>
        <div class="wn-ft"><button class="wn-b big" data-c>ยกเลิก</button>${window.WCTag ? '<button class="wn-b big" data-save="tag">บันทึก + 🏷 แท็กคน</button>' : ''}<button class="wn-b p big" data-save="1">บันทึก</button></div>`;
    };
    const grab = () => { const v = (k) => { const el = bx.querySelector('[data-f="' + k + '"]'); return el ? (el.type === 'checkbox' ? el.checked : el.value) : undefined; };
      const tx = v('text'); if (tx !== undefined) f.text = tx; const pd = v('pid'); if (pd !== undefined) f.pid = pd; const du = v('due'); if (du !== undefined) f.due = du; const tm = v('time'); if (tm !== undefined) f.time = tm; const c = v('cal'); if (c !== undefined) f.cal = c; };
    const done = () => { ov.remove(); };
    bx.addEventListener('change', (e) => { const k = e.target.dataset && e.target.dataset.f; if (!k) return; const old = f.pid; grab();
      if (k === 'pid' && f.pid !== old) f.plan = null;
      if (k === 'plan') { const id = e.target.value; const r = (B.plans(f.pid) || []).find(x => x.id === id); f.plan = r ? { id: r.id, t: r.title || '', s: r.start || '', e: r.end || '' } : null; if (r && r.end && !f.due) f.due = String(r.end).slice(0, 10); }
      if ((k === 'pid' || k === 'plan')) draw(); });
    ov.addEventListener('click', async (e) => {
      const t = e.target; if (t === ov || t.closest('[data-c]')) { done(); return; }
      const vb = t.closest('[data-vis]'); if (vb) { grab(); f.vis = vb.dataset.vis; draw(); return; }
      if (t.closest('[data-notime]')) { grab(); f.time = ''; draw(); return; }
      if (t.closest('[data-usend]')) { grab(); f.due = String(f.plan.e).slice(0, 10); draw(); return; }
      const sv = t.closest('[data-save]'); if (!sv) return; grab();
      const text = String(f.text || '').trim(); if (!text) { toast('พิมพ์ข้อความก่อน'); return; }
      if (f.cal && !f.due) { toast('ใส่กำหนดวันก่อน — ปฏิทินต้องมีวันที่'); return; }
      if (f.time && !f.due) { toast('ใส่วันที่ก่อน — เวลาต้องมีวันที่'); return; }
      const patch = { text, vis: f.vis, due: f.due || '', time: f.due && okTime(f.time) ? f.time : '', cal: !!(f.cal && f.due && f.pid !== '_gen'), plan: f.pid !== '_gen' && f.plan ? f.plan : null };
      if (f.vis !== 'people') patch.shareTo = []; else patch.shareTo = (n0 && n0.shareTo) || [];
      let n;
      if (isNew) n = B.add(f.pid, patch);
      else if (f.pid !== n0._pid) { B.del(n0._k, n0.id); n = B.add(f.pid, { ...patch, asg: n0.asg || '', done: !!n0.done, at: n0.at, editedAt: new Date().toISOString() }); }
      else { B.update(n0._k, n0.id, { ...patch, editedAt: new Date().toISOString(), editedBy: me.name || '' }); n = { ...n0, ...patch }; }
      done(); if (!n) return; C.focus = n.id; C.tab = patch.vis === 'public' ? 'proj' : 'mine'; C.proj = ''; C.who = '';
      toast(isNew ? (patch.vis === 'public' ? 'บันทึกแล้ว — ทีมโครงการเห็น (แท็บสาธารณะ)' : 'บันทึกแล้ว — เห็นเฉพาะคุณ (แท็บส่วนตัว)') + (patch.cal ? ' · ขึ้นในปฏิทินแล้ว' : '') : 'แก้ไขบันทึกแล้ว');
      setTimeout(() => run(C, () => { render(); if (sv.dataset.save === 'tag') tagNote('proj:' + f.pid, { ...n, ...patch }); }), 80);
    });
    draw(); setTimeout(() => { const ta = bx.querySelector('textarea'); if (ta && isNew) ta.focus(); }, 50);
  }

  // ---------- เปิด / ปิด ----------
  function open(bridge, o) { return run(OV, () => open0(bridge, o)); }
  function open0(bridge, o) {
    css(); o = o || {}; if (!bridge) return; S.B = bridge; S.pid = o.pid || ''; if (o.tab) S.tab = o.tab; S.tagSub = 'me'; S.focus = o.focus || ''; S.q = ''; S.proj = ''; S.who = '';
    if (S.focus) { const n = allNotes().find(x => x.id === S.focus); if (n) { const em = norm(bridge.me().email); S.tab = (n.vis || 'public') === 'public' && norm(n.asg) !== em ? 'proj' : norm(n.email) === em ? 'mine' : 'tag'; } else toast('ไม่พบบันทึกนี้ — อาจถูกลบ หรือคุณไม่มีสิทธิ์เห็น', 3500); }
    if (!S.ov) { S.ov = document.createElement('div'); S.ov.className = 'wn-ov'; S.ov.setAttribute('translate', 'no'); S.ov.innerHTML = '<div class="wn-bx" role="dialog" aria-modal="true" aria-label="บันทึก · งานของฉัน"></div>';
      S.ov.addEventListener('click', (e) => run(OV, () => onClick(e)));
      S.ov.addEventListener('input', (e) => run(OV, () => onInput(e)));
      document.body.appendChild(S.ov);
      document.addEventListener('keydown', onKey); }
    try { if (window.WCTag && WCTag.refresh) WCTag.refresh(); } catch (e) {}
    render();
    clearInterval(S.timer); S.timer = setInterval(() => run(OV, () => { if (!S.ov) return; const a = document.activeElement; if (a && S.ov.contains(a) && a.matches('input,textarea,select')) return; if (document.querySelector('.wn-bx.ed')) return; const s = sig(); if (s !== S.sig) render(); }), 2000);
  }
  function onInput(e) { if (!e.target.matches('[data-q]')) return; const box = S.inline ? S.host : S.ov; S.q = e.target.value; const pos = e.target.selectionStart; render(); const q = box && box.querySelector('[data-q]'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (x) {} } }

  // ---------- วางหน้าบันทึกชุดเดียวกันในหน้าอื่น (inline) ----------
  // <div data-wn-host="space|home" [data-wn-pid="<pid>"] [data-wn-tab="mine|proj|tag|todo"]></div> → วางอัตโนมัติ (bridge จาก window.__wnBridge())
  function mount(host, bridge, o) { if (!host || !bridge) return null; css(); o = o || {};
    let c = INL.find(x => x.host === host); if (c) { c.B = bridge; run(c, render); return c; }
    c = { B: bridge, host, inline: true, box: null, tab: o.tab || 'mine', q: '', proj: '', who: '', focus: '', sig: '', pid: o.pid || '' };
    host.innerHTML = '<div class="wn-inl" translate="no"><div class="wn-bx" role="region" aria-label="บันทึก · งานของฉัน"></div></div>'; c.box = host.querySelector('.wn-bx');
    host.addEventListener('click', (e) => run(c, () => onClick(e)));
    host.addEventListener('input', (e) => run(c, () => onInput(e)));
    INL.push(c); run(c, render); return c; }
  function scan() { const br = window.__wnBridge; if (typeof br !== 'function') return;
    document.querySelectorAll('[data-wn-host]').forEach(h => { const c = INL.find(x => x.host === h);
      if (c && h.querySelector('.wn-inl')) { const p = h.getAttribute('data-wn-pid') || ''; if (p !== c.pid) { c.pid = p; c.proj = ''; c.q = ''; c.focus = ''; run(c, render); } return; }   // หน้าเดิม เปลี่ยนโครงการ
      if (c) INL.splice(INL.indexOf(c), 1);
      try { mount(h, br(), { pid: h.getAttribute('data-wn-pid') || '', tab: h.getAttribute('data-wn-tab') || '' }); } catch (e) {} }); }
  let scanQ = 0; const scanSoon = () => { if (scanQ) return; scanQ = requestAnimationFrame(() => { scanQ = 0; scan(); }); };
  if (typeof MutationObserver !== 'undefined') { const start = () => { try { new MutationObserver(scanSoon).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-wn-pid'] }); scanSoon(); } catch (e) {} };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start); }
  setInterval(() => { for (let i = INL.length - 1; i >= 0; i--) { const c = INL[i]; if (!c.host.isConnected) { INL.splice(i, 1); continue; }
      const a = document.activeElement; if (a && c.host.contains(a) && a.matches('input,textarea,select')) continue; if (document.querySelector('.wn-bx.ed')) continue;
      run(c, () => { const s = sig(); if (s !== c.sig) render(); }); } }, 2000);
  function onKey(e) { if (e.key === 'Escape' && OV.ov && !document.querySelector('.wn-bx.ed') && !document.querySelector('.wct-ov')) close(); }
  function close() { if (OV.ov) { OV.ov.remove(); OV.ov = null; } clearInterval(OV.timer); document.removeEventListener('keydown', onKey); }

  // ---------- จำนวนบนการ์ดหน้าแรก ----------
  function counts(bridge) { return run({ B: bridge, pid: '' }, () => counts0()); }
  function counts0() { try { const d = data(); return { mine: d.mineN.filter(n => !n.done).length, tag: d.tags.length + d.toMeN.filter(n => !n.done).length, unseen: d.unseen, todo: d.todo.length, late: d.late }; } catch (e) { return { mine: 0, tag: 0, unseen: 0, todo: 0, late: 0 }; } }

  window.WCNote = { VER, open, close, counts, mount, scan, isOpen: () => !!OV.ov, _S: OV, _INL: INL };
})();
