/* wcfn.js v1.1.1 — ชื่อเรียกฟังก์ชัน (Feature call names) · Wellcon PM
 * แหล่งเดียวของ "ชื่อเรียกสั้นภาษาอังกฤษ" ของทุกฟังก์ชัน — ใช้คุยกันให้เข้าใจตรงกัน
 * (ผู้บริหารสั่ง 21/11/2026: "give every function the name to call … short in English")
 *
 * หลัก:
 *  - ชื่อไทยบนหน้าจอยังเป็นชื่อหลัก (ตาม CLAUDE.md) · ชื่อเรียกอังกฤษแสดงเป็นป้ายเล็กข้างชื่อ
 *  - อ้างด้วย key ภายใน ('tab:xxx' / 'nav:xxx' / 'dhome') — ไม่ผูกกับข้อความไทย
 *    เปลี่ยนชื่อไทยได้โดยไม่กระทบสิทธิ์ · การ์ด · หมุด
 *  - ชื่อห้ามซ้ำกัน (ยกเว้นหน้าที่เป็นข้อมูลชุดเดียวกัน เช่น proc/procm, nav:subcon/tab:subcon)
 *  - ห้ามใช้ชื่อตำแหน่ง (PM, QS, HR, Finance, Admin) และห้ามใช้ "PR" เป็นชื่อเรียก
 *  - ฟังก์ชันใหม่ทุกตัวต้องเพิ่มชื่อที่นี่ก่อนขึ้นระบบ
 */
(function (root) {
  'use strict';
  var G = { me: 'ส่วนตัว', proj: 'ในโครงการ', qs: 'ราคา · QS', buy: 'จัดซื้อ · จัดจ้าง', site: 'หน้างาน', des: 'ออกแบบ · นำเสนอ', co: 'บริษัท · ระบบ' };
  // key → [ชื่อเรียก, หมวด]
  // key → [ชื่อเรียก (หัวข้อ), หมวด, คำอธิบายไทย (บรรทัดใต้หัวข้อ)] — v1.1.0 ผู้บริหารสั่ง 21/11/2026: การ์ด / เมนู ใช้ชื่ออังกฤษเป็นหัวข้อ ไทยอธิบายด้านล่าง
  var M = {
    'nav:dashboard': ['Home', 'me', 'ภาพรวมทุกโครงการ'], 'nav:inbox': ['My Space', 'me', 'พื้นที่ทำงานของฉัน'], 'nav:work': ['Role Home', 'me', 'หน้าทำงานของฉัน'],
    'nav:note': ['Notes', 'me', 'บันทึก · งานของฉัน'], 'note': ['Notes', 'me', 'บันทึก · งานของฉัน'], 'nav:ai': ['AI', 'me', 'ผู้ช่วย AI'],
    'tab:overview': ['Overview', 'proj', 'ภาพรวมโครงการ'], 'tab:setup': ['Setup', 'proj', 'ตั้งค่าโครงการ'], 'tab:plan': ['Plan', 'proj', 'แผนงาน · ความคืบหน้า'], 'tab:cal': ['Calendar', 'proj', 'ปฏิทิน · วันสำคัญ'],
    'tab:daily': ['Daily Report', 'site', 'รายงานประจำวัน (Site)'], 'tab:rfi': ['RFI', 'proj', 'RFI / RFA · ถามแบบ-ขออนุมัติ'], 'tab:dwg': ['Drawings', 'proj', 'แบบก่อสร้าง (Drawing Log)'],
    'tab:docs': ['Doc Register', 'proj', 'ทะเบียนรับ-ส่งเอกสาร'], 'tab:memo': ['Letters', 'proj', 'ออกหนังสือ / ฟอร์ม'], 'tab:delay': ['Early Warning', 'proj', 'แจ้งล่าช้า'], 'tab:handover': ['Handover', 'proj', 'ส่งมอบงาน'],
    'tab:price': ['Pricing', 'qs', 'ทำราคา · เลือกเครื่องมือ'], 'tab:pbook': ['Price Book', 'qs', 'ราคากลาง'], 'tab:quo': ['Quotation Maker', 'qs', 'ใบเสนอราคาด่วน'], 'tab:qm': ['Takeoff', 'qs', 'วัดหน้างาน'],
    'tab:changes': ['Changes', 'qs', 'VO / SI / EOT · งานเพิ่ม-ลด'], 'tab:aw': ['VO Tracker', 'qs', 'ติดตามงานเพิ่ม (QS)'], 'tab:fin': ['Billing', 'qs', 'การเงิน · งวดเบิกเงิน'], 'nav:qstrack': ['QS Tracking', 'qs', 'ติดตามงาน QS'],
    'tab:apr': ['Buy & Hire', 'buy', 'ใบขอซื้อ · ใบขอจ้าง'], 'tab:proc': ['Material Log', 'buy', 'วัสดุ · จัดซื้อวัสดุ'], 'tab:procm': ['Material Log', 'buy', 'วัสดุ · จัดซื้อวัสดุ'], 'tab:mat': ['Samples', 'buy', 'วัสดุขออนุมัติ · ตัวอย่าง'],
    'tab:subcon': ['Subcon', 'buy', 'สัญญาช่าง · จ่ายงวดช่าง'], 'nav:subcon': ['Subcon', 'buy', 'จัดจ้าง · สัญญาช่าง'], 'tab:spo': ['Custom Order', 'buy', 'ของสั่งทำ · ของนำเข้า'], 'tab:prod': ['Production', 'buy', 'งานผลิตโรงงาน (FF&E)'],
    'tab:mango': ['Mango', 'buy', 'ระบบ ERP · ใบขอซื้อ / ใบสั่งซื้อ'], 'nav:procurement': ['Purchasing', 'buy', 'จัดซื้อ · วัสดุ (รวมทุกโครงการ)'], 'nav:store': ['Store', 'buy', 'คลังสินค้า'],
    'tab:qc': ['Site Work', 'site', 'Defect / Survey / Scope'], 'tab:claim': ['Claim', 'site', 'เคลมความเสียหาย'],
    'dhome': ['Design Home', 'des', 'ภาพรวมงานออกแบบ'], 'tab:skp': ['SketchUp', 'des', 'แบบ 3 มิติ (3D)'], 'tab:lay': ['Layboard', 'des', 'บอร์ดนำเสนองาน'], 'tab:photo': ['Photo Editor', 'des', 'แต่งรูปผลงาน'], 'tab:pdf': ['PDF Maker', 'des', 'แก้ไขเอกสาร'],
    'nav:cfo': ['Company Finance', 'co', 'การเงินรวมบริษัท'], 'nav:bglg': ['Bank Guarantee', 'co', 'หนังสือค้ำประกัน BG / LG'], 'nav:hr': ['People', 'co', 'บุคลากร'], 'nav:jd': ['JD', 'co', 'ขอบเขตงาน · หน้าที่'],
    'nav:library': ['Library', 'co', 'คลังความรู้'], 'nav:training': ['Training', 'co', 'Wellcon Training · อบรม'], 'nav:admin': ['Users & Teams', 'co', 'ผู้ใช้ & ทีมโครงการ'], 'nav:forms': ['Form Builder', 'co', 'ออกแบบฟอร์มเอกสาร'],
    'nav:system': ['System', 'co', 'ตั้งค่าระบบ'], 'tab:eng': ['Level Gate', 'co', 'การมีส่วนร่วม · แต้มสะสม']
  };
  function name(key) { var r = M[String(key || '')]; return r ? r[0] : ''; }
  // ป้ายที่จะแสดงข้างชื่อไทย — ไม่แสดงซ้ำถ้าชื่อเดิมมีคำนี้อยู่แล้ว (เช่น "Takeoff · วัดหน้างาน")
  function of(key, label) {
    var n = name(key); if (!n) return '';
    var l = String(label || '').toLowerCase(); return l && l.indexOf(n.toLowerCase()) >= 0 ? '' : n;
  }
  // หัวข้อการ์ด / เมนู = ชื่อเรียกอังกฤษ (+ ↗ ถ้าเปิดแท็บใหม่) · ไม่มีในรายชื่อ → ใช้ชื่อเดิม
  function title(key, label) { var n = name(key); if (!n) return String(label || ''); return n + (/↗/.test(String(label || '')) ? ' ↗' : ''); }
  // บรรทัดใต้หัวข้อ = คำอธิบายไทย (ไม่มีในรายชื่อ → ว่าง)
  function desc(key) { var r = M[String(key || '')]; return r ? (r[2] || '') : ''; }
  function all() {
    var seen = {}, out = [];
    Object.keys(M).forEach(function (k) { var n = M[k][0]; if (seen[n]) { seen[n].keys.push(k); return; } seen[n] = { name: n, group: G[M[k][1]] || '', th: M[k][2] || '', keys: [k] }; out.push(seen[n]); });
    return out;
  }
  root.WCFN = { VER: '1.1.1', name: name, of: of, title: title, desc: desc, all: all, groups: G };
})(typeof window !== 'undefined' ? window : globalThis);
