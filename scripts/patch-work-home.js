#!/usr/bin/env node
/* =====================================================================
   "หน้าแรกของฉันตามตำแหน่ง" = หน้า work (หน้างานของฉัน / งานออกแบบของฉัน / หน้าทำงานของฉัน)
     node scripts/patch-work-home.js
   สำหรับผู้ใช้ที่ตำแหน่งมีหน้า work (WORK_KIND):
     1) เมนูข้าง กลุ่ม "เมนูหลัก": หน้า work ขึ้นเป็นอันดับแรก (ก่อน พื้นที่ทำงานของฉัน) — แท็บมือถือเรียงตามนี้ด้วย
     2) ปุ่มทองด้านบน (เดิม "My Workspace") → พากลับหน้า work · ป้ายเปลี่ยนเป็นชื่อหน้า เช่น "หน้างานของฉัน"
     3) แตะโลโก้ Wellcon มุมซ้ายบน → กลับหน้า work (เดิมไป Home)
   ล็อกอินตามบทบาท (v1.364.5): ตำแหน่งที่มีหน้า work → ลงหน้า work (ปิดได้รายคน) · ตำแหน่งอื่น → ลงหน้า Home เลือกโครงการ
     (อยากลง พื้นที่ทำงานของฉัน → กด "เปิดหน้านี้ทุกครั้งที่ล็อกอิน" ที่หน้านั้น · จำรายคน)
   ตำแหน่งที่ไม่มีหน้า work: เหมือนเดิมทุกอย่าง (ปุ่มด้านบน = My Workspace · โลโก้ = Home)
   - รันซ้ำได้ ไม่ซ้อน · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
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

const R = [
  ['หน้าแรกตามตำแหน่ง (_homeScreen)',
   '  _workLandKey(me){',
   "  _homeScreen(me){ return this.WORK_KIND(me)?'work':'inbox'; }   // v1.363.3 work-home: หน้าแรกของฉันตามตำแหน่ง\n  _workLandKey(me){"],
  ['เมนูข้าง: หน้า work ขึ้นก่อน',
   'const homeItems=_ordSort([inboxItem, ...(workItem?[workItem]:[])]);',
   "const homeItems=((a)=>{ const w=a.findIndex(x=>x.key==='work'); if(w>0) a.unshift(a.splice(w,1)[0]); return a; })(_ordSort([inboxItem, ...(workItem?[workItem]:[])]));   // v1.363.3 work-home"],
  ['ปุ่มด้านบน → หน้าแรกของฉัน',
   "    out.wsGoShow=!!S.loggedIn&&!inWs;\n    out.onWsGo=()=>this.setState({ screen:'inbox', searchOpen:false, notifOpen:false, topMenu:false, moreOpen:false });",
   "    const _hm=this._homeScreen(S.me||{}), _wn=this.WORK_NAV(S.me||{});   // v1.363.3 work-home\n    out.wsGoShow=!!S.loggedIn&&S.screen!==_hm; out.wsGoLabel=(_hm==='work'&&_wn)?_wn.label:'My Workspace'; out.wsGoTitle=(_hm==='work'&&_wn)?('กลับหน้าแรกของฉัน · '+_wn.label):'กลับ พื้นที่ทำงานของฉัน';\n    out.onWsGo=()=>this.setState({ screen:_hm, searchOpen:false, notifOpen:false, topMenu:false, moreOpen:false });"],
  ['ปุ่มด้านบน: ป้าย',
   '<button sc-camel-on-click="{{ onWsGo }}" title="กลับ พื้นที่ทำงานของฉัน"',
   '<button sc-camel-on-click="{{ onWsGo }}" title="{{ wsGoTitle }}"'],
  ['ปุ่มด้านบน: ข้อความ',
   '<path d="M4 5h16v14H4zM4 12h5l2 3h2l2-3h5"></path></svg><span>My Workspace</span></button>',
   '<path d="M4 5h16v14H4zM4 12h5l2 3h2l2-3h5"></path></svg><span>{{ wsGoLabel }}</span></button>'],
  ['โลโก้ → หน้าแรกของฉัน',
   "onGoHome:()=>this.setState({ screen:'dashboard', pickedProj:null, searchOpen:false, notifOpen:false, topMenu:false }),",
   "onGoHome:()=>this.setState({ screen:(this.WORK_KIND(this.state.me||{})?'work':'dashboard'), pickedProj:null, searchOpen:false, notifOpen:false, topMenu:false }),   // v1.363.3 work-home"],
  ['โลโก้: คำอธิบาย',
   '<button sc-camel-on-click="{{ onGoHome }}" title="กลับหน้า Home"',
   '<button sc-camel-on-click="{{ onGoHome }}" title="กลับหน้าแรกของฉัน"'],
  ['อัปเกรด v1.364.2 → ทุกคนลง Home', "  _workLandOn(me){ try{ const v=window.localStorage.getItem(this._workLandKey(me)); return this.WORK_KIND(me)?v!=='off':v==='on'; }catch(e){ return !!this.WORK_KIND(me); } }   // v1.364.2 work-home: มีหน้างาน → ลงหน้างาน (ปิดได้) · ไม่มี → ลง Home เลือกโครงการ (เปิด พื้นที่ทำงานของฉัน ได้เอง)",
   "  _workLandOn(me){ try{ const v=window.localStorage.getItem(this._workLandKey(me)); return this.WORK_KIND(me)?v!=='off':v==='on'; }catch(e){ return !!this.WORK_KIND(me); } }   // v1.364.5 work-home: ล็อกอินตามบทบาท — มีหน้างาน → ลงหน้างาน (ปิดได้) · ไม่มี → ลง Home เลือกโครงการ (เปิด พื้นที่ทำงานของฉัน ได้เอง)", 'optional'],
  ['อัปเกรด v1.364.3 → ล็อกอินตามบทบาท', "  _workLandOn(me){ try{ return window.localStorage.getItem(this._workLandKey(me))==='on'; }catch(e){ return false; } }   // v1.364.3 work-home: ทุกคนล็อกอินแล้วลงหน้า Home เลือกโครงการ · อยากลงหน้างาน/พื้นที่ทำงาน กดเปิดเองได้รายคน",
   "  _workLandOn(me){ try{ const v=window.localStorage.getItem(this._workLandKey(me)); return this.WORK_KIND(me)?v!=='off':v==='on'; }catch(e){ return !!this.WORK_KIND(me); } }   // v1.364.5 work-home: ล็อกอินตามบทบาท — มีหน้างาน → ลงหน้างาน (ปิดได้) · ไม่มี → ลง Home เลือกโครงการ (เปิด พื้นที่ทำงานของฉัน ได้เอง)", 'optional'],
  ['ล้างค่าหน้าแรกเดิมที่เคยตั้ง (คีย์ใหม่)', "return 'wellcon_pm_land_'+String(", "return 'wellcon_pm_land2_'+String("],
  ['ล็อกอินตามบทบาท: มีหน้างาน → หน้างาน · ไม่มี → Home',
   "  _workLandOn(me){ try{ return window.localStorage.getItem(this._workLandKey(me))!=='off'; }catch(e){ return true; } }",
   "  _workLandOn(me){ try{ const v=window.localStorage.getItem(this._workLandKey(me)); return this.WORK_KIND(me)?v!=='off':v==='on'; }catch(e){ return !!this.WORK_KIND(me); } }   // v1.364.5 work-home: ล็อกอินตามบทบาท — มีหน้างาน → ลงหน้างาน (ปิดได้) · ไม่มี → ลง Home เลือกโครงการ (เปิด พื้นที่ทำงานของฉัน ได้เอง)"],
];
let done = 0, had = 0;
for (const [name, a, b, opt] of R) {
  if (t.includes(b)) { had++; continue; }
  const n = t.split(a).length - 1;
  if (opt === 'optional' && n === 0) continue;
  if (n !== 1) { console.error('✗ ' + name + ': หาจุดแก้เจอ ' + n + ' ที่ (ต้องเจอ 1) — ไม่แก้อะไรเลย'); process.exit(1); }
  t = t.replace(a, () => b); done++;
}
if (!done) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (หน้าแรกของฉันตามตำแหน่ง)'); process.exit(0); }
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ หน้าแรกของฉันตามตำแหน่ง: แก้ ' + done + ' จุด' + (had ? ' (มีอยู่แล้ว ' + had + ')' : ''));
