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
const file = path.resolve(__dirname, '..', 'layboard', 'index.html');
let s = fs.readFileSync(file, 'utf8');
const MARK = 'v1.421.0 layboard-photo';
if (s.includes(MARK)) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (Layboard แต่งรูป)'); process.exit(0); }
const R = [
  ['ปุ่มในแผงรูป', '<button class="btn btn-secondary" onClick="{{ setAsBg }}">ตั้งเป็นพื้นหลัง</button>\n                </div>',
   '<button class="btn btn-secondary" onClick="{{ setAsBg }}">ตั้งเป็นพื้นหลัง</button>\n                  <button class="btn btn-primary" onClick="{{ editPhoto }}" style="grid-column:1/-1;" title="ครอป · หมุน · ดัดเส้นตรง · เอฟเฟกต์ แล้วแทนที่รูปนี้">✦ แต่งรูป (Photo Editor)</button>\n                </div>'],
  ['ผูกปุ่ม', 'resetImage: () => this.resetImage(), setAsBg: () => this.setAsBg(),', 'resetImage: () => this.resetImage(), setAsBg: () => this.setAsBg(), editPhoto: () => this.editPhoto(sel.id),'],
  ['เมนูคลิกขวา', "I('Replace image', null, { children: [I('Upload from computer…', () => this.pickPicture(el.id)),",
   "I('แต่งรูป (Photo Editor)…', () => this.editPhoto(el.id), { disabled: L }),\n      I('Replace image', null, { children: [I('Upload from computer…', () => this.pickPicture(el.id)),"],
  ['ฟังก์ชันแต่งรูป', '  fillWith(id, a) {',
   `  async editPhoto(id = this.state.sel) {   // ${MARK}: Wellcon PM Photo Editor → แทนที่รูปเดิม
    const el = this.findEl(id); if (!el || el.type !== 'image' || !el.src) return;
    if (this.readOnly()) return this.showToast('You have view-only access');
    if (el.locked) return this.showToast('รูปนี้ล็อกอยู่ — ปลดล็อกก่อนแต่งรูป');
    if (el.planRef || el.model || el.vec || el.plot) return this.showToast('รูปที่ลิงก์กับแบบ / โมเดล 3D แต่งด้วย Photo Editor ไม่ได้');
    if (!window.LB_PM || !window.LB_PM.photoEdit) return this.showToast('Photo Editor ใช้ได้เมื่อเปิด Layboard จาก Wellcon PM');
    let out = null; try { out = await window.LB_PM.photoEdit(el.src, { name: el.name || el.mname || '' }); } catch (e) { console.error(e); return this.showToast('เปิด Photo Editor ไม่ได้'); }
    if (!out) return;
    let a; try { a = await LB.processImage(out); } catch (e) { console.error(e); return this.showToast('อ่านรูปที่แต่งแล้วไม่ได้'); }
    if (!this.findEl(id)) return this.showToast('รูปนี้ถูกลบไปแล้ว — ไม่ได้แทนที่');
    const e0 = this.findEl(id), geo = {};   // สัดส่วนรูปเปลี่ยน (หมุน / ครอป) → ปรับกรอบให้เห็นทั้งรูป ภายในกรอบเดิม · ตรงกลางเดิม
    if (e0 && e0.iw && e0.ih && Math.abs(a.iw / a.ih - e0.iw / e0.ih) > 0.02 && !e0.rot) { const k = Math.min(e0.w / a.iw, e0.h / a.ih), w = Math.round(a.iw * k), h = Math.round(a.ih * k); Object.assign(geo, { x: Math.round(e0.x + (e0.w - w) / 2), y: Math.round(e0.y + (e0.h - h) / 2), w, h }); }
    this.patchEl({ src: a.src, iw: a.iw, ih: a.ih, alpha: a.alpha, cz: 1, cx: 0.5, cy: 0.5, ...geo }, id);
    this.setState({ sel: id, crop: null }); this.showToast('แทนที่ด้วยรูปที่แต่งแล้ว (Undo เพื่อย้อน)');
  }
  fillWith(id, a) {`],
];
for (const [name, a] of R) { const c = s.split(a).length - 1; if (c !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + c + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); } }
for (const [, a, b] of R) s = s.split(a).join(b);
fs.writeFileSync(file, s);
console.log('✓ Layboard แต่งรูป: แก้ ' + R.length + ' จุด');
