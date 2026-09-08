import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove static CORS headers - handled dynamically in route handlers
  // because CORS doesn't support wildcards like chrome-extension://*
};

export default nextConfig;
