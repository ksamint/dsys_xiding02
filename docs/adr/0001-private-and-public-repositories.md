# ADR 0001: One private source repository, one generated public copy

- Status: accepted
- Date: 2026-11-18
- Applies to: `ksamint/dsys_xiding01` (private) and `ksamint/dsys_xiding02` (public)

## Context

This work is the 西顶 XIDING design system, the business-card editor built on it, and the introduction to Xiding
(deck, official site, overview). It is meant to be shared openly. Some of what sits beside it is not:

- the real people on the business cards (names, mobile numbers, staff emails), kept in `private/people.json`;
- the original brand-book PDF, which embeds subsets of commercial fonts (Times New Roman, Adobe Song Std) whose
  licences are not confirmed, and inventory files that record a designer's local paths;
- notes about private repositories and backups.

Publishing from the same repository would mean either keeping these out of git, which loses them, or trusting every
commit to leave them out, which fails silently once. Rewriting history to remove a leak afterwards does not unpublish
it.

## Decision

Two repositories, one direction.

| | `dsys_xiding01` | `dsys_xiding02` |
| --- | --- | --- |
| Visibility | private | public since 2026-11-18 (switched on by the owner after the first sync was reviewed) |
| Role | the one source: every change is made, reviewed and merged here | a generated copy for publishing: never edited by hand |
| History | its own | one commit per sync, `Sync from private <sha>`; the private history never travels |
| People on the cards | the real ones, from `private/people.json` | the fictional samples 张三, 李四, 王小五 |

What the copy holds is decided by `public.manifest.json` in this repository:

- **In:** `design-system/`, `showcase/`, `brand/` (logos, palette, brand-book page images and their extracted data),
  `cards/`, `src/` and `scripts/` (deck, site, overview), `docs/` (this ADR included), `tools/`, `tests/`, the build
  files, `LICENSE`, `NOTICE` and `CLAUDE.md`. Two files go out in a public version (`overrides`): `README.md` from
  `docs/public-readme.md` and `AGENTS.md` from `docs/public-agents.md`. It also gets a `PUBLIC_EXPORT.json`, naming
  the private commit it came from.
- **Out:** `private/`, this repository's `README.md`, the brand-book PDF, the brand inventory files with local paths
  (`brand/xiding-guangren-vi/manifest.json`, `fileye.json`), and `docs/adr/0002-member-app-moved-out.md`.
- **New top-level folders stay private** until they are added to `include`.

The export (`tools/public-export.ts`) refuses to write anything when:

- a real person's name, number or email is left in any spelling: as written, in other cases, with spaces or line
  breaks, JSON-escaped, behind HTML entities, %-escapes or `\u` escapes;
- any mainland mobile number or staff email (`…@xidingmiao.com`, subdomains included) is left, with any separators;
- a binary file (image, PDF, font, WebAssembly) is not listed in `binaries` with the SHA-256 of bytes a person has
  looked at, or its bytes changed since; binary bytes are also scanned for the real people's values;
- the output folder is not under `out/` or outside the repository.

## How a change reaches the public copy

1. Make the change here, on a branch from the latest `main`; run `npm run check` in a clean checkout; merge by pull
   request (the usual rules in `README.md`).
2. From the merged `main`, sync to a branch of the public repository:

   ```bash
   npm run public:sync -- https://github.com/ksamint/dsys_xiding02.git --branch sync/<private short sha> --base main
   ```

3. In a clean checkout of that branch of `dsys_xiding02`, run `npm ci` and `npm run check`. Open a pull request there
   with the commands, the results and `git rev-parse HEAD^{tree}`, and merge it.
4. Never push to `dsys_xiding02`'s `main` directly, and never commit there by hand: the next sync replaces its files
   with the export.

## Consequences

- Everything merged into `dsys_xiding02`, its whole history included, is public and cannot be taken back: a leak
  there is fixed by removing the data here and syncing, but the earlier commit stays readable. The export's checks and
  the pull request's check are the last gate before that.
- Commits there record the committer's email. Accounts that merge there should keep "Keep my email addresses private"
  on in GitHub's settings.

- Issues or pull requests opened on `dsys_xiding02` are read there and the change is made here; the next sync carries it
  back.
- A new binary file, or a changed one, needs a person to look at it and its SHA-256 updated in `public.manifest.json`;
  until then the export stops.
- The public copy builds and checks on its own (`npm run check` passes there): the cards use the samples, and nothing
  in it reads `private/`.
- The brand-book PDF joins the copy only once its font licences are confirmed; then remove it from `exclude` and list
  its SHA-256 under `binaries`.
- Licence (decided 2026-11-18): the code is Apache-2.0 (`LICENSE`); the brand, names, marks, design-system content,
  showcase and the introduction's words and artwork are all rights reserved (`NOTICE`, which lists the paths). Section 6
  of the Apache License grants no trademark rights. The same two files are in both repositories.
- Agents: each repository has an `AGENTS.md` (read by Codex, Cursor and most agents) and a `CLAUDE.md` that imports it
  (read by Claude Code). In `dsys_xiding01` it says how to work here; in `dsys_xiding02` it says the repository is
  generated and must not be edited by hand.
