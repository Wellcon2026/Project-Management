/* =====================================================================
   Wellcon PM · Layboard (Presentation Board) — ประตูเข้าใช้ต่อโครงการ
   • เปิดได้จากเมนูในโครงการเท่านั้น: /layboard/index.html?pid=<project id> (+ &env=staging)
   • ล็อกอิน = บัญชี Wellcon PM ในเครื่องนี้ (ไม่มี PIN ของ Layboard) · ต้องได้รับมอบหมายในโครงการนั้น
   • ข้อมูล = ฐานข้อมูล Wellcon PM ตาราง layboard_kv (แยกจากแอป Layboard เดิม 100%) · แยกพื้นที่ตามโครงการ (key ขึ้นต้น p:<pid>:)
   • รูป = Storage bucket general-photo/layboard/<pid>/
   ===================================================================== */
(function () {
  'use strict';
  const CFG = { url: 'https://botecmzshubflokkdant.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdGVjbXpzaHViZmxva2tkYW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MDYyNDIsImV4cCI6MjEwMDk4MjI0Mn0.30LVGfjbT1TcZSBszenrZcNp3_k1oZpPNMbmSrF1rzo' };
  const h = location.hostname, q = location.search;
  const schema = /[?&]env=prod/.test(q) ? 'public' : (/[?&]env=staging/.test(q) || /staging/i.test(h) || /^(localhost|127\.0\.0\.1)$/.test(h)) ? 'staging' : 'public';
  const pid = new URLSearchParams(q).get('pid') || '';
  const SESS_KEY = 'wellcon_pm_session_v1', SESS_DAYS = 14;
  const ALL_SCOPE = ['superadmin', 'director', 'store', 'pm_mgr', 'design_mgr', 'qs_mgr', 'fin_mgr', 'hr_mgr'];
  const norm = s => String(s || '').trim().toLowerCase();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rowOf = r => ({ ...(r.data || {}), id: r.id, ...(r.project ? { project: r.project } : {}) });
  const sb = window.supabase.createClient(CFG.url, CFG.key, { db: { schema }, auth: { persistSession: true, autoRefreshToken: true } });
  const backUrl = '/' + (schema === 'staging' ? '?env=staging' : '') + '#/work';   // กลับ = หน้าแรกของฉัน (หน้าทำงานตามบทบาท)
  const G = { pid, schema, url: CFG.url, key: CFG.key, sb, backUrl, email: '', table: 'layboard_kv', bucket: 'general-photo', prefix: 'layboard/' + pid + '/',
    token: async () => { try { const r = await sb.auth.getSession(); return (r && r.data && r.data.session && r.data.session.access_token) || CFG.key; } catch (e) { return CFG.key; } } };
  window.LB_PM_CFG = G;

  const css = 'position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:#F4EFE6;font-family:"IBM Plex Sans Thai",system-ui,sans-serif;padding:16px';
  function block(title, sub) {
    const go = () => { let el = document.getElementById('lbpm-block'); if (!el) { el = document.createElement('div'); el.id = 'lbpm-block'; document.body.appendChild(el); }
      el.setAttribute('style', css);
      el.innerHTML = '<div style="max-width:440px;width:100%;background:#fff;border:1px solid #E4DED2;border-radius:18px;padding:22px;text-align:center;box-shadow:0 12px 40px rgba(28,27,24,.08)">'
        + '<div style="font-size:12px;letter-spacing:.12em;color:#A08A5C;font-weight:700">WELLCON PM · LAYBOARD</div>'
        + '<div style="font-size:18px;font-weight:800;color:#1C1B18;margin:10px 0 6px">' + esc(title) + '</div>'
        + '<div style="font-size:14px;color:#6E695E;line-height:1.6">' + esc(sub || '') + '</div>'
        + '<a href="' + esc(backUrl) + '" style="display:inline-block;margin-top:16px;background:#1C1B18;color:#F4EFE6;border-radius:12px;padding:11px 18px;font-weight:700;text-decoration:none">← กลับ Wellcon PM</a></div>'; };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  }
  // บทบาท PM → บทบาทใน Layboard (admin = เห็น/จัดการทุกอย่าง · manager = สร้างงาน · member = แก้ไขงานที่เข้าถึงได้)
  const ROLE = { superadmin: 'Super Admin', director: 'Project Director', design_mgr: 'Design Manager', pm: 'Project Manager', pm_mgr: 'Project Manager',
    sitemgr: 'Project Manager', site: 'Project Manager', qs_mgr: 'QS Manager', designer: 'Design Manager' };   // ทุกคนที่เปิดสิทธิ์ = สร้างบอร์ด / โปรเจกต์ย่อย / แก้ไขได้
  const COLORS = ['#c67139', '#56633f', '#8c491a', '#3d6b8c', '#8a4f7d', '#b8892a', '#2f7a6b', '#a8434a'];
  function chip(name) {
    const go = () => { const a = document.createElement('a'); a.href = backUrl; a.id = 'lbpm-chip'; a.title = 'กลับหน้าแรกของฉันใน Wellcon PM';
      a.textContent = '← หน้าแรก PM · ' + name;
      a.setAttribute('style', 'position:fixed;left:50%;transform:translateX(-50%);bottom:10px;z-index:2147482000;max-width:min(60vw,320px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:#1C1B18;color:#F4EFE6;border-radius:999px;padding:8px 14px;font:600 12.5px/1.2 system-ui,sans-serif;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.18);opacity:.92');
      document.body.appendChild(a);
      // ปุ่ม 🏠 หน้าแรก (มุมบน) — คอม: ข้างโลโก้ในแถบซ้าย · มือถือ: แถวเดียวกับ Sort · ซ่อนตอนเปิดบอร์ด (หน้าแก้ไข) ไม่ให้ทับเครื่องมือ
      const hb = document.createElement('a'); hb.href = backUrl; hb.id = 'lbpm-home'; hb.title = 'กลับหน้าแรกของฉันใน Wellcon PM'; hb.setAttribute('aria-label', 'หน้าแรก Wellcon PM');
      hb.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/></svg><span>หน้าแรก</span>';
      const st = document.createElement('style');
      st.textContent = '#lbpm-home{position:fixed;z-index:2147482000;display:inline-flex;align-items:center;gap:6px;background:#1C1B18;color:#F4EFE6;text-decoration:none;border-radius:999px;font:700 13px/1 system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.18);top:18px;right:300px;height:38px;padding:0 14px}'
        + '@media (min-width:760px) and (max-width:1099px){#lbpm-home{right:auto;left:198px;width:38px;padding:0;justify-content:center}#lbpm-home span{display:none}}'
        + '#lbpm-home:hover{background:#C9A961;color:#1C1B18}'
        + '@media (max-width:759px){#lbpm-home{top:58px;left:auto;right:14px;height:36px}}'
        + 'body.lbpm-edit #lbpm-home{display:none}';
      document.head.appendChild(st); document.body.appendChild(hb);
      setInterval(() => { document.body.classList.toggle('lbpm-edit', !!document.querySelector('main[data-canvas]')); }, 800); };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  }
  window.LB_PM_READY = (async () => {
    if (!pid) { block('เปิด Layboard จากเมนูในโครงการเท่านั้น', 'เข้า Wellcon PM → เลือกโครงการ → เมนู "Layboard · Presentation" — แต่ละโครงการมีพื้นที่งานนำเสนอแยกกัน'); return false; }
    let ok = false; try { const r = await sb.auth.getSession(); ok = !!(r && r.data && r.data.session); } catch (e) {}
    if (!ok) { block('ยังไม่ได้เชื่อมต่อ Wellcon PM ในเครื่องนี้', 'เปิด Wellcon PM และเข้าสู่ระบบก่อน แล้วกดเมนู Layboard ในโครงการอีกครั้ง'); return false; }
    const [a, p] = await Promise.all([sb.from('accounts').select('id,data'), sb.from('projects').select('id,project,data').eq('id', pid)]);
    if (a.error) throw a.error; if (p.error) throw p.error;
    let sess = null; try { sess = JSON.parse(localStorage.getItem(SESS_KEY) || 'null'); } catch (e) {}
    // ตัวตนผู้ใช้: ① ที่ PM ส่งมาตอนกดเมนู (wellcon_pm_handoff · ภายใน 12 ชม.) ② session ที่ PM จำไว้ — จับคู่ด้วย อีเมล / รหัสบัญชี / ชื่อผู้ใช้
    let ho = null; try { ho = JSON.parse(localStorage.getItem('wellcon_pm_handoff') || 'null'); } catch (e) {}
    const accs = (a.data || []).map(rowOf).filter(x => x.active !== false && !x.disabled);
    const match = (x, o) => !!o && ((o.email && norm(x.email) === norm(o.email)) || (o.id && String(x.id) === String(o.id)) || (o.username && norm(x.username) === norm(o.username)));
    const hoOk = ho && Date.now() - Number(ho.at || 0) < 12 * 36e5, ssOk = sess && sess.email && Date.now() - Number(sess.at || 0) < SESS_DAYS * 864e5;
    const acc = (hoOk && accs.find(x => match(x, ho))) || (ssOk && accs.find(x => match(x, { email: sess.email }))) || null;
    if (!acc) { block('ยังไม่ได้เข้าสู่ระบบ Wellcon PM ในเครื่องนี้', 'เข้าสู่ระบบที่ Wellcon PM ก่อน แล้วเปิด Layboard จากเมนูในโครงการ · ข้อมูลตรวจสอบ: บัญชี ' + accs.length + ' · PM ส่งตัวตน ' + (hoOk ? '✓' : '✗') + ' · session ' + (ssOk ? '✓' : '✗')); return false; }
    const proj = (p.data || []).map(rowOf).find(x => !x.deleted && !x.del);
    if (!proj) { block('ไม่พบโครงการนี้', 'โครงการอาจถูกลบหรือย้าย — กลับไปเลือกโครงการใน Wellcon PM'); return false; }
    const seesAll = acc.allProj === true || (acc.allProj !== false && ALL_SCOPE.includes(acc.roleKey));
    if (!seesAll && !(acc.projects || []).includes(pid)) { block('คุณไม่ได้รับมอบหมายในโครงการนี้', 'Layboard ของโครงการเปิดได้เฉพาะทีมที่ได้รับมอบหมาย — ติดต่อผู้ดูแลระบบ'); return false; }
    // สิทธิ์ใช้ Layboard (สวิตช์ "Layboard · Presentation" ในหน้าจัดการผู้ใช้ของ PM · ค่าเริ่มต้นตามตำแหน่ง)
    const LAY_DEF = ['superadmin', 'director', 'pm', 'pm_mgr', 'sitemgr', 'site', 'designer', 'design_mgr'];
    const fo = acc.featOff || {}; const layOn = fo.lay === undefined ? LAY_DEF.includes(acc.roleKey) : fo.lay !== true;
    if (!layOn) { block('ยังไม่ได้เปิดสิทธิ์ใช้ Layboard ให้บัญชีนี้', 'แจ้ง Super Admin เปิดสวิตช์ "Layboard · Presentation" ให้บัญชีของคุณที่หน้าจัดการผู้ใช้ใน Wellcon PM'); return false; }
    const t = await sb.from('layboard_kv').select('key').eq('project', pid).limit(1);
    if (t.error) { block('ยังไม่ได้สร้างตาราง layboard_kv ในฐานข้อมูล', 'แจ้ง Admin รันไฟล์ supabase-layboard.sql ใน Supabase ก่อนใช้งาน (' + (t.error.message || t.error.code || '') + ')'); return false; }
    const email = norm(acc.email || acc.username || acc.id), pname = String(proj.name || proj.project || pid);
    G.acc = acc; G.proj = proj; G.email = email; G.projName = pname;
    G.personId = 'u_' + (email.split('@')[0] || String(acc.id || 'me')).replace(/[^a-z0-9]/g, '') ;
    // ใส่ผู้ใช้ PM เข้า workspace ของโครงการนี้ · ตั้งชื่อโปรเจกต์ใน Layboard = ชื่อโครงการ PM · ทุกคนในโครงการแก้ไขได้ (access team)
    G.adopt = (ws) => { ws = { ...ws, authV: 1, people: Array.isArray(ws.people) ? ws.people.slice() : [], projects: Array.isArray(ws.projects) ? ws.projects.slice() : [] };
      const nm = String(acc.nick || '').trim() || acc.name || email, role = ROLE[acc.roleKey] || 'Project Manager', pos = acc.title || role;
      const i = ws.people.findIndex(x => x.id === G.personId || norm(x.email) === email);
      if (i < 0) ws.people.push({ id: G.personId, email, name: nm, position: pos, role, pinHash: '', mustChange: false, active: true, color: COLORS[ws.people.length % COLORS.length], pm: true });
      else { G.personId = ws.people[i].id; ws.people[i] = { ...ws.people[i], name: nm, position: pos, role, active: true, mustChange: false, pm: true }; }
      ws.projects = ws.projects.map((x, k) => ({ ...x, access: 'team', ownerId: x.ownerId || G.personId, ...(k === 0 && (!x.pmNamed) ? { name: pname, client: proj.client || x.client || 'Wellcon Interior', pmNamed: true } : {}) }));
      return ws; };
    window.LB_PM = G;
    try { document.title = 'Layboard · ' + pname + ' — Wellcon PM'; } catch (e) {}
    chip(pname);
    return true;
  })().catch(e => { console.error(e); block('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', String((e && e.message) || e)); return false; });
})();
