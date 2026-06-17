#!/usr/bin/env node
import { chromium } from '@playwright/test';
import {
  advancePastPaywall,
  clickButton,
  completeOnboardingFlow,
  createRunContext,
  ensureWebchatEnabled,
  fail,
  findThreadForInboundMessage,
  getFunctionsBase,
  getProviderProfile,
  logInProvider,
  screenshot,
  updateProviderProfile,
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

async function postInbound(slug, sessionId, text) {
  const functionsBase = await getFunctionsBase();
  const res = await fetch(`${functionsBase}/webchat-inbound`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, sessionId, text }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  const { runId, consoleMessages } = createRunContext('profile-slug');
  const browser = await chromium.launch({ headless: !headed, slowMo });
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  wireConsole(page, consoleMessages);

  let originalProfile = null;

  try {
    originalProfile = await getProviderProfile(email);
    await ensureWebchatEnabled(email);

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

    const oldSlug = originalProfile.slug;
    const newSlug = `${oldSlug}-e2e`;
    const inboundMessage = `Slug routing check ${Date.now()}`;

    await page.goto(`${baseURL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Profile & business', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('luna-massage').fill(newSlug);
    await clickButton(page, 'Save profile');
    await page.getByText('Profile saved.', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await screenshot(page, runId, '07-profile-saved');

    const oldSlugResult = await postInbound(oldSlug, `old-${Date.now()}`, 'old slug check');
    if (oldSlugResult.status !== 404 || oldSlugResult.body.error !== 'unknown_provider') {
      throw new Error(`Old slug still resolved unexpectedly: ${JSON.stringify(oldSlugResult)}`);
    }

    const newChatLink = await ensureWebchatEnabled(email);
    const widgetPage = await context.newPage();
    wireConsole(widgetPage, consoleMessages);
    await widgetPage.goto(newChatLink, { waitUntil: 'domcontentloaded' });
    await widgetPage.getByPlaceholder('Type a message…').waitFor({ state: 'visible', timeout: 15000 });
    await widgetPage.getByPlaceholder('Type a message…').fill(inboundMessage);
    await clickButton(widgetPage, 'Send');
    await widgetPage.getByText(inboundMessage, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await screenshot(widgetPage, runId, '08-widget-new-slug');

    const thread = await findThreadForInboundMessage(email, inboundMessage);
    await page.goto(`${baseURL}/thread?id=${encodeURIComponent(thread.threadId)}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.getByText(inboundMessage, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await screenshot(page, runId, '09-thread-new-slug');

    console.log('Playwright profile slug validation passed.');
    console.log(`Email: ${email}`);
    console.log(`Old slug: ${oldSlug}`);
    console.log(`New slug: ${newSlug}`);
  } finally {
    if (originalProfile?.slug) {
      await updateProviderProfile(email, { slug: originalProfile.slug }).catch(() => {});
      await ensureWebchatEnabled(email).catch(() => {});
    }
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
