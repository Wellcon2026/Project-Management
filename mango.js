// Vercel Serverless Function — สะพานเชื่อม Mango ERP (อ่านอย่างเดียว)
// API key เก็บที่ Vercel ENV เท่านั้น — ห้ามใส่ในแอป (index.html เปิดดูโค้ดได้ทุกคน)
// ENV บน Vercel:
//   MANGO_BASE_URL       = https://wellcon-interior.mangoanywhere.com/production.anywhere/api   (ยืนยันกับ Mango)
//   MANGO_API_KEY        = ...                       (ได้จาก Mango)
//   MANGO_AUTH_HEADER    = Authorization            (ชื่อ header — ค่าเริ่มต้น Authorization)
//   MANGO_AUTH_PREFIX    = Bearer                   (ว่างได้ถ้า Mango ใช้ key ตรง ๆ)
//   MANGO_PATH_PROJECTS  = /pm/project-status       (path ของ Project Status Overview)
//   MANGO_PATH_PR        = /po/pr-status            (path ของ PR Status)
//   MANGO_PATH_PO        = /po/purchase-order       (path ของ Purchase Order)
//   WC_ALLOWED_ORIGIN    = https://project-management-1-weld.vercel.app  (โดเมนแอป — กันคนอื่นเรียก)
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

  const base = process.env.MANGO_BASE_URL, key = process.env.MANGO_API_KEY;
  const type = String(req.query.type || 'ping');
  if (!base || !key) return res.status(200).json({ ok: false, configured: false, error: 'ยังไม่ได้ตั้งค่า MANGO_BASE_URL / MANGO_API_KEY ใน Vercel' });
  if (type === 'ping') return res.status(200).json({ ok: true, configured: true, at: new Date().toISOString() });
  const path = { projects: process.env.MANGO_PATH_PROJECTS, pr: process.env.MANGO_PATH_PR, po: process.env.MANGO_PATH_PO }[type];
  if (!F[type]) return res.status(400).json({ ok: false, error: 'type ต้องเป็น ping | projects | pr | po' });
  if (!path) return res.status(200).json({ ok: false, configured: true, error: 'ยังไม่ได้ตั้ง MANGO_PATH_' + type.toUpperCase() });

  const u = new URL(base.replace(/\/$/, '') + path);
  for (const k of ['from', 'to', 'project']) if (req.query[k]) u.searchParams.set(k, String(req.query[k]));
  const hn = process.env.MANGO_AUTH_HEADER || 'Authorization', hp = process.env.MANGO_AUTH_PREFIX === undefined ? 'Bearer' : process.env.MANGO_AUTH_PREFIX;
  try {
    const r = await fetch(u.toString(), { headers: { [hn]: (hp ? hp + ' ' : '') + key, Accept: 'application/json' } });
    const txt = await r.text(); let j; try { j = JSON.parse(txt); } catch (e) { j = null; }
    if (!r.ok || !j) return res.status(200).json({ ok: false, configured: true, status: r.status, error: 'Mango ตอบกลับผิดรูปแบบ', sample: txt.slice(0, 300) });
    const list = rowsOf(j);
    const out = { ok: true, type, at: new Date().toISOString(), count: list.length, rows: norm(type, list) };
    if (req.query.debug === '1') out.raw = list.slice(0, 3);
    return res.status(200).json(out);
  } catch (e) {
    return res.status(200).json({ ok: false, configured: true, error: 'เชื่อม Mango ไม่ได้: ' + String(e && e.message || e) });
  }
}
