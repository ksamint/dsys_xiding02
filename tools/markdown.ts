/* A small Markdown renderer for the brand book: headings, paragraphs, lists (one level, ordered or not),
   pipe tables, block quotes, fenced code, inline code, bold, italic and links. Enough for the files in
   design-system/, with no dependency. Output is escaped HTML. */

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function slug(s: string): string {
  return s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "section";
}

export function inline(s: string): string {
  const codes: string[] = [];
  let out = s.replace(/`([^`]+)`/g, (_m, c: string) => { codes.push(`<code>${esc(c)}</code>`); return `\u0000${codes.length - 1}\u0000`; });
  out = esc(out)
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_m, t: string, u: string) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`)
    .replace(/(^|[\s(（])(https?:\/\/[^\s)<）]+)/g, (_m, p: string, u: string) => `${p}<a href="${u}" target="_blank" rel="noopener">${u}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\*)/g, "$1<em>$2</em>");
  return out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => codes[Number(i)] ?? "");
}

export interface Heading { level: number; text: string; id: string }

export function markdown(src: string, idPrefix = ""): { html: string; headings: Heading[] } {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const at = (k: number): string => lines[k] ?? "";
  const html: string[] = [];
  const headings: Heading[] = [];
  let i = 0;
  const isBlockStart = (l: string) => /^(#{1,6}\s|[-*]\s|\d+\.\s|>|```|\|)/.test(l) || l.trim() === "" || /^-{3,}\s*$/.test(l);
  while (i < lines.length) {
    const l = at(i);
    if (l.trim() === "") { i++; continue; }
    let m: RegExpExecArray | null;
    if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) {
      const level = (m[1] ?? "#").length, text = (m[2] ?? "").trim(), id = idPrefix + slug(text);
      headings.push({ level, text, id });
      html.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++; continue;
    }
    if (/^-{3,}\s*$/.test(l)) { html.push("<hr>"); i++; continue; }
    if (l.startsWith("```")) {
      const body: string[] = []; i++;
      while (i < lines.length && !at(i).startsWith("```")) body.push(at(i++));
      i++;
      html.push(`<pre><code>${esc(body.join("\n"))}</code></pre>`);
      continue;
    }
    if (l.startsWith(">")) {
      const body: string[] = [];
      while (i < lines.length && at(i).startsWith(">")) body.push(at(i++).replace(/^>\s?/, ""));
      html.push(`<blockquote>${markdown(body.join("\n"), idPrefix).html}</blockquote>`);
      continue;
    }
    if (l.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && at(i).startsWith("|")) {
        rows.push(at(i).trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|")));
        i++;
      }
      const sep = rows.length > 1 && (rows[1] ?? []).every((c) => /^:?-{2,}:?$/.test(c));
      const head = sep ? rows[0] : null;
      const body = sep ? rows.slice(2) : rows;
      html.push(`<div class="md-table"><table>${head ? `<thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>` : ""}<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if ((m = /^([-*]|\d+\.)\s+/.exec(l))) {
      const ordered = /\d/.test(m[1] ?? "");
      const items: string[] = [];
      while (i < lines.length && /^([-*]|\d+\.)\s+/.test(at(i))) {
        let item = at(i).replace(/^([-*]|\d+\.)\s+/, ""); i++;
        while (i < lines.length && /^\s{2,}\S/.test(at(i))) item += " " + at(i++).trim();
        items.push(`<li>${inline(item)}</li>`);
      }
      html.push(ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
      continue;
    }
    const para: string[] = [l]; i++;
    while (i < lines.length && !isBlockStart(at(i))) para.push(at(i++));
    html.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return { html: html.join("\n"), headings };
}
