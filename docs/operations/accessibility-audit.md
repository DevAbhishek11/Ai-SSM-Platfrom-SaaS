# Accessibility Baseline

Target: WCAG 2.1 AA.

## Current Controls

- Semantic dashboard layout with landmarks, headings, nav, sections, and buttons.
- Keyboard visible focus styles.
- Responsive layout with no fixed viewport-only interactions.
- Text-based controls with accessible labels where icons are used alone.
- Color choices use high contrast neutral surfaces and teal accents.

## Required Before Production

- Add automated axe checks in Playwright.
- Validate color contrast for every status tone.
- Test screen reader flow for dashboard, calendar, AI generation, and approval workflows.
- Add skip links once multi-page routing lands.
- Confirm charts expose tabular fallback summaries.
- Honor reduced motion when animations are introduced.

## Manual Test Matrix

- Keyboard-only navigation.
- Screen readers: NVDA, JAWS, VoiceOver.
- Browser zoom at 200%.
- Mobile viewport and touch target review.
- High contrast mode.
