/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@constellation/core",
    "@constellation/synthetic-data",
    "@constellation/ai"
  ]
};

export default nextConfig;
