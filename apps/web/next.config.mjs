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
  async rewrites() {
    // Note: ECONNREFUSED errors during startup are expected as Next.js 
    // starts faster than the NestJS backend compiles.
    return [
      {
        source: '/webhooks/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001'}/webhooks/:path*`,
      },
    ];
  },
};

export default nextConfig;
