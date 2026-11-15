/* =====================================================================
   Wellcon PM — แจ้งเตือนอัปเดต (wcnews.js) · ผู้บริหารสั่ง 14/11/2026
   1) "มีอัปเดตใหม่": เปิดแอปค้างไว้แล้วมีเวอร์ชันใหม่บนเซิร์ฟเวอร์ → หน้าต่างให้กด "อัปเดตเลย" (โหลดหน้าใหม่แบบข้าม cache)
      · ตรวจตอนเปิดแอป · ทุก 5 นาที · เมื่อกลับมาเปิดจอ · กด "ภายหลัง" = เตือนอีกครั้งใน 30 นาที · ไม่โหลดหน้าใหม่เอง (กันงานที่พิมพ์ค้างหาย)
   2) "มีอะไรใหม่": หลังเข้าสู่ระบบ ถ้าเวอร์ชันนี้ยังไม่เคยเห็น → สรุปสิ่งที่เปลี่ยน 1 ครั้ง (จำในเครื่องนั้น)
   3) กดป้ายเลขเวอร์ชันบนหน้าจอ → เปิดดูย้อนหลัง · window.WCNews.open()
   ข้อมูล: /whatsnew.json  [{ v:'v1.401.0', d:'14/11/2026', t:'หัวข้อ', items:['…'] }]  ใหม่สุดอยู่บน
   เวอร์ชันของเครื่องนี้ = เลขใน <script src="/wcnews.js?v=1.401.0"> (scripts/patch-version-label.js เปลี่ยนให้พร้อมป้ายเวอร์ชัน)
   ทุกครั้งที่ขึ้นงาน: เพิ่มรายการบนสุดใน whatsnew.json แล้วรัน patch-version-label.js
   ===================================================================== */
(function () {
  'use strict';
  if (window.WCNews) return;
  var FILE_VER = '1.0.0';
  var SEEN = 'wellcon_pm_news_seen', SESS = 'wellcon_pm_session_v1';
  var POLL_MS = 5 * 60000, SNOOZE_MS = 30 * 60000, WAKE_MS = 60000;
  var sc = document.currentScript || document.querySelector('script[src*="wcnews.js"]');
  var mv = /[?&]v=(\d+\.\d+\.\d+)/.exec((sc && sc.getAttribute('src')) || '');
  var MINE = mv ? 'v' + mv[1] : '';
  var NEWS = null, snooze = 0, lastCheck = 0, wasIn = false, busy = false;
  var num = function (v) { var m = String(v || '').match(/(\d+)\.(\d+)\.(\d+)/); return m ? (+m[1]) * 1e6 + (+m[2]) * 1e3 + (+m[3]) : 0; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var lsGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } };
  var loggedIn = function () { return !!lsGet(SESS); };
  var embedded = function () { try { return window.top !== window; } catch (e) { return true; } };
  var isOpen = function () { return !!document.getElementById('wc-news'); };

  function load() {
    return fetch('/whatsnew.json?ts=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (L) { if (!Array.isArray(L)) return null; L = L.filter(function (x) { return x && num(x.v) && Array.isArray(x.items); }); return L.length ? L : null; })
      .catch(function () { return null; });
  }

  // โหลดหน้าใหม่แบบข้าม cache (แบบเดียวกับปุ่ม "โหลดเวอร์ชันใหม่" ของแอปหลัก)
  function hardReload(ver) {
    var go = function () { try { var u = new URL(location.href); u.searchParams.set('v', String(ver || '').replace(/[^0-9.]/g, '') || String(Date.now())); location.replace(u.toString()); } catch (e) { location.reload(); } };
    var jobs = [];
    try { if (window.caches && caches.keys) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })); } catch (e) { }
    try { if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); })); } catch (e) { }
    Promise.all(jobs).then(go, go);
  }

  function close() { var w = document.getElementById('wc-news'); if (w) w.remove(); }

  // kind: 'update' = มีเวอร์ชันใหม่บนเซิร์ฟเวอร์ · 'new' = มีอะไรใหม่ (หลังอัปเดต / กดดูเอง)
  function show(kind, list, opt) {
    if (!document.body || !list || !list.length) return;
    close(); opt = opt || {};
    var top = list[0], upd = kind === 'update';
    var fresh = function (x) { return upd || (opt.since ? num(x.v) > num(opt.since) : x === top); };
    var w = document.createElement('div'); w.id = 'wc-news'; w.setAttribute('data-kind', kind);
    var B = 'min-height:46px;border-radius:12px;font:inherit;font-size:14.5px;font-weight:700;cursor:pointer;padding:0 20px';
    w.innerHTML =
      '<div data-x="1" style="position:fixed;inset:0;background:rgba(19,17,9,.55);z-index:2147482000"></div>' +
      '<div role="dialog" aria-modal="true" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147482001;width:min(560px,calc(100vw - 28px));max-height:calc(100vh - 40px);display:flex;flex-direction:column;background:#FCFAF5;color:#1C1B18;border-radius:20px;box-shadow:0 22px 60px rgba(0,0,0,.35);font-family:\'IBM Plex Sans Thai\',\'Inter\',system-ui,sans-serif;overflow:hidden">' +
        '<div style="display:flex;align-items:center;gap:12px;padding:18px 18px 14px;background:#1C1B18;color:#fff">' +
          '<div style="width:44px;height:44px;border-radius:12px;background:#B49A6E;color:#1A1712;display:grid;place-items:center;font-weight:800;font-size:19px;flex:none">' + (upd ? '🔔' : 'W') + '</div>' +
          '<div style="flex:1;min-width:0"><div style="font-size:18px;font-weight:700;line-height:1.25">' + (upd ? 'มีอัปเดตใหม่ · ' + esc(top.v) : 'Wellcon PM ' + esc(MINE || top.v) + ' · มีอะไรใหม่') + '</div>' +
          '<div style="font-size:12.5px;color:#C9C2B2;margin-top:2px">' + (upd ? 'เครื่องนี้ยังเป็น ' + esc(MINE) + ' — กด "อัปเดตเลย" เพื่อใช้เวอร์ชันล่าสุด' : 'by Wellcon Interior · อัปเดต ' + esc(top.d || '')) + '</div></div>' +
          '<button data-x="1" aria-label="ปิด" style="width:40px;height:40px;border-radius:50%;border:1px solid #4A463C;background:transparent;color:#fff;font-size:18px;cursor:pointer;flex:none">×</button></div>' +
        '<div style="overflow:auto;padding:14px 18px 4px;-webkit-overflow-scrolling:touch">' +
          list.map(function (c) {
            return '<div style="margin-bottom:14px"><div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px"><b style="font-size:15.5px">' + esc(c.v) + '</b><span style="font-size:12.5px;color:#8E876F">' + esc(c.d || '') + '</span>' +
              (fresh(c) ? '<span style="font-size:11px;font-weight:700;color:#6E5424;background:#F3E4C0;border-radius:20px;padding:2px 9px">ใหม่</span>' : '') + '</div>' +
              (c.t ? '<div style="font-size:14px;font-weight:700;margin-top:3px">' + esc(c.t) + '</div>' : '') +
              '<ul style="margin:5px 0 0;padding-left:20px;font-size:14px;line-height:1.55">' + c.items.map(function (t) { return '<li style="margin-bottom:3px">' + esc(t) + '</li>'; }).join('') + '</ul></div>';
          }).join('') + '</div>' +
        (upd ? '<div style="padding:0 18px;font-size:12.5px;color:#8E3F22">บันทึกงานที่ทำค้างอยู่ให้เรียบร้อยก่อนกดอัปเดต — หน้าจอจะโหลดใหม่</div>' : '') +
        '<div style="display:flex;justify-content:flex-end;gap:8px;padding:12px 18px 16px">' +
          (upd ? '<button data-later="1" style="' + B + ';border:1px solid #DED7C8;background:#fff;color:#6E695E">ภายหลัง</button><button data-go="1" style="' + B + ';border:0;background:#B49A6E;color:#1A1712">อัปเดตเลย</button>'
               : '<button data-x="1" style="' + B + ';border:0;background:#1C1B18;color:#fff">ปิด</button>') +
        '</div></div>';
    w.addEventListener('click', function (e) {
      var t = e.target;
      if (t.getAttribute('data-go')) { lsSet(SEEN, top.v); t.disabled = true; t.textContent = 'กำลังอัปเดต…'; hardReload(top.v); return; }
      if (t.getAttribute('data-later') || t.getAttribute('data-x')) {
        if (upd) snooze = Date.now() + SNOOZE_MS; else lsSet(SEEN, NEWS ? NEWS[0].v : top.v);
        close();
      }
    });
    document.body.appendChild(w);
  }

  function check() {
    if (busy || embedded()) return; busy = true; lastCheck = Date.now();
    load().then(function (L) {
      busy = false; if (!L) return; NEWS = L;
      var top = L[0].v;
      if (MINE && num(top) > num(MINE)) {   // เซิร์ฟเวอร์ใหม่กว่าเครื่องนี้
        if (Date.now() >= snooze && !(isOpen() && document.getElementById('wc-news').getAttribute('data-kind') === 'update')) show('update', L.filter(function (x) { return num(x.v) > num(MINE); }));
        return;
      }
      if (!loggedIn() || isOpen()) return;
      var seen = lsGet(SEEN);
      if (seen !== top) show('new', L, { since: seen });
    }, function () { busy = false; });
  }

  function open() { var go = function (L) { if (L) { NEWS = L; show('new', L, { manual: true, since: lsGet(SEEN) === L[0].v ? '' : lsGet(SEEN) }); } }; if (NEWS) go(NEWS); else load().then(go); }

  function start() {
    wasIn = loggedIn();
    setTimeout(check, 1500);
    setInterval(function () { var n = loggedIn(); if (n && !wasIn) setTimeout(check, 900); wasIn = n; }, 2000);   // เพิ่งเข้าสู่ระบบ → มีอะไรใหม่
    setInterval(function () { if (!document.hidden) check(); }, POLL_MS);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - lastCheck > WAKE_MS) check(); });
    window.addEventListener('online', function () { if (Date.now() - lastCheck > WAKE_MS) check(); });
    // กดป้ายเลขเวอร์ชัน (เช่น v1.401.0) → เปิดดูย้อนหลัง
    document.addEventListener('click', function (e) {
      var t = e.target; if (!t || !t.classList || !t.classList.contains('num') || t.closest('#wc-news')) return;
      if (/^v\d+\.\d+\.\d+$/.test(String(t.textContent || '').trim())) open();
    });
  }
  window.WCNews = { VER: FILE_VER, mine: function () { return MINE; }, open: open, check: check, close: close };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
