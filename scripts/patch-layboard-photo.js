#!/usr/bin/env node
/* =====================================================================
   v1.421.0 layboard-photo — Layboard: ปุ่ม "แต่งรูป (Photo Editor)" กับรูปบนบอร์ด
     node scripts/patch-layboard-photo.js      (scripts/sync-layboard.js เรียกให้อัตโนมัติหลังคัดลอก Layboard ใหม่)
   - แผงด้านขวาของรูปที่เลือก + เมนูคลิกขวา → editPhoto(id)
   - editPhoto: เรียก window.LB_PM.photoEdit(src) (layboard/pm-gate.js) → เปิด /photo.html?embed=1 ทับบอร์ด
     → ผู้ใช้กด "ใช้รูปนี้ในบอร์ด" → ได้ JPEG กลับ → LB.processImage → patchEl (แทนที่รูปเดิม · Undo ได้ · รูปเก่าในคลังไม่ถูกลบ)
   - รูปที่ลิงก์กับแบบ (Live drawing) / โมเดล 3D / เวกเตอร์ → ไม่ให้แต่ง (จะตัดการลิงก์)
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
   ===================================================================== */
const fs = require('fs');
const path = require('path');
// ไฟล์เป้าหมาย: layboard/index.html (PM) หรือระบุเอง เช่น /path/to/layboard/Layboard.dc.html (แอป Layboard แยก)
const file = (require.main === module && process.argv[2]) ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..', 'layboard', 'index.html');
let s = fs.readFileSync(file, 'utf8');
const MARK = 'v1.421.0 layboard-photo';
if (s.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (Layboard แต่งรูป)'); process.exit(0); }   // ต้นฉบับ Layboard แยกมีโค้ดนี้แล้ว (v1.26.0) → คัดลอกมาก็มีอยู่แล้ว
const R = [
  ['ปุ่มในแผงรูป', /(<button class="btn btn-secondary" onClick="\{\{ setAsBg \}\}">[^<]*<\/button>\n)(\s*)<\/div>/,   // ป้ายปุ่มเดิมเป็นไทย (PM) หรืออังกฤษ (Layboard แยก)
   (m, a, sp) => a + sp + '  <button class="btn btn-primary" onClick="{{ editPhoto }}" style="grid-column:1/-1;" title="แสง · สี · ครอป · หมุน · ดัดเส้นตรง · เอฟเฟกต์ แล้วแทนที่รูปนี้">✦ แต่งรูป (Photo Editor)</button>\n' + sp + '</div>'],
  ['ผูกปุ่ม', 'resetImage: () => this.resetImage(), setAsBg: () => this.setAsBg(),', 'resetImage: () => this.resetImage(), setAsBg: () => this.setAsBg(), editPhoto: () => this.editPhoto(sel.id),'],
  ['เมนูคลิกขวา', "I('Replace image', null, { children: [I('Upload from computer…', () => this.pickPicture(el.id)),",
   "I('แต่งรูป (Photo Editor)…', () => this.editPhoto(el.id), { disabled: L }),\n      I('Replace image', null, { children: [I('Upload from computer…', () => this.pickPicture(el.id)),"],
  ['ฟังก์ชันแต่งรูป', '  fillWith(id, a) {',
   `  async editPhoto(id = this.state.sel) {   // ${MARK}: Wellcon PM Photo Editor → แทนที่รูปเดิม
    const el = this.findEl(id); if (!el || el.type !== 'image' || !el.src) return;
    if (this.readOnly()) return this.showToast('You have view-only access');
    if (el.locked) return this.showToast('รูปนี้ล็อกอยู่ — ปลดล็อกก่อนแต่งรูป');
    if (el.planRef || el.model || el.vec || el.plot) return this.showToast('รูปที่ลิงก์กับแบบ / โมเดล 3D แต่งด้วย Photo Editor ไม่ได้');
    const pe = (window.LB_PM && window.LB_PM.photoEdit) || ((src, o) => this.photoEditSolo(src, o));   // Wellcon PM → /photo.html · Layboard แยก → photo-editor.html
    let out = null; try { out = await pe(el.src, { name: el.name || el.mname || '' }); } catch (e) { console.error(e); return this.showToast('เปิด Photo Editor ไม่ได้'); }
    if (!out) return;
    let a; try { a = await LB.processImage(out); } catch (e) { console.error(e); return this.showToast('อ่านรูปที่แต่งแล้วไม่ได้'); }
    if (!this.findEl(id)) return this.showToast('รูปนี้ถูกลบไปแล้ว — ไม่ได้แทนที่');
    const e0 = this.findEl(id), geo = {};   // สัดส่วนรูปเปลี่ยน (หมุน / ครอป) → ปรับกรอบให้เห็นทั้งรูป ภายในกรอบเดิม · ตรงกลางเดิม
    if (e0 && e0.iw && e0.ih && Math.abs(a.iw / a.ih - e0.iw / e0.ih) > 0.02 && !e0.rot) { const k = Math.min(e0.w / a.iw, e0.h / a.ih), w = Math.round(a.iw * k), h = Math.round(a.ih * k); Object.assign(geo, { x: Math.round(e0.x + (e0.w - w) / 2), y: Math.round(e0.y + (e0.h - h) / 2), w, h }); }
    this.patchEl({ src: a.src, iw: a.iw, ih: a.ih, alpha: a.alpha, cz: 1, cx: 0.5, cy: 0.5, ...geo }, id);
    this.setState({ sel: id, crop: null }); this.showToast('แทนที่ด้วยรูปที่แต่งแล้ว (Undo เพื่อย้อน)');
  }
  photoEditSolo(src, opt) {   // แอป Layboard แยก: เปิด photo-editor.html?embed=1 ทับบอร์ด → ได้ Blob JPEG กลับ (null = ยกเลิก) · ข้อความภายในโดเมนเดียวกันเท่านั้น
    return new Promise((done) => { let blob = null, fin = false; const wrap = document.createElement('div'), fr = document.createElement('iframe');
      wrap.setAttribute('style', 'position:fixed;inset:0;z-index:2147483003;background:#1C1B18'); fr.title = 'Photo Editor'; fr.src = 'photo-editor.html?embed=1'; fr.setAttribute('style', 'border:0;width:100%;height:100%;display:block');
      wrap.appendChild(fr); document.body.appendChild(wrap);
      const finish = (b) => { if (fin) return; fin = true; window.removeEventListener('message', onMsg); wrap.remove(); done(b || null); };
      const onMsg = async (e) => { if (e.origin !== location.origin || e.source !== fr.contentWindow) return; const m = e.data || {};
        if (m.t === 'pe-ready') { try { if (!blob) blob = await (await fetch(src)).blob(); fr.contentWindow.postMessage({ t: 'pe-open', blob, name: (opt && opt.name) || 'รูปจาก Layboard' }, location.origin); } catch (x) { console.error(x); this.showToast('โหลดรูปนี้ไม่ได้ — ตรวจอินเทอร์เน็ตแล้วลองใหม่'); finish(null); } }
        else if (m.t === 'pe-done') finish(m.blob); else if (m.t === 'pe-cancel') finish(null); };
      window.addEventListener('message', onMsg); });
  }
  fillWith(id, a) {`],
];
const cnt = (a) => typeof a === 'string' ? s.split(a).length - 1 : (s.match(new RegExp(a.source, 'g')) || []).length;
for (const [name, a] of R) { const c = cnt(a); if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) s = typeof a === 'string' ? s.split(a).join(b) : s.replace(a, b);
fs.writeFileSync(file, s);
console.log('✓ Layboard แต่งรูป: แก้ ' + R.length + ' จุด');
