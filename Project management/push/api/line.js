// Vercel Serverless Function — ส่งข้อความเข้า LINE
// วางไฟล์นี้ที่  api/line.js  ใน repo (ระดับเดียวกับโฟลเดอร์ push)
// ตั้งค่า Environment Variable บน Vercel:  LINE_TOKEN = Channel access token

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = process.env.LINE_TOKEN;
  if (!token) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า LINE_TOKEN บน Vercel' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { to, text } = body || {};
  if (!to || !text) return res.status(400).json({ error: 'ต้องระบุ to และ text' });

  try {
    const r = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ to, messages: [{ type: 'text', text: String(text).slice(0, 4900) }] })
    });
    if (!r.ok) {
      const detail = await r.text();
      return res.status(r.status).json({ error: 'LINE ปฏิเสธคำขอ', detail });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
