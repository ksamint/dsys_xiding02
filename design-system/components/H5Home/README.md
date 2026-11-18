# H5Home

The first screen of the mobile site: the value line on a full-bleed temple-teal field, the three pillars as one three-ink band, and this week's list. Built from `xd-h5--teal`, `xd-fieldblock--bleed`, `xd-band`, `xd-h5__section`, `xd-list`, `xd-item` and `xd-tabbar`.

**You provide** this week's items: a title, where and when, the pillar it belongs to, and one action (报名, 预约).

- **The page opens on the field.** `xd-h5--teal` sets the bar on brand-teal, so the bar and the field read as one block. The field carries the place (西顶庙) at 24px, the value line at 40px in `brand-white`, and the mark drawn large and cropped by the field's right edge. The mark assembles once, dot by dot (`Xiding.assemble`).
- **Navigation follows the architecture.** Four tabs on a black bar: 首页, 学院 (content: courses and the programme), 时光 (the calendar: activities, exhibitions, space) and 会员. The current tab is marked with a teal dot and white type.
- The band is 大美, 大智 and 大礼 in their inks, edge to edge, each with its word above its name at 24px: 眼光, 章法, 分寸. Tapping one filters everything by that pillar.
- The section head sits on a 2px `ink` rule with the dates on the right.
- A list item is a ruled row: its number in `teal-text`, the pillar as a round dot of its ink beside the pillar's name, the title, then place and time. The action is a 56px dot with a one-word verb. One item per list may take the teal dot (`xd-item__go--mei`): the one the screen is about.
- Items marked 示例 are placeholders: replace them with real sessions.

## 自在 composition (v1.6)

- The page opens on the poem: a temple-teal field on the left two thirds, the mark in it with its dots drifting down and right onto the paper, and the value line hung in three vertical columns at the right edge. XIDING · HAIDIAN · BEIJING runs vertically below it.
- The three pillars stand as stones (`xd-stones`): 大美 the largest, in teal; 大智 in black; 大礼 smallest, white with an `ink` edge; each word hung beside it.
- 本周 is a vertical heading; the week cascades beside it (`xd-loose`): the day as a 44px figure in `teal-text`, the pillar dot and name, the title, and the action as a word on the pair dot.
- The tab bar floats inside the frame.
