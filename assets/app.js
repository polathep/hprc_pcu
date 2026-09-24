(function () {
  "use strict";
  var D = window.PCU_DATA;
  if (!D) { document.body.insertAdjacentHTML("afterbegin", "<p style=\"padding:16px\">ไม่พบไฟล์ข้อมูล data/data.js — สร้างด้วย scripts/build_data.py</p>"); return; }
  var P = D.P, N = P.code.length;
  var SVGNS = "http://www.w3.org/2000/svg";

  var COH = [
    { s: "≤2565", l: "ถ่ายโอนปีงบ ≤2565", yr: null },
    { s: "2566", l: "ถ่ายโอนปีงบ 2566", yr: "2566" },
    { s: "2567", l: "ถ่ายโอนปีงบ 2567", yr: "2567" },
    { s: "2568", l: "ถ่ายโอนปีงบ 2568", yr: "2568" },
    { s: "2569", l: "ถ่ายโอนปีงบ 2569", yr: "2569" },
    { s: "2570", l: "กำหนดถ่ายโอนปีงบ 2570", yr: "2570" },
    { s: "ไม่ถ่ายโอน", l: "ยังไม่ถ่ายโอน", yr: null }
  ];
  var DONE = function (c) { return c <= 4; };
  var cv = function (k) { return "var(--c" + k + ")"; };
  var AFF_NAME = { "พิเศษ": "เมืองพัทยา (พิเศษ)" };
  var affName = function (a) { var s = D.aff[a]; return AFF_NAME[s] || s; };

  // ---------- derived per-PCU ----------
  var provOf = new Int16Array(N), regOf = new Int8Array(N), nhOf = new Int8Array(N), staffTot = new Int16Array(N);
  for (var i = 0; i < N; i++) {
    var p = D.amps[P.amp[i]].p;
    provOf[i] = p; regOf[i] = D.provs[p].r; nhOf[i] = D.provs[p].h;
    var st = P.staff[i]; staffTot[i] = st[0] + st[1] + st[2] + st[3] + st[4];
  }
  var U = D.uc, B = D.b;
  var uc = function (i, y, k) { return U[i * 35 + y * 5 + k]; };
  var bd = function (i, y, g) { return B[i * 24 + y * 6 + g]; };

  // ---------- formatting ----------
  var nf0 = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var nf2 = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var f0 = function (v) { return v == null || isNaN(v) ? "–" : nf0.format(v); };
  var f1 = function (v) { return v == null || isNaN(v) ? "–" : nf1.format(v); };
  var f2 = function (v) { return v == null || isNaN(v) ? "–" : nf2.format(v); };
  var pct = function (a, b) { return b ? nf1.format(a / b * 100) + "%" : "–"; };
  function fBig(v) {
    if (v == null || isNaN(v)) return "–";
    var a = Math.abs(v);
    if (a >= 1e6) return nf1.format(v / 1e6) + " ล้าน";
    if (a >= 1e4) return nf1.format(v / 1e3) + " พัน";
    return nf0.format(v);
  }

  // ---------- DOM helpers ----------
  function $(id) { return document.getElementById(id); }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "text") e.textContent = v;
      else if (k === "cls") e.className = v;
      else if (k === "style") e.setAttribute("style", v);
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    if (kids) kids.forEach(function (c) { if (c != null) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function s(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) { if (k === "text") e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (parent) parent.appendChild(e);
    return e;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function key(color, sq) { return h("i", { cls: "key" + (sq ? " sq" : ""), style: "background:" + color }); }

  // ---------- tooltip ----------
  var tipEl = $("tip");
  function tipShow(head, rows, x, y) {
    clear(tipEl);
    if (head) tipEl.appendChild(h("div", { cls: "t-h", text: head }));
    rows.forEach(function (r) {
      tipEl.appendChild(h("div", { cls: "t-r" }, [r.color ? key(r.color, r.sq) : null, h("b", { text: r.v }), h("span", { text: r.l || "" })]));
    });
    tipEl.classList.add("show");
    var w = tipEl.offsetWidth, hh = tipEl.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    var left = x + 14, top = y + 14;
    if (left + w > vw - 8) left = x - w - 14;
    if (top + hh > vh - 8) top = y - hh - 14;
    tipEl.style.left = Math.max(8, left) + "px";
    tipEl.style.top = Math.max(8, top) + "px";
  }
  function tipHide() { tipEl.classList.remove("show"); }
  function tipAtEl(el, head, rows) { var r = el.getBoundingClientRect(); tipShow(head, rows, r.left + r.width / 2, r.top); }

  // ---------- scales ----------
  function niceStep(range, count) {
    var raw = range / Math.max(1, count), mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }
  function niceDomain(lo, hi, count) {
    if (hi === lo) { hi = lo + (lo === 0 ? 1 : Math.abs(lo) * 0.1); }
    var st = niceStep(hi - lo, count);
    var a = Math.floor(lo / st) * st, b = Math.ceil(hi / st) * st, t = [];
    for (var v = a; v <= b + st * 1e-6; v += st) t.push(+v.toFixed(10));
    return { lo: a, hi: b, ticks: t, step: st };
  }
  function tickFmt(step) {
    if (step >= 1) return fBig;
    var dec = 0; while (dec < 4 && Math.abs(Math.round(step * Math.pow(10, dec)) - step * Math.pow(10, dec)) > 1e-6) dec++;
    var nf = new Intl.NumberFormat("th-TH", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return function (v) { return nf.format(v); };
  }

  // ---------- line chart ----------
  function lineChart(el, o) {
    clear(el);
    var W = Math.max(260, el.clientWidth || 600);
    var compact = !!o.compact || W < 560;
    var H = o.height || (compact ? 230 : 300);
    var endLabels = !o.compact && !compact && o.series.length > 0;
    var m = { t: 18, r: endLabels ? 150 : 14, b: 28, l: o.lpad || 50 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b, n = o.x.length;
    var all = [];
    o.series.forEach(function (sr) { sr.vals.forEach(function (v) { if (v != null && isFinite(v)) all.push(v); }); });
    if (!all.length) { el.appendChild(h("p", { cls: "empty", text: "ไม่มีข้อมูลในกลุ่มที่เลือก" })); return; }
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    if (o.yZero || lo <= hi * 0.35 || lo <= 0) lo = Math.min(0, lo); else lo = lo - (hi - lo) * 0.2;
    var dom = niceDomain(lo, hi, compact ? 4 : 5);
    var fmtT = o.tickFmt || tickFmt(dom.step);
    var pad = Math.min(24, iw / (n * 2));
    var X = function (i) { return m.l + pad + (n === 1 ? (iw - 2 * pad) / 2 : i * (iw - 2 * pad) / (n - 1)); };
    var Y = function (v) { return m.t + ih - (v - dom.lo) / (dom.hi - dom.lo) * ih; };
    var svg = s("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img", "aria-label": o.label || "" }, el);

    if (o.partial != null && o.partial >= 0) {
      var stepX = n > 1 ? (iw - 2 * pad) / (n - 1) : iw;
      var px = X(o.partial);
      s("rect", { x: px - stepX / 2, y: m.t, width: Math.min(stepX, m.l + iw - (px - stepX / 2)), height: ih, fill: "var(--partial)" }, svg);
      if (!compact) s("text", { x: px, y: m.t - 5, "text-anchor": "middle", text: "ไม่ครบปี", style: "font-size:10.5px" }, svg);
    }
    dom.ticks.forEach(function (t) {
      var y = Y(t);
      s("line", { x1: m.l, x2: m.l + iw, y1: y, y2: y, stroke: t === 0 ? "var(--base)" : "var(--line)", "stroke-width": 1, "shape-rendering": "crispEdges" }, svg);
      s("text", { x: m.l - 8, y: y + 4, "text-anchor": "end", text: fmtT(t) }, svg);
    });
    o.x.forEach(function (lab, i) {
      if (compact && n > 5 && i % 2 === 1 && i !== n - 1) return;
      s("text", { x: X(i), y: H - 8, "text-anchor": "middle", text: lab }, svg);
    });

    var ends = [];
    o.series.forEach(function (sr) {
      var col = sr.color, d = "", dPart = "", prev = null;
      sr.vals.forEach(function (v, i) {
        if (v == null || !isFinite(v)) { prev = null; return; }
        var pt = X(i).toFixed(1) + "," + Y(v).toFixed(1);
        if (o.partial === i && prev) { dPart = "M" + prev + "L" + pt; }
        else d += (prev ? "L" : "M") + pt;
        prev = pt;
      });
      if (d) s("path", { d: d, fill: "none", stroke: col, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
      if (dPart) s("path", { d: dPart, fill: "none", stroke: col, "stroke-width": 2, "stroke-opacity": 0.45, "stroke-linecap": "round" }, svg);
      if (sr.mark != null && sr.mark >= 0 && sr.vals[sr.mark] != null) {
        s("circle", { cx: X(sr.mark), cy: Y(sr.vals[sr.mark]), r: 4.5, fill: col, stroke: "var(--surface)", "stroke-width": 2 }, svg);
      }
      var li = -1;
      for (var k = sr.vals.length - 1; k >= 0; k--) if (sr.vals[k] != null && isFinite(sr.vals[k])) { li = k; break; }
      if (li >= 0) {
        var cx = X(li), cy = Y(sr.vals[li]);
        if (li === o.partial) s("circle", { cx: cx, cy: cy, r: 4, fill: "var(--surface)", stroke: col, "stroke-width": 2 }, svg);
        else if (li !== sr.mark) s("circle", { cx: cx, cy: cy, r: 4, fill: col, stroke: "var(--surface)", "stroke-width": 2 }, svg);
        ends.push({ sr: sr, x: cx, y: cy, v: sr.vals[li] });
      }
    });

    if (endLabels && ends.length) {
      ends.sort(function (a, b) { return a.y - b.y; });
      var gap = 16, top = m.t + 4, bot = m.t + ih;
      ends.forEach(function (e, i) { e.ly = Math.max(e.y, i ? ends[i - 1].ly + gap : top); });
      for (var j = ends.length - 1; j >= 0; j--) ends[j].ly = Math.min(ends[j].ly, j === ends.length - 1 ? bot : ends[j + 1].ly - gap);
      var lx = m.l + iw + 14;
      ends.forEach(function (e) {
        if (Math.abs(e.ly - e.y) > 1.5) s("path", { d: "M" + (e.x + 7) + "," + e.y + "L" + (lx - 10) + "," + e.y + "L" + (lx - 4) + "," + e.ly, fill: "none", stroke: "var(--base)", "stroke-width": 1 }, svg);
        else s("line", { x1: e.x + 7, x2: lx - 4, y1: e.y, y2: e.y, stroke: "var(--base)", "stroke-width": 1 }, svg);
        var t = s("text", { x: lx, y: e.ly + 4, class: "tl" }, svg);
        s("tspan", { text: (o.fmt || f2)(e.v) + "  ", class: "vl" }, t);
        s("tspan", { text: e.sr.short || e.sr.name }, t);
      });
    }

    // crosshair
    var cross = s("line", { y1: m.t, y2: m.t + ih, stroke: "var(--ink-2)", "stroke-width": 1, opacity: 0 }, svg);
    var hl = s("g", {}, svg);
    var hit = s("rect", { x: m.l, y: m.t, width: iw, height: ih, class: "hit", tabindex: 0, "aria-label": (o.label || "กราฟ") + " ใช้ลูกศรซ้ายขวาเพื่ออ่านค่า" }, svg);
    var cur = -1;
    function show(i, cx, cy) {
      cur = i;
      var x = X(i);
      cross.setAttribute("x1", x); cross.setAttribute("x2", x); cross.setAttribute("opacity", 0.5);
      clear(hl);
      var rows = [];
      o.series.forEach(function (sr) {
        var v = sr.vals[i];
        if (v == null || !isFinite(v)) return;
        s("circle", { cx: x, cy: Y(v), r: 4, fill: sr.color, stroke: "var(--surface)", "stroke-width": 2 }, hl);
        rows.push({ color: sr.color, v: (o.fmt || f2)(v), l: sr.name, raw: v });
      });
      rows.sort(function (a, b) { return b.raw - a.raw; });
      var head = (o.xTitle || "ปีงบ ") + o.x[i] + (i === o.partial ? " · ข้อมูลไม่ครบปี" : "");
      if (cx == null) { var r = svg.getBoundingClientRect(); cx = r.left + x * (r.width / W); cy = r.top + m.t; }
      tipShow(head, rows, cx, cy);
    }
    function idxAt(ev) {
      var r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) * (W / r.width), best = 0, bd = 1e9;
      for (var i = 0; i < n; i++) { var dd = Math.abs(X(i) - x); if (dd < bd) { bd = dd; best = i; } }
      return best;
    }
    function hide() { cross.setAttribute("opacity", 0); clear(hl); tipHide(); cur = -1; }
    hit.addEventListener("pointermove", function (ev) { show(idxAt(ev), ev.clientX, ev.clientY); });
    hit.addEventListener("pointerleave", hide);
    hit.addEventListener("focus", function () { show(n - 1); });
    hit.addEventListener("blur", hide);
    hit.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowRight") { show(Math.min(n - 1, cur + 1)); ev.preventDefault(); }
      if (ev.key === "ArrowLeft") { show(Math.max(0, cur - 1)); ev.preventDefault(); }
      if (ev.key === "Escape") hide();
    });
  }

  // ---------- column chart ----------
  function columnChart(el, cols, o) {
    clear(el);
    var W = Math.max(280, el.clientWidth || 600), H = o.height || 270;
    var m = { t: 24, r: 8, b: 44, l: 46 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b, n = cols.length;
    var mx = Math.max.apply(null, cols.map(function (c) { return c.v; }).concat([1]));
    var dom = niceDomain(0, mx, 4);
    var Y = function (v) { return m.t + ih - v / dom.hi * ih; };
    var band = iw / n, bw = Math.min(24, band * 0.55);
    var svg = s("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img", "aria-label": o.label || "" }, el);
    dom.ticks.forEach(function (t) {
      var y = Y(t);
      s("line", { x1: m.l, x2: m.l + iw, y1: y, y2: y, stroke: t === 0 ? "var(--base)" : "var(--line)", "stroke-width": 1, "shape-rendering": "crispEdges" }, svg);
      s("text", { x: m.l - 8, y: y + 4, "text-anchor": "end", text: fBig(t) }, svg);
    });
    var total = cols.reduce(function (a, c) { return a + c.v; }, 0);
    cols.forEach(function (c, i) {
      var cx = m.l + band * i + band / 2, x0 = cx - bw / 2, y0 = Y(c.v), y1 = Y(0), r = Math.min(4, (y1 - y0));
      var bar = null;
      if (c.v > 0) bar = s("path", { d: "M" + x0 + "," + y1 + "V" + (y0 + r) + "Q" + x0 + "," + y0 + " " + (x0 + r) + "," + y0 + "H" + (x0 + bw - r) + "Q" + (x0 + bw) + "," + y0 + " " + (x0 + bw) + "," + (y0 + r) + "V" + y1 + "Z", fill: c.color }, svg);
      s("text", { x: cx, y: y0 - 7, "text-anchor": "middle", class: "vl", text: f0(c.v) }, svg);
      var lab = s("text", { x: cx, y: H - 26, "text-anchor": "middle", class: "tl" }, svg);
      s("tspan", { x: cx, dy: 0, text: c.label }, lab);
      if (c.label2) s("tspan", { x: cx, dy: 14, text: c.label2, style: "fill:var(--muted);font-size:10.5px" }, lab);
      var hit = s("rect", { x: m.l + band * i, y: m.t, width: band, height: ih + 4, class: "bar-hit", tabindex: 0, "aria-label": c.tip + " " + f0(c.v) }, svg);
      var on = function (ev) {
        if (bar) bar.setAttribute("opacity", 0.78);
        var rows = [{ color: c.color, sq: true, v: f0(c.v) + " หน่วย", l: pct(c.v, total) + " ของทั้งหมด" }];
        if (ev && ev.clientX != null) tipShow(c.tip, rows, ev.clientX, ev.clientY); else tipAtEl(hit, c.tip, rows);
      };
      var off = function () { if (bar) bar.removeAttribute("opacity"); tipHide(); };
      hit.addEventListener("pointermove", on); hit.addEventListener("pointerleave", off);
      hit.addEventListener("focus", function () { on(null); }); hit.addEventListener("blur", off);
    });
  }

  // ---------- horizontal bar rows ----------
  function hbars(el, rows, o) {
    clear(el);
    o = o || {};
    var mx = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.v); }).concat([1e-9]));
    var tot = rows.reduce(function (a, r) { return a + r.v; }, 0);
    if (!rows.length) { el.appendChild(h("p", { cls: "empty", text: o.empty || "ไม่มีข้อมูล" })); return; }
    rows.forEach(function (r) {
      var w = Math.max(0, r.v) / mx * 100;
      var row = h("div", { cls: "hb", tabindex: 0 }, [
        h("div", { cls: "hb-l", text: r.l, title: r.l }),
        h("div", { cls: "hb-t" }, [h("div", { cls: "hb-f", style: "width:" + w.toFixed(2) + "%" + (r.v === 0 ? ";min-width:0" : "") })]),
        h("div", { cls: "hb-v" }, [(o.fmt || f0)(r.v), o.share !== false ? h("small", { text: pct(r.v, tot) }) : null])
      ]);
      var on = function (ev) {
        var rows2 = [{ color: "var(--mark)", sq: true, v: (o.fmt || f0)(r.v) + (o.unit ? " " + o.unit : ""), l: pct(r.v, tot) + " ของทั้งหมด" }];
        if (ev && ev.clientX != null) tipShow(r.l, rows2, ev.clientX, ev.clientY); else tipAtEl(row, r.l, rows2);
      };
      row.addEventListener("pointermove", on); row.addEventListener("pointerleave", tipHide);
      row.addEventListener("focus", function () { on(null); }); row.addEventListener("blur", tipHide);
      el.appendChild(row);
    });
  }

  // ---------- segmented control ----------
  function seg(el, opts, val, onChange) {
    clear(el);
    opts.forEach(function (op) {
      el.appendChild(h("button", { type: "button", "aria-pressed": String(op[0] === val), text: op[1], onclick: function () { onChange(op[0]); } }));
    });
  }

  // ---------- state ----------
  var state = {
    region: -1, nhso: -1, prov: -1, amp: -1, coh: "all", aff: "all", size: -1,
    tab: "overview",
    vis: [false, true, true, true, false, true, true],
    ov: { by: "prov", sort: "pct", dir: -1, all: false },
    sv: { kind: "OP", ver: "Adj", meas: "pc" },
    bg: { fund: "uc", meas: "pc", year: 2 },
    u: { q: "", sort: "code", dir: 1, page: 0, sel: -1 }
  };
  var filtered = [];

  function affGroup(a) { return a === 0 ? "pao" : (a >= 1 && a <= 4) ? "local" : a === 6 ? "moph" : "other"; }
  function pass(i) {
    if (state.region >= 0 && regOf[i] !== state.region) return false;
    if (state.nhso >= 0 && nhOf[i] !== state.nhso) return false;
    if (state.prov >= 0 && provOf[i] !== state.prov) return false;
    if (state.amp >= 0 && P.amp[i] !== state.amp) return false;
    var c = P.coh[i];
    if (state.coh === "done" && !DONE(c)) return false;
    if (state.coh !== "all" && state.coh !== "done" && c !== +state.coh) return false;
    if (state.aff !== "all" && affGroup(P.aff[i]) !== state.aff) return false;
    if (state.size >= 0 && P.size[i] !== state.size) return false;
    return true;
  }
  function refilter() {
    filtered = [];
    for (var i = 0; i < N; i++) if (pass(i)) filtered.push(i);
    $("scope").textContent = "แสดง " + f0(filtered.length) + " จาก " + f0(N) + " หน่วย";
    var any = state.region >= 0 || state.nhso >= 0 || state.prov >= 0 || state.amp >= 0 || state.coh !== "all" || state.aff !== "all" || state.size >= 0;
    $("f-reset").disabled = !any;
  }

  // ---------- filter controls ----------
  function fillSelect(el, opts, val) {
    clear(el);
    opts.forEach(function (o) { el.appendChild(h("option", { value: String(o[0]), text: o[1], selected: String(o[0]) === String(val) })); });
  }
  function buildFilters() {
    fillSelect($("f-region"), [[-1, "ทุกภาค"]].concat(D.regions.map(function (r, i) { return [i, r]; })), state.region);
    fillSelect($("f-nhso"), [[-1, "ทุกเขต"]].concat(D.nhso.map(function (r, i) { return [i, r]; })), state.nhso);
    var pl = [];
    D.provs.forEach(function (p, i) { if ((state.region < 0 || p.r === state.region) && (state.nhso < 0 || p.h === state.nhso)) pl.push([i, p.n]); });
    if (state.prov >= 0 && !pl.some(function (x) { return x[0] === state.prov; })) { state.prov = -1; state.amp = -1; }
    fillSelect($("f-prov"), [[-1, "ทุกจังหวัด"]].concat(pl), state.prov);
    var al = [];
    if (state.prov >= 0) D.amps.forEach(function (a, i) { if (a.p === state.prov) al.push([i, a.n]); });
    else state.amp = -1;
    fillSelect($("f-amp"), [[-1, "ทุกอำเภอ"]].concat(al), state.amp);
    $("f-amp").disabled = state.prov < 0;
    fillSelect($("f-coh"), [["all", "ทุกรุ่น"], ["done", "ถ่ายโอนแล้ว (ถึงปีงบ 2569)"]].concat(COH.map(function (c, i) { return [i, c.l]; })), state.coh);
    fillSelect($("f-aff"), [["all", "ทุกสังกัด"], ["pao", "อบจ."], ["local", "เทศบาล/อบต."], ["moph", "กสธ."], ["other", "อื่นๆ/ไม่ระบุ"]], state.aff);
    fillSelect($("f-size"), [[-1, "ทุกขนาด"]].concat(D.sizes.map(function (s, i) { return [i, s]; })), state.size);
  }
  function onFilter(k, v) {
    state[k] = v;
    if (k === "region" || k === "nhso") { /* province list recomputed */ }
    if (k === "prov") { state.amp = -1; if (v >= 0 && (state.ov.by === "prov" || state.ov.by === "region" || state.ov.by === "nhso")) state.ov.by = "amp"; }
    state.u.page = 0; state.ov.all = false;
    buildFilters(); refilter(); renderActive();
  }
  [["f-region", "region", true], ["f-nhso", "nhso", true], ["f-prov", "prov", true], ["f-amp", "amp", true], ["f-coh", "coh", false], ["f-aff", "aff", false], ["f-size", "size", true]].forEach(function (d) {
    $(d[0]).addEventListener("change", function (e) { onFilter(d[1], d[2] ? +e.target.value : e.target.value); });
  });
  $("f-reset").addEventListener("click", function () {
    state.region = state.nhso = state.prov = state.amp = state.size = -1; state.coh = "all"; state.aff = "all";
    if (state.ov.by === "amp") state.ov.by = "prov";
    buildFilters(); refilter(); renderActive();
  });

  // ---------- tabs ----------
  var TABS = ["overview", "service", "budget", "units"];
  function setTab(t, push) {
    if (TABS.indexOf(t) < 0) t = "overview";
    state.tab = t;
    TABS.forEach(function (x) {
      $("t-" + x).setAttribute("aria-selected", String(x === t));
      $("t-" + x).tabIndex = x === t ? 0 : -1;
      $("p-" + x).hidden = x !== t;
    });
    if (push) { try { history.replaceState(null, "", "#" + t); } catch (e) {} }
    renderActive();
  }
  document.querySelectorAll(".tab").forEach(function (b) {
    b.addEventListener("click", function () { setTab(b.dataset.tab, true); });
    b.addEventListener("keydown", function (e) {
      var i = TABS.indexOf(state.tab);
      if (e.key === "ArrowRight") { setTab(TABS[(i + 1) % 4], true); $("t-" + state.tab).focus(); }
      if (e.key === "ArrowLeft") { setTab(TABS[(i + 3) % 4], true); $("t-" + state.tab).focus(); }
    });
  });
  function renderActive() {
    tipHide();
    if (state.tab === "overview") renderOverview();
    else if (state.tab === "service") renderService();
    else if (state.tab === "budget") renderBudget();
    else renderUnits();
  }

  // ---------- KPI helper ----------
  function kpis(el, list) {
    clear(el);
    list.forEach(function (k) {
      el.appendChild(h("div", { cls: "kpi" }, [
        h("div", { cls: "k-l", text: k.l }),
        h("div", { cls: "k-v" }, [k.v, k.u ? h("small", { text: k.u }) : null]),
        k.s ? h("div", { cls: "k-s", text: k.s }) : null
      ]));
    });
  }

  // ---------- legend (cohort toggles) ----------
  function cohortLegend(el, present, onToggle) {
    clear(el);
    present.forEach(function (c) {
      el.appendChild(h("button", { type: "button", cls: "lg", "aria-pressed": String(state.vis[c]), onclick: function () { state.vis[c] = !state.vis[c]; onToggle(); } }, [key(cv(c)), COH[c].l]));
    });
  }

  // =========================================================
  // OVERVIEW
  // =========================================================
  function renderOverview() {
    var cc = [0, 0, 0, 0, 0, 0, 0], grp = [0, 0, 0], affc = {}, stt = [0, 0, 0, 0, 0], done = 0, pao = 0, loc = 0, withStaff = 0;
    filtered.forEach(function (i) {
      var c = P.coh[i]; cc[c]++; grp[P.grp[i]]++;
      var a = P.aff[i]; affc[a] = (affc[a] || 0) + 1;
      if (DONE(c)) { done++; if (P.aff[i] === 0) pao++; else if (P.aff[i] >= 1 && P.aff[i] <= 5) loc++; }
      var st = P.staff[i]; for (var k = 0; k < 5; k++) stt[k] += st[k];
      if (staffTot[i] > 0) withStaff++;
    });
    var n = filtered.length, staffAll = stt.reduce(function (a, b) { return a + b; }, 0);
    kpis($("ov-kpis"), [
      { l: "หน่วยบริการ", v: f0(n), s: "รพ.สต. " + f0(grp[0]) + " · สอน. " + f0(grp[1]) + " · สสช. " + f0(grp[2]) },
      { l: "ถ่ายโอนแล้ว (ถึงปีงบ 2569)", v: f0(done), u: pct(done, n), s: "อบจ. " + f0(pao) + " · เทศบาล/อบต./อื่น " + f0(loc) },
      { l: "กำหนดถ่ายโอนปีงบ 2570", v: f0(cc[5]), u: pct(cc[5], n), s: "เริ่ม 1 ต.ค. 2569" },
      { l: "ยังไม่ถ่ายโอน", v: f0(cc[6]), u: pct(cc[6], n), s: "สังกัด กสธ." },
      { l: "บุคลากรที่ถ่ายโอนไป", v: f0(staffAll), u: "คน", s: withStaff ? "เฉลี่ย " + f1(staffAll / withStaff) + " คนต่อหน่วยที่มีข้อมูล" : "ไม่มีข้อมูลในกลุ่มนี้" }
    ]);
    columnChart($("ov-coh"), COH.map(function (c, k) {
      return { label: k === 6 ? "ไม่ถ่ายโอน" : c.s, label2: k === 5 ? "กำหนด" : null, v: cc[k], color: cv(k), tip: c.l };
    }), { label: "จำนวนหน่วยบริการแยกตามปีงบที่ถ่ายโอน", height: 390 });

    var affRows = [
      ["อบจ.", [0]], ["เทศบาล (ทต./ทม./ทน.)", [1, 2, 3]], ["อบต.", [4]], ["เมืองพัทยา (พิเศษ)", [5]], ["กสธ.", [6]], ["ไม่ระบุ", [7]]
    ].map(function (r) { return { l: r[0], v: r[1].reduce(function (a, k) { return a + (affc[k] || 0); }, 0) }; }).filter(function (r) { return r.v > 0; });
    hbars($("ov-aff"), affRows, { unit: "หน่วย" });
    hbars($("ov-staff"), D.staffTypes.map(function (t, k) { return { l: t, v: stt[k] }; }), { unit: "คน", empty: "ไม่มีบุคลากรที่ถ่ายโอนในกลุ่มนี้" });
    if (!staffAll) { clear($("ov-staff")).appendChild(h("p", { cls: "empty", text: "ไม่มีบุคลากรที่ถ่ายโอนในกลุ่มนี้" })); }
    renderBreakdown();
  }

  var BY = [["region", "ภาค"], ["nhso", "เขต สปสช."], ["prov", "จังหวัด"], ["amp", "อำเภอ"], ["recv", "หน่วยรับถ่ายโอน"]];
  function renderBreakdown() {
    var by = state.ov.by;
    seg($("ov-bd-by"), BY, by, function (v) { state.ov.by = v; state.ov.all = false; renderBreakdown(); });
    var keyOf = by === "region" ? function (i) { return regOf[i]; } : by === "nhso" ? function (i) { return nhOf[i]; } : by === "prov" ? function (i) { return provOf[i]; } : by === "amp" ? function (i) { return P.amp[i]; } : function (i) { return P.recv[i]; };
    var nameOf = by === "region" ? function (k) { return D.regions[k]; } : by === "nhso" ? function (k) { return D.nhso[k]; } : by === "prov" ? function (k) { return D.provs[k].n; } : by === "amp" ? function (k) { return D.amps[k].n + " · " + D.provs[D.amps[k].p].n; } : function (k) { return D.recvs[k]; };
    var G = {};
    filtered.forEach(function (i) {
      var k = keyOf(i), g = G[k] || (G[k] = { k: k, n: 0, c: [0, 0, 0, 0, 0, 0, 0], st: 0 });
      g.n++; g.c[P.coh[i]]++; g.st += staffTot[i];
    });
    var rows = Object.keys(G).map(function (k) { var g = G[k]; g.name = nameOf(g.k); g.done = g.c[0] + g.c[1] + g.c[2] + g.c[3] + g.c[4]; g.pct = g.done / g.n; return g; });
    var so = state.ov.sort, dir = state.ov.dir;
    var sv = { name: function (g) { return g.name; }, n: function (g) { return g.n; }, done: function (g) { return g.done; }, pct: function (g) { return g.pct; }, c5: function (g) { return g.c[5]; }, c6: function (g) { return g.c[6]; }, st: function (g) { return g.st; } }[so];
    rows.sort(function (a, b) { var x = sv(a), y = sv(b); if (typeof x === "string") return x.localeCompare(y, "th") * dir; return (x - y) * dir || a.name.localeCompare(b.name, "th"); });
    var byName = BY.filter(function (b) { return b[0] === by; })[0][1];
    $("ov-bd-sub").textContent = f0(rows.length) + " " + byName + " · แถบสีคือสัดส่วนหน่วยตามรุ่นถ่ายโอน ชี้ที่แถบเพื่อดูจำนวน";
    var lg = clear($("ov-bd-legend"));
    COH.forEach(function (c, k) { lg.appendChild(h("span", { cls: "lg lg-static" }, [key(cv(k), true), c.l])); });

    var t = clear($("ov-bd"));
    var cols = [["name", byName, ""], ["n", "หน่วย", "r"], ["done", "ถ่ายโอนแล้ว", "r"], ["pct", "%", "r"], [null, "สัดส่วนตามรุ่น", ""], ["c5", "กำหนด 2570", "r"], ["c6", "ไม่ถ่ายโอน", "r"], ["st", "บุคลากรถ่ายโอน", "r"]];
    var thr = h("tr");
    cols.forEach(function (c) {
      if (!c[0]) { thr.appendChild(h("th", { text: c[1], style: "min-width:180px" })); return; }
      var on = so === c[0];
      thr.appendChild(h("th", { cls: c[2], "aria-sort": on ? (dir > 0 ? "ascending" : "descending") : null }, [h("button", { type: "button", onclick: function () { if (state.ov.sort === c[0]) state.ov.dir *= -1; else { state.ov.sort = c[0]; state.ov.dir = c[0] === "name" ? 1 : -1; } renderBreakdown(); } }, [c[1], h("span", { cls: "ar", text: on ? (dir > 0 ? "▲" : "▼") : "" })])]));
    });
    t.appendChild(h("thead", null, [thr]));
    var tb = h("tbody");
    var lim = state.ov.all ? rows.length : Math.min(rows.length, 100);
    for (var r = 0; r < lim; r++) {
      var g = rows[r];
      var bar = h("div", { cls: "stk" });
      g.c.forEach(function (v, k) { if (v > 0) bar.appendChild(h("i", { style: "flex:" + v + " 1 0;background:" + cv(k), "data-k": k, "data-v": v, "data-n": g.n, "data-g": g.name })); });
      tb.appendChild(h("tr", null, [
        h("td", { cls: "nm", text: g.name }), h("td", { cls: "r", text: f0(g.n) }), h("td", { cls: "r", text: f0(g.done) }), h("td", { cls: "r", text: pct(g.done, g.n) }),
        h("td", null, [bar]), h("td", { cls: "r", text: f0(g.c[5]) }), h("td", { cls: "r", text: f0(g.c[6]) }), h("td", { cls: "r", text: f0(g.st) })
      ]));
    }
    t.appendChild(tb);
    var more = clear($("ov-bd-more"));
    if (rows.length > 100) more.appendChild(h("button", { cls: "btn", type: "button", text: state.ov.all ? "แสดง 100 แถวแรก" : "แสดงทั้งหมด " + f0(rows.length) + " แถว", onclick: function () { state.ov.all = !state.ov.all; renderBreakdown(); } }));
  }
  $("ov-bd").addEventListener("pointermove", function (e) {
    var t = e.target;
    if (t.tagName !== "I" || !t.dataset.k) { tipHide(); return; }
    var k = +t.dataset.k, v = +t.dataset.v, n = +t.dataset.n;
    tipShow(t.dataset.g, [{ color: cv(k), sq: true, v: f0(v) + " หน่วย", l: COH[k].l + " · " + pct(v, n) }], e.clientX, e.clientY);
  });
  $("ov-bd").addEventListener("pointerleave", tipHide);

  // =========================================================
  // SERVICE (OP/PP)
  // =========================================================
  function presentCohorts() {
    var cnt = [0, 0, 0, 0, 0, 0, 0];
    filtered.forEach(function (i) { cnt[P.coh[i]]++; });
    return { cnt: cnt, list: [1, 2, 3, 5, 6, 0, 4].filter(function (c) { return cnt[c] > 0; }) };
  }
  function renderService() {
    var S = state.sv;
    var K = (S.kind === "OP" ? 1 : 3) + (S.ver === "Adj" ? 1 : 0);
    seg($("sv-kind"), [["OP", "OP"], ["PP", "PP"]], S.kind, function (v) { S.kind = v; renderService(); });
    seg($("sv-ver"), [["Adj", "Adj ปรับแล้ว"], ["Send", "Send ที่ส่ง"]], S.ver, function (v) { S.ver = v; renderService(); });
    seg($("sv-meas"), [["pc", "ต่อหัว UC"], ["tot", "ยอดรวม"]], S.meas, function (v) { S.meas = v; renderService(); });
    var NY = D.yearsUC.length;
    // aggregate
    var A = [];
    for (var c = 0; c < 7; c++) { A.push([]); for (var y = 0; y < NY; y++) A[c].push({ v: 0, p: 0, miss: 0, rows: 0 }); }
    var allY = []; for (y = 0; y < NY; y++) allY.push({ v: 0, p: 0, miss: 0, pop: 0 });
    filtered.forEach(function (i) {
      var c = P.coh[i];
      for (var y = 0; y < NY; y++) {
        var pop = uc(i, y, 0), v = uc(i, y, K);
        if (pop == null) continue;
        allY[y].pop += pop;
        var a = A[c][y];
        if (v == null) { a.miss++; allY[y].miss++; continue; }
        a.v += v; a.p += pop; a.rows++; allY[y].v += v; allY[y].p += pop;
      }
    });
    var val = function (a) { return S.meas === "pc" ? (a.p ? a.v / a.p : null) : (a.rows ? a.v : null); };
    var fmt = S.meas === "pc" ? f2 : fBig;
    var pc = presentCohorts();
    cohortLegend($("sv-legend"), pc.list, renderService);
    var series = pc.list.filter(function (c) { return state.vis[c]; }).map(function (c) {
      return { name: COH[c].l, short: COH[c].s, color: cv(c), vals: A[c].map(val), mark: COH[c].yr ? D.yearsUC.indexOf(COH[c].yr) : -1 };
    });
    var kindL = S.kind + " " + S.ver;
    $("sv-title").textContent = kindL + (S.meas === "pc" ? " ต่อหัวประชากร UC" : " ยอดรวม") + " แยกตามรุ่นถ่ายโอน";
    $("sv-sub").textContent = "ปีงบ 2563–2569 · แต่ละเส้นคือกลุ่มหน่วยที่ถ่ายโอนในปีงบเดียวกัน";
    lineChart($("sv-chart"), { x: D.yearsUC, series: series, fmt: fmt, partial: NY - 1, label: $("sv-title").textContent });
    var y8 = 5;
    kpis($("sv-kpis"), [
      { l: "ประชากร UC ปีงบ 2568", v: fBig(allY[y8].pop), u: "คน" },
      { l: kindL + " รวม ปีงบ 2568", v: fBig(allY[y8].v) },
      { l: kindL + " ต่อหัว ปีงบ 2568", v: f2(allY[y8].p ? allY[y8].v / allY[y8].p : null), s: "ปีงบ 2569 (ไม่ครบปี): " + f2(allY[NY - 1].p ? allY[NY - 1].v / allY[NY - 1].p : null) },
      { l: "หน่วยที่ไม่มีข้อมูล ปีงบ 2568", v: f0(allY[y8].miss), u: "หน่วย", s: "ปีงบ 2566: " + f0(allY[3].miss) + " · 2569: " + f0(allY[NY - 1].miss) }
    ]);
    $("sv-tsub").textContent = (S.meas === "pc" ? "ค่าต่อหัวประชากร UC" : "ยอดรวม") + " · " + kindL;
    $("sv-mkind").textContent = kindL;
    // tables
    function yearTable(el, cellFn, extra) {
      var t = clear(el), hr = h("tr", null, [h("th", { text: "รุ่นถ่ายโอน" }), h("th", { cls: "r", text: "หน่วย" })]);
      D.yearsUC.forEach(function (y, k) { hr.appendChild(h("th", { cls: "r", text: y + (k === NY - 1 ? "*" : "") })); });
      t.appendChild(h("thead", null, [hr]));
      var tb = h("tbody");
      pc.list.forEach(function (c) {
        var tr = h("tr", null, [h("td", null, [h("span", { cls: "chip" }, [key(cv(c), true), COH[c].l])]), h("td", { cls: "r", text: f0(pc.cnt[c]) })]);
        for (var y = 0; y < NY; y++) tr.appendChild(h("td", { cls: "r", text: cellFn(A[c][y]) }));
        tb.appendChild(tr);
      });
      if (extra) { var tr = h("tr", null, [h("td", null, [h("b", { text: "รวมทุกกลุ่มที่เลือก" })]), h("td", { cls: "r", text: f0(filtered.length) })]); for (var y2 = 0; y2 < NY; y2++) tr.appendChild(h("td", { cls: "r", text: extra(allY[y2]) })); tb.appendChild(tr); }
      t.appendChild(tb);
    }
    yearTable($("sv-table"), function (a) { return fmt(val(a)); }, function (a) { return fmt(S.meas === "pc" ? (a.p ? a.v / a.p : null) : a.v); });
    yearTable($("sv-miss"), function (a) { return a.miss ? f0(a.miss) : "–"; }, function (a) { return a.miss ? f0(a.miss) : "–"; });
  }

  // =========================================================
  // BUDGET
  // =========================================================
  var FUNDOPTS = [["uc", "ทุกกองทุนในระบบ UC"], ["0", D.funds[0]], ["1", D.funds[1]], ["2", D.funds[2]], ["3", D.funds[3]], ["4", D.funds[4]], ["5", D.funds[5]], ["all", "รวมทั้งหมด (รวมนอกระบบ UC)"]];
  function fundSet(f) { return f === "uc" ? [0, 1, 2, 3, 4] : f === "all" ? [0, 1, 2, 3, 4, 5] : [+f]; }
  (function () { var sel = $("bg-fund"); FUNDOPTS.forEach(function (o) { sel.appendChild(h("option", { value: o[0], text: o[1] })); }); sel.addEventListener("change", function () { state.bg.fund = sel.value; renderBudget(); }); })();
  function renderBudget() {
    var S = state.bg, fs = fundSet(S.fund), NY = D.yearsB.length;
    $("bg-fund").value = S.fund;
    seg($("bg-meas"), [["pc", "บาทต่อหัว UC"], ["tot", "ล้านบาท"]], S.meas, function (v) { S.meas = v; renderBudget(); });
    seg($("bg-year"), D.yearsB.map(function (y, k) { return [k, y + (k === NY - 1 ? "*" : "")]; }), S.year, function (v) { S.year = v; renderBudget(); });
    var A = [], F = [], allY = [];
    for (var c = 0; c < 7; c++) { A.push([]); for (var y = 0; y < NY; y++) A[c].push({ amt: 0, pop: 0 }); }
    for (y = 0; y < NY; y++) { F.push([0, 0, 0, 0, 0, 0]); allY.push({ amt: 0, pop: 0, recv: 0 }); }
    filtered.forEach(function (i) {
      var c = P.coh[i];
      for (var y = 0; y < NY; y++) {
        var pop = uc(i, y + 3, 0), amt = 0, any = false;
        for (var g = 0; g < 6; g++) { var v = bd(i, y, g); F[y][g] += v; if (v !== 0) any = true; }
        fs.forEach(function (g) { amt += bd(i, y, g); });
        A[c][y].amt += amt; allY[y].amt += amt; if (any) allY[y].recv++;
        if (pop != null) { A[c][y].pop += pop; allY[y].pop += pop; }
      }
    });
    var val = function (a) { return S.meas === "pc" ? (a.pop ? a.amt / a.pop : null) : a.amt / 1e6; };
    var fmt = S.meas === "pc" ? f0 : f1;
    var pc = presentCohorts();
    cohortLegend($("bg-legend"), pc.list, renderBudget);
    var series = pc.list.filter(function (c) { return state.vis[c]; }).map(function (c) {
      return { name: COH[c].l, short: COH[c].s, color: cv(c), vals: A[c].map(val), mark: COH[c].yr ? D.yearsB.indexOf(COH[c].yr) : -1 };
    });
    var fl = FUNDOPTS.filter(function (o) { return o[0] === S.fund; })[0][1];
    $("bg-title").textContent = "เงินโอนตรง" + (S.meas === "pc" ? " บาทต่อหัวประชากร UC" : " (ล้านบาท)") + " แยกตามรุ่นถ่ายโอน";
    $("bg-sub").textContent = fl + " · ปีงบ 2566–2569";
    lineChart($("bg-chart"), { x: D.yearsB, series: series, fmt: fmt, partial: NY - 1, yZero: true, label: $("bg-title").textContent, tickFmt: S.meas === "pc" ? f0 : null });
    var tot4 = allY.reduce(function (a, b) { return a + b.amt; }, 0), y8 = 2;
    kpis($("bg-kpis"), [
      { l: "เงินโอนรวม ปีงบ 2566–2569", v: f1(tot4 / 1e6), u: "ล้านบาท", s: fl },
      { l: "เงินโอน ปีงบ 2568", v: f1(allY[y8].amt / 1e6), u: "ล้านบาท", s: "ปีงบ 2569 (ไม่ครบปี): " + f1(allY[NY - 1].amt / 1e6) + " ล้านบาท" },
      { l: "บาทต่อหัวประชากร UC ปีงบ 2568", v: f0(allY[y8].pop ? allY[y8].amt / allY[y8].pop : null), u: "บาท", s: "คิดจากประชากร UC ทุกหน่วยในกลุ่ม" },
      { l: "หน่วยที่ได้รับเงินโอนตรง ปีงบ 2568", v: f0(allY[y8].recv), u: pct(allY[y8].recv, filtered.length), s: "จาก " + f0(filtered.length) + " หน่วย (ทุกกองทุน)" }
    ]);
    hbars($("bg-funds"), D.funds.map(function (f, g) { return { l: f, v: F[S.year][g] / 1e6 }; }), { fmt: f1, unit: "ล้านบาท" });
    var top = D.otherFunds.slice(0, 4).map(function (x) { return x[0]; }).join(", ");
    $("bg-other").textContent = "อื่นๆ ในระบบ UC ได้แก่ " + top + " และรายการย่อยอื่น · นอกระบบ UC คือสวัสดิการรักษาพยาบาลพนักงานส่วนท้องถิ่น และผู้ประกันตนคนพิการ";
    var t = clear($("bg-table")), hr = h("tr", null, [h("th", { text: "กองทุน" })]);
    D.yearsB.forEach(function (y, k) { hr.appendChild(h("th", { cls: "r", text: y + (k === NY - 1 ? "*" : "") })); });
    hr.appendChild(h("th", { cls: "r", text: "รวม" }));
    t.appendChild(h("thead", null, [hr]));
    var tb = h("tbody");
    function row(label, gs, bold) {
      var tr = h("tr", null, [h("td", null, [bold ? h("b", { text: label }) : label])]), sum = 0;
      for (var y = 0; y < NY; y++) { var v = gs.reduce(function (a, g) { return a + F[y][g]; }, 0); sum += v; tr.appendChild(h("td", { cls: "r", text: f1(v / 1e6) })); }
      tr.appendChild(h("td", { cls: "r", text: f1(sum / 1e6) }));
      tb.appendChild(tr);
    }
    D.funds.forEach(function (f, g) { row(f, [g]); });
    row("รวมในระบบ UC", [0, 1, 2, 3, 4], true);
    row("รวมทั้งหมด", [0, 1, 2, 3, 4, 5], true);
    t.appendChild(tb);
  }

  // =========================================================
  // UNITS
  // =========================================================
  var searchStr = null;
  function buildSearch() {
    searchStr = new Array(N);
    for (var i = 0; i < N; i++) searchStr[i] = (P.code[i] + " " + P.name[i] + " " + D.amps[P.amp[i]].n + " " + D.provs[provOf[i]].n).toLowerCase();
  }
  var PAGE = 20;
  var ucPc = function (i, y, k) { var p = uc(i, y, 0), v = uc(i, y, k); return p && v != null ? v / p : null; };
  var bTot = function (i, y) { var s = 0; for (var g = 0; g < 5; g++) s += bd(i, y, g); return s; };
  var UCOLS = [
    ["code", "รหัส", "", function (i) { return P.code[i]; }],
    ["name", "ชื่อหน่วย · พื้นที่", "", function (i) { return P.name[i]; }],
    ["coh", "รุ่นถ่ายโอน", "", function (i) { return P.coh[i]; }],
    ["pop", "ประชากร UC", "r", function (i) { var v = uc(i, 5, 0); return v == null ? -1 : v; }],
    ["op", "OP Adj/หัว", "r", function (i) { var v = ucPc(i, 5, 2); return v == null ? -1 : v; }],
    ["bud", "เงินโอน UC (บาท)", "r", function (i) { return bTot(i, 2); }]
  ];
  function unitList() {
    if (!searchStr) buildSearch();
    var q = state.u.q.trim().toLowerCase(), list = q ? filtered.filter(function (i) { return searchStr[i].indexOf(q) >= 0; }) : filtered.slice();
    var col = UCOLS.filter(function (c) { return c[0] === state.u.sort; })[0], f = col[3], dir = state.u.dir;
    list.sort(function (a, b) { var x = f(a), y = f(b); if (typeof x === "string") return x.localeCompare(y, "th") * dir; return (x - y) * dir || P.code[a].localeCompare(P.code[b]); });
    return list;
  }
  function renderUnits() {
    var list = unitList(), S = state.u;
    var pages = Math.max(1, Math.ceil(list.length / PAGE));
    if (S.page >= pages) S.page = pages - 1;
    $("u-count").textContent = f0(list.length) + " หน่วย";
    $("u-page").textContent = "หน้า " + f0(S.page + 1) + " / " + f0(pages);
    $("u-prev").disabled = S.page <= 0; $("u-next").disabled = S.page >= pages - 1;
    if (list.indexOf(S.sel) < 0) S.sel = list.length ? list[S.page * PAGE] : -1;
    var t = clear($("u-table")), hr = h("tr");
    UCOLS.forEach(function (c) {
      var on = S.sort === c[0];
      hr.appendChild(h("th", { cls: c[2], "aria-sort": on ? (S.dir > 0 ? "ascending" : "descending") : null }, [h("button", { type: "button", onclick: function () { if (S.sort === c[0]) S.dir *= -1; else { S.sort = c[0]; S.dir = c[2] === "r" ? -1 : 1; } S.page = 0; renderUnits(); } }, [c[1], h("span", { cls: "ar", text: on ? (S.dir > 0 ? "▲" : "▼") : "" })])]));
    });
    t.appendChild(h("thead", null, [hr]));
    var tb = h("tbody");
    list.slice(S.page * PAGE, S.page * PAGE + PAGE).forEach(function (i) {
      var c = P.coh[i], pop = uc(i, 5, 0), op = ucPc(i, 5, 2);
      var tr = h("tr", { cls: "clk" + (i === S.sel ? " on" : ""), tabindex: 0, "aria-selected": String(i === S.sel) }, [
        h("td", { cls: "mono", text: P.code[i] }),
        h("td", { cls: "nm" }, [h("div", { text: P.name[i] }), h("div", { cls: "muted", style: "font-size:12px", text: D.amps[P.amp[i]].n + " · " + D.provs[provOf[i]].n })]),
        h("td", null, [h("span", { cls: "chip" }, [key(cv(c), true), COH[c].s])]),
        h("td", { cls: "r", text: f0(pop) }),
        h("td", { cls: "r", text: f2(op) }),
        h("td", { cls: "r", text: P.code[i] && D.inb[i] ? f0(bTot(i, 2)) : "–" })
      ]);
      var pick = function () { S.sel = i; renderUnits(); };
      tr.addEventListener("click", pick);
      tr.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    renderDetail(S.sel);
  }
  $("u-q").addEventListener("input", function (e) { state.u.q = e.target.value; state.u.page = 0; state.u.sel = -1; renderUnits(); });
  $("u-prev").addEventListener("click", function () { state.u.page--; state.u.sel = -1; renderUnits(); });
  $("u-next").addEventListener("click", function () { state.u.page++; state.u.sel = -1; renderUnits(); });

  function renderDetail(i) {
    var el = clear($("u-detail"));
    if (i < 0) { el.appendChild(h("p", { cls: "empty", text: "ไม่พบหน่วยบริการตามเงื่อนไขที่เลือก" })); return; }
    var c = P.coh[i], pv = D.provs[provOf[i]];
    el.appendChild(h("div", { cls: "d-h" }, [
      h("span", { cls: "mono muted", text: "รหัสหน่วยบริการ " + P.code[i] }),
      h("h2", { text: P.name[i] }),
      h("div", { cls: "d-chips" }, [
        h("span", { cls: "chip" }, [key(cv(c), true), COH[c].l]),
        h("span", { cls: "chip", text: "สังกัด " + affName(P.aff[i]) }),
        h("span", { cls: "chip", text: "ขนาด " + D.sizes[P.size[i]] }),
        h("span", { cls: "chip", text: D.groups[P.grp[i]] })
      ])
    ]));
    var kv = h("dl", { cls: "kv" });
    [["พื้นที่", D.amps[P.amp[i]].n + " · " + pv.n + " · " + D.regions[pv.r]], ["เขต สปสช.", D.nhso[pv.h]], ["CUP", D.cups[P.cup[i]]], ["หน่วยรับถ่ายโอน", D.recvs[P.recv[i]]], ["อปท. ที่รับ", P.lgo[i] >= 0 ? D.lgos[P.lgo[i]] : "–"], ["ปีงบที่ถ่ายโอน", P.yr[i] ? String(P.yr[i]) : "–"]].forEach(function (r) {
      kv.appendChild(h("dt", { text: r[0] })); kv.appendChild(h("dd", { text: r[1] }));
    });
    el.appendChild(kv);

    // staff
    if (DONE(c) || c === 5) {
      var st = P.staff[i], sec = h("div", { cls: "d-sec" }, [h("h3", { text: "บุคลากรที่ถ่ายโอน " + f0(staffTot[i]) + " คน" })]);
      if (staffTot[i] > 0) { var hb = h("div", { cls: "hbars" }); sec.appendChild(hb); hbars(hb, D.staffTypes.map(function (t, k) { return { l: t, v: st[k] }; }).filter(function (r) { return r.v > 0; }), { unit: "คน" }); }
      else sec.appendChild(h("p", { cls: "empty", text: "ไม่มีข้อมูลบุคลากรสำหรับหน่วยนี้" }));
      el.appendChild(sec);
    }

    // service
    var sv = h("div", { cls: "d-sec" }, [h("h3", { text: "การใช้บริการต่อหัวประชากร UC (Adj)" })]);
    var minis = h("div", { cls: "minis" }), m1 = h("div", { cls: "chart" }), m2 = h("div", { cls: "chart" });
    minis.appendChild(h("div", null, [h("div", { cls: "mini-t", text: "OP ต่อหัว" }), m1]));
    minis.appendChild(h("div", null, [h("div", { cls: "mini-t", text: "PP ต่อหัว" }), m2]));
    sv.appendChild(minis);
    var t = h("table"), hr = h("tr", null, [h("th", { text: "ปีงบ" }), h("th", { cls: "r", text: "ประชากร UC" }), h("th", { cls: "r", text: "OP Send" }), h("th", { cls: "r", text: "OP Adj" }), h("th", { cls: "r", text: "PP Send" }), h("th", { cls: "r", text: "PP Adj" })]);
    t.appendChild(h("thead", null, [hr]));
    var tb = h("tbody");
    D.yearsUC.forEach(function (y, k) {
      tb.appendChild(h("tr", null, [h("td", { text: y + (k === 6 ? "*" : "") })].concat([0, 1, 2, 3, 4].map(function (q) { return h("td", { cls: "r", text: f0(uc(i, k, q)) }); }))));
    });
    t.appendChild(tb);
    sv.appendChild(h("div", { cls: "tbl-wrap", style: "margin-top:10px" }, [t]));
    el.appendChild(sv);
    var mk = COH[c].yr ? D.yearsUC.indexOf(COH[c].yr) : -1;
    lineChart(m1, { x: D.yearsUC, series: [{ name: "OP Adj ต่อหัว", color: "var(--mark)", vals: D.yearsUC.map(function (_, k) { return ucPc(i, k, 2); }), mark: mk }], compact: true, height: 150, partial: 6, fmt: f2, lpad: 40, label: "OP ต่อหัว" });
    lineChart(m2, { x: D.yearsUC, series: [{ name: "PP Adj ต่อหัว", color: "var(--mark)", vals: D.yearsUC.map(function (_, k) { return ucPc(i, k, 4); }), mark: mk }], compact: true, height: 150, partial: 6, fmt: f2, lpad: 40, label: "PP ต่อหัว" });

    // budget
    var bs = h("div", { cls: "d-sec" }, [h("h3", { text: "เงินโอนตรงจาก สปสช. (บาท)" })]);
    if (!D.inb[i]) bs.appendChild(h("p", { cls: "empty", text: "ไม่พบเงินโอนตรงถึงหน่วยนี้ในปีงบ 2566–2569" }));
    else {
      var bt = h("table"), bh = h("tr", null, [h("th", { text: "กองทุน" })]);
      D.yearsB.forEach(function (y, k) { bh.appendChild(h("th", { cls: "r", text: y + (k === 3 ? "*" : "") })); });
      bt.appendChild(h("thead", null, [bh]));
      var bb = h("tbody"), tot = [0, 0, 0, 0];
      D.funds.forEach(function (f, g) {
        var vals = D.yearsB.map(function (_, y) { return bd(i, y, g); });
        if (!vals.some(function (v) { return v !== 0; })) return;
        vals.forEach(function (v, y) { tot[y] += v; });
        bb.appendChild(h("tr", null, [h("td", { text: f })].concat(vals.map(function (v) { return h("td", { cls: "r", text: v ? f0(v) : "–" }); }))));
      });
      bb.appendChild(h("tr", null, [h("td", null, [h("b", { text: "รวม" })])].concat(tot.map(function (v) { return h("td", { cls: "r", text: f0(v) }); }))));
      var pops = D.yearsB.map(function (_, y) { return uc(i, y + 3, 0); });
      bb.appendChild(h("tr", null, [h("td", { cls: "muted", text: "บาทต่อหัว UC" })].concat(tot.map(function (v, y) { var q = pops[y] ? v / pops[y] : null; return h("td", { cls: "r muted", text: q == null ? "–" : q < 10 ? f2(q) : q < 100 ? f1(q) : f0(q) }); }))));
      bt.appendChild(bb);
      bs.appendChild(h("div", { cls: "tbl-wrap" }, [bt]));
    }
    el.appendChild(bs);
  }

  // ---------- init ----------
  buildFilters(); refilter();
  var initTab = (location.hash || "").replace("#", "");
  setTab(TABS.indexOf(initTab) >= 0 ? initTab : "overview", false);
  var lastW = 0, rt = null;
  if (window.ResizeObserver) new ResizeObserver(function (en) {
    var w = Math.round(en[0].contentRect.width);
    if (Math.abs(w - lastW) < 8) return; lastW = w;
    clearTimeout(rt); rt = setTimeout(renderActive, 120);
  }).observe(document.querySelector(".wrap"));
  window.addEventListener("scroll", tipHide, { passive: true });
})();
