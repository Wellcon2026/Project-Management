// Vercel Serverless Function — สร้างบัญชี Supabase Auth ให้พนักงานใหม่
// วางไฟล์นี้ที่  api/create-user.js  ใน repo (ระดับเดียวกับ api/line.js)
// ตั้งค่า Environment Variables บน Vercel:
//   SUPABASE_URL          = https://<project>.supabase.co
//   SUPABASE_SERVICE_KEY  = คีย์ service_role (Settings → API)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า SUPABASE_URL / SUPABASE_SERVICE_KEY บน Vercel' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { email, password, name, callerToken } = body || {};
  if (!email || !password) return res.status(400).json({ error: 'ต้องระบุ email และ password' });
  if (String(password).length < 8) return res.status(400).json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัว' });
  if (!callerToken) return res.status(401).json({ error: 'ไม่มีสิทธิ์ (ไม่พบ token ผู้เรียก)' });

  const H = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  try {
    // 1) ยืนยันว่าผู้เรียกล็อกอินอยู่จริง
    const who = await fetch(url + '/auth/v1/user', { headers: { apikey: key, Authorization: 'Bearer ' + callerToken } });
    if (!who.ok) return res.status(401).json({ error: 'ไม่มีสิทธิ์ (token หมดอายุ — ล็อกอินใหม่)' });
    const caller = await who.json();
    // 2) ยืนยันว่าผู้เรียกเป็น superadmin ในตาราง accounts
    const q = url + '/rest/v1/accounts?select=data&data->>uid=eq.' + encodeURIComponent(caller.id);
    const ar = await fetch(q, { headers: H });
    const rows = ar.ok ? await ar.json() : [];
    const roleKey = rows[0] && rows[0].data && rows[0].data.roleKey;
    if (roleKey !== 'superadmin') return res.status(403).json({ error: 'เฉพาะ Super Admin เท่านั้น' });
    // 3) สร้างบัญชี Auth
    const cr = await fetch(url + '/auth/v1/admin/users', {
      method: 'POST', headers: H,
      body: JSON.stringify({ email: String(email).toLowerCase(), password, email_confirm: true, user_metadata: { name: name || '' } })
    });
    const cj = await cr.json().catch(() => ({}));
    if (!cr.ok) {
      const msg = cj.msg || cj.message || ('HTTP ' + cr.status);
      const dup = /already|registered|exists/i.test(msg);
      return res.status(dup ? 409 : cr.status).json({ error: dup ? 'อีเมลนี้มีบัญชีอยู่แล้ว' : msg });
    }
    return res.status(200).json({ ok: true, uid: cj.id, email: cj.email });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
