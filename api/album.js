// Vercel Serverless Function — ดึงรูปตัวอย่าง (สูงสุด 10 รูป) จากลิงก์แชร์อัลบั้ม Google Photos
// GET /api/album?url=<ลิงก์แชร์>  →  { ok, photos:[url…], count }
// รองรับ: photos.app.goo.gl/… · photos.google.com/share/… (อัลบั้มที่แชร์ด้วยลิงก์)
// ไม่ใช่ API ทางการ — อ่านจากหน้าเว็บที่แชร์สาธารณะ ถ้า Google เปลี่ยนรูปแบบหน้าอาจต้องปรับ regex
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.WC_ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const raw = String(req.query.url || '').trim();
  let u; try { u = new URL(raw); } catch (e) { return res.status(200).json({ ok: false, error: 'bad_url' }); }
  if (!/^(photos\.app\.goo\.gl|photos\.google\.com|goo\.gl)$/i.test(u.hostname)) return res.status(200).json({ ok: false, error: 'unsupported', note: 'รองรับเฉพาะ Google Photos' });
  try {
    const r = await fetch(u.toString(), { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'th,en;q=0.8' } });
    const html = await r.text();
    const seen = new Set(); const photos = [];
    const re = /"(https:\/\/lh3\.googleusercontent\.com\/pw\/[A-Za-z0-9_\-]+)"/g; let m;
    while ((m = re.exec(html)) && photos.length < 10) { const b = m[1]; if (seen.has(b)) continue; seen.add(b); photos.push(b + '=w400-h400-c'); }
    const title = ((html.match(/<meta property="og:title" content="([^"]*)"/) || [])[1] || '').trim();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ ok: photos.length > 0, photos, count: photos.length, title, error: photos.length ? undefined : 'no_photos' });
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'fetch_failed', detail: String((e && e.message) || e) });
  }
}
