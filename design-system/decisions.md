# 尚未统一 · Open decisions

These differences between the pages and this system were left as they are, for the owner to decide.

- **Member Home** redefines eight components locally — `xd-item`, `xd-list`, `xd-cta`, `xd-memcard`, `xd-rows`, `xd-monthhead`, `xd-event`, `xd-tag` — as bordered cards on `surface` and a teal membership card, where this system has ruled rows and a black card.

- **Xiding App** uses its own `ap-*` kit: 18–24px radii, pill buttons, blur bars and chips, against this system's 3–4px corners.

- **Dot**: the shared page kit's `xd-dot` (`src/shared/base.css`) has no round corner, so the member page's pillar tags show square dots. This system keeps the dot round. The member page is developed in a separate repository since 2026-11-18; the fix belongs there.

- **Brand teal**: the source VI's teal is `#559895` (`vi-teal`); this system's `brand-teal` is `#628F8A`. One of them should become the brand's teal.

- **VI palette**: red, sand, mauve grey, ivory and charcoal are tokens now but no component uses them; the system still has three inks.

- **QR**: pages draw `xd-qr` per link at build time; it is not a component here.

Recorded by the v1.7 and v1.8 migrations; each stays open until the owner decides.
