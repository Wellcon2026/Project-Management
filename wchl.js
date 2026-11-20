/* =====================================================================
   Wellcon Highlight · ไฮไลต์คำค้นทุกหน้า (v1.0.0 — ผู้บริหารสั่ง 20/11/2026)
   ---------------------------------------------------------------------
   พิมพ์ในช่องค้นหาใดก็ได้ในแอป → คำที่พบบนหน้านั้นขึ้นแถบสีเหลือง + ป้ายลอย "พบ n จุด ▲ ▼" กดเลื่อนไปทีละจุด
   - ช่องค้นหา = input type=search หรือช่องที่ placeholder / aria-label มีคำว่า ค้นหา / ค้น / กรอง / search / filter
   - ใช้ CSS Custom Highlight API (ไม่แก้ DOM ของหน้า → ไม่ชนกับการวาดหน้าจอของแอป) · เบราว์เซอร์ที่ไม่รองรับ = ไม่ทำอะไร
   - ขอบเขต: กล่อง / หน้าต่างที่ช่องค้นหาอยู่ (dialog, main) · ไม่ไฮไลต์ในช่องกรอก / ปุ่มเมนู
   - หน้า "บันทึก · งานของฉัน" (wcnote.js) ไฮไลต์เองอยู่แล้ว → ข้าม
   ใช้: <script src="/wchl.js?v=1.0.0"></script> (โหลดครั้งเดียว ทำงานเอง)
   ===================================================================== */
(function () {
  'use strict';
  if (window.WCHL) return;
  const VER = '1.0.0';
  const OK = typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight === 'function';
  const RE_PH = /ค้นหา|ค้น|กรอง|search|filter/i;
  const SKIP = 'script,style,noscript,textarea,input,select,option,svg,[contenteditable="true"],.wn-ov,.wchl-pill,mark';
  const S = { term: '', scope: null, ranges: [], cur: -1, pill: null, t: 0, mo: null, busy: false };

  function isSearch(el) {
    if (!el || el.tagName !== 'INPUT') return false; const ty = (el.type || 'text').toLowerCase();
    if (ty === 'search') return true; if (ty !== 'text' && ty !== '') return false;
    return RE_PH.test((el.getAttribute('placeholder') || '') + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || ''));
  }
  const visible = (el) => !!(el && (el.offsetParent || (el.getClientRects && el.getClientRects().length)));
  function scopeOf(inp) { return inp.closest('[role="dialog"],[aria-modal="true"],.wct-bx,#dlg,main') || document.body; }

  // หาช่องค้นหาที่มีคำ (ช่องที่เพิ่งพิมพ์ก่อน · ไม่งั้นช่องแรกที่มองเห็นและมีค่า)
  function pickInput() {
    const a = document.activeElement; if (isSearch(a) && String(a.value || '').trim().length >= 2 && !a.closest('.wn-ov')) return a;
    if (S.last && document.contains(S.last) && isSearch(S.last) && visible(S.last) && String(S.last.value || '').trim().length >= 2) return S.last;
    const L = [...document.querySelectorAll('input')].filter(x => isSearch(x) && !x.closest('.wn-ov') && visible(x) && String(x.value || '').trim().length >= 2);
    return L[0] || null;
  }

  function css() { if (document.getElementById('wchl-css')) return; const s = document.createElement('style'); s.id = 'wchl-css';
    s.textContent = `::highlight(wc-hl){background-color:#FFE066;color:#1C1B18}::highlight(wc-hl-cur){background-color:#FF9F1C;color:#1C1B18}
.wchl-pill{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:2147482400;display:flex;align-items:center;gap:4px;background:#1C1B18;color:#F6F1E8;border-radius:999px;padding:4px 4px 4px 14px;font:600 13px 'IBM Plex Sans Thai',system-ui,sans-serif;box-shadow:0 6px 22px rgba(0,0,0,.3);max-width:calc(100vw - 24px)}
.wchl-pill span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.wchl-pill b{color:#FFE066}
.wchl-pill button{border:0;background:rgba(255,255,255,.14);color:#fff;width:36px;height:36px;border-radius:50%;font-size:15px;cursor:pointer;flex:none;-webkit-tap-highlight-color:transparent}
.wchl-pill button:disabled{opacity:.35}@media print{.wchl-pill{display:none!important}}`;
    document.head.appendChild(s); }

  function clear() { if (!OK) return; CSS.highlights.delete('wc-hl'); CSS.highlights.delete('wc-hl-cur'); S.ranges = []; S.cur = -1; S.term = ''; if (S.pill) S.pill.hidden = true; }

  function scan() {
    if (!OK || S.busy) return; S.busy = true;
    try {
      const inp = pickInput(); if (!inp) { clear(); return; }
      const term = String(inp.value).trim(), lq = term.toLowerCase(), scope = scopeOf(inp);
      const keepCur = term === S.term && scope === S.scope ? S.cur : -1;
      S.term = term; S.scope = scope; const R = [];
      const tw = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, { acceptNode: (n) => {
        if (!n.nodeValue || n.nodeValue.length < term.length) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement; if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        return n.nodeValue.toLowerCase().indexOf(lq) >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
      let n, k = 0;
      while ((n = tw.nextNode()) && R.length < 3000 && k++ < 20000) {
        if (!visible(n.parentElement)) continue;
        const v = n.nodeValue.toLowerCase(); let i = 0, j;
        while ((j = v.indexOf(lq, i)) >= 0 && R.length < 3000) { const r = new Range(); r.setStart(n, j); r.setEnd(n, j + term.length); R.push(r); i = j + term.length; }
      }
      S.ranges = R; S.cur = keepCur >= 0 && keepCur < R.length ? keepCur : -1;
      CSS.highlights.set('wc-hl', new Highlight(...R));
      if (S.cur >= 0) CSS.highlights.set('wc-hl-cur', new Highlight(R[S.cur])); else CSS.highlights.delete('wc-hl-cur');
      pill();
    } catch (e) { console.warn('wchl', e); } finally { S.busy = false; }
  }

  function pill() {
    css(); if (!S.pill) { const p = document.createElement('div'); p.className = 'wchl-pill'; p.setAttribute('translate', 'no'); p.setAttribute('role', 'status');
      p.innerHTML = '<span data-t></span><button type="button" data-p aria-label="จุดก่อนหน้า">▲</button><button type="button" data-n aria-label="จุดถัดไป">▼</button><button type="button" data-x aria-label="ซ่อน">✕</button>';
      p.addEventListener('mousedown', (e) => e.preventDefault());   // ไม่ดึงโฟกัสจากช่องค้นหา
      p.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation();
        if (b.hasAttribute('data-x')) { S.hide = S.term; p.hidden = true; return; } go(b.hasAttribute('data-n') ? 1 : -1); });
      document.body.appendChild(p); S.pill = p; }
    const n = S.ranges.length;
    if (!S.term || S.hide === S.term) { S.pill.hidden = true; return; } S.hide = '';
    S.pill.hidden = false;
    S.pill.querySelector('[data-t]').innerHTML = n ? '🔎 “<b>' + esc(S.term) + '</b>” พบ ' + (n >= 3000 ? '3,000+' : n) + ' จุด' + (S.cur >= 0 ? ' · ' + (S.cur + 1) + '/' + n : '') : '🔎 “<b>' + esc(S.term) + '</b>” ไม่พบในหน้านี้';
    S.pill.querySelectorAll('[data-p],[data-n]').forEach(b => { b.disabled = !n; b.hidden = !n; });
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function go(d) { const n = S.ranges.length; if (!n) return; S.cur = S.cur < 0 ? (d > 0 ? 0 : n - 1) : (S.cur + d + n) % n;
    const r = S.ranges[S.cur]; CSS.highlights.set('wc-hl-cur', new Highlight(r));
    const el = r.startContainer && r.startContainer.parentElement; if (el) { try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { el.scrollIntoView(); } }
    pill(); }

  const later = (ms) => { clearTimeout(S.t); S.t = setTimeout(scan, ms == null ? 160 : ms); };
  function start() {
    if (!OK || !document.body) return;
    document.addEventListener('input', (e) => { if (isSearch(e.target)) { S.last = e.target; S.hide = ''; later(120); } }, true);
    document.addEventListener('focusin', (e) => { if (isSearch(e.target)) { S.last = e.target; later(60); } }, true);
    // หน้าจอวาดใหม่ (ผลค้นหาเปลี่ยน · เปลี่ยนแท็บ) → ไฮไลต์ใหม่ · หยุดเฝ้าเมื่อไม่มีคำค้น เพื่อไม่ให้หนักเครื่อง
    S.mo = new MutationObserver((ms) => { if (!(S.term || S.last)) return; if (S.pill && ms.every(m => S.pill.contains(m.target))) return; later(220); });   // ไม่นับการเปลี่ยนของป้ายลอยเอง (กันวนซ้ำ)
    S.mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('hashchange', () => later(300));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.WCHL = { VER, ok: OK, scan, clear, next: () => go(1), prev: () => go(-1), _S: S };
})();
