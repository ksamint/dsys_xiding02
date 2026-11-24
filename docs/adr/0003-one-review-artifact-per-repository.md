# ADR 0003: Private source, public non-sensitive copy, and one review artifact for each

- Status: accepted
- Date: 2026-11-24
- Applies to: `ksamint/dsys_xiding01` (private) and `ksamint/dsys_xiding02` (public)
- Builds on: [ADR 0001](0001-private-and-public-repositories.md)

## Context

ADR 0001 split the work into a private source and a generated public copy. Review has two gaps left:

- The design system, its assets and the three pages were looked at in pieces: the showcase, the simulator, loose SVG
  files, the card editor. A reviewer could not see everything one repository holds in one place.
- Nothing said that the copy must be reviewed as the copy: what a reader of the public repository sees is not what the
  private one shows.

## Decision

1. **`dsys_xiding01` is private and is the only place a change is made.** `dsys_xiding02` takes from it only what
   `public.manifest.json` lists, after the export's scans pass (ADR 0001). Anything sensitive (`private/`, the real
   people, the brand-book PDF, inventory files with local paths, ADR 0002) never reaches it. The default for any new
   file is private.
2. **Each repository has one review artifact that holds all its assets.** It is the showcase, built by
   `npm run showcase:artifact`: the tokens, every component with its preview, every asset in
   `design-system/assets/` and its index, the brand book, the three pages and the "来源与核对" provenance section
   (commit, tree, input hash).
   - `dsys_xiding01`'s artifact is built from the private tree and carries the sample people only, never `private/`.
   - `dsys_xiding02`'s artifact is built, by the same command, from a clean checkout of the synced public branch. It
     shows exactly what the public repository holds, nothing more. It is a separate artifact with its own link.
   - Each page names its repository and commit in its `xd-source` meta, so a reviewer can tell which one they read and
     `npm run showcase:verify -- <file>` can say whether it is current.
3. **Review both before a sync merges.** After a change merges in `dsys_xiding01`: republish its artifact; sync to a
   branch of `dsys_xiding02`; build and publish that branch's artifact; compare the two. Every difference must be
   something the manifest excludes. Then merge the pull request in `dsys_xiding02`.
4. **One artifact each, not several.** The simulator and any other page that restates the system are not new homes for
   it; the showcase links or embeds them. The showcase stays the one view of the IP and the design system.

## Consequences

- A leak shows up in a page a person reads before it is public, in addition to the export's scans.
- A new asset type is added to the showcase in the same change that adds it to `design-system/`, or the check fails.
- The two artifacts are the same code on two trees; a difference that is not an exclusion is a bug in the manifest or
  the export.
- Owner action: publish the `dsys_xiding02` artifact once the next sync merges, and record its link here and in
  `AGENTS.md` of that repository (generated from `docs/public-agents.md`).
