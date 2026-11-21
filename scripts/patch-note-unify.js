#!/usr/bin/env node
/* =====================================================================
   v1.450.0 note-unify — ข้อ 1 (ต่อ): โน้ต / แท็ก หน้าตาเดียวกันทุกที่ (ผู้บริหารสั่ง 21/11/2026)
     node scripts/patch-note-unify.js        (รันหลัง patch-note-inline.js)
   - ภาพรวมโครงการ › "งานคงค้าง · โน้ตโครงการ": ส่วนโน้ต (โน้ตงานสำคัญ · โครงการนี้) → หน้า Notes ชุดเดียวกัน กรองเฉพาะโครงการนั้น
     (ส่วน "งานคงค้าง" ที่ PM มอบหมายงาน คงไว้ตามเดิม)
   - กระดิ่ง 🔔 ในแอปหลัก → หน้า Notes แท็บ "แท็กถึงฉัน" (wctag.js 1.3.0) — โหลด wctag.js?v=1.3.0
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'index.html');
const BS = String.fromCharCode(92);
const TAG_VER = '1.3.0';
const raw = fs.readFileSync(file, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(nl);
const idx = lines.findIndex((l, i) => i > 0 && lines[i - 1].includes('<script type="__bundler/template">'));
if (idx < 0) { console.error('✗ ไม่พบส่วน template ใน index.html'); process.exit(2); }
const enc = (t) => JSON.stringify(t).split('</').join('<' + BS + 'u002F');
let t = JSON.parse(lines[idx]);
if (enc(t) !== lines[idx]) { console.error('✗ ถอด/ประกอบ template แล้วไม่ตรงเดิม — ไม่แก้'); process.exit(2); }
const MARK = 'v1.450.0 note-unify';
if (t.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (note-unify)'); process.exit(0); }
if (!t.includes('v1.449.0 note-inline')) { console.error('✗ ต้องรัน scripts/patch-note-inline.js ก่อน'); process.exit(1); }
const divEnd = (s) => { const re = /<div\b|<\/div>/g; re.lastIndex = s; let d = 0, m; while ((m = re.exec(t))) { if (m[0] === '</div>') { d--; if (d === 0) return m.index + 6; } else d++; } return -1; };
// 1) ภาพรวมโครงการ: ส่วนโน้ต
const G = '<sc-if value="{{ pnShow }}"'; const g = t.indexOf(G); if (g < 0 || t.indexOf(G, g + 1) >= 0) { console.error('✗ ภาพรวมโครงการ: หาส่วนโน้ตไม่เจอ / เจอหลายที่'); process.exit(1); }
const DIV = '<div style="grid-column:1/-1;padding-top:14px;border-top:1px solid #2E2C27">'; const s = t.indexOf(DIV, g);
if (s < 0 || s - g > 300) { console.error('✗ ภาพรวมโครงการ: หากล่องโน้ตไม่เจอ'); process.exit(1); }
const e = divEnd(s); const blk = t.slice(s, e);
if (e < 0 || !blk.includes('{{ pnItems }}') || !blk.includes('{{ onpnAdd }}')) { console.error('✗ ภาพรวมโครงการ: ขอบเขตกล่องโน้ตไม่ตรง'); process.exit(1); }
t = t.slice(0, s) + '<div style="grid-column:1/-1;padding-top:14px" data-wn-host="proj" data-wn-pid="{{ pvx.wnPid }}" data-wn-tab="proj"><!-- ' + MARK + ': หน้า Notes ชุดเดียวกัน · เฉพาะโครงการนี้ --></div>' + t.slice(e);
// 2) ส่ง pid ให้ช่อง
const A = 'pvx:this._pvx(S),'; if (t.split(A).length !== 2) { console.error('✗ pvx: หาจุดแก้ไม่เจอ'); process.exit(1); }
t = t.replace(A, () => "pvx:{ ...(this._pvx(S)||{}), wnPid:S.projectId||'' },   /* " + MARK + " */");
// 3) wctag.js เวอร์ชันใหม่ (กระดิ่ง = หน้า Notes แท็บแท็ก)
const re = /\/wctag\.js\?v=[0-9.]+/g; if ((t.match(re) || []).length !== 1) { console.error('✗ wctag.js: หาไม่เจอ / หลายที่'); process.exit(1); }
t = t.replace(re, '/wctag.js?v=' + TAG_VER);
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ note-unify: ภาพรวมโครงการใช้หน้า Notes (เฉพาะโครงการ) · wctag.js?v=' + TAG_VER);
