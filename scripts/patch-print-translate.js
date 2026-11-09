#!/usr/bin/env node
/* =====================================================================
   พิมพ์ English / สองภาษา: แปลข้อความไทยที่ผู้ใช้พิมพ์เอง (ชื่อเรื่อง · รายละเอียด · พื้นที่ · ชื่อคน ฯลฯ) เป็นอังกฤษด้วย
     node scripts/patch-print-translate.js      (รันหลัง patch-print-lang.js)
   - แปลด้วยผู้ช่วย AI ของบริษัท (aiBackend → Supabase function ai-assistant) · บัญชีที่ไม่มีสิทธิ์ AI / AI ใช้ไม่ได้ → สำรอง Google Translate
   - English: ไม่เหลือภาษาไทย · สองภาษา: ไทย + คำแปลอังกฤษตัวเอียงใต้ข้อความ
   - ใช้กับ หนังสือแจ้งล่าช้า · รายงานตรวจ Defect · รายการ Defect (ทุกเอกสารที่ผ่าน _trDoc / _printViaFrame)
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
if (t.includes('_trFree(')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (แปลข้อความผู้ใช้ตอนพิมพ์)'); process.exit(0); }
const NEW = String.raw`  // v1.367.1 print-translate: แปลข้อความไทยที่ผู้ใช้พิมพ์เอง → อังกฤษ (AI ของบริษัท · สำรอง Google Translate)
  async _trThai(list){ const TH=/[ก-ฺเ-๛]/; const uniq=[...new Set((list||[]).map(x=>String(x==null?'':x).trim()).filter(x=>TH.test(x)))]; const out={}; if(!uniq.length) return out;
    try{ const reply=await this.aiBackend({ model:'claude-sonnet-4-5', max_tokens:4000,
        system:'You translate Thai text from an interior fit-out contractor (Wellcon Interior) into concise, professional English for client documents. Keep numbers, codes, room numbers, brand and product names unchanged. Transliterate Thai person names (e.g. นนท์ → Non) and company names (บจก. / บริษัท ... จำกัด → ... Co., Ltd.). Reply with a JSON array of strings only — same order and length as the input. No explanations.',
        messages:[{ role:'user', content:JSON.stringify(uniq) }] });
      const a=JSON.parse(String(reply||'').replace(/` + '```' + String.raw`[a-z]*\n?/gi,'').trim()); if(Array.isArray(a)&&a.length===uniq.length){ uniq.forEach((x,i)=>{ if(a[i]) out[x]=String(a[i]); }); return out; } }catch(e){}
    await Promise.all(uniq.map(async x=>{ try{ const r=await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=th&tl=en&dt=t&q='+encodeURIComponent(x)); const j=await r.json(); const s=(j[0]||[]).map(y=>y[0]).join(''); if(s) out[x]=s; }catch(e){} }));
    return out; }
  async _trFree(html, lang){ const doc=new DOMParser().parseFromString(html,'text/html'); const TH=/[ก-ฺเ-๛]/; const nodes=[];
    const walk=(n)=>{ if(n.nodeType===3){ if(TH.test(n.nodeValue)) nodes.push(n); return; } if(n.nodeType===1&&(/^(SCRIPT|STYLE)$/.test(n.nodeName)||n.getAttribute('data-tr'))) return; Array.prototype.slice.call(n.childNodes).forEach(walk); };
    walk(doc.body); const ti=doc.querySelector('title'); const tiTx=ti&&TH.test(ti.textContent)&&lang==='en'?ti.textContent:'';
    if(!nodes.length&&!tiTx) return html;
    const TR=await this._trThai([...nodes.map(n=>n.nodeValue), tiTx]);
    nodes.forEach(n=>{ const k=n.nodeValue.trim(); const en=TR[k]; if(!en) return;
      if(lang==='en'){ n.nodeValue=n.nodeValue.replace(k, en); return; }
      const sp=doc.createElement('span'); sp.setAttribute('style','display:block;color:#555;font-style:italic;font-size:.94em'); sp.textContent=en; n.parentNode.insertBefore(sp, n.nextSibling); });
    if(tiTx&&TR[tiTx.trim()]) ti.textContent=TR[tiTx.trim()];
    return '<!doctype html>'+doc.documentElement.outerHTML; }
  async _trDoc(html, lang){ const h=this._trDocSync(html, lang); if(!lang||lang==='th') return h; try{ return await this._trFree(h, lang); }catch(e){ return h; } }
  _trDocSync(html, lang){`;
const E = [
  ['แยกตัวแปลแบบฟอร์ม', "  _trDoc(html, lang){", () => NEW],
  ['สองภาษา: ทำเครื่องหมายข้อความที่แปลแล้ว (สั้น)', "if(th.length+en.length<=60){ n.nodeValue=th+' / '+en; return; }", () => "if(th.length+en.length<=60){ const w0=doc.createElement('span'); w0.setAttribute('data-tr','1'); w0.textContent=th+' / '+en; n.parentNode.replaceChild(w0,n); return; }"],
  ['สองภาษา: ทำเครื่องหมายข้อความที่แปลแล้ว (ยาว)', "sp.textContent=en;\n          n.parentNode.insertBefore(sp, n.nextSibling); return; }", () => "sp.textContent=en;\n          const w1=doc.createElement('span'); w1.setAttribute('data-tr','1'); n.parentNode.replaceChild(w1,n); w1.appendChild(n); w1.appendChild(sp); return; }"],
  ['หนังสือแจ้งล่าช้า: แปลแล้วค่อยเขียน', "w.document.write(this._trDoc('<!doctype html>", () => "if(lang!=='th'){ try{ w.document.write('<p style=\"font-family:sans-serif;padding:24px\">กำลังแปลเป็นภาษาอังกฤษ… / Translating…</p>'); }catch(e){} }\n    Promise.resolve(this._trDoc('<!doctype html>"],
  ['หนังสือแจ้งล่าช้า: เขียนเมื่อแปลเสร็จ', "<\\/script></body></html>', lang));\n    w.document.close(); this._stKeySet('delays', id,", () => "<\\/script></body></html>', lang)).then(h=>{ try{ w.document.open(); w.document.write(h); w.document.close(); }catch(e){} });\n    this._stKeySet('delays', id,"],
  ['รายงาน Defect: แปลก่อนพิมพ์', "html=this._trDoc(html, lang);", () => "if(lang&&lang!=='th'){ this.showToast('กำลังแปลเป็นภาษาอังกฤษ…'); this._trDoc(html, lang).then(h=>this._printViaFrame(h, title, 'th')).catch(()=>this._printViaFrame(html, title, 'th')); return; }"],
];
for (const [name, a, f] of E) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => f(a)); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ พิมพ์ English / สองภาษา: แปลข้อความที่ผู้ใช้พิมพ์เองด้วย');
