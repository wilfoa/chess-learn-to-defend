const { test, expect } = require('@playwright/test');

const pieces = page => page.locator('#board img[src*="chesspieces"]');

async function newGame(page, color = 'white') {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.click('#resetBtn');
  await page.click(color === 'white' ? '#playWhite' : '#playBlack');
  await expect(pieces(page)).toHaveCount(32);
}

async function drag(page, from, to) {
  const a = await page.locator(`.square-${from}`).boundingBox();
  const b = await page.locator(`.square-${to}`).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.up();
}

test.describe('Basic loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows Hebrew title, heading and subtitle', async ({ page }) => {
    await expect(page).toHaveTitle('על המשמר! שחמט לילדים');
    await expect(page.locator('h1')).toContainText('על המשמר!');
    await expect(page.locator('.subtitle')).toContainText('למדו לזהות איומים ולהגן על הכלים שלכם');
  });

  test('shows control sections and buttons', async ({ page }) => {
    await expect(page.locator('.section-label')).toHaveText(['רמה', 'נאכלו']);
    await expect(page.locator('.info-panel summary')).toHaveText('איך משחקים?');
    await expect(page.locator('#resetBtn')).toContainText('משחק חדש');
    await expect(page.locator('#undoBtn')).toContainText('חזרה');
    await expect(page.locator('#showThreats')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#currentTurnText')).toContainText('התור שלכם');
    await expect(page.locator('input[name="difficulty"]')).toHaveCount(4);
  });

  test('hint explanation is hidden until "?" is clicked', async ({ page }) => {
    await expect(page.locator('#hintInfo')).toBeHidden();
    await page.click('[aria-controls="hintInfo"]');
    await expect(page.locator('#hintInfo')).toContainText('ואז על ריבוע');
    await page.click('[aria-controls="hintInfo"]');
    await expect(page.locator('#hintInfo')).toBeHidden();
  });

  test('new game sets up 32 pieces, and playing black flips the board', async ({ page }) => {
    await newGame(page, 'black');
    const whitePawn = await page.locator('.square-e2').boundingBox();
    const blackPawn = await page.locator('.square-e7').boundingBox();
    expect(whitePawn.y).toBeLessThan(blackPawn.y); // white is at the top
  });
});

test('language switch translates the page, flips direction, and is remembered', async ({ page }) => {
  await newGame(page);
  await page.click('.lang-btn[data-lang="en"]');
  await expect(page).toHaveTitle('On Guard! Chess for Kids');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('#resetBtn')).toContainText('New game');
  await expect(page.locator('#currentTurnText')).toContainText('Your turn');
  await expect(page.locator('#levelCaption')).toContainText('unprotected');
  const warning = await page.evaluate(() => {
    game.load('4k3/8/8/8/2q5/8/3P4/4K3 w - - 0 1');
    board.position(game.fen(), false);
    tryMove('d2', 'd3');
    return $('#warnText').text();
  });
  expect(warning).toContain('your pawn (d3)');
  expect(await page.evaluate(() => /[\u0590-\u05FF]/.test(document.body.innerText.replace(/עב/, '')))).toBe(false);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.click('.lang-btn[data-lang="he"]');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#resetBtn')).toContainText('משחק חדש');
});

test.describe('Game logic', () => {
  test('a legal move is played and the computer replies', async ({ page }) => {
    await newGame(page);
    await drag(page, 'e2', 'e4');
    await expect(page.locator('.square-e4 img[data-piece="wP"]')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => game.history().length)).toBe(2);
    await expect(page.locator('#currentTurnText')).toContainText('התור שלכם');
  });

  test('an illegal move snaps back', async ({ page }) => {
    await newGame(page);
    await drag(page, 'e2', 'e5');
    await expect(page.locator('.square-e2 img[data-piece="wP"]')).toHaveCount(1);
    await expect(page.locator('.square-e5 img')).toHaveCount(0);
    expect(await page.evaluate(() => game.history().length)).toBe(0);
  });

  test('undo takes back the move and the computer reply', async ({ page }) => {
    await newGame(page);
    await drag(page, 'e2', 'e4');
    await expect.poll(() => page.evaluate(() => game.history().length)).toBe(2);
    await page.click('#undoBtn');
    await expect(page.locator('.square-e2 img[data-piece="wP"]')).toHaveCount(1);
    await expect(page.locator('#currentTurnText')).toContainText('התור שלכם');
  });

  test('save with a name, load by tapping it: keeps captured pieces, difficulty, and undo', async ({ page }) => {
    await newGame(page);
    await page.evaluate(() => {
      localStorage.removeItem('chessGames');
      ['e4', 'd5', 'exd5', 'Qxd5'].forEach(m => game.move(m)); // each side has lost a pawn
      difficulty = 'attacker';
    });
    await page.click('#saveBtn');
    await expect(page.locator('#saveName')).toHaveValue('משחק של 4 מהלכים');
    await page.fill('#saveName', 'המשחק של אדם');
    await page.click('#saveForm button[type="submit"]');
    await expect(page.locator('#saveModal')).toBeHidden();
    await expect(page.locator('#gameStatus')).toContainText('המשחק של אדם');

    await page.evaluate(() => { startNewGame('white'); difficulty = 'hard'; });
    await page.click('#loadBtn');
    await page.click('.saved-item:has-text("המשחק של אדם")');
    await expect(page.locator('#loadModal')).toBeHidden();
    await expect(page.locator('#youCaptured')).toContainText('♟');
    await expect(page.locator('#computerCaptured')).toContainText('♙');
    await expect(page.locator('input[name="difficulty"][value="attacker"]')).toBeChecked();
    expect(await page.evaluate(() => difficulty)).toBe('attacker');
    await page.click('#undoBtn'); // back to before exd5
    await expect(page.locator('#youCaptured')).toBeEmpty();
    await expect(page.locator('.square-e4 img[data-piece="wP"]')).toHaveCount(1);
  });

  test('a saved game can be deleted from the load list', async ({ page }) => {
    await newGame(page);
    await page.evaluate(() => {
      localStorage.setItem('chessGames', JSON.stringify([{ id: 1, name: 'ישן', timestamp: 'x', fen: game.fen(), playerColor: 'white', difficulty: 'easy' }]));
    });
    await page.click('#loadBtn');
    await expect(page.locator('.saved-meta')).toContainText('מתחיל'); // old 'easy' saves show as Beginner
    await page.click('.saved-delete');
    await expect(page.locator('.saved-item')).toHaveCount(0);
    await expect(page.locator('#noSaves')).toBeVisible();
  });

  test('game over opens a dialog; messages never push the layout', async ({ page }) => {
    await newGame(page);
    const before = await page.locator('.controls').boundingBox();
    await page.evaluate(() => { game.load('4k3/8/8/8/8/8/2n5/K6R w - - 0 1'); updateStatus(); }); // check
    await expect(page.locator('#gameStatus')).toBeVisible();
    expect(await page.locator('.controls').boundingBox()).toEqual(before);
    await page.evaluate(() => { game.load('k7/8/1K6/8/8/8/8/7Q w - - 0 1'); updateStatus(); });
    await page.evaluate(() => { game.move('Qh8'); updateStatus(); }); // back-rank mate by the player (white)
    await expect(page.locator('#endModal')).toBeVisible();
    await expect(page.locator('#endText')).toContainText('ניצחתם');
    await page.click('#endNewGame');
    await expect(page.locator('#colorModal')).toBeVisible();
  });

  test('shows a check warning', async ({ page }) => {
    await newGame(page);
    await page.evaluate(() => {
      game.load('4k3/8/8/8/8/8/2n5/K6R w - - 0 1');
      updateStatus();
    });
    await expect(page.locator('#gameStatus')).toContainText('שח!');
  });

  test('50-move rule does not end the game, bare kings do', async ({ page }) => {
    await newGame(page);
    const fiftyMoves = await page.evaluate(() => {
      game.load('4k3/8/8/8/8/8/8/R3K3 w - - 100 80');
      updateStatus();
      return isGameOver();
    });
    expect(fiftyMoves).toBe(false);
    await expect(page.locator('#gameStatus')).not.toContainText('תיקו');
    await page.evaluate(() => { game.load('4k3/8/8/8/8/8/8/4K3 w - - 0 1'); updateStatus(); });
    await expect(page.locator('#gameStatus')).toContainText('לא נשארו מספיק כלים');
  });
});

test.describe('Threat detector', () => {
  test('tapping a square shows its attackers, then the toggle turns itself off', async ({ page }) => {
    await newGame(page);
    await page.click('#showThreats');
    await page.click('.square-f6'); // black: g8 knight, e7 and g7 pawns
    await expect(page.locator('.square-attacker')).toHaveCount(3);
    await expect(page.locator('#showThreats')).toHaveAttribute('aria-pressed', 'false');
  });

  test('turning the toggle off clears the highlights', async ({ page }) => {
    await newGame(page);
    await page.click('#showThreats');
    await page.click('.square-f6');
    await page.click('#showThreats'); // arm again
    await page.click('#showThreats'); // and disarm: clears the board
    await expect(page.locator('.square-highlight')).toHaveCount(0);
  });
});

test('should move a piece by tapping source then destination', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.click('#resetBtn');
  await page.click('#playWhite');
  await page.waitForTimeout(1500);
  await page.click('.square-e2');
  await page.click('.square-e4');
  await expect(page.locator('.square-e4 img[data-piece="wP"]')).toHaveCount(1);
  await expect(page.locator('.square-e2 img')).toHaveCount(0);
});

test('medium and hard do not trade the queen for a defended pawn', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const result = await page.evaluate(() => {
    const out = [];
    // Computer's queen can grab the bait pawn, but a pawn recaptures. Mirrored for the computer playing white.
    const cases = [['white', '4k3/8/8/3q4/3P4/2P5/8/4K3 b - - 0 1', 'd4'],
                   ['black', '4k3/8/2p5/3p4/3Q4/8/8/4K3 w - - 0 1', 'd5']];
    for (const level of ['medium', 'hard']) {
      for (const [color, fen, bait] of cases) {
        playerColor = color; difficulty = level; game.load(fen);
        makeComputerMove();
        out.push(game.history({ verbose: true }).pop().to !== bait);
      }
    }
    playerColor = 'white'; difficulty = 'hard'; game.reset();
    const t = performance.now(); game.move('e4'); makeComputerMove();
    out.push(performance.now() - t < 3000);
    return out;
  });
  expect(result).toEqual([true, true, true, true, true]);
});

test.describe('Teaching levels', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('#resetBtn');
    await page.click('#playWhite');
    await page.waitForTimeout(500);
  });

  test('attackersOf respects blocking pieces', async ({ page }) => {
    const r = await page.evaluate(() => {
      const before = attackersOf('f3', 'w').sort();
      game.move('e4');
      return [before, attackersOf('f3', 'w').sort()];
    });
    expect(r).toEqual([['e2', 'g1', 'g2'], ['d1', 'g1', 'g2']]);
  });

  test('beginner and attacker take a piece left undefended', async ({ page }) => {
    const r = await page.evaluate(() => ['beginner', 'attacker'].map(level => {
      difficulty = level;
      game.load('4k3/8/3q4/4N3/8/8/8/4K3 b - - 0 1');
      makeComputerMove();
      return game.history({ verbose: true }).pop().to;
    }));
    expect(r).toEqual(['e5', 'e5']);
  });

  test('warns before a move that hangs a piece and can take it back', async ({ page }) => {
    await page.evaluate(() => {
      difficulty = 'beginner';
      game.load('4k3/8/8/8/8/1q6/8/4K1N1 w - - 0 1');
      board.position(game.fen(), false);
      tryMove('g1', 'f3');
    });
    await expect(page.locator('#warnModal')).toBeVisible();
    await page.click('#warnUndo');
    await expect(page.locator('#warnModal')).toBeHidden();
    expect(await page.evaluate(() => game.get('g1') && game.turn())).toBe('w');
  });

  test('king in check is marked and tapping it shows the attacker', async ({ page }) => {
    await page.evaluate(() => {
      difficulty = 'attacker';
      game.load('4k3/8/8/8/8/8/4q3/K7 b - - 0 1');
      board.position(game.fen(), false);
      game.move('Qe1'); // black queen checks along the first rank
      board.position(game.fen(), false);
      clearSquareThreats();
      showAutoHints();
    });
    await expect(page.locator('.check-square')).toHaveCount(1);
    await page.click('#showThreats');
    await page.click('.square-a1');
    await expect(page.locator('.threatened-square')).toHaveCount(1);
    await expect(page.locator('.square-attacker')).toHaveCount(1);
  });

  test('hints are unlimited unless limiting by level is switched on', async ({ page }) => {
    await page.evaluate(() => { difficulty = 'hard'; updateHintInfo(); });
    await expect(page.locator('#showThreats')).toBeEnabled();
    await page.locator('#limitHints').check({ force: true });
    await expect(page.locator('#showThreats')).toBeDisabled();
    await expect(page.locator('#showDanger')).toBeDisabled();
    await page.evaluate(() => { difficulty = 'medium'; hintsUsed = 2; updateHintInfo(); });
    await expect(page.locator('#showDanger')).toBeEnabled();
    await page.click('#showDanger'); // third and last hint
    await expect(page.locator('#showThreats')).toBeDisabled();
    await page.locator('#limitHints').uncheck({ force: true });
    await expect(page.locator('#showThreats')).toBeEnabled();
  });

  test('"my pieces in danger" briefly marks every attacked piece', async ({ page }) => {
    await page.evaluate(() => {
      game.load('4k3/8/8/8/8/q1N5/8/R3K3 w - - 0 1'); // black queen hits the knight and the rook
      board.position(game.fen(), false);
    });
    await page.click('#showDanger');
    await expect(page.locator('.danger-flash')).toHaveCount(2);
    await expect(page.locator('.danger-flash')).toHaveCount(0, { timeout: 4000 });
  });

  test('pawn is called חייל', async ({ page }) => {
    const text = await page.evaluate(() => {
      difficulty = 'beginner';
      game.load('4k3/8/8/8/2q5/8/3P4/4K3 w - - 0 1');
      board.position(game.fen(), false);
      tryMove('d2', 'd3'); // the pawn steps next to the queen
      return $('#warnText').text();
    });
    expect(text).toContain('החייל');
  });
});