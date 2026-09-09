// Vercel Serverless Function — ถอดเสียงประชุม + แยกผู้พูด (Speaker Labels)
// วางที่ api/transcribe.js · ENV บน Vercel:
//   OPENAI_API_KEY      = sk-...      (Whisper — โหมดเดิม ไม่แยกผู้พูด)
//   ASSEMBLYAI_API_KEY  = ...         (ถ้ามี → ใช้แยกผู้พูด + ตรวจภาษาอัตโนมัติ; ไม่มี → กลับไป Whisper)
// Header จากแอป: X-Wellcon-Lang (ว่าง = auto) · X-Wellcon-Speakers (1 = ต้องการแยกผู้พูด)
// คืน: { text, language, duration, speakers:[{spk,text}]|null, engine }
// ไฟล์เสียงไม่ถูกเก็บ — ส่งต่อแล้วทิ้งทันที (AssemblyAI ลบภายใน 24 ชม. / ตั้ง retention 0 ได้ในบัญชี)
export const config = { api: { bodyParser: false }, maxDuration: 300 };

const LANG_MAP = { th: 'th', en: 'en', zh: 'zh', ja: 'ja', ko: 'ko', vi: 'vi', de: 'de', fr: 'fr' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Wellcon-User, X-Wellcon-Lang, X-Wellcon-Speakers');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const chunks = [];
  for await (const c of req) chunks.push(c);
  const buf = Buffer.concat(chunks);
  if (buf.length < 1000) return res.status(400).json({ error: 'empty_audio' });

  const ct = req.headers['content-type'] || 'audio/webm';
  const lang = String(req.headers['x-wellcon-lang'] || '').trim().slice(0, 2);
  const wantSpk = String(req.headers['x-wellcon-speakers'] || '') === '1';
  const aai = process.env.ASSEMBLYAI_API_KEY;
  const oai = process.env.OPENAI_API_KEY;

  // ---------- AssemblyAI: แยกผู้พูด ----------
  if (aai && wantSpk) {
    try {
      const up = await fetch('https://api.assemblyai.com/v2/upload', { method: 'POST', headers: { authorization: aai, 'content-type': 'application/octet-stream' }, body: buf });
      const uj = await up.json();
      if (!up.ok || !uj.upload_url) throw new Error('upload: ' + (uj.error || up.status));
      const body = { audio_url: uj.upload_url, speaker_labels: true, punctuate: true, format_text: true };
      if (lang && LANG_MAP[lang]) body.language_code = LANG_MAP[lang]; else body.language_detection = true;
      const tr = await fetch('https://api.assemblyai.com/v2/transcript', { method: 'POST', headers: { authorization: aai, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const tj = await tr.json();
      if (!tr.ok || !tj.id) throw new Error('create: ' + (tj.error || tr.status));
      let j = tj, waited = 0;
      while (j.status !== 'completed' && j.status !== 'error' && waited < 270) {
        await new Promise(r => setTimeout(r, 3000)); waited += 3;
        j = await (await fetch('https://api.assemblyai.com/v2/transcript/' + tj.id, { headers: { authorization: aai } })).json();
      }
      if (j.status !== 'completed') throw new Error(j.error || 'timeout');
      const speakers = (j.utterances || []).map(u => ({ spk: u.speaker, text: u.text }));
      const text = speakers.length ? speakers.map(u => 'ผู้พูด ' + u.spk + ': ' + u.text).join('\n') : (j.text || '');
      // ลบต้นฉบับทันที (ไม่รอ retention)
      fetch('https://api.assemblyai.com/v2/transcript/' + tj.id, { method: 'DELETE', headers: { authorization: aai } }).catch(() => {});
      return res.status(200).json({ text, language: j.language_code || '', duration: (j.audio_duration || 0), speakers, engine: 'assemblyai' });
    } catch (e) {
      if (!oai) return res.status(502).json({ error: 'stt_failed', detail: 'AssemblyAI: ' + String(e && e.message || e) });
      // ตกไปใช้ Whisper ด้านล่าง (ไม่มีชื่อผู้พูด)
    }
  }

  // ---------- Whisper: ไม่แยกผู้พูด ----------
  if (!oai) return res.status(500).json({ error: 'no_api_key' });
  if (buf.length > 24 * 1024 * 1024) return res.status(413).json({ error: 'too_large' });
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: ct }), 'meeting.webm');
  fd.append('model', 'whisper-1');
  fd.append('response_format', 'verbose_json');
  fd.append('temperature', '0');
  if (lang) fd.append('language', lang);
  fd.append('prompt', 'บันทึกการประชุมงานตกแต่งภายใน Wellcon Interior: BOQ, VO, shop drawing, RFI, mock-up, handover, retention, subcontractor');
  try {
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + oai }, body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: 'stt_failed', detail: (j.error && j.error.message) || r.status });
    return res.status(200).json({ text: j.text || '', language: j.language || '', duration: j.duration || 0, speakers: null, engine: 'whisper' });
  } catch (e) {
    return res.status(502).json({ error: 'stt_failed', detail: String(e && e.message || e) });
  }
}
