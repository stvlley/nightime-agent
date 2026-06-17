#!/usr/bin/env node
import { chromium } from '@playwright/test';
import {
  createRunContext,
  fail,
  getProviderProfile,
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

const runStamp = Date.now();
const publicSlug = process.env.E2E_NO_AGE_GATE_SLUG ?? `direct-profile-${runStamp}`;
const businessName = process.env.E2E_NO_AGE_GATE_BUSINESS ?? 'Direct Moonlight Studio';
const displayName = process.env.E2E_NO_AGE_GATE_DISPLAY ?? 'Nina Direct View';
const headline = process.env.E2E_NO_AGE_GATE_HEADLINE ?? 'Direct late-night appointment headline';
const locationLabel = process.env.E2E_NO_AGE_GATE_LOCATION ?? 'Direct Lower East Side';

async function assertNotVisible(page, runId, text) {
  const count = await page.getByText(text, { exact: true }).count();
  if (count > 0) {
    await fail(page, runId, `Non-age-gated profile unexpectedly showed gate text: ${text}`);
  }
}

async function main() {
  const { runId, consoleMessages } = createRunContext('public-profile-no-age-gate');
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
      business_name: businessName,
      display_name: displayName,
      headline,
      location_label: locationLabel,
      slug: publicSlug,
      published: true,
      age_gate_required: false,
    });

    await page.goto(`${baseURL}/p/${publicSlug}`, { waitUntil: 'domcontentloaded' });

    await page.getByText(displayName, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText(headline, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText(locationLabel, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText(`@${publicSlug}`, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('button', { name: 'Open web chat' }).waitFor({ state: 'visible', timeout: 15000 });

    await assertNotVisible(page, runId, 'Adults only');
    await assertNotVisible(page, runId, 'Age confirmation required.');
    const viewProfileCount = await page.getByRole('button', { name: 'View profile' }).count();
    if (viewProfileCount > 0) {
      await fail(page, runId, 'Non-age-gated profile required a View profile confirmation.');
    }

    await screenshot(page, runId, '01-no-age-gate-direct');

    console.log('Playwright public profile no-age-gate validation passed.');
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
