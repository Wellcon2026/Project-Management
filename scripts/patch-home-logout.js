#!/usr/bin/env node
/* =====================================================================
   ปุ่ม 🏠 หน้าแรกของฉัน + ปุ่มออกจากระบบ ที่แถบด้านบน "ทุกหน้า" ของ Wellcon PM
     node scripts/patch-home-logout.js      (รันหลัง patch-role-home.js)
   - 🏠 → หน้าแรกตามบทบาทเสมอ (หน้างานของฉัน / งานออกแบบของฉัน / หน้าทำงานของฉัน) · ตำแหน่งที่ไม่มี → Home
   - ออกจากระบบ → ถามยืนยันก่อน (กันแตะพลาด)
   - มือถือ: ปุ่มแชร์ลิงก์ย้ายไปอยู่ในเมนู ⋮ (ให้มีที่วางปุ่ม 🏠) · จอคอม: ปุ่มแชร์ลิงก์เหมือนเดิม
   - หน้าแยก (claim.html / quick-measure.html) ใช้ pm-nav.js แทน
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
const DONE1 = t.includes('_hb(S){');

const HOUSE = '<svg width="18" height="18" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"></path></svg>';
const OUT = '<svg width="17" height="17" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"></path></svg>';
const SHARE_MOB = '<button sc-camel-on-click="{{ onShareLink }}" title="คัดลอกลิงก์หน้านี้ ส่งให้ทีมเปิดตรงหน้าเดียวกัน" style="flex:none;display:flex;align-items:center;gap:6px;border:1px solid #E4DED2;background:#fff;color:#6E5424;border-radius:10px;padding:0;width:36px;height:36px;justify-content:center;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap" style-hover="border-color:#C9A961;background:#FBF6EA"><svg width="16" height="16" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"></path></svg></button>\n      </sc-if>\n      <sc-if value="{{ isDesktop }}" hint-placeholder-val="{{ true }}">';
const HOME_MOB = '<button sc-camel-on-click="{{ hb.onHome }}" title="หน้าแรกของฉัน" aria-label="หน้าแรกของฉัน" style="flex:none;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:11px;border:1px solid #C9A961;background:{{ hb.bg }};color:{{ hb.fg }};padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent">' + HOUSE + '</button>\n      </sc-if>\n      <sc-if value="{{ isDesktop }}" hint-placeholder-val="{{ true }}">\n        <button sc-camel-on-click="{{ hb.onHome }}" title="หน้าแรกของฉัน" aria-label="หน้าแรกของฉัน" style="flex:none;display:flex;align-items:center;gap:6px;height:36px;border-radius:10px;border:1px solid #C9A961;background:{{ hb.bg }};color:{{ hb.fg }};padding:0 12px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">' + HOUSE + '<span>หน้าแรก</span></button>';
const LOGOUT = '<!-- v1.364.7 ปุ่มออกจากระบบ ทุกหน้า -->\n      <button sc-camel-on-click="{{ hb.onLogout }}" title="ออกจากระบบ" aria-label="ออกจากระบบ" style="flex:none;display:flex;align-items:center;gap:6px;height:36px;min-width:36px;justify-content:center;border-radius:11px;border:1px solid #E8A898;background:#fff;color:#C4442E;padding:0 9px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap" style-hover="background:#FDF0EC">' + OUT + '<sc-if value="{{ isDesktop }}" hint-placeholder-val="{{ true }}"><span>ออกจากระบบ</span></sc-if></button>\n\n      <!-- เมนูเพิ่มเติม -->';
const SHARE_MENU = '<button sc-camel-on-click="{{ onShareLink }}" style="width:100%;height:36px;border:1px solid #E4DED2;background:#FCFAF5;border-radius:9px;cursor:pointer;display:flex;align-items:center;gap:8px;padding:0 11px;margin-bottom:5px;font-family:inherit;font-size:12.5px;font-weight:600;color:#6E5424"><svg width="15" height="15" sc-camel-view-box="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"></path></svg>แชร์ลิงก์หน้านี้</button>\n              ';
const E = [
  ['มือถือ: แชร์ลิงก์ → ปุ่มหน้าแรก (+ จอคอม: ปุ่มหน้าแรก)', SHARE_MOB, () => HOME_MOB],
  ['ปุ่มออกจากระบบ', '\n      <!-- เมนูเพิ่มเติม -->', () => '\n      ' + LOGOUT],
  ['เมนู ⋮ บนมือถือ: แชร์ลิงก์', '<div style="display:flex;gap:5px;margin-bottom:5px">\n                <button sc-camel-on-click="{{ onHistBack }}"', (a) => SHARE_MENU + a],
  ['จอคอม: ซ่อนปุ่มทองเดิม (ซ้ำกับปุ่มหน้าแรก)', '<sc-if value="{{ wsGoShow }}" hint-placeholder-val="{{ true }}"><button sc-camel-on-click="{{ onWsGo }}"', () => '<sc-if value="{{ hb.wsGo }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ onWsGo }}"'],
  ['ค่าที่ส่งให้หน้าจอ', 'isProjPicker, ppHead, ppCards,', (a) => 'isProjPicker, ppHead, ppCards, hb:this._hb(S),'],
  ['ตัวช่วย _hb', '  _claimOpen(pid){', (a) => `  // v1.364.7 ปุ่มหน้าแรก + ออกจากระบบ ทุกหน้า
  _homeTarget(me){ return this.WORK_KIND(me||{})?'work':'dashboard'; }
  _hb(S){ const tgt=this._homeTarget(S.me), on=S.screen===tgt;
    return { wsGo:false, bg:on?'#C9A961':'#1C1B18', fg:on?'#1C1B18':'#E2BC66',
      onHome:()=>{ const s=this.state; const k=this._homeTarget(s.me); if(s.screen&&s.screen!==k){ this._hist=(this._hist||[]).concat([s.screen]).slice(-30); this._fwd=[]; }
        this.setState({ screen:k, pickedProj:null, searchOpen:false, notifOpen:false, topMenu:false, moreOpen:false }); try{ window.scrollTo(0,0); }catch(e){} },
      onLogout:()=>{ if(typeof window!=='undefined'&&!window.confirm('ออกจากระบบ Wellcon PM?')) return; this.doLogout(); } }; }
` + a],
];
// ---- ชุดที่ 2: มือถือให้แถบด้านบนพอดีจอ — ย้าย ✦ AI + ☆ ปักหมุด เข้าเมนู ⋮ · ลดระยะห่างปุ่ม ----
const AI_MENU = '<sc-if value="{{ aiTopShow }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ onAiDock }}" style="width:100%;height:36px;border:1px solid #E0C99A;background:#FBF3E4;border-radius:9px;cursor:pointer;display:flex;align-items:center;gap:8px;padding:0 11px;margin-bottom:5px;font-family:inherit;font-size:12.5px;font-weight:700;color:#8A5E14"><svg width="15" height="15" sc-camel-view-box="0 0 24 24" fill="#B4832F" stroke="none"><path d="M12 2.6l1.9 5.1 5.1 1.9-5.1 1.9L12 16.6l-1.9-5.1L5 9.6l5.1-1.9z"></path></svg>ถามที่ปรึกษา AI</button></sc-if>\n              '
  + '<sc-if value="{{ pinViewShow }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ onPdPin }}" style="width:100%;height:36px;border:1px solid #E4DED2;background:#FCFAF5;border-radius:9px;cursor:pointer;display:flex;align-items:center;gap:8px;padding:0 11px;margin-bottom:5px;font-family:inherit;font-size:12.5px;font-weight:700;color:#6E5424">☆ ปักหมุดหน้านี้เป็นทางลัด</button></sc-if>\n              ';
const E2 = [
  ['มือถือ: ✦ AI ไปอยู่ในเมนู ⋮', '<sc-if value="{{ aiTopShow }}" hint-placeholder-val="{{ true }}">\n        <button sc-camel-on-click="{{ onAiDock }}"', (a) => a.replace('hint-placeholder-val="{{ true }}">', 'hint-placeholder-val="{{ true }}"><sc-if value="{{ isDesktop }}" hint-placeholder-val="{{ true }}"><!-- v1.364.7 mobile-bar -->')],
  ['มือถือ: ✦ AI ปิดแท็ก', '<span style="font-size:13px;font-weight:700;color:#8A5E14;white-space:nowrap">ถามที่ปรึกษา AI</span>\n          </sc-if>\n        </button>\n      </sc-if>', (a) => a + '</sc-if>'],
  ['มือถือ: ☆ ปักหมุด ไปอยู่ในเมนู ⋮', '<sc-if value="{{ pinViewShow }}" hint-placeholder-val="{{ false }}">\n        <button sc-camel-on-click="{{ onPdPin }}"', (a) => a.replace('hint-placeholder-val="{{ false }}">', 'hint-placeholder-val="{{ false }}"><sc-if value="{{ isDesktop }}" hint-placeholder-val="{{ true }}">')],
  ['มือถือ: ☆ ปักหมุด ปิดแท็ก', '<span>ปักหมุด</span></sc-if></button>\n      </sc-if>', (a) => a + '</sc-if>'],
  ['เมนู ⋮ บนมือถือ: AI + ปักหมุด', '<button sc-camel-on-click="{{ onShareLink }}" style="width:100%;height:36px;border:1px solid #E4DED2;background:#FCFAF5;border-radius:9px;', (a) => AI_MENU + a],
  ['มือถือ: ระยะห่างปุ่มแถบด้านบน', "topPad: isDesktop?'20px 34px':'12px 12px 11px',\n      topGap: isDesktop?'14px':'7px',", () => "topPad: isDesktop?'20px 34px':'10px 8px 9px',\n      topGap: isDesktop?'14px':'5px',"],
];
const DONE2 = t.includes('<!-- v1.364.7 mobile-bar -->');
if (DONE1 && DONE2) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ปุ่มหน้าแรก + ออกจากระบบ)'); process.exit(0); }
const RUN = [...(DONE1 ? [] : E), ...(DONE2 ? [] : E2)];
for (const [name, a, f] of RUN) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => f(a)); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ ปุ่ม 🏠 หน้าแรกของฉัน + ออกจากระบบ ทุกหน้า');
