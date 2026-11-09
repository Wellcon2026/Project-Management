#!/usr/bin/env node
/* =====================================================================
   คะแนน Level Gate (การมีส่วนร่วม) — เห็นได้เฉพาะ Super Admin · Project Director · HR (ฝ่ายบุคคล / HR Manager)
     node scripts/patch-level-private.js
   - ตำแหน่งอื่น: ไม่เห็นเมนู "การมีส่วนร่วม · Level Gate" · ไม่เห็นการ์ดแต้มในภาพรวมโครงการ
     · ไม่เห็นปุ่มคะแนนข้างช่องผู้รับผิดชอบ · ไม่มี toast "+แต้ม" / ป๊อปอัปเลื่อนระดับ · เปิดลิงก์ตรงก็เด้งกลับภาพรวม
   - ระบบยังเก็บแต้มทุกคนตามเดิม (ใช้ประเมินผลภายหลัง) — แค่ซ่อนการแสดงผล
   - หน้าจัดการผู้ใช้: สวิตช์ Level Gate ของตำแหน่งอื่นถูกล็อกเป็น "ปิด"
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์ · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
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
if (t.includes('_engViewOk(a){')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (Level Gate เฉพาะ HR / Admin / Director)'); process.exit(0); }

const E = [
  ['สิทธิ์ดูคะแนน _engViewOk', '  featDefault(key, a){', (a) => `  // v1.364.9 level-private: คะแนน Level Gate ดูได้เฉพาะ Super Admin · Director · HR — ตำแหน่งอื่นยังเก็บแต้มแต่ไม่เห็น
  _engViewOk(a){ a=a||this.state.me||{}; let pr=''; try{ const p=this.posOf(a); pr=(p&&p.role)||''; }catch(e){}
    const OK=['superadmin','director','hr','hr_mgr']; return OK.indexOf(a.roleKey)>=0 || OK.indexOf(pr)>=0; }
` + a],
  ['featOn level ตามตำแหน่ง', `    const a=acc||this.state.me; if(!a) return false;
    const off=a.featOff||{};`, (a) => a.replace('if(!a) return false;', "if(!a) return false;\n    if(key==='level' && !this._engViewOk(a)) return false;   // v1.364.9 level-private")],
  ['ล็อกสวิตช์ในหน้าจัดการผู้ใช้', "const locked=f.key==='ai'&&a.roleKey==='superadmin';", () => "const locked=(f.key==='ai'&&a.roleKey==='superadmin')||(f.key==='level'&&!this._engViewOk(a));"],
  ['หน้า Level Gate เด้งกลับ', "if(S.pdTab!=='eng' || S.screen!=='projectDetail' || !proj) return { pdTabEng:false };", (a) => a + `
    if(!this.featOn('level')){ if(!this._engBounce){ this._engBounce=true; setTimeout(()=>{ this._engBounce=false; if(this.state.pdTab==='eng') this.setState({ pdTab:'overview' }); },0); } return { pdTabEng:false }; }`],
  ['การ์ดแต้มในภาพรวม', "if(!activeProj||(S.pdTab||'overview')!=='overview') return { engMiniShow:false };", () => "if(!activeProj||(S.pdTab||'overview')!=='overview'||!this.featOn('level')) return { engMiniShow:false };"],
  ['เงียบ toast แต้ม', '    if(after.level.key!==before.level.key) this.setState({ engUp:', (a) => "    if(!this.featOn('level')) return;   // v1.364.9 level-private: เก็บแต้มเงียบ ๆ\n" + a],
  ['ธงปุ่มคะแนนผู้รับผิดชอบ', "      respHas:!!a, respName:a?(this.nickOf(a)||a.name):'',", (a) => a + "\n      respScoreShow:this.featOn('level'),"],
];
for (const [name, a, f] of E) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => f(a)); console.log('  ✓ ' + name);
}
// ปุ่มคะแนนข้างช่องผู้รับผิดชอบ (ทุกตาราง) → แสดงเฉพาะผู้มีสิทธิ์
const re = /<button sc-camel-on-click="\{\{ (\w+)\.onRespScore \}\}"[\s\S]*?<\/button>/g;
const nb = (t.match(re) || []).length;
if (nb < 1) { console.error('✗ ไม่พบปุ่มคะแนนผู้รับผิดชอบ — ไม่แก้ไฟล์'); process.exit(1); }
t = t.replace(re, (m, v) => `<sc-if value="{{ ${v}.respScoreShow }}" hint-placeholder-val="{{ true }}">${m}</sc-if>`);
console.log('  ✓ ซ่อนปุ่มคะแนน ' + nb + ' จุด');
const nh = t.split('ผู้รับผิดชอบ · คะแนน').length - 1;
t = t.split('ผู้รับผิดชอบ · คะแนน').join('ผู้รับผิดชอบ');
console.log('  ✓ หัวคอลัมน์ "ผู้รับผิดชอบ" ' + nh + ' จุด');
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ Level Gate: เห็นคะแนนเฉพาะ Super Admin · Director · HR');
