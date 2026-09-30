# AGENTS.md

"On Guard!" (על המשמר!) is a static, bilingual web app (Hebrew RTL by default, plus English) that teaches kids to spot chess threats. It is live at https://wilfoa.github.io/on-guard/ and GitHub Pages serves the `main` branch as is.

## Layout

| File | Role |
|---|---|
| `index.html` | Markup, modals, CDN `<script>`/`<link>` tags. Text nodes carry `data-i18n="key"`. |
| `app.js` | All logic, in one global script (no modules): game state, `LEVELS`, `STRINGS` (he/en), computer moves (teaching moves + negamax), threat detection, save/load. |
| `styles.css` | All styles. Uses CSS logical properties so RTL and LTR both work. |
| `chess-game-standalone.html` | **Generated** by `build-standalone.js`, which inlines the CSS and JS. Never edit it by hand. |
| `tests/*.spec.js` | Playwright end-to-end tests. |
| `.github/workflows/tests.yml` | CI: runs Playwright on pushes to `main` and on PRs. |

Runtime libraries load from CDNs: jQuery 3.6, chess.js 0.10.3, chessboard.js 1.0.0 and the Rubik font. The project has no bundler and no runtime npm dependencies. The only npm packages are the dev dependencies `@playwright/test` and `http-server`.

## Commands

```bash
npm install
npm run serve     # http-server on :8080 (Playwright starts this itself)
npm test          # all 4 browser projects; use --project=chromium for a quick run
npm run build     # regenerate chess-game-standalone.html
```

## Rules

- After any change to `index.html`, `styles.css` or `app.js`, run `npm run build` and commit the regenerated standalone file in the same commit. No hook does this for you.
- **Every user-facing string exists in both `STRINGS.he` and `STRINGS.en`.** Markup refers to strings through `data-i18n` or `data-i18n-aria`. Code calls `t('key', {vars})`. Never hard-code UI text.
- Hebrew terms: a pawn is חייל, and the UI speaks to the player in the plural (you-all) form (לחצו, אכלתם).
- Wrap every `localStorage` access in `try/catch`, following the existing pattern. The keys in use are `lang`, `limitHints` and `chessGames`.
- Level behaviour lives in the `LEVELS` table. Change the data there before you add branches in code.
- Match the existing style: plain functions, jQuery for the DOM, short comments that explain *why*.
- Load third-party code only from CDNs, the way `index.html` already does. Don't add a build step.

## Testing

- Tests use `page.evaluate` to reach globals such as `game`, `board`, `difficulty` and `attackersOf` directly. If you rename a global, update the tests.
- `test-simple.spec.js` fails on errors from our own scripts or files. Failures from third-party CDNs are only logged.
- Add or adjust a test when you change behaviour. Run `npm test` before you push.

## Git

- Commit and push straight to `main`. There is no PR flow, and a push to `main` deploys the site.
- Keep the diff small, and keep generated or local files (`node_modules/`, `test-results/`, `playwright-report/`) out of commits.
