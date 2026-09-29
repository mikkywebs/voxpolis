import { MetadataRoute } from 'next';
import { SUPPORTED_COUNTRIES } from '@/config/countries';
import { fetchArticlesForCountry } from '@/lib/news';
import { getAllPublishedPipelineArticles } from '@/lib/pipeline';

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
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/corrections`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
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
    {
      url: `${baseUrl}/archive`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  const dynamicRoutes: MetadataRoute.Sitemap = [];
  const addedSlugs = new Set<string>();

  // Add country archive routes and articles
  for (const country of SUPPORTED_COUNTRIES.slice(0, 10)) {
    const slug = country.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    dynamicRoutes.push({
      url: `${baseUrl}/${slug}/archive`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    });

    const articles = await fetchArticlesForCountry(country.code);
    articles.forEach((art) => {
      // Only include complete published articles
      if (art.slug && !addedSlugs.has(art.slug) && !art.content.includes('[...]')) {
        addedSlugs.add(art.slug);
        dynamicRoutes.push({
          url: `${baseUrl}/article/${art.slug}`,
          lastModified: new Date(art.created_at || Date.now()),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    });
  }

  // Include complete published pipeline articles
  const pipeArticles = getAllPublishedPipelineArticles();
  for (const pArt of pipeArticles) {
    if (pArt.slug && pArt.status === 'published' && !addedSlugs.has(pArt.slug)) {
      addedSlugs.add(pArt.slug);
      dynamicRoutes.push({
        url: `${baseUrl}/article/${pArt.slug}`,
        lastModified: new Date(pArt.created_at || Date.now()),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  return [...staticRoutes, ...dynamicRoutes];
}
