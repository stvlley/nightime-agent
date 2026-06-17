import fs from 'node:fs/promises';
import path from 'node:path';

export const outputDir = path.resolve('test-results/playwright');

let envCache = null;

async function loadEnv() {
  if (envCache) return envCache;
  const text = await fs.readFile(path.resolve('.env'), 'utf8');
  envCache = Object.fromEntries(
    text
      .split('\n')
      .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].trim()])
  );
  return envCache;
}

async function getAdminUserByEmail(email) {
  const env = await loadEnv();
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase env vars required for admin lookup.');
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  const userRes = await fetch(`${url}/auth/v1/admin/users`, { headers });
  if (!userRes.ok) {
    throw new Error(`admin/users -> ${userRes.status}`);
  }
  const { users } = await userRes.json();
  const user = users.find((candidate) => candidate.email === email);
  if (!user) {
    throw new Error(`No auth user with email ${email}`);
  }

  return { env, headers, user };
}

export function createRunContext(prefix = 'run') {
  return {
    runId: `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    consoleMessages: [],
  };
}

export async function screenshot(page, runId, name) {
  await fs.mkdir(outputDir, { recursive: true });
  const file = path.join(outputDir, `${runId}-${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true });
    return file;
  } catch {
    await page.screenshot({ path: file });
    return file;
  }
}

export async function fail(page, runId, message) {
  const file = await screenshot(page, runId, 'failure');
  throw new Error(`${message}\nScreenshot: ${file}\nURL: ${page.url()}`);
}

export function wireConsole(page, consoleMessages) {
  page.on('console', (message) => {
    const line = `[${message.type()}] ${message.text()}`;
    consoleMessages.push(line);
    console.log(line);
  });
  page.on('pageerror', (error) => {
    const line = `[pageerror] ${error.message}`;
    consoleMessages.push(line);
    console.error(line);
  });
}

export async function writeConsoleLog(runId, consoleMessages) {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, `${runId}-console.log`), consoleMessages.join('\n'));
}

export async function clickText(page, text, options = {}) {
  const target =
    text instanceof RegExp
      ? page.getByText(text).first()
      : page.getByText(text, { exact: options.exact ?? true }).first();
  await target.waitFor({ state: 'visible', timeout: options.timeout ?? 15000 });
  await target.click();
}

export async function clickButton(page, name, options = {}) {
  const target = page.getByRole('button', { name, exact: options.exact ?? true }).first();
  await target.waitFor({ state: 'visible', timeout: options.timeout ?? 15000 });
  await target.click();
}

export async function continueStep(page, expectedTitle, answerText) {
  await page.getByText(expectedTitle, { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  if (answerText) {
    await clickText(page, answerText);
  }
  await clickButton(page, 'Continue');
}

function slugifyHandle(input) {
  return (
    input
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'provider'
  );
}

function randomHexSecret(bytes = 16) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

export async function ensureWebchatEnabled(email) {
  const { env, headers, user } = await getAdminUserByEmail(email);
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !anonKey) {
    throw new Error('Missing Supabase env vars required to pre-enable web chat.');
  }

  const profileRes = await fetch(
    `${url}/rest/v1/profiles?id=eq.${user.id}&select=id,email,slug,business_name,display_name`,
    { headers }
  );
  if (!profileRes.ok) {
    throw new Error(`profiles select -> ${profileRes.status}`);
  }
  const [profile] = await profileRes.json();
  const slug = profile?.slug || slugifyHandle(profile?.business_name || profile?.display_name || email);

  const profileUpsertRes = await fetch(`${url}/rest/v1/profiles?on_conflict=id`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      id: user.id,
      email: profile?.email ?? email,
      business_name: profile?.business_name ?? 'Provider Demo',
      display_name: profile?.display_name ?? 'Provider Demo',
      slug,
    }),
  });
  if (!profileUpsertRes.ok) {
    throw new Error(`profiles upsert -> ${profileUpsertRes.status}`);
  }

  const channelRes = await fetch(`${url}/rest/v1/agent_channels?on_conflict=user_id,channel`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      user_id: user.id,
      channel: 'webchat',
      external_account_id: slug,
      webhook_secret: randomHexSecret(16),
      active: true,
    }),
  });
  if (!channelRes.ok) {
    throw new Error(`agent_channels upsert -> ${channelRes.status}`);
  }

  const functionsBase = `${url.replace(/\/$/, '')}/functions/v1`;
  const brand = encodeURIComponent(profile?.display_name || profile?.business_name || 'Chat');
  return `http://localhost:8081/chat.html?slug=${encodeURIComponent(slug)}&base=${encodeURIComponent(functionsBase)}&key=${encodeURIComponent(anonKey)}&brand=${brand}`;
}

export async function getFunctionsBase() {
  const env = await loadEnv();
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL for functions base.');
  }
  return `${url.replace(/\/$/, '')}/functions/v1`;
}

export async function getProviderProfile(email) {
  const { env, headers, user } = await getAdminUserByEmail(email);
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const profileRes = await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}&select=*`, { headers });
  if (!profileRes.ok) {
    throw new Error(`profiles select -> ${profileRes.status}`);
  }
  const [profile] = await profileRes.json();
  if (!profile) {
    throw new Error(`No profile found for ${email}`);
  }
  return profile;
}

export async function updateProviderProfile(email, patch) {
  const { env, headers, user } = await getAdminUserByEmail(email);
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const updateRes = await fetch(`${url}/rest/v1/profiles?id=eq.${user.id}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!updateRes.ok) {
    throw new Error(`profiles update -> ${updateRes.status}`);
  }
  return user.id;
}

export async function seedCalendarBooking(email) {
  const { env, headers, user } = await getAdminUserByEmail(email);
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const now = new Date();
  const start = new Date(now);
  start.setHours(10, 0, 0, 0);
  if (start.getTime() <= now.getTime()) {
    start.setHours(now.getHours() + 1, 0, 0, 0);
  }
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 60);
  const externalThreadId = `calendar-e2e-${Date.now()}`;

  const threadRes = await fetch(`${url}/rest/v1/threads`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: user.id,
      channel: 'webchat',
      external_thread_id: externalThreadId,
      client_handle: 'Calendar E2E Client',
      state: 'confirmed',
      last_activity_at: new Date().toISOString(),
    }),
  });
  if (!threadRes.ok) {
    throw new Error(`calendar thread insert -> ${threadRes.status}`);
  }
  const [thread] = await threadRes.json();

  const bookingRes = await fetch(`${url}/rest/v1/bookings`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: user.id,
      thread_id: thread.id,
      start: start.toISOString(),
      end: end.toISOString(),
      status: 'confirmed',
      client_name: 'Calendar E2E Client',
      client_contact: 'calendar-e2e@example.com',
      source: 'manual',
      amount_cents: 8000,
      deposit_cents: 0,
      currency: 'USD',
      payment_status: 'none',
    }),
  });
  if (!bookingRes.ok) {
    throw new Error(`calendar booking insert -> ${bookingRes.status}`);
  }

  return {
    clientName: 'Calendar E2E Client',
    timeLabel: start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    duration: '60 min',
  };
}

export async function updateProviderPreferences(email, patch) {
  const { env, headers, user } = await getAdminUserByEmail(email);
  const url = env.EXPO_PUBLIC_SUPABASE_URL;

  const prefRes = await fetch(`${url}/rest/v1/provider_preferences?on_conflict=user_id`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      user_id: user.id,
      ...patch,
    }),
  });
  if (!prefRes.ok) {
    throw new Error(`provider_preferences upsert -> ${prefRes.status}`);
  }

  return user.id;
}

export async function setFaqEnabledByTrigger(email, trigger, enabled) {
  const { env, headers, user } = await getAdminUserByEmail(email);
  const url = env.EXPO_PUBLIC_SUPABASE_URL;

  const selectParams = new URLSearchParams({
    select: 'id',
    user_id: `eq.${user.id}`,
    trigger: `eq.${trigger}`,
    limit: '1',
  });
  const selectRes = await fetch(`${url}/rest/v1/faq?${selectParams.toString()}`, { headers });
  if (!selectRes.ok) {
    throw new Error(`faq select -> ${selectRes.status}`);
  }
  const [faq] = await selectRes.json();
  if (!faq?.id) {
    throw new Error(`No FAQ found with trigger "${trigger}"`);
  }

  const updateRes = await fetch(`${url}/rest/v1/faq?id=eq.${faq.id}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ enabled }),
  });
  if (!updateRes.ok) {
    throw new Error(`faq update -> ${updateRes.status}`);
  }

  return faq.id;
}

export async function findThreadForInboundMessage(email, inboundText) {
  const env = await loadEnv();
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase env vars required to resolve thread details.');
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  const userRes = await fetch(`${url}/auth/v1/admin/users`, { headers });
  if (!userRes.ok) {
    throw new Error(`admin/users -> ${userRes.status}`);
  }
  const { users } = await userRes.json();
  const user = users.find((candidate) => candidate.email === email);
  if (!user) {
    throw new Error(`No auth user with email ${email}`);
  }

  let message = null;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const messageParams = new URLSearchParams({
      select: 'thread_id',
      user_id: `eq.${user.id}`,
      direction: 'eq.in',
      text: `eq.${inboundText}`,
      order: 'created_at.desc',
      limit: '1',
    });
    const messageRes = await fetch(`${url}/rest/v1/messages?${messageParams.toString()}`, { headers });
    if (!messageRes.ok) {
      throw new Error(`messages select -> ${messageRes.status}`);
    }
    [message] = await messageRes.json();
    if (message?.thread_id) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!message?.thread_id) {
    throw new Error(`No inbound message found for "${inboundText}"`);
  }

  const threadParams = new URLSearchParams({
    select: 'id,client_handle',
    id: `eq.${message.thread_id}`,
    limit: '1',
  });
  const threadRes = await fetch(`${url}/rest/v1/threads?${threadParams.toString()}`, { headers });
  if (!threadRes.ok) {
    throw new Error(`threads select -> ${threadRes.status}`);
  }
  const [thread] = await threadRes.json();
  if (!thread?.id || !thread?.client_handle) {
    throw new Error(`No thread found for message "${inboundText}"`);
  }

  return {
    threadId: thread.id,
    clientHandle: thread.client_handle,
  };
}

export async function waitForPendingDraftForInboundMessage(email, inboundText) {
  const env = await loadEnv();
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase env vars required to resolve pending drafts.');
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  const { threadId } = await findThreadForInboundMessage(email, inboundText);
  let draft = null;
  const deadline = Date.now() + 30000;

  while (Date.now() < deadline) {
    const messageParams = new URLSearchParams({
      select: 'id,text,approval_status,response_source',
      thread_id: `eq.${threadId}`,
      direction: 'eq.out',
      approval_status: 'eq.pending',
      order: 'created_at.desc',
      limit: '1',
    });
    const messageRes = await fetch(`${url}/rest/v1/messages?${messageParams.toString()}`, { headers });
    if (!messageRes.ok) {
      throw new Error(`pending draft select -> ${messageRes.status}`);
    }
    [draft] = await messageRes.json();
    if (draft?.id) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!draft?.id) {
    throw new Error(`No pending draft found for "${inboundText}"`);
  }

  return {
    threadId,
    messageId: draft.id,
    text: draft.text ?? '',
    source: draft.response_source ?? null,
  };
}

export async function approveWebchatDraftForInboundMessage(email, inboundText) {
  const env = await loadEnv();
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase env vars required to approve webchat drafts.');
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };

  const { threadId, messageId } = await waitForPendingDraftForInboundMessage(email, inboundText);

  const updateRes = await fetch(`${url}/rest/v1/messages?id=eq.${messageId}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      approval_status: 'sent',
      delivered_at: new Date().toISOString(),
    }),
  });
  if (!updateRes.ok) {
    throw new Error(`draft update -> ${updateRes.status}`);
  }

  const eventRes = await fetch(`${url}/rest/v1/agent_events`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: (await (async () => {
        const userRes = await fetch(`${url}/auth/v1/admin/users`, { headers });
        if (!userRes.ok) throw new Error(`admin/users -> ${userRes.status}`);
        const { users } = await userRes.json();
        const user = users.find((candidate) => candidate.email === email);
        if (!user) throw new Error(`No auth user with email ${email}`);
        return user.id;
      })()),
      thread_id: threadId,
      message_id: messageId,
      kind: 'sent',
      source: 'approval',
    }),
  });
  if (!eventRes.ok) {
    throw new Error(`agent_events insert -> ${eventRes.status}`);
  }

  return { threadId, messageId };
}

export async function signUpThroughPaywallToDashboard(page, options) {
  const { runId, baseURL, email, password, businessName } = options;

  console.log(`Opening ${baseURL}`);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await screenshot(page, runId, '01-landing');

  await clickButton(page, 'Create provider account', { exact: false });
  await page.getByText('Create your provider account', { exact: true }).waitFor({ state: 'visible' });
  await page.getByPlaceholder('Nightime Studio').fill(businessName);
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('At least 8 characters').fill(password);
  await screenshot(page, runId, '02-signup-modal');
  await clickButton(page, 'Create account');
  await completeOnboardingFlow(page, { runId });
  await advancePastPaywall(page, { runId });
}

export async function logInProvider(page, options) {
  const { runId, baseURL, email, password } = options;

  console.log(`Opening ${baseURL}`);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await screenshot(page, runId, '01-landing');

  await clickButton(page, 'Log in');
  await page.getByPlaceholder('you@example.com').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await screenshot(page, runId, '02-login-modal');
  await page
    .getByRole('button', { name: 'Log in', exact: true })
    .last()
    .click();
}

export async function completeOnboardingFlow(page, options) {
  const { runId } = options;

  await page.getByText('Make missed messages measurable', { exact: true }).waitFor({
    state: 'visible',
    timeout: 30000,
  });
  await screenshot(page, runId, '03-onboarding-start');

  await clickButton(page, 'Start 2-minute checkup');
  await continueStep(page, 'What kind of provider are you?', 'Independent wellness provider');
  await continueStep(page, 'Where do clients message you now?', 'Website chat');
  await continueStep(page, 'How many inbound messages arrive daily?', /6.15 messages/);
  await continueStep(page, 'How fast do you usually reply?', 'Within an hour');
  await continueStep(page, 'What is one converted client worth?', '$180');
  await continueStep(page, 'Which questions repeat the most?', 'Pricing or packages');
  await continueStep(page, 'How cautious should the assistant be?', 'Auto-answer safe FAQs, hold the rest');
  await page.getByText('Your message assistant plan is ready', { exact: true }).waitFor({ state: 'visible' });
  await clickButton(page, 'See trial options');
  await page.getByText('Try the assistant free first', { exact: true }).waitFor({ state: 'visible' });
  await clickButton(page, 'Continue');
  await page.getByText('We remind you before renewal', { exact: true }).waitFor({ state: 'visible' });
  await clickButton(page, 'View trial');
}

export async function advancePastPaywall(page, options) {
  const { runId } = options;

  await page.getByText('Start your 7-day free trial', { exact: true }).waitFor({ state: 'visible' });
  await screenshot(page, runId, '04-paywall');
  await clickButton(page, 'Start free trial');

  const verifying = page.getByText('Verifying...', { exact: true });
  const handoff = page.getByText('Now configure your assistant', { exact: true });
  const dashboard = page.getByText('Dashboard', { exact: true });

  const outcome = await Promise.race([
    handoff.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'handoff'),
    dashboard.waitFor({ state: 'visible', timeout: 15000 }).then(() => 'dashboard'),
    page
      .getByText('Could not start the trial.', { exact: false })
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => 'error'),
  ]).catch(() => 'timeout');

  await screenshot(page, runId, `05-after-trial-${outcome}`);

  if (outcome === 'timeout') {
    const isStillVerifying = await verifying.isVisible().catch(() => false);
    await fail(page, runId, isStillVerifying ? 'Paywall is still stuck on Verifying...' : 'Paywall did not advance in time.');
  }

  if (outcome === 'error') {
    await fail(page, runId, 'Paywall surfaced a trial error.');
  }

  if (outcome === 'handoff') {
    await clickButton(page, 'Open dashboard');
  }

  await page.getByText('Dashboard', { exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  await screenshot(page, runId, '06-dashboard');
}
