#!/usr/bin/env node
/* =====================================================================
   v1.459.0 demo-center — Demo Center · ศูนย์สอนใช้งาน (ผู้บริหารสั่ง 21/11/2026 "please proceed" ชั้นที่ 2)
     node scripts/patch-demo-center.js        (รันหลัง patch-guide.js · patch-demo-tab.js)
   - โหลด wchub.js (WCHub) หลัง wcguide.js
   - สะพาน window.__whBridge → _hubBridge(): ผู้ใช้ · ตำแหน่ง · เส้นทางตามตำแหน่ง (WORK_DEF ชุดเดียวกับการ์ด My Space)
     · รายชื่อทีม · ฐานข้อมูล (บันทึกความคืบหน้า app_state 'demoProg:<อีเมล>') · โหมดฝึก (staging) · เปิด Notes / Project Setup
   - ที่วางแถบ Demo Center: My Space (ใต้หัวหน้าทำงาน) · Training (เหนือหัวหลักสูตร) — <div data-wh-host>
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'index.html');
const BS = String.fromCharCode(92);
const HUB_VER = '1.1.0';
const raw = fs.readFileSync(file, 'utf8');
const nl = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(nl);
const idx = lines.findIndex((l, i) => i > 0 && lines[i - 1].includes('<script type="__bundler/template">'));
if (idx < 0) { console.error('✗ ไม่พบส่วน template ใน index.html'); process.exit(2); }
const enc = (t) => JSON.stringify(t).split('</').join('<' + BS + 'u002F');
let t = JSON.parse(lines[idx]);
if (enc(t) !== lines[idx]) { console.error('✗ ถอด/ประกอบ template แล้วไม่ตรงเดิม — ไม่แก้'); process.exit(2); }
const MARK = 'v1.459.0 demo-center';
const verFix = () => { const re = /wchub\.js\?v=[0-9.]+/; const m = t.match(re); if (m && m[0] !== 'wchub.js?v=' + HUB_VER) { t = t.replace(re, 'wchub.js?v=' + HUB_VER); return true; } return false; };
if (t.includes(MARK)) { if (verFix()) { lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl)); console.log('✓ อัปเดตเวอร์ชัน wchub.js → ' + HUB_VER); } else console.log('✓ มีแล้ว — ไม่ต้องแก้ (demo-center)'); process.exit(0); }
if (!t.includes('v1.457.0 demo-tab')) { console.error('✗ ต้องรัน scripts/patch-demo-tab.js ก่อน'); process.exit(1); }
const one = (name, a, b) => { const n = t.split(a).length - 1; if (n !== 1) { console.error('✗ ' + name + ': เจอ ' + n + ' ที่ (ต้องเจอ 1)'); process.exit(1); } t = t.replace(a, () => b); };
// 1) โหลด wchub.js
const GS = t.match(/<script src="\/wcguide\.js\?v=[0-9.]+"><\/script><!-- v1\.456\.0 guide -->/);
if (!GS) { console.error('✗ หาแท็ก wcguide.js ไม่เจอ'); process.exit(1); }
t = t.replace(GS[0], () => GS[0] + '\n<script src="/wchub.js?v=' + HUB_VER + '"></script><!-- ' + MARK + ' -->');
// 2) สะพาน
const BR0 = "_wnBr:((typeof window!=='undefined'&&!window.__wnBridge)?((window.__wnBridge=()=>this._noteBridge()),1):0),   /* v1.449.0 note-inline */";
one('สะพาน', BR0, BR0 + " _whBr:((typeof window!=='undefined'&&!window.__whBridge)?((window.__whBridge=()=>this._hubBridge()),1):0),   /* " + MARK + " */");
const M0 = '  _noteBridge(){';
one('เมธอด', M0, `  _hubBridge(){ const self=this; const MGR=['superadmin','director','pm_mgr','design_mgr','qs_mgr','fin_mgr','hr_mgr'];   /* ${MARK}: Demo Center (wchub.js) */
    return {
      me:()=>{ const m=self.state.me||{}; return { email:String(m.email||'').toLowerCase(), name:(self.nickOf&&self.nickOf(m))||m.name||'', roleKey:m.roleKey||'', admin:m.roleKey==='superadmin', mgr:MGR.includes(m.roleKey) }; },
      roles:()=>{ const R=self.ROLE_DEFS()||{}; return Object.keys(R).map(k=>({ key:k, label:(R[k]||{}).label||k })); },
      path:(rk)=>{ try{ return self.WORK_DEF(rk)||[]; }catch(e){ return []; } },
      pid:()=>self._wkPid||self.state.projectId||(((self._lastVisProj||self.state.projects||[])[0])||{}).id||'',
      people:()=>{ let A=[]; try{ A=self.ACCOUNTS()||[]; }catch(e){} return A.filter(a=>a&&a.email&&!a.disabled).map(a=>({ email:String(a.email).toLowerCase(), name:(self.nickOf&&self.nickOf(a))||a.name||a.email, roleKey:a.roleKey||'' })); },
      sb:()=>(self._sb&&self._authed)?self._sb:null,
      staging:()=>!!self.state.isStaging,
      openNote:()=>{ try{ window.WCNote.open(self._noteBridge(), {}); }catch(e){} },
      openSetup:(pid)=>{ try{ window.WCSetup.open(self._setupBridge(), pid||self._wkPid||self.state.projectId); }catch(e){} }
    }; }
` + M0);
// 3) ที่วางแถบ — My Space (ใต้หัวหน้าทำงาน) · Training (เหนือหัวหลักสูตร)
const S0 = '<div class="wc-wk-sub" style="font-size:13px;color:#B6AE9B;margin-top:8px;line-height:1.6;text-wrap:pretty">{{ workSub }}</div>';
one('My Space', S0, S0 + '\n          <div data-wh-host="space" style="margin-top:14px"><!-- ' + MARK + ' --></div>');
const T0 = '<div style="background:#1C1B18;border-radius:20px;padding:clamp(20px,3vw,30px);display:flex;flex-wrap:wrap;gap:22px 34px;align-items:flex-end">';
one('Training', T0, '<div data-wh-host="training"><!-- ' + MARK + ' --></div>\n        ' + T0);
lines[idx] = enc(t); fs.writeFileSync(file, lines.join(nl));
console.log('✓ demo-center: wchub.js?v=' + HUB_VER + ' · สะพาน · แถบ My Space / Training');
