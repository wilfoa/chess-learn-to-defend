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
    await expect(page).toHaveTitle('גלאי איומים בשחמט לילדים');
    await expect(page.locator('h1')).toContainText('גלאי איומים בשחמט');
    await expect(page.locator('.subtitle')).toContainText('למדו לזהות איומים ולהגן על הכלים שלכם');
  });

  test('shows control sections and buttons', async ({ page }) => {
    for (const heading of ['בקרות משחק', 'תצוגת איומים', 'מצב המשחק', 'רמת המחשב', 'כלים שנלכדו', 'איך להשתמש']) {
      await expect(page.locator(`h3:has-text("${heading}")`)).toBeVisible();
    }
    await expect(page.locator('#resetBtn')).toContainText('משחק חדש');
    await expect(page.locator('#undoBtn')).toContainText('בטל מהלך');
    await expect(page.locator('#showThreats')).not.toBeChecked();
    await expect(page.locator('#currentTurnText')).toContainText('תור הלבן');
    await expect(page.locator('input[name="difficulty"]')).toHaveCount(4);
  });

  test('new game sets up 32 pieces, and playing black flips the board', async ({ page }) => {
    await newGame(page, 'black');
    const whitePawn = await page.locator('.square-e2').boundingBox();
    const blackPawn = await page.locator('.square-e7').boundingBox();
    expect(whitePawn.y).toBeLessThan(blackPawn.y); // white is at the top
  });
});

test.describe('Game logic', () => {
  test('a legal move is played and the computer replies', async ({ page }) => {
    await newGame(page);
    await drag(page, 'e2', 'e4');
    await expect(page.locator('.square-e4 img[data-piece="wP"]')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => game.history().length)).toBe(2);
    await expect(page.locator('#currentTurnText')).toContainText('תור הלבן');
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
    await expect(page.locator('#currentTurnText')).toContainText('תור הלבן');
  });

  test('shows a check warning', async ({ page }) => {
    await newGame(page);
    await page.evaluate(() => {
      game.load('4k3/8/8/8/8/8/2n5/K6R w - - 0 1');
      updateStatus();
    });
    await expect(page.locator('#gameStatus')).toContainText('בשח');
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
    await page.locator('#showThreats').check({ force: true });
    await page.click('.square-f6'); // black: g8 knight, e7 and g7 pawns
    await expect(page.locator('.square-attacker')).toHaveCount(3);
    await expect(page.locator('#showThreats')).not.toBeChecked();
  });

  test('turning the toggle off clears the highlights', async ({ page }) => {
    await newGame(page);
    await page.locator('#showThreats').check({ force: true });
    await page.click('.square-f6');
    await page.locator('#showThreats').check({ force: true });
    await page.locator('#showThreats').uncheck({ force: true });
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
    await page.locator('#showThreats').check({ force: true });
    await page.click('.square-a1');
    await expect(page.locator('.threatened-square')).toHaveCount(1);
    await expect(page.locator('.square-attacker')).toHaveCount(1);
  });
});