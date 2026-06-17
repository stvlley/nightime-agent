#!/usr/bin/env node
import { chromium } from '@playwright/test';
import {
  advancePastPaywall,
  completeOnboardingFlow,
  createRunContext,
  fail,
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
const seededPlan = process.env.E2E_BILLING_PLAN ?? 'premium';
const seededUsage = Number(process.env.E2E_BILLING_USAGE ?? 42);
const seededLimit = Number(process.env.E2E_BILLING_LIMIT ?? 100);

async function main() {
  const { runId, consoleMessages } = createRunContext('billing');
  const browser = await chromium.launch({ headless: !headed, slowMo });
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  wireConsole(page, consoleMessages);

  const originalProfile = await getProviderProfile(email);

  try {
    await updateProviderProfile(email, {
      plan: seededPlan,
      usage_month_count: seededUsage,
      usage_limit: seededLimit,
    });

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

    await page.goto(`${baseURL}/billing`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Plan & Billing', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('Billing is free during early access', { exact: false }).waitFor({
      state: 'visible',
      timeout: 15000,
    });
    await screenshot(page, runId, '07-billing-screen');

    await page.getByText('Premium', { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('free during early access', { exact: true }).waitFor({
      state: 'visible',
      timeout: 15000,
    });
    await page.getByText(`${seededUsage} / ${seededLimit}`, { exact: true }).waitFor({
      state: 'visible',
      timeout: 15000,
    });
    await page.getByText('Unlimited agent replies', { exact: true }).waitFor({
      state: 'visible',
      timeout: 15000,
    });
    await page.getByText('your plan', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('No payment method needed yet', { exact: true }).waitFor({
      state: 'visible',
      timeout: 15000,
    });
    await screenshot(page, runId, '08-billing-verified');

    console.log('Playwright billing validation passed.');
    console.log(`Email: ${email}`);
    console.log(`Plan: ${seededPlan}`);
    console.log(`Usage: ${seededUsage}/${seededLimit}`);
  } finally {
    await updateProviderProfile(email, {
      plan: originalProfile.plan,
      usage_month_count: originalProfile.usage_month_count,
      usage_limit: originalProfile.usage_limit,
    }).catch(() => {});
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
