// Vercel Serverless Function — สะพานเชื่อม Mango ERP (อ่านอย่างเดียว)
// API key เก็บที่ Vercel ENV เท่านั้น — ห้ามใส่ในแอป (index.html เปิดดูโค้ดได้ทุกคน)
// ENV บน Vercel (ตามคู่มือ Mango: OAuth client_credentials → Bearer access_token อายุ 120 วินาที):
//   MANGO_BASE_URL       = https://hwc-uat.mangoanywhere.com/wellcon.demo.service      (UAT · ของจริงเปลี่ยนตามที่ Mango ให้)
//   MANGO_CLIENT_ID      = apiprojectstaus                                          (Client ID จากหน้า API Tokens)
//   MANGO_CLIENT_SECRET  = (Token ID จากหน้า API Tokens — เป็นความลับ ห้ามแชร์)
//   MANGO_TOKEN_PATH     = /OAuth/token                                             (ค่าเริ่มต้น)
//   MANGO_PATH_PROJECTS  = /AnywhereAPI/PM/ProjectStatusReadList                    (ค่าเริ่มต้น)
//   MANGO_PATH_PR / MANGO_PATH_PO = (รอ Mango เปิด scope ให้)
//   MANGO_API_KEY        = (ทางเลือก — ใช้แทน OAuth ถ้า Mango ให้ key ถาวร)
//   WC_ALLOWED_ORIGIN    = https://project-management-1-weld.vercel.app
// เรียกจากแอป: GET /api/mango?type=ping|projects|pr|po&from=YYYY-MM-DD&project=00602022
// คืน: { ok, type, at, rows:[…ฟิลด์มาตรฐานด้านล่าง…], raw? }

const F = {
  // คีย์ = ชื่อเดียวกับที่แอปใช้ (MG_COLS) · ชื่อแรก = หัวคอลัมน์ไทยใน Export Project Status Overview (A–AZ) ตรงตัว
  projects: {
    no: ['เลขที่โครงการ', 'ProjectNo', 'project_no', 'projectCode'],
    name: ['ชื่อโครงการ', 'ProjectName', 'project_name', 'name'],
    ref: ['รหัสอ้างอิง', 'RefCode', 'ref_code', 'ReferenceCode'],
    grp: ['กลุ่ม', 'Group', 'group'],
    pm: ['ผู้จัดการโครงการ', 'ProjectManager', 'pm'],
    site: ['วิศวกรประจำไซต์งาน', 'วิศวกรประจำไซต์', 'SiteEngineer'],
    status: ['สถานะโครงการ', 'Status', 'project_status'],
    start: ['วันที่เริ่ม', 'StartDate', 'start_date'],
    end: ['วันที่สิ้นสุด', 'EndDate', 'end_date'],
    client: ['ลูกค้า', 'CustomerName', 'customer'],
    contract: ['จำนวนเงินสัญญา', 'ContractAmount', 'contract_amount'],
    vo: ['มูลค่างานเพิ่มลด', 'VOAmount', 'variation'],
    total: ['ยอดเงินรวม', 'TotalAmount', 'total'],
    budget: ['งบประมาณเริ่มต้น', 'Budget'],
    invoiced: ['ออกใบแจ้งหนี้แล้ว', 'InvoicedAmount', 'invoiced'],
    invPct: ['Invoiced (%)', 'InvoicedPct'],
    deliv: ['ส่งมอบงาน', 'Delivered'],
    remaining: ['เงินคงเหลือในสัญญา', 'Remaining', 'remaining'],
    cost: ['ต้นทุนบัญชี', 'ActualCost', 'cost'],
    pl: ['กำไร/ขาดทุนตามบัญชี', 'ProfitLoss', 'pl'],
    plPct: ['P/L (%)', 'ProfitLossPct', 'pl_pct'],
    cashIn: ['กระแสเงินสดรับ', 'CashIn', 'cash_in'],
    cashOut: ['กระแสเงินสดจ่าย', 'CashOut', 'cash_out'],
    cashNet: ['กระแสเงินสดคงเหลือ', 'CashNet'],
    arAdv: ['ลูกหนี้เงินรับล่วงหน้า', 'ARAdvance'],
    ar: ['ลูกหนี้คงค้าง', 'AROutstanding'],
    arRet: ['ลูกหนี้เงินประกัน', 'ARRetention'],
    ap: ['เจ้าหนี้คงค้าง', 'APOutstanding', 'ap'],
    poOpen: ['ใบสั่งซื้อคงค้าง', 'POOutstanding', 'po_open'],
    subOpen: ['สัญญาจ้างคงค้าง', 'SubcontractOutstanding'],
  },
  pr: {
    no: ['PRNo', 'pr_no', 'DocNo', 'เลขที่ใบขอซื้อ'],
    date: ['PRDate', 'pr_date', 'DocDate', 'วันที่'],
    project: ['ProjectNo', 'project_no', 'เลขที่โครงการ'],
    desc: ['Description', 'Remark', 'รายละเอียด'],
    amount: ['Amount', 'TotalAmount', 'จำนวนเงิน'],
    status: ['Status', 'ApproveStatus', 'สถานะ'],
    by: ['RequestBy', 'CreateBy', 'ผู้ขอ'],
    po: ['PONo', 'po_no', 'เลขที่ใบสั่งซื้อ'],
  },
  po: {
    no: ['PONo', 'po_no', 'DocNo', 'เลขที่ใบสั่งซื้อ'],
    date: ['PODate', 'po_date', 'DocDate', 'วันที่'],
    project: ['ProjectNo', 'project_no', 'เลขที่โครงการ'],
    supplier: ['SupplierName', 'VendorName', 'ผู้ขาย'],
    desc: ['Description', 'Remark', 'รายละเอียด'],
    amount: ['NetAmount', 'TotalAmount', 'Amount', 'จำนวนเงิน'],
    status: ['Status', 'ApproveStatus', 'สถานะ'],
    received: ['ReceivedPct', 'ReceivePercent', '% รับของ'],
    due: ['DeliveryDate', 'DueDate', 'กำหนดส่ง'],
    pr: ['PRNo', 'pr_no', 'เลขที่ใบขอซื้อ'],
  },
};
const NUM = new Set(['contract', 'vo', 'total', 'budget', 'invoiced', 'invPct', 'deliv', 'remaining', 'cost', 'pl', 'plPct', 'cashIn', 'cashOut', 'cashNet', 'arAdv', 'ar', 'arRet', 'ap', 'poOpen', 'subOpen', 'amount', 'received']);
const DATE = new Set(['start', 'end', 'date', 'due']);
// รับ 01/02/2026 (วว/ดด/ปปปป แบบไฟล์ Export) · 2026-02-01 · Excel serial · ปี พ.ศ. → คืน YYYY-MM-DD
function iso(v) { if (v === '' || v == null) return ''; if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + v * 864e5); return d.toISOString().slice(0, 10); }
  const s = String(v).trim(); let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) { let y = +m[1]; if (y > 2400) y -= 543; return y + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0'); }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (m) { let y = +m[3]; if (y > 2400) y -= 543; return y + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); } return s.slice(0, 10); }
const dec = (s) => String(s).replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function pick(o, keys) { for (const k of keys) { if (o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; } return ''; }
function norm(type, list) {
  const map = F[type];
  return list.map((o) => { const r = {}; for (const k of Object.keys(map)) { let v = pick(o, map[k]); if (NUM.has(k)) v = Number(String(v).replace(/,/g, '')) || 0; else if (DATE.has(k)) v = iso(v); else v = dec(v); r[k] = v; }
    if (type === 'projects') { r.startISO = r.start; r.endISO = r.end; delete r.start; delete r.end; if (r.no) r.no = String(r.no).padStart(8, '0'); }
    return r; }).filter((r) => type !== 'projects' || (r.no && !/grand total/i.test(r.name)));
}
function rowsOf(j) { if (Array.isArray(j)) return j; for (const k of ['data', 'rows', 'items', 'result', 'Data', 'Result']) { if (Array.isArray(j && j[k])) return j[k]; if (j && j[k] && Array.isArray(j[k].rows)) return j[k].rows; } return []; }

export default async function handler(req, res) {
  const allow = process.env.WC_ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Wellcon-User');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'GET only' });
  if (!req.headers['x-wellcon-user']) return res.status(401).json({ ok: false, error: 'no_user' });

  const base = (process.env.MANGO_BASE_URL || '').replace(/\/$/, ''), cid = process.env.MANGO_CLIENT_ID, csec = process.env.MANGO_CLIENT_SECRET, key = process.env.MANGO_API_KEY;
  const type = String(req.query.type || 'ping');
  if (!base || (!key && !(cid && csec))) return res.status(200).json({ ok: false, configured: false, error: 'ยังไม่ได้ตั้งค่า MANGO_BASE_URL + MANGO_CLIENT_ID + MANGO_CLIENT_SECRET ใน Vercel' });
  let bearer = key || '';
  if (!key) {
    try {
      const tr = await fetch(base + (process.env.MANGO_TOKEN_PATH || '/OAuth/token'), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: cid.trim(), client_secret: csec.trim() }).toString() });
      const tt = await tr.text(); let tj = null; try { tj = JSON.parse(tt); } catch (e) {}
      if (!tr.ok || !tj || !tj.access_token) return res.status(200).json({ ok: false, configured: true, step: 'token', status: tr.status, error: 'ขอ access token จาก Mango ไม่สำเร็จ — ตรวจ Client ID / Token ID / Active', sample: tt.slice(0, 200) });
      bearer = tj.access_token;
      if (type === 'ping') return res.status(200).json({ ok: true, configured: true, step: 'token', scope: tj.scope || '', expiresIn: tj.expires_in || 0, at: new Date().toISOString() });
    } catch (e) { return res.status(200).json({ ok: false, configured: true, step: 'token', error: 'เชื่อม Mango ไม่ได้: ' + String(e && e.message || e) }); }
  }
  if (type === 'ping') return res.status(200).json({ ok: true, configured: true, at: new Date().toISOString() });
  const path = { projects: process.env.MANGO_PATH_PROJECTS || '/AnywhereAPI/PM/ProjectStatusReadList', pr: process.env.MANGO_PATH_PR, po: process.env.MANGO_PATH_PO }[type];
  if (!F[type]) return res.status(400).json({ ok: false, error: 'type ต้องเป็น ping | projects | pr | po' });
  if (!path) return res.status(200).json({ ok: false, configured: true, error: 'ยังไม่ได้ตั้ง MANGO_PATH_' + type.toUpperCase() });

  const u = new URL(base + path);
  for (const k of ['from', 'to', 'project']) if (req.query[k]) u.searchParams.set(k, String(req.query[k]));
  try {
    const r = await fetch(u.toString(), { headers: { Authorization: 'Bearer ' + bearer, Accept: 'application/json' } });
    const txt = await r.text(); let j; try { j = JSON.parse(txt); } catch (e) { j = null; }
    if (!r.ok || !j) return res.status(200).json({ ok: false, configured: true, status: r.status, error: 'Mango ตอบกลับผิดรูปแบบ', sample: txt.slice(0, 300) });
    const list = rowsOf(j);
    const out = { ok: true, type, at: new Date().toISOString(), count: list.length, rows: norm(type, list) };
    if (req.query.debug === '1') { out.raw = list.slice(0, 3); out.keys = list[0] ? Object.keys(list[0]) : []; out.top = Array.isArray(j) ? 'array' : Object.keys(j || {}); }
    return res.status(200).json(out);
  } catch (e) {
    return res.status(200).json({ ok: false, configured: true, error: 'เชื่อม Mango ไม่ได้: ' + String(e && e.message || e) });
  }
}
