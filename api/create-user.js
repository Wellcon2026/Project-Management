// Vercel Serverless Function — จัดการบัญชี Supabase Auth (สร้าง / ลบ / เปลี่ยนอีเมล-รหัสผ่าน)
// endpoint เดียว: POST /api/create-user   body: { action: 'create'|'delete'|'update', ... }
// Environment Variables บน Vercel: SUPABASE_URL + SUPABASE_SERVICE_KEY (หรือ SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า SUPABASE_URL / SUPABASE_SERVICE_KEY บน Vercel' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { action = 'create', email, newEmail, password, name, callerToken } = body || {};
  if (!email) return res.status(400).json({ error: 'ต้องระบุ email' });
  if (!callerToken) return res.status(401).json({ error: 'ไม่มีสิทธิ์ (ไม่พบ token ผู้เรียก)' });

  const H = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  try {
    // ยืนยันผู้เรียก: ล็อกอินจริง + เป็น superadmin ใน accounts
    const who = await fetch(url + '/auth/v1/user', { headers: { apikey: key, Authorization: 'Bearer ' + callerToken } });
    if (!who.ok) return res.status(401).json({ error: 'ไม่มีสิทธิ์ (token หมดอายุ — ล็อกอินใหม่)' });
    const caller = await who.json();
    // superadmin เช็คด้วยอีเมลผู้เรียก (บัญชี admin เก่าบางบัญชี uid ใน accounts ไม่ใช่ Auth UUID)
    const cEmail = String(caller.email || '').toLowerCase();
    const q = url + '/rest/v1/accounts?select=data&data->>email=eq.' + encodeURIComponent(cEmail);
    const ar = await fetch(q, { headers: H });
    const rows = ar.ok ? await ar.json() : [];
    const roleKey = rows[0] && rows[0].data && rows[0].data.roleKey;
    if (roleKey !== 'superadmin') return res.status(403).json({ error: 'เฉพาะ Super Admin เท่านั้น' });

    const em = String(email).toLowerCase();
    const findUser = async () => {
      // Auth admin API ไม่มี filter อีเมลตรงๆ ที่เสถียร — ไล่หน้า (ทีมงาน < 1000 คน พอ)
      for (let page = 1; page <= 5; page++) {
        const r = await fetch(url + '/auth/v1/admin/users?page=' + page + '&per_page=200', { headers: H });
        if (!r.ok) break;
        const j = await r.json();
        const list = j.users || j || [];
        const hit = list.find(u => String(u.email || '').toLowerCase() === em);
        if (hit) return hit;
        if (!list.length || list.length < 200) break;
      }
      return null;
    };

    if (action === 'create') {
      if (!password || String(password).length < 8) return res.status(400).json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัว' });
      const cr = await fetch(url + '/auth/v1/admin/users', {
        method: 'POST', headers: H,
        body: JSON.stringify({ email: em, password, email_confirm: true, user_metadata: { name: name || '' } })
      });
      const cj = await cr.json().catch(() => ({}));
      if (!cr.ok) {
        const msg = cj.msg || cj.message || ('HTTP ' + cr.status);
        const dup = /already|registered|exists/i.test(msg);
        return res.status(dup ? 409 : cr.status).json({ error: dup ? 'อีเมลนี้มีบัญชีอยู่แล้ว' : msg });
      }
      return res.status(200).json({ ok: true, action, uid: cj.id, email: cj.email });
    }

    const u = await findUser();

    if (action === 'delete') {
      if (!u) return res.status(200).json({ ok: true, action, note: 'ไม่พบบัญชีนี้ใน Auth (อาจไม่เคยสร้าง) — ถือว่าลบแล้ว' });
      if (String(u.id) === String(caller.id)) return res.status(400).json({ error: 'ลบบัญชีที่กำลังใช้งานอยู่ไม่ได้' });
      const dr = await fetch(url + '/auth/v1/admin/users/' + u.id, { method: 'DELETE', headers: H });
      if (!dr.ok) { const j = await dr.json().catch(() => ({})); return res.status(dr.status).json({ error: j.msg || j.message || ('HTTP ' + dr.status) }); }
      return res.status(200).json({ ok: true, action, uid: u.id });
    }

    if (action === 'update') {
      if (!u) return res.status(404).json({ error: 'ไม่พบบัญชี ' + em + ' ใน Auth — สร้างใหม่ด้วยอีเมลใหม่แทน' });
      const patch = {};
      if (newEmail) { patch.email = String(newEmail).toLowerCase(); patch.email_confirm = true; }
      if (password) { if (String(password).length < 8) return res.status(400).json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัว' }); patch.password = password; }
      if (name !== undefined) patch.user_metadata = { name: name || '' };
      if (!Object.keys(patch).length) return res.status(400).json({ error: 'ไม่มีอะไรให้แก้' });
      const ur = await fetch(url + '/auth/v1/admin/users/' + u.id, { method: 'PUT', headers: H, body: JSON.stringify(patch) });
      const uj = await ur.json().catch(() => ({}));
      if (!ur.ok) return res.status(ur.status).json({ error: uj.msg || uj.message || ('HTTP ' + ur.status) });
      return res.status(200).json({ ok: true, action, uid: u.id, email: uj.email });
    }

    return res.status(400).json({ error: 'action ไม่ถูกต้อง' });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
