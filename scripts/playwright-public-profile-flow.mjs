#!/usr/bin/env node
import { chromium } from '@playwright/test';
import {
  advancePastPaywall,
  clickButton,
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

const runStamp = Date.now();
const publicSlug = process.env.E2E_PUBLIC_SLUG ?? `public-profile-${runStamp}`;
const businessName = process.env.E2E_PUBLIC_BUSINESS ?? 'Moonlight Studio';
const displayName = process.env.E2E_PUBLIC_DISPLAY ?? 'Nina After Hours';
const headline = process.env.E2E_PUBLIC_HEADLINE ?? 'Late-night massage appointments';
const locationLabel = process.env.E2E_PUBLIC_LOCATION ?? 'Lower East Side';

async function main() {
  const { runId, consoleMessages } = createRunContext('public-profile');
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
      published: true,
      age_gate_required: true,
      slug: originalProfile.slug ?? `provider-${runStamp}`,
      business_name: originalProfile.business_name ?? 'Provider Demo',
      display_name: originalProfile.display_name ?? 'Provider Demo',
      headline: originalProfile.headline ?? null,
      location_label: originalProfile.location_label ?? null,
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

    await page.goto(`${baseURL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Profile & business', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });

    await page.getByPlaceholder('Luna Massage', { exact: true }).fill(businessName);
    await page.getByPlaceholder('Luna', { exact: true }).fill(displayName);
    await page.getByPlaceholder('Evening & late-night appointments', { exact: true }).fill(headline);
    await page.getByPlaceholder('Berlin Mitte', { exact: true }).fill(locationLabel);
    await page.getByPlaceholder('luna-massage', { exact: true }).fill(publicSlug);
    await screenshot(page, runId, '07-profile-edit');

    await clickButton(page, 'Save profile');
    await page.getByText('Profile saved.', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });

    const publicPage = await context.newPage();
    wireConsole(publicPage, consoleMessages);
    await publicPage.goto(`${baseURL}/p/${publicSlug}`, { waitUntil: 'domcontentloaded' });
    await publicPage.getByText('Adults only', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await screenshot(publicPage, runId, '08-public-profile-gate');

    await clickButton(publicPage, 'View profile');
    await publicPage.getByText(displayName, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
    await publicPage.getByText(headline, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await publicPage.getByText(locationLabel, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await publicPage.getByText(`@${publicSlug}`, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await publicPage.getByRole('button', { name: 'Open web chat' }).waitFor({ state: 'visible', timeout: 15000 });
    await screenshot(publicPage, runId, '09-public-profile-live');

    const chatPagePromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
    await publicPage.getByRole('button', { name: 'Open web chat' }).click();
    const chatPage = (await chatPagePromise) ?? publicPage;
    await chatPage.waitForLoadState('domcontentloaded');
    await chatPage.getByPlaceholder('Type a message…').waitFor({ state: 'visible', timeout: 15000 });

    const chatUrl = new URL(chatPage.url());
    if (!chatUrl.pathname.endsWith('/chat.html')) {
      await fail(chatPage, runId, `Expected chat handoff to /chat.html, saw ${chatPage.url()}`);
    }
    if (chatUrl.searchParams.get('slug') !== publicSlug) {
      await fail(chatPage, runId, `Expected chat slug ${publicSlug}, saw ${chatUrl.searchParams.get('slug')}`);
    }
    if (chatUrl.searchParams.get('brand') !== displayName) {
      await fail(chatPage, runId, `Expected chat brand ${displayName}, saw ${chatUrl.searchParams.get('brand')}`);
    }

    await chatPage.locator('#brand').getByText(displayName, { exact: true }).waitFor({
      state: 'visible',
      timeout: 15000,
    });
    await screenshot(chatPage, runId, '10-public-profile-chat-handoff');

    console.log('Playwright public profile validation passed.');
    console.log(`Email: ${email}`);
    console.log(`Slug: ${publicSlug}`);
  } finally {
    await updateProviderProfile(email, {
      business_name: originalProfile.business_name,
      display_name: originalProfile.display_name,
      headline: originalProfile.headline,
      location_label: originalProfile.location_label,
      slug: originalProfile.slug,
      published: originalProfile.published,
      age_gate_required: originalProfile.age_gate_required,
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
