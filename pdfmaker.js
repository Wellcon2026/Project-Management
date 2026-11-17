/* =====================================================================
   Wellcon PDF Maker — อ่าน · แทรกหน้า · รวมไฟล์ · ลายเซ็นสำเร็จรูป · กรอกฟอร์ม · แก้ข้อความ (ปิดทับ) · บันทึก · พิมพ์
   ---------------------------------------------------------------------
   • หน้าแยกใน Wellcon PM: pdf.html (+ ?env=staging) · ติดตั้งเป็นไอคอนแยกได้ (pdf.webmanifest) · ใช้การเข้าสู่ระบบของ Wellcon PM
   • ทำงานในเบราว์เซอร์ทั้งหมด — ไฟล์ไม่ถูกอัปโหลดขึ้นเซิร์ฟเวอร์ · ไฟล์ต้นฉบับไม่ถูกแก้ (บันทึกเป็นไฟล์ใหม่)
   • ไลบรารีฟรี: pdf.js 3.11.174 (Apache 2.0 · แสดงหน้า) · pdf-lib 1.17.1 (MIT · สร้างไฟล์) — vendor/LICENSES-PDF.txt
   • ภาษาไทย: ข้อความที่พิมพ์ / กรอก วาดผ่านเบราว์เซอร์ (จัดสระ-วรรณยุกต์ถูก) แล้ววางเป็นภาพความละเอียดสูง (≈288 dpi) — เลือกคัดลอกข้อความนั้นไม่ได้
   • ลายเซ็น / ตราบริษัท: เก็บในเครื่องนี้เท่านั้น (localStorage แยกตามผู้ใช้) — ไม่ขึ้นเซิร์ฟเวอร์ · เป็นลายเซ็นแบบภาพ ไม่ใช่ลายเซ็นดิจิทัลที่มีใบรับรอง
   • แก้ข้อความ = ปิดทับด้วยแถบขาว + พิมพ์ใหม่ · ข้อความเดิมยังอยู่ใต้แถบ เว้นแต่เลือก "ลบข้อความเดิมจริง" (แปลงหน้านั้นเป็นภาพ)
   • ไฟล์ที่บันทึกมีข้อมูลกำกับ (metadata): ผู้แก้ · วันที่ · จำนวนลายเซ็น / จุดที่ปิดทับ — ตรวจย้อนได้
   ===================================================================== */
(() => {
'use strict';
const PM_VER = 'v1.1.0';
const CFG = {
  url: 'https://botecmzshubflokkdant.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvdGVjbXpzaHViZmxva2tkYW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MDYyNDIsImV4cCI6MjEwMDk4MjI0Mn0.30LVGfjbT1TcZSBszenrZcNp3_k1oZpPNMbmSrF1rzo'
};
const SCHEMA = (() => { const h = location.hostname, q = location.search;
  if (/[?&]env=prod/.test(q)) return 'public';
  if (/[?&]env=staging/.test(q) || /staging/i.test(h) || (h !== '' && !/vercel\.app$/i.test(h))) return 'staging';
  return 'public'; })();
const IS_STG = SCHEMA === 'staging';
const SESS_KEY = 'wellcon_pm_session_v1', SESS_DAYS = 14, TAB = 'tab:pdf';
const A4 = [595.28, 841.89], K = 4, FONT = "'IBM Plex Sans Thai', 'Sarabun', 'Leelawadee UI', 'Tahoma', sans-serif";
const sb = window.supabase.createClient(CFG.url, CFG.anonKey, { db: { schema: SCHEMA }, auth: { persistSession: true, autoRefreshToken: true } });
pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s || '').trim().toLowerCase();
const nickOf = (a) => a ? (String(a.nick || '').trim() || a.name || a.username || a.email || '') : '';
const uid = (p) => (p || 'i') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pad2 = (n) => String(n).padStart(2, '0');
const dmy = (d) => pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
const pmUrl = () => '/' + (IS_STG ? '?env=staging' : '');
let toastT = null;
function toast(m, ms) { const t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 2600); }
function busy(on, txt) { $('busy').hidden = !on; if (txt) $('busyTxt').textContent = txt; }

const APP = { me: null, docs: [], pages: [], cur: 0, mode: 'select', zoom: 1, s: 1, sel: null, sigs: [], dirty: false, thumbs: {} };

// =====================================================================
// เข้าสู่ระบบ + สิทธิ์ (การ์ด tab:pdf ในตารางสิทธิ์ · ปิดทั้งระบบได้)
// =====================================================================
function msg(t, s) { $('msgBody').innerHTML = `<img src="pdf-icon.svg" alt="" style="width:80px;height:80px"><h1 style="font-size:20px;margin:0">${t}</h1><p>${s}</p><a class="btn dk" style="text-decoration:none" href="${pmUrl()}">ไปหน้า Wellcon PM</a>`; }
async function boot() {
  if (IS_STG) document.querySelectorAll('.scr').forEach(s => { const d = document.createElement('div'); d.className = 'stg'; d.textContent = 'โหมดทดสอบ (staging)'; s.prepend(d); });
  try {
    let ok = false; try { const r = await sb.auth.getSession(); ok = !!(r && r.data && r.data.session); } catch (e) {}
    if (!ok) { msg('ยังไม่ได้เชื่อมต่อ Wellcon PM ในเครื่องนี้', 'เข้าสู่ระบบที่ Wellcon PM ก่อน แล้วเปิด “PDF Maker” จากหน้าแรก'); return; }
    const [a, st] = await Promise.all([sb.from('accounts').select('id,data'), sb.from('app_state').select('id,data').in('id', ['featGlobal', 'workPages', 'workUser', 'workUserAdd'])]);
    if (a.error) throw a.error;
    const accs = (a.data || []).map(r => ({ ...(r.data || {}), id: r.id }));
    let sess = null; try { sess = JSON.parse(localStorage.getItem(SESS_KEY) || 'null'); } catch (e) {}
    const acc = sess && sess.email && Date.now() - Number(sess.at || 0) < SESS_DAYS * 864e5 && accs.find(x => norm(x.email) === norm(sess.email) && x.active !== false && !x.disabled);
    if (!acc) { msg('ยังไม่ได้เข้าสู่ระบบ Wellcon PM ในเครื่องนี้', 'เข้าสู่ระบบที่ Wellcon PM ก่อน แล้วเปิด “PDF Maker” จากหน้าแรก'); return; }
    APP.me = { email: norm(acc.email), name: nickOf(acc), full: acc.name || nickOf(acc), role: acc.roleKey || '' };
    const sv = (id) => { const r = ((!st.error && st.data) || []).find(x => x.id === id); return (r && r.data && r.data.v) || {}; };
    if (sv('featGlobal')[TAB] === false) { msg('ผู้ดูแลระบบปิด PDF Maker ไว้', 'ถ้าต้องการใช้งาน แจ้ง Admin เปิดที่ ตั้งค่าระบบ → ตารางสิทธิ์ตามตำแหน่ง'); return; }
    const WP = sv('workPages'), rl = WP[APP.me.role], mine = [...(sv('workUser')[APP.me.email] || []), ...(sv('workUserAdd')[APP.me.email] || [])];
    if (APP.me.role !== 'superadmin' && Array.isArray(rl) && rl.indexOf(TAB) < 0 && mine.indexOf(TAB) < 0) { msg('PDF Maker ยังไม่ได้เปิดให้ตำแหน่งของคุณ', 'แจ้ง Admin เพิ่ม “PDF Maker” ที่ ตั้งค่าระบบ → ตารางสิทธิ์ตามตำแหน่ง'); return; }
    try { sb.rpc('usage_touch', { p_email: APP.me.email, p_app: 'pdf' }).then(() => {}, () => {}); } catch (e) {}
    if (window.WCTag) WCTag.setup({ sb, app: 'PDF Maker', me: APP.me, accounts: accs.filter(x => x.active !== false && !x.disabled), projects: [] });
    loadSigs();
    $('scrMsg').hidden = true; $('scrMain').hidden = false; renderAll();
    if (document.fonts && document.fonts.load) document.fonts.load('16px "IBM Plex Sans Thai"').catch(() => {});
  } catch (e) { console.error(e); msg('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', esc((e && e.message) || e)); }
}

// =====================================================================
// เปิดไฟล์ / แทรกหน้า
// =====================================================================
const isPdf = (f) => /pdf/i.test(f.type) || /\.pdf$/i.test(f.name);
const isImg = (f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|heic)$/i.test(f.name);
async function loadPdf(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let pj; try { pj = await pdfjsLib.getDocument({ data: bytes.slice() }).promise; }
  catch (e) { if (e && e.name === 'PasswordException') throw new Error(file.name + ' มีรหัสผ่าน — เปิดไม่ได้ (ปลดรหัสก่อน)'); throw new Error(file.name + ' เปิดไม่ได้ — ไฟล์อาจเสีย'); }
  const doc = { id: uid('d'), name: file.name.replace(/\.pdf$/i, ''), bytes, pj, fields: [], enc: false, n: pj.numPages };
  // ช่องฟอร์ม (AcroForm) — อ่านด้วย pdf-lib เพื่อรู้ชื่อช่อง · ชนิด · ตำแหน่ง
  try { const lib = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false }); doc.enc = !!lib.isEncrypted;
    if (!doc.enc) doc.fields = readFields(lib); } catch (e) { console.warn('form read', e); }
  APP.docs.push(doc); return doc;
}
function readFields(lib) {
  const out = []; let form; try { form = lib.getForm(); } catch (e) { return out; }
  const pages = lib.getPages(), refIdx = new Map(pages.map((p, i) => [p.ref.toString(), i]));
  const pageOfWidget = (w) => { const P = w.P && w.P(); if (P && refIdx.has(P.toString())) return refIdx.get(P.toString());
    for (let i = 0; i < pages.length; i++) { const an = pages[i].node.Annots(); if (!an) continue; for (let j = 0; j < an.size(); j++) { const r = an.get(j); if (r && r.toString && lib.context.lookup(r) === w.dict) return i; } } return -1; };
  const L = PDFLib;   // ตรวจชนิดด้วย instanceof (ไฟล์ย่อขนาดเปลี่ยนชื่อคลาส)
  form.getFields().forEach(f => { let kind = '', value = '', options = [], multiline = false;
    try {
      if (f instanceof L.PDFTextField) { kind = 'text'; value = f.getText() || ''; multiline = f.isMultiline(); }
      else if (f instanceof L.PDFCheckBox) { kind = 'check'; value = f.isChecked(); }
      else if (f instanceof L.PDFDropdown || f instanceof L.PDFOptionList) { kind = 'select'; options = f.getOptions(); value = (f.getSelected() || [])[0] || ''; }
      else if (f instanceof L.PDFRadioGroup) { kind = 'radio'; options = f.getOptions(); value = f.getSelected() || ''; }
      else return;
    } catch (e) { return; }
    const widgets = [];
    f.acroField.getWidgets().forEach(w => { const pi = pageOfWidget(w); if (pi < 0) return; const r = w.getRectangle(), pg = pages[pi], cb = pg.getCropBox();
      widgets.push({ pi, x: r.x - cb.x, y: cb.y + cb.height - (r.y + r.height), w: r.width, h: r.height }); });
    if (!widgets.length) return;
    if (kind === 'radio') widgets.splice(1);   // ตัวเลือกวงกลม: แสดงเป็นเมนูเลือกที่ปุ่มแรก
    out.push({ key: uid('f'), name: f.getName(), kind, value, orig: value, options, multiline, widgets, dirty: false });
  });
  return out;
}
async function pageEntriesOf(doc) { const L = [];
  for (let i = 0; i < doc.n; i++) { const pg = await doc.pj.getPage(i + 1), vp = pg.getViewport({ scale: 1 });
    L.push({ id: uid('p'), kind: 'pdf', doc: doc.id, idx: i, w: vp.width, h: vp.height, rot: (pg.rotate || 0) % 360, items: [], raster: false }); }
  return L; }
async function imgEntry(file) { const url = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(file); });
  const im = await loadImage(url); const land = im.width > im.height * 1.05;
  // แปลงเป็น JPEG คุณภาพสูง (รองรับทุกชนิดรูป · ไฟล์ไม่ใหญ่เกิน)
  const c = document.createElement('canvas'), m = Math.min(1, 2400 / Math.max(im.width, im.height)); c.width = Math.round(im.width * m); c.height = Math.round(im.height * m);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
  return { id: uid('p'), kind: 'img', img: { url: c.toDataURL('image/jpeg', 0.9), iw: c.width, ih: c.height, name: file.name }, w: land ? A4[1] : A4[0], h: land ? A4[0] : A4[1], rot: 0, items: [], raster: false }; }
const loadImage = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('เปิดรูปไม่ได้')); i.src = src; });
async function addFiles(files, at) {
  const list = [...files].filter(f => isPdf(f) || isImg(f)); if (!list.length) { toast('รองรับเฉพาะไฟล์ PDF และรูป'); return; }
  busy(true, 'กำลังเปิดไฟล์…'); let pos = at == null ? APP.pages.length : at, added = 0;
  try { for (const f of list) { const E = isPdf(f) ? await pageEntriesOf(await loadPdf(f)) : [await imgEntry(f)]; APP.pages.splice(pos, 0, ...E); pos += E.length; added += E.length; } }
  catch (e) { console.error(e); toast((e && e.message) || 'เปิดไฟล์ไม่สำเร็จ', 5000); }
  busy(false); if (!added) return;
  if (at != null) APP.cur = at; APP.dirty = APP.dirty || APP.pages.length > added; renderAll();
  const nf = APP.docs.reduce((n, d) => n + d.fields.length, 0); toast('เพิ่ม ' + added + ' หน้า' + (nf ? ' · พบช่องกรอกฟอร์ม ' + nf + ' ช่อง' : ''));
}
function addBlank(at) { const ref = APP.pages[APP.cur]; const w = ref && ref.kind !== 'img' && !ref.rot ? ref.w : A4[0], h = ref && ref.kind !== 'img' && !ref.rot ? ref.h : A4[1];
  APP.pages.splice(at, 0, { id: uid('p'), kind: 'blank', w, h, rot: 0, items: [], raster: false }); APP.cur = at; APP.dirty = true; renderAll(); toast('แทรกหน้าว่างแล้ว'); }

// =====================================================================
// แสดงผล
// =====================================================================
const docOf = (id) => APP.docs.find(d => d.id === id);
const curPage = () => APP.pages[APP.cur];
async function drawPage(p, canvas, scale, opt) {   // opt.forExport: ปิดการวาดช่องฟอร์มเดิม (ใส่ค่าใหม่เอง)
  const dpr = opt && opt.dpr || 1, W = Math.round(p.w * scale * dpr), H = Math.round(p.h * scale * dpr);
  canvas.width = W; canvas.height = H; const g = canvas.getContext('2d', { willReadFrequently: true });
  const ur = p.urot || 0;
  if (p.kind === 'pdf') { const d = docOf(p.doc), pg = await d.pj.getPage(p.idx + 1);
    // พื้นใส → ซ่อมรอยต่อแถบรูป → ค่อยรองพื้นขาว (รูปจากแอปสแกน / มือถือมักเก็บเป็นแถบบาง ๆ — วาดเอียง / หมุนแล้วเห็นเส้นขาว)
    await pg.render({ canvasContext: g, background: 'rgba(0,0,0,0)', viewport: pg.getViewport({ scale: scale * dpr, rotation: ((pg.rotate || 0) + ur) % 360 }), annotationMode: opt && opt.noForms ? pdfjsLib.AnnotationMode.DISABLE : pdfjsLib.AnnotationMode.ENABLE }).promise;
    healSeams(g, W, H); g.save(); g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore(); return; }
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  if (p.kind === 'img') { const im = await loadImage(p.img.url), [bw, bh] = baseWH(p), r = imgRect(p), k = scale * dpr;
    g.save(); g.translate(W / 2, H / 2); g.rotate(ur * Math.PI / 180); g.drawImage(im, (r.x - bw / 2) * k, (r.y - bh / 2) * k, r.w * k, r.h * k); g.restore(); }
}
// ---------- ซ่อมรอยต่อ: จุดโปร่ง / กึ่งโปร่งหนา 1–2 px ที่อยู่ระหว่างพื้นที่ทึบสองข้าง (ตั้งหรือนอน) → เติมสีจากสองข้าง ----------
function healSeams(g, W, H) {
  let im; try { im = g.getImageData(0, 0, W, H); } catch (e) { return; } const d = im.data, OP = 250; let n = 0;
  const fill = (i0, step, k, iT, iB) => { for (let j = 1; j <= k; j++) { const o = i0 + (j - 1) * step, t = j / (k + 1);
      for (let c = 0; c < 3; c++) d[o + c] = d[iT + c] * (1 - t) + d[iB + c] * t; d[o + 3] = 255; } n++; };
  for (let pass = 0; pass < 2; pass++) {   // 0 = แนวตั้ง (เส้นนอน) · 1 = แนวนอน (เส้นตั้ง)
    const stepIn = pass ? 4 : W * 4, lenA = pass ? H : W, lenB = pass ? W : H;
    for (let a = 0; a < lenA; a++) for (let b = 1; b < lenB - 1; b++) {
      const o = pass ? (a * W + b) * 4 : (b * W + a) * 4; if (d[o + 3] >= OP) continue;
      const oT = o - stepIn; if (d[oT + 3] < OP) continue;
      if (d[o + stepIn + 3] >= OP) { fill(o, stepIn, 1, oT, o + stepIn); continue; }
      if (b < lenB - 2 && d[o + 2 * stepIn + 3] >= OP) { fill(o, stepIn, 2, oT, o + 2 * stepIn); b++; }
    }
  }
  if (n) g.putImageData(im, 0, 0);
}
// ---------- หมุนหน้า (urot = ที่ผู้ใช้หมุนเพิ่ม 0 / 90 / 180 / 270 ตามเข็ม) ----------
const baseWH = (p) => ((p.urot || 0) % 180) ? [p.h, p.w] : [p.w, p.h];   // ขนาดหน้าก่อนผู้ใช้หมุน
function rotRect(r, W, H, deg) {   // กรอบในหน้าแนวเดิม (W × H) → หลังหมุนตามเข็ม deg
  deg = ((deg % 360) + 360) % 360;
  if (deg === 90) return { ...r, x: H - (r.y + r.h), y: r.x, w: r.h, h: r.w };
  if (deg === 180) return { ...r, x: W - r.x - r.w, y: H - r.y - r.h };
  if (deg === 270) return { ...r, x: r.y, y: W - (r.x + r.w), w: r.h, h: r.w };
  return r; }
function widgetRect(p, w) {   // ช่องฟอร์ม (พิกัดเนื้อหาไม่หมุน) → พิกัดบนจอ
  const tot = ((p.rot || 0) + (p.urot || 0)) % 360, [W0, H0] = (tot % 180) ? [p.h, p.w] : [p.w, p.h];
  const r = rotRect({ x: w.x, y: w.y, w: w.w, h: w.h }, W0, H0, tot); return r; }
function rotatePage(p, deg) {   // ลายเซ็น / ข้อความที่วางแล้ว: ย้ายตำแหน่งตามหน้า (ตัวลายเซ็นยังตั้งตรง)
  deg = ((deg % 360) + 360) % 360; if (!deg) return; const W = p.w, H = p.h;
  p.items.forEach(it => { const cx = it.x + it.w / 2, cy = it.y + it.h / 2; let nx = cx, ny = cy;
    if (deg === 90) { nx = H - cy; ny = cx; } else if (deg === 180) { nx = W - cx; ny = H - cy; } else { nx = cy; ny = W - cx; }
    const nW = deg === 180 ? W : H, nH = deg === 180 ? H : W;
    it.x = Math.max(0, Math.min(nW - it.w, nx - it.w / 2)); it.y = Math.max(0, Math.min(nH - it.h, ny - it.h / 2)); });
  p.urot = ((p.urot || 0) + deg) % 360; if (deg !== 180) { const t = p.w; p.w = p.h; p.h = t; }
}
function imgRect(p) { const [bw, bh] = baseWH(p), m = 24, aw = bw - m * 2, ah = bh - m * 2, k = Math.min(aw / p.img.iw, ah / p.img.ih), w = p.img.iw * k, h = p.img.ih * k; return { x: (bw - w) / 2, y: (bh - h) / 2, w, h }; }
function renderAll() {
  const has = APP.pages.length > 0;
  $('startPane').hidden = has; $('edPane').hidden = !has; $('hbSave').disabled = !has; $('hbPrint').disabled = !has; $('hbNew').hidden = !has;
  $('docTitle').textContent = has ? (APP.docs[0] ? APP.docs[0].name : 'เอกสารใหม่') : 'PDF Maker';
  $('docSub').textContent = has ? APP.pages.length + ' หน้า' + (APP.docs.length > 1 ? ' · รวม ' + APP.docs.length + ' ไฟล์' : '') + (APP.dirty ? ' · ยังไม่ได้บันทึก' : '') : 'อ่าน · แทรกหน้า · รวมไฟล์ · ลายเซ็น · กรอกฟอร์ม · แก้ข้อความ';
  if (!has) return; if (APP.cur >= APP.pages.length) APP.cur = APP.pages.length - 1;
  renderStrip(); renderPage(); renderSide();
}
function renderStrip() {
  const S = $('strip'), n = APP.pages.length;
  S.innerHTML = APP.pages.map((p, i) => `<div class="th${i === APP.cur ? ' on' : ''}" data-pg="${i}" tabindex="0" role="button" aria-label="หน้า ${i + 1}">
      ${p.items.length ? `<span class="badge">${p.items.length}</span>` : ''}<canvas data-th="${p.id}"></canvas>
      <span class="n">หน้า ${i + 1}${p.kind === 'blank' ? ' · ว่าง' : p.kind === 'img' ? ' · รูป' : ''}</span>
      <span class="acts"><button data-pmv="-1" data-i="${i}" title="เลื่อนขึ้น" aria-label="เลื่อนหน้า ${i + 1} ขึ้น"${i ? '' : ' disabled'}>▲</button><button data-pmv="1" data-i="${i}" title="เลื่อนลง" aria-label="เลื่อนหน้า ${i + 1} ลง"${i < n - 1 ? '' : ' disabled'}>▼</button><button data-prot="${i}" title="หมุนหน้านี้ตามเข็ม 90°" aria-label="หมุนหน้า ${i + 1} ตามเข็ม 90 องศา">↻</button><button data-pdel="${i}" title="ลบหน้า" aria-label="ลบหน้า ${i + 1}" style="color:var(--red)">🗑</button></span></div>`).join('')
    + `<div class="addbar"><span class="mut" style="font-weight:600">แทรกหลังหน้า ${APP.cur + 1}</span><button class="btn sm" data-act="addBlank">＋ หน้าว่าง</button><button class="btn sm" data-act="addPdf">＋ จาก PDF</button><button class="btn sm" data-act="addImg">＋ รูปถ่าย</button></div>`;
  S.querySelectorAll('canvas[data-th]').forEach(c => { const p = APP.pages.find(x => x.id === c.dataset.th); if (!p) return;
    const key = p.id + ':' + (p.kind === 'pdf' ? p.doc + p.idx : p.kind) + ':' + (p.urot || 0); const cached = APP.thumbs[key];
    if (cached) { c.width = cached.width; c.height = cached.height; c.getContext('2d').drawImage(cached, 0, 0); return; }
    drawPage(p, c, 150 / p.w).then(() => { const k = document.createElement('canvas'); k.width = c.width; k.height = c.height; k.getContext('2d').drawImage(c, 0, 0); APP.thumbs[key] = k; }).catch(() => {}); });
}
let renderSeq = 0;
async function renderPage() {
  const p = curPage(); if (!p) return; const seq = ++renderSeq, st = $('stage');
  const fit = Math.min(1.6, Math.max(0.3, (st.clientWidth - 36) / p.w)); APP.s = fit * APP.zoom; const s = APP.s;
  $('zoomTxt').textContent = Math.round(APP.zoom * 100) + '%';
  const pg = $('page'); pg.style.width = p.w * s + 'px'; pg.style.height = p.h * s + 'px';
  const c = document.createElement('canvas'); c.className = 'bg'; c.style.width = p.w * s + 'px'; c.style.height = p.h * s + 'px';
  try { await drawPage(p, c, s, { dpr: Math.min(2, window.devicePixelRatio || 1) }); } catch (e) { console.warn(e); }
  if (seq !== renderSeq) return; const old = $('bg'); c.id = 'bg'; old.replaceWith(c);
  renderOverlay();
}
function renderOverlay() {
  const p = curPage(), s = APP.s, ov = $('ov'); ov.className = 'ov mode-' + APP.mode;
  const H = [];
  // ช่องฟอร์มในไฟล์
  if (p.kind === 'pdf') { const d = docOf(p.doc); (d.fields || []).forEach(f => f.widgets.forEach((w0, wi) => { if (w0.pi !== p.idx) return; const w = widgetRect(p, w0);
    const st = `left:${w.x * s}px;top:${w.y * s}px;width:${w.w * s}px;height:${w.h * s}px`, fs = Math.max(8, Math.min(14, w.h * 0.62)) * s;
    let inner = '';
    if (f.kind === 'text') inner = f.multiline || w.h > 34 ? `<textarea data-fld="${f.key}" style="font-size:${10 * s}px" aria-label="${esc(f.name)}">${esc(f.value)}</textarea>` : `<input type="text" data-fld="${f.key}" value="${esc(f.value)}" style="font-size:${fs}px" aria-label="${esc(f.name)}">`;
    else if (f.kind === 'check') inner = `<input type="checkbox" data-fld="${f.key}"${f.value ? ' checked' : ''} aria-label="${esc(f.name)}">`;
    else inner = `<select data-fld="${f.key}" style="font-size:${fs}px" aria-label="${esc(f.name)}"><option value=""></option>${f.options.map(o => `<option${o === f.value ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    H.push(`<div class="fld" style="${st}" title="ช่องฟอร์ม: ${esc(f.name)}">${inner}</div>`); })); }
  // ลายเซ็น / ข้อความ / ปิดทับ
  p.items.forEach(it => { const st = `left:${it.x * s}px;top:${it.y * s}px;width:${it.w * s}px;height:${it.h * s}px`;
    const sel = APP.sel === it.id ? ' sel' : '';
    if (it.type === 'img') H.push(`<div class="it${sel}" data-it="${it.id}" style="${st}"><img src="${it.src}" alt=""><span class="mv" data-mv="${it.id}">${it.stamp ? 'ตรา' : 'ลายเซ็น'} · ลากย้าย</span><span class="hd" data-rs="${it.id}"></span></div>`);
    else H.push(`<div class="it${sel}${it.cover ? ' cover' : ''}" data-it="${it.id}" style="${st}"><textarea data-txt="${it.id}" placeholder="${it.cover ? 'พิมพ์ข้อความใหม่' : 'พิมพ์ข้อความ'}" style="font-size:${it.size * s}px;color:${it.color}" aria-label="ข้อความ">${esc(it.text)}</textarea><span class="mv" data-mv="${it.id}">${it.cover ? 'แก้ข้อความ' : 'ข้อความ'} · ลากย้าย</span><span class="hd" data-rs="${it.id}"></span></div>`); });
  ov.innerHTML = H.join('');
}
function findItem(id) { for (const p of APP.pages) { const it = p.items.find(x => x.id === id); if (it) return { p, it }; } return null; }
function renderSide() {
  const p = curPage(), f = APP.sel && findItem(APP.sel), it = f && f.it, nCover = p.items.filter(x => x.cover).length;
  const nFld = p.kind === 'pdf' ? (docOf(p.doc).fields || []).filter(x => x.widgets.some(w => w.pi === p.idx)).length : 0;
  const H = [];
  if (it) {
    H.push(`<div class="box"><h3>${it.type === 'img' ? (it.stamp ? 'ตราบริษัท' : 'ลายเซ็น') : it.cover ? 'แก้ข้อความ (ปิดทับ)' : 'ข้อความ'}<small>ที่เลือกอยู่</small></h3>`);
    if (it.type === 'text') H.push(`<div class="row"><label>ขนาด <input type="number" id="pSize" min="6" max="72" step="1" value="${it.size}"></label><label>สี <input type="color" id="pColor" value="${it.color}"></label>${it.cover ? '' : `<label><input type="checkbox" id="pCover"> พื้นขาว (ปิดทับ)</label>`}</div>`);
    H.push(`<div class="row"><button class="btn sm bad" data-act="delItem">🗑 ลบ</button><button class="btn sm" data-act="deselect">เสร็จ</button></div><div class="mut">ลากแถบสีน้ำเงินเพื่อย้าย · ลากจุดมุมขวาล่างเพื่อปรับขนาด · ปุ่ม Delete = ลบ</div></div>`);
  }
  // ลายเซ็นสำเร็จรูป
  H.push(`<div class="box"><h3>✍ ลายเซ็น · ตราบริษัท<small>เก็บในเครื่องนี้เท่านั้น</small></h3>`);
  H.push(APP.sigs.length ? `<div class="sigs">${APP.sigs.map(g => `<div class="sig"><button class="x" data-sigdel="${g.id}" title="ลบ" aria-label="ลบ ${esc(g.name)}">✕</button><img src="${g.url}" alt=""><span>${esc(g.name)}</span><button class="use" data-siguse="${g.id}">วางในหน้านี้</button></div>`).join('')}</div>` : '<div class="mut">ยังไม่มีลายเซ็น — สร้างครั้งเดียว ใช้ได้ทุกไฟล์ในเครื่องนี้</div>');
  H.push(`<div class="row"><button class="btn sm dk" data-act="sigNew">＋ สร้างลายเซ็น / ตรา</button></div></div>`);
  // หน้านี้
  H.push(`<div class="box"><h3>หน้า ${APP.cur + 1} / ${APP.pages.length}<small>${p.kind === 'pdf' ? esc(docOf(p.doc).name) : p.kind === 'img' ? 'รูป · ' + esc(p.img.name) : 'หน้าว่าง'}</small></h3>`);
  if (nFld) H.push(`<div class="info">หน้านี้มีช่องกรอกฟอร์ม ${nFld} ช่อง (กรอบสีฟ้า) — คลิกแล้วพิมพ์ได้เลย</div>`);
  if (p.rot) H.push('<div class="warn">หน้านี้ถูกหมุนในไฟล์เดิม — ถ้ามีลายเซ็น / ข้อความ ระบบจะบันทึกหน้านี้เป็นภาพเพื่อให้ตำแหน่งตรง</div>');
  if (nCover || p.raster) H.push(`<label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;margin:6px 0;cursor:pointer"><input type="checkbox" id="pRaster" style="flex:none;margin-top:3px;width:18px;height:18px"${p.raster ? ' checked' : ''}><span>ลบข้อความเดิมใต้แถบขาวจริง (บันทึกหน้านี้เป็นภาพ · ค้นหาข้อความในหน้านี้ไม่ได้)</span></label>`);
  if (nCover) H.push('<div class="warn">แก้ข้อความแบบปิดทับ: ถ้าไม่ติ๊กข้างบน ข้อความเดิมยังอยู่ใต้แถบขาว คัดลอก / ค้นหาเจอได้ · ใช้กับเอกสารของ Wellcon เท่านั้น — ห้ามแก้เอกสารของผู้อื่นแล้วส่งต่อเหมือนต้นฉบับ</div>');
  H.push('</div>');
  H.push(`<div class="mut" style="font-size:12px">ไฟล์อยู่ในเครื่องคุณ ไม่ถูกอัปโหลด · ไฟล์ต้นฉบับไม่ถูกแก้ (บันทึกเป็นไฟล์ใหม่) · ลายเซ็นแบบภาพ ไม่ใช่ลายเซ็นดิจิทัลที่มีใบรับรอง — สัญญา / เอกสารกฎหมายต้องผ่านผู้บริหารก่อนส่ง · PDF Maker ${PM_VER}</div>`);
  $('side').innerHTML = H.join('');
  if (it && it.type === 'text') { const pc = $('pCover'); if (pc) pc.checked = !!it.bg; }
}
function setMode(m) { APP.mode = m; document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === m)); $('ov').className = 'ov mode-' + m;
  if (m !== 'select') toast(m === 'text' ? 'ลากเป็นกรอบในหน้า แล้วพิมพ์ข้อความ' : 'ลากครอบข้อความเดิมที่ต้องการแก้ แล้วพิมพ์ข้อความใหม่', 3000); }
function select(id) { APP.sel = id; renderOverlay(); renderSide(); }

// =====================================================================
// ลาก / ปรับขนาด / วาดกรอบ (หน่วย pt ของหน้า · มุมบนซ้าย)
// =====================================================================
const DRAG = { on: false };
function ptOf(e) { const r = $('ov').getBoundingClientRect(); return [(e.clientX - r.left) / APP.s, (e.clientY - r.top) / APP.s]; }
$('ov').addEventListener('pointerdown', (e) => {
  const p = curPage(); if (!p || e.target.closest('.fld')) return;
  const mv = e.target.closest('[data-mv]'), rs = e.target.closest('[data-rs]'), itEl = e.target.closest('[data-it]');
  if (rs || mv || (itEl && APP.mode === 'select')) { const f = findItem((rs || mv || itEl).dataset.rs || (rs || mv || itEl).dataset.mv || itEl.dataset.it); if (!f) return;
    if (itEl && !rs && !mv && f.it.type === 'text') { if (APP.sel !== f.it.id) select(f.it.id); return; }   // คลิกในกล่องข้อความ = พิมพ์ (ย้ายด้วยแถบ)
    e.preventDefault(); if (APP.sel !== f.it.id) select(f.it.id);
    const [x, y] = ptOf(e); Object.assign(DRAG, { on: true, kind: rs ? 'resize' : 'move', it: f.it, x0: x, y0: y, ox: f.it.x, oy: f.it.y, ow: f.it.w, oh: f.it.h, ar: f.it.w / f.it.h, pid: e.pointerId });
    try { $('ov').setPointerCapture(e.pointerId); } catch (x) {} return; }
  if (APP.mode === 'text' || APP.mode === 'cover') { e.preventDefault(); const [x, y] = ptOf(e); const el = document.createElement('div'); el.className = 'it sel'; el.style.background = APP.mode === 'cover' ? 'rgba(255,255,255,.85)' : 'rgba(47,111,176,.08)'; $('ov').appendChild(el);
    Object.assign(DRAG, { on: true, kind: 'draw', x0: x, y0: y, el, pid: e.pointerId }); try { $('ov').setPointerCapture(e.pointerId); } catch (x2) {} return; }
  if (APP.sel) select(null);
});
$('ov').addEventListener('pointermove', (e) => { if (!DRAG.on) return; const [x, y] = ptOf(e), p = curPage();
  if (DRAG.kind === 'draw') { const a = Math.min(DRAG.x0, x), b = Math.min(DRAG.y0, y); DRAG.r = [Math.max(0, a), Math.max(0, b), Math.abs(x - DRAG.x0), Math.abs(y - DRAG.y0)];
    Object.assign(DRAG.el.style, { left: DRAG.r[0] * APP.s + 'px', top: DRAG.r[1] * APP.s + 'px', width: DRAG.r[2] * APP.s + 'px', height: DRAG.r[3] * APP.s + 'px' }); return; }
  const it = DRAG.it, dx = x - DRAG.x0, dy = y - DRAG.y0;
  if (DRAG.kind === 'move') { it.x = Math.max(-it.w / 2, Math.min(p.w - it.w / 2, DRAG.ox + dx)); it.y = Math.max(0, Math.min(p.h - 10, DRAG.oy + dy)); }
  else { let w = Math.max(16, DRAG.ow + dx), h = Math.max(10, DRAG.oh + dy); if (it.type === 'img') h = w / DRAG.ar; it.w = w; it.h = h; }
  const el = $('ov').querySelector(`[data-it="${it.id}"]`); if (el) Object.assign(el.style, { left: it.x * APP.s + 'px', top: it.y * APP.s + 'px', width: it.w * APP.s + 'px', height: it.h * APP.s + 'px' });
});
const endDrag = () => { if (!DRAG.on) return; DRAG.on = false;
  if (DRAG.kind === 'draw') { DRAG.el.remove(); const r = DRAG.r || [DRAG.x0, DRAG.y0, 0, 0], cover = APP.mode === 'cover';
    const it = { id: uid('t'), type: 'text', x: r[0], y: r[1], w: Math.max(r[2], cover ? 30 : 140), h: Math.max(r[3], 16), text: '', size: Math.max(7, Math.min(14, Math.round((r[3] > 8 ? r[3] : 14) * 0.7))), color: '#111111', cover, bg: cover };
    curPage().items.push(it); APP.dirty = true; setMode('select'); APP.sel = it.id; renderOverlay(); renderSide(); renderStrip(); renderAll0();
    const ta = $('ov').querySelector(`[data-txt="${it.id}"]`); if (ta) ta.focus(); return; }
  APP.dirty = true; renderSide(); };
const renderAll0 = () => { $('docSub').textContent = APP.pages.length + ' หน้า' + (APP.docs.length > 1 ? ' · รวม ' + APP.docs.length + ' ไฟล์' : '') + (APP.dirty ? ' · ยังไม่ได้บันทึก' : ''); };
$('ov').addEventListener('pointerup', endDrag); $('ov').addEventListener('pointercancel', endDrag);

// =====================================================================
// ลายเซ็นสำเร็จรูป (เก็บในเครื่องนี้ แยกตามผู้ใช้)
// =====================================================================
const sigKey = () => 'wpdf_sigs_' + (APP.me ? APP.me.email : '');
function loadSigs() { try { APP.sigs = JSON.parse(localStorage.getItem(sigKey()) || '[]') || []; } catch (e) { APP.sigs = []; } }
function saveSigs() { try { localStorage.setItem(sigKey(), JSON.stringify(APP.sigs)); return true; } catch (e) { toast('บันทึกลายเซ็นในเครื่องไม่ได้ — พื้นที่เต็ม หรือเบราว์เซอร์ปิดการเก็บข้อมูล', 5000); return false; } }
function trimCanvas(c) { const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  if (x1 < 0) return null; const m = 6, o = document.createElement('canvas'); o.width = x1 - x0 + 1 + m * 2; o.height = y1 - y0 + 1 + m * 2; o.getContext('2d').drawImage(c, x0 - m, y0 - m, o.width, o.height, 0, 0, o.width, o.height); return o; }
async function sigNew() {
  const b = $('dlgBox'); let tab = 'draw', ink = '#1F3A93', upImg = null;
  b.innerHTML = `<b class="t">สร้างลายเซ็น / ตราบริษัท</b>
    <div class="tabs2"><button class="btn sm on" data-st="draw">✍ วาด</button><button class="btn sm" data-st="up">🖼 อัปโหลดรูป</button></div>
    <div id="stDraw"><canvas id="pad"></canvas><div class="row" style="margin-top:6px"><label>สีหมึก</label><button class="btn sm on" data-ink="#1F3A93">น้ำเงิน</button><button class="btn sm" data-ink="#111111">ดำ</button><span style="flex:1"></span><button class="btn sm" data-act="padClear">ล้าง</button></div><div class="mut">เซ็นในกรอบด้วยนิ้ว ปากกา หรือเมาส์</div></div>
    <div id="stUp" hidden><div class="row"><button class="btn sm dk" data-act="sigImgPick">เลือกรูปลายเซ็น / ตรา</button><label><input type="checkbox" id="sigBgRm" checked> ลบพื้นขาวออก</label></div><canvas id="upPrev" style="max-width:100%;max-height:200px;display:block;margin-top:8px;background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 0 0/16px 16px;border-radius:10px"></canvas><div class="mut">รูปถ่ายลายเซ็นบนกระดาษขาว หรือไฟล์ตราบริษัท (PNG พื้นใสดีที่สุด)</div></div>
    <div class="row"><label style="flex:1 1 200px">ชื่อ <input id="sigName" style="flex:1;min-height:38px;border:1px solid var(--line);border-radius:9px;padding:0 9px;width:100%" value="${esc(APP.me.name)}" maxlength="40"></label><label><input type="checkbox" id="sigStamp"> เป็นตราบริษัท</label></div>
    <div class="info">เก็บในเครื่องนี้เท่านั้น ไม่ขึ้นเซิร์ฟเวอร์ — ใช้เครื่องอื่นต้องสร้างใหม่ · ใช้ได้เฉพาะลายเซ็นของคุณเอง / ตราที่ได้รับอนุญาต</div>
    <div class="ac"><button class="btn" data-d="no">ยกเลิก</button><button class="btn dk" data-d="ok">บันทึก</button></div>`;
  $('dlg').hidden = false;
  const pad = $('pad'), dpr = window.devicePixelRatio || 1; pad.width = pad.clientWidth * dpr; pad.height = pad.clientHeight * dpr; const g = pad.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round';
  let last = null, drawn = false;
  const P = (e) => { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr, e.pressure || 0.5]; };
  pad.onpointerdown = (e) => { e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch (x) {} last = P(e); };
  pad.onpointermove = (e) => { if (!last) return; const q = P(e); g.strokeStyle = ink; g.lineWidth = (2.2 + q[2] * 2.4) * dpr; g.beginPath(); g.moveTo(last[0], last[1]); g.quadraticCurveTo(last[0], last[1], (last[0] + q[0]) / 2, (last[1] + q[1]) / 2); g.lineTo(q[0], q[1]); g.stroke(); last = q; drawn = true; };
  pad.onpointerup = pad.onpointercancel = () => { last = null; };
  const res = await new Promise(done => {
    b.onclick = async (e) => { const t = e.target;
      const st = t.closest('[data-st]'); if (st) { tab = st.dataset.st; b.querySelectorAll('[data-st]').forEach(x => x.classList.toggle('on', x === st)); $('stDraw').hidden = tab !== 'draw'; $('stUp').hidden = tab !== 'up'; return; }
      const ik = t.closest('[data-ink]'); if (ik) { ink = ik.dataset.ink; b.querySelectorAll('[data-ink]').forEach(x => x.classList.toggle('on', x === ik)); return; }
      if (t.closest('[data-act="padClear"]')) { g.clearRect(0, 0, pad.width, pad.height); drawn = false; return; }
      if (t.closest('[data-act="sigImgPick"]')) { $('fSigImg').onchange = async () => { const f = $('fSigImg').files[0]; $('fSigImg').value = ''; if (!f) return;
          const url = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(f); }); upImg = await loadImage(url); drawUp(); }; $('fSigImg').click(); return; }
      const d = t.closest('[data-d]'); if (!d) return; if (d.dataset.d !== 'ok') { done(null); return; }
      let c = null; if (tab === 'draw') { if (!drawn) { toast('เซ็นในกรอบก่อน'); return; } c = trimCanvas(pad); } else { if (!upImg) { toast('เลือกรูปก่อน'); return; } c = trimCanvas($('upPrev')); }
      if (!c) { toast('ไม่พบลายเซ็นในภาพ'); return; }
      const m = Math.min(1, 900 / Math.max(c.width, c.height)), o = document.createElement('canvas'); o.width = Math.round(c.width * m); o.height = Math.round(c.height * m); o.getContext('2d').drawImage(c, 0, 0, o.width, o.height);
      done({ id: uid('s'), name: ($('sigName').value || APP.me.name).trim().slice(0, 40), url: o.toDataURL('image/png'), w: o.width, h: o.height, stamp: $('sigStamp').checked, at: Date.now() }); };
    const drawUp = () => { const cv = $('upPrev'), k = Math.min(1, 1200 / Math.max(upImg.width, upImg.height)); cv.width = Math.round(upImg.width * k); cv.height = Math.round(upImg.height * k);
      const cg = cv.getContext('2d'); cg.clearRect(0, 0, cv.width, cv.height); cg.drawImage(upImg, 0, 0, cv.width, cv.height);
      if ($('sigBgRm').checked) { const im = cg.getImageData(0, 0, cv.width, cv.height), a = im.data; for (let i = 0; i < a.length; i += 4) { const l = (a[i] + a[i + 1] + a[i + 2]) / 3; if (l > 225) a[i + 3] = 0; else if (l > 180) a[i + 3] = Math.round(a[i + 3] * (225 - l) / 45); } cg.putImageData(im, 0, 0); } };
    b.onchange = (e) => { if (e.target.id === 'sigBgRm' && upImg) drawUp(); };
  });
  $('dlg').hidden = true; b.onclick = null; b.onchange = null;
  if (!res) return; APP.sigs.push(res); if (saveSigs()) toast('บันทึกแล้ว — กด “วางในหน้านี้”'); renderSide();
}
function placeSig(id) { const g = APP.sigs.find(x => x.id === id), p = curPage(); if (!g || !p) return;
  const w = g.stamp ? 110 : 150, h = w * g.h / g.w; const it = { id: uid('g'), type: 'img', src: g.url, x: (p.w - w) / 2, y: Math.min(p.h - h - 40, p.h * 0.72), w, h, stamp: !!g.stamp, sig: g.name };
  p.items.push(it); APP.dirty = true; APP.sel = it.id; renderOverlay(); renderSide(); renderStrip(); renderAll0(); toast('ลากไปวางตำแหน่งที่ต้องการ · ลากมุมขวาล่างเพื่อปรับขนาด'); }

// =====================================================================
// สร้างไฟล์ PDF (บันทึก / พิมพ์)
// =====================================================================
async function fontsReady() { try { if (document.fonts) { await document.fonts.load('40px "IBM Plex Sans Thai"'); await document.fonts.ready; } } catch (e) {} }
function wrapLines(g, text, maxW) { const out = []; String(text || '').split('\n').forEach(par => { if (!par) { out.push(''); return; }
  let line = ''; const tokens = par.match(/\s+|[^\s]/g) || [];   // ไทยไม่มีช่องว่าง — ตัดได้ทีละตัวอักษร (ไม่ตัดกลางสระ / วรรณยุกต์)
  const units = []; tokens.forEach(t => { if (/^[ัิ-ฺ็-๎]$/.test(t) && units.length) units[units.length - 1] += t; else units.push(t); });
  units.forEach(u => { if (g.measureText(line + u).width > maxW && line.trim()) { out.push(line.replace(/\s+$/, '')); line = /^\s+$/.test(u) ? '' : u; } else line += u; });
  out.push(line); }); return out; }
function textCanvas(it, scale) {   // ข้อความไทยวาดด้วยเบราว์เซอร์ → ภาพ
  const W = Math.max(1, Math.round(it.w * scale)), H = Math.max(1, Math.round(it.h * scale)), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); if (it.bg) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); }
  const fs = it.size * scale, padX = 2 * scale, padY = 1 * scale, lh = fs * 1.25; g.font = `${fs}px ${FONT}`; g.fillStyle = it.color || '#111'; g.textBaseline = 'top';
  if (it.center) { g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(it.text, W / 2, H / 2 + fs * 0.04); return c; }
  wrapLines(g, it.text, W - padX * 2).forEach((ln, i) => { const y = padY + i * lh + (lh - fs) / 2; if (y < H) g.fillText(ln, padX, y); });
  return c; }
const canvasPng = (c) => new Promise(ok => c.toBlob(b => b.arrayBuffer().then(ok), 'image/png'));
const canvasJpg = (c, q) => new Promise(ok => c.toBlob(b => b.arrayBuffer().then(ok), 'image/jpeg', q || 0.9));
function fieldOverlays(doc, pi, all) {   // ค่าในช่องฟอร์ม → ข้อความ / เครื่องหมาย ✓ ที่ต้องวางเอง
  const out = []; (doc.fields || []).forEach(f => { if (!all && !f.dirty) return; if (all ? false : f.kind === 'check' || f.kind === 'radio') return;
    f.widgets.forEach(w => { if (w.pi !== pi) return;
      if (f.kind === 'check') { if (f.value) out.push({ type: 'text', x: w.x, y: w.y, w: w.w, h: w.h, text: '✓', size: Math.min(w.h, w.w) * 0.85, color: '#111', center: true }); return; }
      const v = String(f.value || ''); if (!v) return;
      const size = f.multiline || w.h > 34 ? 10 : Math.max(7, Math.min(12, w.h * 0.62));
      out.push({ type: 'text', x: w.x, y: w.y + (f.multiline || w.h > 34 ? 1 : Math.max(0, (w.h - size * 1.25) / 2)), w: w.w, h: f.multiline || w.h > 34 ? w.h : size * 1.4, text: v, size, color: '#111' }); }); });
  return out; }
async function prepDoc(doc) {   // โหลดไฟล์ต้นฉบับใหม่ทุกครั้ง · ช่องฟอร์ม: ใส่ค่าที่ติ๊ก / ล้างค่าที่แก้ แล้ว "ล็อก" (flatten) — ค่าข้อความวางเป็นภาพทีหลัง
  const { PDFDocument } = PDFLib; let lib = await PDFDocument.load(doc.bytes, { ignoreEncryption: true, updateMetadata: false }); let fallback = false;
  if (doc.fields.length) {
    try { const form = lib.getForm();
      doc.fields.forEach(f => { if (!f.dirty) return; const pf = form.getField(f.name);
        if (f.kind === 'check') { f.value ? pf.check() : pf.uncheck(); } else if (f.kind === 'radio') { if (f.value) pf.select(f.value); else pf.clear(); }
        else if (f.kind === 'text') pf.setText(''); else pf.clear(); });
      form.flatten();
    } catch (e) { console.warn('flatten → fallback', e); lib = await PDFDocument.load(doc.bytes, { ignoreEncryption: true, updateMetadata: false }); fallback = true;
      try { const form = lib.getForm(); form.getFields().forEach(f => { try { form.removeField(f); } catch (x) {} }); } catch (x) {} }
  }
  return { lib, fallback };
}
async function buildPdf() {
  const { PDFDocument } = PDFLib; await fontsReady();
  const out = await PDFDocument.create(), prep = {}; let nSig = 0, nCover = 0, nText = 0;
  for (let i = 0; i < APP.pages.length; i++) {
    busy(true, 'กำลังสร้างไฟล์… หน้า ' + (i + 1) + ' / ' + APP.pages.length);
    const p = APP.pages[i], doc = p.kind === 'pdf' ? docOf(p.doc) : null;
    const fo = doc ? (prep[doc.id] || (prep[doc.id] = await prepDoc(doc))) : null;
    const items = p.items.slice(); nSig += items.filter(x => x.type === 'img').length; nCover += items.filter(x => x.cover).length; nText += items.filter(x => x.type === 'text' && !x.cover).length;
    const raster = p.raster || (doc && doc.enc) || ((p.rot || p.urot) && items.length);
    if (raster) {   // วาดทั้งหน้าเป็นภาพ (ลบข้อความเดิมจริง / ไฟล์ล็อกรหัส / หน้าหมุน)
      const S = 200 / 72, c = document.createElement('canvas'); await drawPage(p, c, S, { noForms: !!(doc && doc.fields.length) }); const g = c.getContext('2d');
      const all = [...(doc ? fieldOverlays(doc, p.idx, true).map(o => ({ ...o, ...widgetRect(p, o) })) : []), ...items];
      for (const it of all) { const src = it.type === 'img' ? await loadImage(it.src) : textCanvas(it, S); g.drawImage(src, it.x * S, it.y * S, it.w * S, it.h * S); }
      const pg = out.addPage([p.w, p.h]); const im = await out.embedJpg(await canvasJpg(c, 0.88)); pg.drawImage(im, { x: 0, y: 0, width: p.w, height: p.h }); continue; }
    let pg;
    if (p.kind === 'pdf') { [pg] = await out.copyPages(fo.lib, [p.idx]); out.addPage(pg); if (p.urot) pg.setRotation(PDFLib.degrees(((pg.getRotation().angle || 0) + p.urot) % 360)); }
    else if (p.kind === 'blank') pg = out.addPage([p.w, p.h]);
    else { const [bw, bh] = baseWH(p); pg = out.addPage([bw, bh]); const im = await out.embedJpg(await (await fetch(p.img.url)).arrayBuffer()), r = imgRect(p); pg.drawImage(im, { x: r.x, y: bh - r.y - r.h, width: r.w, height: r.h }); if (p.urot) pg.setRotation(PDFLib.degrees(p.urot)); }
    const cb = pg.getCropBox(), put = async (bytes, it) => { const im = await out.embedPng(bytes); pg.drawImage(im, { x: cb.x + it.x, y: cb.y + cb.height - it.y - it.h, width: it.w, height: it.h }); };
    const all = [...(doc ? fieldOverlays(doc, p.idx, fo.fallback) : []), ...items];
    for (const it of all) { if (it.type === 'img') await put(await (await fetch(it.src)).arrayBuffer(), it); else await put(await canvasPng(textCanvas(it, K)), it); }
  }
  const now = new Date(), title = (APP.docs[0] ? APP.docs[0].name : 'เอกสาร');
  out.setTitle(title); out.setAuthor(APP.me.full); out.setCreator('Wellcon PDF Maker ' + PM_VER); out.setProducer('Wellcon PM · pdf-lib');
  out.setSubject('แก้ไขโดย ' + APP.me.name + ' (' + APP.me.email + ') · ' + dmy(now) + ' · ลายเซ็น / ตรา ' + nSig + ' · ข้อความเพิ่ม ' + nText + ' · ปิดทับแก้ข้อความ ' + nCover);
  out.setKeywords(['Wellcon', 'PDF Maker', 'แก้ไขโดย ' + APP.me.name]); out.setModificationDate(now); out.setCreationDate(now);
  const bytes = await out.save(); busy(false); return new Blob([bytes], { type: 'application/pdf' });
}
async function savePdf() { if (!APP.pages.length) return;
  const base = (APP.docs[0] ? APP.docs[0].name : 'เอกสาร') + ' (แก้ไข)';
  const name = await ask('บันทึกลงเครื่อง', 'ไฟล์ต้นฉบับไม่ถูกแก้ — บันทึกเป็นไฟล์ใหม่', base); if (name == null) return;
  try { const blob = await buildPdf(), fn = (name.trim() || base).replace(/[\\/:*?"<>|]+/g, ' ') + '.pdf';
    const file = new File([blob], fn, { type: 'application/pdf' });
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (mobile && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: fn }); APP.dirty = false; renderAll0(); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    const a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = fn; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    APP.dirty = false; renderAll0(); toast('บันทึกแล้ว: ' + fn, 3500);
  } catch (e) { console.error(e); busy(false); toast('สร้างไฟล์ไม่สำเร็จ: ' + ((e && e.message) || e), 6000); } }
async function printPdf() { if (!APP.pages.length) return;
  try { const blob = await buildPdf(), url = URL.createObjectURL(blob);
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (mobile) { const w = window.open(url, '_blank'); if (!w) location.href = url; toast('เปิดไฟล์แล้ว — กดแชร์ / เมนู แล้วเลือก “พิมพ์”', 5000); return; }
    let fr = $('prFrame'); if (fr) fr.remove(); fr = document.createElement('iframe'); fr.id = 'prFrame'; fr.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0';
    fr.onload = () => { setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { window.open(url, '_blank'); toast('เปิดไฟล์ในแท็บใหม่ — กด Ctrl + P เพื่อพิมพ์', 5000); } }, 300); };
    fr.src = url; document.body.appendChild(fr);
  } catch (e) { console.error(e); busy(false); toast('สร้างไฟล์ไม่สำเร็จ: ' + ((e && e.message) || e), 6000); } }

// =====================================================================
// หมุนหน้า (แบบ Acrobat: ทิศทาง · ช่วงหน้า · คู่ / คี่ · แนวหน้า)
// =====================================================================
function rotDlg() {
  const n = APP.pages.length, b = $('dlgBox'), sel = (id, o) => `<select id="${id}" style="min-height:40px;border:1px solid var(--line);border-radius:10px;padding:0 8px;background:#fff;flex:1">${o.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>`;
  b.innerHTML = `<b class="t">⟳ หมุนหน้า</b>
    <div class="row"><label style="width:70px;color:var(--ink)">ทิศทาง</label>${sel('rdDir', [['90', 'ตามเข็มนาฬิกา 90°'], ['270', 'ทวนเข็มนาฬิกา 90°'], ['180', '180°']])}</div>
    <div class="box" style="gap:10px"><h3>ช่วงหน้า</h3>
      <label class="chk2"><input type="radio" name="rdRng" value="all" checked> ทุกหน้า (${n} หน้า)</label>
      <label class="chk2"><input type="radio" name="rdRng" value="cur"> เฉพาะหน้าที่เลือก (หน้า ${APP.cur + 1})</label>
      <label class="chk2"><input type="radio" name="rdRng" value="rng"> หน้า จาก <input type="number" id="rdFrom" min="1" max="${n}" value="1" style="width:64px;min-height:34px;border:1px solid var(--line);border-radius:8px;padding:0 6px"> ถึง <input type="number" id="rdTo" min="1" max="${n}" value="${n}" style="width:64px;min-height:34px;border:1px solid var(--line);border-radius:8px;padding:0 6px"> จาก ${n}</label>
      <div class="row"><label style="width:70px;color:var(--ink)">หมุน</label>${sel('rdOdd', [['both', 'หน้าคู่และหน้าคี่'], ['odd', 'เฉพาะหน้าคี่'], ['even', 'เฉพาะหน้าคู่']])}</div>
      <div class="row"><label style="width:70px;color:var(--ink)">แนวหน้า</label>${sel('rdOri', [['any', 'ทุกแนว'], ['port', 'เฉพาะหน้าแนวตั้ง'], ['land', 'เฉพาะหน้าแนวนอน']])}</div>
    </div>
    <div class="mut">หมุนเฉพาะในไฟล์ที่จะบันทึก — ไฟล์ต้นฉบับไม่ถูกแก้ · ลายเซ็น / ข้อความที่วางแล้วย้ายตามหน้า</div>
    <div class="ac"><button class="btn" data-d="no">ยกเลิก</button><button class="btn dk" data-d="ok">หมุน</button></div>`;
  $('dlg').hidden = false;
  b.querySelectorAll('#rdFrom,#rdTo').forEach(x => x.addEventListener('focus', () => { b.querySelector('input[name=rdRng][value=rng]').checked = true; }));
  b.onclick = (e) => { const d = e.target.closest('[data-d]'); if (!d) return; $('dlg').hidden = true; b.onclick = null; if (d.dataset.d !== 'ok') return;
    const deg = +$('rdDir').value, rng = b.querySelector('input[name=rdRng]:checked').value, odd = $('rdOdd').value, ori = $('rdOri').value;
    let a = 1, z = n; if (rng === 'cur') a = z = APP.cur + 1; else if (rng === 'rng') { a = Math.max(1, Math.min(n, +$('rdFrom').value || 1)); z = Math.max(1, Math.min(n, +$('rdTo').value || n)); if (a > z) [a, z] = [z, a]; }
    let cnt = 0; for (let i = a; i <= z; i++) { const p = APP.pages[i - 1];
      if (odd === 'odd' && i % 2 === 0) continue; if (odd === 'even' && i % 2 === 1) continue;
      if (ori === 'port' && p.w > p.h) continue; if (ori === 'land' && p.w <= p.h) continue;
      rotatePage(p, deg); cnt++; }
    if (!cnt) { toast('ไม่มีหน้าที่ตรงเงื่อนไข'); return; }
    APP.sel = null; APP.dirty = true; renderAll(); toast('หมุน ' + cnt + ' หน้าแล้ว'); };
}

// =====================================================================
// กล่องถาม
// =====================================================================
function ask(title, text, value, okTxt, bad) { return new Promise(res => { const b = $('dlgBox');
  b.innerHTML = `<b class="t">${esc(title)}</b>${text ? `<div class="mut" style="font-size:14px;white-space:pre-line">${esc(text)}</div>` : ''}${value != null ? `<input id="dlgIn" style="min-height:44px;border:1.5px solid var(--line);border-radius:11px;padding:0 11px;width:100%" value="${esc(value)}">` : ''}<div class="ac"><button class="btn" data-d="no">ยกเลิก</button><button class="btn ${bad ? 'bad' : 'dk'}" data-d="ok">${esc(okTxt || 'ตกลง')}</button></div>`;
  $('dlg').hidden = false; const inp = $('dlgIn'); if (inp) { inp.focus(); inp.select(); }
  const done = (v) => { $('dlg').hidden = true; b.onclick = null; b.onkeydown = null; res(v); };
  b.onclick = (e) => { const d = e.target.closest('[data-d]'); if (d) done(d.dataset.d === 'ok' ? (inp ? inp.value : true) : null); };
  b.onkeydown = (e) => { if (e.key === 'Escape') done(null); if (e.key === 'Enter' && inp) done(inp.value); }; }); }

// =====================================================================
// เหตุการณ์
// =====================================================================
document.addEventListener('click', async (e) => { const t = e.target;
  const th = t.closest('[data-pg]'); const mv = t.closest('[data-pmv]'), pd = t.closest('[data-pdel]'), pr = t.closest('[data-prot]');
  if (pr) { const i = +pr.dataset.prot; rotatePage(APP.pages[i], 90); APP.cur = i; APP.sel = null; APP.dirty = true; renderAll(); return; }
  if (mv) { const i = +mv.dataset.i, j = i + +mv.dataset.pmv; if (j < 0 || j >= APP.pages.length) return; const [p] = APP.pages.splice(i, 1); APP.pages.splice(j, 0, p); APP.cur = j; APP.dirty = true; renderAll(); return; }
  if (pd) { const i = +pd.dataset.pdel; if (APP.pages.length === 1) { toast('ต้องเหลืออย่างน้อย 1 หน้า — ปิดไฟล์ได้ที่ปุ่ม ✕ ด้านบน'); return; }
    if (!(await ask('ลบหน้า ' + (i + 1) + '?', 'ลบเฉพาะในไฟล์ที่จะบันทึก — ไฟล์ต้นฉบับไม่ถูกแก้', null, 'ลบหน้า', true))) return; APP.pages.splice(i, 1); if (APP.cur >= i && APP.cur > 0) APP.cur--; APP.sel = null; APP.dirty = true; renderAll(); return; }
  if (th) { const i = +th.dataset.pg; if (i !== APP.cur) { APP.cur = i; APP.sel = null; renderStrip(); renderPage(); renderSide(); } return; }
  const md = t.closest('[data-mode]'); if (md) { setMode(md.dataset.mode); return; }
  const su = t.closest('[data-siguse]'); if (su) { placeSig(su.dataset.siguse); return; }
  const sd = t.closest('[data-sigdel]'); if (sd) { const g = APP.sigs.find(x => x.id === sd.dataset.sigdel); if (g && await ask('ลบ “' + g.name + '” ออกจากเครื่องนี้?', 'ลายเซ็นที่วางในเอกสารแล้วไม่หาย', null, 'ลบ', true)) { APP.sigs = APP.sigs.filter(x => x !== g); saveSigs(); renderSide(); } return; }
  const a = t.closest('[data-act]'); if (!a) return; const k = a.dataset.act;
  if (k === 'toPm') { if (APP.dirty && !(await ask('ออกโดยไม่บันทึก?', 'งานที่ยังไม่ได้บันทึกจะหายไป', null, 'ออก', true))) return; APP.dirty = false; location.href = pmUrl() + '#/work'; }
  else if (k === 'open') $('fOpen').click();
  else if (k === 'new') { if (APP.dirty && !(await ask('ปิดไฟล์โดยไม่บันทึก?', 'งานที่ยังไม่ได้บันทึกจะหายไป', null, 'ปิดไฟล์', true))) return; Object.assign(APP, { docs: [], pages: [], cur: 0, sel: null, dirty: false, thumbs: {}, zoom: 1 }); renderAll(); }
  else if (k === 'addBlank') addBlank(APP.cur + 1); else if (k === 'addPdf') $('fAddPdf').click(); else if (k === 'addImg') $('fAddImg').click();
  else if (k === 'sigPick') { if (!APP.sigs.length) sigNew(); else { toast('เลือกลายเซ็นทางขวา แล้วกด “วางในหน้านี้”'); const sd2 = $('side'); sd2.scrollTop = 0; } }
  else if (k === 'sigNew') sigNew();
  else if (k === 'rotDlg') rotDlg();
  else if (k === 'delItem') { const f = APP.sel && findItem(APP.sel); if (f) { f.p.items = f.p.items.filter(x => x !== f.it); APP.sel = null; APP.dirty = true; renderOverlay(); renderSide(); renderStrip(); } }
  else if (k === 'deselect') select(null);
  else if (k === 'zoomIn') { APP.zoom = Math.min(4, APP.zoom * 1.25); renderPage(); } else if (k === 'zoomOut') { APP.zoom = Math.max(0.4, APP.zoom / 1.25); renderPage(); } else if (k === 'zoomFit') { APP.zoom = 1; renderPage(); }
  else if (k === 'save') savePdf(); else if (k === 'print') printPdf();
});
document.addEventListener('input', (e) => { const t = e.target;
  if (t.dataset.txt) { const f = findItem(t.dataset.txt); if (f) { f.it.text = t.value; APP.dirty = true; renderAll0(); } return; }
  if (t.dataset.fld) { for (const d of APP.docs) { const f = d.fields.find(x => x.key === t.dataset.fld); if (f) { f.value = t.type === 'checkbox' ? t.checked : t.value; f.dirty = f.value !== f.orig; APP.dirty = true; renderAll0(); break; } } return; }
  const f = APP.sel && findItem(APP.sel); if (!f) return;
  if (t.id === 'pSize') { const v = +t.value; if (v >= 6 && v <= 72) { f.it.size = v; renderOverlay(); } }
  else if (t.id === 'pColor') { f.it.color = t.value; renderOverlay(); }
});
document.addEventListener('change', (e) => { const t = e.target;
  if (t.dataset.fld && t.type === 'checkbox') { t.dispatchEvent(new Event('input', { bubbles: true })); return; }
  if (t.id === 'fOpen') { const F = [...t.files]; t.value = ''; if (F.length) addFiles(F); return; }
  if (t.id === 'fAddPdf' || t.id === 'fAddImg') { const F = [...t.files]; t.value = ''; if (F.length) addFiles(F, APP.cur + 1); return; }
  if (t.id === 'pRaster') { const p = curPage(); p.raster = t.checked; APP.dirty = true; return; }
  if (t.id === 'pCover') { const f = APP.sel && findItem(APP.sel); if (f) { f.it.bg = t.checked; renderOverlay(); } }
});
document.addEventListener('keydown', (e) => { if ((e.key === 'Delete' || e.key === 'Backspace') && APP.sel && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && $('dlg').hidden) { e.preventDefault(); document.querySelector('[data-act="delItem"]') && document.querySelector('[data-act="delItem"]').click(); }
  if (e.key === 'Escape' && APP.mode !== 'select') setMode('select'); });
(function dropBind() { const d = $('drop'); ['dragenter', 'dragover'].forEach(k => d.addEventListener(k, (e) => { e.preventDefault(); d.classList.add('on'); }));
  ['dragleave', 'drop'].forEach(k => d.addEventListener(k, (e) => { e.preventDefault(); d.classList.remove('on'); })); d.addEventListener('drop', (e) => addFiles([...(e.dataTransfer.files || [])]));
  $('stage').addEventListener('dragover', (e) => e.preventDefault()); $('stage').addEventListener('drop', (e) => { e.preventDefault(); const F = [...(e.dataTransfer.files || [])]; if (F.length) addFiles(F, APP.cur + 1); }); })();
let rzT = null; window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (APP.pages.length) renderPage(); }, 150); });
window.addEventListener('beforeunload', (e) => { if (APP.dirty && APP.pages.length) { e.preventDefault(); e.returnValue = ''; } });
window.__PDFM = { APP, buildPdf, ver: PM_VER };   // ใช้ตรวจสอบในชุดทดสอบ
boot();
})();
