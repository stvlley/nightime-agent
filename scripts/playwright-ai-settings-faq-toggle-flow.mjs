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
  setFaqEnabledByTrigger,
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
const faqTrigger = process.env.E2E_FAQ_TRIGGER ?? 'What are your rates?';
const inboundMessage = process.env.E2E_INBOUND_TEXT ?? faqTrigger;

async function setFaqToggle(page, checked) {
  const toggle = page.getByLabel(`Toggle response: ${faqTrigger}`).first();
  await toggle.waitFor({ state: 'visible', timeout: 15000 });
  const current = await toggle.isChecked().catch(() => null);
  if (current === checked) return;
  await toggle.click();
}

async function main() {
  const { runId, consoleMessages } = createRunContext('ai-settings-faq-toggle');
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

    await page.goto(`${baseURL}/ai-settings`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Agent Settings', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await setFaqToggle(page, false);
    await screenshot(page, runId, '07-faq-disabled');

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

    const pendingDraft = await waitForPendingDraftForInboundMessage(email, inboundMessage);
    if (pendingDraft.source === 'faq') {
      await fail(widgetPage, runId, 'Disabled FAQ still matched as FAQ source.');
    }

    const leakedDraft = widgetPage.getByText(pendingDraft.text, { exact: true }).first();
    if (await leakedDraft.isVisible().catch(() => false)) {
      await fail(widgetPage, runId, 'Disabled FAQ draft leaked to widget before approval.');
    }
    await screenshot(widgetPage, runId, '08-widget-disabled-faq-receipt');

    await page.goto(`${baseURL}/ai-settings`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Agent Settings', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await setFaqToggle(page, true);
    await screenshot(page, runId, '09-faq-restored');

    console.log('Playwright AI settings FAQ toggle validation passed.');
    console.log(`Email: ${email}`);
    console.log(`Inbound text: ${inboundMessage}`);
  } finally {
    await setFaqEnabledByTrigger(email, faqTrigger, true).catch(() => {});
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
