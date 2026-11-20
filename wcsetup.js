/* =====================================================================
   Wellcon Setup · ตั้งค่าโครงการ (v1.0.0 — ผู้บริหารสั่ง 20/11/2026)
   ---------------------------------------------------------------------
   หน้าเดียวต่อโครงการ สำหรับ PM · QS · Director · Admin — กรอกครั้งเดียว ใช้ในเอกสารทุกฉบับ
     1) ข้อมูลหลัก: วันเริ่ม – ส่งมอบ · มูลค่าสัญญา (เฉพาะผู้มีสิทธิ์ตัวเลขเงิน) · เลขที่สัญญา · ลูกค้า
     2) คู่สัญญา 7 ฝ่าย (Owner · Consult · Designer · QS ลูกค้า · Main · MEP · นิติบุคคล) · 10 ช่อง/ฝ่าย
     3) เงื่อนไขวางบิล · 4) เอกสารสัญญา (สัญญา · LOA · ใบเสนอราคา · TOR) + AI อ่านเติมข้อมูล · BOQ อ้างอิง
     5) ทีมงาน · 6) ข้อมูลนี้ใช้ที่ไหน
   ข้อมูลชุดเดิมของแอป (projects · app_state projParties / projBilling · คลังเอกสาร bucket contract) ผ่าน bridge จาก index.html → _setupBridge()
   ใช้:  WCSetup.open(bridge, pid)
   ===================================================================== */
(function () {
  'use strict';
  if (window.WCSetup) return;
  const VER = '1.2.0';   // 1.2.0: ใบเสนอราคา / สัญญา / BOQ → ปุ่ม “ใช้เป็นวัสดุในใบขอซื้อ” · 1.1.0:   // 1.1.0: ที่อยู่หน้างาน / สถานที่ส่งของ (ใช้ในใบขอซื้อ · ใบเสนอราคา)
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const dmy = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
  const money = (n) => '฿' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const DOCK = [['contract', 'สัญญาจ้าง', 'ใช้: AI อ่านคู่สัญญา · เงื่อนไขวางบิล · มูลค่า · วันที่'], ['loa', 'LOA / LOI', 'หนังสือแจ้งรับงาน — วันเริ่ม · มูลค่า · ผู้ลงนาม'],
    ['quote', 'ใบเสนอราคา (ฉบับที่ลูกค้ารับ)', 'อ้างอิงขอบเขตงาน · งานเพิ่ม-ลด · ใบขอซื้อ (AI แยกรายการวัสดุ)'], ['tor', 'TOR / เงื่อนไขประกวดราคา', 'ขอบเขต · เงื่อนไขพิเศษ']];
  const USES = [['หนังสือ / แบบฟอร์มบริษัท', 'ชื่อ · ที่อยู่ Owner / Consult บนหัวจดหมาย'], ['RFI / RFA', 'ผู้รับ = Consult / Designer'], ['VO / SI / EOT · งานเพิ่ม', 'ผู้อนุมัติฝ่าย Owner · วันส่งมอบตามสัญญา'],
    ['ใบเสนอราคา (แอปหลัก)', 'ชื่อลูกค้า · ที่อยู่ · เลขผู้เสียภาษี'], ['ส่งมอบงาน · Handover', 'ผู้รับมอบ · วันส่งมอบ'], ['วางบิล · งวดเงิน', 'เงื่อนไขวางบิล · Retention · ฝ่ายบัญชีลูกค้า'],
    ['ใบขอซื้อ / ใบขอจ้าง', 'สถานที่ส่งของ = ที่อยู่หน้างาน · BOQ อ้างอิง → AI แยกรายการวัสดุ'], ['Quotation Maker', 'ลูกค้า · เรียน · ที่อยู่ · เลขผู้เสียภาษี (Owner)'], ['Claim (Site Work)', 'หนังสือเคลมถึง Owner · เรียน Consult'], ['ระยะถัดไป', 'งานเพิ่ม · VO Tracker · งวดเบิก ดึงเงื่อนไขวางบิลจากหน้านี้']];

  const CSS = `
.ws-ov{position:fixed;inset:0;z-index:2147482500;background:rgba(20,19,16,.55);display:flex;align-items:flex-end;justify-content:center;font-family:'IBM Plex Sans Thai','Noto Sans Thai',system-ui,sans-serif;color:#22231C;-webkit-text-size-adjust:100%}
@media(min-width:760px){.ws-ov{align-items:center;padding:18px}}
.ws-bx{background:#F7F3EA;width:100%;max-width:1040px;height:96vh;border-radius:20px 20px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -10px 40px rgba(0,0,0,.3)}
@media(min-width:760px){.ws-bx{border-radius:20px;height:92vh}}
.ws-hd{background:#1C1B18;color:#F6F1E8;padding:12px 16px;display:flex;align-items:center;gap:12px;flex:none}
@media(max-width:560px){.ws-hd{padding:10px 12px;gap:8px}.ws-hd .ic{display:none}.ws-pct small{display:none}.ws-hd .tt{min-width:0}}
.ws-hd .ic{width:42px;height:42px;border-radius:12px;background:#C9A961;color:#1C1B18;display:flex;align-items:center;justify-content:center;font-size:21px;flex:none}
.ws-hd .tt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.ws-hd .tt b{font-size:17px}
.ws-hd select{min-height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:#2C2A25;color:#F6F1E8;font:600 14px inherit;font-family:inherit;padding:0 10px;max-width:100%}
.ws-x{border:0;background:rgba(255,255,255,.12);color:#fff;width:42px;height:42px;border-radius:11px;font-size:18px;cursor:pointer;flex:none}
.ws-pct{display:flex;align-items:center;gap:8px;flex:none}.ws-pct .ring{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 13px inherit;font-family:inherit;color:#F6F1E8}
.ws-pct small{font-size:12px;color:#D9CFBD;line-height:1.3}
.ws-bd{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:12px;-webkit-overflow-scrolling:touch}
.ws-miss{background:#FFF8E6;border:1px solid #EBD9A6;border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:7px}
.ws-miss b{font-size:13.5px;color:#7A5A12}.ws-chips{display:flex;gap:6px;flex-wrap:wrap}
.ws-chip{min-height:32px;border-radius:999px;border:1px solid #E3DACB;background:#fff;padding:0 11px;font:500 12.5px inherit;font-family:inherit;color:#4A4840;cursor:pointer}
.ws-chip.on{background:#1C1B18;border-color:#1C1B18;color:#E2BC66}.ws-chip i{font-style:normal;font-size:11px;opacity:.8;margin-left:3px}
.ws-card{background:#FFFDF8;border:1px solid #E3DACB;border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-margin-top:10px}
.ws-h{display:flex;align-items:center;gap:8px;font-weight:700;font-size:15.5px;flex-wrap:wrap}.ws-h .n{width:28px;height:28px;border-radius:50%;background:#1C1B18;color:#E2BC66;font-size:13px;display:flex;align-items:center;justify-content:center;flex:none}
.ws-h small{font-weight:500;font-size:12.5px;color:#6B6758}.ws-h .sp{flex:1}
.ws-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:9px}
.ws-f{display:flex;flex-direction:column;gap:3px;min-width:0}.ws-f.w{grid-column:1/-1}.ws-f>span{font-size:12.5px;color:#6B6758;font-weight:600}
.ws-f input,.ws-f textarea{min-height:42px;border:1.5px solid #E3DACB;border-radius:11px;padding:8px 11px;background:#fff;font:15px inherit;font-family:inherit;color:#22231C;box-sizing:border-box;width:100%}
.ws-f textarea{min-height:64px;resize:vertical}.ws-f input:disabled,.ws-f textarea:disabled{background:#F3EFE6;color:#4A4840}
.ws-f.empty input,.ws-f.empty textarea{border-color:#EBC9A0;background:#FFFCF5}
.ws-hint{font-size:12px;color:#8A8375;line-height:1.5}
.ws-ro{background:#EEF3F8;color:#2B4A6B;border-radius:11px;padding:8px 12px;font-size:13px}
.ws-lock{background:#F3EFE6;border-radius:11px;padding:10px 12px;font-size:13px;color:#6B6758}
.ws-b{min-height:40px;border-radius:11px;border:1px solid #E3DACB;background:#fff;font:600 13.5px inherit;font-family:inherit;color:#22231C;padding:0 13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;justify-content:center;white-space:nowrap;text-decoration:none}
.ws-b.p{background:#1C1B18;border-color:#1C1B18;color:#E2BC66}.ws-b.g{background:#C9A961;border-color:#C9A961;color:#1C1B18}.ws-b.ai{background:#F3E9FB;border-color:#D9C2EE;color:#5B3E96}
.ws-doc{display:flex;flex-direction:column;gap:6px;border:1px solid #EFE7D6;border-radius:12px;padding:10px 12px;background:#fff}
.ws-doc .t{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.ws-doc .t b{font-size:14.5px}.ws-doc .t small{font-size:12px;color:#8A8375}
.ws-doc .f{display:flex;align-items:center;gap:8px;font-size:13.5px;padding:4px 0;border-top:1px dashed #EFE7D6}.ws-doc .f a{color:#2A6B8A;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ws-st{font-size:11.5px;font-weight:700;border-radius:999px;padding:2px 9px}.ws-st.ok{background:#E6EFE0;color:#2E7D46}.ws-st.no{background:#FBEDE9;color:#B4442E}.ws-st.opt{background:#F2EDE3;color:#8A8375}
.ws-ck{display:flex;align-items:center;gap:8px;font-size:13.5px;color:#4A4840}.ws-ck input{width:20px;height:20px;accent-color:#5B3E96}
.ws-team{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}.ws-team div{background:#F7F3EA;border-radius:10px;padding:8px 10px;font-size:13.5px}.ws-team small{display:block;font-size:12px;color:#8A8375}
.ws-use{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}.ws-use div{border:1px solid #EFE7D6;border-radius:10px;padding:8px 10px;font-size:13px;background:#fff}.ws-use b{display:block;font-size:13.5px}
.ws-ft{flex:none;padding:10px 14px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid #E3DACB;background:#FFFDF8;display:flex;gap:8px;align-items:center}
.ws-ft small{flex:1;font-size:12.5px;color:#6B6758}
.ws-toast{position:fixed;left:50%;bottom:calc(90px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#1C1B18;color:#fff;border-radius:12px;padding:10px 16px;font:14px 'IBM Plex Sans Thai',system-ui,sans-serif;z-index:2147483600;max-width:90vw;text-align:center}
@media print{.ws-ov,.ws-toast{display:none!important}}`;
  function css() { if (document.getElementById('ws-css')) return; const s = document.createElement('style'); s.id = 'ws-css'; s.textContent = CSS; document.head.appendChild(s); }
  let toastT = 0;
  function toast(m, ms) { css(); let t = document.querySelector('.ws-toast'); if (!t) { t = document.createElement('div'); t.className = 'ws-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2600); }

  const S = { B: null, ov: null, pid: '', party: 'owner', ai: true };

  function field(sec, key, label, val, o) { o = o || {}; const ro = !S.B.canEdit() || o.ro; const v = val == null ? '' : String(val);
    const inp = o.area ? `<textarea data-s="${sec}" data-k="${esc(key)}"${ro ? ' disabled' : ''} placeholder="${esc(o.ph || '')}">${esc(v)}</textarea>`
      : `<input data-s="${sec}" data-k="${esc(key)}" type="${o.type || 'text'}" value="${esc(v)}"${ro ? ' disabled' : ''} placeholder="${esc(o.ph || '')}"${o.type === 'text' || !o.type ? ' autocomplete="off"' : ''}>`;
    return `<label class="ws-f${o.wide ? ' w' : ''}${!v.trim() && o.need ? ' empty' : ''}"><span>${esc(label)}${o.need ? ' <i style="color:#C2681E;font-style:normal">*</i>' : ''}</span>${inp}${o.hint ? `<span class="ws-hint">${o.hint}</span>` : ''}</label>`; }

  function render() {
    if (!S.ov) return; const B = S.B, pid = S.pid, p = B.proj(pid); const bx = S.ov.querySelector('.ws-bx');
    if (!p) { bx.innerHTML = '<div class="ws-hd"><b style="flex:1">ตั้งค่าโครงการ</b><button class="ws-x" data-x aria-label="ปิด">✕</button></div><div class="ws-bd"><p>ไม่พบโครงการ</p></div>'; return; }
    const D = B.defs(), P = B.parties(pid), Bi = B.billing(pid), sc = B.score(pid), can = B.canEdit(), mon = B.money();
    const ring = `conic-gradient(${sc.pct >= 80 ? '#4E9B5F' : sc.pct >= 50 ? '#C9A961' : '#C2681E'} ${sc.pct * 3.6}deg, rgba(255,255,255,.15) 0)`;
    const projOpts = B.projects().map(x => `<option value="${esc(x.id)}"${x.id === pid ? ' selected' : ''}>${esc(x.name)}${x.code ? ' · ' + esc(x.code) : ''}</option>`).join('');
    const h = [];
    if (!can) h.push('<div class="ws-ro">ดูได้อย่างเดียว — ข้อมูลโครงการแก้ได้เฉพาะ PM · QS · Director · Admin · การเงิน · ธุรการ</div>');
    if (sc.missing.length) h.push(`<div class="ws-miss"><b>ยังขาด ${sc.missing.length} อย่าง — กรอกให้ครบ เอกสารทุกฉบับจะดึงไปใช้ได้ทันที</b><div class="ws-chips">${sc.missing.slice(0, 14).map(m => `<button class="ws-chip" data-go="${esc(m.sec)}"${m.party ? ` data-party="${esc(m.party)}"` : ''}>${esc(m.label)}</button>`).join('')}${sc.missing.length > 14 ? `<span class="ws-hint">และอีก ${sc.missing.length - 14}</span>` : ''}</div></div>`);
    else h.push('<div class="ws-miss" style="background:#EEF6EB;border-color:#CFE3C9"><b style="color:#2E6B3A">✓ ข้อมูลหลักครบแล้ว — เอกสารทุกฉบับดึงไปใช้ได้</b></div>');
    // 1 ข้อมูลหลัก
    const eff = B.effEnd(pid);
    h.push(`<div class="ws-card" id="ws-main"><div class="ws-h"><span class="n">1</span>ข้อมูลหลักของโครงการ <small>ดึงจาก Mango ตอนสร้างโครงการ — แก้ให้ตรงสัญญาได้</small></div><div class="ws-g">
      ${field('p', 'name', 'ชื่อโครงการ', p.name, { need: true })}${field('p', 'code', 'รหัสโครงการ (WLC)', p.code || p.wlcCode)}${field('p', 'contractNo', 'เลขที่สัญญา / PO ลูกค้า', p.contractNo, { need: true })}
      ${field('p', 'client', 'ลูกค้า (ชื่อย่อในระบบ)', p.client, { need: true })}
      ${field('p', 'siteAddr', 'ที่อยู่หน้างาน / สถานที่ส่งของ', p.siteAddr, { need: true, wide: true, ph: 'เช่น อาคาร A ชั้น 12 เลขที่ … ถนน … (ใส่ชื่อผู้รับของหน้างานได้)', hint: 'ใช้: ใบขอซื้อ (สถานที่ส่งของ) · ใบเสนอราคา (สถานที่)' })}
      ${field('p', 'startISO', 'วันเริ่มงานตามสัญญา', p.startISO, { type: 'date', need: true })}
      ${field('p', 'endISO', 'วันส่งมอบตามสัญญา', p.endISO, { type: 'date', need: true, hint: eff && eff !== p.endISO ? 'วันส่งมอบหลังขยายเวลา (EOT ที่อนุมัติ): <b>' + esc(dmy(eff)) + '</b>' : '' })}
      ${mon ? field('p', 'value', 'มูลค่าสัญญา (บาท · ไม่รวม VAT)', p.value || '', { need: true, hint: p.value ? esc(money(p.value)) + ' · ไม่รวม VAT' : '' }) : '<div class="ws-lock">🔒 มูลค่าสัญญา — เห็นเฉพาะผู้มีสิทธิ์ตัวเลขเงิน</div>'}
    </div></div>`);
    // 2 คู่สัญญา
    const cur = D.parties.find(x => x.key === S.party) || D.parties[0]; const d = P[cur.key] || {};
    h.push(`<div class="ws-card" id="ws-party"><div class="ws-h"><span class="n">2</span>คู่สัญญา · ผู้เกี่ยวข้อง <small>เลือกฝ่าย แล้วกรอก · * = จำเป็นสำหรับเอกสาร</small></div>
      <div class="ws-chips">${D.parties.map(x => { const dd = P[x.key] || {}; const n = D.pf.filter(f => String(dd[f.key] || '').trim()).length;
        return `<button class="ws-chip${x.key === cur.key ? ' on' : ''}" data-party="${esc(x.key)}">${esc(x.label)}<i>${n}/${D.pf.length}${x.req ? '' : ' · ถ้ามี'}</i></button>`; }).join('')}</div>
      <div class="ws-hint">${esc(cur.sub || '')}</div>
      <div class="ws-g">${D.pf.map(f => field('party:' + cur.key, f.key, f.label, d[f.key] || '', { ph: f.ph, wide: f.wide || f.key === 'address', area: f.key === 'address', need: cur.req && ['company', 'contact', 'tel', 'address'].includes(f.key) && (f.key !== 'address' || cur.key === 'owner') })).join('')}</div></div>`);
    // 3 วางบิล
    h.push(`<div class="ws-card" id="ws-bill"><div class="ws-h"><span class="n">3</span>เงื่อนไขวางบิล · การจ่ายเงิน <small>ใช้ตอนวางบิล · งวดเงิน</small></div><div class="ws-g">
      ${D.bf.map(f => field('bill', f.key, f.label, Bi[f.key] || '', { ph: f.ph, wide: f.wide, area: f.area, need: ['credit', 'retention'].includes(f.key) })).join('')}</div></div>`);
    // 4 เอกสารสัญญา
    const docs = B.docs(pid), rb = B.refBoq(pid), loaded = B.docsLoaded();
    h.push(`<div class="ws-card" id="ws-doc"><div class="ws-h"><span class="n">4</span>เอกสารสัญญา <small>อัปโหลดแล้วให้ AI อ่าน เติมข้อมูลข้อ 1–3 ให้ · ตรวจก่อนบันทึกทุกครั้ง</small><span class="sp"></span>${can ? '<button class="ws-b ai" data-ai>🤖 ให้ AI อ่านเอกสารที่มี</button>' : ''}</div>
      ${can ? `<label class="ws-ck"><input type="checkbox" data-aichk${S.ai ? ' checked' : ''}> อัปโหลดแล้วให้ AI อ่านเติมข้อมูลทันที (จะพาไปหน้าตรวจของโครงการ)</label>` : ''}
      ${!loaded ? '<div class="ws-hint">กำลังโหลดรายการเอกสาร…</div>' : ''}
      ${DOCK.map(([k, l, u]) => { const L = docs.filter(f => f.kind === k); const need = k === 'contract' || k === 'loa';
        return `<div class="ws-doc"><div class="t"><b>${esc(l)}</b>${L.length ? `<span class="ws-st ok">✓ ${L.length} ไฟล์</span>` : need ? '<span class="ws-st no">ยังไม่มี</span>' : '<span class="ws-st opt">ถ้ามี</span>'}<small>${esc(u)}</small></div>
          ${L.slice(0, 5).map(f => `<div class="f"><span>📄</span><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.file)}</a><small>${esc(dmy(f.created))}</small></div>`).join('')}
          <div style="display:flex;gap:8px;flex-wrap:wrap">${can ? `<label class="ws-b" style="cursor:pointer">📤 อัปโหลด${esc(l.split(' ')[0])}<input type="file" data-up="${k}" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.xls" multiple hidden></label>` : ''}${can && L.length && (k === 'quote' || k === 'contract') ? '<button class="ws-b ai" data-mat>📋 ใช้เป็นวัสดุในใบขอซื้อ ↗</button>' : ''}</div></div>`; }).join('')}
      <div class="ws-doc"><div class="t"><b>BOQ อ้างอิง</b>${rb ? '<span class="ws-st ok">✓ มีแล้ว</span>' : '<span class="ws-st no">ยังไม่มี</span>'}<small>ใช้: วิเคราะห์ขอบเขตงาน · ใบขอซื้อ (AI แยกรายการวัสดุให้หน้างาน)</small></div>
        ${rb ? `<div class="f"><span>📊</span><span style="flex:1">${esc(rb.fileName || 'BOQ')}</span></div>` : ''}<div style="display:flex;gap:8px;flex-wrap:wrap">${rb && can ? '<button class="ws-b ai" data-mat>📋 ใช้เป็นวัสดุในใบขอซื้อ ↗</button>' : ''}<button class="ws-b" data-boq>${rb ? 'ดู / เปลี่ยน BOQ ที่หน้าภาพรวมโครงการ ↗' : '📤 อัปโหลด BOQ ที่หน้าภาพรวมโครงการ ↗'}</button></div></div>
      <div class="ws-hint">🔒 ไฟล์สัญญามีตัวเลขเงิน — อย่าส่งลิงก์ไฟล์ให้บุคคลภายนอก</div></div>`);
    // 5 ทีมงาน
    const T = B.team(pid);
    h.push(`<div class="ws-card" id="ws-team"><div class="ws-h"><span class="n">5</span>ทีมงานโครงการ <small>แก้รายชื่อที่เมนู “ผู้ใช้ & ทีมโครงการ”</small></div>
      <div class="ws-team">${T.length ? T.map(x => `<div><small>${esc(x.role)}</small>${esc(x.names.join(', ') || '—')}</div>`).join('') : '<span class="ws-hint">ยังไม่มีทีม</span>'}</div></div>`);
    // 6 ใช้ที่ไหน
    h.push(`<div class="ws-card"><div class="ws-h"><span class="n">6</span>ข้อมูลนี้ใช้ที่ไหน <small>กรอกครั้งเดียว — ระบบดึงไปใช้เอง</small></div><div class="ws-use">${USES.map(([a, b]) => `<div><b>${esc(a)}</b>${esc(b)}</div>`).join('')}</div></div>`);
    const top = S.ov.querySelector('.ws-bd') ? S.ov.querySelector('.ws-bd').scrollTop : 0;
    bx.innerHTML = `<div class="ws-hd"><span class="ic">⚙</span><div class="tt"><b>ตั้งค่าโครงการ</b><select data-pid aria-label="เลือกโครงการ">${projOpts}</select></div>
      <div class="ws-pct"><span class="ring" style="background:${ring}"><span style="background:#1C1B18;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center">${sc.pct}%</span></span><small>ข้อมูลครบ<br>${sc.done}/${sc.total} อย่าง</small></div>
      <button class="ws-x" data-x aria-label="ปิด">✕</button></div>
      <div class="ws-bd">${h.join('')}</div>
      <div class="ws-ft"><small>บันทึกอัตโนมัติทุกช่อง · ซิงก์ให้ทุกคนในทีม</small><button class="ws-b" data-proj>เปิดหน้าโครงการ ↗</button><button class="ws-b p" data-x>เสร็จ</button></div>`;
    const bd = bx.querySelector('.ws-bd'); if (bd) bd.scrollTop = top;
  }
  function head() { if (!S.ov) return; const sc = S.B.score(S.pid); const r = S.ov.querySelector('.ws-pct'); if (!r) return;
    r.querySelector('.ring').style.background = `conic-gradient(${sc.pct >= 80 ? '#4E9B5F' : sc.pct >= 50 ? '#C9A961' : '#C2681E'} ${sc.pct * 3.6}deg, rgba(255,255,255,.15) 0)`;
    r.querySelector('.ring span').textContent = sc.pct + '%'; r.querySelector('small').innerHTML = 'ข้อมูลครบ<br>' + sc.done + '/' + sc.total + ' อย่าง'; }

  function onChange(e) { const t = e.target; const B = S.B;
    if (t.matches('[data-pid]')) { S.pid = t.value; B.setCur && B.setCur(S.pid); render(); return; }
    if (t.matches('[data-aichk]')) { S.ai = t.checked; return; }
    if (t.matches('[data-up]')) { const files = [...(t.files || [])]; t.value = ''; if (!files.length) return; const k = t.dataset.up;
      if (S.ai) { close(); toast('กำลังอัปโหลด — AI จะอ่านแล้วให้ตรวจที่หน้าโครงการ', 3200); } else toast('กำลังอัปโหลด…');
      B.upload(S.pid, k, files, S.ai).then(() => { if (S.ov) render(); }); return; }
    const sec = t.dataset.s, k = t.dataset.k; if (!sec || !k || !B.canEdit()) return; const v = t.value;
    if (sec === 'p') B.setProj(S.pid, k, v); else if (sec === 'bill') B.setBill(S.pid, k, v); else if (sec.indexOf('party:') === 0) B.setParty(S.pid, sec.slice(6), k, v);
    const lab = t.closest('.ws-f'); if (lab) lab.classList.toggle('empty', !String(v).trim() && !!lab.querySelector('i'));
    setTimeout(head, 60); }
  function onClick(e) { const t = e.target; const B = S.B;
    if (t === S.ov || t.closest('[data-x]')) { close(); return; }
    const pt = t.closest('[data-party]'); if (pt) { S.party = pt.dataset.party; render(); const c = S.ov.querySelector('#ws-party'); if (c && t.closest('[data-go]')) c.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    const go = t.closest('[data-go]'); if (go) { const c = S.ov.querySelector('#ws-' + go.dataset.go); if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    if (t.closest('[data-ai]')) { close(); B.openAi(S.pid); return; }
    if (t.closest('[data-mat]')) { const h = location.hostname, stg = /[?&]env=staging/.test(location.search) || /staging/i.test(h) || (h !== '' && !/vercel\.app$/i.test(h));   // v1.2.0 กติกาเดียวกับแอปหลัก
      location.href = '/auto-pr.html?pid=' + encodeURIComponent(S.pid) + '&cat=1' + (stg ? '&env=staging' : ''); return; }
    if (t.closest('[data-boq]') || t.closest('[data-proj]')) { close(); B.openProject(S.pid); return; } }
  function onKey(e) { if (e.key === 'Escape' && S.ov) close(); }
  function open(bridge, pid) { css(); if (!bridge) return; S.B = bridge; const P = bridge.projects(); S.pid = (pid && P.some(x => x.id === pid)) ? pid : ((P[0] || {}).id || '');
    if (!S.pid) { toast('ยังไม่มีโครงการที่คุณดูแล'); return; }
    if (!S.ov) { S.ov = document.createElement('div'); S.ov.className = 'ws-ov'; S.ov.setAttribute('translate', 'no'); S.ov.innerHTML = '<div class="ws-bx" role="dialog" aria-modal="true" aria-label="ตั้งค่าโครงการ"></div>';
      S.ov.addEventListener('click', onClick); S.ov.addEventListener('change', onChange); document.body.appendChild(S.ov); document.addEventListener('keydown', onKey); }
    render(); if (!bridge.docsLoaded()) bridge.docsLoad().then(() => { if (S.ov) render(); }); }
  function close() { if (S.ov) { S.ov.remove(); S.ov = null; } document.removeEventListener('keydown', onKey); }
  window.WCSetup = { VER, open, close, isOpen: () => !!S.ov, _S: S };
})();
