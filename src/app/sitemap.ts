import type { MetadataRoute } from 'next';
import { getCountryByCode, getCountrySlug } from '@/config/countries';
import { getCountriesWithArticles, getSitemapEntries } from '@/lib/articles';
import { SITE_URL } from '@/lib/site';
import { articlePath } from '@/lib/paths';

export const revalidate = 900;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, countries] = await Promise.all([getSitemapEntries(), getCountriesWithArticles()]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'hourly', priority: 1 },
    ...['about', 'contact', 'corrections', 'privacy', 'terms'].map((p) => ({
      url: `${SITE_URL}/${p}`,
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    })),
  ];

  const countryPages: MetadataRoute.Sitemap = countries.map((c) => ({
    url: `${SITE_URL}/${getCountrySlug(getCountryByCode(c.code))}`,
    lastModified: new Date(c.latest),
    changeFrequency: 'hourly',
    priority: 0.9,
  }));

  const articlePages: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE_URL}${articlePath(a)}`,
    lastModified: new Date(a.updated_at || a.created_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...countryPages, ...articlePages];
}
