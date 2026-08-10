/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required on Next 14.x for src/instrumentation.ts to run — stable without this flag from
  // Next 15 onward.
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
