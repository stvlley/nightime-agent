#!/usr/bin/env node
import { chromium } from '@playwright/test';
import {
  advancePastPaywall,
  clickButton,
  completeOnboardingFlow,
  createRunContext,
  fail,
  logInProvider,
  seedCalendarBooking,
  screenshot,
  wireConsole,
  writeConsoleLog,
} from './playwright-provider-helpers.mjs';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8081';
const headed = process.env.E2E_HEADLESS !== 'true';
const slowMo = Number(process.env.E2E_SLOWMO_MS ?? (headed ? 650 : 0));
const keepOpen = process.env.E2E_KEEP_OPEN
  ? process.env.E2E_KEEP_OPEN === 'true'
  : headed;
const email = process.env.E2E_EMAIL ?? 'provider@nightime.local';
const password = process.env.E2E_PASSWORD ?? 'provider1';

async function main() {
  const { runId, consoleMessages } = createRunContext('calendar');
  const browser = await chromium.launch({ headless: !headed, slowMo });
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  wireConsole(page, consoleMessages);

  try {
    const seeded = await seedCalendarBooking(email);
    await logInProvider(page, { runId, baseURL, email, password });

    const dashboard = page.getByText('Dashboard', { exact: true });
    const onboarding = page.getByText('Make missed messages measurable', { exact: true });
    const pricing = page.getByText('Start your 7-day free trial', { exact: true });

    const landingPoint = await Promise.race([
      dashboard.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'dashboard'),
      onboarding.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'onboarding'),
      pricing.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'pricing'),
    ]).catch(() => 'timeout');

    if (landingPoint === 'timeout') {
      await fail(page, runId, 'Login did not reach dashboard, onboarding, or pricing.');
    }

    if (landingPoint === 'onboarding') {
      await completeOnboardingFlow(page, { runId });
      await advancePastPaywall(page, { runId });
    } else if (landingPoint === 'pricing') {
      await advancePastPaywall(page, { runId });
    } else {
      await screenshot(page, runId, '06-dashboard');
    }

    await clickButton(page, 'Calendar');
    await page.getByText('Calendar', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('Appointments', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('Minutes booked', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('Clients', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });

    await page.getByText(seeded.clientName, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText(`Web chat session, ${seeded.duration}`, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('confirmed', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText(seeded.timeLabel, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
    await screenshot(page, runId, '07-calendar');

    console.log('Playwright calendar validation passed.');
    console.log(`Email: ${email}`);
  } finally {
    await writeConsoleLog(runId, consoleMessages);
    if (keepOpen) {
      console.log('Keeping browser open. Press Ctrl+C when done.');
      await new Promise(() => {});
      return;
    }
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
