import { test } from '@playwright/test';
import {
  APPLY_READY_PROFILE,
  choosePreferNotToSay,
  fillFirstVisibleField,
  findFinalSubmit,
  logSafeStop,
  uploadCvIfVisible,
} from './apply-ready-engine';

test.skip(({ browserName }) => browserName !== 'chromium', 'Apply-ready flow runs on Chromium only by default.');

test('prepare LinkedIn Easy Apply up to submit step', async ({ page }) => {
  const applicationUrl = process.env.APPLICATION_URL;
  const cvPath = process.env.CV_PATH;

  test.skip(!applicationUrl, 'APPLICATION_URL env var is required.');

  await page.goto(applicationUrl!, { waitUntil: 'domcontentloaded' });
  console.log(`APPLY_READY: opened URL ${applicationUrl}`);

  const easyApplyButton = page.getByRole('button', { name: /^(Easy Apply|Continue applying)$/i }).first();
  if (await easyApplyButton.isVisible().catch(() => false)) {
    await easyApplyButton.click();
    console.log('APPLY_READY: clicked LinkedIn Easy Apply entry button');
  } else {
    console.log('APPLY_READY: skipped LinkedIn Easy Apply entry button (not visible)');
  }

  await fillFirstVisibleField(page, 'phone', [
    'input[name*="phone" i]',
    'input[id*="phone" i]',
    'input[type="tel"]',
  ], APPLY_READY_PROFILE.phone);

  await uploadCvIfVisible(page, ['input[type="file"]'], cvPath);
  await choosePreferNotToSay(page);

  while (true) {
    const submitButton = await findFinalSubmit(page);
    if (submitButton) {
      logSafeStop(true);
      break;
    }

    const nextButton = page.getByRole('button', { name: /^(Next|Review|Continue|Continue to next step)$/i }).first();
    const canProceed = await nextButton.isVisible().catch(() => false);

    if (!canProceed) {
      logSafeStop(false);
      break;
    }

    await nextButton.click();
    console.log('APPLY_READY: clicked next/review/continue button');

    await uploadCvIfVisible(page, ['input[type="file"]'], cvPath);
    await choosePreferNotToSay(page);
  }
});
