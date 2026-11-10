/* WDraw — Wellcon Drawing Engine v1.0 (ใช้ร่วมกันทุกแอป: Defect Check · Site Issues · Survey · PM Claim · Layboard)
 * ① แบบ PDF คมชัดแบบเวกเตอร์: เก็บไฟล์ PDF ต้นฉบับ + เลขหน้า แล้ว render ใหม่จาก PDF เฉพาะส่วนที่มองเห็นเมื่อซูม / ตอนพิมพ์ 300 dpi
 * ② นำเข้า DXF (AutoCAD): แปลงเป็น SVG เวกเตอร์ หน่วย มม. จริง (ไม่ต้องตั้งสเกล) · แยกเลเยอร์ · มีจุด snap
 * ไม่ส่งไฟล์แบบออกไปบริการภายนอก — ประมวลผลในเครื่องผู้ใช้ทั้งหมด
 * API: window.WDraw = { setBase, pdfLib, openPdf, renderPage, renderRegion, pageSize, sharpener, hiresURL, isDxf, isPdf, dxfParse, dxfToSvg, importDxf, svgText, svgSnaps, svgLayers, svgHide }
 */
(function(){
  'use strict';
  let BASE = 'vendor/';
  const W = {};
  W.version = '1.0.0';
  W.setBase = (b)=>{ BASE = b; };
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  W.MAX_AREA = IOS ? 16e6 : 40e6;          // จำกัดขนาด canvas (iOS ~16.7 ล้านพิกเซล)
  W.isPdf = (f)=> !!f && (/pdf$/i.test(f.type||'') || /\.pdf$/i.test(f.name||''));
  W.isDxf = (f)=> !!f && /\.dxf$/i.test(f.name||'');

  // ---------- pdf.js ----------
  let libP = null;
  W.pdfLib = ()=>{ if(window.pdfjsLib && window.pdfjsLib.getDocument){ if(!window.pdfjsLib.GlobalWorkerOptions.workerSrc) window.pdfjsLib.GlobalWorkerOptions.workerSrc = BASE+'pdf.worker.min.js'; return Promise.resolve(window.pdfjsLib); }
    if(!libP) libP = new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=BASE+'pdf.min.js';
      s.onload=()=>{ window.pdfjsLib.GlobalWorkerOptions.workerSrc=BASE+'pdf.worker.min.js'; res(window.pdfjsLib); }; s.onerror=(e)=>{ libP=null; rej(e); }; document.head.appendChild(s); });
    return libP; };
  const docs = new Map();   // url → Promise<PDFDocumentProxy> (เก็บ 4 ไฟล์ล่าสุด)
  W.openPdf = (src)=>{ const key = typeof src==='string' ? src : (src && src.__key) || null;
    if(key && docs.has(key)){ const p=docs.get(key); docs.delete(key); docs.set(key,p); return p; }
    const p = W.pdfLib().then(lib=>lib.getDocument(typeof src==='string' ? { url:src } : src).promise);
    if(key){ docs.set(key, p); p.catch(()=>docs.delete(key)); while(docs.size>4){ const k0=docs.keys().next().value; const d=docs.get(k0); docs.delete(k0); d.then(x=>x.destroy&&x.destroy()).catch(()=>{}); } }
    return p; };
  const pageOf = async (src)=>{ const doc = await W.openPdf(src.pdf); return doc.getPage(Math.max(1, Math.min(doc.numPages, +src.page||1))); };
  W.pageSize = async (src)=>{ const pg = await pageOf(src); const v = pg.getViewport({ scale:1 }); return { w:v.width, h:v.height, mmW:v.width*25.4/72, mmH:v.height*25.4/72 }; };
  const fitArea = (w, h, maxA)=>{ const a=w*h; if(a<=maxA) return 1; return Math.sqrt(maxA/a); };
  // render ทั้งหน้า (maxSide = ด้านยาวสุด px) → canvas
  W.renderPage = async (src, maxSide, maxArea)=>{ const pg = await pageOf(src); const v0 = pg.getViewport({ scale:1 });
    let s = maxSide/Math.max(v0.width, v0.height); s *= fitArea(v0.width*s, v0.height*s, maxArea||W.MAX_AREA);
    const vp = pg.getViewport({ scale:s }); const c=document.createElement('canvas'); c.width=Math.max(1,Math.round(vp.width)); c.height=Math.max(1,Math.round(vp.height));
    const cx=c.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,c.width,c.height); await pg.render({ canvasContext:cx, viewport:vp }).promise; return c; };
  // render เฉพาะพื้นที่ r = { x, y, w, h } (สัดส่วน 0–1 ของหน้า) ขนาด outW × outH px
  W.renderRegion = async (src, r, outW, outH, task)=>{ const pg = await pageOf(src); const v0 = pg.getViewport({ scale:1 });
    const f = fitArea(outW, outH, W.MAX_AREA/2); outW=Math.max(1,Math.round(outW*f)); outH=Math.max(1,Math.round(outH*f));
    const s = outW/(r.w*v0.width); const vp = pg.getViewport({ scale:s, offsetX:-r.x*v0.width*s, offsetY:-r.y*v0.height*s });
    const c=document.createElement('canvas'); c.width=outW; c.height=outH; const cx=c.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,outW,outH);
    const rt = pg.render({ canvasContext:cx, viewport:vp }); if(task) task.rt = rt; await rt.promise; return c; };
  const loadImg = (u)=> new Promise((res,rej)=>{ const i=new Image(); i.crossOrigin='anonymous'; i.onload=()=>res(i); i.onerror=rej; i.src=u; });
  const svgImgs = new Map();
  const svgImg = (u)=>{ if(!svgImgs.has(u)){ const p=loadImg(u); svgImgs.set(u,p); p.catch(()=>svgImgs.delete(u)); } return svgImgs.get(u); };
  // พื้นที่ของรูป SVG (DXF) → canvas คมชัด (เบราว์เซอร์วาดเวกเตอร์ใหม่ที่ความละเอียดปลายทาง)
  W.renderSvgRegion = async (url, r, outW, outH, lw)=>{ const f = fitArea(outW, outH, W.MAX_AREA/2); outW=Math.max(1,Math.round(outW*f)); outH=Math.max(1,Math.round(outH*f));
    const c=document.createElement('canvas'); c.width=outW; c.height=outH; const cx=c.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,outW,outH);
    let txt=null; try{ txt=await W.svgText(url); }catch(e){}
    if(txt && /viewBox="/.test(txt)){ // ตัด viewBox เฉพาะส่วน แล้วให้เบราว์เซอร์วาดเวกเตอร์ที่ขนาดปลายทางพอดี (เส้นคมทุกระดับซูม)
      const vb=(txt.match(/viewBox="([^"]*)"/)[1]).split(/[\s,]+/).map(Number); const nv=[vb[0]+r.x*vb[2], vb[1]+r.y*vb[3], r.w*vb[2], r.h*vb[3]].map(v=>+v.toFixed(3)).join(' ');
      let t=String(txt).replace(/<svg([^>]*?)\swidth="[^"]*"/,'<svg$1').replace(/<svg([^>]*?)\sheight="[^"]*"/,'<svg$1').replace(/viewBox="[^"]*"/, 'viewBox="'+nv+'" width="'+outW+'" height="'+outH+'" preserveAspectRatio="none"');
      t=t.replace(/stroke-width:[0-9.]+px/, 'stroke-width:'+(lw||1.2)+'px');
      const u=URL.createObjectURL(new Blob([t], { type:'image/svg+xml' })); try{ const im=await loadImg(u); cx.drawImage(im,0,0,outW,outH); } finally{ URL.revokeObjectURL(u); } return c; }
    const im = await svgImg(url); const iw=im.naturalWidth||im.width, ih=im.naturalHeight||im.height;
    const sx = outW/(r.w*iw), sy = outH/(r.h*ih); cx.setTransform(sx,0,0,sy,-r.x*iw*sx,-r.y*ih*sy); cx.drawImage(im,0,0,iw,ih); return c; };
  W.kindOf = (o)=> !o ? '' : (o.src && o.src.pdf) ? 'pdf' : (o.kind==='dxf' || /\.svg(\?|$)/i.test(o.file||o.url||'')) ? 'svg' : '';
  // รูปความละเอียดสูงสำหรับพิมพ์ / ส่งออก (dpi ตามขนาดกระดาษจริง) → blob URL (หรือ URL เดิมถ้าเป็นเวกเตอร์ SVG)
  W.hiresURL = async (o, opt)=>{ opt=opt||{}; const k=W.kindOf(o); const url=o.file||o.url;
    if(k==='svg'){ if(!opt.raster) return url; const px=opt.px||6000; const c=await W.renderSvgRegion(url,{x:0,y:0,w:1,h:1}, px, Math.round(px*(o.h||1)/(o.w||1)), opt.lw||Math.max(1.5, px/2200)); const b=await new Promise(res=>c.toBlob(res,'image/png')); return URL.createObjectURL(b); }
    if(k!=='pdf') return url;
    const sz = await W.pageSize(o.src); const dpi = opt.dpi||300; const side = Math.min(opt.max||14000, Math.max(sz.mmW, sz.mmH)/25.4*dpi);
    const c = await W.renderPage(o.src, side, opt.maxArea||(IOS?16e6:60e6)); const b = await new Promise(res=>c.toBlob(res, opt.type||'image/png', .92)); return URL.createObjectURL(b); };

  // ---------- Sharpener: วางภาพคมชัดซ้อนบนส่วนที่มองเห็นเมื่อซูม ----------
  // host = กล่องที่มีขนาดเท่าภาพแบบเต็มหน้า (ภาพแบบอยู่ข้างใน, หมุด % อยู่ข้างใน) · clip = กรอบที่มองเห็น
  // o = { file/url, w, h (px ของภาพฐาน), src:{ pdf, page } | kind:'dxf' }
  W.sharpener = (host, o, opt)=>{ opt=opt||{}; const k=W.kindOf(o); let cv=null, tm=0, gen=0, dead=false, last='';
    const clip = ()=> opt.clip || host.parentElement;
    const run = async ()=>{ if(dead || !k || !host.isConnected) return; const hr=host.getBoundingClientRect(), cr=clip().getBoundingClientRect(); const dpr=Math.min(3, window.devicePixelRatio||1);
      if(hr.width<4) return; const need = hr.width*dpr; const base = +o.w||0;
      if(k==='pdf' && base && need <= base*1.08){ if(cv){ cv.remove(); cv=null; last=''; } return; }
      const x0=Math.max(hr.left,cr.left), y0=Math.max(hr.top,cr.top), x1=Math.min(hr.right,cr.right), y1=Math.min(hr.bottom,cr.bottom); if(x1-x0<4||y1-y0<4) return;
      // ขยายขอบ 15% กันขอบขาวตอนเลื่อนเล็กน้อย
      const mx=(x1-x0)*0.15, my=(y1-y0)*0.15;
      const r={ x:Math.max(0,(x0-mx-hr.left)/hr.width), y:Math.max(0,(y0-my-hr.top)/hr.height) }; r.w=Math.min(1-r.x,(x1-x0+2*mx)/hr.width); r.h=Math.min(1-r.y,(y1-y0+2*my)/hr.height);
      const key=[r.x,r.y,r.w,r.h,hr.width].map(v=>v.toFixed(4)).join(','); if(key===last) return; last=key;
      const my_=++gen; const oW=r.w*hr.width*dpr, oH=r.h*hr.height*dpr;
      try{ const c = k==='pdf' ? await W.renderRegion(o.src, r, oW, oH) : await W.renderSvgRegion(o.file||o.url, r, oW, oH, 1.1*dpr);
        if(my_!==gen || dead){ return; }
        c.className='wd-hi'; c.setAttribute('aria-hidden','true');
        Object.assign(c.style, { position:'absolute', left:(r.x*100)+'%', top:(r.y*100)+'%', width:(r.w*100)+'%', height:(r.h*100)+'%', pointerEvents:'none', maxWidth:'none', zIndex:opt.z==null?'0':String(opt.z) });
        const ref = opt.after && opt.after() ; if(ref && ref.parentNode===host) host.insertBefore(c, ref.nextSibling); else host.insertBefore(c, host.firstChild ? host.firstChild.nextSibling : null);
        if(cv) cv.remove(); cv=c; if(opt.onDone) opt.onDone(r);
      }catch(e){ if(opt.debug) console.warn('wdraw sharpen', e); } };
    return { update(delay){ clearTimeout(tm); tm=setTimeout(run, delay==null?220:delay); }, now(){ clearTimeout(tm); return run(); }, clear(){ last=''; gen++; if(cv){ cv.remove(); cv=null; } }, destroy(){ dead=true; clearTimeout(tm); if(cv) cv.remove(); cv=null; } }; };

  // ---------- DXF ----------
  const ACI = ['#1C1B18','#E03131','#C99A00','#2F9E44','#0C8599','#1971C2','#C2255C','#1C1B18','#7A7A7A','#ADB5BD'];
  const aciHex = (n)=>{ n=Math.abs(n|0); if(n<10) return ACI[n]||'#1C1B18'; if(n>=250){ const g=Math.round(60+(n-250)*35); return 'rgb('+g+','+g+','+g+')'; }
    const h=((n-10)/10|0)*15, v=(n%10); const L=[46,62,36,52,28,44,22,36,16,28][v], S=v%2?40:85; return 'hsl('+h+','+S+'%,'+Math.min(L,46)+'%)'; };
  const decodeDxf = (buf)=>{ const u8=new Uint8Array(buf); const head=new TextDecoder('latin1').decode(u8.subarray(0, Math.min(u8.length, 60000)));
    const ver=(head.match(/\$ACADVER\s*\r?\n\s*1\s*\r?\n\s*(AC\d+)/)||[])[1]||''; const cp=((head.match(/\$DWGCODEPAGE\s*\r?\n\s*3\s*\r?\n\s*(\S+)/)||[])[1]||'').toUpperCase();
    const n=parseInt(ver.slice(2),10)||0; let enc='utf-8'; if(n && n<1021){ enc = cp.indexOf('874')>=0 ? 'windows-874' : cp.indexOf('932')>=0 ? 'shift_jis' : cp.indexOf('936')>=0 ? 'gbk' : 'windows-1252'; }
    try{ return new TextDecoder(enc).decode(u8); }catch(e){ return new TextDecoder('utf-8').decode(u8); } };
  const uDecode = (s)=> String(s||'').replace(/\\U\+([0-9A-Fa-f]{4})/g, (_,h)=>String.fromCharCode(parseInt(h,16))).replace(/%%[cC]/g,'Ø').replace(/%%[dD]/g,'°').replace(/%%[pP]/g,'±').replace(/%%[uUoO]/g,'');
  const mtextClean = (s)=> uDecode(s).replace(/\\P/g,'\n').replace(/\\[\\{}]/g,m=>m[1]).replace(/\\[ACFHQTWfhpqcLlOoKkSs][^;\\{}]*;?/g, (m)=> m[1]==='S' ? m.slice(2).replace(/[#^\/]/,'/').replace(/;$/,'') : '').replace(/[{}]/g,'').replace(/\\~/g,' ');
  // อ่าน group code / value เป็นคู่
  function pairs(text){ const L=text.split(/\r?\n/); const P=[]; for(let i=0;i+1<L.length;i+=2){ const c=parseInt(L[i],10); if(isNaN(c)) { i--; continue; } P.push([c, (c===1||c===3) ? L[i+1].replace(/\r$/,'') : L[i+1].trim()]); } return P; }
  W.dxfParse = (input)=>{ const text = typeof input==='string' ? input : decodeDxf(input); const P = pairs(text); let i=0;
    const M = { units:0, layers:{}, blocks:{}, ents:[], ver:'' }; let sec='';
    const readEnt = ()=>{ const type=P[i][1]; const e={ type, g:[] }; i++; while(i<P.length && P[i][0]!==0){ e.g.push(P[i]); i++; } return e; };
    while(i<P.length){ const [c,v]=P[i];
      if(c===0 && v==='SECTION'){ sec=(P[i+1]||[])[1]||''; i+=2; continue; }
      if(c===0 && v==='ENDSEC'){ sec=''; i++; continue; }
      if(c===0 && v==='EOF') break;
      if(sec==='HEADER'){ if(c===9 && v==='$INSUNITS'){ M.units=parseInt((P[i+1]||[])[1],10)||0; } if(c===9 && v==='$ACADVER') M.ver=(P[i+1]||[])[1]||''; if(c===9 && v==='$MEASUREMENT') M.meas=parseInt((P[i+1]||[])[1],10); i++; continue; }
      if(sec==='TABLES'){ if(c===0 && v==='LAYER'){ const e=readEnt(); const name=gv(e,2); if(name!=null){ const col=parseInt(gv(e,62),10); const fl=parseInt(gv(e,70),10)||0; M.layers[name]={ name, color:isNaN(col)?7:Math.abs(col), off:col<0||!!(fl&1), lw:parseInt(gv(e,370),10) }; } continue; } i++; continue; }
      if(sec==='BLOCKS'){ if(c===0 && v==='BLOCK'){ const b=readEnt(); const name=gv(b,2); const blk={ name, bx:+gv(b,10)||0, by:+gv(b,20)||0, ents:[] };
          while(i<P.length && !(P[i][0]===0 && P[i][1]==='ENDBLK')){ if(P[i][0]===0) blk.ents.push(readEnt()); else i++; }
          if(i<P.length) readEnt(); if(name) M.blocks[name]=blk; continue; } i++; continue; }
      if(sec==='ENTITIES'){ if(c===0){ M.ents.push(readEnt()); continue; } i++; continue; }
      i++; }
    return M; };
  function gv(e, c){ for(const p of e.g) if(p[0]===c) return p[1]; return null; }
  function gall(e, c){ return e.g.filter(p=>p[0]===c).map(p=>p[1]); }
  const UNIT_MM = { 0:1, 1:25.4, 2:304.8, 4:1, 5:10, 6:1000, 14:100 };
  // รวม VERTEX / ATTRIB ที่ตามหลัง POLYLINE / INSERT เข้าด้วยกัน
  function fold(list){ const out=[]; for(let i=0;i<list.length;i++){ const e=list[i];
      if(e.type==='POLYLINE'){ e.v=[]; while(i+1<list.length && list[i+1].type==='VERTEX'){ e.v.push(list[++i]); } if(i+1<list.length && list[i+1].type==='SEQEND') i++; out.push(e); continue; }
      if(e.type==='INSERT'){ e.att=[]; while(i+1<list.length && list[i+1].type==='ATTRIB'){ e.att.push(list[++i]); } if(i+1<list.length && list[i+1].type==='SEQEND') i++; out.push(e); continue; }
      if(e.type==='VERTEX'||e.type==='SEQEND'||e.type==='ATTRIB') continue; out.push(e); } return out; }
  const mul = (A,B)=>[A[0]*B[0]+A[2]*B[1], A[1]*B[0]+A[3]*B[1], A[0]*B[2]+A[2]*B[3], A[1]*B[2]+A[3]*B[3], A[0]*B[4]+A[2]*B[5]+A[4], A[1]*B[4]+A[3]*B[5]+A[5]];
  const ap = (T,x,y)=>[T[0]*x+T[2]*y+T[4], T[1]*x+T[3]*y+T[5]];
  const bulgePts = (a, b, bu, out)=>{ const th=4*Math.atan(bu); const dx=b[0]-a[0], dy=b[1]-a[1], d=Math.hypot(dx,dy); if(d<1e-9) return;
    const r=d/(2*Math.sin(th/2)); const h=r*Math.cos(th/2); const cx=(a[0]+b[0])/2-h*dy/d, cy=(a[1]+b[1])/2+h*dx/d; const R=Math.abs(r);
    const a0=Math.atan2(a[1]-cy,a[0]-cx); const n=Math.max(4, Math.min(64, Math.ceil(Math.abs(th)/(Math.PI/24)))); for(let k=1;k<n;k++){ const t=a0+th*k/n; out.push([cx+R*Math.cos(t), cy+R*Math.sin(t)]); } };
  const arcPts = (cx,cy,r,a0,a1)=>{ while(a1<=a0) a1+=360; const sp=(a1-a0)*Math.PI/180; const n=Math.max(6, Math.min(128, Math.ceil(sp/(Math.PI/36)))); const P=[]; for(let k=0;k<=n;k++){ const t=a0*Math.PI/180+sp*k/n; P.push([cx+r*Math.cos(t), cy+r*Math.sin(t)]); } return P; };
  function bspline(ctrl, deg, knots, n){ const m=ctrl.length; if(m<2) return ctrl; if(!knots || knots.length!==m+deg+1){ knots=[]; for(let i=0;i<m+deg+1;i++) knots.push(i<=deg?0:(i>=m?m-deg:i-deg)); }
    const lo=knots[deg], hi=knots[m]; const out=[]; for(let s=0;s<=n;s++){ const t=lo+(hi-lo)*s/n; let k=deg; while(k<m-1 && t>=knots[k+1]) k++;
      const d=[]; for(let j=0;j<=deg;j++) d.push(ctrl[Math.max(0,Math.min(m-1,j+k-deg))].slice());
      for(let r=1;r<=deg;r++) for(let j=deg;j>=r;j--){ const i=j+k-deg; const den=knots[i+deg-r+1]-knots[i]; const al=den?(t-knots[i])/den:0; d[j]=[(1-al)*d[j-1][0]+al*d[j][0], (1-al)*d[j-1][1]+al*d[j][1]]; }
      out.push(d[deg]); } return out; }
  // แตกทุก entity เป็น primitive ในพิกัดโลก: { t:'pl', p:[[x,y]..], c (curve), L, col } | { t:'tx', x,y,h,rot,s,al,va,L,col } | { t:'so', p, L, col } | { t:'ci', x,y,r }
  W.dxfFlatten = (M, opt)=>{ opt=opt||{}; const out=[]; const ps = !!opt.paper;
    const colOf = (e, L, pc)=>{ const c=parseInt(gv(e,62),10); if(isNaN(c)||c===256){ const ly=M.layers[L]; return ly?ly.color:7; } if(c===0) return pc||7; return Math.abs(c); };
    const walk = (list, T, depth, pL, pc, inBlk)=>{ if(depth>10) return; fold(list).forEach(e=>{
      if(!inBlk && (parseInt(gv(e,67),10)===1) !== ps) return;
      let L = gv(e,8)||'0'; if(inBlk && L==='0' && pL) L=pL; const col = colOf(e, L, pc);
      const ex = parseFloat(gv(e,230)); const fx = (!isNaN(ex) && ex<0) ? -1 : 1;   // OCS กลับด้าน (extrusion z = −1)
      const P = (x,y)=>ap(T, fx*x, y);
      const add = (pts, closed, curve)=>{ if(pts.length<2) return; if(closed) pts.push(pts[0]); out.push({ t:'pl', p:pts, c:!!curve, L, col }); };
      switch(e.type){
        case 'LINE': add([P(+gv(e,10)||0,+gv(e,20)||0), P(+gv(e,11)||0,+gv(e,21)||0)]); break;
        case 'LWPOLYLINE': { const xs=[], B=[]; let last=null; e.g.forEach(([c,v])=>{ if(c===10){ last=[+v,0,0]; xs.push(last); } else if(c===20&&last) last[1]=+v; else if(c===42&&last) last[2]=+v; });
          const cl=(parseInt(gv(e,70),10)||0)&1; const pts=[]; let curve=false; xs.forEach((q,k)=>{ pts.push([q[0],q[1]]); const nx=xs[k+1]||(cl?xs[0]:null); if(nx && Math.abs(q[2])>1e-9){ curve=true; bulgePts([q[0],q[1]],[nx[0],nx[1]],q[2],pts); } });
          if(cl) pts.push([xs[0][0],xs[0][1]]); if(!xs.length) break; add(pts.map(q=>P(q[0],q[1])), false, curve); break; }
        case 'POLYLINE': { const fl=parseInt(gv(e,70),10)||0; if(fl&64) break; const xs=(e.v||[]).filter(v=>!((parseInt(gv(v,70),10)||0)&128)).map(v=>[+gv(v,10)||0,+gv(v,20)||0,+gv(v,42)||0]);
          const pts=[]; let curve=false; xs.forEach((q,k)=>{ pts.push([q[0],q[1]]); const nx=xs[k+1]||((fl&1)?xs[0]:null); if(nx && Math.abs(q[2])>1e-9){ curve=true; bulgePts([q[0],q[1]],[nx[0],nx[1]],q[2],pts); } });
          if((fl&1) && xs.length) pts.push([xs[0][0],xs[0][1]]); add(pts.map(q=>P(q[0],q[1])), false, curve); break; }
        case 'CIRCLE': { const cx=+gv(e,10)||0, cy=+gv(e,20)||0, r=+gv(e,40)||0; if(r<=0) break; const c=P(cx,cy); const s=Math.sqrt(Math.abs(T[0]*T[3]-T[1]*T[2]));
          if(Math.abs(Math.hypot(T[0],T[1])-Math.hypot(T[2],T[3]))<1e-6*Math.max(1,s)) out.push({ t:'ci', x:c[0], y:c[1], r:r*s, L, col }); else add(arcPts(cx,cy,r,0,360).map(q=>P(q[0],q[1])), false, true); break; }
        case 'ARC': { const cx=+gv(e,10)||0, cy=+gv(e,20)||0, r=+gv(e,40)||0; let a0=+gv(e,50)||0, a1=+gv(e,51)||0; if(r<=0) break; add(arcPts(cx,cy,r,a0,a1).map(q=>P(q[0],q[1])), false, true); break; }
        case 'ELLIPSE': { const cx=+gv(e,10)||0, cy=+gv(e,20)||0, mx=+gv(e,11)||0, my=+gv(e,21)||0, ra=+gv(e,40)||1; let t0=+gv(e,41)||0, t1=gv(e,42)!=null?+gv(e,42):Math.PI*2; while(t1<=t0) t1+=Math.PI*2;
          const n=Math.max(12,Math.min(128,Math.ceil((t1-t0)/(Math.PI/36)))); const pts=[]; for(let k=0;k<=n;k++){ const t=t0+(t1-t0)*k/n; pts.push(P(cx+mx*Math.cos(t)-my*ra*Math.sin(t), cy+my*Math.cos(t)+mx*ra*Math.sin(t))); } add(pts,false,true); break; }
        case 'SPLINE': { const fx_=gall(e,11).map(Number), fy_=gall(e,21).map(Number); let pts;
          if(fx_.length>=2){ pts=fx_.map((x,k)=>[x,fy_[k]||0]); if(fx_.length>2){ const C=[]; for(let k=0;k<pts.length-1;k++){ const p0=pts[Math.max(0,k-1)], p1=pts[k], p2=pts[k+1], p3=pts[Math.min(pts.length-1,k+2)]; for(let s=0;s<8;s++){ const t=s/8, t2=t*t, t3=t2*t; C.push([0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3), 0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]); } } C.push(pts[pts.length-1]); pts=C; } }
          else { const cx_=gall(e,10).map(Number), cy_=gall(e,20).map(Number); const ctrl=cx_.map((x,k)=>[x,cy_[k]||0]); const deg=parseInt(gv(e,71),10)||3; const kn=gall(e,40).map(Number); pts=bspline(ctrl, Math.min(deg, ctrl.length-1), kn, Math.max(16, ctrl.length*8)); }
          add(pts.map(q=>P(q[0],q[1])), false, true); break; }
        case 'SOLID': case 'TRACE': { const q=[[10,20],[11,21],[13,23],[12,22]].map(([a,b])=>gv(e,a)!=null?P(+gv(e,a),+gv(e,b)):null).filter(Boolean); if(q.length>=3) out.push({ t:'so', p:q, L, col }); break; }
        case 'TEXT': case 'ATTRIB': case 'ATTDEF': { if(e.type==='ATTDEF') break; const s=uDecode(gv(e,1)); if(!s||!s.trim()) break; const ha=parseInt(gv(e,72),10)||0, va=parseInt(gv(e,73),10)||0;
          const useA = (ha||va) && gv(e,11)!=null; const x=useA?+gv(e,11):+gv(e,10)||0, y=useA?+gv(e,21):+gv(e,20)||0; const p=P(x,y); const h=(+gv(e,40)||2.5);
          const sc=Math.hypot(T[0],T[1]); const rot=(+gv(e,50)||0)*fx + Math.atan2(T[1],T[0])*180/Math.PI;
          out.push({ t:'tx', x:p[0], y:p[1], h:h*sc, rot, s, al:ha===1||ha===4?'m':(ha===2?'r':'l'), va:va===3?'t':(va===2||ha===4?'m':'b'), L, col }); break; }
        case 'MTEXT': { const s=mtextClean(gall(e,3).join('')+(gv(e,1)||'')); if(!s.trim()) break; const p=P(+gv(e,10)||0,+gv(e,20)||0); const h=(+gv(e,40)||2.5); const sc=Math.hypot(T[0],T[1]);
          let rot=+gv(e,50)||0; if(gv(e,11)!=null) rot=Math.atan2(+gv(e,21)||0,+gv(e,11)||0)*180/Math.PI; rot=rot*fx+Math.atan2(T[1],T[0])*180/Math.PI; const at=parseInt(gv(e,71),10)||1;
          out.push({ t:'tx', x:p[0], y:p[1], h:h*sc, rot, s, al:['l','m','r'][(at-1)%3], va:['t','m','b'][Math.floor((at-1)/3)]||'t', ml:true, L, col }); break; }
        case 'DIMENSION': { const b=M.blocks[gv(e,2)]; if(b) walk(b.ents, T, depth+1, L, col, true); break; }
        case 'INSERT': { const b=M.blocks[gv(e,2)]; if(!b) break; const sx=gv(e,41)!=null?+gv(e,41):1, sy=gv(e,42)!=null?+gv(e,42):1, rot=(+gv(e,50)||0)*Math.PI/180;
          const nc=Math.max(1,parseInt(gv(e,70),10)||1), nr=Math.max(1,parseInt(gv(e,71),10)||1), dc=+gv(e,44)||0, dr=+gv(e,45)||0; const ix0=+gv(e,10)||0, iy=+gv(e,20)||0;
          for(let r=0;r<Math.min(nr,50);r++) for(let c=0;c<Math.min(nc,50);c++){ const ox=c*dc, oy=r*dr; const cs=Math.cos(rot), sn=Math.sin(rot);
            const Tins=[cs*sx, sn*sx, -sn*sy, cs*sy, ix0+cs*ox-sn*oy, iy+sn*ox+cs*oy];
            walk(b.ents, mul(T, mul([fx,0,0,1,0,0], mul(Tins, [1,0,0,1,-b.bx,-b.by]))), depth+1, L, col, true); }
          (e.att||[]).forEach(a=>walk([a], T, depth+1, L, col, true)); break; }
        default: break; } }); };
    walk(M.ents, [1,0,0,1,0,0], 0, '', 7, false);
    return out; };
  // ขอบเขตแบบ (ตัดเส้นหลุดไกล ๆ ออก)
  function extents(prims){ const xs=[], ys=[]; prims.forEach(p=>{ if(p.t==='pl'||p.t==='so'){ p.p.forEach(q=>{ xs.push(q[0]); ys.push(q[1]); }); } else if(p.t==='ci'){ xs.push(p.x-p.r,p.x+p.r); ys.push(p.y-p.r,p.y+p.r); } else { xs.push(p.x); ys.push(p.y); } });
    if(!xs.length) return null; const sx=xs.slice().sort((a,b)=>a-b), sy=ys.slice().sort((a,b)=>a-b); const q=(A,f)=>A[Math.max(0,Math.min(A.length-1,Math.floor(A.length*f)))];
    const F={ x0:sx[0], x1:sx[sx.length-1], y0:sy[0], y1:sy[sy.length-1] }; const R={ x0:q(sx,0.003), x1:q(sx,0.997), y0:q(sy,0.003), y1:q(sy,0.997) };
    const rw=Math.max(1e-6,R.x1-R.x0), rh=Math.max(1e-6,R.y1-R.y0); const big=(F.x1-F.x0)>rw*4 || (F.y1-F.y0)>rh*4;
    if(!big) return F; const m=Math.max(rw,rh)*0.06; return { x0:R.x0-m, x1:R.x1+m, y0:R.y0-m, y1:R.y1+m, cropped:true }; }
  const escX = (s)=> String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const lid = (s)=> 'L-'+String(s).replace(/[^A-Za-z0-9_\-฀-๿]/g, (c)=>'_'+c.charCodeAt(0).toString(16));
  // แปลง DXF → SVG (หน่วย มม. · มุมซ้ายบน = 0,0 · แกน y ลง)
  W.dxfToSvg = (M, opt)=>{ opt=opt||{}; let prims=W.dxfFlatten(M, {}); let paper=false; if(!prims.length){ prims=W.dxfFlatten(M, { paper:true }); paper=true; }
    if(!prims.length) throw new Error('ไม่พบเส้นในไฟล์ DXF');
    const u = opt.unit || UNIT_MM[M.units] || 1; const E=extents(prims); const X=(x)=>(x-E.x0)*u, Y=(y)=>(E.y1-y)*u; const wmm=Math.max(1,(E.x1-E.x0)*u), hmm=Math.max(1,(E.y1-E.y0)*u);
    const dg = wmm>20000||hmm>20000 ? 0 : 1; const n=(v)=>{ const r=+v.toFixed(dg); return String(r); };
    const byL = {}; const lay=(L)=> byL[L] || (byL[L]={ s:{}, c:{}, ci:[], so:[], tx:[], n:0 });
    prims.forEach(p=>{ const G=lay(p.L); G.n++; const col=aciHex(p.col);
      if(p.t==='pl'){ const d='M'+p.p.map(q=>n(X(q[0]))+' '+n(Y(q[1]))).join('L'); const B=p.c?G.c:G.s; (B[col]=B[col]||[]).push(d); }
      else if(p.t==='ci') G.ci.push('<circle cx="'+n(X(p.x))+'" cy="'+n(Y(p.y))+'" r="'+n(p.r*u)+'" stroke="'+col+'"/>');
      else if(p.t==='so') G.so.push('<path d="M'+p.p.map(q=>n(X(q[0]))+' '+n(Y(q[1]))).join('L')+'Z" fill="'+col+'"/>');
      else if(p.t==='tx'){ const x=X(p.x), y=Y(p.y), h=p.h*u; const lines=String(p.s).split('\n'); const anc=p.al==='m'?'middle':(p.al==='r'?'end':'start');
        const dy0 = p.va==='t' ? h : p.va==='m' ? h*0.5-(lines.length-1)*h*0.83 : -(lines.length-1)*h*1.66;
        G.tx.push('<text x="'+n(x)+'" y="'+n(y)+'" font-size="'+n(h*1.35)+'" fill="'+col+'" text-anchor="'+anc+'"'+(Math.abs(p.rot)>0.05?' transform="rotate('+(-p.rot).toFixed(2)+' '+n(x)+' '+n(y)+')"':'')+'>'+lines.map((ln,k)=>'<tspan x="'+n(x)+'" dy="'+n(k?h*1.66:dy0)+'">'+escX(ln)+'</tspan>').join('')+'</text>'); } });
    const pxW = opt.px || 4000; const s = pxW/Math.max(wmm,hmm); const W_=Math.round(wmm*s), H_=Math.round(hmm*s);
    const lw = opt.lw || 2.2; const layers=[]; const body=[];
    Object.keys(byL).sort().forEach(L=>{ const G=byL[L]; const info=M.layers[L]||{ color:7 }; layers.push({ name:L, id:lid(L), n:G.n, color:aciHex(info.color), off:!!info.off });
      const part=[]; Object.keys(G.s).forEach(c=>part.push('<path class="s" stroke="'+c+'" d="'+G.s[c].join('')+'"/>')); Object.keys(G.c).forEach(c=>part.push('<path class="c" stroke="'+c+'" d="'+G.c[c].join('')+'"/>'));
      body.push('<g id="'+lid(L)+'" data-layer="'+escX(L)+'"'+(info.off?' display="none"':'')+'>'+part.join('')+G.ci.join('')+G.so.join('')+(G.tx.length?'<g class="t" stroke="none">'+G.tx.join('')+'</g>':'')+'</g>'); });
    const meta = { v:1, wmm:+wmm.toFixed(2), hmm:+hmm.toFixed(2), unit:u, units:M.units, paper, cropped:!!E.cropped, layers:layers.map(l=>({ name:l.name, id:l.id, n:l.n, color:l.color, off:l.off })) };
    const svg = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="'+W_+'" height="'+H_+'" viewBox="0 0 '+n(wmm)+' '+n(hmm)+'" data-wd="'+escX(JSON.stringify(meta))+'">'
      +'<style>path,circle{fill:none;stroke-width:'+lw+'px;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}path[fill]{stroke:none}text{font-family:"IBM Plex Sans Thai","Sarabun",Arial,sans-serif;white-space:pre}</style>'
      +'<rect width="100%" height="100%" fill="#fff"/>'+body.join('')+'</svg>';
    return { svg, wmm, hmm, w:W_, h:H_, layers, meta, count:prims.length }; };
  // ไฟล์ DXF → { blob (SVG), w, h (px), wmm, hmm, mmpx, layers, name }
  W.importDxf = async (file, opt)=>{ const buf = await file.arrayBuffer(); const M = W.dxfParse(buf); const R = W.dxfToSvg(M, opt);
    const blob = new Blob([R.svg], { type:'image/svg+xml' }); return { blob, svg:R.svg, w:R.w, h:R.h, wmm:R.wmm, hmm:R.hmm, mmpx:R.wmm/R.w, layers:R.layers, meta:R.meta, count:R.count, name:String(file.name||'แบบ').replace(/\.[a-z0-9]+$/i,'') }; };

  // ---------- SVG (DXF ที่แปลงแล้ว): โหลดข้อความ · เลเยอร์ · จุด snap ----------
  const svgT = new Map();
  W.svgText = (url)=>{ if(!svgT.has(url)){ const p=fetch(url).then(r=>{ if(!r.ok) throw new Error('svg '+r.status); return r.text(); }); svgT.set(url,p); p.catch(()=>svgT.delete(url)); } return svgT.get(url); };
  W.svgMeta = (txt)=>{ const m=String(txt).match(/data-wd="([^"]*)"/); if(!m) return null; try{ return JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')); }catch(e){ return null; } };
  W.svgLayers = (txt)=>{ const m=W.svgMeta(txt); return m ? m.layers : []; };
  // ตั้งการแสดงเลเยอร์ตามรายชื่อที่ซ่อน (hide = null → ตามค่าในไฟล์ DXF: เลเยอร์ที่ปิดไว้ = ซ่อน)
  W.svgApplyLayers = (txt, hide)=>{ if(!hide) return String(txt); const H=new Set(hide); const m=W.svgMeta(txt); const byId={}; ((m&&m.layers)||[]).forEach(l=>{ byId[l.id]=l.name; });
    return String(txt).replace(/<g id="(L-[^"]*)" data-layer="([^"]*)"( display="none")?>/g, (all,id,nm)=> '<g id="'+id+'" data-layer="'+nm+'"'+(H.has(byId[id]!=null?byId[id]:nm)?' display="none"':'')+'>'); };
  W.svgHide = W.svgApplyLayers;
  W.svgDataURL = (txt)=> 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(txt);
  // ฝัง SVG ในผัง (nested <svg>) · style เฉพาะกลุ่ม .wdx ไม่ให้กระทบส่วนอื่นของหน้า
  W.svgInline = (txt, hide, x, y, w, h, op, lw0)=>{ const s=W.svgApplyLayers(txt, hide); const vb=(s.match(/viewBox="([^"]*)"/)||[])[1]||'0 0 1 1'; const lw=lw0||0.9;
    const inner=W.svgInner(s).replace(/<style>[\s\S]*?<\/style>/,'');
    return '<svg class="wdx" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" viewBox="'+vb+'" preserveAspectRatio="none" overflow="hidden"'+(op!=null&&op<1?' opacity="'+op+'"':'')+'>'
      +'<style>.wdx path,.wdx circle{fill:none;stroke-width:'+lw+'px;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}.wdx path[fill]{stroke:none}.wdx text{font-family:"IBM Plex Sans Thai","Sarabun",Arial,sans-serif;white-space:pre}</style>'+inner+'</svg>'; };
  W.svgInner = (txt)=>{ const s=String(txt); const a=s.indexOf('>', s.indexOf('<svg'))+1, b=s.lastIndexOf('</svg>'); return s.slice(a,b); };
  // จุด snap (หน่วยตาม viewBox = มม.) · ปลายเส้นตรง + มุม · ปลายเส้นโค้ง · จุดศูนย์กลางวงกลม
  W.svgSnaps = (txt, hide)=>{ const m=W.svgMeta(txt); const hid=new Set(((m&&m.layers)||[]).filter(l=>hide?hide.indexOf(l.name)>=0:l.off).map(l=>l.id)); const out=[];
    const re=/<g id="([^"]+)"[^>]*>([\s\S]*?)(?=<g id="|<\/svg>)/g; let g;
    while((g=re.exec(txt))){ if(hid.has(g[1])) continue; const body=g[2];
      body.replace(/<path class="(s|c)"[^>]*d="([^"]*)"/g, (_,cl,d)=>{ d.split('M').forEach(sp=>{ if(!sp) return; const P=sp.split('L'); const take=cl==='s'?P:[P[0],P[P.length-1]]; take.forEach(q=>{ const t=q.trim().split(/\s+/); if(t.length>=2) out.push([+t[0],+t[1]]); }); }); return ''; });
      body.replace(/<circle cx="([^"]+)" cy="([^"]+)"/g, (_,x,y)=>{ out.push([+x,+y]); return ''; }); if(out.length>200000) break; }
    return out; };
  // ตารางค้นหาจุดใกล้ (grid hash)
  W.snapIndex = (pts, cell)=>{ const H=new Map(); cell=cell||200; pts.forEach(p=>{ const k=Math.floor(p[0]/cell)+','+Math.floor(p[1]/cell); let a=H.get(k); if(!a){ a=[]; H.set(k,a); } a.push(p); });
    return { near(p, r){ let best=null, bd=r; const c0=Math.floor((p[0]-r)/cell), c1=Math.floor((p[0]+r)/cell), d0=Math.floor((p[1]-r)/cell), d1=Math.floor((p[1]+r)/cell);
      if((c1-c0+1)*(d1-d0+1)>400) return null;
      for(let i=c0;i<=c1;i++) for(let j=d0;j<=d1;j++){ const a=H.get(i+','+j); if(!a) continue; for(const q of a){ const d=Math.hypot(q[0]-p[0],q[1]-p[1]); if(d<bd){ bd=d; best=q; } } } return best?best.slice():null; } }; };

  window.WDraw = W;
})();
