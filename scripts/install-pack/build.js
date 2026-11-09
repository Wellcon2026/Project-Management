// Build Wellcon App Pack page → Project-Management/install/index.html (QR codes embedded as inline SVG)
const QR = require('qrcode');
const fs = require('fs');
const OUT = process.argv[2];

const APPS = [
  { k: 'pm', name: 'Wellcon PM', full: 'Project Management', url: 'https://project-management-1-weld.vercel.app',
    acc: '#9C7944', tint: '#F4EBDA', who: 'ทุกคน',
    what: 'ระบบหลัก — โครงการ งานประจำวัน รายงาน Daily Report, VO, เอกสาร, My Space',
    login: 'ชื่อผู้ใช้ + PIN ที่ได้รับจากบริษัท' },
  { k: 'dc', name: 'Defect Check', full: 'ตรวจงาน / Punch List', url: 'https://wellcon-defect-check.vercel.app',
    acc: '#C2681E', tint: '#F8E7D8', who: 'PM · Site · QC · Designer',
    what: 'ปักหมุด defect บนแบบ ถ่ายรูป ติดตามการแก้ไข และพิมพ์รายงาน TH / EN',
    login: 'บัญชีเดียวกับ Wellcon PM' },
  { k: 'si', name: 'Site Issues', full: 'ติดตามงาน / ปัญหาหน้างาน', url: 'https://wellcon-site-issues.vercel.app',
    acc: '#1C6A88', tint: '#DCEDF3', who: 'PM · Site · Designer · ทีมที่เกี่ยวข้อง',
    what: 'แจ้งปัญหาหน้างาน แท็กคนรับผิดชอบ ตั้ง due date และติดตามคำตอบ',
    login: 'บัญชีเดียวกับ Wellcon PM' },
  { k: 'sv', name: 'As-Built & Survey', full: 'สำรวจหน้างาน / จุดต่างจากแบบ', url: 'https://wellcon-survey.vercel.app',
    acc: '#4B4FA8', tint: '#ECEBF7', who: 'Site Manager · PM · Designer',
    what: 'วาดผังห้องพร้อมระยะ · ใส่ปลั๊ก สวิตช์ ดวงโคม · ปักหมุดจุดที่ต่างจากแบบ · ส่งออก DXF เปิดใน AutoCAD / SketchUp',
    login: 'บัญชีเดียวกับ Wellcon PM' },
  { k: 'lb', name: 'Layboard', full: 'Presentation Board', url: 'https://layboard.vercel.app',
    acc: '#5B5A48', tint: '#ECE8DC', who: 'Designer · PM · Site Manager',
    what: 'จัดบอร์ดวัสดุ / mood board / พรีเซนต์งานให้ลูกค้า',
    login: 'บัญชี Layboard (แยกจาก PM) · ถ้าใช้ในโครงการ ให้เปิดจากเมนู Layboard ใน Wellcon PM' },
];

(async () => {
  for (const a of APPS) {
    a.qr = await QR.toString(a.url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#1C1B18', light: '#FFFFFF' } });
    a.qr = a.qr.replace('<svg ', '<svg role="img" aria-label="QR ' + a.name + '" ');
  }
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const card = a => `
    <article class="app" style="--acc:${a.acc};--tint:${a.tint}" id="app-${a.k}">
      <div class="app-head">
        <img class="ico" src="${a.k}.svg" width="64" height="64" alt="">
        <div class="app-t">
          <h3>${esc(a.name)}</h3>
          <div class="sub">${esc(a.full)}</div>
        </div>
      </div>
      <p class="what">${esc(a.what)}</p>
      <dl class="meta">
        <div><dt>ใช้โดย</dt><dd>${esc(a.who)}</dd></div>
        <div><dt>เข้าสู่ระบบ</dt><dd>${esc(a.login)}</dd></div>
      </dl>
      <div class="app-foot">
        <div class="qr">${a.qr}</div>
        <div class="acts">
          <a class="btn pri" href="${a.url}" target="_blank" rel="noopener">เปิดและติดตั้ง ↗</a>
          <button class="btn" data-copy="${a.url}">คัดลอกลิงก์</button>
          <code class="url">${a.url.replace('https://', '')}</code>
        </div>
      </div>
    </article>`;
  const pcard = a => `
      <div class="p-app" style="--acc:${a.acc}">
        <div class="p-qr">${a.qr}</div>
        <div class="p-t"><img src="${a.k}-192.png" width="34" height="34" alt=""><div><b>${esc(a.name)}</b><span>${esc(a.full)}</span></div></div>
        <code>${a.url.replace('https://', '')}</code>
      </div>`;
  const lineMsg = '📲 ชุดแอป Wellcon — ติดตั้งลงมือถือ / คอมพิวเตอร์\n'
    + APPS.map(a => `• ${a.name} (${a.full})\n  ${a.url}`).join('\n')
    + '\n\nวิธีติดตั้ง: https://project-management-1-weld.vercel.app/install/\n⚠️ ถ้าเปิดจาก LINE ให้กด ⋮ / แชร์ → "เปิดในเบราว์เซอร์" ก่อน';

  const html = fs.readFileSync(__dirname + '/tpl.html', 'utf8')
    .replace('<!--CARDS-->', APPS.map(card).join(''))
    .replace('<!--PCARDS-->', APPS.map(pcard).join(''))
    .replace('/*LINEMSG*/', JSON.stringify(lineMsg));
  fs.writeFileSync(OUT, html);
  console.log('wrote', OUT, html.length);
})();
