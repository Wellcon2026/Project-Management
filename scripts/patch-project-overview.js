#!/usr/bin/env node
/* =====================================================================
   หน้าภาพรวมโครงการ (Project Management) — สั้นลง · ไปหน้าอื่นง่ายขึ้น (มือถือเป็นหลัก)
     node scripts/patch-project-overview.js
   1) ปุ่มลัดใต้ชื่อโครงการ: Defect Check · รายงานประจำวัน · Claim · RFI · VO/EOT · แผนงาน · ส่งมอบ · Takeoff · Delay
   2) ทีมงาน: พับเป็นแถบรูปหน้า + จำนวนคน (แตะ "ดูทีม ▾" เพื่อเปิด)
   3) ความคืบหน้า: แสดง 3 แถบหลัก · คำอธิบาย / คาดการณ์วันเสร็จ / ขั้นตอนงาน พับไว้ใต้ "ดูเพิ่ม"
   4) การเงิน: แสดงมูลค่างานหลัง VO · สัญญา / VO / วันสิ้นสุด / เก็บเงิน พับไว้ใต้ "ดูเพิ่ม"
   มือถือ (จอแคบกว่า 860px) เริ่มแบบพับ · จอคอมเริ่มแบบเปิด · กดสลับได้ (จำระหว่างใช้งาน)
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์ · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง (ต้องรัน patch-claim-menu.js ก่อน)
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
if (t.includes('_pdx(S, defs, tabs)')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (หน้าภาพรวมโครงการแบบสั้น)'); process.exit(0); }

const TOG = (on, lbl, mt) => `<button sc-camel-on-click="{{ pdx.${on} }}" style="display:block;width:100%;margin-top:${mt};border:1px dashed #4A463C;background:transparent;color:#C9A961;border-radius:10px;padding:7px 10px;font-family:inherit;font-size:11.5px;font-weight:700;cursor:pointer;text-align:left" style-hover="border-color:#C9A961">{{ pdx.${lbl} }}</button>`;
const QUICK = `<sc-if value="{{ pdx.qHas }}" hint-placeholder-val="{{ false }}"><div class="hscroll" style="display:flex;gap:6px;overflow-x:auto;margin-top:10px;padding-bottom:3px;-webkit-overflow-scrolling:touch"><sc-for list="{{ pdx.quick }}" as="q" hint-placeholder-count="5"><button sc-camel-on-click="{{ q.onPress }}" style="flex:none;border:1px solid #C9A961;background:#C9A961;color:#1C1B18;border-radius:999px;padding:6px 12px;font-family:inherit;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap" style-hover="background:#E2BC66">{{ q.label }}</button></sc-for></div></sc-if>`;
const STRIP = `<sc-if value="{{ pdx.teamClosed }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ pdx.onTeam }}" title="ดูทีมงานทั้งหมด" style="display:flex;align-items:center;gap:10px;width:100%;border:1px solid #3A3730;background:#26241F;border-radius:12px;padding:7px 10px;cursor:pointer;font-family:inherit"><span style="display:flex;max-width:170px;overflow:hidden;flex:none;padding-left:6px"><sc-for list="{{ pd.team }}" as="t" hint-placeholder-count="5"><span style="position:relative;overflow:hidden;width:28px;height:28px;flex:none;margin-left:-6px;border-radius:50%;border:2px solid #26241F;background:#3A362E;color:#C9A961;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px"><sc-if value="{{ t.noPhoto }}" hint-placeholder-val="{{ true }}">{{ t.initial }}</sc-if>{{ t.photoEl }}</span></sc-for></span><span style="flex:1;min-width:0;text-align:left;font-size:11.5px;color:#D9C9A3;font-weight:600">ทีมงาน {{ pd.heroTeamCount }}</span><span style="flex:none;font-size:11px;color:#C9A961;font-weight:700">ดูทีม ▾</span></button></sc-if>`;

const E = [
  ['ปุ่มลัดใต้ชื่อโครงการ', '<div style="font-size:11.5px;color:#8E876F;margin-top:6px">{{ pd.client }} · {{ pd.dates }}</div>', (a) => a + '\n            ' + QUICK],
  ['ปุ่มเปิด/ซ่อนทีม', '<sc-if value="{{ pd.canAssign }}" hint-placeholder-val="{{ false }}">\n                <sc-raw-select ref="{{ pd.assignAddRef }}"',
    (a) => '<sc-if value="{{ pdx.teamOpen }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ pdx.onTeam }}" style="flex:none;border:none;background:none;color:#C9A961;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;padding:2px 4px;white-space:nowrap">{{ pdx.teamBtn }}</button></sc-if>\n              ' + a],
  ['ทีม: แถบรูปหน้าตอนพับ', '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,140px),1fr));gap:7px">\n              <sc-for list="{{ pd.team }}"',
    (a) => STRIP + '\n            <sc-if value="{{ pdx.teamOpen }}" hint-placeholder-val="{{ true }}">' + a],
  ['ทีม: ปิดส่วนพับ', 'ยังไม่ได้กำหนดทีมงาน — ผู้จัดการเลือกจากช่องด้านบน</div>\n              </sc-if>\n            </div>', (a) => a + '\n            </sc-if>'],
  ['ความคืบหน้า: คำอธิบายงาน', '<div style="font-size:10px;color:#A99F8C;margin-top:4px;line-height:1.45">{{ pd.workNote }}</div>', (a) => '<sc-if value="{{ pdx.moreOpen }}" hint-placeholder-val="{{ true }}">' + a + '</sc-if>'],
  ['ความคืบหน้า: คำอธิบายการเงิน', '<div style="font-size:10px;color:#A99F8C;margin-top:3px;line-height:1.45">{{ pd.billNote }}</div>', (a) => '<sc-if value="{{ pdx.moreOpen }}" hint-placeholder-val="{{ true }}">' + a + '</sc-if>'],
  ['ความคืบหน้า: พับคาดการณ์ + ขั้นตอนงาน', '<sc-if value="{{ pd.fcShow }}" hint-placeholder-val="{{ false }}">\n              <div style="background:#292722;border-radius:13px;padding:10px 12px;margin-top:12px">',
    (a) => TOG('onMore', 'moreBtn', '12px') + '\n            <sc-if value="{{ pdx.moreOpen }}" hint-placeholder-val="{{ true }}">\n            ' + a],
  ['ความคืบหน้า: ปิดส่วนพับ', '              </sc-for>\n            </div>\n          </div>\n\n          <div style="min-width:0;border-left:1px solid #2E2C27;padding-left:22px">\n            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px">',
    (a) => a.replace('              </sc-for>\n            </div>\n', '              </sc-for>\n            </div>\n            </sc-if>\n')],
  ['การเงิน: พับรายละเอียด', '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:10px 16px;margin-top:14px;padding-top:13px;border-top:1px solid #2E2C27">',
    (a) => TOG('onMoney', 'moneyBtn', '12px') + '\n            <sc-if value="{{ pdx.moneyOpen }}" hint-placeholder-val="{{ true }}">\n            ' + a],
  ['การเงิน: ปิดส่วนพับ', '<span>ยังไม่ได้รับ <b style="color:#E9E1D2">{{ pd.colRemain }}</b></span>\n              </div>\n            </div>\n          </div>',
    (a) => a.replace(/\n          <\/div>$/, '\n            </sc-if>\n          </div>')],
  ['ค่าที่ส่งให้หน้าจอ', 'isProjPicker, ppHead, ppCards,', (a) => 'isProjPicker, ppHead, ppCards, pdx:this._pdx(S, pdTabDefs, pdTabs),'],
  ['ตัวช่วย _pdx', '  _claimOpen(pid){', (a) => `  // v1.364.4 หน้าภาพรวมโครงการแบบสั้น: ปุ่มลัด + ส่วนที่พับได้ (มือถือเริ่มพับ · จอคอมเริ่มเปิด)
  _pdx(S, defs, tabs){ const mob=(S.vw||1440)<860; const g=(k)=>S[k]==null?!mob:!!S[k];
    const Q=['qc','daily','claim','rfi','changes','plan','handover','qm','delay']; const quick=[];
    Q.forEach(k=>{ const i=(defs||[]).findIndex(d=>d[0]===k); if(i>=0&&tabs&&tabs[i]) quick.push({ key:k, label:String(defs[i][1]||'').split(' · ')[0], onPress:tabs[i].onPress }); });
    const T=g('pdxTeam'), M=g('pdxMore'), F=g('pdxMoney');
    return { quick, qHas:quick.length>0, teamOpen:T, teamClosed:!T, teamBtn:T?'ซ่อน ▴':'ดูทีม ▾', onTeam:()=>this.setState({ pdxTeam:!T }),
      moreOpen:M, moreBtn:M?'▴ ซ่อนรายละเอียด':'▾ ดูเพิ่ม · คาดการณ์วันเสร็จ · ขั้นตอนงาน', onMore:()=>this.setState({ pdxMore:!M }),
      moneyOpen:F, moneyBtn:F?'▴ ซ่อนรายละเอียด':'▾ ดูเพิ่ม · สัญญา · VO · วันสิ้นสุด · เก็บเงิน', onMoney:()=>this.setState({ pdxMoney:!F }) }; }
` + a],
];
for (const [name, a, f] of E) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => f(a)); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ หน้าภาพรวมโครงการแบบสั้น: ปุ่มลัด · ทีม / รายละเอียด / การเงิน พับได้');
