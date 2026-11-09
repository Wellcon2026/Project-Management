#!/usr/bin/env node
/* =====================================================================
   คัดลอกแอป Layboard (repo Wellcon2026/layboard) เข้า Wellcon PM เป็นฟีเจอร์ในโครงการ — /layboard/index.html?pid=<id>
     node scripts/sync-layboard.js /path/to/layboard        (รันใหม่ทุกครั้งที่ Layboard ต้นฉบับอัปเดต)
   - ไฟล์ที่คัดลอก: Layboard.dc.html → layboard/index.html · layboard-core.js · support.js · _ds/
   - แก้ให้: ใช้ฐานข้อมูล Wellcon PM (ตาราง layboard_kv · แยกจากแอป Layboard เดิม) · แยกพื้นที่ตามโครงการ (key p:<pid>:)
     · รูปขึ้น general-photo/layboard/<pid>/ · ล็อกอินด้วยบัญชี PM (ไม่ใช้ PIN) · ออกจากระบบ = กลับ PM
   - ประตูเข้าใช้: layboard/pm-gate.js (ไม่ถูกเขียนทับ)
   - หาจุดแก้ไม่เจอ → หยุด ไม่เขียนไฟล์
   ===================================================================== */
const fs = require('fs'), path = require('path');
const src = process.argv[2]; if (!src || !fs.existsSync(path.join(src, 'Layboard.dc.html'))) { console.error('ใช้: node scripts/sync-layboard.js <โฟลเดอร์ repo layboard>'); process.exit(2); }
const out = path.resolve(__dirname, '..', 'layboard');
const rd = f => fs.readFileSync(path.join(src, f), 'utf8');
function patch(name, s, E) { for (const [lab, a, b] of E) { const n = s.split(a).length - 1; if (n !== 1) { console.error('✗ ' + name + ': จุด "' + lab + '" พบ ' + n + ' ครั้ง (ต้อง 1) — ไม่เขียนไฟล์'); process.exit(1); } s = s.replace(a, () => (typeof b === 'function' ? b(a) : b)); } return s; }

// ---------- layboard-core.js ----------
let core = patch('layboard-core.js', rd('layboard-core.js'), [
  ['ชื่อฐานข้อมูลในเครื่อง', "const DB_NAME = 'layboard', STORE = 'kv';",
    "const PMG = window.LB_PM_CFG || null;   // Wellcon PM: ฐานข้อมูล PM แยกตามโครงการ\n  const NS = k => PMG ? ('p:' + PMG.pid + ':' + k) : k;\n  const TBL = PMG ? PMG.table : 'kv';\n  const DB_NAME = PMG ? ('pm-layboard-' + PMG.schema) : 'layboard', STORE = 'kv';"],
  ['อ่านในเครื่อง', "const lget = k => tx('readonly', s => s.get(k));", "const lget = k => tx('readonly', s => s.get(NS(k)));"],
  ['เขียนในเครื่อง', "const lset = (k, v) => tx('readwrite', s => s.put(v, k));", "const lset = (k, v) => tx('readwrite', s => s.put(v, NS(k)));"],
  ['ลบในเครื่อง', "const ldel = k => tx('readwrite', s => s.delete(k));", "const ldel = k => tx('readwrite', s => s.delete(NS(k)));"],
  ['ที่อยู่ฐานข้อมูล', "const SB_URL = 'https://", (a) => "const SB_URL = PMG ? PMG.url : 'https://"],
  ['คีย์ฐานข้อมูล', "const SB_KEY = 'eyJ", (a) => "const SB_KEY = PMG ? PMG.key : 'eyJ"],
  ['ออนไลน์เสมอใน PM', "const online = !!SB_URL &&", "const online = PMG ? true : !!SB_URL &&"],
  ['หัวคำขอ', "const H = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' };",
    "const H = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' };\n  const hdr = async (x) => PMG ? { apikey: SB_KEY, Authorization: 'Bearer ' + (await PMG.token()), 'Content-Type': 'application/json', 'Accept-Profile': PMG.schema, 'Content-Profile': PMG.schema, ...(x || {}) } : { ...H, ...(x || {}) };"],
  ['อ่านจากฐานข้อมูล', "fetch(SB_URL + '/rest/v1/kv?select=value&key=eq.' + encodeURIComponent(k), { headers: H })", "fetch(SB_URL + '/rest/v1/' + TBL + '?select=value&key=eq.' + encodeURIComponent(NS(k)), { headers: await hdr() })"],
  ['บันทึกลงฐานข้อมูล', "fetch(SB_URL + '/rest/v1/kv?on_conflict=key', { method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ key: k, value: v, updated_at: new Date().toISOString() })",
    "fetch(SB_URL + '/rest/v1/' + TBL + '?on_conflict=key', { method: 'POST', headers: await hdr({ Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify({ key: NS(k), value: v, updated_at: new Date().toISOString(), ...(PMG ? { project: PMG.pid, updated_by: PMG.email || null } : {}) })"],
  ['ลบจากฐานข้อมูล', "if (online) fetch(SB_URL + '/rest/v1/kv?key=eq.' + encodeURIComponent(k), { method: 'DELETE', headers: H }).catch(() => {});",
    "if (online) hdr().then(hh => fetch(SB_URL + '/rest/v1/' + TBL + '?key=eq.' + encodeURIComponent(NS(k)), { method: 'DELETE', headers: hh })).catch(() => {});"],
  ['อัปโหลดรูป', "fetch(SB_URL + '/storage/v1/object/layboard/' + path, { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY,",
    "fetch(SB_URL + '/storage/v1/object/' + (PMG ? PMG.bucket + '/' + PMG.prefix : 'layboard/') + path, { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + (PMG ? await PMG.token() : SB_KEY),"],
  ['ลิงก์รูป', "return SB_URL + '/storage/v1/object/public/layboard/' + path;", "return SB_URL + '/storage/v1/object/public/' + (PMG ? PMG.bucket + '/' + PMG.prefix : 'layboard/') + path;"],
  ['ช่องสื่อสารสด', "  if (online) {\n", "  if (PMG) { try { rt = PMG.sb.channel('pm-layboard-' + PMG.schema + '-' + PMG.pid, { config: { broadcast: { self: false } } }); rt.on('broadcast', { event: 'm' }, ({ payload }) => onRemote(payload)); rt.subscribe(); } catch (e) { console.warn('Layboard live sync unavailable', e); } }\n  else if (online) {\n"],
  ['รอประตูเข้าใช้', "  window.LB = { cloud: online,", "  const __LB = { cloud: online,"],
]);
const endAt = core.lastIndexOf('\n})();'); if (endAt < 0) { console.error('✗ ไม่พบท้ายไฟล์ layboard-core.js'); process.exit(1); }
core = core.slice(0, endAt) + "\n  (window.LB_PM_READY || Promise.resolve(true)).then(ok => { if (ok !== false) window.LB = __LB; });" + core.slice(endAt);

// ---------- Layboard.dc.html → index.html ----------
let html = patch('Layboard.dc.html', rd('Layboard.dc.html'), [
  ['ประตูเข้าใช้ PM', '<script src="layboard-core.js"></script>', '<script src="../vendor/supabase.js"></script>\n<script src="pm-gate.js"></script>\n<script src="layboard-core.js"></script>'],
  ['ผู้ใช้ PM เข้า workspace', "if (!(ws.authV >= 1)) { ws = await this.migrateAuth(ws); await LB.set('workspace', ws); }",
    "if (window.LB_PM) { const before = JSON.stringify([ws.people, ws.projects, ws.authV]); ws = window.LB_PM.adopt(ws); if (JSON.stringify([ws.people, ws.projects, ws.authV]) !== before) await LB.set('workspace', ws); }\n    if (!(ws.authV >= 1)) { ws = await this.migrateAuth(ws); await LB.set('workspace', ws); }"],
  ['ล็อกอินอัตโนมัติด้วยบัญชี PM', "let sid = null; try { sid = sessionStorage.getItem('layboard-session') || localStorage.getItem('layboard-session'); } catch (e) {}",
    "let sid = window.LB_PM ? window.LB_PM.personId : null; if (!sid) try { sid = sessionStorage.getItem('layboard-session') || localStorage.getItem('layboard-session'); } catch (e) {}"],
  ['ออกจากระบบ = กลับ PM', "async logout() {", "async logout() { if (window.LB_PM) { await this.flushDoc(); location.href = window.LB_PM.backUrl; return; }"],
]);
// แอป Layboard ต้นฉบับติดตั้งเป็นแอปของตัวเอง (manifest / ไอคอน ที่ root ของ layboard.vercel.app) — สำเนาใน PM ไม่ใช้ (กันชนกับแอป Wellcon PM)
html = html.replace(/^<title>[^<]*<\/title>\n/m, '').replace(/^<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n/gm, '')
  .replace(/^<meta name="(theme-color|apple-mobile-web-app-capable|mobile-web-app-capable|apple-mobile-web-app-title|application-name)"[^>]*>\n/gm, '');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'layboard-core.js'), core);
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.copyFileSync(path.join(src, 'support.js'), path.join(out, 'support.js'));
fs.cpSync(path.join(src, '_ds'), path.join(out, '_ds'), { recursive: true });
console.log('✓ คัดลอก Layboard เข้า PM แล้ว → layboard/ (ฐานข้อมูล PM · แยกตามโครงการ · ล็อกอินด้วยบัญชี PM)');
