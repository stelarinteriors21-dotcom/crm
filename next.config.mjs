/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app", "*.ngrok.io", "*.trycloudflare.com"],
  experimental: {
    serverActions: {
      allowedOrigins: ["*.trycloudflare.com", "*.ngrok-free.dev", "*.ngrok-free.app", "*.ngrok.io", "localhost:3000"],
    },
  },
};

export default nextConfig;


