import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
   /* config options here */
   devIndicators: false,
   // Self-contained server build for the Docker image (see Dockerfile).
   output: 'standalone',
};

export default nextConfig;
