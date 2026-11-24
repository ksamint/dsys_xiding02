// Saving the PNG. In a claude.ai artifact the page asks the host's `downloads` capability (the viewer confirms);
// anywhere else it is an ordinary download link. In WeChat, long-press the card image instead.

interface Downloads {
  save(req: { filename: string; data: Blob }): Promise<{ status: string }>;
}
interface ClaudeHost {
  use(name: string): Promise<unknown>;
}

let host: Promise<Downloads | null> | null = null;

function hostDownloads(): Promise<Downloads | null> {
  const claude = (window as unknown as { claude?: ClaudeHost }).claude;
  if (!claude || typeof claude.use !== "function") return Promise.resolve(null);
  host ??= claude
    .use("downloads")
    .then((d) => (d ? (d as Downloads) : null))
    .catch(() => null);
  return host;
}

/** Ask early, so the click does not wait. */
export function warmSave(): void {
  void hostDownloads();
}

export type SaveResult = "saved" | "declined" | "failed";

export async function savePng(blob: Blob, filename: string): Promise<SaveResult> {
  const d = await hostDownloads();
  if (d) {
    try {
      await d.save({ filename, data: blob });
      return "saved";
    } catch (e) {
      return (e as { code?: string })?.code === "declined" ? "declined" : "failed";
    }
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return "saved";
  } catch {
    return "failed";
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = document.createElement("textarea");
    t.value = text;
    t.setAttribute("readonly", "");
    t.className = "sr-only";
    document.body.append(t);
    t.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    t.remove();
    return ok;
  }
}
