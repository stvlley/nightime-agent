#!/usr/bin/env node
import { Buffer } from 'node:buffer';
import { chromium } from '@playwright/test';
import {
  advancePastPaywall,
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
const webhookURL = process.env.E2E_TRAINING_WEBHOOK_URL ?? 'https://e2e.invalid/training';
const fixtureName = process.env.E2E_UPLOAD_FILENAME ?? 'whatsapp-history.txt';
const fixtureContent =
  process.env.E2E_UPLOAD_CONTENT ??
  [
    '[16/06/2026, 10:00:00] You: Hi there',
    '[16/06/2026, 10:01:00] Alex Client: What are your rates?',
  ].join('\n');

async function main() {
  const { runId, consoleMessages } = createRunContext('upload');
  const browser = await chromium.launch({ headless: !headed, slowMo });
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1280, height: 900 },
  });
  let webhookCalls = 0;

  await context.addInitScript((injectedWebhookURL) => {
    globalThis.process = globalThis.process || {};
    globalThis.process.env = {
      ...(globalThis.process.env || {}),
      EXPO_PUBLIC_TRAINING_WEBHOOK_URL: injectedWebhookURL,
    };
  }, webhookURL);

  await context.route(webhookURL, async (route) => {
    webhookCalls += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  const page = await context.newPage();
  wireConsole(page, consoleMessages);

  page.on('dialog', async (dialog) => {
    console.log(`[dialog] ${dialog.message()}`);
    await dialog.accept();
  });

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

    await page.goto(`${baseURL}/upload`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Training', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('WhatsApp', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await screenshot(page, runId, '07-upload-screen');

    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Upload', exact: true }).first().click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: fixtureName,
      mimeType: 'text/plain',
      buffer: Buffer.from(fixtureContent),
    });

    await page.getByText(fixtureName, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('Alex Client, 2 messages', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('WhatsApp', { exact: true }).last().waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('processed', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });

    if (webhookCalls !== 1) {
      await fail(page, runId, `Expected one training webhook call, saw ${webhookCalls}.`);
    }

    await screenshot(page, runId, '08-upload-complete');
    console.log('Playwright upload validation passed.');
    console.log(`Email: ${email}`);
    console.log(`Fixture: ${fixtureName}`);
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
