# H5Reserve

Booking the space in four choices: a scene, a day, a time and the number of people. Built from `xd-picks`, `xd-days`, `xd-slots`, `xd-rows` and `xd-cta`.

**You provide** the scenes on offer, the open days and times, and the rows the booking needs.

- Scenes come from `Xiding.SCENES`, each with a round dot of its pillar's ink: 大美 for 古琴, 艺术鉴赏 and 策展; 大智 for 咨询 and 培训; 大礼 for 生日, 下午茶 and 私宴; 担当 for 心理辅导 and 教练.
- Each step is a section head on a 2px `ink` rule, with what is chosen so far on the right.
- A chosen scene or time is filled with `ink`. A chosen day is a 40px temple-teal dot with the figure in black (5.8:1). A full time slot is `muted` and struck through.
- Everything tappable is 44px tall or more (`h5-tap`).
- Bookings for 心理辅导 are confidential: say so on the screen, and keep those sessions apart from social events.
- The button states the act: 提交预约. After it, show the scene, day and time back to the person in one sentence.

## 自在 composition (v1.6)

- 预约 hangs at 88px against the right edge with a two-line lede. The form itself stays level and plain: scenes, day, time and the facts, each under a ruled section head.
