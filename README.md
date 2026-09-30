# 🛡️ על המשמר! · On Guard!

**שחמט לילדים: למדו לזהות איומים ולהגן על הכלים שלכם.**
Chess for kids: learn to spot threats and protect your pieces.

▶️ **Play:** https://wilfoa.github.io/on-guard/

The app works in Hebrew (the default, right-to-left) and English. Use the עב / EN switch to change the language.

## What it teaches

- **Who's attacking? / מי מאיים?** Tap the button, then tap any square to see which enemy pieces attack it. The more attackers there are, the thicker the red frame. The hint turns itself off after each use.
- **My pieces in danger / הכלים שלי בסכנה**: briefly marks every one of your pieces that is under attack.
- **Blunder warning**: on Beginner and Attacker, the computer asks before you play a move that leaves a piece hanging.
- **Check marker**: when your king is in check, it is marked in red.

### Levels

| Level | Computer behaviour |
|---|---|
| Beginner · מתחיל | Takes pieces you leave unprotected and sometimes leaves its own pieces hanging. Your pieces in danger are marked automatically. |
| Attacker · תוקף | Looks for ways to attack your pieces and blunders less often. |
| Medium · בינוני | Searches 2 plies ahead and doesn't give pieces away. |
| Hard · קשה | Searches 3 plies ahead and looks for forks. |

An optional **Limit hints by level** switch sets how many hints you get per game: unlimited on Beginner and Attacker, 3 on Medium, none on Hard.

You can also undo moves, save up to 20 games under a name, load a saved game from a list, and see which pieces each side has captured. Saves and settings stay in the browser (`localStorage`).

## Running locally

Open `index.html` in a browser, or open `chess-game-standalone.html`, a single-file build you can share. Both need an internet connection, because jQuery, chess.js, chessboard.js and the font load from CDNs.

## Development

No framework and no bundler: `index.html` + `styles.css` + `app.js`.

```bash
npm install
npm run serve        # http://127.0.0.1:8080
npm test             # Playwright: chromium, firefox, webkit, and installed Chrome
npm run build        # regenerate chess-game-standalone.html
```

`make build | test | test-ui | serve | clean` wraps the same commands.

After you change `index.html`, `styles.css` or `app.js`, run `npm run build` and commit the regenerated `chess-game-standalone.html` together with your change.

CI runs the Playwright suite on every push to `main` and on every pull request. GitHub Pages serves `main` directly.

## License

GPL-3.0. See [LICENSE](LICENSE).
