#!/usr/bin/env node
/* =====================================================================
   v1.431.0 pricing-principles — "หลักการคิดราคาของระบบ" ให้ผู้ดูแลระบบอ่านก่อนแก้ (ผู้บริหารสั่ง 19/11/2026)
     node scripts/patch-pricing-principles.js        (รันหลัง patch-price-hub.js)
   - เนื้อหาต้นฉบับ: docs/pricing-principles.md (ไม่ deploy — .vercelignore ตัด docs/ ออก เพราะมีเป้ากำไรของบริษัท)
     ฉบับที่แสดงในแอปเก็บใน app_state 'pricingPrinciples' = { v:{ ver, at, md } } (อ่านได้เฉพาะผู้ที่เข้าสู่ระบบ)
     แก้เนื้อหา: แก้ไฟล์ .md → อัปเดตแถว app_state ด้วย SQL (ดู README หัวข้อ "หลักการคิดราคาของระบบ")
   1) ตั้งค่าระบบ → อัตรากลาง: กล่องเตือน "📘 อ่านหลักการคิดราคาก่อนแก้อัตรา / %" + ปุ่มเปิดหน้าต่างอ่าน (เห็นเฉพาะผู้ที่เห็นการ์ดอัตรากลาง)
   2) หน้าต่าง "ทำราคา · เลือกเครื่องมือ": ลิงก์ "📘 หลักการคิดราคาของระบบ" (เฉพาะผู้มีสิทธิ์ตัวเลขเงิน)
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'index.html');
const BS = String.fromCharCode(92);
const raw = fs.readFileSync(file, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(nl);
const idx = lines.findIndex((l, i) => i > 0 && lines[i - 1].includes('<script type="__bundler/template">'));
if (idx < 0) { console.error('✗ ไม่พบส่วน template ใน index.html'); process.exit(2); }
const enc = (t) => JSON.stringify(t).split('</').join('<' + BS + 'u002F');
let t = JSON.parse(lines[idx]);
if (enc(t) !== lines[idx]) { console.error('✗ ถอด/ประกอบ template แล้วไม่ตรงเดิม — ไม่แก้'); process.exit(2); }
const MARK = 'v1.431.0 pricing-principles';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (หลักการคิดราคา)'); process.exit(0); }
if (!t.includes('v1.429.0 price-hub')) { console.error('✗ ต้องรัน scripts/patch-price-hub.js ก่อน'); process.exit(1); }

// หน้าต่างอ่านหลักการ: อ่าน app_state 'pricingPrinciples' แล้วแปลง Markdown อย่างง่าย (หัวข้อ · ตาราง · รายการ · ตัวหนา · ข้อความอ้างอิง)
const DOC = `  async _pricingDoc(){   // ${MARK}
    const esc=(s)=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    const inl=(s)=>esc(s).replace(/\\*\\*([^*]+)\\*\\*/g,'<b>$1</b>').replace(/\`([^\`]+)\`/g,'<code style="background:#F3EDE1;border-radius:5px;padding:0 4px;font-size:.92em">$1</code>');
    const md2h=(md)=>{ const L=String(md||'').split(/\\r?\\n/), H=[]; let i=0;
      while(i<L.length){ const l=L[i];
        if(/^\\s*\\|/.test(l)){ const T=[]; while(i<L.length&&/^\\s*\\|/.test(L[i])){ T.push(L[i]); i++; }
          const rows=T.filter(r=>!/^\\s*\\|[\\s:|-]+\\|\\s*$/.test(r)).map(r=>r.trim().replace(/^\\||\\|$/g,'').split('|').map(c=>c.trim()));
          H.push('<div style="overflow-x:auto;margin:8px 0"><table style="border-collapse:collapse;width:100%;font-size:12.5px;min-width:520px">'+rows.map((r,j)=>'<tr>'+r.map(c=>j?'<td style="border:1px solid #E4DED2;padding:6px 8px;vertical-align:top">'+inl(c)+'</td>':'<th style="border:1px solid #E4DED2;background:#F3EDE1;padding:6px 8px;text-align:left">'+inl(c)+'</th>').join('')+'</tr>').join('')+'</table></div>'); continue; }
        if(/^\\s*([-*]|\\d+\\.)\\s+/.test(l)){ const ord=/^\\s*\\d+\\./.test(l), I=[]; while(i<L.length&&/^\\s*([-*]|\\d+\\.)\\s+/.test(L[i])){ I.push(L[i].replace(/^\\s*([-*]|\\d+\\.)\\s+/,'')); i++; }
          H.push('<'+(ord?'ol':'ul')+' style="margin:6px 0;padding-left:22px;font-size:13.5px;line-height:1.6">'+I.map(x=>'<li>'+inl(x)+'</li>').join('')+'</'+(ord?'ol':'ul')+'>'); continue; }
        const h=l.match(/^(#{1,3})\\s+(.*)$/); if(h){ const n=h[1].length; H.push('<h'+(n+1)+' style="margin:'+(n===1?'0 0 6px':'16px 0 6px')+';font-size:'+(n===1?'19px':n===2?'16px':'14px')+'">'+inl(h[2])+'</h'+(n+1)+'>'); i++; continue; }
        if(/^>\\s?/.test(l)){ const Q=[]; while(i<L.length&&/^>\\s?/.test(L[i])){ Q.push(L[i].replace(/^>\\s?/,'')); i++; } H.push('<div style="background:#FAF1D6;color:#6B5410;border-radius:12px;padding:9px 12px;font-size:13px;line-height:1.6;margin:6px 0">'+Q.map(inl).join('<br>')+'</div>'); continue; }
        if(l.trim()) H.push('<p style="margin:6px 0;font-size:13.5px;line-height:1.6">'+inl(l)+'</p>'); i++; }
      return H.join(''); };
    const old=document.getElementById('wcPriceDoc'); if(old) old.remove();
    const ov=document.createElement('div'); ov.id='wcPriceDoc'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-label','หลักการคิดราคาของระบบ');
    ov.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(28,27,24,.55);display:flex;align-items:flex-start;justify-content:center;padding:max(16px,4vh) 12px 16px;overflow:auto;font-family:inherit';
    ov.innerHTML='<div style="background:#FFFDF8;border-radius:20px;width:min(860px,100%);box-shadow:0 24px 60px rgba(0,0,0,.35);overflow:hidden"><div style="background:#1C1B18;color:#F6F1E8;padding:14px 18px;display:flex;gap:10px;align-items:center"><div style="flex:1;min-width:0"><div style="font-size:11px;letter-spacing:.2em;color:#E2BC66;font-weight:700">สำหรับผู้ดูแลระบบ · อ่านก่อนแก้</div><b style="font-size:17px">📘 หลักการคิดราคาของระบบ</b></div><button data-pdx="1" aria-label="ปิด" style="flex:none;width:40px;height:40px;border-radius:12px;border:1px solid #4A463C;background:transparent;color:#F6F1E8;font-size:18px;cursor:pointer">✕</button></div><div id="wcPriceDocB" style="padding:16px 20px 20px;color:#22231C">กำลังโหลด…</div></div>';
    const close=()=>{ ov.remove(); document.removeEventListener('keydown', key); }; const key=(e)=>{ if(e.key==='Escape') close(); };
    ov.addEventListener('click',(e)=>{ if(e.target===ov||e.target.closest('[data-pdx]')) close(); }); document.addEventListener('keydown', key); document.body.appendChild(ov);
    let v=null; try{ if(this._sb){ const r=await this._sb.from('app_state').select('data').eq('id','pricingPrinciples').maybeSingle(); v=r&&r.data&&r.data.data&&r.data.data.v; } }catch(e){ console.warn(e); }
    const b=document.getElementById('wcPriceDocB'); if(!b) return;
    b.innerHTML=v&&v.md?md2h(v.md)+'<div style="margin-top:14px;font-size:11.5px;color:#8C877D">ฉบับ '+esc(v.ver||'')+' · '+esc(v.at||'')+' · ต้นฉบับ docs/pricing-principles.md ใน repository Project-Management</div>'
      :'<p style="font-size:13.5px">ยังไม่มีเนื้อหาในระบบ (app_state \\'pricingPrinciples\\') — ดูต้นฉบับที่ docs/pricing-principles.md ใน repository Project-Management</p>';
  }
`;

const NOTE = `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#FAF1D6;border:1px solid #EFDFAE;border-radius:12px;padding:9px 12px;margin-bottom:12px"><span style="flex:1;min-width:200px;font-size:12px;color:#6B5410;line-height:1.6">📘 <b>ก่อนแก้อัตรา หรือ % OH&amp;P / Preliminary</b> — อ่านหลักการคิดราคาของระบบก่อน (ราคา 2 ชั้น · ลำดับที่มาของราคา · ด่านตรวจ 7 ด่าน · ประวัติการตัดสินใจ) การแก้ที่นี่มีผลกับ Quotation Maker · Claim · OT ทันที</span><button sc-camel-on-click="{{ onRtPrinciples }}" style="flex:none;border:0;background:#1C1B18;color:#E2BC66;font-size:12px;font-weight:700;padding:8px 13px;border-radius:10px;cursor:pointer;font-family:inherit">อ่านหลักการ</button></div><!-- ${MARK} -->
            `;

const R = [
  ['หน้าต่างอ่านหลักการ', "  _priceHub(pid){", DOC + "  _priceHub(pid){"],
  ['กล่องเตือนในการ์ดอัตรากลาง', '<sc-if value="{{ rtReadOnly }}" hint-placeholder-val="{{ false }}">', NOTE + '<sc-if value="{{ rtReadOnly }}" hint-placeholder-val="{{ false }}">'],
  ['ปุ่มอ่านหลักการ (ค่า)', "out.rtCanEdit=ed; out.rtReadOnly=!ed;", "out.rtCanEdit=ed; out.rtReadOnly=!ed; out.onRtPrinciples=()=>this._pricingDoc();"],
  ['ลิงก์ในหน้าต่างทำราคา', "งานใหญ่ / ประมูลทั้งโครงการ → ทำ BOQ ใน Excel กับฝ่ายประมาณราคา</div></div></div>';",
   "งานใหญ่ / ประมูลทั้งโครงการ → ทำ BOQ ใน Excel กับฝ่ายประมาณราคา'+(money?' · <a href=\"#\" data-phd=\"1\" style=\"color:#6B5410;font-weight:700\">📘 หลักการคิดราคาของระบบ</a>':'')+'</div></div></div>';"],
  ['คลิกลิงก์หลักการ', "ov.addEventListener('click',(e)=>{ const t=e.target; if(t===ov||t.closest('[data-phx]')){ close(); return; }",
   "ov.addEventListener('click',(e)=>{ const t=e.target; if(t.closest('[data-phd]')){ e.preventDefault(); close(); this._pricingDoc(); return; } if(t===ov||t.closest('[data-phx]')){ close(); return; }"],
];
for (const [name, a] of R) { const c = t.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) t = t.split(a).join(b);
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ หลักการคิดราคา: แก้ ' + R.length + ' จุด');
