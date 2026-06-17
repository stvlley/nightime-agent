#!/usr/bin/env node
import { chromium } from '@playwright/test';
import {
  advancePastPaywall,
  clickButton,
  completeOnboardingFlow,
  createRunContext,
  ensureWebchatEnabled,
  fail,
  logInProvider,
  screenshot,
  waitForPendingDraftForInboundMessage,
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
const inboundMessage =
  process.env.E2E_INBOUND_TEXT ?? `Dashboard approval check ${Date.now()} custom package`;

async function main() {
  const { runId, consoleMessages } = createRunContext('dashboard-approval-card');
  const browser = await chromium.launch({ headless: !headed, slowMo });
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  wireConsole(page, consoleMessages);

  try {
    const chatLink = await ensureWebchatEnabled(email);

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

    const widgetPage = await context.newPage();
    wireConsole(widgetPage, consoleMessages);
    await widgetPage.goto(chatLink, { waitUntil: 'domcontentloaded' });
    await widgetPage.getByPlaceholder('Type a message…').waitFor({ state: 'visible', timeout: 15000 });
    await widgetPage.getByPlaceholder('Type a message…').fill(inboundMessage);
    await clickButton(widgetPage, 'Send');
    await widgetPage.getByText(inboundMessage, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await widgetPage.getByText(/received and you'll get a reply here shortly/i).first().waitFor({
      state: 'visible',
      timeout: 15000,
    });

    await waitForPendingDraftForInboundMessage(email, inboundMessage);
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await page.getByText('Dashboard', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });

    const approvalCard = page.getByRole('button', { name: /reply needs|replies need/i }).first();
    await approvalCard.waitFor({ state: 'visible', timeout: 15000 });
    await screenshot(page, runId, '07-dashboard-pending-card');
    await approvalCard.click();

    await page.getByText('Inbox', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText(`Client: ${inboundMessage}`, { exact: false }).first().waitFor({
      state: 'visible',
      timeout: 15000,
    });
    await screenshot(page, runId, '08-inbox-from-dashboard');

    console.log('Playwright dashboard approval-card validation passed.');
    console.log(`Email: ${email}`);
    console.log(`Inbound text: ${inboundMessage}`);
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
