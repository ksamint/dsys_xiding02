/* 西顶 XIDING bundle — window.Xiding. Built from components/src/xiding.ts with tsc; no framework, no network. */
"use strict";
(function (root) {
    const R = 26;
    const ROWS = "ABCDEFGH";
    const CENTER = { x: 600, y: 714 };
    const BOUNDS = { left: 178, right: 1022, top: 36, bottom: 1392 };
    const PAD = 140;
    const COLORWAYS = {
        teal: { name: "Temple teal", bg: "#628F8A", fg: "#FFFFFF" },
        ink: { name: "Black on white", bg: "#FFFFFF", fg: "#000000" },
        night: { name: "White on black", bg: "#000000", fg: "#FFFFFF" },
        tealInk: { name: "Teal on white", bg: "#FFFFFF", fg: "#628F8A" },
    };
    const STYLE_NAMES = { dot: "Dot", ring: "Circle", point: "Point" };
    const PRESETS = [
        ["teal", "dot"], ["ink", "dot"], ["night", "dot"], ["ink", "ring"],
        ["ink", "point"], ["night", "ring"], ["tealInk", "ring"], ["night", "point"],
    ];
    const SERIF = "'Noto Serif SC', 'Songti SC', 'SimSun', serif";
    const SANS = "'Instrument Sans', 'Helvetica Neue', Arial, sans-serif";
    const familyOf = (f) => (f === "serif" ? SERIF : SANS);
    const fam = (f) => familyOf(f).replace(/'/g, "&apos;");
    const outerX = (third) => [[339.5, 0], [503.5, 0], [third, 0], [861, 0]];
    const midX = [[204.5, 0], [492.5, 20], [705, 20.5], [996, 0]];
    const EXTRACTED = [
        { y: 61.5, xs: outerX(695) }, { y: 317.5, xs: outerX(695) },
        { y: 427.5, xs: midX }, { y: 594, xs: midX }, { y: 772, xs: midX }, { y: 940, xs: midX },
        { y: 1115.5, xs: outerX(694.5) }, { y: 1365.5, xs: outerX(695) },
    ];
    const tOuter = [[339, 0], [504, 0], [696, 0], [861, 0]];
    const tMid = [[204, 0], [494, 20], [706, 20], [996, 0]];
    const TRUED = [
        { y: 62, xs: tOuter }, { y: 318, xs: tOuter },
        { y: 428, xs: tMid }, { y: 594, xs: tMid }, { y: 772, xs: tMid }, { y: 940, xs: tMid },
        { y: 1116, xs: tOuter }, { y: 1366, xs: tOuter },
    ];
    function marksFor(g) {
        const out = [];
        (g === "trued" ? TRUED : EXTRACTED).forEach((r, ri) => r.xs.forEach(([x, half], ci) => out.push({ id: ROWS[ri] + (ci + 1), row: ri, col: ci, x, y: r.y, half })));
        return out;
    }
    function circlesFor(ms) {
        const out = [];
        ms.forEach((m) => {
            if (m.half) {
                out.push({ mark: m, cx: m.x - m.half, cy: m.y }, { mark: m, cx: m.x + m.half, cy: m.y });
            }
            else {
                out.push({ mark: m, cx: m.x, cy: m.y });
            }
        });
        return out;
    }
    const fmt = (n) => (Math.round(n * 100) / 100).toString();
    const fmt3 = (n) => (Math.round(n * 1000) / 1000).toString();
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    function stateOf(o) {
        return {
            colorway: o.colorway || "teal", style: o.style || "dot", lockup: o.lockup || "mark",
            geometry: o.geometry || "extracted", size: o.size == null ? 1 : o.size, ring: o.ring == null ? 6 : o.ring,
            transparent: !!o.transparent,
        };
    }
    const radius = (s) => (s.style === "point" ? 4 * s.size : R * s.size);
    function circleMarkup(s, c, fg) {
        const r = radius(s);
        if (s.style === "ring") {
            const rr = Math.max(0.5, r - s.ring / 2);
            return `<circle cx="${fmt(c.cx)}" cy="${fmt(c.cy)}" r="${fmt(rr)}" fill="none" stroke="${fg}" stroke-width="${fmt(s.ring)}"/>`;
        }
        return `<circle cx="${fmt(c.cx)}" cy="${fmt(c.cy)}" r="${fmt(r)}" fill="${fg}"/>`;
    }
    function frame(s) {
        const L = BOUNDS.left, Rt = BOUNDS.right, T = BOUNDS.top, B = BOUNDS.bottom, pad = PAD;
        if (s.lockup === "stacked") {
            return {
                x: L - pad, y: T - pad, w: Rt - L + 2 * pad, h: B + 520 + pad - (T - pad),
                texts: [
                    { text: "西顶", x: 600, y: B + 340, size: 280, anchor: "middle", family: "serif", weight: 700, spacing: 0.06 },
                    { text: "XIDING", x: 600, y: B + 505, size: 84, anchor: "middle", family: "sans", weight: 500, spacing: 0.42 },
                ],
            };
        }
        if (s.lockup === "horizontal") {
            const tx = Rt + 170;
            return {
                x: L - pad, y: T - pad, w: tx + 880 + pad - (L - pad), h: B - T + 2 * pad,
                texts: [
                    { text: "西顶", x: tx, y: 800, size: 430, anchor: "start", family: "serif", weight: 700, spacing: 0.04 },
                    { text: "XIDING", x: tx + 12, y: 1010, size: 100, anchor: "start", family: "sans", weight: 500, spacing: 0.42 },
                ],
            };
        }
        return { x: L - pad, y: T - pad, w: Rt - L + 2 * pad, h: B - T + 2 * pad, texts: [] };
    }
    function textMarkup(t, fg) {
        const tx = t.anchor === "middle" && !t.fit ? t.x + (t.spacing * t.size) / 2 : t.x;
        const fit = t.fit ? ` textLength="${fmt(t.fit)}" lengthAdjust="spacing"` : ` letter-spacing="${t.spacing}em"`;
        return `<text x="${fmt(tx)}" y="${fmt(t.y)}" font-family="${fam(t.family)}" font-size="${fmt(t.size)}" font-weight="${t.weight}"${fit} text-anchor="${t.anchor}" fill="${fg}">${esc(t.text)}</text>`;
    }
    function svgOf(s, f, o, extra) {
        const cw = COLORWAYS[s.colorway];
        const fg = o.ink || cw.fg;
        const ground = o.ground || cw.bg;
        const cs = circlesFor(marksFor(s.geometry));
        const bg = s.transparent || ground === "none" ? "" : `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="${ground}"/>`;
        const dims = o.sized ? ` width="${f.w}" height="${f.h}"` : "";
        const label = esc(o.title || "Xiding mark");
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f.x} ${f.y} ${f.w} ${f.h}"${dims} role="img" aria-label="${label}">\n<title>${label}</title>\n${bg}\n<g>\n${cs.map((c) => circleMarkup(s, c, fg)).join("\n")}\n</g>\n${f.texts.map((t) => textMarkup(t, fg)).join("\n")}\n${extra}</svg>\n`;
    }
    function mark(o = {}) {
        const s = stateOf(o);
        return svgOf(s, frame(s), o, "");
    }
    function pairCircles(cx, cy, size, fill) {
        const r = size * 0.19, d = r * 1.54;
        return `<circle cx="${fmt(cx - d / 2)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="${fill}"/><circle cx="${fmt(cx + d / 2)}" cy="${fmt(cy)}" r="${fmt(r)}" fill="${fill}"/>`;
    }
    const cjkW = (text, size, spacing) => {
        const n = Array.from(text).length;
        return n * size + Math.max(0, n - 1) * spacing * size;
    };
    function brandRowSVG(parts, x, y, size, anchor, fill) {
        const spacing = 0.28, gap = size * 1.5;
        const widths = parts.map((p) => cjkW(p, size, spacing));
        const total = widths.reduce((a, b) => a + b, 0) + gap * 2 * Math.max(0, parts.length - 1);
        let cx = anchor === "middle" ? x - total / 2 : x;
        let out = "";
        parts.forEach((p, i) => {
            out += `<text x="${fmt(cx)}" y="${fmt(y)}" font-family="${fam("serif")}" font-size="${fmt(size)}" font-weight="600" letter-spacing="${spacing}em" text-anchor="start" fill="${fill}">${esc(p)}</text>\n`;
            cx += widths[i];
            if (i < parts.length - 1) {
                out += pairCircles(cx + gap, y - size * 0.34, size, fill) + "\n";
                cx += gap * 2;
            }
        });
        return out;
    }
    function subBrandLayout(o = {}) {
        const layout = o.layout || "wide";
        const latin = o.latin || "XIDING";
        const brands = o.brands || [];
        const s = stateOf(o);
        const cw = COLORWAYS[s.colorway], fg = o.ink || cw.fg;
        const L = BOUNDS.left, Rt = BOUNDS.right, T = BOUNDS.top, B = BOUNDS.bottom, pad = PAD;
        const title = o.title || [latin].concat(brands).join(" ");
        if (layout === "stacked") {
            const zhW = cjkW("西顶", 280, 0.06);
            const latinT = latin === "XIDING"
                ? { text: latin, x: 600, y: B + 505, size: 84, anchor: "middle", family: "sans", weight: 500, spacing: 0.42 }
                : { text: latin, x: 600, y: B + 480, size: 46, anchor: "middle", family: "sans", weight: 500, spacing: 0.42, fit: zhW };
            const rowY = latinT.y + 150;
            const f = {
                x: L - pad, y: T - pad, w: Rt - L + 2 * pad, h: (brands.length ? rowY + 155 : latinT.y + 155) - (T - pad),
                texts: [{ text: "西顶", x: 600, y: B + 340, size: 280, anchor: "middle", family: "serif", weight: 700, spacing: 0.06 }, latinT],
            };
            const row = brands.length ? { parts: brands, x: 600, y: rowY, size: 80, anchor: "middle" } : null;
            return { s, f, row, title, fg };
        }
        const r = R * s.size;
        const INK_TOP = 0.84, INK_BOTTOM = 0.06;
        const topInk = 317.5 - r, botInk = 772 + r;
        const size = (botInk - topInk) / (INK_TOP + INK_BOTTOM);
        const gap = 6.5 * (1356 / 30), tx = Rt + gap;
        const zhW = cjkW("西顶", size, 0.04);
        const latinT = latin === "XIDING"
            ? { text: latin, x: tx + 9, y: 1115.5 + r, size: 104, anchor: "start", family: "sans", weight: 500, spacing: 0.46 }
            : { text: latin, x: tx + 9, y: 1115.5 + r, size: 82, anchor: "start", family: "sans", weight: 500, spacing: 0.46, fit: zhW - 18 };
        const f = {
            x: L - pad, y: T - pad, w: tx + zhW + pad - (L - pad), h: B - T + 2 * pad,
            texts: [{ text: "西顶", x: tx, y: botInk - INK_BOTTOM * size, size, anchor: "start", family: "serif", weight: 700, spacing: 0.04 }, latinT],
        };
        const natural = brands.reduce((a, b) => a + cjkW(b, 95, 0.28), 0) + 95 * 3 * Math.max(0, brands.length - 1);
        const rowSize = 95 * Math.min(1, (zhW - 4.5) / Math.max(1, natural));
        const row = brands.length ? { parts: brands, x: tx + 4.5, y: 1365.5 + r, size: rowSize, anchor: "start" } : null;
        return { s, f, row, title, fg };
    }
    function subBrand(o = {}) {
        const l = subBrandLayout(o);
        const row = l.row ? brandRowSVG(l.row.parts, l.row.x, l.row.y, l.row.size, l.row.anchor, l.fg) : "";
        return svgOf(l.s, l.f, { ...o, title: l.title }, row);
    }
    function brandRow(parts, o = {}) {
        const style = (o.size ? `font-size:${o.size};` : "") + (o.color ? `color:${o.color};` : "");
        const pair = `<svg class="xd-pair" viewBox="0 0 67.26 38" aria-hidden="true"><circle cx="19" cy="19" r="19"/><circle cx="48.26" cy="19" r="19"/></svg>`;
        return `<span class="xd-brandrow"${style ? ` style="${style}"` : ""}>${parts.map((p) => `<span>${esc(p)}</span>`).join(pair)}</span>`;
    }
    const BLEED = 2, SAFE = 4;
    const MARGIN = 6;
    const SMALL = 2.1;
    const LEAD = 3.4;
    const NAME = 4.8;
    const INK_TOP = 0.84, INK_BOTTOM = 0.06;
    const MARK_ASPECT = 844 / 1356;
    const ACCENT_TEXT = "#3D6560";
    const BACKS = {
        paper: { bg: "#FFFFFF", fg: "#000000", mark: "#628F8A", name: "White" },
        ink: { bg: "#000000", fg: "#FFFFFF", mark: "#FFFFFF", name: "Black" },
        teal: { bg: "#628F8A", fg: "#FFFFFF", mark: "#FFFFFF", name: "Teal" },
    };
    const ADDRESS = "北京市海淀区曙光街道西顶路西顶庙";
    const PEOPLE = [
        { nameZh: "张三", nameEn: "Zhang San", titleZh: "首席执行官", titleEn: "CEO", phone: "+86 100 0000 0001", email: "zhangsan@example.com", web: "example.com", address: ADDRESS },
        { nameZh: "李四", nameEn: "Li Si", titleZh: "院长", titleEn: "Dean", phone: "+86 100 0000 0002", email: "lisi@example.com", web: "example.com", address: ADDRESS },
        { nameZh: "王小五", nameEn: "Wang Xiaowu", titleZh: "董事", titleEn: "Director", phone: "+86 100 0000 0003", email: "wangxiaowu@example.com", web: "example.com", address: ADDRESS },
    ];
    let mctx = null;
    function measure(text, font) {
        if (typeof document === "undefined") {
            return null;
        }
        if (!mctx) {
            mctx = document.createElement("canvas").getContext("2d");
        }
        if (!mctx) {
            return null;
        }
        mctx.font = font;
        return mctx.measureText(text).width;
    }
    function textW(text, size, family, weight, spacing) {
        const chars = Array.from(text);
        let sum = 0;
        for (const c of chars) {
            const m = measure(c, `${weight} ${size * 10}px ${familyOf(family)}`);
            sum += m == null ? (c.charCodeAt(0) > 0x2e80 ? 1 : 0.56) * size * 10 : m;
        }
        return (sum + spacing * size * 10 * (chars.length - 1)) / 10;
    }
    const nameSpacing = (name) => (Array.from(name.trim()).length === 2 ? 1 : 0.16);
    const cardSize = (c) => (c.orientation === "landscape" ? { w: 90, h: 54 } : { w: 54, h: 90 });
    function markPrims(c, cx, cy, height, fg) {
        const s = c.mark, k = height / 1356;
        const r = s.style === "point" ? Math.max(0.14, 4 * k * s.size) : R * k * s.size;
        return circlesFor(marksFor(s.geometry)).map((p) => {
            const x = cx + (p.cx - 600) * k, y = cy + (p.cy - 714) * k;
            if (s.style === "ring") {
                const sw = Math.max(0.08, s.ring * k);
                return { t: "circle", cx: x, cy: y, r: Math.max(0.05, r - sw / 2), stroke: fg, sw };
            }
            return { t: "circle", cx: x, cy: y, r, fill: fg };
        });
    }
    function txt(text, x, y, size, o) {
        return { t: "text", text, x, y, size, family: "sans", weight: 400, spacing: 0, anchor: "start", opacity: 1, fill: "#000000", ...o };
    }
    function pairDot(cx, cy, size, fill) {
        const r = size * 0.19, d = r * 1.54;
        return [{ t: "circle", cx: cx - d / 2, cy, r, fill }, { t: "circle", cx: cx + d / 2, cy, r, fill }];
    }
    function pairRow(parts, x, y, size, anchor, fill, opts = {}) {
        const family = opts.family || "sans", weight = opts.weight || 400, spacing = opts.spacing || 0;
        const gap = size * 1.5;
        const widths = parts.map((p) => textW(p, size, family, weight, spacing));
        const total = widths.reduce((s, v) => s + v, 0) + gap * 2 * Math.max(0, parts.length - 1);
        let cx = anchor === "middle" ? x - total / 2 : x;
        const out = [];
        parts.forEach((p, i) => {
            out.push(txt(p, cx, y, size, { family, weight, spacing, fill }));
            cx += widths[i];
            if (i < parts.length - 1) {
                out.push(...pairDot(cx + gap, y - size * 0.34, size, fill));
                cx += gap * 2;
            }
        });
        return out;
    }
    const brandParts = (c) => c.brands.split(/[\s\u3000·,，、]+/).map((s) => s.trim()).filter(Boolean);
    function frontPrims(c) {
        const { w, h } = cardSize(c), cw = COLORWAYS[c.front];
        const ps = [{ t: "rect", x: -BLEED, y: -BLEED, w: w + 2 * BLEED, h: h + 2 * BLEED, fill: cw.bg }];
        const land = c.orientation === "landscape", parts = brandParts(c);
        const brandOpts = { family: "serif", weight: 600, spacing: 0.28 };
        if (c.frontLayout === "mark") {
            const mh = land ? 26 : 36, cy = parts.length ? (land ? 23.5 : 40) : h / 2;
            ps.push(...markPrims(c, w / 2, cy, mh, cw.fg));
            if (parts.length) {
                ps.push(...pairRow(parts, w / 2, h - MARGIN - (land ? 2 : 4), 2.2, "middle", cw.fg, brandOpts));
            }
            return ps;
        }
        if (land) {
            const mh = 30, k = mh / 1356, r = R * k * c.mark.size, cy = h / 2;
            const row = (src) => cy + (src - 714) * k;
            const topInk = row(317.5) - r, botInk = row(772) + r;
            const size = (botInk - topInk) / (INK_TOP + INK_BOTTOM);
            const wmW = textW("西顶", size, "serif", 700, 0.04), gap = 6.5, mw = mh * MARK_ASPECT;
            const start = (w - (mw + gap + wmW)) / 2, mcx = start + mw / 2, tx = start + mw + gap;
            ps.push(...markPrims(c, mcx, cy, mh, cw.fg));
            ps.push(txt("西顶", tx, botInk - INK_BOTTOM * size, size, { family: "serif", weight: 700, spacing: 0.04, fill: cw.fg }));
            ps.push(txt("XIDING", tx + 0.2, row(1115.5) + r, 2.3, { weight: 500, spacing: 0.46, fill: cw.fg }));
            if (parts.length) {
                ps.push(...pairRow(parts, tx + 0.1, row(1365.5) + r, 2.1, "start", cw.fg, brandOpts));
            }
            return ps;
        }
        ps.push(...markPrims(c, w / 2, 31, 30, cw.fg));
        ps.push(txt("西顶", w / 2, 62, 9, { family: "serif", weight: 700, spacing: 0.06, anchor: "middle", fill: cw.fg }));
        ps.push(txt("XIDING", w / 2, 67.6, 2.2, { weight: 500, spacing: 0.46, anchor: "middle", fill: cw.fg }));
        if (parts.length) {
            ps.push(...pairRow(parts, w / 2, h - MARGIN - 4, 2.1, "middle", cw.fg, brandOpts));
        }
        return ps;
    }
    function wrapLine(text, size, maxW) {
        const wOf = (str) => textW(str, size, "sans", 400, 0);
        if (wOf(text) <= maxW) {
            return [text];
        }
        const chars = Array.from(text);
        let best = [text], bestScore = Infinity;
        for (let i = 1; i < chars.length; i++) {
            const a = chars.slice(0, i).join("").trim(), b = chars.slice(i).join("").trim();
            if (!a || !b) {
                continue;
            }
            const wa = wOf(a), wb = wOf(b);
            if (wa > maxW || wb > maxW) {
                continue;
            }
            const natural = /[区道路侧号市县镇 ,，]/.test(chars[i - 1]) ? 0 : 1;
            const score = Math.abs(wa - wb) + natural * maxW * 0.25;
            if (score < bestScore) {
                bestScore = score;
                best = [a, b];
            }
        }
        return best;
    }
    function backPrims(c, f) {
        const { w, h } = cardSize(c), b = BACKS[c.back];
        const ps = [{ t: "rect", x: -BLEED, y: -BLEED, w: w + 2 * BLEED, h: h + 2 * BLEED, fill: b.bg }];
        const land = c.orientation === "landscape", center = c.backLayout === "center";
        const label = c.back === "paper" ? ACCENT_TEXT : b.fg, labelOp = c.back === "paper" ? 1 : 0.55;
        const nameZh = f.nameZh.trim(), nameEn = f.nameEn.trim();
        const titleLine = [f.titleZh.trim(), f.titleEn.trim()].filter(Boolean).join("  ");
        const rows = [["M", f.phone], ["E", f.email], ["W", f.web], ["A", f.address]]
            .map(([l, v]) => [l, v.trim()]).filter(([, v]) => v);
        const bottom = h - MARGIN;
        if (!center) {
            const x = MARGIN;
            const capTop = land ? 10.5 : 30;
            const nb = capTop + INK_TOP * NAME;
            if (nameZh) {
                ps.push(txt(nameZh, x, nb, NAME, { family: "serif", weight: 700, spacing: nameSpacing(nameZh), fill: b.fg }));
            }
            if (nameEn) {
                ps.push(txt(nameEn, x, nb + 4.6, SMALL, { weight: 600, spacing: 0.06, fill: b.fg }));
            }
            const tb = nb + 4.6 + LEAD;
            if (titleLine) {
                ps.push(txt(titleLine, x, tb, SMALL, { fill: b.fg, opacity: 0.62 }));
            }
            if (land) {
                const mh = tb - capTop;
                ps.push(...markPrims(c, w - MARGIN - (mh * MARK_ASPECT) / 2, capTop + mh / 2, mh, b.mark));
            }
            else {
                const mh = 15;
                ps.push(...markPrims(c, x + (mh * MARK_ASPECT) / 2, MARGIN + mh / 2, mh, b.mark));
            }
            const vx = x + 3.8, vw = w - MARGIN - vx;
            const lines = [];
            rows.forEach(([l, v]) => wrapLine(v, SMALL, vw).forEach((piece, k) => lines.push([k === 0 ? l : "", piece])));
            lines.slice().reverse().forEach(([l, v], k) => {
                const y = bottom - k * LEAD;
                if (l) {
                    ps.push(txt(l, x, y, SMALL * 0.86, { weight: 600, spacing: 0.04, fill: label, opacity: labelOp }));
                }
                ps.push(txt(v, vx, y, SMALL, { fill: b.fg }));
            });
            return ps;
        }
        const cx = w / 2, inner = w - 2 * MARGIN;
        const mh = land ? 9.5 : 15, mtop = land ? MARGIN : MARGIN + 4;
        ps.push(...markPrims(c, cx, mtop + mh / 2, mh, b.mark));
        const nb = (land ? 19.5 : 34) + INK_TOP * NAME;
        if (nameZh) {
            ps.push(txt(nameZh, cx, nb, NAME, { family: "serif", weight: 700, spacing: nameSpacing(nameZh), anchor: "middle", fill: b.fg }));
        }
        if (nameEn) {
            ps.push(txt(nameEn, cx, nb + 4.6, SMALL, { weight: 600, spacing: 0.06, anchor: "middle", fill: b.fg }));
        }
        if (titleLine) {
            ps.push(txt(titleLine, cx, nb + 4.6 + LEAD, SMALL, { anchor: "middle", fill: b.fg, opacity: 0.62 }));
        }
        const get = (l) => { const hit = rows.filter(([k]) => k === l)[0]; return hit ? hit[1] : ""; };
        const stack = [];
        const pm = [get("M"), get("E")].filter(Boolean);
        if (land && pm.length === 2 && textW(pm.join("     "), SMALL, "sans", 400, 0) < inner) {
            stack.push(pm);
        }
        else {
            pm.forEach((v) => stack.push([v]));
        }
        if (get("W")) {
            stack.push([get("W")]);
        }
        if (get("A")) {
            wrapLine(get("A"), SMALL, inner).forEach((piece) => stack.push([piece]));
        }
        stack.slice().reverse().forEach((parts, k) => {
            const y = bottom - k * LEAD;
            if (parts.length > 1) {
                ps.push(...pairRow(parts, cx, y, SMALL, "middle", b.fg));
            }
            else {
                ps.push(txt(parts[0], cx, y, SMALL, { anchor: "middle", fill: b.fg }));
            }
        });
        return ps;
    }
    function primsSVG(c, ps, opts) {
        const { w, h } = cardSize(c);
        const vb = opts.bleed ? `${-BLEED} ${-BLEED} ${w + 2 * BLEED} ${h + 2 * BLEED}` : `0 0 ${w} ${h}`;
        const size = opts.bleed ? ` width="${w + 2 * BLEED}mm" height="${h + 2 * BLEED}mm"` : "";
        const body = ps.map((p) => {
            if (p.t === "rect") {
                return `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.fill}"/>`;
            }
            if (p.t === "circle") {
                return p.stroke
                    ? `<circle cx="${fmt3(p.cx)}" cy="${fmt3(p.cy)}" r="${fmt3(p.r)}" fill="none" stroke="${p.stroke}" stroke-width="${fmt3(p.sw == null ? 0.1 : p.sw)}"/>`
                    : `<circle cx="${fmt3(p.cx)}" cy="${fmt3(p.cy)}" r="${fmt3(p.r)}" fill="${p.fill}"/>`;
            }
            const x = p.anchor === "middle" ? p.x + (p.spacing * p.size) / 2 : p.x;
            return `<text x="${fmt3(x)}" y="${fmt3(p.y)}" font-family="${fam(p.family)}" font-size="${p.size}" font-weight="${p.weight}" letter-spacing="${p.spacing}em" text-anchor="${p.anchor}" fill="${p.fill}"${p.opacity < 1 ? ` fill-opacity="${p.opacity}"` : ""}>${esc(p.text)}</text>`;
        }).join("\n");
        let guides = "";
        if (opts.guides) {
            guides = `<g fill="none" stroke="#E0457B" stroke-width="0.15"><rect x="0" y="0" width="${w}" height="${h}" stroke-dasharray="1 0.6"/><rect x="${SAFE}" y="${SAFE}" width="${w - 2 * SAFE}" height="${h - 2 * SAFE}" stroke="#2F8FD8" stroke-dasharray="0.4 0.6"/></g>`;
        }
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${size} role="img" aria-label="${esc(opts.label)}">\n${body}\n${guides}</svg>\n`;
    }
    function card(o = {}) {
        const c = {
            front: o.front || "teal", back: o.back || "paper", orientation: o.orientation || "landscape",
            frontLayout: o.frontLayout || "mark", backLayout: o.backLayout || "left",
            brands: o.brands == null ? "西顶艺术　西顶学院　西顶时光" : o.brands,
            mark: stateOf({ style: o.style, geometry: o.geometry, size: o.size, ring: o.ring }),
        };
        const person = { ...PEOPLE[0], ...(o.person || {}) };
        const side = o.side || "front";
        const ps = side === "front" ? frontPrims(c) : backPrims(c, person);
        return primsSVG(c, ps, { bleed: !!o.bleed, guides: !!o.guides, label: side === "front" ? "Xiding business card, front" : `Xiding business card, back, ${person.nameEn}` });
    }
    const PILLARS = [
        { id: "mei", zh: "大美", word: "眼光", sentence: "AI 交来十个方案，你看得出哪一个对。", en: "Taste", line: "美成", motto: "以美成人" },
        { id: "zhi", zh: "大智", word: "章法", sentence: "十件事同时在跑，你排得出先后，知道哪一环会断。", en: "Structure", line: "智行", motto: "以智行事" },
        { id: "li", zh: "大礼", word: "分寸", sentence: "你待人有分寸，关键的人肯为你引荐、担保。", en: "Trust", line: "礼遇", motto: "以礼相遇" },
    ];
    const LINE = "以美成人，以智行事，以礼相遇。";
    const ROOT = { zh: "广仁宫", en: "Guangren Palace" };
    const BRANDS = [
        { zh: "西顶文化", en: "Xiding", level: "整体", settled: true },
        { zh: "西顶艺术", en: "Xiding Arts", level: "牌子", settled: true },
        { zh: "西顶学院", en: "Xiding Academy", level: "牌子", settled: true },
        { zh: "西顶时光", en: "Xiding Lifestyle", level: "牌子", settled: true },
        { zh: "西顶智行", en: "Xiding Praxis", level: "板块", settled: false },
        { zh: "西顶美成", en: "", level: "板块", settled: false },
        { zh: "西顶礼遇", en: "", level: "板块", settled: false },
    ];
    const TAGLINE = "艺术 · 教育 · 生活方式";
    const BRAND_DETAILS = [
        { zh: "西顶艺术", en: "Xiding Arts", latin: "XIDING ARTS", field: "ART / CULTURE", services: ["艺术策展", "品牌共创", "私享定制"], lines: ["以艺术连接文化，", "以创意赋能品牌，", "以体验创造价值。"] },
        { zh: "西顶学院", en: "Xiding Academy", latin: "XIDING ACADEMY", field: "EDUCATION / LEARNING", services: ["课程研修", "战略咨询", "人才发展"], lines: ["以教育启发认知，", "以咨询推动变革，", "以人才驱动未来。"] },
        { zh: "西顶时光", en: "Xiding Lifestyle", latin: "XIDING LIFESTYLE", field: "LIFESTYLE / MEMBERSHIP", services: ["会员生活", "品质社交", "精致体验"], lines: ["以时光沉淀价值，", "以品味连接彼此，", "以社群丰富生活。"] },
    ];
    const SCENES = [
        { pillar: "大美", id: "mei", scenes: ["古琴", "艺术鉴赏", "策展"], use: "养品味" },
        { pillar: "大智", id: "zhi", scenes: ["咨询", "培训", "落地陪跑对接"], use: "解决问题" },
        { pillar: "大礼", id: "li", scenes: ["生日", "下午茶", "私宴"], use: "经营关系" },
        { pillar: "担当", id: "root", scenes: ["心理辅导", "教练"], use: "养心力" },
    ];
    function rowPrims(parts, x, y, size, anchor, fill) {
        const spacing = 0.28, gap = size * 1.5;
        const widths = parts.map((p) => cjkW(p, size, spacing));
        const total = widths.reduce((a, b) => a + b, 0) + gap * 2 * Math.max(0, parts.length - 1);
        let cx = anchor === "middle" ? x - total / 2 : x;
        const out = [];
        parts.forEach((p, i) => {
            out.push({ t: "text", text: p, x: cx, y, size, family: "serif", weight: 600, spacing, anchor: "start", fill });
            cx += widths[i];
            if (i < parts.length - 1) {
                const r = size * 0.19, d = r * 1.54, px = cx + gap, py = y - size * 0.34;
                out.push({ t: "circle", cx: px - d / 2, cy: py, r, fill }, { t: "circle", cx: px + d / 2, cy: py, r, fill });
                cx += gap * 2;
            }
        });
        return out;
    }
    function frameArt(name, label, group, s, f, o, extra) {
        const cw = COLORWAYS[s.colorway], fg = o.ink || cw.fg, ground = o.ground || cw.bg;
        const prims = [];
        if (!(s.transparent || ground === "none")) {
            prims.push({ t: "rect", x: f.x, y: f.y, w: f.w, h: f.h, fill: ground });
        }
        const r = radius(s);
        circlesFor(marksFor(s.geometry)).forEach((c) => {
            if (s.style === "ring") {
                prims.push({ t: "circle", cx: c.cx, cy: c.cy, r: Math.max(0.5, r - s.ring / 2), stroke: fg, sw: s.ring });
            }
            else {
                prims.push({ t: "circle", cx: c.cx, cy: c.cy, r, fill: fg });
            }
        });
        f.texts.forEach((t) => prims.push({ t: "text", text: t.text, x: t.x, y: t.y, size: t.size, family: t.family, weight: t.weight, spacing: t.spacing, anchor: t.anchor, fill: fg, fit: t.fit }));
        const hasSans = f.texts.some((t) => t.family === "sans");
        return { name, label, group, fonts: f.texts.length || extra.length ? (hasSans ? "mixed" : "serif") : "none", x: f.x, y: f.y, w: f.w, h: f.h, px: Math.round(f.w), prims: prims.concat(extra) };
    }
    function artMark(o = {}) {
        const s = stateOf(o), cw = COLORWAYS[s.colorway];
        const lock = s.lockup === "mark" ? "mark" : s.lockup === "stacked" ? "lockup-stacked" : "lockup-wide";
        const what = s.lockup === "mark" ? "Mark" : s.lockup === "stacked" ? "Stacked lockup" : "Wide lockup";
        return frameArt(`xiding-${lock}-${s.colorway}-${s.style}`, `${what}, ${cw.name.toLowerCase()}`, s.lockup === "mark" ? "Marks" : "Lockups", s, frame(s), o, []);
    }
    function artSubBrand(o = {}, slug = "subbrand") {
        const l = subBrandLayout(o), cw = COLORWAYS[l.s.colorway];
        const extra = l.row ? rowPrims(l.row.parts, l.row.x, l.row.y, l.row.size, l.row.anchor, l.fg) : [];
        const who = slug === "academy" ? "Academy" : slug === "arts" ? "Arts" : slug === "shiguang" ? "Lifestyle" : slug === "all" ? "The three brands" : (o.brands || []).join(" ");
        const a = frameArt(`xiding-${slug}-${o.layout || "wide"}-${l.s.colorway}`, `${who}, ${o.layout === "stacked" ? "stacked" : "wide"}, ${cw.name.toLowerCase()}`, "Sub-brands", l.s, l.f, o, extra);
        a.fonts = "mixed";
        return a;
    }
    function artCard(o = {}, slug = "card") {
        const c = {
            front: o.front || "teal", back: o.back || "paper", orientation: o.orientation || "landscape",
            frontLayout: o.frontLayout || "mark", backLayout: o.backLayout || "left",
            brands: o.brands == null ? "西顶艺术　西顶学院　西顶时光" : o.brands,
            mark: stateOf({ style: o.style, geometry: o.geometry, size: o.size, ring: o.ring }),
        };
        const person = { ...PEOPLE[0], ...(o.person || {}) };
        const side = o.side || "front";
        const ps = (side === "front" ? frontPrims(c) : backPrims(c, person));
        const { w, h } = cardSize(c);
        return { name: `xiding-${slug}`, label: side === "front" ? "Business card, front" : `Business card, back, ${person.nameZh}`, group: "Business cards", fonts: "mixed", x: -BLEED, y: -BLEED, w: w + 2 * BLEED, h: h + 2 * BLEED, px: Math.round((w + 2 * BLEED) * 300 / 25.4), prims: ps };
    }
    const INKS = { black: "#000000", white: "#FFFFFF", teal: "#628F8A" };
    function artWordmark(text, kind, ink, slug) {
        const size = kind === "wordmark" ? 280 : 120, spacing = kind === "wordmark" ? 0.04 : 0.28, weight = kind === "wordmark" ? 700 : 600;
        const pad = size * 0.5, tw = cjkW(text, size, spacing);
        return {
            name: `xiding-${slug}-${ink}`, label: ink === "white" ? `${text}, white on temple teal` : `${text}, ${ink}`, group: "Wordmarks", fonts: "serif",
            x: 0, y: 0, w: tw + 2 * pad, h: size * 0.9 + 2 * pad, px: Math.round((tw + 2 * pad) * (kind === "wordmark" ? 2 : 3)),
            prims: (ink === "white" ? [{ t: "rect", x: 0, y: 0, w: tw + 2 * pad, h: size * 0.9 + 2 * pad, fill: "#628F8A" }] : []).concat([{ t: "text", text, x: pad, y: pad + size * 0.84, size, family: "serif", weight, spacing, anchor: "start", fill: INKS[ink] }]),
        };
    }
    function pillarInks(id, dark) {
        if (id === "mei") {
            return { fill: "#628F8A", on: "#FFFFFF" };
        }
        if (id === "zhi") {
            return dark ? { fill: "#FFFFFF", on: "#141B1A" } : { fill: "#000000", on: "#FFFFFF" };
        }
        return dark ? { fill: "#141B1A", on: "#FFFFFF", stroke: "#FFFFFF" } : { fill: "#FFFFFF", on: "#000000", stroke: "#000000" };
    }
    function artPillars(theme = "light") {
        const dark = theme === "dark", ink = dark ? "#FFFFFF" : "#000000";
        const W = 960, M = 24, G = 24, cw = (W - 2 * M - 2 * G) / 3, top = 56, ph = 200, base = top + ph;
        const prims = [];
        PILLARS.forEach((p, i) => {
            const x = M + i * (cw + G), k = pillarInks(p.id, dark);
            prims.push({ t: "text", text: p.line, x, y: 36, size: 14, family: "serif", weight: 600, spacing: 0.28, anchor: "start", fill: ink });
            prims.push({ t: "rect", x, y: top, w: cw, h: ph, fill: k.fill, rx: 4 });
            prims.push({ t: "rect", x, y: base - 6, w: cw, h: 6, fill: k.fill });
            if (k.stroke) {
                prims.push({ t: "rect", x: x + 0.5, y: top + 0.5, w: cw - 1, h: ph - 0.5, stroke: k.stroke, sw: 1, rx: 4 });
            }
            prims.push({ t: "text", text: p.word, x: x + 20, y: top + 20 + 24 * 0.84, size: 24, family: "serif", weight: 600, spacing: 0.12, anchor: "start", fill: k.on });
            prims.push({ t: "text", text: p.zh, x: x + 20, y: base - 20 - 56 * 0.06, size: 56, family: "serif", weight: 700, spacing: 0.04, anchor: "start", fill: k.on });
            prims.push({ t: "text", text: p.motto, x, y: base + 2 + 12 + 22 * 0.84, size: 22, family: "serif", weight: 700, spacing: 0.12, anchor: "start", fill: ink });
        });
        prims.push({ t: "rect", x: M, y: base, w: W - 2 * M, h: 2, fill: ink });
        return { name: `xiding-pillars-${theme}`, label: `一底三柱, for a ${theme} ground`, group: "Pillars", fonts: "serif", x: 0, y: 0, w: W, h: base + 2 + 12 + 22 + 24, px: 1920, prims };
    }
    function artPillarPlate(id) {
        const p = PILLARS.filter((q) => q.id === id)[0], k = pillarInks(id, false), S = 512;
        const prims = [{ t: "rect", x: 0, y: 0, w: S, h: S, fill: k.fill }];
        if (k.stroke) {
            prims.push({ t: "rect", x: 2, y: 2, w: S - 4, h: S - 4, stroke: k.stroke, sw: 4 });
        }
        prims.push({ t: "text", text: p.word, x: 48, y: 48 + 64 * 0.84, size: 64, family: "serif", weight: 600, spacing: 0.12, anchor: "start", fill: k.on });
        prims.push({ t: "text", text: p.zh, x: 48, y: S - 48 - 160 * 0.06, size: 160, family: "serif", weight: 700, spacing: 0.04, anchor: "start", fill: k.on });
        return { name: `xiding-pillar-${id}`, label: `${p.zh}，${p.word}`, group: "Pillars", fonts: "serif", x: 0, y: 0, w: S, h: S, px: 1024, prims };
    }
    const themeInks = (theme) => theme === "dark"
        ? { ink: "#FFFFFF", muted: "#A9B6B3", accent: "#9CC2BC" }
        : { ink: "#000000", muted: "#4E5A58", accent: "#3D6560" };
    const SITE = "xidingmiao.com";
    const STEPS = [
        ["人和内容带来", "艺术家和行业专家。"],
        ["三个板块把专家的能力", "交付给会员和合作伙伴。"],
        ["智能体之间完成", "匹配、预约与分账，", "收益回到出力的人手里。"],
    ];
    function artArchitecture(theme = "light") {
        const k = themeInks(theme), dark = theme === "dark", W = 960;
        const prims = [];
        const label = (text, y) => prims.push({ t: "text", text, x: 0, y, size: 14, family: "serif", weight: 600, spacing: 0.28, anchor: "start", fill: k.muted });
        label("一套班子", 14);
        prims.push({ t: "rect", x: 0.5, y: 24.5, w: W - 1, h: 63, stroke: k.ink, sw: 1, rx: 4 });
        prims.push({ t: "text", text: "西顶文化", x: W / 2, y: 65.5, size: 26, family: "serif", weight: 700, spacing: 0.12, anchor: "middle", fill: k.ink });
        label("三个牌子", 124);
        const wb = (W - 48) / 3;
        BRAND_DETAILS.map((b) => [b.zh, b.services.join("　")]).forEach(([name, services], i) => {
            const x = i * (wb + 24);
            prims.push({ t: "rect", x: x + 0.5, y: 134.5, w: wb - 1, h: 79, stroke: k.ink, sw: 1, rx: 4 });
            prims.push({ t: "text", text: name, x: x + 20, y: 169, size: 26, family: "serif", weight: 700, spacing: 0.12, anchor: "start", fill: k.ink });
            prims.push({ t: "text", text: services, x: x + 20, y: 198, size: 15, family: "serif", weight: 600, spacing: 0.04, anchor: "start", fill: k.muted });
        });
        label("三个板块", 250);
        const w3 = (W - 48) / 3;
        PILLARS.forEach((p, i) => {
            const x = i * (w3 + 24), c = pillarInks(p.id, dark);
            prims.push({ t: "rect", x, y: 260, w: w3, h: 80, fill: c.fill, rx: 4 });
            if (c.stroke) {
                prims.push({ t: "rect", x: x + 0.5, y: 260.5, w: w3 - 1, h: 79, stroke: c.stroke, sw: 1, rx: 4 });
            }
            prims.push({ t: "text", text: p.line, x: x + 20, y: 310, size: 28, family: "serif", weight: 700, spacing: 0.12, anchor: "start", fill: c.on });
            prims.push({ t: "text", text: p.zh, x: x + w3 - 20 - cjkW(p.zh, 20, 0.04), y: 307, size: 20, family: "serif", weight: 700, spacing: 0.04, anchor: "start", fill: c.on });
            prims.push({ t: "text", text: p.motto, x, y: 368, size: 18, family: "serif", weight: 600, spacing: 0.12, anchor: "start", fill: k.ink });
        });
        return { name: `xiding-intro-architecture-${theme}`, label: `一套班子，三个牌子，三个板块, for a ${theme} ground`, group: "Intro", fonts: "serif", x: 0, y: 0, w: W, h: 380, px: 1920, prims };
    }
    function artSteps(theme = "light") {
        const k = themeInks(theme), W = 960, n = STEPS.length, w = (W - 24 * (n - 1)) / n;
        const prims = [];
        STEPS.forEach((lines, i) => {
            const x = i * (w + 24);
            prims.push({ t: "text", text: String(i + 1), x, y: 60, size: 72, family: "serif", weight: 700, spacing: 0, anchor: "start", fill: k.accent });
            prims.push({ t: "rect", x, y: 76, w, h: 2, fill: k.ink });
            lines.forEach((line, j) => prims.push({ t: "text", text: line, x, y: 108 + j * 28, size: 18, family: "serif", weight: 600, spacing: 0.02, anchor: "start", fill: k.ink }));
        });
        return { name: `xiding-intro-steps-${theme}`, label: `${"一二三四五六"[n - 1]}步, for a ${theme} ground`, group: "Intro", fonts: "serif", x: 0, y: 0, w: W, h: 180, px: 1920, prims };
    }
    function artAvatar(colorway = "teal") {
        const s = stateOf({ colorway }), cw = COLORWAYS[colorway], side = BOUNDS.bottom - BOUNDS.top + 2 * PAD;
        const prims = [{ t: "rect", x: CENTER.x - side / 2, y: BOUNDS.top - PAD, w: side, h: side, fill: cw.bg }];
        circlesFor(marksFor(s.geometry)).forEach((c) => prims.push({ t: "circle", cx: c.cx, cy: c.cy, r: R, fill: cw.fg }));
        return { name: `xiding-avatar-${colorway}`, label: `Avatar, ${cw.name.toLowerCase()}`, group: "Avatars", fonts: "none", x: CENTER.x - side / 2, y: BOUNDS.top - PAD, w: side, h: side, px: 1024, prims };
    }
    const f2 = (n) => (Math.round(n * 1000) / 1000).toString();
    function toSVG(a) {
        const body = a.prims.map((p) => {
            if (p.t === "rect") {
                return `<rect x="${f2(p.x)}" y="${f2(p.y)}" width="${f2(p.w)}" height="${f2(p.h)}"${p.rx ? ` rx="${f2(p.rx)}"` : ""} fill="${p.fill || "none"}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${f2(p.sw || 1)}"` : ""}/>`;
            }
            if (p.t === "circle") {
                return p.stroke
                    ? `<circle cx="${f2(p.cx)}" cy="${f2(p.cy)}" r="${f2(p.r)}" fill="none" stroke="${p.stroke}" stroke-width="${f2(p.sw == null ? 0.1 : p.sw)}"/>`
                    : `<circle cx="${f2(p.cx)}" cy="${f2(p.cy)}" r="${f2(p.r)}" fill="${p.fill}"/>`;
            }
            const x = p.anchor === "middle" && !p.fit ? p.x + (p.spacing * p.size) / 2 : p.x;
            const sp = p.fit ? ` textLength="${f2(p.fit)}" lengthAdjust="spacing"` : ` letter-spacing="${p.spacing}em"`;
            return `<text x="${f2(x)}" y="${f2(p.y)}" font-family="${fam(p.family)}" font-size="${f2(p.size)}" font-weight="${p.weight}"${sp} text-anchor="${p.anchor}" fill="${p.fill}"${p.opacity != null && p.opacity < 1 ? ` fill-opacity="${p.opacity}"` : ""}>${esc(p.text)}</text>`;
        }).join("\n");
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f2(a.x)} ${f2(a.y)} ${f2(a.w)} ${f2(a.h)}" role="img" aria-label="${esc(a.label)}">\n<title>${esc(a.label)}</title>\n${body}\n</svg>\n`;
    }
    async function toPNG(a, widthPx) {
        const k = (widthPx || a.px) / a.w;
        const cv = document.createElement("canvas");
        cv.width = Math.round(a.w * k);
        cv.height = Math.round(a.h * k);
        const ctx = cv.getContext("2d");
        ctx.setTransform(k, 0, 0, k, -a.x * k, -a.y * k);
        for (const p of a.prims) {
            if (p.t === "rect") {
                ctx.beginPath();
                const rx = p.rx || 0;
                if (rx && ctx.roundRect) {
                    ctx.roundRect(p.x, p.y, p.w, p.h, rx);
                }
                else {
                    ctx.rect(p.x, p.y, p.w, p.h);
                }
                if (p.fill) {
                    ctx.fillStyle = p.fill;
                    ctx.fill();
                }
                if (p.stroke) {
                    ctx.strokeStyle = p.stroke;
                    ctx.lineWidth = p.sw || 1;
                    ctx.stroke();
                }
                continue;
            }
            if (p.t === "circle") {
                ctx.beginPath();
                ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
                if (p.stroke) {
                    ctx.strokeStyle = p.stroke;
                    ctx.lineWidth = p.sw == null ? 0.1 : p.sw;
                    ctx.stroke();
                }
                else {
                    ctx.fillStyle = p.fill || "#000000";
                    ctx.fill();
                }
                continue;
            }
            const font = `${p.weight} 100px ${familyOf(p.family)}`;
            try {
                await document.fonts.load(font, p.text);
            }
            catch (e) { }
            const u = p.size / 100, chars = Array.from(p.text);
            ctx.font = font;
            const ws = chars.map((ch) => ctx.measureText(ch).width * u);
            const natural = ws.reduce((s, v) => s + v, 0);
            const gap = p.fit && chars.length > 1 ? (p.fit - natural) / (chars.length - 1) : p.spacing * p.size;
            const total = natural + gap * (chars.length - 1);
            let x = p.anchor === "middle" ? p.x - total / 2 : p.x;
            ctx.save();
            ctx.globalAlpha = p.opacity == null ? 1 : p.opacity;
            ctx.fillStyle = p.fill;
            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";
            chars.forEach((ch, i) => {
                ctx.save();
                ctx.translate(x, p.y);
                ctx.scale(u, u);
                ctx.fillText(ch, 0, 0);
                ctx.restore();
                x += ws[i] + gap;
            });
            ctx.restore();
        }
        return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("PNG encoding failed"))), "image/png"));
    }
    function kit() {
        const out = [];
        ["teal", "ink", "night", "tealInk"].forEach((c) => {
            out.push(artMark({ lockup: "stacked", colorway: c }));
            out.push(artMark({ lockup: "horizontal", colorway: c }));
        });
        ["teal", "ink", "night"].forEach((c) => out.push(artSubBrand({ layout: "wide", latin: "XIDING ACADEMY", brands: ["西顶学院"], colorway: c }, "academy")));
        out.push(artSubBrand({ layout: "stacked", latin: "XIDING ACADEMY", brands: ["西顶学院"], colorway: "teal" }, "academy"));
        out.push(artSubBrand({ layout: "wide", latin: "XIDING ARTS", brands: ["西顶艺术"], colorway: "ink" }, "arts"));
        out.push(artSubBrand({ layout: "wide", latin: "XIDING LIFESTYLE", brands: ["西顶时光"], colorway: "ink" }, "shiguang"));
        out.push(artSubBrand({ layout: "wide", brands: ["西顶艺术", "西顶学院", "西顶时光"], colorway: "ink" }, "all"));
        ["black", "white", "teal"].forEach((k) => out.push(artWordmark("西顶", "wordmark", k, "wordmark-zh")));
        const slugs = ["wenhua", "yishu", "xueyuan", "shiguang", "zhixing", "meicheng", "liyu"];
        BRANDS.forEach((b, i) => out.push(artWordmark(b.zh, "row", "black", "name-" + slugs[i])));
        out.push(artPillars("light"), artPillars("dark"));
        ["mei", "zhi", "li"].forEach((id) => out.push(artPillarPlate(id)));
        out.push(artArchitecture("light"), artArchitecture("dark"), artSteps("light"), artSteps("dark"));
        ["teal", "night", "ink"].forEach((c) => out.push(artAvatar(c)));
        out.push(artCard({ side: "front" }, "card-front"));
        PEOPLE.forEach((p, i) => out.push(artCard({ side: "back", person: p }, "card-back-" + (i + 1))));
        out.forEach((a) => {
            const texts = a.prims.filter((p) => p.t === "text");
            a.fonts = !texts.length ? "none" : texts.some((p) => p.family === "sans") ? "mixed" : "serif";
        });
        return out;
    }
    function rng(seed) {
        let a = seed >>> 0;
        return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }
    function scatter(o) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const rand = rng((_a = o.seed) !== null && _a !== void 0 ? _a : 7);
        const hold = Math.min(0.9, Math.max(0, (_b = o.hold) !== null && _b !== void 0 ? _b : 0.5));
        const spread = (_c = o.spread) !== null && _c !== void 0 ? _c : 0.5, ang = (((_d = o.angle) !== null && _d !== void 0 ? _d : -20) * Math.PI) / 180;
        const ux = Math.cos(ang), uy = Math.sin(ang);
        const k = o.size / (BOUNDS.bottom - BOUNDS.top);
        const r = R * k;
        const cs = circlesFor(marksFor("extracted"));
        const proj = cs.map((c) => (c.cx - CENTER.x) * ux + (c.cy - CENTER.y) * uy);
        const pmin = Math.min(...proj), pmax = Math.max(...proj);
        const dots = cs.map((c, i) => {
            const lead = spread > 0 ? Math.max(0, ((proj[i] - pmin) / (pmax - pmin || 1) - hold) / (1 - hold)) : 0;
            const d = spread * o.size * Math.pow(lead, 1.8) * (0.6 + 0.8 * rand());
            const side = (rand() - 0.5) * spread * o.size * 0.22 * lead;
            return {
                x: o.x + (c.cx - BOUNDS.left) * k + ux * d - uy * side,
                y: o.y + (c.cy - BOUNDS.top) * k + uy * d + ux * side,
                r, fx: lead > 0 ? (rand() - 0.5) * r * 2.4 * Math.min(1, lead * 3) : 0, fy: lead > 0 ? (rand() - 0.5) * r * 2.4 * Math.min(1, lead * 3) : 0, t: 5 + rand() * 5, free: lead > 0,
            };
        });
        const cx0 = o.x + (CENTER.x - BOUNDS.left) * k, cy0 = o.y + (CENTER.y - BOUNDS.top) * k;
        for (let i = 0; i < ((_e = o.strays) !== null && _e !== void 0 ? _e : 0); i++) {
            const d = o.size * (0.55 + spread * (0.4 + rand() * 1.1));
            const side = (rand() - 0.5) * o.size * 0.9;
            dots.push({ x: cx0 + ux * d - uy * side, y: cy0 + uy * d + ux * side, r: r * (0.35 + rand() * 0.6),
                fx: (rand() - 0.5) * r * 3, fy: (rand() - 0.5) * r * 3, t: 6 + rand() * 6, free: true });
        }
        const clear = (d) => { var _a; return !((_a = o.avoid) !== null && _a !== void 0 ? _a : []).some((b) => {
            const m = d.r + Math.max(Math.abs(d.fx), Math.abs(d.fy)) + 4;
            return d.x > b.x - m && d.x < b.x + b.w + m && d.y > b.y - m && d.y < b.y + b.h + m;
        }); };
        const kept = dots.filter((d) => !d.free || clear(d));
        dots.length = 0;
        dots.push(...kept);
        const ink = (_f = o.ink) !== null && _f !== void 0 ? _f : "currentColor", fieldInk = (_g = o.fieldInk) !== null && _g !== void 0 ? _g : "#FFFFFF";
        const id = "xds" + ((_h = o.seed) !== null && _h !== void 0 ? _h : 7) + "-" + Math.round(o.width) + "-" + Math.round(o.height);
        const circles = (fill) => dots.map((d, i) => `<circle cx="${fmt(d.x)}" cy="${fmt(d.y)}" r="${fmt(d.r)}" fill="${fill}" style="--fx:${fmt(d.fx)}px;--fy:${fmt(d.fy)}px;--t:${fmt(d.t)}s;--d:${i * 18}ms"/>`).join("");
        const f = o.field;
        let body;
        if (f) {
            body = `<defs><clipPath id="${id}-in"><rect x="${fmt(f.x)}" y="${fmt(f.y)}" width="${fmt(f.w)}" height="${fmt(f.h)}"/></clipPath>` +
                `<clipPath id="${id}-out"><path clip-rule="evenodd" d="M-9999 -9999H9999V9999H-9999Z M${fmt(f.x)} ${fmt(f.y)}h${fmt(f.w)}v${fmt(f.h)}h${fmt(-f.w)}Z"/></clipPath></defs>` +
                `<rect x="${fmt(f.x)}" y="${fmt(f.y)}" width="${fmt(f.w)}" height="${fmt(f.h)}" fill="${(_j = o.fieldFill) !== null && _j !== void 0 ? _j : COLORWAYS.teal.bg}"/>` +
                `<g clip-path="url(#${id}-out)">${circles(ink)}</g><g clip-path="url(#${id}-in)">${circles(fieldInk)}</g>`;
        }
        else
            body = `<g>${circles(ink)}</g>`;
        const label = o.title ? ` role="img" aria-label="${esc(o.title)}"` : ` aria-hidden="true"`;
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(o.width)} ${fmt(o.height)}" width="${fmt(o.width)}" height="${fmt(o.height)}" class="xd-scatter${o.breathe ? " xd-breathe" : ""}"${label}>${body}</svg>`;
    }
    function setPeople(list) {
        var _a;
        const base = (_a = PEOPLE[0]) !== null && _a !== void 0 ? _a : { nameZh: "", nameEn: "", titleZh: "", titleEn: "", phone: "", email: "", web: "", address: ADDRESS };
        PEOPLE.splice(0, PEOPLE.length, ...list.map((p) => ({ ...base, ...p })));
    }
    function assemble(scope, stagger = 22) {
        scope.querySelectorAll("svg").forEach((svg) => {
            const cs = Array.from(svg.querySelectorAll("circle"));
            cs.map((c, i) => ({ c, i, y: Number(c.getAttribute("cy")), x: Number(c.getAttribute("cx")) }))
                .sort((a, b) => a.y - b.y || a.x - b.x)
                .forEach((o, n) => o.c.style.setProperty("--d", `${n * stagger}ms`));
            svg.classList.add("xd-assemble");
        });
    }
    root.Xiding = {
        version: "1.8.0",
        PILLARS, LINE, ROOT, BRANDS, BRAND_DETAILS, TAGLINE, SCENES, STEPS, SITE,
        kit, toSVG, toPNG,
        art: { mark: artMark, subBrand: artSubBrand, card: artCard, wordmark: artWordmark, pillars: artPillars, pillarPlate: artPillarPlate, architecture: artArchitecture, steps: artSteps, avatar: artAvatar },
        R, CENTER, BOUNDS, PAD, COLORWAYS, STYLE_NAMES, PRESETS, PEOPLE, ADDRESS,
        points: (g) => marksFor(g),
        circles: (g) => circlesFor(marksFor(g)).map((c) => ({ id: c.mark.id, cx: c.cx, cy: c.cy })),
        mark, subBrand, brandRow, card, assemble, scatter, setPeople,
    };
})(typeof window !== "undefined" ? window : globalThis);
