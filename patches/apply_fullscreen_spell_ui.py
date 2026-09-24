"""Fullscreen SPELL UI + touch unblock (applied on branch).

Touch root cause (vc14): ensureHud() mounted #clashSpellWrap on document.body when
#battleFooterV2 was missing, and #clashSpellCoach / gift toast used pointer-events
that could capture taps. Fix: defer SPELL chrome until battle footer exists; never
leave interactive wrap/coach on <body>; gift/toast/decorative layers use
pointer-events:none (buttons auto); drawer dimmer dismisses on outside tap;
__touchUnblock scrubs orphans.
"""
print("Patches live in fatebound.html (fullscreenSpellUi + __touchUnblock) + Android MainActivity/themes.")
print("Re-run from git history if needed; do not stub fatebound.html.")
