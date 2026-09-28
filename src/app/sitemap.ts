import { MetadataRoute } from 'next';
import { SUPPORTED_COUNTRIES } from '@/config/countries';
import { fetchArticlesForCountry } from '@/lib/news';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://voxpolis.app';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/feed`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Dynamically add article pages from supported countries
  const articleRoutes: MetadataRoute.Sitemap = [];
  for (const country of SUPPORTED_COUNTRIES.slice(0, 5)) {
    const articles = await fetchArticlesForCountry(country.code);
    articles.forEach((art) => {
      articleRoutes.push({
        url: `${baseUrl}/article/${art.slug}`,
        lastModified: new Date(art.created_at),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    });
  }

  return [...staticRoutes, ...articleRoutes];
}
