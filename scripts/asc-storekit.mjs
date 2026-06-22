#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';

const API_BASE = 'https://api.appstoreconnect.apple.com/v1';

const config = {
  appName: process.env.ASC_APP_NAME || 'Nitime',
  bundleId: process.env.ASC_BUNDLE_ID || 'com.nightime.agent',
  sku: process.env.ASC_SKU || 'nitime-agent-ios',
  primaryLocale: process.env.ASC_PRIMARY_LOCALE || 'en-US',
  subscriptionGroupName: process.env.ASC_SUBSCRIPTION_GROUP || 'Nitime',
  products: [
    {
      id: process.env.EXPO_PUBLIC_STOREKIT_ANNUAL_PRODUCT_ID || 'nitime_annual',
      name: process.env.ASC_ANNUAL_REFERENCE_NAME || 'Nitime Annual',
      period: 'ONE_YEAR',
      note: '$299/year, add 7-day introductory trial in App Store Connect',
    },
    {
      id: process.env.EXPO_PUBLIC_STOREKIT_MONTHLY_PRODUCT_ID || 'nitime_monthly',
      name: process.env.ASC_MONTHLY_REFERENCE_NAME || 'Nitime Monthly',
      period: 'ONE_MONTH',
      note: '$39/month',
    },
  ],
};

const command = process.argv[2] || 'help';

function usage() {
  console.log(`Usage:
  npm run storekit:asc -- self-test
  npm run storekit:asc -- check
  npm run storekit:asc -- setup
  npm run storekit:asc -- eas-env [preview|production]

App Store Connect auth env:
  ASC_KEY_ID=<key-id>
  ASC_ISSUER_ID=<issuer-id>
  ASC_PRIVATE_KEY_PATH=/absolute/path/AuthKey_<key-id>.p8

Optional app env:
  ASC_APP_NAME=${config.appName}
  ASC_BUNDLE_ID=${config.bundleId}
  ASC_SKU=${config.sku}
  ASC_PRIMARY_LOCALE=${config.primaryLocale}
  ASC_SUBSCRIPTION_GROUP=${config.subscriptionGroupName}

Optional CLI env:
  EAS_BIN="npx eas-cli"
`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function readAuth() {
  const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY_PATH } = process.env;
  const missing = [];

  if (!ASC_KEY_ID) missing.push('ASC_KEY_ID');
  if (!ASC_ISSUER_ID) missing.push('ASC_ISSUER_ID');
  if (!ASC_PRIVATE_KEY_PATH) missing.push('ASC_PRIVATE_KEY_PATH');

  if (missing.length > 0) {
    throw new Error(`Missing App Store Connect auth env: ${missing.join(', ')}`);
  }

  return {
    keyId: ASC_KEY_ID,
    issuerId: ASC_ISSUER_ID,
    privateKey: fs.readFileSync(ASC_PRIVATE_KEY_PATH, 'utf8'),
  };
}

function createJwt({ keyId, issuerId, privateKey }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = {
    aud: 'appstoreconnect-v1',
    exp: now + 20 * 60,
    iat: now,
    iss: issuerId,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(payload),
  )}`;
  const signature = crypto.sign('sha256', Buffer.from(unsigned), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });

  return `${unsigned}.${base64Url(signature)}`;
}

function formatApiError(body) {
  if (!body?.errors) return JSON.stringify(body);

  return body.errors
    .map((error) =>
      [
        error.status ? `status ${error.status}` : undefined,
        error.code,
        error.title,
        error.detail,
      ]
        .filter(Boolean)
        .join(' - '),
    )
    .join('\n');
}

async function request(token, method, path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(`${method} ${path} failed:\n${formatApiError(data)}`);
  }

  return data;
}

async function requestAll(token, path) {
  const items = [];
  let nextPath = path;

  while (nextPath) {
    const page = await request(token, 'GET', nextPath);
    items.push(...(Array.isArray(page.data) ? page.data : []));
    nextPath = page.links?.next
      ? page.links.next.replace(API_BASE, '')
      : undefined;
  }

  return items;
}

async function findApp(token) {
  const apps = await requestAll(
    token,
    `/apps?filter[bundleId]=${encodeURIComponent(config.bundleId)}`,
  );

  return apps[0];
}

async function createApp(token) {
  return request(token, 'POST', '/apps', {
    data: {
      type: 'apps',
      attributes: {
        bundleId: config.bundleId,
        name: config.appName,
        primaryLocale: config.primaryLocale,
        sku: config.sku,
      },
    },
  }).then((payload) => payload.data);
}

async function findSubscriptionGroup(token, appId) {
  const groups = await requestAll(token, `/apps/${appId}/subscriptionGroups`);

  return groups.find(
    (group) => group.attributes?.referenceName === config.subscriptionGroupName,
  );
}

async function createSubscriptionGroup(token, appId) {
  return request(token, 'POST', '/subscriptionGroups', {
    data: {
      type: 'subscriptionGroups',
      attributes: {
        referenceName: config.subscriptionGroupName,
      },
      relationships: {
        app: {
          data: {
            id: appId,
            type: 'apps',
          },
        },
      },
    },
  }).then((payload) => payload.data);
}

async function findSubscriptions(token, groupId) {
  return requestAll(token, `/subscriptionGroups/${groupId}/subscriptions`);
}

async function createSubscription(token, groupId, product) {
  return request(token, 'POST', '/subscriptions', {
    data: {
      type: 'subscriptions',
      attributes: {
        familySharable: false,
        name: product.name,
        productId: product.id,
        subscriptionPeriod: product.period,
      },
      relationships: {
        group: {
          data: {
            id: groupId,
            type: 'subscriptionGroups',
          },
        },
      },
    },
  }).then((payload) => payload.data);
}

function printConfig() {
  console.log(`App: ${config.appName}`);
  console.log(`Bundle ID: ${config.bundleId}`);
  console.log(`SKU: ${config.sku}`);
  console.log(`Subscription group: ${config.subscriptionGroupName}`);
  console.log('Products:');
  for (const product of config.products) {
    console.log(`- ${product.id}: ${product.name}, ${product.period}`);
  }
}

async function check() {
  const token = createJwt(readAuth());

  printConfig();

  const app = await findApp(token);
  if (!app) {
    console.log('App Store Connect app: missing');
    return;
  }

  console.log(`App Store Connect app: found ${app.id}`);

  const group = await findSubscriptionGroup(token, app.id);
  if (!group) {
    console.log('Subscription group: missing');
    return;
  }

  console.log(`Subscription group: found ${group.id}`);

  const subscriptions = await findSubscriptions(token, group.id);
  for (const product of config.products) {
    const subscription = subscriptions.find(
      (item) => item.attributes?.productId === product.id,
    );
    console.log(
      `${product.id}: ${subscription ? `found ${subscription.id}` : 'missing'}`,
    );
  }
}

async function setup() {
  const token = createJwt(readAuth());

  printConfig();

  let app = await findApp(token);
  if (!app) {
    app = await createApp(token);
    console.log(`App Store Connect app: created ${app.id}`);
  } else {
    console.log(`App Store Connect app: found ${app.id}`);
  }

  let group = await findSubscriptionGroup(token, app.id);
  if (!group) {
    group = await createSubscriptionGroup(token, app.id);
    console.log(`Subscription group: created ${group.id}`);
  } else {
    console.log(`Subscription group: found ${group.id}`);
  }

  const subscriptions = await findSubscriptions(token, group.id);
  for (const product of config.products) {
    const existing = subscriptions.find(
      (item) => item.attributes?.productId === product.id,
    );
    if (existing) {
      console.log(`${product.id}: found ${existing.id}`);
      continue;
    }

    const created = await createSubscription(token, group.id, product);
    console.log(`${product.id}: created ${created.id}`);
  }

  console.log('\nFinish in App Store Connect:');
  for (const product of config.products) {
    console.log(`- ${product.id}: ${product.note}`);
  }
  console.log('- Add display localizations and review screenshots.');
  console.log('- Mark subscriptions Ready to Submit.');
}

function runEasEnv() {
  const environment = process.argv[3] || 'production';
  const allowed = new Set(['development', 'preview', 'production']);

  assert(
    allowed.has(environment),
    `Unknown EAS environment "${environment}". Use development, preview, or production.`,
  );

  const [easBin, ...easBaseArgs] = (process.env.EAS_BIN || 'npx eas-cli')
    .split(/\s+/)
    .filter(Boolean);
  const values = {
    EXPO_PUBLIC_BYPASS_PAYWALL: 'false',
    EXPO_PUBLIC_ALLOW_DEMO_ENTITLEMENT: 'false',
    EXPO_PUBLIC_STOREKIT_ANNUAL_PRODUCT_ID: config.products[0].id,
    EXPO_PUBLIC_STOREKIT_MONTHLY_PRODUCT_ID: config.products[1].id,
  };

  for (const [name, value] of Object.entries(values)) {
    const result = spawnSync(
      easBin,
      [
        ...easBaseArgs,
        'env:create',
        environment,
        '--name',
        name,
        '--value',
        value,
        '--visibility',
        'plaintext',
        '--force',
        '--non-interactive',
      ],
      { stdio: 'inherit' },
    );

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(`${[easBin, ...easBaseArgs].join(' ')} env:create failed for ${name}`);
    }
  }
}

function selfTest() {
  assert(base64Url('?>') === 'Pz4', 'base64url encodes URL-safe output');
  assert(config.bundleId === 'com.nightime.agent', 'default bundle ID changed');
  assert(config.products.length === 2, 'expected two subscription products');
  assert(
    config.products[0].id === 'nitime_annual' &&
      config.products[1].id === 'nitime_monthly',
    'default product IDs changed',
  );

  const { privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });
  const jwt = createJwt({
    keyId: 'TESTKEY123',
    issuerId: '00000000-0000-0000-0000-000000000000',
    privateKey,
  });
  assert(jwt.split('.').length === 3, 'JWT has three segments');
  assert(
    Buffer.from(jwt.split('.')[2], 'base64url').length === 64,
    'ES256 signature is JOSE raw format',
  );

  console.log('asc-storekit self-test passed');
}

async function main() {
  if (command === 'help' || command === '--help' || command === '-h') {
    usage();
    return;
  }
  if (command === 'self-test') {
    selfTest();
    return;
  }
  if (command === 'check') {
    await check();
    return;
  }
  if (command === 'setup') {
    await setup();
    return;
  }
  if (command === 'eas-env') {
    runEasEnv();
    return;
  }

  usage();
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
