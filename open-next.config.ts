import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No ISR (every page is per-request and private), so no incremental cache binding.
const config = defineCloudflareConfig();

// `pnpm build` is the OpenNext build, so Workers Builds' default build step
// produces the .open-next/ output its deploy step needs. OpenNext runs
// `pnpm build` internally by default, which would call itself, so the inner
// Next build is named explicitly.
config.buildCommand = "pnpm next:build";

export default config;
