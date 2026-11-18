// Values the build places in front of the page script, and the parts of the claude.ai runtime the page uses.
// The page's .ts files are global scripts: they share one scope, and the build wraps them in one function.

/** The VI's geometry, extracted from logo-lockup-teal.svg by tools/card-geometry.ts. */
interface ViGeometry {
  sq: number;
  /** the dots' ink box inside the square: x, y, width, height */
  dots: [number, number, number, number];
  /** the word unit (西頂廣仁宮 over the English line): width, height, and the English baseline */
  uw: number;
  uh: number;
  base: number;
  zhW: number;
  zhH: number;
  zhX: number;
  dotR: number;
  /** each brush character's width and height, in VI units */
  chars: [number, number][];
}
declare const VI: ViGeometry;
/** The people the build put on the cards: the private list, or the fictional samples. */
declare const PEOPLE_INIT: { nameZh: string; nameEn: string; company: string; titleEn: string; titleZh: string; phone: string; email: string; web: string; address: string }[];
/** The Rust snap engine compiled to WebAssembly, base64. Empty when the build had no wasm. */
declare const SNAP_WASM_B64: string;

/** The design system's bundle (window.Xiding), used to draw the "before" card. */
interface XidingBundle {
  card(o: { side: "front" | "back"; front?: string; back?: string; person?: Record<string, string> }): string;
}

interface DbSnapshotMeta { fromCache: boolean; hasPendingWrites: boolean }
interface DbDoc { id: string; exists: boolean; data(): Record<string, unknown> | undefined; metadata: DbSnapshotMeta }
interface DbQuerySnap { docs: DbDoc[]; size: number; empty: boolean; metadata: DbSnapshotMeta }
interface DbError { code: string; message: string }
interface DbQuery {
  orderBy(field: string, dir?: "asc" | "desc"): DbQuery;
  limit(n: number): DbQuery;
  get(): Promise<DbQuerySnap>;
  onSnapshot(next: (s: DbQuerySnap) => void, error?: (e: DbError) => void): () => void;
}
interface DbDocRef { id: string; delete(): Promise<void>; set(d: Record<string, unknown>): Promise<void> }
interface DbCollection extends DbQuery { doc(id?: string): DbDocRef; add(d: Record<string, unknown>): Promise<DbDocRef> }
interface ClaudeDb { collection(path: string): DbCollection }
interface ClaudeProfile { id: string; name: string }
interface ClaudeUser {
  id(): Promise<string | null>;
  can(name: string): Promise<boolean | null>;
  profiles(ids: string[]): Promise<Record<string, ClaudeProfile>>;
}
interface ClaudeRuntime {
  use(name: "db"): Promise<ClaudeDb | null>;
  use(name: "user"): Promise<ClaudeUser | null>;
}
interface Window {
  claude?: ClaudeRuntime;
  Xiding?: XidingBundle;
}
