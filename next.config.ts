import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image (Fly.io).
  output: "standalone",
  // Dev only: copying browser console output into .next/dev/logs set off a rebuild and a
  // full page reload on every load (an endless loop on /login). Keep it off.
  logging: { browserToTerminal: false },
};

export default nextConfig;
