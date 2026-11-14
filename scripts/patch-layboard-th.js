#!/usr/bin/env node
/* =====================================================================
   Layboard — ข้อความบนหน้าจอเป็นภาษาไทย (ผู้บริหารสั่ง 14/11/2026: หน้าจอใช้ภาษาไทย)
     node scripts/patch-layboard-th.js
   แก้เฉพาะ "ข้อความที่แสดง" ระหว่างแท็ก (>Cancel< → >ยกเลิก<) ใน layboard/index.html — ไม่แตะโค้ด / ชื่อคลาส / ค่าในข้อมูล
   ไม่แปลข้อความตัวอย่างในแม่แบบ (ADD A HEADING · MATERIAL · OAK VENEER ฯลฯ) และชื่อเฉพาะ (Layboard · Wellcon)
   รันซ้ำได้ (คำที่แปลแล้วไม่เจออีก) · ถ้าอัปโหลด layboard/index.html ชุดใหม่ ให้รันสคริปต์นี้อีกครั้ง
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'layboard', 'index.html');
let t = fs.readFileSync(file, 'utf8');
const D = {
  'Cancel': 'ยกเลิก', 'Done': 'เสร็จ', 'Colour': 'สี', 'Close': 'ปิด', 'Select all': 'เลือกทั้งหมด', 'Stop': 'หยุด', 'Project': 'โครงการ', 'Copy': 'คัดลอก',
  'Can edit': 'แก้ไขได้', 'Can view': 'ดูได้อย่างเดียว', 'Work email': 'อีเมลที่ทำงาน', 'Position': 'ตำแหน่ง', 'Reset': 'รีเซ็ต', 'Remove': 'เอาออก', 'Text': 'ข้อความ',
  'Set': 'ตั้งค่า', 'Fit': 'พอดีจอ', 'Label': 'ป้ายชื่อ', 'Delete': 'ลบ', 'Image frame': 'กรอบรูป', 'Comment': 'ความเห็น', 'Edit': 'แก้ไข', 'Date': 'วันที่',
  'Editing project master': 'กำลังแก้แม่แบบของโครงการ', 'Clear': 'ล้าง', 'Paper': 'กระดาษ', 'Role': 'สิทธิ์', 'Folder': 'โฟลเดอร์',
  'Lay it out.': 'จัดวางให้สวย', 'Win them over.': 'ชนะใจลูกค้า', 'Project presentation': 'งานนำเสนอโครงการ', 'Welcome back': 'ยินดีต้อนรับกลับ', 'Continue': 'ดำเนินการต่อ',
  'Keep me signed in': 'จำการเข้าสู่ระบบ', 'Import PDF / PPT': 'นำเข้า PDF / PPT', 'Projects': 'โครงการ', 'Person': 'บุคคล', 'Assigned projects': 'โครงการที่ได้รับมอบหมาย',
  'Status': 'สถานะ', 'Folders': 'โฟลเดอร์', 'Uploads': 'ไฟล์ที่อัปโหลด', 'Upload pictures': 'อัปโหลดรูป', 'New board': 'บอร์ดใหม่', 'Import PDF / PowerPoint': 'นำเข้า PDF / PowerPoint',
  'New folder': 'โฟลเดอร์ใหม่', 'File': 'ไฟล์', 'View only': 'ดูอย่างเดียว', 'Check': 'ตรวจ', 'Print': 'พิมพ์', 'Share': 'แชร์', 'Polygon': 'รูปหลายเหลี่ยม',
  'Auto presentation': 'นำเสนออัตโนมัติ', 'Finish': 'เสร็จ', 'Font': 'แบบอักษร', 'Italic': 'ตัวเอียง', 'Text colour': 'สีข้อความ', 'Replace': 'แทนที่', 'As background': 'ตั้งเป็นพื้นหลัง',
  'Unlink': 'ยกเลิกลิงก์', 'Undo picture stretch': 'ยกเลิกการยืดรูป', 'Upload picture': 'อัปโหลดรูป', 'Paste picture': 'วางรูป', 'Shape': 'รูปทรง', 'Fill': 'สีพื้น',
  'Delete point': 'ลบจุด', 'Units': 'หน่วย', 'Ends': 'ปลายเส้น', 'Set the scale from this line': 'ตั้งสเกลจากเส้นนี้', 'Show width / height box': 'แสดงกล่องกว้าง / สูง',
  'Dashed cut line': 'เส้นตัดแบบประ', 'Symbol colour': 'สีสัญลักษณ์', 'Number': 'เลขที่', 'Sheet ref': 'อ้างอิงแผ่น', 'Looking': 'ทิศมอง', 'Title': 'ชื่อเรื่อง', 'Subtitle': 'ชื่อรอง',
  'Show the sheet scale automatically': 'แสดงสเกลของแผ่นอัตโนมัติ', 'Length': 'ความยาว', 'Drop shadow': 'เงา', 'Arrowheads': 'หัวลูกศร', 'Snap': 'ดูดเข้าแนว',
  'Hold Alt while dragging to place freely.': 'กด Alt ค้างขณะลาก เพื่อวางอิสระ', 'Link': 'ลิงก์', 'Bring front': 'นำมาหน้า', 'Send back': 'ส่งไปหลัง', 'Duplicate': 'ทำสำเนา',
  'Import JPG / PNG / PDF / AI': 'นำเข้า JPG / PNG / PDF / AI', 'Import slides from PDF / PowerPoint': 'นำเข้าสไลด์จาก PDF / PowerPoint', 'Shapes': 'รูปทรง',
  'Architecture tools': 'เครื่องมืองานแบบ', 'Dimension': 'เส้นบอกระยะ', 'Scale bar': 'แถบสเกล', 'Section cut': 'เส้นตัด Section', 'Drawing title': 'ชื่อแบบ',
  'Detail circle': 'วงกลม Detail', 'Leader note': 'หมายเหตุชี้เส้น', 'Shadows': 'เงา', 'Soft shadow': 'เงานุ่ม', 'Draw shadow': 'วาดเงา', 'Markup': 'มาร์กอัป', 'Arrow': 'ลูกศร',
  'Callout': 'กล่องข้อความชี้', 'Apply to': 'ใช้กับ', 'Undo': 'ย้อนกลับ', 'New': 'ใหม่', 'Upload files': 'อัปโหลดไฟล์', 'Master': 'แม่แบบ', 'None': 'ไม่มี', 'Guide boxes': 'กล่องไกด์',
  'Rename': 'เปลี่ยนชื่อ', 'Page numbers': 'เลขหน้า', 'Start at': 'เริ่มที่', 'Left': 'ซ้าย', 'Centre': 'กลาง', 'Right': 'ขวา', 'Count this board only': 'นับเฉพาะบอร์ดนี้',
  'Continue across project': 'นับต่อเนื่องทั้งโครงการ', 'Revision number': 'เลข Revision', 'Bottom right': 'ล่างขวา', 'Bottom left': 'ล่างซ้าย', 'Top right': 'บนขวา', 'Top left': 'บนซ้าย',
  'Use on all sheets': 'ใช้กับทุกแผ่น', 'Template category': 'หมวดแม่แบบ', 'Photo book': 'สมุดภาพ', 'Drawing title block': 'กรอบชื่อแบบ',
  'Use current template on all sheets': 'ใช้แม่แบบนี้กับทุกแผ่น', 'Hidden': 'ซ่อน', 'No template': 'ไม่ใช้แม่แบบ', 'Accent': 'สีเน้น', 'My templates': 'แม่แบบของฉัน',
  'No saved templates yet.': 'ยังไม่มีแม่แบบที่บันทึกไว้', 'This sheet is empty.': 'แผ่นนี้ยังว่าง', 'Send': 'ส่ง', 'Delete thread': 'ลบหัวข้อสนทนา',
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let n = 0, words = 0;
Object.keys(D).forEach(k => { const re = new RegExp('(>\\s*)' + esc(k) + '(\\s*<)', 'g'); let c = 0;
  t = t.replace(re, (m, a, b) => { c++; return a + D[k] + b; }); if (c) { n += c; words++; } });
if (!n) { console.log('✓ มีแล้ว — ไม่ต้องแก้ (Layboard ข้อความภาษาไทย)'); process.exit(0); }
fs.writeFileSync(file, t);
console.log('✓ Layboard: แปลข้อความบนหน้าจอ ' + words + ' คำ · ' + n + ' จุด');
