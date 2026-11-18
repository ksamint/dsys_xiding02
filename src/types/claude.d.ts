/* The part of the Claude Artifact runtime the member page uses, as its contract 0.2.47 describes it.
   Outside a Claude viewer `window.claude` is absent, and inside one any `use()` may resolve null: every feature built on it is optional. */

interface XdViewer {
  readonly id: string | null;
  readonly name: string;
}

interface XdUser {
  id(): Promise<string | null>;
  me(): Promise<XdViewer>;
}

interface XdDocSnapshot {
  readonly exists: boolean;
  data(): Record<string, unknown> | undefined;
}

interface XdDocRef {
  get(): Promise<XdDocSnapshot>;
  set(data: Record<string, unknown>): Promise<void>;
}

interface XdDb {
  doc(path: string): XdDocRef;
}

interface XdSampleTool {
  name: string;
  description: string;
  inputSchema?: { type: "object"; properties?: Record<string, unknown>; required?: string[] };
  execute(input: Record<string, unknown>): unknown;
}

interface XdSampleOptions {
  onText?: (update: { text: string; delta: string }) => void;
  signal?: AbortSignal;
  tools?: XdSampleTool[];
  modelTier?: "default" | "complex" | "quick";
  cache?: boolean;
}

interface XdSample {
  (input: string, options?: XdSampleOptions): Promise<{ text: string; truncated: boolean }>;
  json<T = unknown>(input: string, options?: XdSampleOptions): Promise<T>;
  limits(): Promise<{ maxPromptBytes: number; tools?: { maxCount: number } }>;
}

interface XdDownloads {
  save(request: { filename: string; data: string | Blob | ArrayBuffer }): Promise<{ status: "saved" | "delivered" }>;
}

interface XdClaude {
  use(name: "downloads"): Promise<XdDownloads | null>;
  use(name: "user"): Promise<XdUser | null>;
  use(name: "db"): Promise<XdDb | null>;
  use(name: "sample"): Promise<XdSample | null>;
}

interface Window {
  claude?: XdClaude;
}
