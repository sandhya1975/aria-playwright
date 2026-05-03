import { chromium, type Page } from '@playwright/test';
import {
  APPLY_READY_PROFILE,
  choosePreferNotToSay,
  fillFirstVisibleField,
  findFinalSubmit,
  logSafeStop,
  uploadCvIfVisible,
} from '../tests/apply-ready-engine';

type JobRecord = {
  jobId?: string;
  job?: string;
  title?: string;
  company?: string;
  score?: number | string;
  applyUrl?: string;
};

type Status =
  | 'READY_FOR_SANDY_TO_PRESS_SUBMIT'
  | 'FORM_PAGE_REACHED_NO_SUBMIT_VISIBLE_YET'
  | 'SKIPPED_INVALID_URL'
  | 'FAILED_NEEDS_REVIEW';

type Row = { job: string; company: string; score: number; status: Status };

const LIVE_FEED_URL = process.env.JOBS_LIVE_FEED_URL || 'http://127.0.0.1:3000/jobs/live-feed';

function safeString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function parseScore(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function loadJobs(): Promise<JobRecord[]> {
  const response = await fetch(LIVE_FEED_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch live feed (${response.status}) from ${LIVE_FEED_URL}`);
  }

  const payload = await response.json() as { jobs?: JobRecord[]; message?: string };
  const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
  console.log(`APPLY_QUEUE: ${payload.message || 'Live feed loaded.'}`);
  return jobs;
}

async function prepareApplication(page: Page, applyUrl: string, cvPath: string): Promise<Status> {
  await page.goto(applyUrl, { waitUntil: 'domcontentloaded' });

  const easyApplyButton = page.getByRole('button', { name: /^(Easy Apply|Continue applying)$/i }).first();
  if (await easyApplyButton.isVisible().catch(() => false)) {
    await easyApplyButton.click();
  }

  await fillFirstVisibleField(page, 'phone', [
    'input[name*="phone" i]',
    'input[id*="phone" i]',
    'input[type="tel"]',
  ], APPLY_READY_PROFILE.phone);

  await fillFirstVisibleField(page, 'name', [
    'input[name*="name" i]',
    'input[id*="name" i]',
    'input[autocomplete="name"]',
  ], APPLY_READY_PROFILE.name);

  await fillFirstVisibleField(page, 'email', [
    'input[type="email"]',
    'input[name*="email" i]',
    'input[autocomplete="email"]',
  ], APPLY_READY_PROFILE.email);

  await uploadCvIfVisible(page, ['input[type="file"]'], cvPath);
  await choosePreferNotToSay(page);

  while (true) {
    const submitButton = await findFinalSubmit(page);
    if (submitButton) {
      logSafeStop(true);
      return 'READY_FOR_SANDY_TO_PRESS_SUBMIT';
    }

    const nextButton = page.getByRole('button', { name: /^(Next|Review|Continue|Continue to next step)$/i }).first();
    const canProceed = await nextButton.isVisible().catch(() => false);

    if (!canProceed) {
      logSafeStop(false);
      return 'FORM_PAGE_REACHED_NO_SUBMIT_VISIBLE_YET';
    }

    await nextButton.click();
    await uploadCvIfVisible(page, ['input[type="file"]'], cvPath);
    await choosePreferNotToSay(page);
  }
}

async function main(): Promise<void> {
  const cvPath = process.env.CV_PATH;
  if (!cvPath) throw new Error('CV_PATH is required.');

  const allJobs = await loadJobs();
  const shortlisted = allJobs.filter((job) => parseScore(job.score) >= 7);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const rows: Row[] = [];

  try {
    for (const job of shortlisted) {
      const rowBase = {
        job: safeString(job.job ?? job.title, 'Unknown Job'),
        company: safeString(job.company, 'Unknown Company'),
        score: parseScore(job.score),
      };

      const applyUrl = safeString(job.applyUrl, '');
      if (!isValidHttpUrl(applyUrl)) {
        rows.push({ ...rowBase, status: 'SKIPPED_INVALID_URL' });
        continue;
      }

      const page = await context.newPage();
      try {
        const status = await prepareApplication(page, applyUrl, cvPath);
        rows.push({ ...rowBase, status });
      } catch (error) {
        console.error('APPLY_QUEUE: failed while preparing application', error);
        rows.push({ ...rowBase, status: 'FAILED_NEEDS_REVIEW' });
      } finally {
        await page.close().catch(() => undefined);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('Morning table:');
  console.table(rows);
}

void main();
