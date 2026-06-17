#!/usr/bin/env node
import { chromium } from '@playwright/test';
import {
  createRunContext,
  signUpThroughPaywallToDashboard,
  wireConsole,
  writeConsoleLog,
} from './playwright-provider-helpers.mjs';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8081';
const headed = process.env.E2E_HEADLESS !== 'true';
const slowMo = Number(process.env.E2E_SLOWMO_MS ?? (headed ? 650 : 0));
const keepOpen = process.env.E2E_KEEP_OPEN
  ? process.env.E2E_KEEP_OPEN === 'true'
  : headed;
const email = process.env.E2E_EMAIL ?? `paywall-${Date.now()}@nightime.local`;
const password = process.env.E2E_PASSWORD ?? 'TestPassword123!';
const businessName = process.env.E2E_BUSINESS_NAME ?? 'Playwright Studio';

async function main() {
  const { runId, consoleMessages } = createRunContext('paywall');
  const browser = await chromium.launch({ headless: !headed, slowMo });
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  wireConsole(page, consoleMessages);

  try {
    await signUpThroughPaywallToDashboard(page, {
      runId,
      baseURL,
      email,
      password,
      businessName,
    });
    console.log('Playwright paywall validation passed.');
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
