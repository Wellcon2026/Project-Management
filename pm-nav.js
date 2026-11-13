/* =====================================================================
   Wellcon PM — ปุ่ม 🏠 หน้าแรกของฉัน + ออกจากระบบ สำหรับหน้าแยก (claim.html · quick-measure.html)
   • ใส่ปุ่มท้ายแถบหัวหน้า (.hdr / .sh-h) อัตโนมัติ — หน้าวาดหัวใหม่ก็ใส่ให้ใหม่
   • 🏠 → Wellcon PM หน้าแรกตามบทบาท (/#/work) · ออกจากระบบ → ถามยืนยัน แล้วล้าง session ของ PM ในเครื่อง
   ===================================================================== */
(() => {
  'use strict';
  const stg = /[?&]env=staging/.test(location.search);
  const H = window.CLAIM_HOST || null;   // v1.2.0 หน้า Claim ในแอป Site Work → 🏠 / ออกจากระบบ ของ Site Work
  const home = H ? H.home() : '/' + (stg ? '?env=staging' : '') + '#/work';
  const B = 'flex:none;width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;';
  const HTML = `<button type="button" data-pmnav="home" title="หน้าแรกของฉัน" aria-label="หน้าแรกของฉัน" style="${B}border:1px solid #C9A961;background:#C9A961;color:#1C1B18"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg></button>`
    + `<button type="button" data-pmnav="out" title="ออกจากระบบ" aria-label="ออกจากระบบ" style="${B}border:1px solid #6B3A30;background:transparent;color:#F0A493"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></button>`;
  // v1.1.0 กระดิ่งแท็ก (wctag.js) — แจ้งเตือนเฉพาะเรื่องที่มีคนแท็กเรา
  const BELL = `<button type="button" data-pmnav="tag" title="แจ้งเตือน · แท็ก" aria-label="แจ้งเตือน · แท็ก" style="${B}position:relative;border:1px solid #4A5878;background:#1F2B45;color:#fff;font-size:17px;line-height:1">🔔<i data-pmbadge style="position:absolute;top:-5px;right:-5px;min-width:19px;height:19px;border-radius:999px;background:#D23F2F;color:#fff;font:700 11px/19px system-ui,sans-serif;font-style:normal;padding:0 5px;box-sizing:border-box;display:none"></i></button>`;
  const paint = () => { const n = window.WCTag ? window.WCTag.count() : 0; document.querySelectorAll('[data-pmbadge]').forEach(i => { i.textContent = n > 99 ? '99+' : String(n); i.style.display = n ? 'block' : 'none'; }); };
  const add = (h) => { if (h.querySelector(':scope > .pmnav')) return; const w = document.createElement('span'); w.className = 'pmnav'; w.style.cssText = 'display:flex;gap:6px;flex:none;align-items:center'; w.innerHTML = (window.WCTag ? BELL : '') + HTML; h.appendChild(w); paint(); };
  if (window.WCTag) window.WCTag.onChange(paint);
  const scan = () => document.querySelectorAll('.hdr, .sh-h').forEach(add);
  const start = () => { scan(); new MutationObserver(scan).observe(document.body, { childList: true, subtree: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-pmnav]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (b.dataset.pmnav === 'home') { location.href = home; return; }
    if (b.dataset.pmnav === 'tag') { if (window.WCTag) window.WCTag.open(); return; }
    if (!confirm(H ? 'ออกจากระบบ Wellcon Site Work?' : 'ออกจากระบบ Wellcon PM?')) return;
    if (H) { try { localStorage.removeItem(H.meKey); sessionStorage.removeItem(H.meKey); } catch (x) {} location.href = H.home(); return; }
    try { localStorage.removeItem('wellcon_pm_session_v1'); } catch (x) {}
    location.href = '/' + (stg ? '?env=staging' : '');
  }, true);
})();
