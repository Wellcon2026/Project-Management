/* =====================================================================
   Wellcon Guide · สอนแบบจูงมือบนหน้าจอจริง (v1.0.0 — ผู้บริหารสั่ง 21/11/2026)
   "hold user's hand … show step by step, highlight / mouse on display to tell user what to do on screen"
   ---------------------------------------------------------------------
   - หน้าจอมืดลง เหลือจุดที่ต้องใช้สว่าง (ไฮไลต์) + มือชี้ 👆 + กล่องบอกว่าต้องทำอะไร
   - ขั้นที่ให้ "กด" → รอผู้ใช้กดจุดนั้นจริงแล้วไปขั้นต่อไปเอง · ขั้นที่ให้ "พิมพ์" → พิมพ์แล้วกด ถัดไป · ขั้นอธิบาย → กด ถัดไป
   - กดนอกจุดไฮไลต์ไม่ได้ระหว่างสอน (กันกดผิด) · ออกได้ทุกขั้น (✕ / Esc)
   - หาจุดบนจอไม่เจอ (ไม่มีสิทธิ์ / ยังไม่มีข้อมูล / หน้าเปลี่ยน) → ไม่ค้าง: อธิบายกลางจอ ให้กดถัดไป · ขั้นที่ไม่จำเป็น (opt) ข้ามให้เอง
   - ชี้ด้วย "เครื่องหมาย" data-g / id / class ของปุ่ม — ไม่ผูกกับตำแหน่งบนจอ → ปรับหน้าตาแล้วไม่พัง
   - ไม่เล่นเอง: เริ่มเมื่อผู้ใช้กด "? วิธีใช้" เท่านั้น
   ใช้:  WCGuide.start(key)  ·  WCGuide.has(key)  ·  WCGuide.register(key, tour)  ·  WCGuide.check(key) (ตรวจว่าเจอจุดครบ — ใช้ในชุดทดสอบ)
   tour = { title, steps:[ { sel, t, d, act:'click'|'input'|'none', opt, last } ] } · sel = ตัวเลือก CSS (หลายตัวคั่นด้วย ||) — ใช้ตัวที่มองเห็นตัวสุดท้าย
   ===================================================================== */
(function () {
  'use strict';
  if (window.WCGuide) return;
  const VER = '1.0.0';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = {};   // key → tour

  // ---------- บทสอน (หน้าในแอปหลัก) ----------
  T['tab:daily'] = { title: 'Daily Report · รายงานประจำวัน', steps: [
    { sel: '[data-g="dl-today"]', t: 'เริ่มที่ปุ่มนี้', d: 'กดเพื่อเขียนรายงานของวันนี้ (ถ้าเขียนแล้ว ปุ่มนี้จะเปิดรายงานวันนี้ให้แก้ต่อ)', act: 'click' },
    { sel: '[data-daily-ed] input[type="date"]', t: 'วันที่ของรายงาน', d: 'ตรวจวันที่ — เขียนย้อนหลังก็เปลี่ยนวันที่ตรงนี้' },
    { sel: '[data-g="dl-crew"]', t: 'คนเข้างาน', d: 'แตะ ＋ / − ใส่จำนวนคนของแต่ละช่าง — ระบบรวมยอดให้เอง', opt: true },
    { sel: '[data-g="dl-chips"]', t: 'ทางลัดงานที่ทำ', d: 'แตะชื่อช่าง เพื่อใส่หัวข้อลงในช่องงานที่ทำ', opt: true },
    { sel: '[data-g="dl-work"]', t: 'เขียนงานที่ทำวันนี้', d: 'พิมพ์สั้น ๆ เช่น “ติดตั้งฝ้าโถง 80% · ปูพื้นห้อง 3-5 เสร็จ” แล้วกด ถัดไป', act: 'input' },
    { sel: '[data-g="dl-prob"]', t: 'ปัญหา / สิ่งที่ต้องตาม', d: 'มีปัญหาใส่ที่นี่ — ใช้เป็นหลักฐานทำ EOT ภายหลัง · ไม่มีเว้นว่างได้', act: 'input' },
    { sel: '[data-g="dl-photo"]', t: 'รูปหน้างาน', d: 'แนบรูปหน้างานของวันนี้ ได้สูงสุด 20 รูป' },
    { sel: '[data-g="dl-export"]', t: 'ส่งให้ลูกค้า', d: 'ส่งออก Word / Excel แนบอีเมลได้ทันที · ทุกช่องบันทึกอัตโนมัติ ไม่ต้องกดบันทึก', opt: true },
    { sel: '[data-g="dl-days"]', t: 'ดูย้อนหลัง 14 วัน', d: 'เขียว = ส่งแล้ว · ส้ม = มีปัญหา · แตะวันที่ว่างเพื่อเขียนย้อนหลัง', last: true },
  ] };
  T['note'] = { title: 'Notes · บันทึก · งานของฉัน', steps: [
    { sel: '.wn-tabs', t: 'แท็บของบันทึก', d: '🔒 ส่วนตัว (เห็นคนเดียว) · 👥 สาธารณะ (ทีมโครงการเห็น) · 🏷 แท็กถึงฉัน · ✅ งานค้าง' },
    { sel: '.wn-ft [data-new]', t: 'จดบันทึกใหม่', d: 'กดปุ่มนี้', act: 'click' },
    { sel: '.wn-bx.ed textarea', t: 'พิมพ์ข้อความ', d: 'เช่น “โทรตาม supplier หินอ่อน เรื่องวันส่ง” แล้วกด ถัดไป', act: 'input' },
    { sel: '.wn-bx.ed [data-f="pid"]', t: 'เลือกโครงการ', d: 'บันทึกนี้เป็นของโครงการไหน (หรือทั่วไป)' },
    { sel: '.wn-bx.ed .wn-seg', t: 'ใครเห็น', d: '🔒 ส่วนตัว เห็นคนเดียว · 👥 ทีมโครงการเห็น' },
    { sel: '.wn-bx.ed [data-f="due"]', t: 'กำหนดวัน / เวลา (ถ้ามี)', d: 'ใส่วันที่ → ขึ้นในแท็บ “งานค้าง” และติ๊กลงปฏิทินโครงการได้' },
    { sel: '.wn-bx.ed [data-save="1"]', t: 'บันทึก', d: 'กดบันทึก — หรือ “บันทึก + 🏷 แท็กคน” เพื่อแจ้งคนที่เกี่ยวข้อง', act: 'click' },
    { sel: '.wn-bd .wn-it', t: 'บันทึกของคุณ', d: 'ขึ้นที่นี่ — กด ✓ เสร็จ เมื่อทำเสร็จ · ✎ แก้ไข · 🏷 แท็กคน', opt: true },
    { sel: '.wn-bar [data-q]', t: 'ค้นหา', d: 'พิมพ์คำที่ต้องการ — คำที่พบไฮไลต์สีเหลือง', last: true },
  ] };
  T['tab:setup'] = { title: 'Project Setup · ตั้งค่าโครงการ', steps: [
    { sel: '.ws-hd select', t: 'เลือกโครงการ', d: 'ตั้งค่าโครงการไหน เลือกตรงนี้' },
    { sel: '.ws-pct', t: 'ความครบของข้อมูล', d: 'ยิ่งครบ เอกสารทุกฉบับยิ่งดึงข้อมูลไปใช้ได้ครบ' },
    { sel: '.ws-miss', t: 'ยังขาดอะไร', d: 'แตะชื่อช่องที่ยังขาด ระบบพาไปที่ช่องนั้น' },
    { sel: '#ws-main [data-k="contractNo"]', t: 'ข้อมูลหลัก', d: 'กรอกเลขที่สัญญา · วันเริ่ม – ส่งมอบ · ที่อยู่หน้างาน — บันทึกอัตโนมัติ', act: 'input' },
    { sel: '#ws-party .ws-chips', t: 'คู่สัญญา', d: 'เลือกฝ่าย (Owner · Consult · Designer …) แล้วกรอกบริษัท · ผู้ติดต่อ · ที่อยู่' },
    { sel: '#ws-bill', t: 'เงื่อนไขวางบิล', d: 'เครดิต · Retention · เงื่อนไขจ่ายเงิน — ใช้ตอนออกงวดเบิก' },
    { sel: '#ws-doc', t: 'เอกสารสัญญา', d: 'อัปโหลดสัญญา · ใบเสนอราคา · LOA · BOQ' },
    { sel: '#ws-doc [data-ai]', t: 'ให้ AI อ่านเอกสาร', d: 'AI ดึงข้อมูลจากสัญญามากรอกให้ — ตรวจก่อนยืนยันทุกครั้ง', opt: true },
    { sel: '.ws-ft [data-x]', t: 'เสร็จ', d: 'ข้อมูลไหลไป Quotation Maker · PR / WO · Claim · หนังสือ / ฟอร์ม ให้เอง', last: true },
  ] };
  T['tab:apr'] = { title: 'PR / WO · ใบขอซื้อ · ใบขอจ้าง', steps: [
    { sel: '#btnNew', t: 'สร้างใบขอซื้อ', d: 'กดเพื่อเริ่มใบขอซื้อ (จ้างผู้รับเหมา / ค่าแรง ใช้ปุ่ม 🛠 สร้างใบขอจ้าง)', act: 'click', opt: true },
    { sel: '#docBox', t: 'ประเภทเอกสาร', d: 'ใบขอซื้อ = ของ · อุปกรณ์ · เช่า  /  ใบขอจ้าง = ผู้รับเหมา · ค่าแรง' },
    { sel: '#autoBox', t: 'กรอกให้อัตโนมัติ', d: 'ชื่อโครงการ · วันที่ · ผู้ขอ · ผู้อนุมัติ · สถานที่ส่งของ — แตะแก้ได้', opt: true },
    { sel: '#areaBox', t: 'พื้นที่ / งาน', d: 'เลือกพื้นที่ที่ใช้ของ', opt: true },
    { sel: '#catBtn', t: 'เลือกของ', d: 'จาก 📋 วัสดุโครงการ (BOQ) · 📗 ราคากลาง · 📐 คำนวณปริมาณ' },
    { sel: '#q', t: 'หรือพิมพ์ชื่อของ', d: 'พิมพ์ชื่อ เช่น “ไม้อัด” แล้วแตะรายการที่ขึ้นมา', act: 'input' },
    { sel: '#items', t: 'จำนวน · หน่วย · วันที่ต้องการ', d: 'ใส่จำนวน (＋ / −) หน่วย และวันที่ต้องการของ' },
    { sel: '#btnSend', t: 'ส่งขออนุมัติ', d: 'ตรวจแล้วกดส่ง → PM + QS อนุมัติ → จัดซื้อสั่งของ → หน้างานรับของ', last: true },
  ] };

  // ---------- หน้าจอ ----------
  const CSS = `
.wg-blk{position:fixed;z-index:2147483200;background:transparent;pointer-events:auto}
.wg-spot{position:fixed;z-index:2147483201;border-radius:12px;pointer-events:none;box-shadow:0 0 0 4px #E2BC66,0 0 0 9999px rgba(20,19,16,.58);transition:top .25s,left .25s,width .25s,height .25s}
.wg-spot.full{box-shadow:0 0 0 9999px rgba(20,19,16,.58);width:0!important;height:0!important;left:50%!important;top:50%!important}
.wg-spot.pulse{animation:wgp 1.4s ease-in-out infinite}
@keyframes wgp{0%,100%{box-shadow:0 0 0 4px #E2BC66,0 0 0 9999px rgba(20,19,16,.58)}50%{box-shadow:0 0 0 9px rgba(226,188,102,.55),0 0 0 9999px rgba(20,19,16,.58)}}
.wg-hand{position:fixed;z-index:2147483203;font-size:34px;line-height:1;pointer-events:none;filter:drop-shadow(0 3px 6px rgba(0,0,0,.4));animation:wgh 1s ease-in-out infinite;transition:top .25s,left .25s}
@keyframes wgh{0%,100%{transform:translate(0,0)}50%{transform:translate(0,-9px)}}
.wg-bub{position:fixed;z-index:2147483204;width:min(360px,calc(100vw - 24px));background:#FFFDF8;border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.35);font-family:'IBM Plex Sans Thai','Noto Sans Thai',system-ui,sans-serif;color:#22231C;overflow:hidden;transition:top .25s,left .25s}
.wg-bub .h{background:#1C1B18;color:#F6F1E8;padding:10px 12px 10px 14px;display:flex;align-items:center;gap:8px}
.wg-bub .h b{flex:1;font-size:13px;font-weight:700;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wg-bub .h span{font-size:12px;color:#E2BC66;font-weight:800;white-space:nowrap}
.wg-bub .x{border:0;background:rgba(255,255,255,.14);color:#fff;width:34px;height:34px;border-radius:10px;font-size:16px;cursor:pointer;flex:none}
.wg-bub .bd{padding:12px 14px 4px}.wg-bub .tt{font-size:17px;font-weight:800;line-height:1.35}.wg-bub .dd{font-size:14.5px;line-height:1.6;color:#3A3830;margin-top:4px}
.wg-bub .do{margin-top:8px;font-size:13px;font-weight:800;color:#8A5E14;background:#FBF0CF;border-radius:10px;padding:6px 10px;display:inline-block}
.wg-bub .miss{margin-top:8px;font-size:12.5px;color:#8A8375;background:#F3EEE3;border-radius:10px;padding:6px 10px}
.wg-bub .pg{height:4px;background:#EFE7D6}.wg-bub .pg i{display:block;height:100%;background:#C9A961}
.wg-bub .ft{display:flex;gap:8px;padding:10px 12px 12px;flex-wrap:wrap}
.wg-bub .b{flex:1 1 90px;min-height:42px;border-radius:11px;border:1px solid #E3DACB;background:#fff;font:700 13.5px inherit;font-family:inherit;color:#22231C;cursor:pointer}
.wg-bub .b.p{background:#1C1B18;border-color:#1C1B18;color:#E2BC66}.wg-bub .b[disabled]{opacity:.4;cursor:default}
.wg-bub .lk{display:block;margin:2px 14px 0;font-size:12.5px;color:#8A6D3B;text-decoration:underline;background:none;border:0;padding:0;cursor:pointer;font-family:inherit}
.wg-bub.shake{animation:wgs .35s}@keyframes wgs{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
@media(max-width:600px){.wg-bub{left:12px!important;right:12px;width:auto;top:auto!important;bottom:calc(12px + env(safe-area-inset-bottom,0px))}}
@media print{.wg-blk,.wg-spot,.wg-hand,.wg-bub{display:none!important}}`;
  function css() { if (document.getElementById('wg-css')) return; const s = document.createElement('style'); s.id = 'wg-css'; s.textContent = CSS; document.head.appendChild(s); }

  const vis = (el) => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const st = getComputedStyle(el); return st.visibility !== 'hidden' && st.display !== 'none'; };
  function find(sel) { const parts = String(sel || '').split('||').map(s => s.trim()).filter(Boolean); let hit = null;
    parts.forEach(p => { let L = []; try { L = [...document.querySelectorAll(p)]; } catch (e) {} for (let i = L.length - 1; i >= 0; i--) { if (vis(L[i])) { if (!hit) hit = L[i]; break; } } }); return hit; }

  const G = { tour: null, key: '', i: 0, el: null, raf: 0, poll: 0, root: null, onDoc: null, onIn: null, typed: false, missing: false };
  function build() { css(); const r = document.createElement('div'); r.className = 'wg-root'; r.setAttribute('translate', 'no');
    r.innerHTML = '<div class="wg-blk" data-b="t"></div><div class="wg-blk" data-b="r"></div><div class="wg-blk" data-b="b"></div><div class="wg-blk" data-b="l"></div><div class="wg-spot"></div><div class="wg-hand">👆</div><div class="wg-bub" role="dialog" aria-live="polite"></div>';
    document.body.appendChild(r); G.root = r;
    r.querySelectorAll('.wg-blk').forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); const bb = r.querySelector('.wg-bub'); bb.classList.remove('shake'); void bb.offsetWidth; bb.classList.add('shake'); }));
    r.querySelector('.wg-bub').addEventListener('click', onBub); }
  function place() {
    if (!G.root) return; const r = G.root, sp = r.querySelector('.wg-spot'), hd = r.querySelector('.wg-hand'), bb = r.querySelector('.wg-bub'), W = innerWidth, H = innerHeight;
    const B = (k, x, y, w, h) => { const d = r.querySelector('[data-b="' + k + '"]'); d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.width = Math.max(0, w) + 'px'; d.style.height = Math.max(0, h) + 'px'; };
    if (G.el && !G.el.isConnected) { const n = find(G.tour.steps[G.i].sel); if (n) G.el = n; }
    if (!G.el || !vis(G.el)) { sp.classList.add('full'); hd.style.display = 'none'; B('t', 0, 0, W, H); B('r', 0, 0, 0, 0); B('b', 0, 0, 0, 0); B('l', 0, 0, 0, 0);
      bb.style.left = Math.max(12, (W - bb.offsetWidth) / 2) + 'px'; bb.style.top = Math.max(12, (H - bb.offsetHeight) / 2) + 'px'; return; }
    sp.classList.remove('full'); const g = G.el.getBoundingClientRect(), p = 6; const x = g.left - p, y = g.top - p, w = g.width + p * 2, h = g.height + p * 2;
    sp.style.left = x + 'px'; sp.style.top = y + 'px'; sp.style.width = w + 'px'; sp.style.height = h + 'px';
    B('t', 0, 0, W, y); B('b', 0, y + h, W, H - y - h); B('l', 0, y, x, h); B('r', x + w, y, W - x - w, h);
    hd.style.display = ''; const hx = Math.min(W - 40, Math.max(4, g.left + Math.min(g.width / 2, 120) - 10)); const below = g.bottom + 46 < H;
    if (g.height > H * 0.4 || g.width > W * 0.8 && g.height > 160) { hd.style.left = (g.left + Math.min(g.width, W) / 2 - 17) + 'px'; hd.style.top = (Math.max(g.top, 0) + Math.min(g.height, H) / 2 - 17) + 'px'; hd.style.transform = ''; }   // จุดใหญ่ (เช่น แบบทั้งแผ่น) → มือชี้กลางจุด
    else { hd.style.left = hx + 'px'; hd.style.top = (below ? g.bottom + 2 : g.top - 40) + 'px'; hd.style.transform = below ? '' : 'rotate(180deg)'; }
    if (W > 600) { const bw = bb.offsetWidth, bh = bb.offsetHeight; let bx = Math.min(W - bw - 12, Math.max(12, g.left)), by;
      if (g.bottom + 48 + bh < H) by = g.bottom + 48; else if (g.top - 48 - bh > 0) by = g.top - 48 - bh; else { by = Math.max(12, H - bh - 12); bx = g.right + 16 + bw < W ? g.right + 16 : Math.max(12, g.left - bw - 16); }
      bb.style.left = bx + 'px'; bb.style.top = by + 'px'; } }
  function loop() { place(); G.raf = requestAnimationFrame(loop); }
  function drawBub() {
    const s = G.tour.steps[G.i], n = G.tour.steps.length, bb = G.root.querySelector('.wg-bub'), last = G.i === n - 1 || s.last, act = G.missing ? 'none' : (s.act || 'none');
    bb.innerHTML = `<div class="h"><span>ขั้น ${G.i + 1}/${n}</span><b>${esc(G.tour.title)}</b><button class="x" data-g-x aria-label="ออกจากการสอน">✕</button></div><div class="pg"><i style="width:${Math.round((G.i + 1) / n * 100)}%"></i></div>
      <div class="bd"><div class="tt">${esc(s.t)}</div><div class="dd">${esc(s.d)}</div>${act === 'click' ? '<div class="do">👆 กดจุดที่ไฮไลต์</div>' : act === 'input' ? '<div class="do">⌨ พิมพ์ในช่องที่ไฮไลต์ แล้วกด ถัดไป</div>' : ''}${G.missing ? '<div class="miss">ยังไม่เห็นจุดนี้บนหน้าจอ (อาจยังไม่มีข้อมูล / ไม่มีสิทธิ์) — อ่านคำอธิบาย แล้วกด ถัดไป</div>' : ''}</div>
      ${G.i === 0 && window.WCDemo && WCDemo.has && WCDemo.has(G.key) ? '<button class="lk" data-g-slides>ดูแบบสรุปทีละขั้น (ไม่ต้องกดตาม)</button>' : ''}
      <div class="ft"><button class="b" data-g-prev${G.i ? '' : ' disabled'}>◀ ก่อนหน้า</button>${last ? '<button class="b p" data-g-done>เสร็จสิ้น ✓</button>' : `<button class="b p" data-g-next>${act === 'click' ? 'ข้ามขั้นนี้ ▶' : 'ถัดไป ▶'}</button>`}</div>`; }
  function clearWait() { clearInterval(G.poll); G.poll = 0; if (G.onDoc) { document.removeEventListener('click', G.onDoc, true); document.removeEventListener('pointerup', G.onDoc, true); G.onDoc = null; } if (G.onIn) { document.removeEventListener('input', G.onIn, true); G.onIn = null; } }
  function go(i) {
    clearWait(); if (!G.tour) return; const n = G.tour.steps.length; if (i >= n) { stop(true); return; } if (i < 0) i = 0;
    G.i = i; G.el = null; G.missing = false; const s = G.tour.steps[i]; const sp = G.root.querySelector('.wg-spot'); sp.classList.remove('pulse');
    drawBub(); let tries = 0;
    const attach = (el) => { G.el = el; try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {} if ((s.act || 'none') !== 'none') sp.classList.add('pulse');
      if (s.act === 'click') { G.onDoc = (e) => { if (G.el && (G.el === e.target || G.el.contains(e.target))) { const k = G.i; clearWait(); setTimeout(() => { if (G.tour && G.i === k) go(k + 1); }, 450); } }; document.addEventListener('click', G.onDoc, true); document.addEventListener('pointerup', G.onDoc, true); }   // แตะบนแบบ (canvas) บางที่ไม่เกิด click → ฟัง pointerup ด้วย
      if (s.act === 'input') { G.onIn = (e) => { if (G.el && (G.el === e.target || G.el.contains(e.target))) { const nb = G.root.querySelector('[data-g-next]'); if (nb) nb.textContent = 'ถัดไป ▶ ✓'; } }; document.addEventListener('input', G.onIn, true); } };
    const el0 = find(s.sel); if (el0) { attach(el0); return; }
    G.poll = setInterval(() => { tries++; const el = find(s.sel); if (el) { clearInterval(G.poll); G.poll = 0; attach(el); drawBub(); return; }
      if (tries > 24) { clearInterval(G.poll); G.poll = 0; if (s.opt && i < n - 1) { go(i + 1); return; } G.missing = true; drawBub(); } }, 150); }
  function onBub(e) { const t = e.target;
    if (t.closest('[data-g-x]')) { stop(false); return; } if (t.closest('[data-g-done]')) { stop(true); return; }
    if (t.closest('[data-g-next]')) { go(G.i + 1); return; } if (t.closest('[data-g-prev]')) { go(G.i - 1); return; }
    if (t.closest('[data-g-slides]')) { const k = G.key; stop(false); try { window.WCDemo.open(k, { slides: true }); } catch (x) {} } }
  function onKey(e) { if (!G.tour) return; if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); stop(false); } }
  function start(key, o) { const tour = typeof key === 'object' ? key : T[key]; if (!tour || !tour.steps || !tour.steps.length) return false;
    stop(false); build(); G.tour = tour; G.key = typeof key === 'string' ? key : (tour.key || ''); document.addEventListener('keydown', onKey, true); loop(); go(0); return true; }
  function stop(done) { clearWait(); cancelAnimationFrame(G.raf); if (G.root) { G.root.remove(); G.root = null; } document.removeEventListener('keydown', onKey, true);
    if (done && G.key) { try { localStorage.setItem('wg_done:' + G.key, new Date().toISOString()); } catch (e) {} const tt = G.tour && G.tour.title; G.tour = null; toastDone(tt); return; } G.tour = null; }
  function toastDone(tt) { const d = document.createElement('div'); d.textContent = '🎉 เรียนจบแล้ว — ' + (tt || '') + ' · กด “? วิธีใช้” ดูซ้ำได้ทุกเมื่อ';
    d.style.cssText = "position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483600;background:#1C1B18;color:#fff;border-radius:12px;padding:10px 16px;font:14px 'IBM Plex Sans Thai',system-ui,sans-serif;max-width:90vw;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.25)";
    document.body.appendChild(d); setTimeout(() => d.remove(), 3200); }
  // ตรวจว่าจุดของแต่ละขั้นเจอบนหน้าจอตอนนี้ไหม (ชุดทดสอบใช้ตรวจหลังแก้หน้าตา)
  function check(key) { const t = T[key]; if (!t) return null; return t.steps.map((s, i) => ({ i: i + 1, t: s.t, sel: s.sel, found: !!find(s.sel), opt: !!s.opt })); }
  window.WCGuide = { VER, start, stop, has: (k) => !!T[k], register: (k, t) => { T[k] = t; }, check, keys: () => Object.keys(T), active: () => !!G.tour, done: (k) => { try { return !!localStorage.getItem('wg_done:' + k); } catch (e) { return false; } } };
})();
