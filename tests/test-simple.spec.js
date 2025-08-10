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
  
  // Check that chess pieces are loaded
  await page.waitForTimeout(1000);
  const pieces = page.locator('#board img[src*="chesspieces"]');
  await expect(pieces).toHaveCount(32);
  
  console.log('✅ App loaded successfully with no errors!');
});