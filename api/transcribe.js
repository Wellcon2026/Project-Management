// Vercel Serverless Function — ถอดเสียงประชุมด้วย OpenAI Whisper
// วางไฟล์นี้ที่ api/transcribe.js ใน repo · ตั้ง ENV บน Vercel: OPENAI_API_KEY = sk-...
// รับ: multipart/form-data { file, lang? } (lang เว้นว่าง = ตรวจภาษาอัตโนมัติ)
// คืน: { text, language, duration } · ไฟล์เสียงไม่ถูกเก็บ — ส่งต่อแล้วทิ้งทันที
export const config = { api: { bodyParser: false }, maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Wellcon-User');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(500).json({ error: 'no_api_key' });

  const chunks = [];
  for await (const c of req) chunks.push(c);
  const buf = Buffer.concat(chunks);
  if (buf.length < 1000) return res.status(400).json({ error: 'empty_audio' });
  if (buf.length > 24 * 1024 * 1024) return res.status(413).json({ error: 'too_large' });   // Whisper จำกัด 25MB/ครั้ง

  const ct = req.headers['content-type'] || '';
  const lang = (req.headers['x-wellcon-lang'] || '').toString().trim();
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: ct || 'audio/webm' }), 'meeting.webm');
  fd.append('model', 'whisper-1');
  fd.append('response_format', 'verbose_json');
  fd.append('temperature', '0');
  if (lang) fd.append('language', lang);
  fd.append('prompt', 'บันทึกการประชุมงานตกแต่งภายใน Wellcon Interior: BOQ, VO, shop drawing, RFI, mock-up, handover, retention, subcontractor');

  try {
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: 'stt_failed', detail: (j.error && j.error.message) || r.status });
    return res.status(200).json({ text: j.text || '', language: j.language || '', duration: j.duration || 0 });
  } catch (e) {
    return res.status(502).json({ error: 'stt_failed', detail: String(e && e.message || e) });
  }
}
