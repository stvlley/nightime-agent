#!/usr/bin/env node
import { chromium } from '@playwright/test';
import {
  advancePastPaywall,
  clickButton,
  completeOnboardingFlow,
  createRunContext,
  fail,
  logInProvider,
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

const paypalHandle = process.env.E2E_PAYPAL_HANDLE ?? `nightime-paypal-${Date.now()}`;
const venmoHandle = process.env.E2E_VENMO_HANDLE ?? `nightimevenmo${Date.now()}`;
const cashAppHandle = process.env.E2E_CASHAPP_HANDLE ?? `nightimecash${Date.now()}`;
const zelleHandle = process.env.E2E_ZELLE_HANDLE ?? 'payments-e2e@example.com';

async function main() {
  const { runId, consoleMessages } = createRunContext('payments');
  const browser = await chromium.launch({ headless: !headed, slowMo });
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  wireConsole(page, consoleMessages);

  try {
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

    await page.goto(`${baseURL}/payments`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Payment links', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });

    await page.getByPlaceholder('your-paypal-me-name').fill(paypalHandle);
    await page.getByPlaceholder('your-username').fill(venmoHandle);
    await page.getByPlaceholder('yourcashtag').fill(cashAppHandle);
    await page.getByPlaceholder('email or phone').fill(zelleHandle);
    await screenshot(page, runId, '07-payments-edit');

    await clickButton(page, 'Save payment links');
    await page.getByText('Scan to pay', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });

    await page.getByText(paypalHandle, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText(`@${venmoHandle}`, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText(`$${cashAppHandle}`, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText(zelleHandle, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });

    await page.getByRole('button', { name: 'Open link' }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('Scan in your bank app', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await screenshot(page, runId, '08-payments-client');

    console.log('Playwright payments validation passed.');
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
