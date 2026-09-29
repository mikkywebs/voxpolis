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
      url: `${baseUrl}/archive`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
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

  // Dynamically add country archive routes and article routes (active + archived)
  const dynamicRoutes: MetadataRoute.Sitemap = [];
  for (const country of SUPPORTED_COUNTRIES.slice(0, 10)) {
    const slug = country.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Country archive page
    dynamicRoutes.push({
      url: `${baseUrl}/${slug}/archive`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    });

    const articles = await fetchArticlesForCountry(country.code);
    articles.forEach((art) => {
      dynamicRoutes.push({
        url: `${baseUrl}/article/${art.slug}`,
        lastModified: new Date(art.created_at),
        changeFrequency: art.is_archived ? 'yearly' : 'weekly',
        priority: art.is_archived ? 0.6 : 0.8,
      });
    });
  }

  return [...staticRoutes, ...dynamicRoutes];
}
