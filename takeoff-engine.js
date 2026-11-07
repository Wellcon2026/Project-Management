/* =====================================================================
   Wellcon Take-off Engine — สูตรคำนวณปริมาณถอดแบบ (ที่เดียวของทั้งระบบ)
   ---------------------------------------------------------------------
   ใช้ร่วมกันระหว่าง QS Take-off (repo นี้) และ Wellcon PM (Quick Measure)
   • ห้ามแก้สูตรในไฟล์นี้ฝั่ง PM — แก้ที่ repo wellcon-qs-takeoff เท่านั้น แล้วคัดลอกไป
   • แก้สูตรเมื่อใด ให้เพิ่ม ENGINE_VERSION และรัน  node tests/engine.test.js
   • ไม่มีโค้ดหน้าจอ / DOM / Supabase ในไฟล์นี้

   หน่วยภายใน
   • พิกัดจุด (pts) = พิกเซลบนภาพแบบที่ render แล้ว  [[x,y], ...]
   • mm (สเกล) = มิลลิเมตรจริง ต่อ 1 พิกเซล ของหน้านั้น  (null = ยังไม่ตั้งสเกล)
   • ผลลัพธ์: ตร.ม. / ม. / จุด · ความสูงผนังเป็น มม. · เผื่อเศษเป็น %
   ===================================================================== */
(function (root, factory) {
  const E = factory();
  if (typeof module === 'object' && module.exports) module.exports = E;
  else root.TakeoffEngine = E;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ENGINE_VERSION = '1.1.0';   // 1.1.0: กฎคำนวณงานในโซน (taskQty) · สูตรเดิมของ 1.0.0 ไม่เปลี่ยน

  /* หน่วยที่แสดง (ใช้เป็น key รวมยอด BOQ ด้วย ห้ามเปลี่ยนข้อความ) */
  const UNIT = { AREA: 'ตร.ม.', LENGTH: 'ม.', COUNT: 'จุด' };

  /* ---------- เรขาคณิตพื้นฐาน (หน่วยพิกเซล) ---------- */

  /** พื้นที่ polygon (สูตร Shoelace) — px² */
  function polyArea(p) {
    let a = 0;
    for (let i = 0; i < p.length; i++) {
      const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
      a += x1 * y2 - x2 * y1;
    }
    return Math.abs(a) / 2;
  }

  /** ความยาวเส้น — px · closed=true รวมช่วงปิดกลับจุดแรก (= เส้นรอบรูป) */
  function polyLength(p, closed) {
    let L = 0;
    for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    if (closed && p.length > 2) L += Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]);
    return L;
  }

  /** จุดกึ่งกลาง (เฉลี่ยจุดมุม) — ใช้วางป้ายชื่อโซน */
  function centroid(p) {
    let x = 0, y = 0;
    p.forEach(v => { x += v[0]; y += v[1]; });
    return [x / p.length, y / p.length];
  }

  /* ---------- แปลงหน่วย px → ค่าจริง ---------- */
  const pxToM = (px, mm) => px * mm / 1000;              // ม.
  const pxAreaToM2 = (a, mm) => a * mm * mm / 1e6;        // ตร.ม.

  /* ---------- สเกล ----------
     r = ตัวคูณที่ใช้ render PDF (pdf.js viewport scale) · PDF 1 pt = 25.4/72 มม. */

  /** ตั้งสเกลจากเส้นอ้างอิง: ระยะจริง (มม.) ÷ ความยาวบนภาพ (px) → มม./px  · ค่าไม่ถูกต้องคืน null */
  function scaleFromCalibration(realMm, px) {
    return realMm > 0 && px > 0 ? realMm / px : null;
  }

  /** ตั้งสเกลจากอัตราส่วนมาตรฐาน 1:ratio (เฉพาะ PDF ที่รู้ r) → มม./px */
  function scaleFromRatio(ratio, r) {
    return 25.4 / 72 / r * ratio;
  }

  /** อ่านกลับเป็นอัตราส่วน 1:N ถ้าใกล้จำนวนเต็ม (คลาดไม่เกิน 0.4%) · ไม่ใช่ → null */
  function ratioOf(mm, r) {
    if (!mm || !r) return null;
    const d = mm * 72 / 25.4 * r;
    return Math.abs(d - Math.round(d)) / d < 0.004 ? Math.round(d) : null;
  }

  /* ---------- ปริมาณของ 1 รายการวัด ----------
     shape: { type:'area'|'length'|'count', pts, deduct?, height?(มม.), waste?(%) }
     คืน { q, u, ...ส่วนประกอบ } หรือ null ถ้าต้องใช้สเกลแต่ยังไม่ตั้ง
     • area   : q = พื้นที่ (ติดลบเมื่อ deduct = หักช่องเปิด/เสา) · perimeter = เส้นรอบรูป ม.
     • length : height>0 → q = ยาว × สูง (ตร.ม. ผนัง) · ไม่มีความสูง → q = ความยาว ม.
     • count  : q = จำนวนจุด (ไม่ต้องใช้สเกล) */
  function measure(shape, mm) {
    if (shape.type === 'count') return { q: shape.pts.length, u: UNIT.COUNT };
    if (!mm) return null;
    if (shape.type === 'area') {
      const a = polyArea(shape.pts) * mm * mm / 1e6, per = polyLength(shape.pts, true) * mm / 1000;
      return { q: shape.deduct ? -a : a, u: UNIT.AREA, area: a, perimeter: per };
    }
    const L = polyLength(shape.pts, false) * mm / 1000;
    if (shape.height > 0) return { q: L * shape.height / 1000, u: UNIT.AREA, length: L, height: shape.height };
    return { q: L, u: UNIT.LENGTH, length: L };
  }

  /** % เผื่อเศษที่ใช้จริง (นับจุดไม่มีเผื่อเศษ) */
  const wastePct = shape => shape.type === 'count' ? 0 : (shape.waste || 0);

  /** ปริมาณรวมเผื่อเศษ */
  const withWaste = (q, pct) => q * (1 + pct / 100);

  /* ---------- สรุป BOQ ----------
     รวมรายการที่ หมวด + รายการ BOQ + หน่วย ตรงกัน เรียงตามลำดับหมวดใน cats
     shapes: [{ ...shape, cat, desc }] · mmOf(shape) → สเกลของหน้าที่ shape อยู่
     cats: [{id,name}] คืน [{cat, catId, desc, u, net, gross}] */
  const NO_DESC = '(ยังไม่ระบุรายการ)';
  function boqRows(shapes, mmOf, cats) {
    const rows = [];
    cats.forEach(c => {
      const map = new Map();
      shapes.filter(s => s.cat === c.id).forEach(s => {
        const q = measure(s, mmOf(s)); if (!q) return;
        const key = (s.desc || NO_DESC) + '|' + q.u;
        const r = map.get(key) || { cat: c.name, catId: c.id, desc: s.desc || NO_DESC, u: q.u, net: 0, gross: 0 };
        r.net += q.q; r.gross += withWaste(q.q, wastePct(s)); map.set(key, r);
      });
      rows.push(...map.values());
    });
    return rows;
  }

  /** ยอดรวมแยกตามหน่วย {หน่วย: ปริมาณ} — ใช้แสดงยอดรวมหัวหมวด */
  function sumByUnit(shapes, mmOf) {
    const m = {};
    shapes.forEach(s => { const q = measure(s, mmOf(s)); if (q) m[q.u] = (m[q.u] || 0) + q.q; });
    return m;
  }

  /* =================================================================
     1 รายการวัด = หลายงาน (รหัส Finish Schedule)  — เพิ่มใน 1.1.0
     task: { rule, height_mm?, openings_count?, opening_width_mm? }
     กฎคำนวณ
       area                     พื้นที่โซน (ตร.ม.)
       area_same                พื้นที่เดียวกับโซน เช่น ฝ้า = พื้น (ตร.ม.)
       perimeter_minus_openings เส้นรอบรูป − (จำนวนช่องเปิด × กว้าง) ไม่ติดลบ (ม.) เช่น บัว
       perimeter_x_height       เส้นรอบรูป × ความสูง มม. (ตร.ม.) เช่น ผนัง
       count                    จุดนับ = จำนวนจุด · โซน/เส้น = 1 (ชุด)
     "เส้นรอบรูป" ของเส้น (length) = ความยาวเส้น · จุดนับใช้ได้เฉพาะกฎ count
     โซนหักออก (deduct เช่น เสา): กฎพื้นที่ = ติดลบ · กฎเส้นรอบรูป = บวก (บัว/ผนังรอบเสาเพิ่มขึ้นจริง)
     ================================================================= */
  const RULES = ['area', 'area_same', 'perimeter_minus_openings', 'perimeter_x_height', 'count'];
  const RULE_UNIT = { area: UNIT.AREA, area_same: UNIT.AREA, perimeter_minus_openings: UNIT.LENGTH, perimeter_x_height: UNIT.AREA, count: null };

  /** กฎนี้ใช้กับรูปทรงนี้ได้ไหม */
  function ruleFits(rule, type) {
    if (rule === 'count') return true;
    if (type === 'count') return false;
    if (rule === 'area' || rule === 'area_same') return type === 'area';
    return true;
  }

  /** ฐานการวัดของรูปทรง: {area, perimeter} (ม., ตร.ม.) หรือ null ถ้ายังไม่ตั้งสเกล */
  function shapeBase(shape, mm) {
    if (shape.type === 'count' || !mm) return null;
    if (shape.type === 'area') return { area: polyArea(shape.pts) * mm * mm / 1e6, perimeter: polyLength(shape.pts, true) * mm / 1000 };
    return { area: null, perimeter: polyLength(shape.pts, false) * mm / 1000 };
  }

  /** ปริมาณของ 1 งานในรูปทรง · คืน { q, u(null = ใช้หน่วยจากคลัง), base, deductM?, height?, missing? }
      หรือ null เมื่อยังไม่ตั้งสเกล / กฎไม่เข้ากับรูปทรง */
  function taskQty(shape, mm, task) {
    const rule = task.rule;
    if (!ruleFits(rule, shape.type)) return null;
    if (rule === 'count') return { q: shape.type === 'count' ? shape.pts.length : 1, u: null, base: null };
    const b = shapeBase(shape, mm); if (!b) return null;
    if (rule === 'area' || rule === 'area_same') return { q: shape.deduct ? -b.area : b.area, u: UNIT.AREA, base: b.area };
    if (rule === 'perimeter_minus_openings') {
      const n = Math.max(0, +task.openings_count || 0), w = Math.max(0, +task.opening_width_mm || 0);
      const dm = n * w / 1000;
      return { q: Math.max(0, b.perimeter - dm), u: UNIT.LENGTH, base: b.perimeter, deductM: dm };
    }
    if (rule === 'perimeter_x_height') {
      const h = Math.max(0, +task.height_mm || 0);
      return { q: b.perimeter * h / 1000, u: UNIT.AREA, base: b.perimeter, height: h, missing: h > 0 ? null : 'height' };
    }
    return null;
  }

  /** สรุป BOQ จาก "บรรทัด" ที่เตรียมไว้แล้ว: [{cat, desc, u, q, waste}] รวมตาม หมวด → รายการ+หน่วย (ลำดับตามที่พบ) */
  function boqFromLines(lines, cats) {
    const rows = [];
    cats.forEach(c => {
      const map = new Map();
      lines.filter(l => l.cat === c.id).forEach(l => {
        const desc = l.desc || NO_DESC, key = desc + '|' + l.u;
        const r = map.get(key) || { cat: c.name, catId: c.id, desc, u: l.u, net: 0, gross: 0 };
        r.net += l.q; r.gross += withWaste(l.q, l.waste || 0); map.set(key, r);
      });
      rows.push(...map.values());
    });
    return rows;
  }

  return {
    ENGINE_VERSION, UNIT, NO_DESC,
    polyArea, polyLength, centroid,
    pxToM, pxAreaToM2,
    scaleFromCalibration, scaleFromRatio, ratioOf,
    measure, wastePct, withWaste, boqRows, sumByUnit,
    RULES, RULE_UNIT, ruleFits, shapeBase, taskQty, boqFromLines
  };
});
