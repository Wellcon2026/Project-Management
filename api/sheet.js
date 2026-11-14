// Vercel Serverless Function — ดึง Google Sheet ทั้งเล่ม (ทุกแท็บ) เป็นไฟล์ .xlsx ให้ Auto PR อ่านรายการวัสดุ
//   GET /api/sheet?url=<ลิงก์ Google Sheet>
//   • ชีตต้องแชร์ "ทุกคนที่มีลิงก์ดูได้" (หรือ เผยแพร่ทางเว็บ)
//   • ดึงได้เฉพาะ docs.google.com/spreadsheets เท่านั้น (สร้าง URL เองจากรหัสชีต — ไม่ส่งต่อ URL ที่ผู้ใช้ส่งมาตรง ๆ)
//   • ไม่เก็บไฟล์ · ไม่ต้องตั้งค่า Environment Variable

const MAX = 15 * 1024 * 1024;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const raw = String((req.query && req.query.url) || '');
  const pub = /docs\.google\.com\/spreadsheets\/d\/e\/([A-Za-z0-9_-]{20,200})/.exec(raw);
  const doc = /docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{20,200})/.exec(raw);
  if (!pub && !doc) return res.status(400).json({ ok: false, error: 'ลิงก์ต้องเป็น Google Sheet (docs.google.com/spreadsheets/…)' });
  const src = pub ? 'https://docs.google.com/spreadsheets/d/e/' + pub[1] + '/pub?output=xlsx'
                  : 'https://docs.google.com/spreadsheets/d/' + doc[1] + '/export?format=xlsx';
  try {
    const r = await fetch(src, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WellconPM-AutoPR)' } });
    const ct = String(r.headers.get('content-type') || '');
    if (!r.ok || /text\/html/i.test(ct)) {
      return res.status(403).json({ ok: false, error: 'เปิดชีตไม่ได้ — ตั้งแชร์ชีตเป็น "ทุกคนที่มีลิงก์ดูได้" ก่อน แล้วลองใหม่' });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX) return res.status(413).json({ ok: false, error: 'ไฟล์ใหญ่เกิน 15 MB' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'ดึงชีตไม่สำเร็จ: ' + String((e && e.message) || e) });
  }
}
