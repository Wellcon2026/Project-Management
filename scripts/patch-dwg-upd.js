#!/usr/bin/env node
/* =====================================================================
   Drawing Log: แสดง "อัปเดตล่าสุดโดย ใคร · วันที่" + Revision Note หลายรายการ (ชื่อผู้เขียน + วันที่)
     node scripts/patch-dwg-upd.js        (รันต่อจาก patch-sso.js)
   - แก้ช่องใดก็ตามในแถวแบบ → บันทึก updBy (ชื่อเล่น) · updEmail · updAt
   - อัปโหลด/เปลี่ยนไฟล์แบบ · เปลี่ยน Rev · ออกเวอร์ชันใหม่ → ลงประวัติ revNotes อัตโนมัติ
   - ช่อง Revision Note: พิมพ์ → กด "บันทึก note" = เพิ่มรายการใหม่ (ไม่ทับของเดิม) · ลบได้เฉพาะ note ของตัวเอง
   - revNote (ข้อความล่าสุด) ยังอัปเดตเหมือนเดิม → แจ้งเตือน / LINE / Export ใช้ได้ต่อ · note เก่า (ก่อนอัปเดต) แสดงเป็นรายการแรก
   - รันซ้ำได้ ไม่ซ้อน · หาจุดแก้ไม่เจอ/เจอหลายจุด → หยุด ไม่เขียนไฟล์
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
if (t.includes('_dwgNoteProps(')) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (ผู้อัปเดตแบบ + Revision Note)'); process.exit(0); }

// ---------- ช่อง Revision Note ในตาราง ----------
const TA0 = t.indexOf('<textarea value="{{ d.revNoteVal }}"');
if (TA0 < 0 || t.indexOf('<textarea value="{{ d.revNoteVal }}"', TA0 + 1) >= 0) { console.error('✗ ช่อง Revision Note ไม่พบ/พบหลายจุด — ไม่แก้'); process.exit(1); }
const TA1 = t.indexOf('</textarea>', TA0) + '</textarea>'.length;
const OLD_TA = t.slice(TA0, TA1);
const TD = 'width:200px;min-width:200px">';
const tdAt = t.lastIndexOf(TD, TA0);
if (tdAt < 0 || TA0 - tdAt > 120) { console.error('✗ ไม่พบความกว้างช่อง Revision Note — ไม่แก้'); process.exit(1); }

const NEW_TA =
`<div data-dwgbox="1" style="display:flex;flex-direction:column;gap:6px">
                          <sc-if value="{{ d.updShow }}" hint-placeholder-val="{{ true }}">
                            <div title="{{ d.updTip }}" style="display:flex;align-items:flex-start;gap:5px;font-size:10px;color:#6E5B3E;background:#F7F1E3;border-radius:7px;padding:5px 7px;line-height:1.4"><svg width="11" height="11" sc-camel-view-box="0 0 24 24" fill="none" stroke="#8A6D3B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-top:1px"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg><span><b style="font-weight:700">อัปเดตล่าสุด</b> {{ d.updBy }}<br>{{ d.updWhen }}</span></div>
                          </sc-if>
                          <sc-for list="{{ d.rnList }}" as="n" hint-placeholder-count="1">
                            <div style="border-left:2px solid {{ n.bar }};padding:1px 0 1px 7px">
                              <div style="font-size:11.5px;color:#2C2A25;line-height:1.45;white-space:pre-wrap;word-break:break-word"><sc-if value="{{ n.hasRev }}" hint-placeholder-val="{{ true }}"><span style="display:inline-block;background:#EFE7D6;color:#6E5B3E;border-radius:5px;padding:0 5px;margin-right:4px;font-size:9.5px;font-weight:700">{{ n.rev }}</span></sc-if>{{ n.text }}</div>
                              <div style="display:flex;gap:8px;align-items:center;font-size:9.5px;color:#9A8F7D;margin-top:2px;flex-wrap:wrap"><span>{{ n.who }}</span><sc-if value="{{ n.canDel }}" hint-placeholder-val="{{ false }}"><button sc-camel-on-click="{{ n.onDel }}" title="ลบ note นี้" style="border:none;background:none;cursor:pointer;font-family:inherit;font-size:9.5px;color:#B08070;padding:2px 0;text-decoration:underline">ลบ</button></sc-if></div>
                            </div>
                          </sc-for>
                          <sc-if value="{{ d.notesMore }}" hint-placeholder-val="{{ false }}">
                            <button sc-camel-on-click="{{ d.onNotesMore }}" style="align-self:flex-start;border:none;background:none;cursor:pointer;font-family:inherit;font-size:10px;font-weight:600;color:#8A6D3B;padding:2px 0;text-decoration:underline">{{ d.notesMoreLabel }}</button>
                          </sc-if>
                          <textarea data-dwgnote="1" placeholder="+ เพิ่ม revision note…" rows="2" style="width:100%;box-sizing:border-box;border:1px solid #E4DED2;background:#FCFAF5;border-radius:8px;padding:7px 9px;font-size:12px;font-family:inherit;color:#2C2A25;outline:none;resize:vertical;min-height:40px" style-focus="border-color:#C6A96B"></textarea>
                          <button sc-camel-on-click="{{ d.onNoteAdd }}" style="align-self:flex-end;display:inline-flex;align-items:center;gap:4px;border:none;background:#1C1B18;color:#F4EFE6;border-radius:999px;padding:7px 13px;min-height:30px;cursor:pointer;font-family:inherit;font-size:10.5px;font-weight:700" style-hover="background:#3A3730"><svg width="11" height="11" sc-camel-view-box="0 0 24 24" fill="none" stroke="#C9A961" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M12 5v14M5 12h14"></path></svg>บันทึก note</button>
                        </div>`;

t = t.slice(0, tdAt) + 'width:250px;min-width:250px">' + t.slice(tdAt + TD.length, TA0) + NEW_TA + t.slice(TA1);
console.log('  ✓ ช่อง Revision Note (ผู้อัปเดต + ประวัติ note + เพิ่ม note)');

const EDITS = [
  ['หัวคอลัมน์ Revision Note',
    'white-space:nowrap;width:200px">Revision Note</sc-raw-th>',
    'white-space:nowrap;width:250px">Revision Note · ผู้อัปเดต</sc-raw-th>'],
  ['บันทึกผู้อัปเดตทุกครั้งที่แก้แถวแบบ',
    "  setDwg(id, key, val){ this.setState(st=>({ drawings:st.drawings.map(d=>d.id===id?{...d,[key]:val}:d) }));",
    "  // v1.384.0 Drawing Log: ผู้อัปเดต + วันที่ · Revision Note หลายรายการ (ชื่อผู้เขียน + วันที่)\n" +
    "  _dwgMe(){ const me=this.state.me||{}; return { by:(this.nickOf&&this.nickOf(me))||me.name||'—', email:String(me.email||'').toLowerCase() }; }\n" +
    "  _dwgFmt(ms){ if(!ms) return ''; const x=new Date(ms); if(isNaN(x.getTime())) return ''; const p=(n)=>String(n).padStart(2,'0');\n" +
    "    return p(x.getDate())+'/'+p(x.getMonth()+1)+'/'+(x.getFullYear()+543)+' '+p(x.getHours())+':'+p(x.getMinutes()); }\n" +
    "  _dwgNotes(d){ const L=Array.isArray(d&&d.revNotes)?d.revNotes:[]; if(L.length) return L;\n" +
    "    return (d&&d.revNote)?[{ id:'legacy', kind:'note', text:d.revNote, rev:d.rev||'', by:d.issuedAt?(d.issuedBy||''):'', at:d.issuedAt||null }]:[]; }\n" +
    "  _dwgStamp(d,key,val){ const n={ ...d, [key]:val }; if(key==='revNotes'||d[key]===val) return n;\n" +
    "    if(key==='fileName'){ const L=(n.revNotes||[]).slice(); const e=L[L.length-1]; if(val&&e&&e.kind==='file'&&!e.name&&Date.now()-(e.at||0)<120000){ L[L.length-1]={ ...e, name:val }; n.revNotes=L; } return n; }\n" +
    "    const m=this._dwgMe(), now=Date.now(); n.updBy=m.by; n.updEmail=m.email; n.updAt=now;\n" +
    "    const log=(kind,text)=>{ n.revNotes=[...this._dwgNotes(d), { id:'n'+now+Math.random().toString(36).slice(2,6), kind, text, rev:n.rev||'', by:m.by, email:m.email, at:now }]; };\n" +
    "    if(key==='file'&&val) log('file','อัปเดตไฟล์แบบ'); else if(key==='rev'&&val) log('rev','เปลี่ยน '+(d.rev||'—')+' → '+val);\n" +
    "    return n; }\n" +
    "  addDwgNote(id,text){ const v=String(text||'').trim(); if(!v){ this.showToast('พิมพ์ revision note ก่อนกดบันทึก'); return false; }\n" +
    "    const m=this._dwgMe(), now=Date.now();\n" +
    "    this.setState(st=>({ drawings:(st.drawings||[]).map(d=>d.id!==id?d:{ ...d, revNote:v, updBy:m.by, updEmail:m.email, updAt:now,\n" +
    "      revNotes:[...this._dwgNotes(d), { id:'n'+now+Math.random().toString(36).slice(2,6), kind:'note', text:v, rev:d.rev||'', by:m.by, email:m.email, at:now }] }) }));\n" +
    "    const r=(this.state.drawings||[]).find(d=>d.id===id)||{}; this.engLog('log', r.project||this.state.projectId, id);\n" +
    "    this.showToast('บันทึก revision note แล้ว · '+m.by); return true; }\n" +
    "  delDwgNote(id,nid){ if(typeof window!=='undefined'&&!window.confirm('ลบ revision note นี้?')) return;\n" +
    "    this.setState(st=>({ drawings:(st.drawings||[]).map(d=>{ if(d.id!==id) return d; const L=this._dwgNotes(d).filter(x=>x.id!==nid);\n" +
    "      const last=L.slice().reverse().find(x=>x.kind==='note'||x.kind==='issue'); return { ...d, revNotes:L, revNote:last?(last.text||''):'' }; }) }));\n" +
    "    this.showToast('ลบ note แล้ว'); }\n" +
    "  _dwgNoteProps(d){ const S=this.state, m=this._dwgMe(), open=!!((S.dwgNotesOpen||{})[d.id]);\n" +
    "    const BAR={ note:'#C6A96B', file:'#6B8CB8', rev:'#8A7657', issue:'#B5533C' };\n" +
    "    const all=this._dwgNotes(d).slice().reverse(), shown=open?all:all.slice(0,3);\n" +
    "    const notes=shown.map(x=>{ const k=x.kind||'note';\n" +
    "      const text=k==='file'?('📎 '+(x.text||'อัปเดตไฟล์แบบ')+(x.name?' · '+x.name:'')):k==='rev'?('🔁 '+(x.text||'')):k==='issue'?('🚩 ออก '+(x.rev||'เวอร์ชันใหม่')+(x.text?' — '+x.text:'')):(x.text||'');\n" +
    "      return { bar:BAR[k]||BAR.note, hasRev:k==='note'&&!!x.rev, rev:x.rev||'', text,\n" +
    "        who:[x.by||'ไม่ทราบผู้บันทึก (ข้อมูลเดิม)', this._dwgFmt(x.at)].filter(Boolean).join(' · '),\n" +
    "        canDel:k==='note'&&!!x.email&&x.email===m.email, onDel:()=>this.delDwgNote(d.id, x.id) }; });\n" +
    "    return { updShow:!!d.updAt, updBy:d.updBy||'—', updWhen:this._dwgFmt(d.updAt), updTip:'แก้ไขแบบนี้ล่าสุดโดย '+(d.updBy||'—')+' · '+this._dwgFmt(d.updAt),\n" +
    "      rnList:notes, notesMore:all.length>3, notesMoreLabel:open?'ย่อ':('ดูทั้งหมด ('+all.length+')'),\n" +
    "      onNotesMore:()=>this.setState(st=>({ dwgNotesOpen:{ ...(st.dwgNotesOpen||{}), [d.id]:!open } })),\n" +
    "      onNoteAdd:(e)=>{ const b=e&&(e.currentTarget||e.target); const box=b&&b.closest&&b.closest('[data-dwgbox]'); const ta=box&&box.querySelector('textarea[data-dwgnote]');\n" +
    "        if(ta&&this.addDwgNote(d.id, ta.value)) ta.value=''; } }; }\n" +
    "  setDwg(id, key, val){ this.setState(st=>({ drawings:st.drawings.map(d=>d.id===id?this._dwgStamp(d,key,val):d) }));"],
  ['ออกเวอร์ชันใหม่ → ลงประวัติ note + ผู้อัปเดต',
    "        issuedAt:now, issuedBy:nm, ackBy:[], status:'submitted', revHist:hist }; }) }));",
    "        issuedAt:now, issuedBy:nm, ackBy:[], status:'submitted', revHist:hist,\n" +
    "        updBy:this._dwgMe().by, updEmail:this._dwgMe().email, updAt:now,\n" +
    "        revNotes:[...this._dwgNotes(d), { id:'n'+now, kind:'issue', text:Ri.note||'', rev:Ri.rev||d.rev||'', by:this._dwgMe().by, email:this._dwgMe().email, at:now }] }; }) }));"],
  ['ค่าในแถวแบบ',
    "revNoteVal:d.revNote||'', onRevNote:(e)=>this.setDwg(d.id,'revNote',e.target.value),\n        ...this.picProps(",
    "revNoteVal:d.revNote||'', onRevNote:(e)=>this.setDwg(d.id,'revNote',e.target.value), ...this._dwgNoteProps(d),\n        ...this.picProps("],
];
for (const [name, a, b] of EDITS) {
  const n = t.split(a).length - 1;
  if (n !== 1) { console.error('✗ จุด "' + name + '" พบ ' + n + ' ครั้ง (ต้อง 1) — โค้ด PM เปลี่ยน ไม่แก้ไฟล์'); process.exit(1); }
  t = t.replace(a, () => b); console.log('  ✓ ' + name);
}
lines[idx] = enc(t);
fs.writeFileSync(file, lines.join(nl));
console.log('✓ Drawing Log: ผู้อัปเดต + วันที่ · Revision Note หลายรายการ');
