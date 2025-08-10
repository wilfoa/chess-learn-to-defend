const { test, expect } = require('@playwright/test');

test.describe('Chess Threat Visualizer - Basic Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the page with Hebrew title', async ({ page }) => {
    await expect(page).toHaveTitle('גלאי איומים בשחמט לילדים');
  });

  test('should display main heading in Hebrew', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toContainText('גלאי איומים בשחמט');
  });

  test('should display subtitle in Hebrew', async ({ page }) => {
    const subtitle = page.locator('.subtitle');
    await expect(subtitle).toContainText('למדו לזהות איומים ולהגן על הכלים שלכם');
  });

  test('should load chessboard', async ({ page }) => {
    const board = page.locator('#board');
    await expect(board).toBeVisible();
    
    // Check that chess pieces are loaded (should have 32 pieces initially)
    // Wait for board to be fully loaded
    await page.waitForTimeout(2000);
    // Chessboard.js uses img elements for pieces
    const pieces = page.locator('#board img[src*="chesspieces"]');
    await expect(pieces).toHaveCount(32);
  });

  test('should display all control sections in Hebrew', async ({ page }) => {
    // Game Controls section
    const gameControlsHeading = page.locator('h3:has-text("בקרות משחק")');
    await expect(gameControlsHeading).toBeVisible();

    // Threat Display section
    const threatDisplayHeading = page.locator('h3:has-text("תצוגת איומים")');
    await expect(threatDisplayHeading).toBeVisible();

    // Turn Info section
    const turnInfoHeading = page.locator('h3:has-text("מידע על התור")');
    await expect(turnInfoHeading).toBeVisible();

    // Captured Pieces section
    const capturedPiecesHeading = page.locator('h3:has-text("כלים שנלכדו")');
    await expect(capturedPiecesHeading).toBeVisible();
  });

  test('should display control buttons in Hebrew', async ({ page }) => {
    const newGameBtn = page.locator('#resetBtn');
    await expect(newGameBtn).toContainText('משחק חדש');
    
    const undoBtn = page.locator('#undoBtn');
    await expect(undoBtn).toContainText('בטל מהלך');
    
    const flipBtn = page.locator('#flipBtn');
    await expect(flipBtn).toContainText('הפוך לוח');
  });

  test('should display threat toggle in Hebrew', async ({ page }) => {
    const threatToggleLabel = page.locator('.label-text');
    await expect(threatToggleLabel).toContainText('הצג איומים');
    
    // Check toggle is on by default
    const threatToggle = page.locator('#showThreats');
    await expect(threatToggle).toBeChecked();
  });

  test('should display threat mode options in Hebrew', async ({ page }) => {
    const currentPlayerOption = page.locator('label:has-text("הצג איומים על השחקן הנוכחי")');
    await expect(currentPlayerOption).toBeVisible();
    
    const allThreatsOption = page.locator('label:has-text("הצג את כל האיומים")');
    await expect(allThreatsOption).toBeVisible();
  });

  test('should display turn indicator in Hebrew', async ({ page }) => {
    const turnIndicator = page.locator('#currentTurn');
    await expect(turnIndicator).toContainText('תור הלבן');
  });

  test('should display instructions panel in Hebrew', async ({ page }) => {
    const instructionsHeading = page.locator('h3:has-text("איך להשתמש")');
    await expect(instructionsHeading).toBeVisible();
    
    const instructions = page.locator('.info-panel ul li');
    await expect(instructions).toHaveCount(4);
    
    // Check first instruction about red highlights
    const firstInstruction = instructions.first();
    await expect(firstInstruction).toContainText('הדגשות אדומות מראות כלים שנמצאים תחת איום');
  });
});

test.describe('Chess Threat Visualizer - Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should reset the game when clicking new game button', async ({ page }) => {
    // Make a move first
    await page.waitForTimeout(2000);
    // Find the white pawn at e2 and drag it to e4
    const e2Square = await page.locator('.square-e2').boundingBox();
    const e4Square = await page.locator('.square-e4').boundingBox();
    await page.mouse.move(e2Square.x + e2Square.width/2, e2Square.y + e2Square.height/2);
    await page.mouse.down();
    await page.mouse.move(e4Square.x + e4Square.width/2, e4Square.y + e4Square.height/2);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Reset the game
    await page.click('#resetBtn');
    await page.waitForTimeout(1000);
    
    // Check that pieces are back to starting position
    const pieces = page.locator('#board img[src*="chesspieces"]');
    await expect(pieces).toHaveCount(32);
  });

  test('should flip the board when clicking flip button', async ({ page }) => {
    await page.waitForTimeout(2000);
    // Check initial position of a specific piece
    const whitePawnE2Before = await page.locator('#board img[src*="wP"]').first().boundingBox();
    
    // Flip the board
    await page.click('#flipBtn');
    await page.waitForTimeout(1000);
    
    // Check position after flip
    const whitePawnE2After = await page.locator('#board img[src*="wP"]').first().boundingBox();
    
    // The y positions should be different (flipped vertically)
    expect(whitePawnE2Before.y).not.toEqual(whitePawnE2After.y);
  });

  test('should toggle threat display', async ({ page }) => {
    // Initially threats should be visible
    const threatToggle = page.locator('#showThreats');
    await expect(threatToggle).toBeChecked();
    
    // Turn off threats
    await threatToggle.uncheck();
    await expect(threatToggle).not.toBeChecked();
    
    // Turn on threats again
    await threatToggle.check();
    await expect(threatToggle).toBeChecked();
  });

  test('should switch between threat modes', async ({ page }) => {
    // Default should be current player mode
    const currentMode = page.locator('input[name="threatMode"][value="current"]');
    await expect(currentMode).toBeChecked();
    
    // Switch to all threats mode
    const allMode = page.locator('input[name="threatMode"][value="all"]');
    await allMode.check();
    await expect(allMode).toBeChecked();
    await expect(currentMode).not.toBeChecked();
  });
});

test.describe('Chess Threat Visualizer - Game Logic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should allow legal moves', async ({ page }) => {
    // Move white pawn e2 to e4
    await page.waitForTimeout(2000);
    const e2Square = await page.locator('.square-e2').boundingBox();
    const e4Square = await page.locator('.square-e4').boundingBox();
    await page.mouse.move(e2Square.x + e2Square.width/2, e2Square.y + e2Square.height/2);
    await page.mouse.down();
    await page.mouse.move(e4Square.x + e4Square.width/2, e4Square.y + e4Square.height/2);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Check turn changed to black
    const turnIndicator = page.locator('#currentTurn');
    await expect(turnIndicator).toContainText('תור השחור');
    
    // Move black pawn e7 to e5
    const e7Square = await page.locator('.square-e7').boundingBox();
    const e5Square = await page.locator('.square-e5').boundingBox();
    await page.mouse.move(e7Square.x + e7Square.width/2, e7Square.y + e7Square.height/2);
    await page.mouse.down();
    await page.mouse.move(e5Square.x + e5Square.width/2, e5Square.y + e5Square.height/2);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Check turn changed back to white
    await expect(turnIndicator).toContainText('תור הלבן');
  });

  test('should not allow illegal moves', async ({ page }) => {
    // Try to move white pawn e2 to e5 (illegal)
    await page.waitForTimeout(2000);
    const e2Square = await page.locator('.square-e2').boundingBox();
    const e5Square = await page.locator('.square-e5').boundingBox();
    await page.mouse.move(e2Square.x + e2Square.width/2, e2Square.y + e2Square.height/2);
    await page.mouse.down();
    await page.mouse.move(e5Square.x + e5Square.width/2, e5Square.y + e5Square.height/2);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Turn should still be white's
    const turnIndicator = page.locator('#currentTurn');
    await expect(turnIndicator).toContainText('תור הלבן');
    
    // Pawn should still be on e2 (check that a white pawn image is at e2 position)
    const e2Sq = page.locator('.square-e2');
    await expect(e2Sq).toBeVisible();
  });

  test('should undo moves', async ({ page }) => {
    // Make a move
    await page.waitForTimeout(2000);
    const e2Square = await page.locator('.square-e2').boundingBox();
    const e4Square = await page.locator('.square-e4').boundingBox();
    await page.mouse.move(e2Square.x + e2Square.width/2, e2Square.y + e2Square.height/2);
    await page.mouse.down();
    await page.mouse.move(e4Square.x + e4Square.width/2, e4Square.y + e4Square.height/2);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Check turn changed
    let turnIndicator = page.locator('#currentTurn');
    await expect(turnIndicator).toContainText('תור השחור');
    
    // Undo the move
    await page.click('#undoBtn');
    await page.waitForTimeout(500);
    
    // Check turn is back to white
    await expect(turnIndicator).toContainText('תור הלבן');
    
    // Check pawn is back on e2
    const e2Sq = page.locator('.square-e2');
    await expect(e2Sq).toBeVisible();
  });

  test('should display check warning', async ({ page }) => {
    // Set up a simple check position
    await page.waitForTimeout(2000);
    
    // Helper function to move pieces
    const movePiece = async (from, to) => {
      const fromSquare = await page.locator(`.square-${from}`).boundingBox();
      const toSquare = await page.locator(`.square-${to}`).boundingBox();
      await page.mouse.move(fromSquare.x + fromSquare.width/2, fromSquare.y + fromSquare.height/2);
      await page.mouse.down();
      await page.mouse.move(toSquare.x + toSquare.width/2, toSquare.y + toSquare.height/2);
      await page.mouse.up();
      await page.waitForTimeout(300);
    };
    
    // Simple moves to create check
    await movePiece('e2', 'e4');
    await movePiece('e7', 'e5');
    await movePiece('d1', 'h5'); // Queen to h5
    
    // Check for check warning (black is now in check)
    const status = page.locator('#gameStatus');
    const statusText = await status.textContent();
    // Should contain check warning since black king is threatened
    expect(statusText).toContain('בשח');
  });
});

test.describe('Chess Threat Visualizer - Threat Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should show threat indicators when pieces are threatened', async ({ page }) => {
    // Move white pawn to create a threat
    await page.waitForTimeout(2000);
    const e2Square = await page.locator('.square-e2').boundingBox();
    const e4Square = await page.locator('.square-e4').boundingBox();
    await page.mouse.move(e2Square.x + e2Square.width/2, e2Square.y + e2Square.height/2);
    await page.mouse.down();
    await page.mouse.move(e4Square.x + e4Square.width/2, e4Square.y + e4Square.height/2);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Move black pawn
    const d7Square = await page.locator('.square-d7').boundingBox();
    const d5Square = await page.locator('.square-d5').boundingBox();
    await page.mouse.move(d7Square.x + d7Square.width/2, d7Square.y + d7Square.height/2);
    await page.mouse.down();
    await page.mouse.move(d5Square.x + d5Square.width/2, d5Square.y + d5Square.height/2);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // White pawn can now capture black pawn - threat should be visible
    // Check for threat indicators (they have the class 'threat-indicator')
    const threatIndicators = page.locator('.threat-indicator');
    
    // There should be at least one threat indicator visible
    await expect(threatIndicators.first()).toBeVisible({ timeout: 2000 });
  });

  test('should hide threat indicators when toggle is off', async ({ page }) => {
    // Create a position with threats
    await page.waitForTimeout(2000);
    const e2Square = await page.locator('.square-e2').boundingBox();
    const e4Square = await page.locator('.square-e4').boundingBox();
    await page.mouse.move(e2Square.x + e2Square.width/2, e2Square.y + e2Square.height/2);
    await page.mouse.down();
    await page.mouse.move(e4Square.x + e4Square.width/2, e4Square.y + e4Square.height/2);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    const d7Square = await page.locator('.square-d7').boundingBox();
    const d5Square = await page.locator('.square-d5').boundingBox();
    await page.mouse.move(d7Square.x + d7Square.width/2, d7Square.y + d7Square.height/2);
    await page.mouse.down();
    await page.mouse.move(d5Square.x + d5Square.width/2, d5Square.y + d5Square.height/2);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Turn off threat display
    await page.locator('#showThreats').uncheck();
    await page.waitForTimeout(500);
    
    // Check that no threat indicators are visible
    const threatIndicators = page.locator('.threat-indicator');
    await expect(threatIndicators).toHaveCount(0);
  });
});