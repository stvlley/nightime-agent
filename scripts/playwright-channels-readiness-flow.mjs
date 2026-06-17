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

async function clickPressableRow(page, title) {
  const row = page.getByRole('button', { name: new RegExp(title, 'i') }).first();
  await row.waitFor({ state: 'visible', timeout: 15000 });
  await row.click();
}

async function main() {
  const { runId, consoleMessages } = createRunContext('channels-readiness');
  const browser = await chromium.launch({ headless: !headed, slowMo });
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
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

    await clickButton(page, 'More');
    await page.getByText('Settings', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await clickPressableRow(page, 'Channels');
    await page.getByText('Channels', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
    await screenshot(page, runId, '07-channels-open');

    const loading = page.getByText('Loading', { exact: true }).first();
    const turnOn = page.getByText('Turn on web chat', { exact: true }).first();
    const copyLink = page.getByText('Copy link', { exact: true }).first();
    const pause = page.getByText('Pause', { exact: true }).first();
    const disconnect = page.getByText('Disconnect', { exact: true }).first();
    const errorText = page.getByText(/Could not load channels|Demo mode|not configured/i).first();

    const readyState = await Promise.race([
      turnOn.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'turn-on'),
      copyLink.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'copy-link'),
      pause.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'pause'),
      disconnect.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'disconnect'),
      errorText.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'error'),
    ]).catch(async () => {
      if (await loading.isVisible().catch(() => false)) return 'loading-stuck';
      return 'timeout';
    });

    await screenshot(page, runId, `08-channels-${readyState}`);

    if (readyState === 'loading-stuck') {
      await fail(page, runId, 'Channels screen stayed on Loading instead of rendering a ready state.');
    }

    if (readyState === 'timeout') {
      await fail(page, runId, 'Channels screen did not render a ready state in time.');
    }

    if (readyState === 'error') {
      await fail(page, runId, 'Channels screen rendered an error state.');
    }

    console.log(`Playwright channels readiness validation passed (${readyState}).`);
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
