/* wcfn.js v1.0.0 — ชื่อเรียกฟังก์ชัน (Feature call names) · Wellcon PM
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
  var M = {
    'nav:dashboard': ['Home', 'me'], 'nav:inbox': ['My Space', 'me'], 'nav:work': ['Role Home', 'me'], 'nav:note': ['Notes', 'me'], 'note': ['Notes', 'me'], 'nav:ai': ['AI', 'me'],
    'tab:overview': ['Overview', 'proj'], 'tab:setup': ['Setup', 'proj'], 'tab:plan': ['Plan', 'proj'], 'tab:cal': ['Calendar', 'proj'],
    'tab:daily': ['Daily Report', 'site'], 'tab:rfi': ['RFI', 'proj'], 'tab:dwg': ['Drawings', 'proj'], 'tab:docs': ['Doc Register', 'proj'],
    'tab:memo': ['Letters', 'proj'], 'tab:delay': ['Early Warning', 'proj'], 'tab:handover': ['Handover', 'proj'],
    'tab:price': ['Pricing', 'qs'], 'tab:pbook': ['Price Book', 'qs'], 'tab:quo': ['Quotation', 'qs'], 'tab:qm': ['Takeoff', 'qs'],
    'tab:changes': ['Changes', 'qs'], 'tab:aw': ['VO Tracker', 'qs'], 'tab:fin': ['Billing', 'qs'], 'nav:qstrack': ['QS Tracking', 'qs'],
    'tab:apr': ['Buy & Hire', 'buy'], 'tab:proc': ['Material Log', 'buy'], 'tab:procm': ['Material Log', 'buy'], 'tab:mat': ['Samples', 'buy'],
    'tab:subcon': ['Subcon', 'buy'], 'nav:subcon': ['Subcon', 'buy'], 'tab:spo': ['Custom Order', 'buy'], 'tab:prod': ['Production', 'buy'],
    'tab:mango': ['Mango', 'buy'], 'nav:procurement': ['Purchasing', 'buy'], 'nav:store': ['Store', 'buy'],
    'tab:qc': ['Site Work', 'site'], 'tab:claim': ['Claim', 'site'],
    'dhome': ['Design Home', 'des'], 'tab:skp': ['SketchUp', 'des'], 'tab:lay': ['Layboard', 'des'], 'tab:photo': ['Photo Editor', 'des'], 'tab:pdf': ['PDF Maker', 'des'],
    'nav:cfo': ['Company Finance', 'co'], 'nav:bglg': ['Bank Guarantee', 'co'], 'nav:hr': ['People', 'co'], 'nav:jd': ['JD', 'co'],
    'nav:library': ['Library', 'co'], 'nav:training': ['Training', 'co'], 'nav:admin': ['Users & Teams', 'co'], 'nav:forms': ['Form Builder', 'co'],
    'nav:system': ['System', 'co']
  };
  function name(key) { var r = M[String(key || '')]; return r ? r[0] : ''; }
  // ป้ายที่จะแสดงข้างชื่อไทย — ไม่แสดงซ้ำถ้าชื่อเดิมมีคำนี้อยู่แล้ว (เช่น "Takeoff · วัดหน้างาน")
  function of(key, label) {
    var n = name(key); if (!n) return '';
    var l = String(label || '').toLowerCase(); return l && l.indexOf(n.toLowerCase()) >= 0 ? '' : n;
  }
  function all() {
    var seen = {}, out = [];
    Object.keys(M).forEach(function (k) { var n = M[k][0]; if (seen[n]) { seen[n].keys.push(k); return; } seen[n] = { name: n, group: G[M[k][1]] || '', keys: [k] }; out.push(seen[n]); });
    return out;
  }
  root.WCFN = { VER: '1.0.0', name: name, of: of, all: all, groups: G };
})(typeof window !== 'undefined' ? window : globalThis);
