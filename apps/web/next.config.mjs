// Force reload to clear Clerk middleware detection cache
const nextConfig = {
  transpilePackages: ["@enterprise/common", "@enterprise/database", "@enterprise/events", "@clerk/nextjs"],
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
};

export default nextConfig;
