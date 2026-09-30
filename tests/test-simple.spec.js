const { test, expect } = require('@playwright/test');

test('Chess app loads without errors', async ({ page, baseURL }) => {
  // Script errors and failed loads of our own files fail the test. Third-party hosts
  // (fonts, CDNs, piece images) occasionally hiccup in CI; those are logged, not fatal.
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) errors.push(msg.text());
  });
  page.on('response', r => {
    if (r.status() < 400) return;
    if (r.url().startsWith(baseURL)) errors.push(`${r.status()} ${r.url()}`);
    else console.log(`third-party load failed (ignored): ${r.status()} ${r.url()}`);
  });

  await page.goto('/');
  await page.waitForSelector('#board', { timeout: 5000 });
  await page.waitForTimeout(2000); // let late script errors surface

  // Board starts empty until a color is picked; starting a game places all pieces
  await expect(page.locator('#showThreats')).toBeDisabled(); // nothing to attack yet
  await page.click('#resetBtn');
  await page.click('#playWhite');
  await expect(page.locator('#board img[src*="chesspieces"]')).toHaveCount(32);
  await expect(page.locator('#showThreats')).toBeEnabled();

  expect(errors).toEqual([]);
});
