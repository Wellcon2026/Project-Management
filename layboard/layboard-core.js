(function () {
  const PMG = window.LB_PM_CFG || null;   // Wellcon PM: ฐานข้อมูล PM แยกตามโครงการ
  const NS = k => PMG ? ('p:' + PMG.pid + ':' + k) : k;
  const TBL = PMG ? PMG.table : 'kv';
  const DB_NAME = PMG ? ('pm-layboard-' + PMG.schema) : 'layboard', STORE = 'kv';
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(mode, fn) { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, mode); const s = t.objectStore(STORE); const r = fn(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); }
  const lget = k => tx('readonly', s => s.get(NS(k)));
  const lset = (k, v) => tx('readwrite', s => s.put(v, NS(k)));
  const ldel = k => tx('readwrite', s => s.delete(NS(k)));
  // ---- Supabase (shared team storage). Leave SB_URL empty to keep data in this browser only.
  const SB_URL = PMG ? PMG.url : 'https://cjoggtzwgrofdyqlbyld.supabase.co';
  const SB_KEY = PMG ? PMG.key : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqb2dndHp3Z3JvZmR5cWxieWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MzYxNzcsImV4cCI6MjEwOTAxMjE3N30.XFoSJz6ZdoOV_lFyTa2jATMv2Z0NtbPlNAat737iyiM';
  const online = PMG ? true : !!SB_URL && !/localhost|claudeusercontent|127\.0\.0\.1/.test(location.hostname) || /[?&]cloud=1/.test(location.search);
  const H = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' };
  const hdr = async (x) => PMG ? { apikey: SB_KEY, Authorization: 'Bearer ' + (await PMG.token()), 'Content-Type': 'application/json', 'Accept-Profile': PMG.schema, 'Content-Profile': PMG.schema, ...(x || {}) } : { ...H, ...(x || {}) };
  async function get(k) {
    if (!online) return lget(k);
    try { const r = await fetch(SB_URL + '/rest/v1/' + TBL + '?select=value&key=eq.' + encodeURIComponent(NS(k)), { headers: await hdr() }); if (!r.ok) throw new Error(r.status); const j = await r.json(); const v = j[0] ? j[0].value : undefined; lset(k, v).catch(() => {}); return v; }
    catch (e) { console.warn('Layboard cloud read failed, using local copy', e); return lget(k); }
  }
  // Pictures go to Supabase Storage; the saved board keeps only a link.
  const upCache = new Map();
  const ckey = s => s.length + ':' + s.slice(30, 130) + s.slice(-100);
  async function uploadData(s) {
    const ck = ckey(s); if (upCache.has(ck)) return upCache.get(ck);
    const p = (async () => {
      const blob = await (await fetch(s)).blob(), ext = (blob.type.split('/')[1] || 'bin').replace('jpeg', 'jpg').replace('gltf-binary', 'glb').replace(/[^a-z0-9]/g, '');
      const path = new Date().toISOString().slice(0, 7) + '/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.' + ext;
      const r = await fetch(SB_URL + '/storage/v1/object/' + (PMG ? PMG.bucket + '/' + PMG.prefix : 'layboard/') + path, { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + (PMG ? await PMG.token() : SB_KEY), 'Content-Type': blob.type || 'application/octet-stream', 'x-upsert': 'true', 'cache-control': '31536000' }, body: blob });
      if (!r.ok) throw new Error('upload ' + r.status + ' ' + (await r.text()).slice(0, 160));
      return SB_URL + '/storage/v1/object/public/' + (PMG ? PMG.bucket + '/' + PMG.prefix : 'layboard/') + path;
    })();
    upCache.set(ck, p); p.catch(() => upCache.delete(ck)); return p;
  }
  async function offload(v) {
    if (typeof v === 'string') return (v.length > 4000 && /^data:(image|application\/pdf|model)/.test(v)) ? uploadData(v).catch(e => { console.warn('Layboard picture upload failed — kept inside the board', e); return v; }) : v;
    if (Array.isArray(v)) return Promise.all(v.map(offload));
    if (v && typeof v === 'object') { const o = {}; await Promise.all(Object.keys(v).map(async k => { o[k] = await offload(v[k]); })); return o; }
    return v;
  }
  async function set(k, v) {
    await lset(k, v).catch(() => {});
    if (!online) return;
    try { v = await offload(v); const r = await fetch(SB_URL + '/rest/v1/' + TBL + '?on_conflict=key', { method: 'POST', headers: await hdr({ Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify({ key: NS(k), value: v, updated_at: new Date().toISOString(), ...(PMG ? { project: PMG.pid, updated_by: PMG.email || null } : {}) }) }); if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 200)); }
    catch (e) { console.warn('Layboard cloud save failed', e); window.dispatchEvent(new CustomEvent('layboard-cloud-error', { detail: String(e) })); }
  }
  async function del(k) { await ldel(k).catch(() => {}); if (online) hdr().then(hh => fetch(SB_URL + '/rest/v1/' + TBL + '?key=eq.' + encodeURIComponent(NS(k)), { method: 'DELETE', headers: hh })).catch(() => {}); }

  const imgCache = new Map();
  function loadImg(src) {
    if (imgCache.has(src)) return imgCache.get(src);
    const p = new Promise((res) => { const im = new Image(); if (/^https?:/.test(src)) im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    imgCache.set(src, p); if (imgCache.size > 300) imgCache.delete(imgCache.keys().next().value);
    return p;
  }
  function shapePath(x, e) {
    const w = e.w, h = e.h; x.beginPath();
    switch (e.shape) {
      case 'circle': x.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); break;
      case 'rounded': x.roundRect(0, 0, w, h, Math.min(24, w / 2, h / 2)); break;
      case 'pill': x.roundRect(0, 0, w, h, Math.min(w, h) / 2); break;
      case 'arch': x.roundRect(0, 0, w, h, [Math.min(w / 2, h), Math.min(w / 2, h), 0, 0]); break;
      case 'archL': x.roundRect(0, 0, w, h, [Math.min(h / 2, w), 0, 0, Math.min(h / 2, w)]); break;
      default: x.rect(0, 0, w, h);
    }
  }
  function wrap(x, text, maxW) {
    const out = [];
    String(text || '').split('\n').forEach(par => {
      const words = par.split(/(\s+)/); let line = '';
      words.forEach(wd => { const t = line + wd; if (x.measureText(t).width > maxW && line.trim()) { out.push(line); line = wd.trimStart(); } else line = t; });
      out.push(line);
    });
    return out;
  }
  async function drawThumb(page, W, H, fontCss, maxW) {
    maxW = maxW || 360;
    const s = maxW / W, c = document.createElement('canvas'); c.width = Math.round(W * s); c.height = Math.round(H * s);
    const x = c.getContext('2d'); x.fillStyle = (page && page.bgColor) || '#fbf8f3'; x.fillRect(0, 0, c.width, c.height); x.scale(s, s);
    for (const e of page.els || []) {
      if (e.hidden) continue;
      x.save(); x.globalAlpha = e.opacity == null ? 1 : e.opacity;
      if (e.type === 'shadow' && e.poly && e.pts && e.pts.length > 2) {
        x.beginPath(); e.pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath();
        if (e.fill && e.fill !== 'transparent') { x.fillStyle = e.fill; x.fill(); }
        if (e.stroke > 0) { x.strokeStyle = e.strokeColor || '#2b2724'; x.lineWidth = e.stroke; x.lineJoin = 'round'; x.stroke(); }
      } else if (e.type === 'shadow' && e.pts && e.pts.length > 2) {
        x.filter = 'blur(' + (e.blur == null ? 18 : e.blur) + 'px)'; x.globalAlpha *= (e.op == null ? 0.35 : e.op); x.fillStyle = e.color || '#2b2724';
        x.beginPath(); e.pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fill(); x.filter = 'none';
      } else if (e.type === 'dim') {
        const dx = e.x2 - e.x1, dy = e.y2 - e.y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, o = e.off || 0;
        x.strokeStyle = e.color || '#2b2724'; x.lineWidth = e.lw || 1.2; x.beginPath(); x.moveTo(e.x1 + nx * o, e.y1 + ny * o); x.lineTo(e.x2 + nx * o, e.y2 + ny * o); x.stroke();
      } else if (e.type === 'line') {
        x.strokeStyle = e.color || '#2b2724'; x.lineWidth = e.lw || 2; x.lineCap = 'round';
        x.beginPath(); x.moveTo(e.x1, e.y1); x.lineTo(e.x2, e.y2); x.stroke();
      } else {
        x.translate(e.x + e.w / 2, e.y + e.h / 2); x.rotate((e.rot || 0) * Math.PI / 180); x.scale(e.flipH ? -1 : 1, e.flipV ? -1 : 1); x.translate(-e.w / 2, -e.h / 2);
        if (e.type === 'image') {
          shapePath(x, e);
          if (e.src) {
            const im = await loadImg(e.src);
            if (im) {
              x.save(); x.clip();
              const iw = im.naturalWidth, ih = im.naturalHeight;
              if (e.fit === 'contain') { const k = Math.min(e.w / iw, e.h / ih); x.drawImage(im, (e.w - iw * k) / 2, (e.h - ih * k) / 2, iw * k, ih * k); }
              else { const k = Math.max(e.w / iw, e.h / ih) * (e.cz || 1), dw = iw * k, dh = ih * k; x.drawImage(im, (e.w - dw) * (e.cx == null ? 0.5 : e.cx), (e.h - dh) * (e.cy == null ? 0.5 : e.cy), dw, dh); }
              x.restore();
            }
          } else { x.fillStyle = '#efe6d8'; x.fill(); }
        } else if (e.type === 'shape') {
          shapePath(x, e);
          if (e.shape === 'outline') { x.strokeStyle = e.fill; x.lineWidth = e.stroke || 2; x.stroke(); }
          else if (e.fill && e.fill !== 'transparent') { x.fillStyle = e.fill; x.fill(); }
        } else if (e.type === 'text') {
          if (e.fill && e.fill !== 'transparent') { x.fillStyle = e.fill; if (e.pill) x.beginPath(), x.roundRect(0, 0, e.w, e.h, e.h / 2); else x.beginPath(), x.rect(0, 0, e.w, e.h); x.fill(); }
          const pad = e.pill ? 18 : ((e.fill && e.fill !== 'transparent') || e.stroke) ? 14 : 0;
          x.fillStyle = e.color || '#2b2724'; x.font = `${e.italic ? 'italic ' : ''}${e.size || 20}px ${fontCss(e.font)}`; x.textBaseline = 'top';
          const lh = (e.size || 20) * 1.2, lines = wrap(x, e.text, e.w - pad * 2);
          lines.forEach((ln, i) => { const tw = x.measureText(ln).width; const tx = e.align === 'center' ? (e.w - tw) / 2 : e.align === 'right' ? e.w - pad - tw : pad; x.fillText(ln, tx, (pad ? 10 : 0) + i * lh); });
        }
        if (e.stroke && e.shape !== 'outline' && e.type !== 'line') { shapePath(x, e); x.strokeStyle = e.strokeColor || '#2b2724'; x.lineWidth = e.stroke; x.stroke(); }
      }
      x.restore();
    }
    return c.toDataURL('image/jpeg', 0.72);
  }
  async function shrinkImage(src, maxSide) {
    const im = await loadImg(src); if (!im) return src;
    const k = Math.min(1, maxSide / Math.max(im.naturalWidth, im.naturalHeight)); if (k >= 1) return src;
    const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.85);
  }
  const MAX_BYTES = 10 * 1024 * 1024, MAX_SIDE = 5000, VIEW_SIDE = 2560, THUMB_SIDE = 400;
  const bytesOf = d => Math.round((d.length - d.indexOf(',') - 1) * 0.75);
  function readAsDataURL(b) { return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); }
  function alphaOf(im) { try { const c = document.createElement('canvas'), s = 64; c.width = s; c.height = s; const x = c.getContext('2d'); x.drawImage(im, 0, 0, s, s); const d = x.getImageData(0, 0, s, s).data; for (let k = 3; k < d.length; k += 4) if (d[k] < 250) return true; } catch (e) {} return false; }
  function enc(im, side, q, type) { const k = Math.min(1, side / Math.max(im.naturalWidth, im.naturalHeight)); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c.toDataURL(type, q); }
  // Normalises any picture to the storage rules: original ≤ 5000px & ≤ 10 MB, plus a 400px thumbnail.
  async function processImage(input) {
    const src = typeof input === 'string' ? input : await readAsDataURL(input);
    const im = await loadImg(src); if (!im) throw new Error('Unreadable image');
    const alpha = alphaOf(im), type = alpha ? 'image/webp' : 'image/jpeg', long = Math.max(im.naturalWidth, im.naturalHeight);
    let full = src;
    if (long > MAX_SIDE || bytesOf(src) > MAX_BYTES) {
      let side = Math.min(long, MAX_SIDE), q = 0.9; full = enc(im, side, q, type);
      while (bytesOf(full) > MAX_BYTES && q > 0.55) { q -= 0.1; full = enc(im, side, q, type); }
      while (bytesOf(full) > MAX_BYTES && side > 1200) { side = Math.round(side * 0.85); full = enc(im, side, 0.8, type); }
    }
    const fim = full === src ? im : await loadImg(full);
    return { src: full, thumb: enc(fim, THUMB_SIDE, 0.75, type), iw: fim.naturalWidth, ih: fim.naturalHeight, alpha, bytes: bytesOf(full), reduced: full !== src };
  }
  // Light on-screen copy (≤ 2560px) generated on demand and cached; print uses the original.
  const viewCache = new Map(), viewPending = new Set();
  function viewFor(src, onReady) {
    if (!src) return null; const key = src.length + ':' + src.slice(-96);
    if (viewCache.has(key)) return viewCache.get(key);
    if (!viewPending.has(key)) {
      viewPending.add(key);
      loadImg(src).then(im => { if (!im) return; const long = Math.max(im.naturalWidth, im.naturalHeight); viewCache.set(key, long <= VIEW_SIDE ? src : enc(im, VIEW_SIDE, 0.85, alphaOf(im) ? 'image/webp' : 'image/jpeg')); viewPending.delete(key); onReady && onReady(); });
    }
    return null;
  }
  async function sha256(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('layboard:' + s)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }
  // Minimal .xlsx reader: returns rows (arrays of cell strings) of the first sheet.
  async function parseXlsx(blob) {
    const buf = new Uint8Array(await blob.arrayBuffer()), dv = new DataView(buf.buffer);
    let eo = buf.length - 22; while (eo > 0 && dv.getUint32(eo, true) !== 0x06054b50) eo--;
    let p = dv.getUint32(eo + 16, true); const n = dv.getUint16(eo + 10, true), out = {};
    for (let i = 0; i < n; i++) {
      const method = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true), fl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(buf.slice(p + 46, p + 46 + fl)); p += 46 + fl + el + cl;
      if (!/(sharedStrings|sheet1)\.xml$/.test(name)) continue;
      const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), data = buf.slice(start, start + cs);
      out[name] = method === 0 ? new TextDecoder().decode(data) : await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    }
    const dec = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    const strs = ((out['xl/sharedStrings.xml'] || '').match(/<si>[\s\S]*?<\/si>/g) || []).map(s => dec((s.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('')));
    const sheet = out['xl/worksheets/sheet1.xml'] || '';
    return (sheet.match(/<row[\s\S]*?<\/row>/g) || []).map(r => (r.match(/<c [\s\S]*?(<\/c>|\/>)/g) || []).map(c => { const v = (c.match(/<v>([\s\S]*?)<\/v>/) || [])[1]; const inl = (c.match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1]; return /t="s"/.test(c) ? strs[+v] : dec(inl || v || ''); }));
  }
  // ---------- lazy ZIP reader: only the parts we need are read from disk (fine for 100 MB+ files) ----------
  async function openZip(file) {
    const size = file.size, tailLen = Math.min(size, 65536 + 22);
    const tail = new DataView(await file.slice(size - tailLen).arrayBuffer());
    let i = tailLen - 22; while (i >= 0 && tail.getUint32(i, true) !== 0x06054b50) i--;
    if (i < 0) throw new Error('This file is not a valid .pptx');
    const n = tail.getUint16(i + 10, true), cdSize = tail.getUint32(i + 12, true), cdOff = tail.getUint32(i + 16, true);
    const cdBuf = await file.slice(cdOff, cdOff + cdSize).arrayBuffer(), cd = new DataView(cdBuf), entries = {}; let p = 0;
    for (let k = 0; k < n; k++) { const method = cd.getUint16(p + 10, true), cs = cd.getUint32(p + 20, true), fl = cd.getUint16(p + 28, true), el = cd.getUint16(p + 30, true), cl = cd.getUint16(p + 32, true), lo = cd.getUint32(p + 42, true); entries[new TextDecoder().decode(new Uint8Array(cdBuf, p + 46, fl))] = { method, cs, lo }; p += 46 + fl + el + cl; }
    async function blob(name, type) { const e = entries[name]; if (!e) return null; const h = new DataView(await file.slice(e.lo, e.lo + 30).arrayBuffer()); const start = e.lo + 30 + h.getUint16(26, true) + h.getUint16(28, true); const raw = file.slice(start, start + e.cs); const b = e.method === 0 ? raw : await new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob(); return type ? new Blob([b], { type }) : b; }
    return { entries, blob, text: async name => { const b = await blob(name); return b ? b.text() : null; } };
  }
  // ---------- PowerPoint (.pptx) → editable Layboard sheets ----------
  const tick = () => new Promise(r => setTimeout(r, 0));
  const xml = s => new DOMParser().parseFromString(s || '<x/>', 'application/xml');
  const kids = (el, ln) => el ? Array.from(el.children).filter(c => c.localName === ln) : [];
  const kid = (el, ln) => kids(el, ln)[0] || null;
  const desc = (el, ln) => el ? el.getElementsByTagNameNS('*', ln)[0] || null : null;
  const resolvePath = (base, target) => { if (target.startsWith('/')) return target.slice(1); const parts = base.split('/'); parts.pop(); target.split('/').forEach(s => { if (s === '..') parts.pop(); else if (s !== '.') parts.push(s); }); return parts.join('/'); };
  async function relsOf(zip, path) { const d = path.split('/'), f = d.pop(), map = {}; const t = await zip.text(d.join('/') + '/_rels/' + f + '.rels'); if (!t) return map; Array.from(xml(t).getElementsByTagNameNS('*', 'Relationship')).forEach(r => { map[r.getAttribute('Id')] = { target: r.getAttribute('TargetMode') === 'External' ? null : resolvePath(path, r.getAttribute('Target')), type: r.getAttribute('Type') || '' }; }); return map; }
  const rid = el => el && (el.getAttribute('r:embed') || el.getAttribute('r:id') || el.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') || el.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'));
  const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml' };
  async function openPptx(file) {
    const zip = await openZip(file);
    const pres = xml(await zip.text('ppt/presentation.xml')), sz = desc(pres, 'sldSz');
    if (!sz) throw new Error('This file is not a valid .pptx');
    const prel = await relsOf(zip, 'ppt/presentation.xml');
    const slides = Array.from(pres.getElementsByTagNameNS('*', 'sldId')).map(e => prel[rid(e)] && prel[rid(e)].target).filter(Boolean);
    const theme = {}; const tp = Object.values(prel).find(r => /\/theme$/.test(r.type));
    if (tp) { const cs = desc(xml(await zip.text(tp.target)), 'clrScheme'); if (cs) Array.from(cs.children).forEach(c => { const s = desc(c, 'srgbClr'), y = desc(c, 'sysClr'); const v = s ? s.getAttribute('val') : y ? y.getAttribute('lastClr') : null; if (v) theme[c.localName] = '#' + v; }); }
    const info = [];
    for (let i = 0; i < slides.length; i++) { const d = xml(await zip.text(slides[i])); const words = Array.from(d.getElementsByTagNameNS('*', 't')).map(x => x.textContent).join(' ').replace(/\s+/g, ' ').trim(); info.push({ title: words.slice(0, 90), pics: d.getElementsByTagNameNS('*', 'pic').length }); if (i % 8 === 7) await tick(); }
    return { zip, sw: +sz.getAttribute('cx'), sh: +sz.getAttribute('cy'), slides, theme, info, imgCache: {} };
  }
  function mapFont(face) {
    if (!face || face.startsWith('+')) return 'Sans'; const f = face.toLowerCase();
    if (/sarabun/.test(f)) return 'Sarabun (ไทย)'; if (/kanit/.test(f)) return 'Kanit (ไทย)'; if (/noto serif thai/.test(f)) return 'Noto Serif Thai (ไทย)';
    if (/playfair/.test(f)) return 'Playfair Display'; if (/bodoni/.test(f)) return 'Bodoni Moda'; if (/montserrat/.test(f)) return 'Montserrat'; if (/josefin/.test(f)) return 'Josefin Sans'; if (/^lato/.test(f)) return 'Lato';
    if (/garamond|times|georgia|cormorant|baskerville|didot|minion|cambria/.test(f)) return 'Serif'; if (/figtree|arial|helvetica|calibri|segoe|inter|roboto|open sans|tahoma|verdana/.test(f)) return 'Sans';
    return face;
  }
  async function buildSlide(ctx, index, opt) {
    const { zip, sw, sh, theme } = ctx, W = opt.W, H = opt.H, top = opt.top || 0, bottom = opt.bottom || 0;
    const k = Math.min(W / sw, (H - top - bottom) / sh), ox = (W - sw * k) / 2, oy = top + ((H - top - bottom) - sh * k) / 2;
    const path = ctx.slides[index], d = xml(await zip.text(path)), rl = await relsOf(zip, path);
    const stats = { pics: 0, reduced: 0, bytes: 0, skipped: [] }, els = [];
    const phList = doc => Array.from(doc.getElementsByTagNameNS('*', 'sp')).map(sp => { const ph = desc(kid(sp, 'nvSpPr'), 'ph'); return ph ? { type: ph.getAttribute('type') || 'body', idx: ph.getAttribute('idx'), sp } : null; }).filter(Boolean);
    let layoutPh = [], masterPh = [];
    const lp = Object.values(rl).find(r => /slideLayout$/.test(r.type));
    if (lp) { layoutPh = phList(xml(await zip.text(lp.target))); const lrl = await relsOf(zip, lp.target); const mp = Object.values(lrl).find(r => /slideMaster$/.test(r.type)); if (mp) masterPh = phList(xml(await zip.text(mp.target))); }
    const color = el => { if (!el) return null; const s = kid(el, 'srgbClr'); if (s) return '#' + s.getAttribute('val'); const sc = kid(el, 'schemeClr'); if (sc) { const v = sc.getAttribute('val'), m = { tx1: 'dk1', bg1: 'lt1', tx2: 'dk2', bg2: 'lt2' }; return theme[m[v] || v] || null; } const y = kid(el, 'sysClr'); return y ? '#' + (y.getAttribute('lastClr') || '000000') : null; };
    const xf = spPr => { const x = kid(spPr, 'xfrm'); if (!x) return null; const o = kid(x, 'off'), e = kid(x, 'ext'); if (!o || !e) return null; return { x: +o.getAttribute('x'), y: +o.getAttribute('y'), w: +e.getAttribute('cx'), h: +e.getAttribute('cy'), rot: +(x.getAttribute('rot') || 0) / 60000, flipH: x.getAttribute('flipH') === '1', flipV: x.getAttribute('flipV') === '1' }; };
    const phXf = sp => { const ph = desc(kid(sp, 'nvSpPr'), 'ph'); if (!ph) return null; const type = ph.getAttribute('type') || 'body', idx = ph.getAttribute('idx'); for (const list of [layoutPh, masterPh]) { const m = list.find(p => (idx != null && p.idx === idx) || p.type === type) || list.find(p => p.type === type); if (m) { const r = xf(kid(m.sp, 'spPr')); if (r) return r; } } return null; };
    const px = r => ({ x: Math.round(ox + r.x * k), y: Math.round(oy + r.y * k), w: Math.max(4, Math.round(r.w * k)), h: Math.max(4, Math.round(r.h * k)), rot: Math.round(r.rot || 0), flipH: r.flipH, flipV: r.flipV });
    const textOf = (txBody, phType) => {
      const paras = kids(txBody, 'p'); let first = null, algn = null;
      const lines = paras.map(p => { const pPr = kid(p, 'pPr'); if (!algn && pPr && pPr.getAttribute('algn')) algn = pPr.getAttribute('algn'); return Array.from(p.children).map(c => { if (c.localName === 'br') return '\n'; if (c.localName === 'r' || c.localName === 'fld') { const t = kid(c, 't'); if (t && t.textContent.trim() && !first) first = kid(c, 'rPr'); return t ? t.textContent : ''; } return ''; }).join(''); });
      const text = lines.join('\n').replace(/\n+$/, '');
      const rPr = first || desc(txBody, 'endParaRPr'), szA = rPr && rPr.getAttribute('sz');
      const pt = szA ? +szA / 100 : /title/i.test(phType || '') ? 40 : 18;
      const latin = rPr && kid(rPr, 'latin'), fc = rPr && color(kid(rPr, 'solidFill'));
      return { text, size: Math.max(6, Math.round(pt * 12700 * k)), bold: rPr && rPr.getAttribute('b') === '1', italic: rPr && rPr.getAttribute('i') === '1', color: fc || '#2b2724', font: mapFont(latin && latin.getAttribute('typeface')), align: algn === 'ctr' ? 'center' : algn === 'r' ? 'right' : 'left' };
    };
    const picture = async (target, g, crop, shape) => {
      const ext = (target || '').split('.').pop().toLowerCase();
      if (!target || !MIME[ext]) { stats.skipped.push(ext ? ext.toUpperCase() + ' picture' : 'Linked picture'); els.push({ type: 'image', src: null, shape: 'rect', ...g }); return; }
      let a = ctx.imgCache[target];
      if (!a) { try { a = await processImage(await zip.blob(target, MIME[ext])); ctx.imgCache[target] = a; stats.bytes += a.bytes; if (a.reduced) stats.reduced++; } catch (e) { stats.skipped.push('Unreadable picture'); return; } }
      stats.pics++;
      let cz = 1, cx = 0.5, cy = 0.5;
      if (crop) { const l = +(crop.getAttribute('l') || 0) / 1e5, t = +(crop.getAttribute('t') || 0) / 1e5, r = +(crop.getAttribute('r') || 0) / 1e5, b = +(crop.getAttribute('b') || 0) / 1e5, vw = 1 - l - r, vh = 1 - t - b; if (vw > 0 && vh > 0) { const s0 = Math.max(g.w / a.iw, g.h / a.ih); cz = Math.max(1, (g.w / vw) / (a.iw * s0), (g.h / vh) / (a.ih * s0)); cx = l + r > 0 ? l / (l + r) : 0.5; cy = t + b > 0 ? t / (t + b) : 0.5; } }
      els.push({ type: 'image', src: a.src, iw: a.iw, ih: a.ih, alpha: a.alpha, cz, cx, cy, fit: 'cover', shape: shape || 'rect', ...g });
    };
    const shapeOf = prst => prst === 'ellipse' ? 'circle' : /roundRect/.test(prst || '') ? 'rounded' : 'rect';
    const walk = async (container, T) => {
      for (const c of Array.from(container.children)) {
        const ln = c.localName;
        if (ln === 'grpSp') {
          const x = kid(kid(c, 'grpSpPr'), 'xfrm'); if (!x) { await walk(c, T); continue; }
          const o = kid(x, 'off'), e = kid(x, 'ext'), co = kid(x, 'chOff') || o, ce = kid(x, 'chExt') || e;
          const gx = +o.getAttribute('x'), gy = +o.getAttribute('y'), sx = (+e.getAttribute('cx')) / Math.max(1, +ce.getAttribute('cx')), sy = (+e.getAttribute('cy')) / Math.max(1, +ce.getAttribute('cy')), cox = +co.getAttribute('x'), coy = +co.getAttribute('y');
          await walk(c, r => T({ ...r, x: gx + (r.x - cox) * sx, y: gy + (r.y - coy) * sy, w: r.w * sx, h: r.h * sy }));
        } else if (ln === 'sp' || ln === 'cxnSp') {
          const spPr = kid(c, 'spPr'), raw = xf(spPr) || (ln === 'sp' ? phXf(c) : null); if (!raw) continue;
          const g = px(T(raw)), prst = (kid(spPr, 'prstGeom') || { getAttribute: () => null }).getAttribute('prst');
          const lnEl = kid(spPr, 'ln'), lnNo = lnEl && kid(lnEl, 'noFill'), lnC = lnEl && color(kid(lnEl, 'solidFill')), lw = lnEl && lnEl.getAttribute('w') ? +lnEl.getAttribute('w') * k : 1;
          if (ln === 'cxnSp' || /line|connector/i.test(prst || '')) {
            if (lnNo) continue; const x1 = g.flipH ? g.x + g.w : g.x, x2 = g.flipH ? g.x : g.x + g.w, y1 = g.flipV ? g.y + g.h : g.y, y2 = g.flipV ? g.y : g.y + g.h;
            const tail = lnEl && kid(lnEl, 'tailEnd'), head = lnEl && kid(lnEl, 'headEnd'), te = tail && tail.getAttribute('type') && tail.getAttribute('type') !== 'none', he = head && head.getAttribute('type') && head.getAttribute('type') !== 'none';
            els.push({ type: 'line', x1, y1, x2, y2, color: lnC || '#2b2724', lw: Math.max(1, Math.round(lw * 10) / 10), head: te && he ? 'both' : te ? 'end' : he ? 'start' : 'none' }); continue;
          }
          const blip = kid(spPr, 'blipFill') || kid(c, 'blipFill');
          if (blip) { const b = desc(blip, 'blip'); await picture(b && rl[rid(b)] && rl[rid(b)].target, g, desc(blip, 'srcRect'), shapeOf(prst)); continue; }
          const fill = kid(spPr, 'noFill') ? null : color(kid(spPr, 'solidFill'));
          const stroke = lnEl && !lnNo && lnC ? Math.max(0.5, Math.round(lw * 10) / 10) : 0;
          const tb = kid(c, 'txBody'), ph = desc(kid(c, 'nvSpPr'), 'ph'), t = tb ? textOf(tb, ph && ph.getAttribute('type')) : null;
          if (t && t.text.trim()) els.push({ type: 'text', text: t.text, font: t.font, size: t.size, bold: t.bold, italic: t.italic, color: t.color, align: t.align, track: 0, fill: fill || 'transparent', stroke, strokeColor: lnC || '#2b2724', ...g });
          else if (fill || stroke) els.push({ type: 'shape', shape: fill ? shapeOf(prst) : 'outline', fill: fill || lnC || '#2b2724', stroke, strokeColor: lnC || '#2b2724', ...g });
        } else if (ln === 'pic') {
          const raw = xf(kid(c, 'spPr')); if (!raw) continue; const g = px(T(raw));
          const nv = kid(c, 'nvPicPr'); if (nv && (desc(nv, 'videoFile') || desc(nv, 'audioFile') || desc(nv, 'media'))) { stats.skipped.push('Video / audio'); els.push({ type: 'image', src: null, shape: 'rect', ...g }); continue; }
          const bf = kid(c, 'blipFill'), b = desc(bf, 'blip'); await picture(b && rl[rid(b)] && rl[rid(b)].target, g, desc(bf, 'srcRect'), shapeOf((kid(kid(c, 'spPr'), 'prstGeom') || { getAttribute: () => null }).getAttribute('prst')));
        } else if (ln === 'graphicFrame') {
          const x = kid(c, 'xfrm'), o = kid(x, 'off'), e = kid(x, 'ext'); if (!o || !e) continue;
          const g = px(T({ x: +o.getAttribute('x'), y: +o.getAttribute('y'), w: +e.getAttribute('cx'), h: +e.getAttribute('cy') }));
          const tbl = desc(c, 'tbl');
          if (tbl) { const rows = kids(tbl, 'tr').map(tr => kids(tr, 'tc').map(tc => Array.from(tc.getElementsByTagNameNS('*', 't')).map(t => t.textContent).join(' ').trim()).join('   |   ')); els.push({ type: 'text', text: rows.join('\n'), font: 'Sans', size: Math.max(8, Math.round(12 * 12700 * k)), color: '#2b2724', align: 'left', track: 0, fill: 'transparent', stroke: 1, strokeColor: '#b89a7a', ...g }); }
          else { stats.skipped.push('Chart / diagram'); els.push({ type: 'image', src: null, shape: 'rect', ...g }); }
        }
      }
    };
    const cSld = desc(d, 'cSld'), bg = desc(cSld, 'bg');
    if (bg) { const bgPr = kid(bg, 'bgPr'), full = { x: Math.round(ox), y: Math.round(oy), w: Math.round(sw * k), h: Math.round(sh * k), rot: 0 }; const bf = bgPr && kid(bgPr, 'blipFill'); if (bf) { const b = desc(bf, 'blip'); await picture(b && rl[rid(b)] && rl[rid(b)].target, full, null, 'rect'); } else { const c = bgPr && color(kid(bgPr, 'solidFill')); if (c && c.toLowerCase() !== '#ffffff') els.push({ type: 'shape', shape: 'rect', fill: c, ...full }); } }
    const tree = desc(cSld, 'spTree'); if (tree) await walk(tree, r => r);
    const titleSp = Array.from(d.getElementsByTagNameNS('*', 'ph')).find(p => /title/i.test(p.getAttribute('type') || ''));
    let tEl = titleSp; while (tEl && tEl.localName !== 'sp') tEl = tEl.parentNode;
    const title = tEl ? Array.from(tEl.getElementsByTagNameNS('*', 't')).map(t => t.textContent).join(' ').trim() : '';
    return { els, stats, title: title.slice(0, 60) };
  }
  function timeAgo(t) {
    if (!t) return '';
    const d = (Date.now() - t) / 1000;
    if (d < 45) return 'just now'; if (d < 3600) return Math.round(d / 60) + 'm ago'; if (d < 86400) return Math.round(d / 3600) + 'h ago';
    if (d < 172800) return 'yesterday'; const dt = new Date(t); return dt.getDate() + '/' + (dt.getMonth() + 1) + '/' + dt.getFullYear();
  }
  const ICONS = {
    home: 'M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
    folder: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    trash: 'M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    clock: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20 M12 6v6l4 2',
    shapes: 'M8.3 10a.7.7 0 0 1-.63-1.08L11.4 3a.7.7 0 0 1 1.2-.04L16.3 8.9a.7.7 0 0 1-.57 1.1Z M3 14h7v7H3z M17.5 14a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7',
    text: 'M4 7V4h16v3 M9 20h6 M12 4v16',
    upload: 'M12 13v8 M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2 M8 17l4-4 4 4',
    layout: 'M3 3h18v7H3z M3 14h9v7H3z M16 14h5v7h-5z',
    layers: 'M12 2 2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
    comment: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    search: 'M11 3a8 8 0 1 0 0 16a8 8 0 1 0 0-16 M21 21l-4.3-4.3',
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
    list: 'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
    plus: 'M12 5v14 M5 12h14'
  };
  const COLORS = ['#c67139', '#56633f', '#8c491a', '#3d6b8c', '#8a4f7d', '#b8892a', '#2f7a6b', '#a8434a'];
  const local = ('BroadcastChannel' in window) ? new BroadcastChannel('layboard-sync') : null;
  let rt = null;
  const channel = {
    onmessage: null,
    _emit(m) { if (this.onmessage) this.onmessage({ data: m }); },
    postMessage(m) {
      if (local) try { local.postMessage(m); } catch (e) {}
      if (!rt) return;
      let payload = m;
      if ((m.t === 'ws' || m.t === 'doc' || m.t === 'comments') && JSON.stringify(m).length > 180000) payload = { t: 'refetch', what: m.t, fileId: m.fileId, from: m.from };
      rt.send({ type: 'broadcast', event: 'm', payload }).catch(() => {});
    }
  };
  if (local) local.onmessage = e => channel._emit(e.data);
  async function onRemote(m) {
    if (m.t !== 'refetch') return channel._emit(m);
    await new Promise(r => setTimeout(r, 1500));
    if (m.what === 'ws') channel._emit({ t: 'ws', ws: await get('workspace'), from: m.from });
    else if (m.what === 'doc') { const doc = await get('doc:' + m.fileId); if (doc) channel._emit({ t: 'doc', fileId: m.fileId, doc, from: m.from }); }
    else if (m.what === 'comments') channel._emit({ t: 'comments', fileId: m.fileId, list: (await get('comments:' + m.fileId)) || [], from: m.from });
  }
  if (PMG) { try { rt = PMG.sb.channel('pm-layboard-' + PMG.schema + '-' + PMG.pid, { config: { broadcast: { self: false } } }); rt.on('broadcast', { event: 'm' }, ({ payload }) => onRemote(payload)); rt.subscribe(); } catch (e) { console.warn('Layboard live sync unavailable', e); } }
  else if (online) {
    const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = () => { try { const sb = window.supabase.createClient(SB_URL, SB_KEY); rt = sb.channel('layboard', { config: { broadcast: { self: false } } }); rt.on('broadcast', { event: 'm' }, ({ payload }) => onRemote(payload)); rt.subscribe(); } catch (e) { console.warn('Layboard live sync unavailable', e); } };
    document.head.appendChild(s);
  }
  const __LB = { cloud: online, get, set, del, drawThumb, shrinkImage, processImage, viewFor, MAX_BYTES, sha256, parseXlsx, openZip, pptx: { open: openPptx, buildSlide }, tick, loadImg, timeAgo, ICONS, COLORS, channel, uid: (p = 'x') => p + Math.random().toString(36).slice(2, 10) };
  (window.LB_PM_READY || Promise.resolve(true)).then(ok => { if (ok !== false) window.LB = __LB; });
})();
