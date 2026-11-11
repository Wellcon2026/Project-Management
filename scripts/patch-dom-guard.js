#!/usr/bin/env node
/* =====================================================================
   กันแอปพัง "Failed to execute 'removeChild' on 'Node'" (หน้าขาว + กล่องแดง Root: …)
     node scripts/patch-dom-guard.js        (รันต่อจาก patch-usage.js)
   สาเหตุที่พบบ่อย: Chrome แปลภาษาอัตโนมัติ / ส่วนขยายเบราว์เซอร์ (Grammarly ฯลฯ) แก้ข้อความในหน้า
   ขณะที่แอปกำลังวาดหน้าใหม่ → ตัววาดหาโหนดเดิมไม่เจอแล้วหยุดทั้งแอป
   1) <html translate="no"> + <meta name="google" content="notranslate"> — ปิดการแปลอัตโนมัติ
   2) ตัวกัน removeChild / insertBefore: ถ้าโหนดถูกย้ายไปแล้ว ข้ามแทนการพัง (แนวทางมาตรฐานจาก React issue #11538)
   - ใส่ทั้งในหัวหน้าเว็บด้านนอก และในหน้าแอป (template) · รันซ้ำได้ ไม่ซ้อน
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'index.html');
const BS = String.fromCharCode(92);
const MARK = 'wellcon-dom-guard';
let raw = fs.readFileSync(file, 'utf8');
if (raw.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (กันแอปพัง removeChild)'); process.exit(0); }
const GUARD = `<meta name="google" content="notranslate"><script data-${MARK}="1">(function(){try{var P=window.Node&&Node.prototype;if(!P||P.__wcGuard)return;P.__wcGuard=1;var rc=P.removeChild,ib=P.insertBefore;`
  + `P.removeChild=function(c){if(c&&c.parentNode!==this){try{console.warn('[wellcon] skip removeChild (node moved by translate/extension)');}catch(e){}return c;}return rc.apply(this,arguments);};`
  + `P.insertBefore=function(n,r){if(r&&r.parentNode!==this){try{console.warn('[wellcon] insertBefore ref moved — append instead');}catch(e){}return ib.call(this,n,null);}return ib.apply(this,arguments);};}catch(e){}})();</script>`;
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(nl);
const idx = lines.findIndex((l, i) => i > 0 && lines[i - 1].includes('<script type="__bundler/template">'));
if (idx < 0) { console.error('✗ ไม่พบส่วน template ใน index.html'); process.exit(2); }
const enc = (t) => JSON.stringify(t).split('</').join('<' + BS + 'u002F');
let t = JSON.parse(lines[idx]);
if (enc(t) !== lines[idx]) { console.error('✗ ถอด/ประกอบ template แล้วไม่ตรงเดิม — ไม่แก้'); process.exit(2); }
// หน้าแอป (template)
{ const a = '<html><head>\n<meta charset="utf-8">'; if (t.split(a).length - 1 !== 1) { console.error('✗ หาหัวหน้า template ไม่เจอ — ไม่แก้'); process.exit(1); }
  t = t.replace(a, '<html translate="no"><head>\n<meta charset="utf-8">\n' + GUARD); }
lines[idx] = enc(t);
raw = lines.join(nl);
// หัวหน้าเว็บด้านนอก (ทำงานก่อนแอปโหลด)
{ const a = '<html>\n<head>\n  <meta charset="utf-8">'; const b = a.split('\n').join(nl);
  if (raw.split(b).length - 1 !== 1) { console.error('✗ หาหัวหน้าเว็บด้านนอกไม่เจอ — ไม่แก้'); process.exit(1); }
  raw = raw.replace(b, ('<html translate="no">\n<head>\n  <meta charset="utf-8">\n  ' + GUARD).split('\n').join(nl)); }
fs.writeFileSync(file, raw);
console.log('✓ กันแอปพัง removeChild: ปิดแปลภาษาอัตโนมัติ + ตัวกัน DOM (ทั้งหน้าเว็บด้านนอก และหน้าแอป)');
