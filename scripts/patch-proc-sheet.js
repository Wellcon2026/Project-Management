#!/usr/bin/env node
/* =====================================================================
   v1.387.0 proc-sheet — แถบ "ลิงก์ Google Sheet · อัลบั้มรูป" ในหน้า จัดซื้อวัสดุ (pdTab 'proc')
     node scripts/patch-proc-sheet.js
   1) เปิดแถบลิงก์ Google Sheet ให้แท็บ 'proc' (เดิมมีใน Drawing Log · FF&E · SketchUp · Material Log · แผนงาน · RFI · เอกสาร)
      ลิงก์แยกตามโครงการ + ตามหน้า (projSheets[pid] รายการ tab:'proc') — ทุกคนในโครงการเห็น
   2) ย้ายแถบลิงก์ไว้บนสุดของหน้า (เหนือกล่อง "PR / PO จาก Mango ERP") ให้ตำแหน่งตรงกับหน้า Drawing Log
      — มีผลกับหน้า จัดซื้อวัสดุ / Material Log ที่มีกล่อง Mango ด้วย
   ไม่ต้องรัน SQL · รันซ้ำได้ ไม่ซ้อน · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
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
const MARK = 'v1.387.0 proc-sheet';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ลิงก์ Google Sheet หน้าจัดซื้อวัสดุ)'); process.exit(0); }

// 1) เปิดให้แท็บ proc
const A = "    const TABS=['dwg','prod','skp','mat','procm','plan','rfi','docs','memo'];";
const A2 = "    const TABS=['dwg','prod','skp','mat','procm','proc','plan','rfi','docs','memo'];   // " + MARK + ": + จัดซื้อวัสดุ";
if (t.split(A).length !== 2) { console.error('✗ หา TABS ของ SHEET_VALS ไม่เจอ (หรือเจอซ้ำ) — ไม่แก้อะไรเลย'); process.exit(1); }

// 2) สลับบล็อก: [กล่อง Mango][แถบลิงก์] → [แถบลิงก์][กล่อง Mango]
const MG = '        <sc-if value="{{ mgPoOn }}" hint-placeholder-val="{{ false }}">';
const SH = '        <sc-if value="{{ sh.on }}" hint-placeholder-val="{{ false }}">';
const END = '\n        </sc-if>\n';
if (t.split(MG).length !== 2 || t.split(SH).length !== 2) { console.error('✗ หากล่อง Mango / แถบลิงก์ไม่เจอ (หรือเจอซ้ำ) — ไม่แก้อะไรเลย'); process.exit(1); }
const m0 = t.indexOf(MG), s0 = t.indexOf(SH);
const mEnd = t.indexOf(END, m0) + END.length;
const sEnd = t.indexOf(END, s0) + END.length;
if (!(m0 < s0) || t.slice(mEnd, s0).trim() !== '') { console.error('✗ กล่อง Mango ไม่ได้อยู่ติดก่อนแถบลิงก์ตามที่คาด — ไม่แก้อะไรเลย'); process.exit(1); }
const mgBlock = t.slice(m0, mEnd), shBlock = t.slice(s0, sEnd), gap = t.slice(mEnd, s0);
const cnt = (s, x) => s.split(x).length - 1;
for (const b of [mgBlock, shBlock]) {
  if (cnt(b, '<sc-if ') !== cnt(b, '</sc-if>')) { console.error('✗ ตัดบล็อกไม่ครบ (sc-if ไม่สมดุล) — ไม่แก้อะไรเลย'); process.exit(1); }
}
t = t.slice(0, m0) + '        <!-- ' + MARK + ': แถบลิงก์ Google Sheet อยู่บนสุด (เหนือกล่อง Mango) -->\n' + shBlock + gap + mgBlock + t.slice(sEnd);
t = t.split(A).join(A2);

lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ลิงก์ Google Sheet หน้าจัดซื้อวัสดุ: เปิดแท็บ proc + ย้ายแถบไว้บนสุด');
