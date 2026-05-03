import { test, type Page, type Locator } from '@playwright/test';

const PREFER_NOT_TO_SAY_PATTERNS = [
  /prefer not to say/i,
  /prefer not to answer/i,
  /decline to answer/i,
  /i do not wish to answer/i,
  /choose not to disclose/i,
];

const SAFE_STEP_PATTERNS = [/^apply$/i, /^apply now$/i, /^start application$/i, /^continue$/i, /^next$/i];
const BLOCKED_STEP_PATTERNS = [/^submit$/i, /^submit application$/i, /^send application$/i, /^finish$/i];
const MAX_SAFE_CLICKS = 5;

const SANDY_PROFILE = {
  name: 'Sandy Applicant',
  email: 'sandy.applicant@example.com',
  phone: '+1 415 555 0123',
  location: 'San Francisco, CA',
  workAuthorization: 'Authorized to work in the United States',
  coverLetter:
    'Hello! I am excited about this role and would love to continue the process. Thank you for your consideration.',
};

async function fillIfFound(page: Page, selectors: string[], value: string): Promise<boolean> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    let shouldTryFill = false;

    try {
      const count = await locator.count();
      if (count > 0) {
        shouldTryFill = await locator.isVisible({ timeout: 1000 });
      }
    } catch {
      continue;
    }

    if (!shouldTryFill) {
      continue;
    }

    try {
      await locator.scrollIntoViewIfNeeded();
      await locator.fill(value, { timeout: 1500 });
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

async function selectPreferNotToSay(page: Page, contextHints: RegExp[]): Promise<void> {
  const optionCandidates = page
    .getByRole('option')
    .filter({ hasText: /prefer not|decline|not to answer|disclose/i });

  for (let i = 0; i < (await optionCandidates.count()); i++) {
    const option = optionCandidates.nth(i);
    try {
      await option.click({ timeout: 1000 });
    } catch {
      // ignore
    }
  }

  for (const hint of contextHints) {
    const controls = page
      .locator('select, [role="combobox"], [aria-haspopup="listbox"]')
      .filter({ has: page.locator(`xpath=ancestor-or-self::*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${hint.source.toLowerCase().replace(/[^a-z ]/g, '')}')]`) });

    const max = await controls.count();
    for (let i = 0; i < max; i++) {
      const control = controls.nth(i);
      try {
        await control.scrollIntoViewIfNeeded();
        await control.click({ timeout: 1000 });
      } catch {
        continue;
      }

      let selected = false;
      for (const pattern of PREFER_NOT_TO_SAY_PATTERNS) {
        const option = page.getByRole('option', { name: pattern }).first();
        if (await option.count()) {
          try {
            await option.click({ timeout: 1000 });
            selected = true;
            break;
          } catch {
            // ignore and keep trying
          }
        }
      }

      if (!selected) {
        const buttons = page.getByRole('button').filter({ hasText: /prefer not|decline|not to answer/i });
        if (await buttons.count()) {
          try {
            await buttons.first().click({ timeout: 1000 });
          } catch {
            // ignore
          }
        }
      }
    }
  }
}

async function setFileIfFound(page: Page, selectors: string[]): Promise<boolean> {
  const fileContent = Buffer.from('Sandy Applicant CV');
  for (const selector of selectors) {
    const input = page.locator(selector).first();
    if (await input.count()) {
      try {
        await input.setInputFiles({
          name: 'sandy-cv.txt',
          mimeType: 'text/plain',
          buffer: fileContent,
        });
        return true;
      } catch {
        // ignore and continue
      }
    }
  }
  return false;
}

async function firstVisible(page: Page, locators: Locator[]): Promise<Locator | null> {
  for (const locator of locators) {
    if (await locator.first().isVisible().catch(() => false)) {
      return locator.first();
    }
  }
  return null;
}

async function fillKnownFields(page: Page): Promise<void> {
  await fillIfFound(page, [
    'input[name*="name" i]:not([name*="user" i])',
    'input[autocomplete="name"]',
    'input[id*="name" i]',
    'input[placeholder*="name" i]',
  ], SANDY_PROFILE.name);

  await fillIfFound(page, [
    'input[type="email"]',
    'input[name*="email" i]',
    'input[autocomplete="email"]',
  ], SANDY_PROFILE.email);

  await fillIfFound(page, [
    'input[type="tel"]',
    'input[name*="phone" i]',
    'input[autocomplete*="tel" i]',
  ], SANDY_PROFILE.phone);

  await fillIfFound(page, [
    'input[name*="location" i]',
    'input[placeholder*="location" i]',
    'input[autocomplete*="address" i]',
  ], SANDY_PROFILE.location);

  await fillIfFound(page, [
    'input[name*="work authorization" i]',
    'input[name*="authorization" i]',
    'textarea[name*="authorization" i]',
  ], SANDY_PROFILE.workAuthorization);

  await setFileIfFound(page, [
    'input[type="file"][name*="resume" i]',
    'input[type="file"][name*="cv" i]',
    'input[type="file"][name*="upload" i]',
    'input[type="file"]',
  ]);

  await fillIfFound(page, [
    'textarea[name*="cover" i]',
    'textarea[id*="cover" i]',
    'textarea[placeholder*="cover" i]',
  ], SANDY_PROFILE.coverLetter);

  await selectPreferNotToSay(page, [/gender/i, /ethnicity|race/i, /disability/i, /religion/i, /veteran/i]);
}

async function clickSafeStepNavigation(page: Page): Promise<void> {
  for (let i = 0; i < MAX_SAFE_CLICKS; i++) {
    let clicked = false;

    for (const pattern of SAFE_STEP_PATTERNS) {
      const button = page.getByRole('button', { name: pattern }).first();
      const link = page.getByRole('link', { name: pattern }).first();

      for (const candidate of [button, link]) {
        if (!(await candidate.isVisible().catch(() => false))) {
          continue;
        }

        const candidateName = (await candidate.innerText().catch(() => '')).trim();
        if (BLOCKED_STEP_PATTERNS.some((blocked) => blocked.test(candidateName))) {
          continue;
        }

        try {
          await candidate.click({ timeout: 1500 });
          await page.waitForTimeout(600);
          await fillKnownFields(page);
          clicked = true;
          break;
        } catch {
          // try another candidate
        }
      }

      if (clicked) {
        break;
      }
    }

    if (!clicked) {
      break;
    }
  }
}

test('prepare application and stop before submit', async ({ page }) => {
  const applicationUrl = process.env.APPLICATION_URL;
  test.skip(!applicationUrl, 'APPLICATION_URL env variable is required.');

  await page.goto(applicationUrl!, { waitUntil: 'domcontentloaded' });

  await fillKnownFields(page);
  await clickSafeStepNavigation(page);

  const submitButton = await firstVisible(page, [
    page.getByRole('button', { name: /submit|submit application|send application|finish/i }),
    page.locator('input[type="submit"]'),
    page.locator('button, input[type="button"], input[type="submit"]').filter({ hasText: /submit|submit application|send application|finish/i }),
  ]);

  if (!submitButton) {
    console.log('FORM_PAGE_REACHED_NO_SUBMIT_VISIBLE_YET');
    return;
  }
  console.log('READY_FOR_SANDY_TO_PRESS_SUBMIT');
});
