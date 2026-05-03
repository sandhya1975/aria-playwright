import { type Locator, type Page } from '@playwright/test';

export const APPLY_READY_PROFILE = {
  name: 'Sandy Applicant',
  email: 'sandy.applicant@example.com',
  phone: '+1 415 555 0123',
  location: 'San Francisco, CA',
  workAuthorization: 'Authorized to work in the United States',
  coverLetter:
    'Hello! I am excited about this role and would love to continue the process. Thank you for your consideration.',
};

const PREFER_NOT_TO_SAY_PATTERNS = [
  /prefer not to say/i,
  /prefer not to answer/i,
  /decline to answer/i,
  /i do not wish to answer/i,
  /choose not to disclose/i,
];

async function visible(locator: Locator): Promise<boolean> {
  return locator.isVisible({ timeout: 1200 }).catch(() => false);
}

export async function fillFirstVisibleField(page: Page, label: string, selectors: string[], value: string): Promise<boolean> {
  for (const selector of selectors) {
    const field = page.locator(selector).first();
    if (!(await visible(field))) continue;
    try {
      await field.scrollIntoViewIfNeeded();
      await field.fill(value, { timeout: 1500 });
      console.log(`APPLY_READY: filled field ${label} using selector: ${selector}`);
      return true;
    } catch {
      console.log(`APPLY_READY: skipped selector for ${label} due to interaction failure: ${selector}`);
    }
  }

  console.log(`APPLY_READY: skipped field ${label} (not found)`);
  return false;
}

export async function uploadCvIfVisible(page: Page, selectors: string[], cvPath?: string): Promise<boolean> {
  for (const selector of selectors) {
    const input = page.locator(selector).first();
    if (!(await visible(input))) continue;
    try {
      if (cvPath) {
        await input.setInputFiles(cvPath);
      } else {
        await input.setInputFiles({
          name: 'sandy-cv.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Sandy Applicant CV'),
        });
      }
      console.log(`APPLY_READY: uploaded CV with selector: ${selector}`);
      return true;
    } catch {
      console.log(`APPLY_READY: skipped CV upload selector due to interaction failure: ${selector}`);
    }
  }

  console.log('APPLY_READY: skipped CV upload (no visible input found)');
  return false;
}

export async function choosePreferNotToSay(page: Page): Promise<void> {
  const choices = [
    page.getByLabel(/prefer not to say|decline|not to answer|disclose/i),
    page.getByRole('radio', { name: /prefer not to say|decline|not to answer|disclose/i }),
    page.getByRole('option', { name: /prefer not to say|decline|not to answer|disclose/i }),
    page.getByRole('button', { name: /prefer not to say|decline|not to answer|disclose/i }),
    page.getByText(/prefer not to say|decline|not to answer|disclose/i),
  ];

  let clicked = 0;
  for (const group of choices) {
    const all = await group.all();
    for (const candidate of all) {
      if (!(await visible(candidate))) continue;
      try {
        await candidate.click({ timeout: 1200 });
        clicked += 1;
      } catch {
        // keep going safely
      }
    }
  }

  if (clicked > 0) {
    console.log(`APPLY_READY: selected 'Prefer not to say' on ${clicked} diversity field(s)`);
    return;
  }

  for (const pattern of PREFER_NOT_TO_SAY_PATTERNS) {
    const fallback = page.getByRole('option', { name: pattern }).first();
    if (await visible(fallback)) {
      try {
        await fallback.click({ timeout: 1200 });
        console.log(`APPLY_READY: selected diversity fallback option (${pattern})`);
        return;
      } catch {
        // keep going safely
      }
    }
  }

  console.log('APPLY_READY: skipped diversity fields (no Prefer not to say control found)');
}

export async function findFinalSubmit(page: Page): Promise<Locator | null> {
  const candidates = [
    page.getByRole('button', { name: /^submit application$/i }).first(),
    page.getByRole('button', { name: /^submit$/i }).first(),
    page.locator('input[type="submit"][value*="submit" i]').first(),
  ];

  for (const candidate of candidates) {
    if (await visible(candidate)) return candidate;
  }

  return null;
}

export function logSafeStop(foundFinalSubmit: boolean): void {
  console.log('APPLY_READY: stopped safely before final submit (finalSubmitBlocked=true)');
  if (foundFinalSubmit) {
    console.log('READY_FOR_SANDY_TO_PRESS_SUBMIT');
  } else {
    console.log('FORM_PAGE_REACHED_NO_SUBMIT_VISIBLE_YET');
  }
}
