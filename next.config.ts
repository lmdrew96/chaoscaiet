import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

// Lets `next dev` see the Worker's bindings.
initOpenNextCloudflareForDev();

export default nextConfig;
