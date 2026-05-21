import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://saas-starter-kit.com';

  // In a real scenario, you would fetch dynamic paths (like blog posts) here
  const staticPaths = [
    '',
    '/login',
    '/register',
    '/billing',
    '/blog',
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: path === '' ? 1 : 0.8,
  }));

  return staticPaths;
}
