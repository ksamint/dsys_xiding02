// Part 2 → the public repository. Builds the public copy (tools/public-export.ts), then commits it on top of the
// public repository's own history: one commit per sync, naming the private commit it came from. The private
// repository's history never travels; the public one only ever sees exported trees.
// See docs/adr/0001-private-and-public-repositories.md.
// Usage: node --experimental-strip-types public-sync.ts <public-remote> [--branch main] [--base main] [--dry-run]
//   <public-remote>: a git URL or path you can push to, e.g. https://github.com/ksamint/dsys_xiding02.git
//   --branch: the branch the sync commit goes to. Use a sync branch (sync/<private sha>) and merge it by pull request.
//   --base: when --branch does not exist yet, start it from this branch, so the pull request has a common history.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { exportPublic } from "./public-export.ts";

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => { const i = args.indexOf(name); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const dry = args.includes("--dry-run");
if (dry) args.splice(args.indexOf("--dry-run"), 1);
const branch = flag("--branch") ?? "main";
const base = flag("--base");
const remote = args[0];
if (!remote) throw new Error("usage: public-sync.ts <public-remote> [--branch main] [--base main] [--dry-run]");

const root = process.cwd(), tree = resolve(root, "out/public"), work = resolve(root, "out/public-repo");
const git = (cwd: string, ...a: string[]): string => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

// 1. the public copy, checked for personal details
const r = exportPublic(root, tree);

// 2. the public repository, as it stands on the remote (or a new one if the branch does not exist yet)
if (existsSync(work)) rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
git(work, "init", "-q", "-b", branch);
git(work, "remote", "add", "public", remote);
let hasBranch = false;
try { git(work, "fetch", "-q", "--depth", "1", "public", branch); hasBranch = true; } catch { hasBranch = false; }
if (hasBranch) git(work, "checkout", "-q", "-B", branch, "FETCH_HEAD");
else if (base) {
  git(work, "fetch", "-q", "--depth", "1", "public", base);
  git(work, "checkout", "-q", "-B", branch, "FETCH_HEAD");
}

// 3. its files become exactly the public copy
for (const f of readdirSync(work)) if (f !== ".git") rmSync(join(work, f), { recursive: true, force: true });
cpSync(tree, work, { recursive: true });
git(work, "add", "-A");
const changed = git(work, "status", "--porcelain") !== "";
if (!changed) { console.log(`public repository already matches ${r.commit.slice(0, 7)}; nothing to sync`); process.exit(0); }
const name = process.env.PUBLIC_SYNC_NAME ?? "Xiding public sync", email = process.env.PUBLIC_SYNC_EMAIL ?? "public-sync@users.noreply.github.com";
git(work, "-c", `user.name=${name}`, "-c", `user.email=${email}`, "commit", "-q", "-m",
  `Sync from private ${r.commit.slice(0, 7)}\n\n${r.files} files; personal details replaced with samples in: ${r.redacted.join(", ") || "none"}.`);
const head = git(work, "rev-parse", "--short", "HEAD");
if (dry) { console.log(`dry run: commit ${head} ready in ${work}, not pushed`); process.exit(0); }
git(work, "push", "-q", "public", `HEAD:refs/heads/${branch}`);
console.log(`synced: ${remote} ${branch} ← ${head} (from private ${r.commit.slice(0, 7)})`);
