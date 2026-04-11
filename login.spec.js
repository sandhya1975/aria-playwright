const { test, expect } = require('@playwright/test');

// New test 1: Wrong username shows error message
test('Wrong username shows error', async ({ page }) => {
  await page.goto('https://practicetestautomation.com/practice-test-login/');
  await page.fill('#username', 'invaliduser');
  await page.fill('#password', 'Password123');
  await page.click('#submit');
  const error = page.locator('#error');
  await expect(error).toBeVisible();
  await expect(error).toContainText(/Your username is invalid/i);
  if (await error.isHidden()) {
    await page.screenshot({ path: 'screenshots/wrong-username-failure.png' });
  }
});

// New test 2: Empty fields show validation error (no credentials submitted)
test('Empty fields show error on submit', async ({ page }) => {
  await page.goto('https://practicetestautomation.com/practice-test-login/');
  await page.click('#submit');
  const error = page.locator('#error');
  await expect(error).toBeVisible();
  if (await error.isHidden()) {
    await page.screenshot({ path: 'screenshots/empty-fields-failure.png' });
  }
});

// New test 3: Successful login lands on correct page with expected content
test('Successful login shows logged-in page content', async ({ page }) => {
  await page.goto('https://practicetestautomation.com/practice-test-login/');
  await page.fill('#username', 'student');
  await page.fill('#password', 'Password123');
  await page.click('#submit');
  await expect(page).toHaveURL(/logged-in-successfully/);
  await expect(page.locator('h1')).toContainText(/Logged In Successfully/i);
  const logoutLink = page.getByRole('link', { name: /log out/i });
  await expect(logoutLink).toBeVisible();
  if (!(await logoutLink.isVisible())) {
    await page.screenshot({ path: 'screenshots/logged-in-content-failure.png' });
  }
});

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
