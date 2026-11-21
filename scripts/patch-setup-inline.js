#!/usr/bin/env node
/* =====================================================================
   v1.452.0 setup-inline — ข้อ 2: ข้อมูลโครงการ / คู่สัญญา ใช้ฟอร์มเดียวกับ Setup (ผู้บริหารสั่ง 21/11/2026)
     node scripts/patch-setup-inline.js        (รันหลัง patch-note-unify.js · patch-project-setup.js)
   - ภาพรวมโครงการ › "ข้อมูลสัญญา · คู่สัญญา · เอกสาร":
       · กล่อง "ข้อมูลสัญญา · Contract" → ฟอร์มข้อ 1 ของ Setup (data-ws-host="main") + แถบ VO / คงเหลือ เดิม
       · กล่อง "ข้อมูลคู่สัญญา · การวางบิล" → ฟอร์มข้อ 2–3 ของ Setup (data-ws-host="party,bill") + ปุ่ม ✨ AI เติมจากเอกสาร เดิม
       · คลังเอกสาร (Owner / Supplier) และหน้าตรวจ AI คงเดิม
   - ข้อมูลชุดเดิม (projects · projParties · projBilling) — ไม่ย้าย
   - window.__wsBridge = () => this._setupBridge()
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
const MARK = 'v1.452.0 setup-inline';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (setup-inline)'); process.exit(0); }
if (!t.includes('v1.450.0 note-unify') || !t.includes('v1.443.0 project-setup')) { console.error('✗ ต้องรัน patch-project-setup.js และ patch-note-unify.js ก่อน'); process.exit(1); }
const divEnd = (s) => { const re = /<div\b|<\/div>/g; re.lastIndex = s; let d = 0, m; while ((m = re.exec(t))) { if (m[0] === '</div>') { d--; if (d === 0) return m.index + 6; } else d++; } return -1; };
const G = '<sc-if value="{{ pvx.parties }}"'; const g = t.indexOf(G); if (g < 0 || t.indexOf(G, g + 1) >= 0) { console.error('✗ หาส่วนข้อมูลสัญญาไม่เจอ / เจอหลายที่'); process.exit(1); }
// 1) กล่องข้อมูลสัญญา
const C1 = '<div style="background:#fff;border:1px solid #EDE7DA;border-radius:18px;padding:18px 20px 20px;margin-bottom:14px">';
const s1 = t.indexOf(C1, g); const e1 = s1 < 0 ? -1 : divEnd(s1); const b1 = t.slice(s1, e1);
if (s1 < 0 || s1 - g > 3000 || !b1.includes('ข้อมูลสัญญา · Contract') || !b1.includes('{{ pd.headVo }}')) { console.error('✗ กล่องข้อมูลสัญญา: ขอบเขตไม่ตรง'); process.exit(1); }
const VOS = '<div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:14px;padding-top:12px;border-top:1px solid #F5F1E8;font-size:11.5px;color:#7A7365">';
const vs = b1.indexOf(VOS); if (vs < 0) { console.error('✗ แถบ VO: หาไม่เจอ'); process.exit(1); }
let vo = b1.slice(vs); { const re = /<div\b|<\/div>/g; let d = 0, m; while ((m = re.exec(vo))) { if (m[0] === '</div>') { d--; if (d === 0) { vo = vo.slice(0, m.index + 6); break; } } else d++; } }
vo = vo.replace(VOS, '<div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:10px;padding:10px 14px;background:#fff;border:1px solid #EDE7DA;border-radius:12px;font-size:11.5px;color:#7A7365"><span>วันคงเหลือ <b class="num" style="color:#1C1B18">{{ pd.contractLeft }}</b></span>');
const R1 = '<div style="margin-bottom:14px"><!-- ' + MARK + ': ฟอร์มข้อ 1 ของ Setup --><div data-ws-host="main" data-ws-pid="{{ pvx.wnPid }}"></div>' + vo + '</div>';
// 2) กล่องคู่สัญญา · วางบิล
const A2 = t.indexOf('AI เติมข้อมูลคู่สัญญาจากเอกสาร', s1);
const C2 = '<div style="background:#fff;border:1px solid #EDE7DA;border-radius:16px;margin-top:14px;overflow:hidden;display:flex;flex-wrap:wrap">';
const s2 = t.indexOf(C2, A2); const e2 = s2 < 0 ? -1 : divEnd(s2); const b2 = t.slice(s2, e2);
if (A2 < 0 || s2 < 0 || !b2.includes('{{ pd.ptTabs }}') || !b2.includes('{{ pai.onOpen }}')) { console.error('✗ กล่องคู่สัญญา: ขอบเขตไม่ตรง'); process.exit(1); }
const R2 = '<div style="margin-top:14px;display:flex;flex-direction:column;gap:10px"><!-- ' + MARK + ': ฟอร์มข้อ 2–3 ของ Setup -->'
  + '<sc-if value="{{ pai.can }}" hint-placeholder-val="{{ true }}"><button sc-camel-on-click="{{ pai.onOpen }}" title="ให้ AI อ่านสัญญา / แบบ / จดหมาย / อีเมล แล้วเติมข้อมูลให้" style="align-self:flex-start;display:flex;align-items:center;gap:6px;border:1px solid #C9A961;background:#1C1B18;color:#E2BC66;border-radius:10px;padding:9px 14px;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer;min-height:42px" style-hover="background:#2C2A25">✨ AI เติมข้อมูลคู่สัญญาจากเอกสาร</button></sc-if>'
  + '<div data-ws-host="party,bill" data-ws-pid="{{ pvx.wnPid }}"></div></div>';
t = t.slice(0, s2) + R2 + t.slice(e2); t = t.slice(0, s1) + R1 + t.slice(e1);
// 3) bridge
const A = "onCmdOpen:()=>this.cmdOpen('go'),"; if (t.split(A).length !== 2) { console.error('✗ bridge: หาจุดแก้ไม่เจอ'); process.exit(1); }
t = t.replace(A, () => A + " _wsBr:((typeof window!=='undefined'&&!window.__wsBridge)?((window.__wsBridge=()=>this._setupBridge()),1):0),   /* " + MARK + " */");
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ setup-inline: ข้อมูลสัญญา + คู่สัญญา / วางบิล ใช้ฟอร์ม Setup · bridge');
