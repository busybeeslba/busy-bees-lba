import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next.nosync' : '.next',
  /* config options here */
};

export default nextConfig;
