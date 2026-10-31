import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image (Fly.io).
  output: "standalone",
};

export default nextConfig;
