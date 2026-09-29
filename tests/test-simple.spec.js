const { test, expect } = require('@playwright/test');

test('Chess app loads without errors', async ({ page }) => {
  // Listen for console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Navigate to the page
  await page.goto('/');
  
  // Wait for the board to be visible
  await page.waitForSelector('#board', { timeout: 5000 });
  
  // Wait a bit for any JS errors to appear
  await page.waitForTimeout(2000);
  
  // Check for no console errors
  expect(errors).toHaveLength(0);
  
  // Check that the board element exists and is visible
  const board = page.locator('#board');
  await expect(board).toBeVisible();
  
  // Board starts empty until a color is picked; starting a game places all pieces
  await page.click('#resetBtn');
  await page.click('#playWhite');
  await expect(page.locator('#board img[src*="chesspieces"]')).toHaveCount(32);
  
  console.log('✅ App loaded successfully with no errors!');
});