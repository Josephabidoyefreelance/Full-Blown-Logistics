# JAAD Call Centre — Forced Recent Calls Scroll Fix

Replace only `call-panel.tsx`. This revision fixes the scroll layout structurally rather than relying on a Tailwind calculated-height class: the Recent calls card has a bounded viewport-aware height, its header stays fixed, and the rows occupy a `min-height: 0; flex: 1` area with `overflow-y: scroll`. The dial pad remains fixed beside it.

No other Support sections or call-provider settings are changed. Live audio still requires a configured VoIP provider.
