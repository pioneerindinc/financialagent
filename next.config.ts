import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === "development" &&
  process.env.FINANCE_LOCAL_DEV_BUILD === "1"
    ? { distDir: ".next-local" }
    : {}),
};

export default nextConfig;
