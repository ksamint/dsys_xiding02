# Lang

The language switch on every page: EN, 繁, 简; the current one in ink, underlined.

Each button carries `aria-pressed` and its own `lang`. Setting `` to `en`, `zh-Hant` or `zh-Hans` swaps the font tokens, so one stylesheet serves all three. The choice is remembered under `xiding.locale`.

Added in v1.7.
