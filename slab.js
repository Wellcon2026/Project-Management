/* =====================================================================
   Wellcon Slab Layout · วางแผนตัดแผ่น (หิน / ไม้ / แผ่นวัสดุ) บนรูป — โหมดใน Photo Editor (photo.html)
   v1.0.0 · ผู้บริหารสั่ง 21/11/2026: "เพิ่ม feature cutting line to the photo editor"
     1 นำเข้ารูปแผ่นหิน  2 ตั้งสเกล  3 ปรับสัดส่วน (แกนเดียวได้ · ดัดมุมมอง 4 มุม)
     4 ตาราง · เส้นไกด์ · Snap เปิด-ปิด (ติดตาราง / ไกด์ / ขอบชิ้นงาน-แผ่น)
     5 ชิ้นงานตามขนาดจริง (ซม. เช่น 45×120) วาง ย้าย หมุน ทำซ้ำเป็นแพทเทิร์น · รายการตัด
   - หน่วยโลก = ซม. · รูปวางที่ (0,0) ขนาด w·cmx × h·cmy (cmx / cmy = ซม. ต่อพิกเซล แยกแกน)
   - ทำงานในเบราว์เซอร์ทั้งหมด รูปไม่ถูกอัปโหลด · บันทึกงานล่าสุดในเครื่อง (IndexedDB) · บันทึก / เปิดไฟล์งาน .json
   ===================================================================== */
(() => {
'use strict';
const VER = '1.0.0';
if (window.WCSlab) return;
const $ = (s, r) => (r || document).querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r1 = (v) => Math.round(v * 10) / 10;
const fmt = (v) => { const x = r1(v); return Number.isInteger(x) ? String(x) : x.toFixed(1); };
const uid = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const COLORS = [['#E5484D', 'แดง'], ['#C9A961', 'ทอง'], ['#2F80ED', 'ฟ้า'], ['#2E9E5B', 'เขียว'], ['#FFFFFF', 'ขาว']];
const PRESETS = [[45, 120], [60, 120], [60, 60], [30, 60], [80, 160], [120, 240], [90, 180], [20, 120]];
const STEPS = [5, 10, 20, 30, 45, 50, 60, 100];
// ---------- สถานะ ----------
const S = {
  open: false, img: null, name: '', cmx: 0.1, cmy: 0.1, scaled: false, lockRatio: true,
  pieces: [], guides: [], sel: [], tool: 'move', next: 1,
  grid: { on: true, step: 10 }, guidesOn: true, snap: { on: true, grid: true, guide: true, edge: true },
  joint: 3, defW: 45, defH: 120, color: '#E5484D', pat: { c: 3, r: 2, fill: false, cut: true },
  view: { z: 1, ox: 0, oy: 0 }, cal: [], persp: [], hover: null, snapHit: null, hist: [], redo: [], prevImg: null, cursor: null, panel: true,
};
let root, cv, ctx, W = 0, H = 0, DPR = 1, raf = 0;
// ---------- เก็บงานล่าสุดในเครื่อง (IndexedDB) ----------
const DB = { db: null,
  async open() { if (this.db) return this.db; return new Promise((ok) => { try { const q = indexedDB.open('wcslab', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => { this.db = q.result; ok(this.db); }; q.onerror = () => ok(null); } catch (e) { ok(null); } }); },
  async get(k) { const d = await this.open(); if (!d) return null; return new Promise((ok) => { try { const r = d.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); } catch (e) { ok(null); } }); },
  async put(k, v) { const d = await this.open(); if (!d) return; try { d.transaction('kv', 'readwrite').objectStore('kv').put(v, k); } catch (e) {} } };
let saveT = 0;
function autosave() { clearTimeout(saveT); saveT = setTimeout(async () => { if (!S.img) return; try { const blob = await new Promise((ok) => S.img.toBlob(ok, 'image/jpeg', 0.9)); await DB.put('last', { at: new Date().toISOString(), name: S.name, blob, st: snapData() }); } catch (e) {} }, 800); }
function snapData() { return { cmx: S.cmx, cmy: S.cmy, scaled: S.scaled, lockRatio: S.lockRatio, pieces: S.pieces, guides: S.guides, grid: S.grid, snap: S.snap, guidesOn: S.guidesOn, joint: S.joint, defW: S.defW, defH: S.defH, next: S.next, color: S.color }; }
function applyData(d) { ['cmx', 'cmy', 'scaled', 'lockRatio', 'joint', 'defW', 'defH', 'next', 'color', 'guidesOn'].forEach((k) => { if (d[k] !== undefined) S[k] = d[k]; });
  S.pieces = (d.pieces || []).map((p) => ({ ...p })); S.guides = (d.guides || []).map((g) => ({ ...g })); if (d.grid) S.grid = { ...S.grid, ...d.grid }; if (d.snap) S.snap = { ...S.snap, ...d.snap }; }
// ---------- ย้อนกลับ ----------
function push() { S.hist.push(JSON.stringify(snapData())); if (S.hist.length > 60) S.hist.shift(); S.redo = []; }
function restorePrev() { const p = S.prevImg; if (!p) return; S.prevImg = null; S.img = p.img; applyData(JSON.parse(p.st)); S.hist = p.hist; S.sel = []; fit(); ui(); autosave(); toast('คืนรูปก่อนดัดแล้ว'); }
function undo() { if (S.prevImg && S.histImgAt === S.hist.length) { restorePrev(); return; }
  const h = S.hist.pop(); if (!h) { toast('ไม่มีอะไรให้ย้อน'); return; } S.redo.push(JSON.stringify(snapData())); applyData(JSON.parse(h)); S.sel = []; ui(); draw(); autosave(); }
// ---------- พิกัด ----------
const IW = () => (S.img ? S.img.width * S.cmx : 0), IH = () => (S.img ? S.img.height * S.cmy : 0);
const toS = (x, y) => [S.view.ox + x * S.view.z, S.view.oy + y * S.view.z];
const toW = (sx, sy) => [(sx - S.view.ox) / S.view.z, (sy - S.view.oy) / S.view.z];
function fit() { if (!S.img || !W) return; const pad = 36, z = Math.min((W - pad * 2) / IW(), (H - pad * 2) / IH()); S.view.z = z > 0 ? z : 1; S.view.ox = (W - IW() * S.view.z) / 2; S.view.oy = (H - IH() * S.view.z) / 2; draw(); }
// ---------- UI ----------
const CSS = `
#slab{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;background:#1E1C18;color:#22231C;font-family:'IBM Plex Sans Thai',system-ui,sans-serif;font-size:14px}
#slab .sl-hd{flex:none;display:flex;align-items:center;gap:10px;background:#1C1B18;color:#F6F1E8;padding:10px 12px;padding-top:calc(10px + env(safe-area-inset-top,0px));border-bottom:1px solid #33302A}
#slab .sl-hd .tt{flex:1;min-width:0}#slab .sl-hd .tt b{display:block;font-size:16px}#slab .sl-hd .tt span{display:block;font-size:12px;color:#BDB4A2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#slab .sl-ib{flex:none;height:38px;min-width:38px;border-radius:11px;border:1px solid #4A463D;background:#2A2721;color:#F6F1E8;padding:0 11px;font:600 13px inherit;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
#slab .sl-ib:hover{background:#36322B}#slab .sl-ib.gold{background:#C9A961;color:#1C1B18;border-color:#C9A961}#slab .sl-ib:disabled{opacity:.45;cursor:default}
#slab .sl-steps{flex:none;display:flex;gap:6px;overflow-x:auto;padding:8px 12px;background:#26241F;border-bottom:1px solid #33302A}
#slab .sl-st{flex:none;display:flex;align-items:center;gap:6px;border:1px solid #4A463D;border-radius:999px;padding:5px 11px 5px 6px;color:#D9CFBD;font-size:12.5px;background:transparent;font-family:inherit;cursor:pointer}
#slab .sl-st i{font-style:normal;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:#3A3832;font-size:11px;font-weight:800}
#slab .sl-st.ok{color:#BFE3C9;border-color:#2E6B43}#slab .sl-st.ok i{background:#2E9E5B;color:#fff}
#slab .sl-body{flex:1;min-height:0;display:flex}
#slab .sl-tools{flex:none;width:64px;display:flex;flex-direction:column;gap:6px;padding:8px 6px;background:#26241F;border-right:1px solid #33302A;overflow-y:auto}
#slab .sl-tool{border:1px solid transparent;border-radius:12px;background:transparent;color:#D9CFBD;padding:7px 2px;font:600 10.5px/1.25 inherit;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px}
#slab .sl-tool b{font-size:19px;line-height:1}#slab .sl-tool:hover{background:#33302A}#slab .sl-tool.on{background:#C9A961;color:#1C1B18}
#slab .sl-mid{flex:1;min-width:0;display:flex;flex-direction:column}
#slab .sl-bar{flex:none;display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:7px 10px;background:#2A2721;border-bottom:1px solid #33302A;color:#D9CFBD;font-size:12.5px;position:relative}
#slab .sl-tg{height:32px;border-radius:9px;border:1px solid #4A463D;background:#1E1C18;color:#D9CFBD;padding:0 10px;font:600 12.5px inherit;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
#slab .sl-tg.on{background:#0E7490;border-color:#0E7490;color:#fff}
#slab .sl-bar select,#slab .sl-bar input{height:32px;border-radius:9px;border:1px solid #4A463D;background:#1E1C18;color:#F6F1E8;padding:0 6px;font:13px inherit;font-family:inherit}
#slab .sl-menu{position:absolute;top:44px;z-index:5;background:#FFFDF8;color:#22231C;border-radius:12px;box-shadow:0 12px 34px rgba(0,0,0,.35);padding:8px;min-width:230px}
#slab .sl-menu label{display:flex;align-items:center;gap:9px;padding:8px 8px;border-radius:8px;cursor:pointer;font-size:13.5px}#slab .sl-menu label:hover{background:#F3EDE2}
#slab .sl-menu input{width:18px;height:18px;accent-color:#0E7490}
#slab .sl-cw{flex:1;min-height:0;position:relative;background:#1E1C18;touch-action:none;overflow:hidden}
#slab canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#slab .sl-hint{position:absolute;left:50%;top:12px;transform:translateX(-50%);background:rgba(28,27,24,.92);color:#F6F1E8;border:1px solid #C9A961;border-radius:12px;padding:8px 14px;font-size:13px;max-width:92%;text-align:center;pointer-events:none}
#slab .sl-stat{flex:none;display:flex;gap:14px;flex-wrap:wrap;padding:6px 12px;background:#26241F;color:#BDB4A2;font-size:12px;border-top:1px solid #33302A}
#slab .sl-stat b{color:#F6F1E8;font-weight:600}
#slab .sl-pan{flex:none;width:320px;background:#F4EFE6;overflow-y:auto;border-left:1px solid #33302A;padding:10px 12px 30px}
#slab .sl-sec{background:#FFFDF8;border:1px solid #E3DACB;border-radius:14px;padding:11px 12px;margin-bottom:10px}
#slab .sl-sec h4{margin:0 0 8px;font-size:13.5px;display:flex;align-items:center;gap:7px}#slab .sl-sec h4 i{font-style:normal;width:22px;height:22px;border-radius:50%;background:#1C1B18;color:#E2BC66;display:grid;place-items:center;font-size:11.5px}
#slab .sl-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:6px 0}
#slab .sl-row label{font-size:12.5px;color:#4A4840}
#slab .sl-in{width:76px;height:34px;border:1px solid #D9CFBD;border-radius:9px;padding:0 8px;font:14px inherit;font-family:inherit;background:#fff}
#slab .sl-b{height:34px;border-radius:9px;border:1px solid #D9CFBD;background:#fff;padding:0 10px;font:600 12.5px inherit;font-family:inherit;cursor:pointer;color:#22231C}
#slab .sl-b:hover{background:#F3EDE2}#slab .sl-b.dk{background:#1C1B18;color:#E2BC66;border-color:#1C1B18}#slab .sl-b.tl{background:#0E7490;color:#fff;border-color:#0E7490}#slab .sl-b:disabled{opacity:.45;cursor:default}
#slab .sl-chip{height:30px;border-radius:999px;border:1px solid #D9CFBD;background:#fff;padding:0 10px;font:600 12px inherit;font-family:inherit;cursor:pointer}
#slab .sl-chip.on{background:#1C1B18;color:#E2BC66;border-color:#1C1B18}
#slab .sl-mut{font-size:12px;color:#6B6758;line-height:1.5}
#slab .sl-warn{font-size:12.5px;color:#8A3A1E;background:#FBEDE6;border-radius:9px;padding:7px 9px;margin-top:6px}
#slab .sl-ok{font-size:12.5px;color:#245C38;background:#E7F1EB;border-radius:9px;padding:7px 9px;margin-top:6px}
#slab .sl-sw{width:26px;height:26px;border-radius:50%;border:2px solid #D9CFBD;cursor:pointer}#slab .sl-sw.on{border-color:#1C1B18;box-shadow:0 0 0 2px #C9A961}
#slab table{width:100%;border-collapse:collapse;font-size:12.5px}#slab td,#slab th{padding:5px 4px;border-bottom:1px solid #EEE6D8;text-align:left}#slab th{font-size:11px;color:#8A6D3B}
#slab .sl-start{position:absolute;inset:0;display:grid;place-items:center;padding:20px}
#slab .sl-drop{max-width:560px;width:100%;background:#FFFDF8;border:2px dashed #C9A961;border-radius:20px;padding:26px 22px;text-align:center}
#slab .sl-drop h2{margin:6px 0 6px;font-size:21px}#slab .sl-drop p{color:#4A4840;margin:6px 0 14px;line-height:1.6}
#slab .sl-flow{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:16px;text-align:left}
#slab .sl-flow div{background:#F4EFE6;border-radius:12px;padding:9px 11px;font-size:12.5px;color:#4A4840}#slab .sl-flow b{display:block;color:#22231C;font-size:13px}
#slab .sl-dlg{position:absolute;inset:0;z-index:9;background:rgba(0,0,0,.5);display:grid;place-items:center;padding:16px}
#slab .sl-dlg .bx{background:#FFFDF8;border-radius:16px;padding:16px 18px;width:min(420px,100%);box-shadow:0 20px 60px rgba(0,0,0,.4)}
#slab .sl-dlg h3{margin:0 0 8px;font-size:17px}
#slab .sl-toast{position:absolute;left:50%;bottom:60px;transform:translateX(-50%);background:#1C1B18;color:#fff;border-radius:12px;padding:9px 16px;font-size:13.5px;z-index:10;pointer-events:none;max-width:90%;text-align:center}
#slab .sl-busy{position:absolute;inset:0;z-index:11;background:rgba(0,0,0,.45);display:grid;place-items:center;color:#fff;font-size:15px}
#slab .sl-pt{display:none}
@media(max-width:760px){#slab .sl-body{flex-direction:column}#slab .sl-tools{width:auto;flex-direction:row;border-right:0;border-bottom:1px solid #33302A;overflow-x:auto;padding:6px}
  #slab .sl-tool{min-width:58px}#slab .sl-pan{position:absolute;left:0;right:0;bottom:0;width:auto;max-height:58%;z-index:6;border-left:0;border-top:2px solid #C9A961;border-radius:16px 16px 0 0;box-shadow:0 -10px 30px rgba(0,0,0,.3)}
  #slab .sl-pan.off{display:none}#slab .sl-pt{display:inline-flex}#slab .sl-hd .tx{display:none}#slab .sl-mid{position:relative}}`;
function css() { if ($('#slab-css')) return; const s = document.createElement('style'); s.id = 'slab-css'; s.textContent = CSS; document.head.appendChild(s); }
function stepState() { return [!!S.img, S.scaled, S.scaled, S.grid.on || S.guides.length > 0, S.pieces.length > 0]; }
function build() {
  css(); root = document.createElement('div'); root.id = 'slab'; root.setAttribute('translate', 'no');
  root.innerHTML = `<div class="sl-hd"><button class="sl-ib" data-sl="close" aria-label="กลับ Photo Editor" title="กลับ Photo Editor">←</button>
      <div class="tt"><b>Slab Layout · วางแผนตัดแผ่น</b><span id="slSub">นำเข้ารูปแผ่นหิน / ไม้ แล้ววางชิ้นงานตามขนาดจริง</span></div>
      <button class="sl-ib" data-sl="undo" title="ย้อนกลับ (Ctrl+Z)">↶<span class="tx"> ย้อน</span></button>
      <button class="sl-ib sl-pt" data-sl="panel" title="ตั้งค่า / ชิ้นงาน">⚙</button>
      <button class="sl-ib" data-sl="csv" data-g="sl-export" title="รายการตัด (Excel / CSV)">📋<span class="tx"> รายการตัด</span></button>
      <button class="sl-ib gold" data-sl="png" title="บันทึกภาพแผนตัด (PNG)">⬇<span class="tx"> บันทึกภาพ</span></button></div>
    <div class="sl-steps" id="slSteps"></div>
    <div class="sl-body"><div class="sl-tools" id="slTools"></div>
      <div class="sl-mid"><div class="sl-bar" id="slBar"></div><div class="sl-cw" id="slCw" data-g="sl-canvas"><canvas></canvas><div class="sl-start" id="slStart"></div></div><div class="sl-stat" id="slStat"></div></div>
      <div class="sl-pan" id="slPan"></div></div>
    <input type="file" id="slFile" accept="image/*,.psd,.psb,.tif,.tiff" hidden><input type="file" id="slJson" accept=".json,application/json" hidden>`;
  document.body.appendChild(root);
  cv = root.querySelector('canvas'); ctx = cv.getContext('2d');
  root.addEventListener('click', onClick); root.addEventListener('input', onInput); root.addEventListener('change', onChange);
  $('#slFile', root).addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) loadFile(f); });
  $('#slJson', root).addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) loadJson(f); });
  const cw = $('#slCw', root);
  cw.addEventListener('pointerdown', pDown); cw.addEventListener('pointermove', pMove); cw.addEventListener('pointerup', pUp); cw.addEventListener('pointercancel', pUp); cw.addEventListener('pointerleave', () => { S.cursor = null; stat(); });
  cw.addEventListener('wheel', onWheel, { passive: false });
  cw.addEventListener('dragover', (e) => { e.preventDefault(); }); cw.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) { if (/\.json$/i.test(f.name)) loadJson(f); else loadFile(f); } });
  new ResizeObserver(resize).observe(cw);
}
function resize() { const cw = $('#slCw', root); if (!cw) return; DPR = window.devicePixelRatio || 1; const r = cw.getBoundingClientRect(); const first = !W; W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); if (first && S.img) fit(); else draw(); }
function ui() { steps(); tools(); bar(); panel(); stat(); startPane(); sub(); draw(); }
function sub() { const t = $('#slSub', root); if (!t) return; t.textContent = S.img ? (S.name + ' · ' + (S.scaled ? 'แผ่นจริง ' + fmt(IW()) + ' × ' + fmt(IH()) + ' ซม.' : 'ยังไม่ตั้งสเกล')) : 'นำเข้ารูปแผ่นหิน / ไม้ แล้ววางชิ้นงานตามขนาดจริง'; }
function steps() { const st = stepState(); const L = ['นำเข้ารูป', 'ตั้งสเกล', 'ปรับสัดส่วน', 'ตาราง · ไกด์ · Snap', 'วางชิ้นงาน'];
  $('#slSteps', root).innerHTML = L.map((t, i) => `<button class="sl-st${st[i] ? ' ok' : ''}" data-step="${i}"><i>${st[i] ? '✓' : i + 1}</i>${t}</button>`).join(''); }
function tools() { const T = [['move', '✋', 'เลือก / ย้าย'], ['scale', '📏', 'ตั้งสเกล'], ['persp', '⬚', 'ดัด 4 มุม'], ['piece', '▭', 'วางชิ้นงาน'], ['gv', '┆', 'ไกด์ตั้ง'], ['gh', '┅', 'ไกด์นอน']];
  $('#slTools', root).innerHTML = T.map(([k, ic, t]) => `<button class="sl-tool${S.tool === k ? ' on' : ''}" data-tool="${k}" data-g="sl-tool-${k}" title="${t}"${!S.img && k !== 'move' ? ' disabled' : ''}><b>${ic}</b>${t}</button>`).join(''); }
function bar() { const g = S.grid, sn = S.snap;
  $('#slBar', root).innerHTML = `<button class="sl-tg${g.on ? ' on' : ''}" data-sl="grid" data-g="sl-grid" title="แสดง / ซ่อนตาราง">▦ ตาราง</button>
    <select data-in="gstep" title="ระยะตาราง (ซม.)">${STEPS.map((v) => `<option value="${v}"${v === g.step ? ' selected' : ''}>${v} ซม.</option>`).join('')}${STEPS.indexOf(g.step) < 0 ? `<option value="${g.step}" selected>${g.step} ซม.</option>` : ''}<option value="x">กำหนดเอง…</option></select>
    <button class="sl-tg${S.guidesOn ? ' on' : ''}" data-sl="guides" title="แสดง / ซ่อนเส้นไกด์">┆ ไกด์ ${S.guides.length || ''}</button>
    <button class="sl-tg${sn.on ? ' on' : ''}" data-sl="snapmenu" data-g="sl-snap" title="ตั้งค่า Snap">🧲 Snap ${sn.on ? 'เปิด' : 'ปิด'} ▾</button>
    <span style="flex:1"></span><button class="sl-tg" data-sl="fit" title="พอดีจอ">⤢ พอดีจอ</button><button class="sl-tg" data-sl="zin" title="ซูมเข้า">＋</button><button class="sl-tg" data-sl="zout" title="ซูมออก">－</button>
    ${S.snapMenu ? `<div class="sl-menu" style="left:${S.snapMenuX || 200}px"><label><input type="checkbox" data-snap="on"${sn.on ? ' checked' : ''}> <b>เปิด Snap</b></label><div style="border-top:1px solid #EEE6D8;margin:4px 0"></div>
      <label><input type="checkbox" data-snap="grid"${sn.grid ? ' checked' : ''}${sn.on ? '' : ' disabled'}> ติดตาราง</label><label><input type="checkbox" data-snap="guide"${sn.guide ? ' checked' : ''}${sn.on ? '' : ' disabled'}> ติดเส้นไกด์</label>
      <label><input type="checkbox" data-snap="edge"${sn.edge ? ' checked' : ''}${sn.on ? '' : ' disabled'}> ติดขอบชิ้นงาน / ขอบแผ่น (+ ร่อง)</label><div class="sl-mut" style="padding:4px 8px">กด Alt ค้างขณะลาก = ปิด Snap ชั่วคราว</div></div>` : ''}`; }
function stat() { const el = $('#slStat', root); if (!el) return; const c = S.cursor;
  el.innerHTML = S.img ? `<span>ตำแหน่ง <b>${c ? fmt(c[0]) + ', ' + fmt(c[1]) + ' ซม.' : '—'}</b></span><span>ซูม <b>${Math.round(S.view.z * 100) / 100} px/ซม.</b></span><span>สเกล <b>${S.scaled ? '1 px = ' + (S.cmx * 10).toFixed(2) + (Math.abs(S.cmx - S.cmy) > 1e-6 ? ' / ' + (S.cmy * 10).toFixed(2) : '') + ' มม.' : 'ยังไม่ตั้ง'}</b></span><span>ชิ้นงาน <b>${S.pieces.length}</b>${S.sel.length ? ' · เลือก ' + S.sel.length : ''}</span>` : '<span>ยังไม่มีรูป</span>'; }
function startPane() { const el = $('#slStart', root); if (!el) return; if (S.img) { el.hidden = true; return; } el.hidden = false;
  el.innerHTML = `<div class="sl-drop"><div style="font-size:42px">✂</div><h2>Slab Layout · วางแผนตัดแผ่น</h2><p>นำเข้ารูปแผ่นหิน / ไม้ / แผ่นวัสดุ → ตั้งสเกลตามขนาดจริง → วางชิ้นงาน (เช่น 45×120 ซม.) เพื่อเลือกลาย · จัดแพทเทิร์น · ออกรายการตัด</p>
    <div class="sl-row" style="justify-content:center"><button class="sl-b tl" data-sl="pick" data-g="sl-open" style="height:46px;padding:0 20px;font-size:15px">🖼 นำเข้ารูปแผ่น</button><button class="sl-b" data-sl="json" style="height:46px">📂 เปิดไฟล์งาน (.json)</button>${S.lastAt ? `<button class="sl-b" data-sl="last" style="height:46px">↺ งานล่าสุด · ${esc(S.lastName || '')}</button>` : ''}</div>
    <div class="sl-mut">หรือลากรูปมาวาง · JPG · PNG · WebP · TIFF · PSD — รูปอยู่ในเครื่องคุณ ไม่ถูกอัปโหลด</div>
    <div class="sl-flow"><div><b>1 · นำเข้ารูป</b>รูปแผ่นหิน / dry-lay / แบบ elevation</div><div><b>2 · ตั้งสเกล</b>แตะ 2 จุด แล้วใส่ระยะจริง (ซม.)</div><div><b>3 · ปรับสัดส่วน</b>ปรับแกนเดียว หรือดัด 4 มุมให้ตรง</div><div><b>4 · ตาราง · ไกด์ · Snap</b>เปิด-ปิดได้ เลือกให้ติดอะไร</div><div><b>5 · วางชิ้นงาน</b>ใส่ขนาด ซม. วาง ย้าย ทำซ้ำเป็นแพทเทิร์น</div></div></div>`; }
function panel() { const P = $('#slPan', root); if (!P) return; P.classList.toggle('off', !S.panel);
  if (!S.img) { P.innerHTML = '<div class="sl-sec"><h4><i>1</i>นำเข้ารูปแผ่น</h4><div class="sl-mut">เริ่มจากนำเข้ารูปแผ่นหิน / ไม้ หรือรูป dry-lay ที่ถ่ายจากโรงงาน</div><div class="sl-row"><button class="sl-b tl" data-sl="pick">🖼 นำเข้ารูป</button></div></div>'; return; }
  const sel = S.pieces.filter((p) => S.sel.indexOf(p.id) >= 0), one = sel.length === 1 ? sel[0] : null;
  const sum = {}; S.pieces.forEach((p) => { const k = fmt(Math.min(p.w, p.h)) + ' × ' + fmt(Math.max(p.w, p.h)); sum[k] = sum[k] || { n: 0, a: 0 }; sum[k].n++; sum[k].a += p.w * p.h / 10000; });
  const tot = Object.values(sum).reduce((a, b) => a + b.a, 0); const thin = S.pieces.filter((p) => Math.min(p.w, p.h) < 10).length;
  P.innerHTML = `
  <div class="sl-sec"><h4><i>1</i>รูปแผ่น</h4><div class="sl-mut">${esc(S.name)} · ${S.img.width} × ${S.img.height} px</div><div class="sl-row"><button class="sl-b" data-sl="pick">เปลี่ยนรูป</button><button class="sl-b" data-sl="savejson" title="บันทึกงาน (รูป + ชิ้นงาน) เป็นไฟล์ .json เปิดต่อได้">💾 บันทึกงาน</button><button class="sl-b" data-sl="json">📂 เปิดงาน</button></div></div>
  <div class="sl-sec" data-g="sl-scale"><h4><i>2</i>สเกล · ขนาดจริง</h4>
    <div class="sl-row"><button class="sl-b dk" data-tool="scale">📏 แตะ 2 จุด ตั้งสเกล</button></div>
    <div class="sl-row"><label>ขนาดแผ่นจริง</label></div>
    <div class="sl-row" data-g="sl-size"><input class="sl-in" data-in="iw" type="number" step="0.1" min="1" value="${fmt(IW())}" title="กว้าง (ซม.)"><span>×</span><input class="sl-in" data-in="ih" type="number" step="0.1" min="1" value="${fmt(IH())}" title="สูง (ซม.)"><span class="sl-mut">ซม.</span></div>
    <label class="sl-row" style="cursor:pointer"><input type="checkbox" data-in="lock"${S.lockRatio ? ' checked' : ''}> <span>ล็อกสัดส่วน (ปลดเพื่อแก้กว้าง / สูงแยกกัน)</span></label>
    ${S.scaled ? `<div class="sl-ok">ตั้งสเกลแล้ว · สัดส่วนแกน X : Y = 1 : ${(S.cmy / S.cmx).toFixed(3)}</div>` : '<div class="sl-warn">ยังไม่ตั้งสเกล — แตะ 2 จุดบนรูปที่รู้ระยะจริง หรือพิมพ์ขนาดแผ่นจริง</div>'}</div>
  <div class="sl-sec" data-g="sl-ratio"><h4><i>3</i>ปรับสัดส่วนรูป</h4><div class="sl-mut">รูปถ่ายมักยืด / หดแกนเดียว — ปลดล็อกสัดส่วน แล้วตั้งสเกลแนวนอน / แนวตั้งแยกกัน หรือดัด 4 มุมถ้ารูปถ่ายเฉียง</div>
    <div class="sl-row"><button class="sl-b" data-sl="calx">↔ ตั้งสเกลแนวนอน</button><button class="sl-b" data-sl="caly">↕ ตั้งสเกลแนวตั้ง</button></div>
    <div class="sl-row"><label>ยืดแนวนอน</label><input class="sl-in" data-in="sx" type="number" step="0.5" value="100" style="width:66px"><span class="sl-mut">%</span><label>แนวตั้ง</label><input class="sl-in" data-in="sy" type="number" step="0.5" value="100" style="width:66px"><span class="sl-mut">%</span><button class="sl-b" data-sl="stretch">ใช้</button></div>
    <div class="sl-row"><button class="sl-b dk" data-tool="persp">⬚ ดัดมุมมอง 4 มุม</button>${S.prevImg ? '<button class="sl-b" data-sl="unpersp">↶ คืนรูปก่อนดัด</button>' : ''}</div></div>
  <div class="sl-sec"><h4><i>4</i>ตาราง · ไกด์ · Snap</h4><div class="sl-mut">เปิด-ปิดที่แถบบน · Snap เลือกได้ว่าติดตาราง / เส้นไกด์ / ขอบชิ้นงาน</div>
    <div class="sl-row"><button class="sl-b" data-tool="gv">┆ + ไกด์ตั้ง</button><button class="sl-b" data-tool="gh">┅ + ไกด์นอน</button>${S.guides.length ? '<button class="sl-b" data-sl="gclear">ลบไกด์ทั้งหมด</button>' : ''}</div>
    ${S.guides.map((g, i) => `<div class="sl-row"><span class="sl-mut" style="width:54px">${g.o === 'v' ? '┆ ตั้ง' : '┅ นอน'}</span><input class="sl-in" data-gp="${i}" type="number" step="0.1" value="${fmt(g.p)}"><span class="sl-mut">ซม.</span><button class="sl-b" data-gx="${i}" title="ลบ">✕</button></div>`).join('')}</div>
  <div class="sl-sec" data-g="sl-piece"><h4><i>5</i>ชิ้นงาน (ขนาดตัด)</h4>
    <div class="sl-row"><input class="sl-in" data-in="dw" type="number" step="0.1" min="1" value="${fmt(S.defW)}" title="กว้าง (ซม.)" data-g="sl-dw"><span>×</span><input class="sl-in" data-in="dh" type="number" step="0.1" min="1" value="${fmt(S.defH)}" title="ยาว (ซม.)"><span class="sl-mut">ซม.</span><button class="sl-b" data-sl="swapd" title="สลับกว้าง / ยาว">⇄</button></div>
    <div class="sl-row">${PRESETS.map(([a, b]) => `<button class="sl-chip${S.defW === a && S.defH === b ? ' on' : ''}" data-pre="${a}x${b}">${a}×${b}</button>`).join('')}</div>
    <div class="sl-row"><label>ร่อง / ยาแนว</label><input class="sl-in" data-in="joint" type="number" step="0.5" min="0" value="${S.joint}" style="width:62px"><span class="sl-mut">มม.</span></div>
    <div class="sl-row">${COLORS.map(([c, t]) => `<span class="sl-sw${S.color === c ? ' on' : ''}" data-col="${c}" title="${t}" style="background:${c}"></span>`).join('')}</div>
    <div class="sl-row"><button class="sl-b dk" data-tool="piece">▭ วางชิ้นงาน (แตะบนรูป)</button><button class="sl-b" data-sl="center">＋ วางกลางรูป</button></div></div>
  ${sel.length ? `<div class="sl-sec" style="border-color:#C9A961"><h4>✦ ชิ้นที่เลือก ${sel.length > 1 ? '(' + sel.length + ' ชิ้น)' : 'หมายเลข ' + esc(one.n)}</h4>
    ${one ? `<div class="sl-row"><input class="sl-in" data-pe="w" type="number" step="0.1" value="${fmt(one.w)}"><span>×</span><input class="sl-in" data-pe="h" type="number" step="0.1" value="${fmt(one.h)}"><span class="sl-mut">ซม.</span></div>
    <div class="sl-row"><label>ตำแหน่ง X</label><input class="sl-in" data-pe="x" type="number" step="0.1" value="${fmt(one.x)}"><label>Y</label><input class="sl-in" data-pe="y" type="number" step="0.1" value="${fmt(one.y)}"></div>
    <div class="sl-row"><label>หมายเลข</label><input class="sl-in" data-pe="n" value="${esc(one.n)}" style="width:70px"></div>` : ''}
    <div class="sl-row"><button class="sl-b" data-sl="rot">⟳ หมุน 90°</button><button class="sl-b" data-sl="dup">⧉ ทำสำเนา</button><button class="sl-b" data-sl="del">🗑 ลบ</button></div>
    <div class="sl-row">${COLORS.map(([c, t]) => `<span class="sl-sw" data-pcol="${c}" title="${t}" style="background:${c}"></span>`).join('')}</div>
    ${one ? `<div style="border-top:1px solid #EEE6D8;margin:8px 0 4px"></div><div class="sl-row" data-g="sl-pattern"><b style="font-size:13px">ทำซ้ำเป็นแพทเทิร์น</b></div>
    <div class="sl-row"><label>คอลัมน์</label><input class="sl-in" data-pt="c" type="number" min="1" value="${S.pat.c}" style="width:58px"><label>แถว</label><input class="sl-in" data-pt="r" type="number" min="1" value="${S.pat.r}" style="width:58px"></div>
    <label class="sl-row" style="cursor:pointer"><input type="checkbox" data-pt="fill"${S.pat.fill ? ' checked' : ''}> <span>เต็มแผ่น (คำนวณจำนวนเอง)</span></label>
    <label class="sl-row" style="cursor:pointer"><input type="checkbox" data-pt="cut"${S.pat.cut ? ' checked' : ''}> <span>รวมชิ้นตัดที่ขอบแผ่น</span></label>
    <div class="sl-row"><button class="sl-b tl" data-sl="pattern">▦ สร้างแพทเทิร์น (ร่อง ${S.joint} มม.)</button></div>` : ''}</div>` : ''}
  <div class="sl-sec"><h4>📋 สรุปรายการตัด</h4>${S.pieces.length ? `<table><tr><th>ขนาด (ซม.)</th><th>จำนวน</th><th>พื้นที่ ตร.ม.</th></tr>${Object.keys(sum).sort().map((k) => `<tr><td>${k}</td><td>${sum[k].n}</td><td>${sum[k].a.toFixed(2)}</td></tr>`).join('')}<tr><td><b>รวม</b></td><td><b>${S.pieces.length}</b></td><td><b>${tot.toFixed(2)}</b></td></tr></table>${thin ? `<div class="sl-warn">⚠ มีชิ้นแคบกว่า 10 ซม. ${thin} ชิ้น — หินแคบมากเสี่ยงแตก ลองขยับจุดเริ่มแพทเทิร์นให้ชิ้นขอบกว้างขึ้น (แบ่งเศษ 2 ข้าง)</div>` : ''}
    <div class="sl-row"><button class="sl-b" data-sl="renum" title="เรียงหมายเลขจากซ้ายบน → ขวาล่าง">🔢 เรียงหมายเลขใหม่</button><button class="sl-b" data-sl="selall">เลือกทั้งหมด</button><button class="sl-b" data-sl="clear">ลบชิ้นงานทั้งหมด</button></div>` : '<div class="sl-mut">ยังไม่มีชิ้นงาน — ตั้งขนาดในข้อ 5 แล้วกด “วางชิ้นงาน”</div>'}</div>
  <div class="sl-mut" style="padding:0 4px">ลัด: ลาก = ย้าย · Shift + แตะ = เลือกหลายชิ้น · ลูกศร = ขยับ 0.5 ซม. (Shift 5 ซม.) · R = หมุน · Ctrl+D = สำเนา · Delete = ลบ · ล้อเมาส์ = ซูม · ลากที่ว่าง = เลื่อนภาพ</div>`; }
function hint() { const m = { scale: S.cal.length ? 'แตะจุดที่ 2' : 'ตั้งสเกล: แตะจุดที่ 1 บนรูป (เช่น ขอบแผ่นด้านหนึ่ง)', calx: S.cal.length ? 'แตะจุดที่ 2 (แนวนอน)' : 'สเกลแนวนอน: แตะจุดที่ 1', caly: S.cal.length ? 'แตะจุดที่ 2 (แนวตั้ง)' : 'สเกลแนวตั้ง: แตะจุดที่ 1',
    persp: ['แตะมุม ซ้ายบน ของแผ่น', 'แตะมุม ขวาบน', 'แตะมุม ขวาล่าง', 'แตะมุม ซ้ายล่าง'][S.persp.length] || '', piece: 'แตะบนรูปเพื่อวางชิ้น ' + fmt(S.defW) + '×' + fmt(S.defH) + ' ซม. (แตะซ้ำได้หลายชิ้น)', gv: 'แตะเพื่อวางเส้นไกด์แนวตั้ง', gh: 'แตะเพื่อวางเส้นไกด์แนวนอน' }[S.tool === 'scale' && S.calAxis ? S.calAxis : S.tool];
  let h = $('.sl-hint', root); if (!m || !S.img) { if (h) h.remove(); return; } if (!h) { h = document.createElement('div'); h.className = 'sl-hint'; $('#slCw', root).appendChild(h); } h.textContent = m + ' · Esc = ยกเลิก'; }
function toast(t) { const d = document.createElement('div'); d.className = 'sl-toast'; d.textContent = t; root.appendChild(d); setTimeout(() => d.remove(), 2600); }
function ask(title, body, fields, okTx) { return new Promise((ok) => { const d = document.createElement('div'); d.className = 'sl-dlg';
  d.innerHTML = `<div class="bx"><h3>${title}</h3><div class="sl-mut" style="margin-bottom:8px">${body}</div>${(fields || []).map((f) => f.type === 'radio' ? `<div class="sl-row">${f.opts.map((o, i) => `<label style="display:flex;gap:6px;align-items:center;cursor:pointer;margin-right:8px"><input type="radio" name="${f.k}" value="${o[0]}"${i === (f.def || 0) ? ' checked' : ''}> ${o[1]}</label>`).join('')}</div>` : `<div class="sl-row"><label style="min-width:90px">${f.l}</label><input class="sl-in" data-k="${f.k}" type="number" step="0.1" min="0" value="${f.v == null ? '' : f.v}" style="width:120px"><span class="sl-mut">${f.u || ''}</span></div>`).join('')}
    <div class="sl-row" style="justify-content:flex-end;margin-top:12px"><button class="sl-b" data-no>ยกเลิก</button><button class="sl-b dk" data-ok>${okTx || 'ตกลง'}</button></div></div>`;
  root.appendChild(d); const i0 = d.querySelector('input[data-k]'); if (i0) setTimeout(() => { i0.focus(); i0.select(); }, 30);
  const done = (v) => { d.remove(); ok(v); };
  d.addEventListener('click', (e) => { if (e.target.closest('[data-no]') || e.target === d) done(null); if (e.target.closest('[data-ok]')) { const o = {}; d.querySelectorAll('input[data-k]').forEach((x) => { o[x.dataset.k] = parseFloat(x.value); }); d.querySelectorAll('input[type=radio]:checked').forEach((x) => { o[x.name] = x.value; }); done(o); } });
  d.addEventListener('keydown', (e) => { if (e.key === 'Enter') d.querySelector('[data-ok]').click(); if (e.key === 'Escape') { e.stopPropagation(); done(null); } }); }); }
async function busy(t, fn) { const b = document.createElement('div'); b.className = 'sl-busy'; b.textContent = t; root.appendChild(b); await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30))); try { return await fn(); } finally { b.remove(); } }
// ---------- โหลดรูป ----------
async function decode(f) { if (window.PE_decode) return window.PE_decode(f); try { return await createImageBitmap(f, { imageOrientation: 'from-image' }); } catch (e) {} return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('เปิดรูปไม่ได้')); i.src = URL.createObjectURL(f); }); }
function toCanvas(bmp, max) { const k = Math.min(1, (max || 5000) / Math.max(bmp.width, bmp.height)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k)); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); return c; }
async function loadFile(f) {
  if (S.pieces.length && S.img && !(await ask('เปลี่ยนรูปแผ่น?', 'ชิ้นงานที่วางไว้จะยังอยู่ที่ตำแหน่งเดิม (ซม.) — ถ้าเป็นแผ่นใหม่ ควรลบชิ้นงานก่อน', [], 'เปลี่ยนรูป'))) return;
  await busy('กำลังเปิดรูป…', async () => { try { const bmp = await decode(f); S.img = toCanvas(bmp, 5000); S.name = f.name.replace(/\.[^.]+$/, ''); S.cmx = S.cmy = 0.1; S.scaled = false; S.prevImg = null; S.hist = []; S.redo = []; S.sel = []; S.tool = 'scale'; S.cal = []; S.calAxis = '';
    fit(); ui(); hint(); autosave(); toast('เปิดรูปแล้ว — ขั้นต่อไป: ตั้งสเกล แตะ 2 จุดที่รู้ระยะจริง'); } catch (e) { toast(String((e && e.message) || e)); } }); }
async function loadJson(f) { try { const d = JSON.parse(await f.text()); if (!d || !d.img) throw new Error('ไฟล์งานไม่ถูกต้อง');
  await busy('กำลังเปิดงาน…', async () => { const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('รูปในไฟล์งานเสีย')); i.src = d.img; }); S.img = toCanvas(im, 6000); S.name = d.name || f.name.replace(/\.json$/i, ''); applyData(d.st || {}); S.hist = []; S.sel = []; S.prevImg = null; S.tool = 'move'; fit(); ui(); autosave(); toast('เปิดงานแล้ว'); }); } catch (e) { toast(String((e && e.message) || e)); } }
async function loadLast() { const L = await DB.get('last'); if (!L || !L.blob) { toast('ไม่พบงานล่าสุด'); return; } await busy('กำลังเปิดงานล่าสุด…', async () => { const bmp = await createImageBitmap(L.blob); S.img = toCanvas(bmp, 6000); S.name = L.name || 'slab'; applyData(L.st || {}); S.hist = []; S.sel = []; S.tool = 'move'; fit(); ui(); }); }
// ---------- สเกล ----------
async function finishCal() {
  const [a, b] = S.cal, ax = S.calAxis || 'both'; S.cal = [];
  const dxp = Math.abs(b[0] - a[0]) / S.cmx, dyp = Math.abs(b[1] - a[1]) / S.cmy, dp = Math.hypot(dxp, dyp);
  const dflt = ax === 'x' ? r1(dxp * S.cmx) : ax === 'y' ? r1(dyp * S.cmy) : r1(Math.hypot(b[0] - a[0], b[1] - a[1]));
  const f = [{ k: 'len', l: 'ระยะจริง', v: S.scaled ? dflt : '', u: 'ซม.' }]; if (!S.calAxis) f.push({ type: 'radio', k: 'axis', opts: [['both', 'ทั้งสองแกน'], ['x', 'แนวนอนอย่างเดียว'], ['y', 'แนวตั้งอย่างเดียว']], def: S.lockRatio ? 0 : (dxp >= dyp ? 1 : 2) });
  const r = await ask(ax === 'x' ? 'ตั้งสเกลแนวนอน' : ax === 'y' ? 'ตั้งสเกลแนวตั้ง' : 'ตั้งสเกล', 'ระยะระหว่าง 2 จุดที่แตะ = กี่ ซม. จริง? (วัดจากแบบ / ตลับเมตร)', f, 'ตั้งสเกล');
  S.calAxis = ''; S.tool = 'move'; tools(); hint();
  if (!r || !(r.len > 0)) { draw(); return; } push(); const A = r.axis || ax;
  if (A === 'x') { if (dxp < 3) { toast('2 จุดแนวนอนใกล้กันเกินไป'); return; } S.cmx = r.len / dxp; if (S.lockRatio && !S.scaled) S.cmy = S.cmx; }
  else if (A === 'y') { if (dyp < 3) { toast('2 จุดแนวตั้งใกล้กันเกินไป'); return; } S.cmy = r.len / dyp; if (S.lockRatio && !S.scaled) S.cmx = S.cmy; }
  else { if (dp < 3) { toast('2 จุดใกล้กันเกินไป'); return; } const ratio = S.cmy / S.cmx, k = r.len / Math.hypot(dxp, dyp * ratio); S.cmx = k; S.cmy = k * ratio; }
  S.scaled = true; fit(); ui(); autosave(); toast('ตั้งสเกลแล้ว — แผ่นจริง ' + fmt(IW()) + ' × ' + fmt(IH()) + ' ซม.');
}
function setSize(w, h, which) { if (!(w > 0) || !(h > 0)) return; push(); if (S.lockRatio) { const k = which === 'h' ? h / IH() : w / IW(); S.cmx *= k; S.cmy *= k; } else { S.cmx = w / S.img.width; S.cmy = h / S.img.height; } S.scaled = true; fit(); ui(); autosave(); }
// ---------- ดัดมุมมอง 4 มุม ----------
function solve(A, b) { const n = b.length; for (let i = 0; i < n; i++) { let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r; [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]]; const p = A[i][i]; if (Math.abs(p) < 1e-12) return null;
    for (let r = i + 1; r < n; r++) { const f = A[r][i] / p; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } } const x = new Array(n); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; } return x; }
function homography(dst, src) { const A = [], b = []; for (let i = 0; i < 4; i++) { const [u, v] = dst[i], [x, y] = src[i]; A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x); A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y); } return solve(A, b); }
async function finishPersp() {
  const q = S.persp.map(([x, y]) => [x / S.cmx, y / S.cmy]); S.persp = []; S.tool = 'move'; tools(); hint();
  const wTop = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) * S.cmx, hL = Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1]) * S.cmy;
  const r = await ask('ดัดมุมมอง 4 มุม', 'ขนาดจริงของสี่เหลี่ยมที่แตะ 4 มุม (เช่น ขนาดแผ่นหิน) — ระบบจะดัดรูปให้ตรงและได้สเกลจริงทันที', [{ k: 'w', l: 'กว้าง', v: S.scaled ? r1(wTop) : '', u: 'ซม.' }, { k: 'h', l: 'สูง', v: S.scaled ? r1(hL) : '', u: 'ซม.' }], 'ดัดรูป');
  if (!r || !(r.w > 0) || !(r.h > 0)) { draw(); return; }
  await busy('กำลังดัดรูป…', async () => {
    const srcPx = Math.max(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]), Math.hypot(q[2][0] - q[3][0], q[2][1] - q[3][1])); let k = srcPx / r.w; k = Math.min(k, 4200 / Math.max(r.w, r.h)); k = Math.max(k, 1);
    const ow = Math.max(2, Math.round(r.w * k)), oh = Math.max(2, Math.round(r.h * k));
    const h = homography([[0, 0], [ow, 0], [ow, oh], [0, oh]], q); if (!h) { toast('มุมที่แตะใช้ไม่ได้ — ลองใหม่'); return; }
    const sc = S.img, sw = sc.width, sh = sc.height, sd = sc.getContext('2d').getImageData(0, 0, sw, sh).data;
    const out = document.createElement('canvas'); out.width = ow; out.height = oh; const og = out.getContext('2d'), od = og.createImageData(ow, oh), D = od.data;
    for (let v = 0; v < oh; v++) for (let u = 0; u < ow; u++) { const w0 = h[6] * u + h[7] * v + 1, x = (h[0] * u + h[1] * v + h[2]) / w0, y = (h[3] * u + h[4] * v + h[5]) / w0, o = (v * ow + u) * 4;
      if (x < 0 || y < 0 || x >= sw - 1 || y >= sh - 1) { D[o + 3] = 0; continue; } const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
      for (let c = 0; c < 3; c++) D[o + c] = (sd[i00 + c] * (1 - fx) + sd[i10 + c] * fx) * (1 - fy) + (sd[i01 + c] * (1 - fx) + sd[i11 + c] * fx) * fy; D[o + 3] = 255; }
    og.putImageData(od, 0, 0);
    S.prevImg = { img: S.img, st: JSON.stringify(snapData()), hist: S.hist.slice() }; push(); S.histImgAt = S.hist.length;
    S.img = out; S.cmx = S.cmy = r.w / ow; S.scaled = true; S.pieces = []; S.guides = []; S.sel = []; fit(); ui(); autosave(); toast('ดัดรูปแล้ว — แผ่นจริง ' + fmt(r.w) + ' × ' + fmt(r.h) + ' ซม.');
  });
}
// ---------- Snap ----------
function snapAxis(edges, axis, skip) { const sn = S.snap; if (!sn.on || S.noSnap) return { d: 0, t: null }; const thr = 10 / S.view.z, T = [];
  if (sn.grid && S.grid.on) edges.forEach((e) => { const g = S.grid.step; T.push(Math.round(e / g) * g); });
  if (sn.guide && S.guidesOn) S.guides.forEach((g) => { if (g.o === (axis === 'x' ? 'v' : 'h')) T.push(g.p); });
  if (sn.edge) { T.push(0, axis === 'x' ? IW() : IH()); const j = S.joint / 10; S.pieces.forEach((p) => { if (skip && skip.indexOf(p.id) >= 0) return; const a = axis === 'x' ? p.x : p.y, l = axis === 'x' ? p.w : p.h; T.push(a, a + l, a - j, a + l + j); }); }
  let best = { d: 0, t: null, m: thr }; edges.forEach((e) => T.forEach((t) => { const d = t - e; if (Math.abs(d) < best.m) best = { d, t, m: Math.abs(d) }; })); return best; }
function snapPt(x, y) { const sx = snapAxis([x], 'x'), sy = snapAxis([y], 'y'); S.snapHit = { x: sx.t, y: sy.t }; return [x + sx.d, y + sy.d]; }
// ---------- ชิ้นงาน ----------
function addPiece(x, y, w, h, color) { const p = { id: uid(), n: String(S.next++), x: r1(x), y: r1(y), w, h, c: color || S.color }; S.pieces.push(p); return p; }
function hitPiece(wx, wy) { for (let i = S.pieces.length - 1; i >= 0; i--) { const p = S.pieces[i]; if (wx >= p.x && wx <= p.x + p.w && wy >= p.y && wy <= p.y + p.h) return p; } return null; }
function hitGuide(sx, sy) { if (!S.guidesOn) return -1; for (let i = S.guides.length - 1; i >= 0; i--) { const g = S.guides[i]; const [gx, gy] = toS(g.p, g.p); if ((g.o === 'v' && Math.abs(sx - gx) < 7) || (g.o === 'h' && Math.abs(sy - gy) < 7)) return i; } return -1; }
function selected() { return S.pieces.filter((p) => S.sel.indexOf(p.id) >= 0); }
function makePattern() { const P = selected()[0]; if (!P) return; const g = S.joint / 10, sw = P.w + g, sh = P.h + g; let c = Math.max(1, S.pat.c | 0), r = Math.max(1, S.pat.r | 0);
  if (S.pat.fill) { c = Math.max(1, Math.floor((IW() - P.x + g) / sw)); r = Math.max(1, Math.floor((IH() - P.y + g) / sh)); }
  push(); let n = 0; for (let j = 0; j < r; j++) for (let i = 0; i < c; i++) { if (!i && !j) continue; addPiece(P.x + i * sw, P.y + j * sh, P.w, P.h, P.c); n++; }
  if (S.pat.cut && S.pat.fill) { const rw = r1(IW() - (P.x + c * sw)), rh = r1(IH() - (P.y + r * sh));
    if (rw >= 1) for (let j = 0; j < r; j++) { addPiece(P.x + c * sw, P.y + j * sh, rw, P.h, P.c); n++; }
    if (rh >= 1) for (let i = 0; i < c; i++) { addPiece(P.x + i * sw, P.y + r * sh, P.w, rh, P.c); n++; }
    if (rw >= 1 && rh >= 1) { addPiece(P.x + c * sw, P.y + r * sh, rw, rh, P.c); n++; } }
  ui(); autosave(); toast('สร้างแพทเทิร์นแล้ว +' + n + ' ชิ้น'); }
function renum() { push(); const L = S.pieces.slice().sort((a, b) => (Math.abs(a.y - b.y) > Math.min(a.h, b.h) / 2 ? a.y - b.y : a.x - b.x)); L.forEach((p, i) => { p.n = String(i + 1); }); S.next = L.length + 1; ui(); autosave(); }
// ---------- วาด ----------
function draw() { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; paint(); }); }
function paint() { if (!ctx) return; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#1E1C18'; ctx.fillRect(0, 0, W, H); if (!S.img) return;
  const z = S.view.z, [x0, y0] = toS(0, 0), iw = IW() * z, ih = IH() * z;
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(S.img, x0, y0, iw, ih); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + .5, y0 + .5, iw, ih);
  // ตาราง
  if (S.grid.on) { let st = S.grid.step; while (st * z < 7) st *= 2; ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, iw, ih); ctx.clip(); ctx.lineWidth = 1;
    for (let gx = 0, i = 0; gx <= IW() + 1e-6; gx += st, i++) { const sx = Math.round(x0 + gx * z) + .5; ctx.strokeStyle = (Math.round(gx) % 100 === 0) ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.moveTo(sx, y0); ctx.lineTo(sx, y0 + ih); ctx.stroke(); }
    for (let gy = 0; gy <= IH() + 1e-6; gy += st) { const sy = Math.round(y0 + gy * z) + .5; ctx.strokeStyle = (Math.round(gy) % 100 === 0) ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.moveTo(x0, sy); ctx.lineTo(x0 + iw, sy); ctx.stroke(); }
    ctx.restore(); }
  // ไกด์
  if (S.guidesOn) { ctx.save(); ctx.setLineDash([7, 5]); ctx.lineWidth = 1.5; S.guides.forEach((g, i) => { ctx.strokeStyle = S.dragG === i ? '#FFD54A' : '#22D3EE'; ctx.beginPath(); if (g.o === 'v') { const sx = toS(g.p, 0)[0]; ctx.moveTo(sx, 0); ctx.lineTo(sx, H); } else { const sy = toS(0, g.p)[1]; ctx.moveTo(0, sy); ctx.lineTo(W, sy); } ctx.stroke(); }); ctx.restore(); }
  // ชิ้นงาน
  S.pieces.forEach((p) => { const [px, py] = toS(p.x, p.y), pw = p.w * z, ph = p.h * z, on = S.sel.indexOf(p.id) >= 0;
    ctx.fillStyle = hexA(p.c, on ? .22 : .12); ctx.fillRect(px, py, pw, ph); ctx.lineWidth = on ? 3 : 2; ctx.strokeStyle = on ? '#FFD54A' : p.c; ctx.strokeRect(px, py, pw, ph);
    const fs = Math.max(9, Math.min(28, Math.min(pw, ph) / 3.2)); if (pw > 26 && ph > 18) { ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 3;
      ctx.font = `800 ${fs}px "IBM Plex Sans Thai",system-ui,sans-serif`; ctx.fillText(p.n, px + pw / 2, py + ph / 2 - (ph > fs * 2.6 ? fs * .45 : 0));
      if (ph > fs * 2.6 && pw > 50) { ctx.font = `600 ${Math.max(9, fs * .48)}px "IBM Plex Sans Thai",system-ui,sans-serif`; ctx.fillText(fmt(p.w) + '×' + fmt(p.h), px + pw / 2, py + ph / 2 + fs * .55); } ctx.shadowBlur = 0; } });
  // Snap ที่ติดอยู่
  if (S.snapHit && S.dragging) { ctx.save(); ctx.strokeStyle = '#FF3DA6'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); if (S.snapHit.x != null) { const sx = toS(S.snapHit.x, 0)[0]; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke(); } if (S.snapHit.y != null) { const sy = toS(0, S.snapHit.y)[1]; ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke(); } ctx.restore(); }
  // จุดตั้งสเกล / 4 มุม
  const pts = S.tool === 'persp' ? S.persp : S.cal; if (pts.length) { ctx.save(); ctx.strokeStyle = '#FFD54A'; ctx.fillStyle = '#FFD54A'; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((q, i) => { const [sx, sy] = toS(q[0], q[1]); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); });
    if (S.hover && pts.length < (S.tool === 'persp' ? 4 : 2)) { const [hx, hy] = toS(S.hover[0], S.hover[1]); ctx.lineTo(hx, hy); } ctx.stroke(); pts.forEach((q) => { const [sx, sy] = toS(q[0], q[1]); ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 7); ctx.fill(); }); ctx.restore(); }
  // ตัวอย่างชิ้นที่จะวาง
  if (S.tool === 'piece' && S.hover) { const [hx, hy] = snapPreview(); const [sx, sy] = toS(hx, hy); ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = S.color; ctx.lineWidth = 2; ctx.strokeRect(sx, sy, S.defW * z, S.defH * z); ctx.restore(); }
}
function snapPreview() { const [x, y] = S.hover; const sx = snapAxis([x, x + S.defW], 'x'), sy = snapAxis([y, y + S.defH], 'y'); return [x + sx.d, y + sy.d]; }
function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
// ---------- เมาส์ / นิ้ว ----------
const PT = new Map(); let drag = null;
function pos(e) { const r = $('#slCw', root).getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function pDown(e) { if (!S.img) return; const cw = $('#slCw', root); try { cw.setPointerCapture(e.pointerId); } catch (x) {} PT.set(e.pointerId, pos(e)); S.noSnap = e.altKey;
  if (PT.size === 2) { const [a, b] = [...PT.values()]; drag = { t: 'pinch', d: Math.hypot(a[0] - b[0], a[1] - b[1]), c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], z: S.view.z, ox: S.view.ox, oy: S.view.oy }; return; }
  const [sx, sy] = pos(e), [wx, wy] = toW(sx, sy);
  if (e.button === 1 || e.button === 2 || S.space) { drag = { t: 'pan', sx, sy, ox: S.view.ox, oy: S.view.oy }; return; }
  if (S.tool === 'scale' || S.tool === 'persp') { const L = S.tool === 'persp' ? S.persp : S.cal; L.push([wx, wy]); draw(); hint(); if (S.tool === 'scale' && L.length === 2) finishCal(); if (S.tool === 'persp' && L.length === 4) finishPersp(); return; }
  if (S.tool === 'piece') { push(); S.hover = [wx, wy]; const [x, y] = snapPreview(); const p = addPiece(x, y, S.defW, S.defH); S.sel = [p.id]; panel(); stat(); steps(); draw(); autosave(); return; }
  if (S.tool === 'gv' || S.tool === 'gh') { push(); const [x, y] = snapPt(wx, wy); S.guides.push({ o: S.tool === 'gv' ? 'v' : 'h', p: r1(S.tool === 'gv' ? x : y) }); S.guidesOn = true; ui(); autosave(); return; }
  const gi = hitGuide(sx, sy), p = hitPiece(wx, wy);
  if (p) { if (e.shiftKey) { const i = S.sel.indexOf(p.id); if (i >= 0) S.sel.splice(i, 1); else S.sel.push(p.id); } else if (S.sel.indexOf(p.id) < 0) S.sel = [p.id];
    push(); const L = selected(); drag = { t: 'move', wx, wy, start: L.map((q) => [q.id, q.x, q.y]), moved: false }; S.dragging = true; panel(); stat(); draw(); return; }
  if (gi >= 0) { push(); drag = { t: 'guide', i: gi }; S.dragG = gi; draw(); return; }
  if (!e.shiftKey) { S.sel = []; panel(); stat(); } drag = { t: 'pan', sx, sy, ox: S.view.ox, oy: S.view.oy, click: true }; draw(); }
function pMove(e) { if (!S.img) return; const P0 = pos(e); if (PT.has(e.pointerId)) PT.set(e.pointerId, P0); const [sx, sy] = P0, [wx, wy] = toW(sx, sy); S.cursor = [wx, wy]; S.hover = [wx, wy]; S.noSnap = e.altKey;
  if (!drag) { if (S.tool !== 'move') draw(); stat(); return; }
  if (drag.t === 'pinch' && PT.size >= 2) { const [a, b] = [...PT.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], k = d / drag.d; const nz = Math.max(.02, Math.min(80, drag.z * k));
    S.view.z = nz; S.view.ox = c[0] - (drag.c[0] - drag.ox) * (nz / drag.z); S.view.oy = c[1] - (drag.c[1] - drag.oy) * (nz / drag.z); draw(); return; }
  if (drag.t === 'pan') { S.view.ox = drag.ox + sx - drag.sx; S.view.oy = drag.oy + sy - drag.sy; if (Math.abs(sx - drag.sx) + Math.abs(sy - drag.sy) > 3) drag.click = false; draw(); return; }
  if (drag.t === 'guide') { const g = S.guides[drag.i]; const [x, y] = snapPt(wx, wy); g.p = r1(g.o === 'v' ? x : y); S.dragging = true; draw(); return; }
  if (drag.t === 'move') { let dx = wx - drag.wx, dy = wy - drag.wy; const L = selected(); if (!L.length) return; const ids = L.map((p) => p.id);
    const bx = Math.min(...drag.start.map((s) => s[1])) + dx, by = Math.min(...drag.start.map((s) => s[2])) + dy, bw = Math.max(...drag.start.map((s, i) => s[1] + L[i].w)) - Math.min(...drag.start.map((s) => s[1])), bh = Math.max(...drag.start.map((s, i) => s[2] + L[i].h)) - Math.min(...drag.start.map((s) => s[2]));
    const snx = snapAxis([bx, bx + bw], 'x', ids), sny = snapAxis([by, by + bh], 'y', ids); dx += snx.d; dy += sny.d; S.snapHit = { x: snx.t, y: sny.t };
    drag.start.forEach(([id, x, y]) => { const p = S.pieces.find((q) => q.id === id); if (p) { p.x = r1(x + dx); p.y = r1(y + dy); } }); drag.moved = true; draw(); stat(); } }
function pUp(e) { PT.delete(e.pointerId); if (drag && drag.t === 'pinch' && PT.size) { drag = null; return; }
  if (drag) { if (drag.t === 'move' && !drag.moved) S.hist.pop(); if (drag.t === 'move' || drag.t === 'guide') { autosave(); panel(); } if (drag.t === 'guide') { S.dragG = -1; const g = S.guides[drag.i]; if (g && ((g.o === 'v' && (g.p < -50 || g.p > IW() + 50)) || (g.o === 'h' && (g.p < -50 || g.p > IH() + 50)))) { S.guides.splice(drag.i, 1); toast('ลบเส้นไกด์แล้ว (ลากออกนอกแผ่น)'); } panel(); bar(); } }
  drag = null; S.dragging = false; S.snapHit = null; draw(); }
function onWheel(e) { if (!S.img) return; e.preventDefault(); const [sx, sy] = pos(e), k = Math.exp(-e.deltaY * 0.0015), nz = Math.max(.02, Math.min(80, S.view.z * k));
  S.view.ox = sx - (sx - S.view.ox) * (nz / S.view.z); S.view.oy = sy - (sy - S.view.oy) * (nz / S.view.z); S.view.z = nz; draw(); stat(); }
function zoomBy(k) { const cx = W / 2, cy = H / 2, nz = Math.max(.02, Math.min(80, S.view.z * k)); S.view.ox = cx - (cx - S.view.ox) * (nz / S.view.z); S.view.oy = cy - (cy - S.view.oy) * (nz / S.view.z); S.view.z = nz; draw(); stat(); }
// ---------- ปุ่ม ----------
function setTool(t) { S.tool = S.tool === t && t !== 'move' ? 'move' : t; S.cal = []; S.persp = []; S.calAxis = ''; tools(); hint(); draw(); }
async function onClick(e) { const t = e.target;
  const tl = t.closest('[data-tool]'); if (tl && !tl.disabled) { setTool(tl.dataset.tool); if (innerWidth <= 760 && tl.closest('#slPan')) { S.panel = false; panel(); } return; }
  const stp = t.closest('[data-step]'); if (stp) { const i = +stp.dataset.step; if (i === 0) $('#slFile', root).click(); else if (i === 1) setTool('scale'); else if (i === 2) { S.panel = true; panel(); const el = $('[data-g="sl-ratio"]', root); if (el) el.scrollIntoView({ behavior: 'smooth' }); } else if (i === 3) { S.snapMenu = true; bar(); } else if (i === 4) setTool('piece'); return; }
  const pre = t.closest('[data-pre]'); if (pre) { const [a, b] = pre.dataset.pre.split('x').map(Number); S.defW = a; S.defH = b; panel(); hint(); return; }
  const col = t.closest('[data-col]'); if (col) { S.color = col.dataset.col; panel(); return; }
  const pc = t.closest('[data-pcol]'); if (pc) { push(); selected().forEach((p) => { p.c = pc.dataset.pcol; }); draw(); autosave(); return; }
  const gx = t.closest('[data-gx]'); if (gx) { push(); S.guides.splice(+gx.dataset.gx, 1); ui(); autosave(); return; }
  if (S.snapMenu && !t.closest('.sl-menu') && !t.closest('[data-sl="snapmenu"]')) { S.snapMenu = false; bar(); }
  const b = t.closest('[data-sl]'); if (!b) return; return act(b.dataset.sl, b);
}
async function act(a, b) {
  if (a === 'close') return close();
  if (a === 'pick') return $('#slFile', root).click();
  if (a === 'json') return $('#slJson', root).click();
  if (a === 'last') return loadLast();
  if (a === 'undo') return undo();
  if (a === 'panel') { S.panel = !S.panel; panel(); return; }
  if (!S.img) return;
  if (a === 'grid') { S.grid.on = !S.grid.on; bar(); steps(); draw(); autosave(); }
  else if (a === 'guides') { S.guidesOn = !S.guidesOn; bar(); draw(); }
  else if (a === 'snapmenu') { S.snapMenu = !S.snapMenu; S.snapMenuX = b ? b.offsetLeft : 200; bar(); }
  else if (a === 'fit') fit(); else if (a === 'zin') zoomBy(1.25); else if (a === 'zout') zoomBy(0.8);
  else if (a === 'calx' || a === 'caly') { S.tool = 'scale'; S.cal = []; S.calAxis = a === 'calx' ? 'x' : 'y'; S.lockRatio = false; tools(); hint(); if (innerWidth <= 760) { S.panel = false; panel(); } }
  else if (a === 'stretch') { const kx = parseFloat($('[data-in="sx"]', root).value) / 100, ky = parseFloat($('[data-in="sy"]', root).value) / 100; if (kx > 0 && ky > 0 && (kx !== 1 || ky !== 1)) { push(); S.cmx *= kx; S.cmy *= ky; fit(); ui(); autosave(); toast('ปรับสัดส่วนแล้ว'); } }
  else if (a === 'unpersp') restorePrev();
  else if (a === 'gclear') { push(); S.guides = []; ui(); autosave(); }
  else if (a === 'swapd') { [S.defW, S.defH] = [S.defH, S.defW]; panel(); hint(); }
  else if (a === 'center') { push(); const p = addPiece(IW() / 2 - S.defW / 2, IH() / 2 - S.defH / 2, S.defW, S.defH); S.sel = [p.id]; ui(); autosave(); }
  else if (a === 'rot') { push(); selected().forEach((p) => { const cx = p.x + p.w / 2, cy = p.y + p.h / 2; [p.w, p.h] = [p.h, p.w]; p.x = r1(cx - p.w / 2); p.y = r1(cy - p.h / 2); }); ui(); autosave(); }
  else if (a === 'dup') { push(); const n = selected().map((p) => addPiece(p.x + p.w + S.joint / 10, p.y, p.w, p.h, p.c)); S.sel = n.map((p) => p.id); ui(); autosave(); }
  else if (a === 'del') { push(); S.pieces = S.pieces.filter((p) => S.sel.indexOf(p.id) < 0); S.sel = []; ui(); autosave(); }
  else if (a === 'pattern') makePattern();
  else if (a === 'renum') renum();
  else if (a === 'selall') { S.sel = S.pieces.map((p) => p.id); ui(); }
  else if (a === 'clear') { if (await ask('ลบชิ้นงานทั้งหมด?', 'ย้อนกลับได้ด้วย ↶ ย้อน', [], 'ลบทั้งหมด')) { push(); S.pieces = []; S.sel = []; S.next = 1; ui(); autosave(); } }
  else if (a === 'png') exportPng(); else if (a === 'csv') exportCsv(); else if (a === 'savejson') saveJson(); }
function onInput(e) { const t = e.target; if (t.dataset.pt) { const k = t.dataset.pt; S.pat[k] = t.type === 'checkbox' ? t.checked : parseFloat(t.value) || 1; return; } }
function onChange(e) { const t = e.target, v = parseFloat(t.value);
  if (t.dataset.snap) { S.snap[t.dataset.snap] = t.checked; bar(); return; }
  if (t.dataset.in === 'gstep') { if (t.value === 'x') { ask('ระยะตาราง', 'ระยะห่างของเส้นตาราง', [{ k: 's', l: 'ระยะ', v: S.grid.step, u: 'ซม.' }]).then((r) => { if (r && r.s > 0) S.grid.step = r.s; bar(); draw(); }); return; } S.grid.step = v; S.grid.on = true; bar(); steps(); draw(); autosave(); return; }
  if (t.dataset.in === 'lock') { S.lockRatio = t.checked; return; }
  if (t.dataset.in === 'iw' || t.dataset.in === 'ih') { const w = parseFloat($('[data-in="iw"]', root).value), h = parseFloat($('[data-in="ih"]', root).value); setSize(w, h, t.dataset.in === 'ih' ? 'h' : 'w'); return; }
  if (t.dataset.in === 'dw' && v > 0) { S.defW = v; hint(); return; } if (t.dataset.in === 'dh' && v > 0) { S.defH = v; hint(); return; }
  if (t.dataset.in === 'joint' && v >= 0) { S.joint = v; autosave(); panel(); return; }
  if (t.dataset.gp) { push(); S.guides[+t.dataset.gp].p = v || 0; draw(); autosave(); return; }
  if (t.dataset.pe) { const p = selected()[0]; if (!p) return; push(); const k = t.dataset.pe; if (k === 'n') p.n = t.value.trim() || p.n; else if (v > 0 || k === 'x' || k === 'y') p[k] = r1(v || 0); ui(); autosave(); return; }
  if (t.dataset.pt) { S.pat[t.dataset.pt] = t.type === 'checkbox' ? t.checked : (parseFloat(t.value) || 1); } }
function onKey(e) { if (!S.open) return; const tg = e.target, typing = /INPUT|TEXTAREA|SELECT/.test(tg.tagName);
  if (e.key === ' ' && !typing) { S.space = e.type === 'keydown'; e.preventDefault(); return; } if (e.type !== 'keydown') return;
  if (window.WCGuide && WCGuide.active && WCGuide.active()) return;
  if (e.key === 'Escape') { if ($('.sl-dlg', root)) return; if (S.tool !== 'move') { setTool('move'); } else if (S.sel.length) { S.sel = []; ui(); } e.preventDefault(); return; }
  if (typing) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); if (S.sel.length) act('dup'); return; }
  if (!S.sel.length) return; const st = e.shiftKey ? 5 : 0.5; let dx = 0, dy = 0;
  if (e.key === 'ArrowLeft') dx = -st; else if (e.key === 'ArrowRight') dx = st; else if (e.key === 'ArrowUp') dy = -st; else if (e.key === 'ArrowDown') dy = st;
  if (dx || dy) { e.preventDefault(); push(); selected().forEach((p) => { p.x = r1(p.x + dx); p.y = r1(p.y + dy); }); draw(); panel(); autosave(); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); push(); S.pieces = S.pieces.filter((p) => S.sel.indexOf(p.id) < 0); S.sel = []; ui(); autosave(); return; }
  if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); act('rot'); } }
// ---------- ส่งออก ----------
const today = () => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); };
function dl(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
const fname = (ext) => (S.name || 'slab').replace(/[\\/:*?"<>|]+/g, '_') + '_slab-layout_' + today().split('/').reverse().join('') + '.' + ext;
async function exportPng() { if (!S.img) return; await busy('กำลังสร้างภาพ…', async () => {
  const k = Math.min(12, 5000 / Math.max(IW(), IH())), w = Math.round(IW() * k), h = Math.round(IH() * k), foot = Math.max(46, Math.round(w * 0.03));
  const c = document.createElement('canvas'); c.width = w; c.height = h + foot; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(S.img, 0, 0, w, h);
  S.pieces.forEach((p) => { const x = p.x * k, y = p.y * k, pw = p.w * k, ph = p.h * k; g.fillStyle = hexA(p.c, .10); g.fillRect(x, y, pw, ph); g.lineWidth = Math.max(2, k * .25); g.strokeStyle = p.c; g.strokeRect(x, y, pw, ph);
    const fs = Math.max(12, Math.min(pw, ph) / 3.4); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,.85)'; g.shadowBlur = 4; g.font = `800 ${fs}px "IBM Plex Sans Thai",sans-serif`; g.fillText(p.n, x + pw / 2, y + ph / 2 - fs * .4);
    g.font = `600 ${fs * .45}px "IBM Plex Sans Thai",sans-serif`; g.fillText(fmt(p.w) + '×' + fmt(p.h), x + pw / 2, y + ph / 2 + fs * .5); g.shadowBlur = 0; });
  const area = S.pieces.reduce((a, p) => a + p.w * p.h / 10000, 0); g.fillStyle = '#1C1B18'; g.fillRect(0, h, w, foot); g.fillStyle = '#F6F1E8'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = `600 ${Math.round(foot * .36)}px "IBM Plex Sans Thai",sans-serif`;
  g.fillText(`Slab Layout · ${S.name} · แผ่น ${fmt(IW())} × ${fmt(IH())} ซม. · ${S.pieces.length} ชิ้น · ${area.toFixed(2)} ตร.ม. · ร่อง ${S.joint} มม. · ${today()} · Wellcon Interior`, Math.round(foot * .4), h + foot / 2);
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/png')); dl(blob, fname('png')); toast('บันทึกภาพแผนตัดแล้ว'); }); }
function exportCsv() { if (!S.pieces.length) { toast('ยังไม่มีชิ้นงาน'); return; } const L = [['หมายเลข', 'กว้าง (ซม.)', 'ยาว (ซม.)', 'ตำแหน่ง X (ซม.)', 'ตำแหน่ง Y (ซม.)', 'พื้นที่ (ตร.ม.)']];
  S.pieces.slice().sort((a, b) => (parseFloat(a.n) || 0) - (parseFloat(b.n) || 0)).forEach((p) => L.push([p.n, fmt(p.w), fmt(p.h), fmt(p.x), fmt(p.y), (p.w * p.h / 10000).toFixed(3)]));
  const sum = {}; S.pieces.forEach((p) => { const k = fmt(Math.min(p.w, p.h)) + ' × ' + fmt(Math.max(p.w, p.h)); sum[k] = (sum[k] || 0) + 1; });
  L.push([]); L.push(['สรุปตามขนาด', 'จำนวน']); Object.keys(sum).sort().forEach((k) => L.push([k, sum[k]])); L.push(['รวม', S.pieces.length]); L.push([]); L.push(['แผ่น', S.name, fmt(IW()) + ' × ' + fmt(IH()) + ' ซม.', 'ร่อง ' + S.joint + ' มม.', today()]);
  const csv = '﻿' + L.map((r) => r.map((x) => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"').join(',')).join('\r\n'); dl(new Blob([csv], { type: 'text/csv;charset=utf-8' }), fname('csv')); toast('บันทึกรายการตัดแล้ว (เปิดด้วย Excel ได้)'); }
async function saveJson() { if (!S.img) return; await busy('กำลังบันทึกงาน…', async () => { const img = S.img.toDataURL('image/jpeg', 0.9); dl(new Blob([JSON.stringify({ app: 'wellcon-slab', v: VER, name: S.name, at: new Date().toISOString(), img, st: snapData() })], { type: 'application/json' }), fname('json')); toast('บันทึกงานแล้ว — เปิดต่อได้ที่ 📂 เปิดงาน'); }); }
// ---------- เปิด / ปิด ----------
let prevKey = '';
async function open() { if (!root) { build(); document.addEventListener('keydown', onKey, true); document.addEventListener('keyup', onKey, true); } root.hidden = false; S.open = true; if (innerWidth <= 760) S.panel = false;   // มือถือ: แผงตั้งค่าปิดไว้ก่อน (กด ⚙ เปิด) ให้เห็นรูปเต็ม
  prevKey = document.documentElement.getAttribute('data-demo-key') || ''; document.documentElement.setAttribute('data-demo-key', 'tab:slab');
  resize(); ui(); if (!S.img) { const L = await DB.get('last'); if (L && L.blob) { S.lastAt = L.at; S.lastName = L.name; startPane(); } } }
function close() { if (!root) return; root.hidden = true; S.open = false; if (prevKey) document.documentElement.setAttribute('data-demo-key', prevKey); else document.documentElement.setAttribute('data-demo-key', 'tab:photo'); }
window.WCSlab = { VER, open, close, isOpen: () => S.open, _S: S };
// ?slab=1 → เปิดโหมดนี้เลย (จาก Learning Center / ลิงก์)
try { if (new URLSearchParams(location.search).get('slab')) { let n = 0; const go = () => { const m = document.getElementById('scrMain'); if (m && !m.hidden) open(); else if (n++ < 60) setTimeout(go, 250); }; setTimeout(go, 300); } } catch (e) {}   // เปิดได้เฉพาะเมื่อเข้าสู่ระบบ / มีสิทธิ์ Photo Editor แล้ว
})();
