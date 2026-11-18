import { zipSync } from "fflate";

/** Hands a file the build made to the reader. Inside a Claude viewer the viewer is asked first and may say no;
 *  anywhere else the browser downloads it. */
export type Offered = "saved" | "declined" | "failed";

export async function offerFile(path: string, filename: string): Promise<Offered> {
  try {
    const claude = window.claude;
    if (claude && typeof claude.use === "function") {
      const downloads = await claude.use("downloads");
      if (!downloads) return "failed";
      const response = await fetch(path);
      if (!response.ok) return "failed";
      await downloads.save({ filename, data: await response.blob() });
      return "saved";
    }
    // Download from an in-memory copy: a browser may open an image or a PDF in place rather than save it.
    let href = path;
    let blobUrl = "";
    let response: Response | null = null;
    try {
      response = await fetch(path);
    } catch {
      /* a page opened from disk cannot fetch: link to the file itself */
    }
    // The file is not there (a preview published without its exports, the showcase's frame): say so, rather than
    // handing over the error page under the file's name.
    if (response && !response.ok) return "failed";
    if (response) {
      blobUrl = URL.createObjectURL(await response.blob());
      href = blobUrl;
    }
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    return "saved";
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
    return code === "declined" ? "declined" : "failed";
  }
}

/** Several files the build made, zipped here in the page and handed over as one. */
export async function offerZip(files: readonly { path: string; name: string }[], filename: string): Promise<Offered> {
  let zip: Blob;
  try {
    const entries: Record<string, Uint8Array> = {};
    for (const f of files) {
      const response = await fetch(f.path);
      if (!response.ok) return "failed";
      entries[f.name] = new Uint8Array(await response.arrayBuffer());
    }
    // Stored, not recompressed: PDF and PNG are compressed already.
    zip = new Blob([zipSync(entries, { level: 0 }) as Uint8Array<ArrayBuffer>], { type: "application/zip" });
  } catch {
    return "failed";
  }
  try {
    const claude = window.claude;
    if (claude && typeof claude.use === "function") {
      const downloads = await claude.use("downloads");
      if (!downloads) return "failed";
      await downloads.save({ filename, data: zip });
      return "saved";
    }
    const url = URL.createObjectURL(zip);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return "saved";
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
    return code === "declined" ? "declined" : "failed";
  }
}
