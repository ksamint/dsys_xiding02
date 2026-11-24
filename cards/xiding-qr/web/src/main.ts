import { CUSTOM_PHOTO, NO_PHOTO, PHOTOS, otherPhoto, photoFor, photoReady, setCustomPhoto } from "./photos.js";
import { clearLogo, photoData, setLogo } from "./custom.js";
import { BORDER_MAX, LOOK, LOOK_RANGE, OBJ_NAME, SIZES, WAYS, borderOf, type Drawn, type Edit, type Look, type ObjId, type Slider, type Way, displayText, drawCard } from "./card.js";
import { attachEditor } from "./editor.js";
import { el, pairDot } from "./dom.js";
import { type Entry, loadDefaultLook, loadDraft, loadHistory, parseTags, remember, storeDefaultLook, storeDraft, storeHistory, withFields, withSeeds } from "./history.js";
import { capacity } from "./qr.js";
import { copyText, savePng, warmSave } from "./save.js";

// 西顶 · 二维码: type an address, the card draws itself; save it as a PNG or copy the address. History stays here.

const MAX_BYTES = capacity("M");

/** Adds https:// to a bare domain; anything with a scheme, or plain text, is kept as typed. */
function normalize(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return t;
  if (/^[^\s/]+\.[^\s/]{2,}(\/\S*)?$/.test(t)) return `https://${t}`;
  return t;
}

function today(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

function fileName(text: string): string {
  let host = "";
  try {
    host = new URL(text).hostname;
  } catch {
    host = "";
  }
  const slug = host.replace(/^www\./, "").replace(/[^a-z0-9.-]/gi, "") || "text";
  return `xiding-qr-${slug}.png`;
}

function app(root: HTMLElement): void {
  const seeded = withSeeds(loadHistory());
  let history = seeded.list;
  storeHistory(history);
  let look: Look = { ...LOOK };

  // ——— controls
  const url = el("input", {
    class: "f-input",
    type: "url",
    inputmode: "url",
    placeholder: "网址",
    "aria-label": "网址",
    autocomplete: "off",
    autocapitalize: "off",
    spellcheck: "false",
    enterkeyhint: "done",
  });
  const clear = el("button", { type: "button", class: "f-side", hidden: true }, "清除");
  const title = el("input", { class: "f-input", type: "text", placeholder: "名称", "aria-label": "名称", maxlength: 24, enterkeyhint: "done" });
  const msg = el("p", { class: "f-msg", role: "status", "aria-live": "polite" });
  const tagsIn = el("input", { class: "f-input", type: "text", placeholder: "标签，用逗号分开", "aria-label": "标签", maxlength: 80, enterkeyhint: "done" });
  const descIn = el("textarea", { class: "f-area", rows: 2, placeholder: "说明", "aria-label": "说明", maxlength: 300 });
  const idNote = el("p", { class: "id-note" });
  const form = el(
    "form",
    { class: "qr__form", novalidate: true },
    el("div", { class: "f-wrap" }, url, clear),
    el("div", { class: "f-wrap" }, title),
    el("div", { class: "f-wrap" }, tagsIn),
    el("div", { class: "f-wrap f-wrap--area" }, descIn),
    idNote,
  );

  // ——— adjustments: 版式, 配色, 点阵, then 字号, 位置, 缩放
  const tune = el("div", { class: "tune", role: "group", "aria-label": "调整" });

  type Key = "layout" | "way" | "dots" | "qr" | "edge" | "square";
  type Choice<K extends Key> = { key: K; name: string; options: [NonNullable<Look[K]>, string][] };
  const choices: Choice<Key>[] = [
    { key: "layout", name: "版式", options: [["scroll", "立轴"], ["band", "横卷"], ["sign", "门牌"], ["square", "方"]] },
    { key: "way", name: "配色", options: (Object.keys(WAYS) as Way[]).map((w) => [w, WAYS[w].name]) },
    { key: "dots", name: "点阵", options: [["round", "圆"], ["square", "方"]] },
    { key: "square", name: "构图", options: [["dot", "点"], ["blank", "空"], ["seal", "印"]] },
    { key: "qr", name: "二维码", options: [["invert", "反白"], ["tile", "白底"]] },
    { key: "edge", name: "白边", options: [["on", "有"], ["off", "无"]] },
  ];
  const current = (k: Key) => look[k] ?? ({ qr: "invert", edge: "on", square: "dot" } as Partial<Record<Key, string>>)[k];
  const choiceRows: Partial<Record<Key, HTMLElement>> = {};
  const segs: { key: Key; buttons: [NonNullable<Look[Key]>, HTMLButtonElement][] }[] = [];
  for (const ch of choices) {
    const buttons = ch.options.map(([v, label]) => {
      const b = el("button", { type: "button", class: "opt", "aria-pressed": "false" });
      if (ch.key === "way") {
        // A colourway is shown by its swatch: the field with the mark's ink inside it.
        const sw = el("span", { class: "swatch", "aria-hidden": "true" });
        sw.style.background = WAYS[v as Way].field;
        sw.style.setProperty("--dot", WAYS[v as Way].mark);
        b.append(sw);
      }
      b.append(label);
      b.addEventListener("click", () => {
        look = { ...look, [ch.key]: v } as Look;
        showLook();
        render();
      });
      return [v, b] as [NonNullable<Look[Key]>, HTMLButtonElement];
    });
    segs.push({ key: ch.key, buttons });
    const row = el("div", { class: "tune__row" }, el("span", { class: "tune__name" }, ch.name), el("div", { class: "opts" }, ...buttons.map(([, b]) => b)));
    choiceRows[ch.key] = row;
    tune.append(row);
  }

  // 照片 (方 · 空): none, one of the library, or 随机 for another. Unset, a card takes one by its address.
  const shownPhoto = () => photoFor(look.photo, normalize(url.value))?.id ?? NO_PHOTO;
  const setPhoto = (id: string) => {
    look = { ...look, photo: id };
    showLook();
    render();
  };
  const noPhoto = el("button", { type: "button", class: "opt", "aria-pressed": "false" }, "无");
  noPhoto.addEventListener("click", () => setPhoto(NO_PHOTO));
  const thumbs = PHOTOS.map((ph) => {
    const b = el("button", { type: "button", class: "thumb", "aria-pressed": "false", "aria-label": `照片：${ph.name}` }, el("img", { src: ph.src, alt: "", loading: "lazy", decoding: "async" }));
    b.addEventListener("click", () => setPhoto(ph.id));
    return [ph.id, b] as const;
  });
  const shuffle = el("button", { type: "button", class: "opt" }, "随机");
  shuffle.addEventListener("click", () => setPhoto(otherPhoto(shownPhoto() === NO_PHOTO ? undefined : shownPhoto())));
  // A picture of your own, or another mark or 西頂廣仁宮: for this visit only, nothing is saved or sent.
  const pick = (text: string, title: string, onFile: (f: File) => Promise<void>): HTMLElement => {
    const input = el("input", { type: "file", accept: "image/*,.svg", class: "sr-only" });
    const lab = el("label", { class: "opt opt--file", title }, text, input);
    input.addEventListener("change", () => {
      const f = input.files?.[0];
      input.value = "";
      if (f) void onFile(f).catch((e: unknown) => say(e instanceof Error ? e.message : "这张图片打不开。"));
    });
    return lab;
  };
  const customThumb = el("button", { type: "button", class: "thumb", "aria-pressed": "false", "aria-label": "照片：自选", hidden: true }, el("img", { alt: "" }));
  customThumb.addEventListener("click", () => setPhoto(CUSTOM_PHOTO));
  const upload = pick("上传", "用自己的照片，只在本次打开有效 · Your own photo, this visit only", async (f) => {
    const src = await photoData(f);
    setCustomPhoto(src);
    (customThumb.querySelector("img") as HTMLImageElement).src = src;
    customThumb.hidden = false;
    setPhoto(CUSTOM_PHOTO);
    say("已换上你的照片，只在本次打开有效。");
  });
  const photoRow = el("div", { class: "tune__row" }, el("span", { class: "tune__name" }, "照片"), el("div", { class: "opts opts--thumbs" }, noPhoto, ...thumbs.map(([, b]) => b), customThumb, upload, shuffle));
  tune.append(photoRow);
  const logoRow = el("div", { class: "tune__row" }, el("span", { class: "tune__name" }, "更换"), el("div", { class: "opts" },
    pick("换标志", "用另一个标志（PNG、JPG 或 SVG），只在本次打开有效 · Another mark, this visit only", async (f) => { await setLogo("mark", f); say("已换上你的标志，只在本次打开有效。"); }),
    pick("换西頂廣仁宮", "用另一个名称图（PNG、JPG 或 SVG），只在本次打开有效 · Another name, this visit only", async (f) => { await setLogo("word", f); say("已换上你的名称图，只在本次打开有效。"); }),
    (() => {
      const b = el("button", { type: "button", class: "opt" }, "还原");
      b.addEventListener("click", () => { clearLogo("mark"); clearLogo("word"); say("标志与名称已还原。"); });
      return b;
    })()));
  tune.append(logoRow);

  const ranges: Record<Slider, { input: HTMLInputElement; out: HTMLOutputElement }> = {} as never;
  const unit: Record<Slider, string> = { size: "", pos: "%", zoom: "%" };
  const names: Record<Slider, string> = { size: "字号", pos: "位置", zoom: "缩放" };
  (Object.keys(LOOK_RANGE) as Slider[]).forEach((k) => {
    const [min, max] = LOOK_RANGE[k];
    const input = el("input", { type: "range", min, max, step: 1, value: LOOK[k], "aria-label": names[k] });
    const out = el("output", { class: "tune__val" });
    ranges[k] = { input, out };
    input.addEventListener("input", () => {
      look = { ...look, [k]: Number(input.value) };
      showLook();
      render();
    });
    tune.append(el("label", { class: "tune__row tune__row--range" }, el("span", { class: "tune__name" }, names[k]), input, out));
  });
  // 边框: kept per layout; on the cards a white mat, on the nameplate the margins and gaps.
  const borderIn = el("input", { type: "range", min: 0, max: BORDER_MAX, step: 1, value: 0, "aria-label": "边框" });
  const borderOut = el("output", { class: "tune__val" });
  borderIn.addEventListener("input", () => {
    look = { ...look, border: { ...look.border, [look.layout]: Number(borderIn.value) } };
    showLook();
    render();
  });
  tune.append(el("label", { class: "tune__row tune__row--range" }, el("span", { class: "tune__name" }, "边框"), borderIn, borderOut));

  // 复位 returns to your own default when you have set one, else to the system's.
  let mine: Look | null = loadDefaultLook();
  const base = (): Look => ({ ...LOOK, ...mine });
  const keepDefault = el("button", { type: "button", class: "tune__reset" }, "存为默认");
  const reset = el("button", { type: "button", class: "tune__reset" }, "复位");
  reset.addEventListener("click", () => {
    look = base();
    showLook();
    render();
  });
  keepDefault.addEventListener("click", () => {
    mine = JSON.parse(JSON.stringify(look)) as Look;
    const ok = storeDefaultLook(mine);
    showLook();
    say(ok ? "已存为默认样式，新卡片与复位都从它开始。" : "存不了，浏览器不允许本地存储。");
  });
  tune.append(el("div", { class: "tune__end" }, keepDefault, reset));
  function showLook(): void {
    for (const sg of segs) for (const [v, b] of sg.buttons) b.setAttribute("aria-pressed", String(current(sg.key) === v));
    // 二维码 反白 / 白底 is for the nameplate; 构图 for the square.
    if (choiceRows.qr) choiceRows.qr.hidden = look.layout !== "sign";
    if (choiceRows.square) choiceRows.square.hidden = look.layout !== "square";
    photoRow.hidden = !(look.layout === "square" && look.square === "blank");
    const ph = shownPhoto();
    noPhoto.setAttribute("aria-pressed", String(ph === NO_PHOTO));
    for (const [id, b] of thumbs) b.setAttribute("aria-pressed", String(ph === id));
    customThumb.setAttribute("aria-pressed", String(ph === CUSTOM_PHOTO));
    (Object.keys(ranges) as Slider[]).forEach((k) => {
      ranges[k].input.value = String(look[k]);
      ranges[k].out.textContent = `${look[k]}${unit[k]}`;
    });
    borderIn.value = String(borderOf(look));
    borderOut.textContent = String(borderOf(look));
    reset.disabled = JSON.stringify(look) === JSON.stringify(base());
    keepDefault.disabled = JSON.stringify(look) === JSON.stringify(base());
  }

  const save = el("button", { type: "button", class: "cta", disabled: true }, el("span", {}, "保存图片"), pairDot("pair cta__pair"));
  const copy = el("button", { type: "button", class: "btn", disabled: true }, "复制链接");
  const acts = el("div", { class: "qr__acts" }, save, copy, msg);

  // ——— card
  const canvas = el("canvas", { class: "qr__canvas", width: SIZES.scroll.w, height: SIZES.scroll.h, "aria-hidden": "true" });
  const img = el("img", { class: "qr__img", alt: "", width: SIZES.scroll.w, height: SIZES.scroll.h });
  const stage = el("div", { class: "stage", tabindex: "0", role: "application", "aria-label": "移动与缩放：点选标志、名称、二维码或西頂廣仁宮，拖动移动，拖角或双指缩放，方向键微调" });
  const editBtn = el("button", { type: "button", class: "opt", "aria-pressed": "false" }, "移动与缩放");
  const selName = el("span", { class: "card-bar__name" });
  const undoOne = el("button", { type: "button", class: "card-bar__link", hidden: true }, "还原此项");
  const hint = el("span", { class: "card-bar__hint" }, "点选 · 拖动 · 拖角或双指缩放");
  const cardBar = el("div", { class: "card-bar" }, editBtn, el("span", { class: "card-bar__info" }, selName, hint), undoOne);
  const card = el("figure", { class: "qr__card" }, el("div", { class: "qr__frame" }, canvas, img, stage), cardBar);

  // ——— history
  const rows = el("ul", { class: "rows" });
  const wipe = el("button", { type: "button", class: "hist__clear" }, "清空");
  const search = el("input", { class: "f-input", type: "search", placeholder: "搜索编号、名称、标签、说明", "aria-label": "搜索历史", enterkeyhint: "search" });
  const tagBar = el("div", { class: "tagbar", role: "group", "aria-label": "按标签筛选" });
  const hist = el(
    "section",
    { class: "hist", "aria-label": "历史" },
    el("div", { class: "hist__head" }, el("h2", { class: "hist__title" }, "历史"), wipe),
    el("div", { class: "hist__tools" }, el("div", { class: "f-wrap f-wrap--sm" }, search), tagBar),
    rows,
  );
  let tagFilter = "";

  root.replaceChildren(
    el(
      "main",
      { class: "qr" },
      el("header", { class: "qr__head" }, el("h1", { class: "qr__title" }, "二维码")),
      el("div", { class: "qr__grid" }, form, tune, card, acts, hist),
    ),
  );

  // ——— state
  let text = "";
  let blob: Blob | null = null;
  let objectUrl = "";
  let frame = 0;
  let msgTimer = 0;

  const say = (s: string, stay = false) => {
    msg.textContent = s;
    window.clearTimeout(msgTimer);
    if (!stay && s) msgTimer = window.setTimeout(() => (msg.textContent = ""), 2400);
  };

  let drawn: Drawn = { boxes: {}, guides: { x: [], y: [] } };
  let blobTimer = 0;

  /** Draws the card on the canvas now; the PNG follows when things settle. */
  const draw = () => {
    text = normalize(url.value);
    const tooLong = new TextEncoder().encode(text).length > MAX_BYTES;
    clear.hidden = !url.value;
    save.disabled = copy.disabled = !text || tooLong;
    if (tooLong) say("内容太长。", true);
    else if (msg.textContent === "内容太长。") say("");
    // The drawing takes its layout's size; the picture and the frame follow.
    const size = SIZES[look.layout];
    if (canvas.width !== size.w || canvas.height !== size.h) {
      canvas.width = size.w;
      canvas.height = size.h;
      img.width = size.w;
      img.height = size.h;
      card.style.setProperty("--ratio", `${size.w} / ${size.h}`);
      card.classList.toggle("is-wide", size.w > size.h);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawn = drawCard(ctx, { text: tooLong ? "" : text, title: title.value, look });
    card.classList.toggle("is-empty", !text);
    editor.refresh();
  };
  const makeBlob = () =>
    new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => {
        if (b) {
          blob = b;
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = URL.createObjectURL(b);
          img.src = objectUrl;
          img.alt = text ? `二维码：${displayText(text)}` : "二维码卡片";
        }
        res(b);
      }, "image/png"),
    );
  const settle = (ms = 160) => {
    window.clearTimeout(blobTimer);
    blobTimer = window.setTimeout(() => void makeBlob(), ms);
  };

  // Everything on screen is kept as you work: the address, the name and every adjustment.
  let draftTimer = 0;
  const savedNote = el("span", { class: "card-bar__saved", "aria-live": "polite" });
  cardBar.append(savedNote);
  const autosave = () => {
    window.clearTimeout(draftTimer);
    draftTimer = window.setTimeout(flushDraft, 400);
  };
  // Leaving the page, or switching away from it, saves at once: nothing waits on the timer.
  const flushNow = () => {
    window.clearTimeout(draftTimer);
    flushDraft();
  };
  window.addEventListener("pagehide", flushNow);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushNow();
  });
  function flushDraft(): void {
    {
      const ok = storeDraft({ text: url.value, title: title.value, look, tags: tagsIn.value, desc: descIn.value });
      const t = normalize(url.value);
      if (t && history.some((e) => e.text === t)) {
        history = withFields(history, t, { look: { ...look }, title: title.value.trim(), tags: parseTags(tagsIn.value), desc: descIn.value.trim() });
        storeHistory(history);
        drawHistory();
      }
      if (ok) {
        savedNote.textContent = "已自动保存";
        savedNote.classList.remove("is-on");
        void savedNote.offsetWidth;
        savedNote.classList.add("is-on");
      }
    }
  }

  const render = () => {
    autosave();
    glyphs(title.value);
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      draw();
      settle(60);
      drawHistory();
    });
  };

  // ——— 移动与缩放
  const editor = attachEditor(
    stage,
    {
      look: () => look,
      drawn: () => drawn,
      setEdit(id: ObjId, e: Edit | null) {
        const layer = { ...(look.edits?.[look.layout] ?? {}) };
        if (e) layer[id] = e;
        else delete layer[id];
        look = { ...look, edits: { ...look.edits, [look.layout]: layer } };
        undoOne.hidden = !layer[id];
        showLook();
        draw();
        autosave();
      },
      settle: () => settle(),
      size: () => SIZES[look.layout],
    },
    (id) => {
      selName.textContent = id ? OBJ_NAME[id] : "";
      hint.hidden = Boolean(id);
      undoOne.hidden = !(id && look.edits?.[look.layout]?.[id]);
    },
  );
  const setEditing = (on: boolean) => {
    card.classList.toggle("is-editing", on);
    editBtn.setAttribute("aria-pressed", String(on));
    editBtn.textContent = on ? "完成" : "移动与缩放";
    if (!on) {
      editor.select(null);
      settle(0);
    } else stage.focus({ preventScroll: true });
  };
  editBtn.addEventListener("click", () => setEditing(!card.classList.contains("is-editing")));
  undoOne.addEventListener("click", () => {
    const id = editor.selected();
    if (!id) return;
    const layer = { ...(look.edits?.[look.layout] ?? {}) };
    delete layer[id];
    look = { ...look, edits: { ...look.edits, [look.layout]: layer } };
    undoOne.hidden = true;
    showLook();
    draw();
    settle();
    autosave();
  });

  const keep = () => {
    if (!text) return;
    history = remember(history, { text, title: title.value.trim(), at: Date.now(), look: { ...look }, tags: parseTags(tagsIn.value), desc: descIn.value.trim() });
    storeHistory(history);
    drawHistory();
  };

  const load = (e: Entry) => {
    url.value = e.text;
    title.value = e.title;
    tagsIn.value = e.tags.join("，");
    descIn.value = e.desc;
    look = { ...base(), ...e.look };
    showLook();
    render();
    if (window.matchMedia("(max-width: 899px)").matches) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function drawHistory(): void {
    const t = normalize(url.value);
    const mine = history.find((e) => e.text === t);
    idNote.textContent = mine ? `编号 ${mine.id}` : t ? "保存或复制后编号" : "";
    if (history.length === 0) {
      hist.hidden = true;
      return;
    }
    hist.hidden = false;

    // Tags, most used first.
    const counts = new Map<string, number>();
    for (const e of history) for (const tag of e.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    if (tagFilter && !counts.has(tagFilter)) tagFilter = "";
    const tags = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh"));
    tagBar.hidden = tags.length === 0;
    tagBar.replaceChildren(
      ...[["", history.length] as [string, number], ...tags].map(([tag, n]) => {
        const b = el("button", { type: "button", class: "opt opt--tag", "aria-pressed": String(tagFilter === tag) }, tag || "全部", el("span", { class: "opt__n" }, String(n)));
        b.addEventListener("click", () => {
          tagFilter = tag;
          drawHistory();
        });
        return b;
      }),
    );

    const q = search.value.trim().toLowerCase();
    const shown = history.filter(
      (e) =>
        (!tagFilter || e.tags.includes(tagFilter)) &&
        (!q || [e.id, e.title, e.text, e.desc, ...e.tags].some((f) => f.toLowerCase().includes(q))),
    );
    if (shown.length === 0) {
      rows.replaceChildren(el("li", { class: "rows__empty" }, "没有符合的记录。"));
      return;
    }
    rows.replaceChildren(
      ...shown.map((e, i) => {
        const open = el(
          "button",
          { type: "button", class: "row__main" },
          el("span", { class: "row__top" }, el("span", { class: "row__id" }, e.id), el("span", { class: "row__name" }, e.title || displayText(e.text))),
          e.tags.length ? el("span", { class: "row__tags" }, ...e.tags.map((tag) => el("span", { class: "tag" }, tag))) : null,
          e.desc ? el("span", { class: "row__desc" }, e.desc) : null,
          el("span", { class: "row__meta" }, el("span", { class: "row__url" }, displayText(e.text)), pairDot(), el("span", {}, today(new Date(e.at)))),
        );
        open.addEventListener("click", () => load(e));
        const del = el("button", { type: "button", class: "row__del", "aria-label": `删除 ${e.id}` }, "删除");
        del.addEventListener("click", () => {
          history = history.filter((x) => x !== e);
          storeHistory(history);
          drawHistory();
        });
        const li = el("li", { class: `row${e.text === t ? " is-on" : ""}` }, open, del);
        li.style.setProperty("--i", String(Math.min(i, 10)));
        return li;
      }),
    );
  }

  // ——— events
  redraw = render;
  // A photo arriving redraws the card; it changes nothing to save.
  window.addEventListener("xd-photo", () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      draw();
      settle(60);
    });
  });
  url.addEventListener("input", () => {
    showLook();
    render();
  });
  title.addEventListener("input", render);
  tagsIn.addEventListener("input", autosave);
  descIn.addEventListener("input", autosave);
  search.addEventListener("input", () => drawHistory());
  url.addEventListener("focus", warmSave, { once: true });
  // Enter in either field keeps the entry (a form with two fields and no submit button never submits).
  const onEnter = (e: KeyboardEvent) => {
    if (e.key !== "Enter" || e.isComposing) return;
    e.preventDefault();
    keep();
    (e.target as HTMLElement).blur();
  };
  url.addEventListener("keydown", onEnter);
  title.addEventListener("keydown", onEnter);
  form.addEventListener("submit", (e) => e.preventDefault());
  clear.addEventListener("click", () => {
    url.value = "";
    title.value = "";
    render();
    url.focus();
  });

  save.addEventListener("click", async () => {
    if (!text) return;
    keep();
    window.clearTimeout(blobTimer);
    // A photo still on its way is waited for, so the PNG never has an empty frame.
    if (look.layout === "square" && look.square === "blank") {
      await photoReady(photoFor(look.photo, text));
      draw();
    }
    const fresh = (await makeBlob()) ?? blob;
    if (!fresh) return;
    const r = await savePng(fresh, fileName(text));
    say(r === "saved" ? "已保存。" : r === "declined" ? "已取消。" : "保存不了，可长按图片保存。");
  });

  copy.addEventListener("click", async () => {
    if (!text) return;
    keep();
    say((await copyText(text)) ? "已复制。" : "复制不了，请手动复制。");
  });

  let armed = 0;
  wipe.addEventListener("click", () => {
    if (!armed) {
      wipe.textContent = "确认清空";
      wipe.classList.add("is-armed");
      armed = window.setTimeout(() => {
        armed = 0;
        wipe.textContent = "清空";
        wipe.classList.remove("is-armed");
      }, 3000);
      return;
    }
    window.clearTimeout(armed);
    armed = 0;
    wipe.textContent = "清空";
    wipe.classList.remove("is-armed");
    history = [];
    storeHistory(history);
    drawHistory();
  });

  // Start from ?url= when given, else where you left off, else the last one kept.
  const given = new URLSearchParams(location.search).get("url");
  const draft = loadDraft();
  look = base();
  if (given) url.value = given;
  else if (seeded.fresh) {
    // A link just added opens first.
    url.value = seeded.fresh.text;
    title.value = seeded.fresh.title;
    tagsIn.value = seeded.fresh.tags.join("，");
    descIn.value = seeded.fresh.desc;
    look = { ...base(), ...seeded.fresh.look };
  } else if (draft) {
    url.value = draft.text;
    title.value = draft.title;
    tagsIn.value = draft.tags ?? "";
    descIn.value = draft.desc ?? "";
    look = { ...base(), ...draft.look };
  } else if (history[0]) {
    url.value = history[0].text;
    title.value = history[0].title;
    tagsIn.value = history[0].tags.join("，");
    descIn.value = history[0].desc;
    look = { ...base(), ...history[0].look };
  }
  showLook();
  render();

  // Draw again once the brand fonts arrive, and as a name brings in new characters. They never hold a draw.
  window.addEventListener("xd-fonts", () => {
    fontsOn = true;
    glyphs(title.value);
  });
}

let fontsOn = false;
const asked = new Set<string>();
let redraw: () => void = () => undefined;

/** Loads the Songti and sans glyphs a card needs, then draws again if anything new arrived. */
function glyphs(name: string): void {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fontsOn || !fonts) return;
  const need = Array.from(new Set(Array.from(`西顶${name}`))).filter((ch) => !asked.has(ch));
  const first = !asked.has("__sans");
  if (need.length === 0 && !first) return;
  need.forEach((ch) => asked.add(ch));
  asked.add("__sans");
  Promise.all([fonts.load(`600 76px "Noto Serif SC"`, need.join("") || "西"), fonts.load(`500 28px "Instrument Sans"`, "XIDING 0123456789.")])
    .then(() => redraw())
    .catch(() => undefined);
}

function loadFonts(): void {
  const href = "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Noto+Serif+SC:wght@500;600;700&display=swap";
  const link = el("link", { rel: "stylesheet", href });
  link.addEventListener("load", () => {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    void fonts?.ready.then(() => window.dispatchEvent(new Event("xd-fonts")));
  });
  document.head.append(link);
}

const root = document.getElementById("app");
if (root) {
  app(root);
  loadFonts();
}
