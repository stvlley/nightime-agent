#!/usr/bin/env node
import { chromium } from '@playwright/test';
import {
  clickButton,
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
const gatedSlug = process.env.E2E_AGE_GATE_SLUG ?? `gated-profile-${runStamp}`;
const gatedBusinessName = process.env.E2E_AGE_GATE_BUSINESS ?? 'Gated Moonlight Studio';
const gatedDisplayName = process.env.E2E_AGE_GATE_DISPLAY ?? 'Nina Gate Check';
const gatedHeadline = process.env.E2E_AGE_GATE_HEADLINE ?? 'Protected late-night appointment headline';
const gatedLocation = process.env.E2E_AGE_GATE_LOCATION ?? 'Protected Lower East Side';

async function assertNotVisible(page, runId, text) {
  const count = await page.getByText(text, { exact: true }).count();
  if (count > 0) {
    await fail(page, runId, `Age gate leaked protected profile text before confirmation: ${text}`);
  }
}

async function main() {
  const { runId, consoleMessages } = createRunContext('public-profile-age-gate');
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
      business_name: gatedBusinessName,
      display_name: gatedDisplayName,
      headline: gatedHeadline,
      location_label: gatedLocation,
      slug: gatedSlug,
      published: true,
      age_gate_required: true,
    });

    await page.goto(`${baseURL}/p/${gatedSlug}`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Adults only', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('Age confirmation required.', { exact: true }).waitFor({
      state: 'visible',
      timeout: 15000,
    });

    await assertNotVisible(page, runId, gatedBusinessName);
    await assertNotVisible(page, runId, gatedHeadline);
    await assertNotVisible(page, runId, gatedLocation);
    await assertNotVisible(page, runId, `@${gatedSlug}`);

    const chatButtonCount = await page.getByRole('button', { name: 'Open web chat' }).count();
    if (chatButtonCount > 0) {
      await fail(page, runId, 'Age gate exposed the webchat button before confirmation.');
    }

    await screenshot(page, runId, '01-age-gate-locked');

    await clickButton(page, 'View profile');
    await page.getByText(gatedDisplayName, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText(gatedHeadline, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText(gatedLocation, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText(`@${gatedSlug}`, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('button', { name: 'Open web chat' }).waitFor({ state: 'visible', timeout: 15000 });
    await screenshot(page, runId, '02-age-gate-unlocked');

    console.log('Playwright public profile age gate validation passed.');
    console.log(`Email: ${email}`);
    console.log(`Slug: ${gatedSlug}`);
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
