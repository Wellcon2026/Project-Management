#!/usr/bin/env node
/* =====================================================================
   หน้าแรกตามบทบาท (landing page) ให้ "ทุกตำแหน่ง" — ตำแหน่งที่ยังไม่ได้กำหนด ออกแบบปุ่มตามหน้าที่ให้
     node scripts/patch-role-home.js        (รันหลัง patch-work-home.js และ patch-claim-menu.js)
   ค่าเริ่มต้นปุ่มบนหน้าแรก (Super Admin ยังปรับรายตำแหน่งได้ที่ ⚙ จัดปุ่มบนหน้านี้ — ค่าที่ตั้งไว้แล้วไม่ถูกทับ)
     จป. ความปลอดภัย (safety)   รายงานประจำวัน · Defect/จุดเสี่ยง · Delay & Early Warning · Claim · แผนงาน · ปฏิทิน · ทะเบียนเอกสาร · ออกหนังสือ · Library · Training
     ธุรการ · ประสานงาน (office) รายงานประจำวัน · ทะเบียนเอกสาร · ออกหนังสือ · RFI · แบบ · ปฏิทิน · VO/EOT · Claim · ส่งมอบ · Library
     QS / QS Manager            Takeoff · VO Tracker · VO/EOT · Claim · การเงิน/งวดเบิก · แบบ · แผนงาน · QS Tracking · จัดซื้อ
     Project Director           Project Management · แผนงาน · Delay · การเงิน · VO/EOT · Claim · ส่งมอบ · CFO · QS Tracking · Home
     Store / Factory / Driver / จัดซื้อ / บัญชี-การเงิน / HR (+ ผู้จัดการฝ่าย) — ตามหน้าที่ (ดูใน WORK_DEF)
   จป. + ธุรการ ใช้ชื่อหน้า "หน้างานของฉัน" · ตำแหน่งอื่นใช้ "หน้าทำงานของฉัน"
   ล็อกอินตามบทบาท: ทุกตำแหน่งที่มีหน้าแรก → ลงหน้าแรกของตำแหน่ง (ปิดได้รายคน)
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
if (t.includes('v1.364.6 role-home')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (หน้าแรกตามบทบาททุกตำแหน่ง)'); process.exit(0); }

const DEF = `const SAFE=['tab:daily','tab:qc','tab:delay','tab:claim','tab:plan','tab:cal','tab:docs','tab:memo','nav:library','nav:training'];   // v1.364.6 role-home
    const OFF=['tab:daily','tab:docs','tab:memo','tab:rfi','tab:dwg','tab:cal','tab:changes','tab:claim','tab:handover','nav:library'];
    const QS=['tab:qm','tab:aw','tab:changes','tab:claim','tab:fin','tab:dwg','tab:plan','nav:qstrack','nav:procurement'];
    const DIR=['tab:overview','tab:plan','tab:delay','tab:fin','tab:changes','tab:claim','tab:handover','nav:cfo','nav:qstrack','nav:dashboard'];
    const STO=['tab:procm','tab:mat','tab:spo','tab:daily','tab:cal','nav:procurement'];
    const FAC=['tab:prod','tab:dwg','tab:skp','tab:mat','tab:procm','tab:qc','tab:plan','tab:cal'];
    const DRV=['tab:cal','tab:spo','tab:procm','tab:daily'];
    const PRC=['tab:procm','tab:mat','tab:spo','tab:subcon','tab:changes','nav:procurement','nav:subcon'];
    const FIN=['tab:fin','tab:aw','tab:changes','tab:claim','tab:subcon','nav:cfo','nav:procurement'];
    const HR=['nav:hr','nav:jd','nav:training','nav:library','tab:daily','tab:cal'];
    return { pm:SITE, pm_mgr:SITE, sitemgr:SITE, site:SITE, designer:DES, design_mgr:DES, safety:SAFE, office:OFF, qs:QS, qs_mgr:QS, director:DIR,
      store:STO, factory:FAC, driver:DRV, proc:PRC, fin:FIN, fin_mgr:FIN, hr:HR, hr_mgr:HR }[rk]||[]; }`;
const E = [
  ['ปุ่มเริ่มต้นทุกตำแหน่ง', "return { pm:SITE, pm_mgr:SITE, sitemgr:SITE, site:SITE, designer:DES, design_mgr:DES }[rk]||[]; }", () => DEF],
  ['จป. + ธุรการ = หน้างาน', "['pm','pm_mgr','sitemgr','site'].indexOf(rk)>=0?'site':'other'", () => "['pm','pm_mgr','sitemgr','site','safety','office'].indexOf(rk)>=0?'site':'other'"],
  ['ไอคอนปุ่มเพิ่ม', ", home:'M3 10l9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', dot:'M4 4h16v16H4z' };",
    (a) => ", overview:'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z', cal:'M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z', subcon:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8', spo:'M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z', docs:'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z', memo:'M4 4h16v16H4zM8 9h8M8 13h8M8 17h5'" + a],
  ['คำอธิบายปุ่มเพิ่ม', "prod:'งานผลิตโรงงาน FF&E', dhome:",
    (a) => "prod:'งานผลิตโรงงาน FF&E', overview:'ภาพรวม · ทีม · ความคืบหน้า · การเงิน', cal:'ปฏิทิน · วันสำคัญของโครงการ', fin:'งวดเบิกเงิน · วางบิล · รับเงิน', aw:'งานเพิ่ม · VO Tracker (QS)', proc:'จัดซื้อวัสดุ · PR / PO', subcon:'สัญญาช่าง · จ่ายงวดช่าง', spo:'ของสั่งทำ · ของนำเข้า · ส่งของ', docs:'ทะเบียนรับ-ส่งเอกสาร', memo:'ออกหนังสือ · ฟอร์ม', dhome:"],
];
for (const [name, a, f] of E) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => f(a)); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ หน้าแรกตามบทบาท: ทุกตำแหน่งมีปุ่มเริ่มต้นตามหน้าที่ · จป. / ธุรการ = หน้างาน');
