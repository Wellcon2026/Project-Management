# Wellcon App Pack (`/install/`)

หน้าแจกพนักงานสำหรับติดตั้งแอป Wellcon (PM · Wellcon Site Work · Layboard)
พร้อม QR code และแผ่น A4 (`install/wellcon-app-pack-A4.pdf`)

แก้รายการแอป/ข้อความ → แก้ `build.js` (APPS) หรือ `tpl.html` แล้วสร้างใหม่:

```bash
cd /tmp && mkdir qr && cd qr && npm i qrcode@1.5.4
NODE_PATH=/tmp/qr/node_modules node <repo>/scripts/install-pack/build.js <repo>/install/index.html
```

PDF: เปิด `/install/` ใน Chrome → พิมพ์ → บันทึกเป็น PDF (A4)
