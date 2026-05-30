// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions runs in Deno (remote URL imports, Deno globals) — lint
    // it with the Supabase/Deno toolchain, not eslint-config-expo.
    ignores: ["dist/*", "supabase/functions/**"],
  }
]);
