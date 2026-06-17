#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const envFile = process.env.RELEASE_ENV_FILE || '.env';
const strict = process.env.RELEASE_AUDIT_STRICT !== 'false';

const results = [];

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function readTextIfExists(file) {
  const full = path.join(root, file);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
}

function parseEnv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

function getEnvMap() {
  const fileEnv = parseEnv(readTextIfExists(envFile));
  return { ...fileEnv, ...process.env };
}

function add(status, label, detail) {
  results.push({ status, label, detail });
}

function pass(label, detail) {
  add('pass', label, detail);
}

function warn(label, detail) {
  add('warn', label, detail);
}

function fail(label, detail) {
  add('fail', label, detail);
}

function requireValue(value, label, detail) {
  if (value === undefined || value === null || value === '') {
    fail(label, detail);
    return false;
  }
  pass(label, detail);
  return true;
}

function requireFile(file, label) {
  if (fs.existsSync(path.join(root, file))) {
    pass(label, file);
    return true;
  }
  fail(label, `${file} is missing.`);
  return false;
}

function isTrue(value) {
  return String(value ?? '').toLowerCase() === 'true';
}

function looksLikeUrl(value) {
  return /^https:\/\/[^.\s]+\.[^\s]+/i.test(String(value ?? ''));
}

function isLocalUrl(value) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|\.local\b/i.test(String(value ?? ''));
}

const pkg = readJson('package.json');
const appJson = readJson('app.json');
const easJson = readJson('eas.json');
const expo = appJson.expo || {};
const ios = expo.ios || {};
const android = expo.android || {};
const env = getEnvMap();

console.log(`App Store readiness audit (${strict ? 'strict' : 'non-strict'})`);
console.log(`Environment source: ${envFile}`);
console.log('');

requireValue(expo.name, 'Expo app name configured', 'app.json expo.name');
requireValue(expo.slug, 'Expo slug configured', 'app.json expo.slug');
requireValue(expo.version, 'Expo version configured', 'app.json expo.version');
requireValue(expo.owner, 'Expo owner configured', 'app.json expo.owner');
requireValue(expo.extra?.eas?.projectId, 'EAS project id configured', 'app.json expo.extra.eas.projectId');
requireValue(ios.bundleIdentifier, 'iOS bundle identifier configured', 'app.json expo.ios.bundleIdentifier');
requireValue(android.package, 'Android package configured', 'app.json expo.android.package');

if (/example|placeholder|test/i.test(ios.bundleIdentifier || '')) {
  fail('iOS bundle identifier is production-looking', `Current value: ${ios.bundleIdentifier}`);
} else {
  pass('iOS bundle identifier is production-looking', ios.bundleIdentifier);
}

requireFile(expo.icon || '', 'App icon asset exists');
if (expo.web?.favicon) requireFile(expo.web.favicon, 'Web favicon asset exists');

if (Array.isArray(expo.plugins) && expo.plugins.includes('expo-iap')) {
  pass('IAP plugin is configured', 'expo-iap is present in app.json plugins.');
} else {
  fail('IAP plugin is configured', 'expo-iap is required for native subscription flow.');
}

requireValue(
  ios.infoPlist?.NSDocumentsFolderUsageDescription,
  'Document import usage string configured',
  'Required because Training imports conversation files.'
);

if (ios.infoPlist?.ITSAppUsesNonExemptEncryption === false) {
  pass('Encryption export flag is explicit', 'ITSAppUsesNonExemptEncryption=false');
} else {
  warn('Encryption export flag is explicit', 'Confirm App Store Connect encryption answers match app behavior.');
}

if (easJson.cli?.appVersionSource === 'remote') {
  pass('EAS remote versioning configured', 'eas.json cli.appVersionSource=remote');
} else {
  warn('EAS remote versioning configured', 'Remote versioning is recommended for App Store builds.');
}

if (easJson.build?.production?.autoIncrement) {
  pass('Production build auto-increments', 'eas.json build.production.autoIncrement=true');
} else {
  fail('Production build auto-increments', 'Set build.production.autoIncrement=true.');
}

if (easJson.build?.production?.ios?.simulator === false) {
  pass('Production iOS build targets devices', 'eas.json build.production.ios.simulator=false');
} else {
  fail('Production iOS build targets devices', 'Production iOS builds must not be simulator builds.');
}

if (isTrue(env.EXPO_PUBLIC_BYPASS_PAYWALL)) {
  fail('Paywall bypass disabled', 'EXPO_PUBLIC_BYPASS_PAYWALL must be unset or false for App Store builds.');
} else {
  pass('Paywall bypass disabled', 'EXPO_PUBLIC_BYPASS_PAYWALL is not true.');
}

if (isTrue(env.EXPO_PUBLIC_ALLOW_DEMO_ENTITLEMENT)) {
  fail('Demo entitlement disabled', 'EXPO_PUBLIC_ALLOW_DEMO_ENTITLEMENT must be false for App Store builds.');
} else {
  pass('Demo entitlement disabled', 'EXPO_PUBLIC_ALLOW_DEMO_ENTITLEMENT is not true.');
}

if (requireValue(env.EXPO_PUBLIC_SUPABASE_URL, 'Production Supabase URL configured', 'EXPO_PUBLIC_SUPABASE_URL')) {
  if (!looksLikeUrl(env.EXPO_PUBLIC_SUPABASE_URL)) {
    fail('Production Supabase URL is HTTPS', 'EXPO_PUBLIC_SUPABASE_URL must be an https:// URL.');
  } else if (isLocalUrl(env.EXPO_PUBLIC_SUPABASE_URL)) {
    fail('Production Supabase URL is not local', 'Do not ship localhost or local Supabase URLs.');
  } else {
    pass('Production Supabase URL is HTTPS and non-local', 'EXPO_PUBLIC_SUPABASE_URL looks deployable.');
  }
}

requireValue(env.EXPO_PUBLIC_SUPABASE_ANON_KEY, 'Supabase anon key configured', 'EXPO_PUBLIC_SUPABASE_ANON_KEY');

for (const key of Object.keys(env)) {
  if (/SERVICE_ROLE|DATABASE_URL|OAUTH_CLIENT_SECRET|APP_SECRET|ANTHROPIC_API_KEY/i.test(key) && key.startsWith('EXPO_PUBLIC_')) {
    fail('No public client secrets', `${key} must not be exposed with EXPO_PUBLIC_.`);
  }
}
if (!results.some((r) => r.status === 'fail' && r.label === 'No public client secrets')) {
  pass('No public client secrets', 'No dangerous EXPO_PUBLIC_ secret names found.');
}

const annualId = env.EXPO_PUBLIC_STOREKIT_ANNUAL_PRODUCT_ID;
const monthlyId = env.EXPO_PUBLIC_STOREKIT_MONTHLY_PRODUCT_ID;
if (!annualId || !monthlyId) {
  fail('StoreKit product ids configured', 'Set annual and monthly product ids before native subscription testing.');
} else {
  pass('StoreKit product ids configured', 'Annual and monthly product ids are present.');
  if (annualId === 'nightime_annual' || monthlyId === 'nightime_monthly') {
    warn('StoreKit product ids are not defaults', 'Default ids are acceptable only if they exactly match App Store Connect.');
  } else {
    pass('StoreKit product ids are not defaults', 'Product ids are custom values.');
  }
}

const requiredScripts = ['typecheck', 'lint', 'test', 'e2e:settings-surfaces:headless', 'e2e:agent-contract:headless'];
for (const script of requiredScripts) {
  if (pkg.scripts?.[script]) pass(`npm script exists: ${script}`, pkg.scripts[script]);
  else fail(`npm script exists: ${script}`, `Missing package.json script: ${script}`);
}

requireFile('docs/app-store-release-checklist.md', 'Manual App Store checklist exists');

console.log('');
for (const result of results) {
  const marker = result.status === 'pass' ? 'PASS' : result.status === 'warn' ? 'WARN' : 'FAIL';
  console.log(`${marker} ${result.label}`);
  if (result.detail) console.log(`     ${result.detail}`);
}

const failures = results.filter((result) => result.status === 'fail');
const warnings = results.filter((result) => result.status === 'warn');
console.log('');
console.log(`Summary: ${results.length - failures.length - warnings.length} passed, ${warnings.length} warnings, ${failures.length} failures.`);

if (failures.length > 0 && strict) {
  console.log('');
  console.log('Release audit failed. Fix FAIL items before building/submitting to App Store.');
  process.exit(1);
}

if (warnings.length > 0) {
  console.log('Review WARN items before TestFlight/App Store submission.');
}
