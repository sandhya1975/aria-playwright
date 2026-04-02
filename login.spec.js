const { test, expect } = require('@playwright/test');

test('Page loads correctly', async ({ page }) => {
  await page.goto('https://practicetestautomation.com/practice-test-login/');
  await expect(page).toHaveTitle(/Login/);
});

test('Wrong password shows error', async ({ page }) => {
  await page.goto('https://practicetestautomation.com/practice-test-login/');
  await page.fill('#username', 'student');
  await page.fill('#password', 'wrongpassword');
  await page.click('#submit');
  await expect(page.locator('#error')).toBeVisible();
});

test('Correct login succeeds', async ({ page }) => {
  await page.goto('https://practicetestautomation.com/practice-test-login/');
  await page.fill('#username', 'student');
  await page.fill('#password', 'Password123');
  await page.click('#submit');
  await expect(page).toHaveTitle(/Logged In/);
});
