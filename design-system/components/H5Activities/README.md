# H5Activities

The members' calendar for the year, month by month: a date, the pillar, the event, its time and one action. Built from `xd-monthhead`, `xd-event`, `xd-tag`, `xd-item__go` and a short `xd-fieldblock--bleed`.

**You provide** the events: date, pillar, title, time and place.

- This is 礼遇's calendar: invitation-only events, viewings, sharing sessions and some courses. The month heading is set at 32px on a 2px `ink` rule and states 邀请制.
- Each row starts with the weekday and the day as a 40px serif figure in `teal-text`, so the list reads as a calendar at a glance.
- The pillar is shown as a round dot of its ink with the pillar's name and word.
- A full event shows 已满 on an outlined dot.
- The next month closes the list on a short teal field. Until its dates are set it says 日程待定。 The outlined button at the foot leads to booking the space.
- Events marked 示例 are placeholders.

## 自在 composition (v1.6)

- 日历 hangs at 88px against the right edge; 十一月 is the vertical heading of the month, with events cascading beside it, each day a 44px figure in `teal-text`.
- The next month closes the page on a teal field, its name hung vertically, the dots drifting out to the right.
