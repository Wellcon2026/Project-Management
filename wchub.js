/* =====================================================================
   wchub.js — Learning Center · ศูนย์เรียนรู้ (เดิม Demo Center v1.0.0 · ผู้บริหารสั่ง 21/11/2026 "please proceed" ชั้นที่ 2)
   - เส้นทางของฉัน: ฟังก์ชันที่ตำแหน่งนี้ใช้ (ชุดเดียวกับการ์ด My Space · WORK_DEF) เรียงเป็นเช็กลิสต์ + ความคืบหน้า
   - ทุกฟังก์ชัน: รายชื่อจาก wcfn.js แยกหมวด · กด ▶ เริ่ม → พาไปหน้านั้นแล้วเริ่มสอนแบบจูงมือ (wcguide.js) เอง
   - ทีม (ผู้บริหาร / ผู้จัดการ): ใครเรียนจบกี่เรื่อง
   - โหมดฝึก: เปิดแอปชุดสำเนา (?env=staging · ข้อมูลแยกจากของจริง 100%) ลองกดได้เต็มที่
   ข้อมูลความคืบหน้า: เครื่องนี้ (localStorage wg_done:<key>) + กลางที่ app_state id 'demoProg:<อีเมล>' (1 แถวต่อคน · ไม่ทับกัน)
   ต่อกับแอปหลักผ่าน window.__whBridge() (scripts/patch-demo-center.js) · ไม่มี bridge (แอปแยก) = เก็บในเครื่อง
   ===================================================================== */
(function () {
  'use strict';
  const VER = '1.1.2';   // 1.1.2: Slab Layout · 1.1.1: ชี้ค้างที่รายการ = 💡 ทำไมสำคัญ · 1.1.0: ชื่อ Learning Center · เปิดจากการ์ด (ผู้ดูแลเปิด-ปิดได้) · ไม่มีแถบใน My Space / Training แล้ว
  if (window.WCHub && window.WCHub.VER) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const BR = () => { try { return window.__whBridge ? window.__whBridge() : null; } catch (e) { return null; } };
  const FN = window.WCFN || { title: (k) => k, desc: () => '', all: () => [], groups: {} };
  const hasG = (k) => !!(window.WCGuide && WCGuide.has && WCGuide.has(k));
  const hasS = (k) => !!(window.WCDemo && WCDemo.has && WCDemo.has(k));
  const can = (k) => hasG(k) || hasS(k);
  // ---------- ความคืบหน้า ----------
  const P = { mine: null, team: null, saveT: 0 };
  function localDone() { const o = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('wg_done:') === 0) o[k.slice(8)] = localStorage.getItem(k) || '1'; } } catch (e) {} return o; }
  const same = (k) => [k].concat(Object.keys(ALIAS).filter((a) => ALIAS[a] === k)).concat(ALIAS[k] ? [ALIAS[k]] : []);
  const ALIAS = { 'tab:proc': 'tab:procm', 'tab:mat': 'tab:procm', 'nav:work': 'nav:inbox', 'nav:note': 'note', 'nav:subcon': 'tab:subcon', 'nav:changes': 'tab:changes', 'tab:parties': 'tab:setup', 'nav:calendar': 'tab:cal', 'nav:memo': 'tab:memo' };
  const done = (k, M) => { M = M || mine(); for (const x of same(k)) if (M[x]) return M[x]; return ''; };
  function mine() { return Object.assign({}, P.mine || {}, localDone()); }
  async function loadMine() { const b = BR(); if (!b || !b.sb() || !b.me().email) return mine();
    try { const r = await b.sb().from('app_state').select('data').eq('id', 'demoProg:' + b.me().email).maybeSingle(); P.mine = (r && r.data && r.data.data && r.data.data.v) || {}; } catch (e) {}
    const L = localDone(), M = P.mine || {}; if (Object.keys(L).some((k) => !M[k])) save(); return mine(); }
  function save() { clearTimeout(P.saveT); P.saveT = setTimeout(async () => { const b = BR(); if (!b || !b.sb() || !b.me().email) return; const v = mine(); P.mine = v;
    try { await b.sb().from('app_state').upsert({ id: 'demoProg:' + b.me().email, data: { v, name: b.me().name || '', role: b.me().roleKey || '', at: new Date().toISOString() }, updated_by: b.me().email }); } catch (e) {} }, 600); }
  function mark(k) { try { localStorage.setItem('wg_done:' + k, new Date().toISOString()); } catch (e) {} save(); refresh(); }
  async function loadTeam() { const b = BR(); if (!b || !b.sb()) return [];
    try { const r = await b.sb().from('app_state').select('id,data').like('id', 'demoProg:%'); return (r && r.data) || []; } catch (e) { return []; } }
  // ---------- เส้นทางตามตำแหน่ง ----------
  function pathOf(rk) { const b = BR(); let L = []; try { L = b ? b.path(rk) || [] : []; } catch (e) {}
    const out = []; ['nav:inbox', 'note'].concat(L).forEach((k) => { k = ALIAS[k] || k; if (k && can(k) && out.indexOf(k) < 0) out.push(k); }); return out; }
  // ---------- พาไปหน้า แล้วเริ่มสอน ----------
  const PD = { 'tab:procm': 'proc' };
  const NAVR = { 'tab:cal': 'calendar', 'tab:memo': 'memo', 'tab:subcon': 'subcon' };
  const APPS = { 'tab:quo': 'quotation.html', 'tab:qm': 'quick-measure.html', 'tab:apr': 'auto-pr.html', 'tab:pbook': 'pricebook.html', 'tab:pdf': 'pdf.html', 'tab:photo': 'photo.html', 'tab:lay': 'layboard/index.html', 'tab:slab': 'photo.html?slab=1' };
  function toast(t) { const d = document.createElement('div'); d.textContent = t; d.className = 'wh-toast'; document.body.appendChild(d); setTimeout(() => d.remove(), 3200); }
  function go(k) {
    k = ALIAS[k] || k; const b = BR(); const pid = (b && b.pid()) || ''; close();
    const startWhenReady = () => { if (!hasG(k)) { if (hasS(k)) WCDemo.open(k, { slides: true }); return; }
      const t0 = Date.now(); const iv = setInterval(() => { const cur = WCGuide.curKey && WCGuide.curKey(); const okK = cur && (cur === k || ALIAS[cur] === k);
        const c = okK ? (WCGuide.check(k) || []) : []; if (okK && (!c.length || c[0].found)) { clearInterval(iv); setTimeout(() => WCGuide.start(k), 350); return; }
        if (Date.now() - t0 > 9000) { clearInterval(iv); if (okK) WCGuide.start(k); else toast('เปิดหน้านี้ไม่ได้ — ตำแหน่งของคุณอาจไม่มีสิทธิ์ใช้หน้านี้'); } }, 250); };
    if (k === 'note') { if (b && b.openNote) b.openNote(); return startWhenReady(); }
    if (k === 'tab:setup') { if (b && b.openSetup) b.openSetup(pid); return startWhenReady(); }
    if (APPS[k]) { location.href = '/' + APPS[k] + (APPS[k].indexOf('?') >= 0 ? '&' : '?') + (pid ? 'pid=' + encodeURIComponent(pid) + '&' : '') + (b && b.staging() ? 'env=staging&' : '') + 'wcdemo=' + encodeURIComponent(k); return; }
    if (k === 'tab:qc' || k === 'tab:claim') { const base = ((b && b.staging() && window.__wdcBase) || 'https://wellcon-defect-check.vercel.app/').replace(/\/?$/, '/');
      window.open(base + (k === 'tab:claim' ? 'claim' : '') + '?pid=' + encodeURIComponent(pid) + '&wcdemo=tab:qc', '_blank'); return; }
    if (!b) { if (hasS(k)) WCDemo.open(k, { slides: true }); return; }
    let h = '';
    if (NAVR[k]) h = '#/' + NAVR[k]; else if (k.indexOf('nav:') === 0) h = '#/' + k.slice(4); else if (k.indexOf('tab:') === 0) { if (!pid) { toast('เลือกโครงการก่อน แล้วกดใหม่'); return; } h = '#/p/' + pid + '/' + (PD[k] || k.slice(4)); }
    if (!h) { if (hasS(k)) WCDemo.open(k, { slides: true }); return; }
    if (location.hash === h) startWhenReady(); else { location.hash = h; setTimeout(startWhenReady, 300); }
  }
  // ---------- หน้าต่าง Learning Center ----------
  const S = { ov: null, tab: 'path', role: '', q: '', team: null };
  const CSS = `
.wh-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(28,27,24,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:'IBM Plex Sans Thai',system-ui,sans-serif}
.wh-bx{width:min(980px,100%);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;background:#F6F1E8;border-radius:22px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.35)}
.wh-hd{background:#1C1B18;color:#F4EFE6;padding:18px 20px 14px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.wh-hd .tt{flex:1 1 260px;min-width:0}.wh-hd .k{font-size:10.5px;letter-spacing:.16em;color:#C9A961;font-weight:800}.wh-hd h2{margin:4px 0 2px;font-size:22px;font-weight:700}.wh-hd .s{font-size:12.5px;color:#BDB4A2}
.wh-ring{flex:none;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:15px;color:#F4EFE6}
.wh-ring span{width:50px;height:50px;border-radius:50%;background:#1C1B18;display:grid;place-items:center;font-size:13px}
.wh-x{flex:none;width:38px;height:38px;border-radius:50%;border:1px solid #3A3832;background:transparent;color:#F4EFE6;font-size:20px;cursor:pointer}
.wh-tabs{display:flex;gap:6px;padding:10px 16px 0;background:#1C1B18;flex-wrap:wrap}
.wh-tabs button{border:0;border-radius:12px 12px 0 0;padding:10px 16px;background:transparent;color:#BDB4A2;font:700 13.5px inherit;font-family:inherit;cursor:pointer}
.wh-tabs button.on{background:#F6F1E8;color:#1C1B18}
.wh-bd{flex:1;overflow:auto;padding:16px 18px 20px}
.wh-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
.wh-bar select,.wh-bar input{height:40px;border:1px solid #DDD3C2;border-radius:12px;padding:0 12px;background:#fff;font:14px inherit;font-family:inherit;min-width:0}
.wh-bar input{flex:1 1 220px}
.wh-prac{display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:#FBF3E4;border:1px solid #E8D2A6;border-radius:14px;padding:12px 14px;margin-bottom:14px;font-size:13px;color:#6B4E16}
.wh-prac b{color:#4A3610}.wh-prac .sp{flex:1 1 240px}
.wh-prac button{border:0;border-radius:11px;background:#1C1B18;color:#E2BC66;font:700 13px inherit;font-family:inherit;padding:10px 14px;cursor:pointer}
.wh-g{font-size:11px;letter-spacing:.14em;color:#8A6D3B;font-weight:800;margin:16px 2px 8px}
.wh-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px}
.wh-it{display:flex;gap:12px;align-items:center;background:#fff;border:1px solid #E6DED0;border-radius:14px;padding:12px 12px 12px 14px;min-width:0}
.wh-it.ok{background:#F1F7F2;border-color:#CFE3D4}
.wh-n{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:13px;background:#F0E8DA;color:#8A6D3B}
.wh-it.ok .wh-n{background:#2E7D46;color:#fff}
.wh-t{flex:1;min-width:0}.wh-t b{display:block;font-size:14.5px;color:#1C1B18}.wh-t span{display:block;font-size:12px;color:#7A7360;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wh-t i{font-style:normal;font-size:11px;color:#2E7D46;font-weight:700}
.wh-go{flex:none;border:0;border-radius:11px;padding:9px 12px;background:#1C1B18;color:#E2BC66;font:700 12.5px inherit;font-family:inherit;cursor:pointer;white-space:nowrap}
.wh-it.ok .wh-go{background:#fff;color:#1C1B18;border:1px solid #CFC6B6}
.wh-tbl{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden;font-size:13.5px}
.wh-tbl th,.wh-tbl td{padding:10px 12px;border-bottom:1px solid #EEE6D8;text-align:left}.wh-tbl th{font-size:11px;letter-spacing:.1em;color:#8A6D3B;background:#FBF7EF}
.wh-pb{height:8px;border-radius:99px;background:#EEE6D8;overflow:hidden;min-width:90px}.wh-pb i{display:block;height:100%;background:#C9A961}
.wh-emp{padding:26px;text-align:center;color:#7A7360;font-size:13.5px}
.wh-toast{position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483600;background:#1C1B18;color:#fff;border-radius:12px;padding:10px 16px;font:14px 'IBM Plex Sans Thai',system-ui,sans-serif;max-width:90vw;text-align:center}
.wh-ban{display:flex;gap:14px;align-items:center;flex-wrap:wrap;border:1px solid rgba(201,169,97,.4);background:linear-gradient(100deg,#2A2721,#36312A);color:#F4EFE6;border-radius:18px;padding:14px 16px;font-family:'IBM Plex Sans Thai',system-ui,sans-serif;cursor:pointer}
.wh-ban .ic{flex:none;width:42px;height:42px;border-radius:12px;background:#C9A961;color:#1C1B18;display:grid;place-items:center;font-size:20px}
.wh-ban .tx{flex:1 1 220px;min-width:0}.wh-ban b{display:block;font-size:15px}.wh-ban span{display:block;font-size:12px;color:#BDB4A2}
.wh-ban .pg{flex:1 1 160px;display:flex;align-items:center;gap:10px;font-size:12.5px;font-weight:700;color:#E2BC66}.wh-ban .pg .wh-pb{flex:1;background:#3A3832}
.wh-ban button{flex:none;border:0;border-radius:11px;background:#C9A961;color:#1C1B18;font:800 13px inherit;font-family:inherit;padding:10px 14px;cursor:pointer}
.wh-ban.stg{background:linear-gradient(100deg,#8A3A1E,#B0522F)}
@media(max-width:600px){.wh-ov{padding:0;align-items:stretch}.wh-bx{max-height:100dvh;border-radius:0}.wh-list{grid-template-columns:1fr}.wh-hd{position:relative;padding-right:60px}.wh-hd h2{font-size:19px}.wh-x{position:absolute;top:14px;right:14px}.wh-bd{padding-right:52px}.wh-ring{width:54px;height:54px}.wh-ring span{width:42px;height:42px}}`;
  function css() { if (document.getElementById('wh-css')) return; const s = document.createElement('style'); s.id = 'wh-css'; s.textContent = CSS; document.head.appendChild(s); }
  const ring = (d, n) => { const p = n ? Math.round(d / n * 100) : 0; return `<div class="wh-ring" style="background:conic-gradient(#C9A961 ${p}%,#3A3832 0)"><span>${p}%</span></div>`; };
  function item(k, i, M) { const d = done(k, M); const g = hasG(k);
    const wy = (window.WCGuide && WCGuide.why && WCGuide.why(k)) || null;
    return `<div class="wh-it${d ? ' ok' : ''}"${wy ? ` title="💡 ${esc(wy.w)}"` : ''}><div class="wh-n">${d ? '✓' : (i + 1)}</div><div class="wh-t"><b>${esc(FN.title(k) || k)}</b><span>${esc(FN.desc(k))}</span>${d ? `<i>เรียนแล้ว ${esc(String(d).slice(0, 10).split('-').reverse().join('/'))}</i>` : ''}</div>
      <button class="wh-go" data-go="${esc(k)}" title="${g ? 'พาไปหน้านี้ แล้วสอนแบบจูงมือ' : 'ดูสรุปทีละขั้น'}">${d ? '↻ ดูซ้ำ' : (g ? '▶ เริ่ม' : '▶ ดู')}</button></div>`; }
  function render() {
    const b = BR(), me = b ? b.me() : { name: '', roleKey: '' }, M = mine(); const roles = b ? b.roles() : []; const rk = S.role || me.roleKey || '';
    const path = pathOf(rk); const nd = path.filter((k) => done(k, M)).length;
    const stg = b && b.staging();
    let body = '';
    const prac = stg ? `<div class="wh-prac"><div class="sp">🧪 <b>คุณอยู่ในโหมดฝึก</b> — ข้อมูลเป็นสำเนา ลองกด / บันทึก / ลบได้เต็มที่ ไม่กระทบงานจริง</div></div>`
      : (b ? `<div class="wh-prac"><div class="sp">🧪 <b>โหมดฝึก</b> — เปิดแอปชุดสำเนา (ข้อมูลแยกจากของจริง) ลองทำตาม Demo ได้เต็มที่ ไม่กระทบงานจริง · ใช้ชื่อผู้ใช้ / รหัสเดิม</div><button data-prac>เปิดโหมดฝึก ↗</button></div>` : '');
    if (S.tab === 'path') {
      const ro = roles.length && (me.admin || me.mgr) ? `<select data-role>${roles.map((r) => `<option value="${esc(r.key)}"${r.key === rk ? ' selected' : ''}>${esc(r.label)}</option>`).join('')}</select>` : '';
      body = prac + `<div class="wh-bar"><div style="flex:1;font-size:13.5px;color:#4A4537">เรียงตามงานที่ตำแหน่ง <b>${esc((roles.find((r) => r.key === rk) || {}).label || 'ของคุณ')}</b> ใช้บ่อย — เรียนจากบนลงล่าง ข้อละ 1–2 นาที</div>${ro}</div>`
        + (path.length ? `<div class="wh-list">${path.map((k, i) => item(k, i, M)).join('')}</div>` : '<div class="wh-emp">ยังไม่มีเส้นทางสำหรับตำแหน่งนี้ — ดูแท็บ “ทุกฟังก์ชัน”</div>');
    } else if (S.tab === 'all') {
      const q = S.q.toLowerCase(); const groups = {};
      (FN.all() || []).forEach((f) => { const k = (f.keys || []).map((x) => ALIAS[x] || x).find(can); if (!k) return; if (q && (f.name + ' ' + f.th + ' ' + f.group).toLowerCase().indexOf(q) < 0) return; (groups[f.group] = groups[f.group] || []).some((x) => x === k) || groups[f.group].push(k); });
      body = `<div class="wh-bar"><input data-q placeholder="ค้นหาฟังก์ชัน เช่น Daily · ใบขอซื้อ · แบบ" value="${esc(S.q)}"></div>`
        + (Object.keys(groups).map((g) => `<div class="wh-g">${esc(g)}</div><div class="wh-list">${groups[g].map((k, i) => item(k, i, M)).join('')}</div>`).join('') || '<div class="wh-emp">ไม่พบฟังก์ชัน</div>');
    } else {
      const T = S.team; const ppl = b ? b.people() : [];
      if (!T) body = '<div class="wh-emp">กำลังโหลด…</div>';
      else { const by = {}; T.forEach((r) => { by[String(r.id).slice(9)] = (r.data && r.data) || {}; });
        const rows = ppl.map((p) => { const d = by[p.email] || {}; const v = d.v || {}; const pa = pathOf(p.roleKey); const n = pa.filter((k) => done(k, v)).length; return { p, n, tot: pa.length, all: Object.keys(v).length, at: d.at || '' }; })
          .sort((a, b2) => (b2.tot ? b2.n / b2.tot : 0) - (a.tot ? a.n / a.tot : 0));
        body = `<div class="wh-bar"><div style="flex:1;font-size:13.5px;color:#4A4537">ความคืบหน้าการเรียน Demo ของทีม — นับตามเส้นทางของแต่ละตำแหน่ง</div></div><table class="wh-tbl"><tr><th>ชื่อ</th><th>ตำแหน่ง</th><th>เส้นทาง</th><th>เรียนแล้วทั้งหมด</th><th>ล่าสุด</th></tr>`
          + rows.map((r) => { const pc = r.tot ? Math.round(r.n / r.tot * 100) : 0; return `<tr><td><b>${esc(r.p.name)}</b></td><td>${esc((roles.find((x) => x.key === r.p.roleKey) || {}).label || r.p.roleKey || '—')}</td><td><div style="display:flex;gap:8px;align-items:center"><div class="wh-pb" style="flex:1"><i style="width:${pc}%"></i></div><span>${r.n}/${r.tot}</span></div></td><td>${r.all}</td><td>${r.at ? esc(r.at.slice(0, 10).split('-').reverse().join('/')) : '—'}</td></tr>`; }).join('') + '</table>'; }
    }
    const tabs = [['path', '🎯 เส้นทางของฉัน'], ['all', '📚 ทุกฟังก์ชัน']].concat(me.admin || me.mgr ? [['team', '👥 ทีม']] : []);
    S.ov.innerHTML = `<div class="wh-bx" role="dialog" aria-label="Learning Center"><div class="wh-hd">${ring(nd, path.length)}<div class="tt"><div class="k">LEARNING CENTER · ศูนย์เรียนรู้</div><h2>เรียนรู้ระบบทีละขั้น${me.name ? ' · ' + esc(me.name) : ''}</h2><div class="s">เรียนแล้ว ${nd} / ${path.length} เรื่องในเส้นทางของคุณ · กด ▶ เริ่ม = พาไปหน้าจริง แล้วจูงมือทีละขั้น</div></div><button class="wh-x" data-x aria-label="ปิด">×</button></div>
      <div class="wh-tabs">${tabs.map((t) => `<button data-tab="${t[0]}" class="${S.tab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div><div class="wh-bd">${body}</div></div>`;
  }
  function onClick(e) { const t = e.target.closest('[data-go],[data-tab],[data-x],[data-prac]'); if (!t) { if (e.target === S.ov) close(); return; }
    if (t.hasAttribute('data-x')) return close();
    if (t.hasAttribute('data-tab')) { S.tab = t.getAttribute('data-tab'); render(); if (S.tab === 'team') loadTeam().then((r) => { S.team = r; if (S.ov) render(); }); return; }
    if (t.hasAttribute('data-prac')) { const u = location.origin + location.pathname + '?env=staging' + location.hash; window.open(u, '_blank'); return; }
    if (t.hasAttribute('data-go')) go(t.getAttribute('data-go')); }
  function open(tab) { css(); if (!S.ov) { S.ov = document.createElement('div'); S.ov.className = 'wh-ov'; S.ov.setAttribute('translate', 'no'); S.ov.addEventListener('click', onClick);
      S.ov.addEventListener('change', (e) => { if (e.target.matches('[data-role]')) { S.role = e.target.value; render(); } });
      S.ov.addEventListener('input', (e) => { if (e.target.matches('[data-q]')) { S.q = e.target.value; const p = e.target.selectionStart; render(); const n = S.ov.querySelector('[data-q]'); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch (x) {} } } });
      document.body.appendChild(S.ov); document.addEventListener('keydown', onKey, true); }
    if (tab) S.tab = tab; S.team = null; render(); loadMine().then(() => { if (S.ov) render(); }); }
  function onKey(e) { if (e.key === 'Escape' && S.ov && !(window.WCGuide && WCGuide.active && WCGuide.active())) { e.stopPropagation(); close(); } }
  function close() { if (S.ov) { S.ov.remove(); S.ov = null; document.removeEventListener('keydown', onKey, true); } }
  function refresh() { if (S.ov) render(); }
  window.WCHub = { VER, open, close, go, mark, path: pathOf, isOpen: () => !!S.ov, _S: S };
})();
