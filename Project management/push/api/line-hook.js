// Vercel Serverless Function — LINE Webhook
// วางไฟล์นี้ที่  api/line-hook.js  ใน repo
// ตั้ง Webhook URL บน LINE Developers เป็น  https://<โดเมน>/api/line-hook
//
// พิมพ์  id  ในแชทหรือกลุ่ม → บอทตอบรหัสกลับมา ใช้วางในหน้าตั้งค่าของแอป

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  const token = process.env.LINE_TOKEN;
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const events = (body && body.events) || [];

  for (const ev of events) {
    const src = ev.source || {};
    const id = src.groupId || src.roomId || src.userId || '';
    const kind = src.groupId ? 'กลุ่ม' : (src.roomId ? 'ห้องแชท' : 'ผู้ใช้');

    // บอทถูกเชิญเข้ากลุ่ม — ทักทายพร้อมบอกรหัสเลย
    if (ev.type === 'join' && token) {
      await reply(token, ev.replyToken,
        'Wellcon PM เชื่อมต่อกลุ่มนี้แล้ว\n\nรหัส' + kind + ':\n' + id +
        '\n\nนำรหัสนี้ไปวางที่ จัดการผู้ใช้ → แจ้งเตือนเข้า LINE');
      continue;
    }

    // พิมพ์ id เพื่อขอรหัส
    if (ev.type === 'message' && ev.message && ev.message.type === 'text' && token) {
      const t = String(ev.message.text || '').trim().toLowerCase();
      if (t === 'id' || t === 'ไอดี' || t === 'รหัส') {
        await reply(token, ev.replyToken, 'รหัส' + kind + ':\n' + id);
      }
    }
  }
  return res.status(200).json({ ok: true });
}

async function reply(token, replyToken, text) {
  if (!replyToken) return;
  try {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] })
    });
  } catch (e) { /* ไม่ต้องขัดจังหวะ webhook */ }
}
