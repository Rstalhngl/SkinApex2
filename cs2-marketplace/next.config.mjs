/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["*.agent.cvm.dev", "*.cvm.dev"],
  devIndicators: false,
}

export default nextConfig
