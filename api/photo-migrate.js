// Vercel Serverless Function — ย้ายรูปที่ฝังเป็นข้อความ (data:image/...;base64) ในตาราง ขึ้นคลังไฟล์ Supabase Storage
// ผู้บริหารสั่ง 20/11/2026: ตาราง punch_log (Defect) 46 MB · daily_reports 4.6 MB ทำให้ซิงก์ช้า / หมดเวลา
//   GET /api/photo-migrate?t=<token>&dry=1     → นับว่าเหลือกี่แถว (ไม่แก้อะไร)
//   GET /api/photo-migrate?t=<token>           → ย้ายทีละแถวจนครบเวลา ~7 วินาที แล้วรายงานผล (เรียกซ้ำจนเหลือ 0)
// - token ต้องตรงกับ app_state 'photoMigrateToken' { v:{ token, exp } } และยังไม่หมดอายุ (ตั้ง / ลบด้วย SQL โดยผู้ดูแล)
// - คิวงาน = ตาราง photo_mig_queue (tbl, id, done, note) — สร้างด้วย SQL พร้อมสำรองตารางก่อนย้าย
// - รูปขึ้น bucket 'general-photo' ที่ mig/<tbl>/<sha1>.<ext> (ชื่อจากเนื้อรูป → เรียกซ้ำไม่ซ้ำไฟล์)
// - แทนทุกข้อความ data:image ในแถวด้วยลิงก์ · Defect: ย้าย key ของ photoFrame / photoRaw (frKey) ตามรูปใหม่ ให้มุมรูป + markup เดิมยังผูกกับรูป
// - บันทึกแบบมีเงื่อนไข updated_at เดิม — ถ้ามีคนแก้แถวระหว่างย้าย ข้ามไปก่อน (รอบหน้าทำใหม่)
import crypto from 'crypto';

export const config = { maxDuration: 60 };
const TABLES = ['punch_log', 'daily_reports'];
const BUDGET = 40000, PAR = 4;   // เวลาต่อรอบ · ทำพร้อมกันกี่แถว
const BUCKET = 'general-photo';
// ต้องตรงกับ frKey ใน wellcon-defect-check/app.js
const frKey = (u) => { let h = 0; for (let i = 0; i < u.length; i += 53) h = (h * 31 + u.charCodeAt(i)) | 0; return u.length.toString(36) + '-' + (h >>> 0).toString(36); };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'missing SUPABASE_URL / SUPABASE_SERVICE_KEY' });
  const H = { apikey: key, Authorization: 'Bearer ' + key };
  const J = { ...H, 'Content-Type': 'application/json' };
  const t0 = Date.now();
  try {
    // ---- ตรวจ token ----
    const tk = String((req.query && req.query.t) || '');
    const tr = await fetch(url + '/rest/v1/app_state?select=data&id=eq.photoMigrateToken', { headers: H });
    const trow = tr.ok ? (await tr.json())[0] : null; const tv = trow && trow.data && trow.data.v;
    if (!tv || !tv.token || tk.length < 20 || tk !== tv.token || Date.now() > Number(tv.exp || 0)) return res.status(403).json({ error: 'forbidden' });

    const qr = await fetch(url + '/rest/v1/photo_mig_queue?select=tbl,id&done=eq.false&order=tbl,id', { headers: H });
    if (!qr.ok) return res.status(500).json({ error: 'queue', detail: await qr.text() });
    const queue = (await qr.json()).filter((q) => TABLES.includes(q.tbl));
    if (req.query && req.query.dry) return res.status(200).json({ left: queue.length, byTable: TABLES.map((t) => [t, queue.filter((q) => q.tbl === t).length]) });

    const out = { done: [], skipped: [], failed: [], uploaded: 0, bytesBefore: 0, bytesAfter: 0 };
    let qi = 0;
    const worker = async () => { while (qi < queue.length && Date.now() - t0 < BUDGET) { const q = queue[qi++]; await one(q); } };
    const one = async (q) => {
      try {
        const rr = await fetch(url + '/rest/v1/' + q.tbl + '?select=id,data,updated_at&id=eq.' + encodeURIComponent(q.id), { headers: H });
        const row = rr.ok ? (await rr.json())[0] : null;
        if (!row) { await mark(q, true, 'row gone'); out.skipped.push(q.id); return; }
        const before = JSON.stringify(row.data); out.bytesBefore += before.length;
        const map = new Map();   // dataURL → public URL
        const up = async (s) => {
          if (map.has(s)) return map.get(s);
          const m = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/is.exec(s); if (!m) return s;
          const buf = Buffer.from(m[2], 'base64'); if (!buf.length) return s;
          const ext = /png/.test(m[1]) ? 'png' : /webp/.test(m[1]) ? 'webp' : /gif/.test(m[1]) ? 'gif' : 'jpg';
          const path = 'mig/' + q.tbl + '/' + crypto.createHash('sha1').update(buf).digest('hex') + '.' + ext;
          const u = await fetch(url + '/storage/v1/object/' + BUCKET + '/' + path, { method: 'POST', headers: { ...H, 'Content-Type': m[1], 'x-upsert': 'true', 'cache-control': 'max-age=31536000' }, body: buf });
          if (!u.ok) throw new Error('upload ' + u.status + ' ' + (await u.text()).slice(0, 160));
          const pub = url + '/storage/v1/object/public/' + BUCKET + '/' + path; map.set(s, pub); out.uploaded++; return pub;
        };
        const all = []; const scan = (v) => { if (typeof v === 'string') { if (/^data:image\//i.test(v)) all.push(v); } else if (Array.isArray(v)) v.forEach(scan); else if (v && typeof v === 'object') Object.values(v).forEach(scan); };
        scan(row.data); const uniq = [...new Set(all)];
        for (let i = 0; i < uniq.length; i += 4) await Promise.all(uniq.slice(i, i + 4).map(up));   // อัปโหลดพร้อมกันครั้งละ 4 รูป
        const walk = async (v) => {
          if (typeof v === 'string') return /^data:image\//i.test(v) ? await up(v) : v;
          if (Array.isArray(v)) { const a = []; for (const x of v) a.push(await walk(x)); return a; }
          if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = await walk(v[k]); return o; }
          return v;
        };
        const data = await walk(row.data);
        if (!map.size) { await mark(q, true, 'no image'); out.skipped.push(q.id); return; }
        // Defect: มุมรูป / markup ผูกด้วย frKey(รูป) → ย้าย key ตามรูปใหม่
        if (q.tbl === 'punch_log') {
          const kmap = {}; map.forEach((nu, old) => { kmap[frKey(old)] = frKey(nu); });
          for (const f of ['photoFrame', 'photoRaw']) {
            const o = data[f]; if (!o || typeof o !== 'object' || Array.isArray(o)) continue;
            const n = {}; Object.keys(o).forEach((k) => { n[kmap[k] || k] = o[k]; }); data[f] = n;
          }
        }
        const after = JSON.stringify(data); out.bytesAfter += after.length;
        const pr = await fetch(url + '/rest/v1/' + q.tbl + '?id=eq.' + encodeURIComponent(q.id) + '&updated_at=eq.' + encodeURIComponent(row.updated_at), {
          method: 'PATCH', headers: { ...J, Prefer: 'return=representation' }, body: JSON.stringify({ data, updated_at: new Date().toISOString(), updated_by: 'photo-migrate' }) });
        const got = pr.ok ? await pr.json() : null;
        if (!pr.ok) throw new Error('patch ' + pr.status + ' ' + (await pr.text()).slice(0, 160));
        if (!got || !got.length) { out.skipped.push(q.id + ' (แก้ระหว่างย้าย — รอบหน้า)'); return; }
        await mark(q, true, map.size + ' รูป · ' + Math.round(before.length / 1024) + ' → ' + Math.round(after.length / 1024) + ' KB');
        out.done.push(q.tbl + ':' + q.id);
      } catch (e) { out.failed.push(q.tbl + ':' + q.id + ' ' + String(e && e.message || e).slice(0, 200)); await mark(q, false, String(e && e.message || e).slice(0, 300)); }
    };
    await Promise.all(Array.from({ length: PAR }, worker));
    const lr = await fetch(url + '/rest/v1/photo_mig_queue?select=id&done=eq.false', { headers: H });
    out.left = lr.ok ? (await lr.json()).length : null; out.ms = Date.now() - t0;
    return res.status(200).json(out);
  } catch (e) { return res.status(500).json({ error: String(e && e.message || e) }); }

  async function mark(q, done, note) {
    await fetch(url + '/rest/v1/photo_mig_queue?tbl=eq.' + q.tbl + '&id=eq.' + encodeURIComponent(q.id), { method: 'PATCH', headers: { ...J, Prefer: 'return=minimal' }, body: JSON.stringify({ done, note, at: new Date().toISOString() }) });
  }
}
