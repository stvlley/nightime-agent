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
const hiddenSlug = process.env.E2E_UNPUBLISHED_SLUG ?? `hidden-profile-${runStamp}`;
const hiddenBusinessName = process.env.E2E_UNPUBLISHED_BUSINESS ?? 'Hidden Moonlight Studio';
const hiddenDisplayName = process.env.E2E_UNPUBLISHED_DISPLAY ?? 'Private Nina';
const hiddenHeadline = process.env.E2E_UNPUBLISHED_HEADLINE ?? 'This headline must stay hidden';
const hiddenLocation = process.env.E2E_UNPUBLISHED_LOCATION ?? 'Hidden Lower East Side';

async function assertNotVisible(page, runId, text) {
  const count = await page.getByText(text, { exact: true }).count();
  if (count > 0) {
    await fail(page, runId, `Unpublished public profile leaked text: ${text}`);
  }
}

async function main() {
  const { runId, consoleMessages } = createRunContext('public-profile-unpublished');
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
      business_name: hiddenBusinessName,
      display_name: hiddenDisplayName,
      headline: hiddenHeadline,
      location_label: hiddenLocation,
      slug: hiddenSlug,
      published: false,
      age_gate_required: true,
    });

    await page.goto(`${baseURL}/p/${hiddenSlug}`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Profile not found', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('No public profile here', { exact: true }).waitFor({
      state: 'visible',
      timeout: 15000,
    });

    await assertNotVisible(page, runId, hiddenBusinessName);
    await assertNotVisible(page, runId, hiddenDisplayName);
    await assertNotVisible(page, runId, hiddenHeadline);
    await assertNotVisible(page, runId, hiddenLocation);
    await assertNotVisible(page, runId, `@${hiddenSlug}`);

    const chatButtonCount = await page.getByRole('button', { name: 'Open web chat' }).count();
    if (chatButtonCount > 0) {
      await fail(page, runId, 'Unpublished public profile exposed the webchat button.');
    }

    await screenshot(page, runId, '01-unpublished-hidden');

    console.log('Playwright unpublished public profile validation passed.');
    console.log(`Email: ${email}`);
    console.log(`Slug: ${hiddenSlug}`);
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
