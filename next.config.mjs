/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
