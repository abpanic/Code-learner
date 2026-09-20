import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No `output: "export"` — Route Handlers are needed from Phase 4 onward
  // (see plan.md). Vercel serves the prerendered routes statically anyway.
};

export default nextConfig;
