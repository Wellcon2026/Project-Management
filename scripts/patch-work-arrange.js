#!/usr/bin/env node
/* =====================================================================
   หน้าทำงาน (screen 'work') — Super Admin จัดเรียงการ์ดบนหน้าได้โดยตรง + Super Admin ลงหน้าทำงานตอนล็อกอิน
     node scripts/patch-work-arrange.js        (รันหลัง patch-site-issues.js)
   - ปุ่ม "↕ จัดเรียงการ์ด" ข้างชื่อโครงการ → ลากการ์ดวาง (คอม) หรือกด ◀ ▶ บนการ์ด (มือถือ) · บันทึกกลาง workPages[ตำแหน่ง]
     (ข้อมูลชุดเดียวกับ ⚙ จัดปุ่มบนหน้านี้ — มีผลกับทุกคนในตำแหน่งที่กำลังดูอยู่)
   - Super Admin มีหน้าทำงานของตัวเอง (ค่าเริ่มต้น: ภาพรวม · แผนงาน · Delay · Site Issues · การเงิน · VO · Claim · Handover · CFO · QS · HR · ตั้งค่า)
     → ล็อกอินแล้วลงหน้าทำงานเหมือนตำแหน่งอื่น (ปิดรายคนได้ที่ "เปิดหน้านี้ทุกครั้งที่ล็อกอิน")
   - กด "✓ เสร็จ" แล้วกลับหน้าของตัวเอง
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ/เจอหลายจุด → หยุด ไม่เขียนไฟล์ · รันหลังอัปโหลด index.html ใหม่จาก canvas ทุกครั้ง
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
if (t.includes('v1.365.1 work-arrange')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (จัดเรียงการ์ดหน้าทำงาน)'); process.exit(0); }

const TILES = `// v1.365.1 work-arrange: Super Admin ลากการ์ด / กด ◀ ▶ จัดเรียงบนหน้าได้โดยตรง (บันทึก workPages[rk])
    const _ed=isSuper&&!!S.wkEdit; const tiles0=list.map(info).filter(Boolean).filter(t=>!t.needP||p); const _vis=tiles0.map(t=>t.key);
    const _mvK=(k,d)=>{ const vi=_vis.indexOf(k), vj=vi+d; if(vi<0||vj<0||vj>=_vis.length) return; const a=list.slice(); const i=a.indexOf(k), j=a.indexOf(_vis[vj]); if(i<0||j<0) return; a[i]=_vis[vj]; a[j]=k; this._workSave(rk,a); };
    const _dropK=(f,to)=>{ if(!f||f===to||list.indexOf(f)<0) return; const fi=list.indexOf(f), ti=list.indexOf(to); const a=list.filter(x=>x!==f); const j=a.indexOf(to); a.splice(j<0?a.length:(fi<ti?j+1:j),0,f); this._workSave(rk,a); this.showToast('ย้ายการ์ดแล้ว'); };
    const _stop=(e)=>{ try{ if(e){ e.stopPropagation(); e.preventDefault(); } }catch(x){} };
    const tiles=tiles0.map((t,i)=>({ ...t, tint:t.d+'1A', onPress:()=>{ if(_ed) return; t.run(p); },
      edit:_ed, drag:_ed?'true':'false', no:String(i+1), wkBd:_ed?'1.5px dashed #C9A961':'1px solid #ECE6DA', wkCur:_ed?'grab':'pointer',
      lOp:i===0?'.3':'1', rOp:i===tiles0.length-1?'.3':'1',
      onLeft:(e)=>{ _stop(e); _mvK(t.key,-1); }, onRight:(e)=>{ _stop(e); _mvK(t.key,1); },
      onDS:(e)=>{ if(!_ed) return; this._wkDrag=t.key; try{ e.dataTransfer.setData('text/plain',t.key); e.dataTransfer.effectAllowed='move'; }catch(x){} },
      onDO:(e)=>{ if(_ed){ try{ e.preventDefault(); e.dataTransfer.dropEffect='move'; }catch(x){} } },
      onDrop:(e)=>{ if(!_ed) return; _stop(e); let f=this._wkDrag; try{ f=f||e.dataTransfer.getData('text/plain'); }catch(x){} this._wkDrag=null; _dropK(f,t.key); } }));`;
const CARD_OLD = '<div sc-camel-on-click="{{ t.onPress }}" style="display:flex;flex-direction:column;gap:10px;background:#fff;border:1px solid #ECE6DA;border-radius:16px;padding:16px 15px;cursor:pointer;min-width:0;min-height:128px"';
const CARD_NEW = '<div sc-camel-on-click="{{ t.onPress }}" draggable="{{ t.drag }}" sc-camel-on-drag-start="{{ t.onDS }}" sc-camel-on-drag-over="{{ t.onDO }}" sc-camel-on-drop="{{ t.onDrop }}" style="display:flex;flex-direction:column;gap:10px;background:#fff;border:{{ t.wkBd }};border-radius:16px;padding:16px 15px;cursor:{{ t.wkCur }};min-width:0;min-height:128px"';
const ARR_BTN = 'flex:none;width:34px;height:30px;border-radius:9px;border:1px solid #E2D3AE;background:#FBF8F1;color:#6E5424;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;padding:0';
const CARD_BAR = `
                <sc-if value="{{ t.edit }}" hint-placeholder-val="{{ false }}"><div style="display:flex;align-items:center;gap:6px;margin:-4px -2px 0"><span style="flex:1;min-width:0;font-size:12px;font-weight:800;color:#A08A5C;white-space:nowrap;user-select:none">⋮⋮ {{ t.no }}</span><button sc-camel-on-click="{{ t.onLeft }}" title="เลื่อนไปก่อนหน้า" style="${ARR_BTN};opacity:{{ t.lOp }}">◀</button><button sc-camel-on-click="{{ t.onRight }}" title="เลื่อนไปถัดไป" style="${ARR_BTN};opacity:{{ t.rOp }}">▶</button></div></sc-if>`;
const HEAD_OLD = '<span class="num" style="font-size:12px;color:#8C877D">{{ workProjMeta }}</span>\n          </div>';
const HEAD_NEW = '<span class="num" style="font-size:12px;color:#8C877D">{{ workProjMeta }}</span>\n            <sc-if value="{{ wkCanEdit }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ onWkEdit }}" style="margin-left:auto;align-self:center;border:1px solid #C9A961;background:{{ wkArrBg }};color:{{ wkArrFg }};border-radius:10px;padding:7px 13px;font-size:12.5px;font-weight:700;font-family:inherit;cursor:pointer">{{ wkArrLabel }}</button></sc-if>\n          </div>\n          <sc-if value="{{ wkEditOn }}" hint-placeholder-val="{{ false }}"><div style="background:#FBF3E2;border:1px solid #E2CB92;border-radius:12px;padding:9px 13px;margin-bottom:12px;font-size:12.5px;color:#6E5424;line-height:1.6">↕ <b>ลากการ์ดไปวาง</b> หรือกด <b>◀ ▶</b> บนการ์ด เพื่อจัดเรียง · บันทึกทันที · มีผลกับทุกคนในตำแหน่ง <b>{{ wkRoleName }}</b> · เพิ่ม / ลบปุ่ม / เลือกตำแหน่งอื่น ได้ที่แผงด้านล่าง</div></sc-if>';
const E = [
  ['Super Admin มีหน้าทำงาน', "store:STO, factory:FAC, driver:DRV, proc:PRC, fin:FIN, fin_mgr:FIN, hr:HR, hr_mgr:HR }[rk]||[]; }",
    () => "store:STO, factory:FAC, driver:DRV, proc:PRC, fin:FIN, fin_mgr:FIN, hr:HR, hr_mgr:HR,\n      superadmin:['tab:overview','tab:plan','tab:delay','tab:issues','tab:fin','tab:changes','tab:claim','tab:handover','nav:cfo','nav:qstrack','nav:hr','nav:admin','nav:system'] }[rk]||[]; }"],
  ['การ์ดจัดเรียงได้ (ข้อมูล)', "const tiles=list.map(info).filter(Boolean).filter(t=>!t.needP||p).map(t=>({ ...t, tint:t.d+'1A', onPress:()=>t.run(p) }));", () => TILES],
  ['หัวข้อหน้าของ Super Admin', "out.workKicker=(isSuper?", () => "const _prev=isSuper&&rk!=='superadmin';\n    out.workKicker=(_prev?"],
  ['ชื่อหน้าของ Super Admin', "out.workTitle=isSuper?", () => "out.workTitle=_prev?"],
  ['คำอธิบายหน้าของ Super Admin', "out.workSub=isSuper?", () => "out.workSub=(isSuper&&!_prev)?'เลือกโครงการ แล้วกดเข้างานได้ในคลิกเดียว · กด \"↕ จัดเรียงการ์ด\" เพื่อลากสลับลำดับการ์ด หรือตั้งค่าหน้าแรกของตำแหน่งอื่น':_prev?"],
  ['ปุ่มเสร็จ → กลับหน้าตัวเอง', "out.onWkEdit=()=>this.setState({ wkEdit:!this.state.wkEdit, wkRole:rk });",
    () => "out.onWkEdit=()=>{ const on=!this.state.wkEdit; this.setState({ wkEdit:on, wkRole:on?rk:null }); };\n    out.wkArrLabel=ed?'✓ เสร็จ':'↕ จัดเรียงการ์ด'; out.wkArrBg=ed?'#C9A961':'#1C1B18'; out.wkArrFg=ed?'#1C1B18':'#F4EFE6';"],
  ['การ์ดลากได้ (หน้าจอ)', CARD_OLD, () => CARD_NEW],
  ['ปุ่มจัดเรียงข้างชื่อโครงการ', HEAD_OLD, () => HEAD_NEW],
];
for (const [name, a, f] of E) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => f(a)); console.log('  ✓ ' + name);
}
// แถบ ◀ ▶ บนการ์ด (ก่อนไอคอน)
const ICON_ROW = '\n                <span style="flex:none;width:44px;height:44px;border-radius:13px;background:{{ t.tint }};';
const at = t.indexOf(CARD_NEW); const ii = t.indexOf(ICON_ROW, at);
if (at < 0 || ii < 0 || ii - at > 600) { console.error('✗ ไม่พบแถวไอคอนการ์ด — ไม่แก้ไฟล์'); process.exit(1); }
t = t.slice(0, ii) + CARD_BAR + t.slice(ii); console.log('  ✓ ปุ่ม ◀ ▶ บนการ์ด');
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ หน้าทำงาน: Super Admin จัดเรียงการ์ดได้ + ล็อกอินแล้วลงหน้าทำงาน');
