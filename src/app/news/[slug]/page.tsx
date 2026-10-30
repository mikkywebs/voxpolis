import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import ArticleChrome from '@/components/article/ArticleChrome';
import ArticleInteractions from '@/components/article/ArticleInteractions';
import AdSlot from '@/components/article/AdSlot';
import Footer from '@/components/layout/Footer';
import { getCountryByCode, getCountrySlug } from '@/config/countries';
import { getArticleBySlug, getRelated } from '@/lib/articles';
import { get301Redirect } from '@/lib/pipeline/redirects';
import { ArticleData } from '@/lib/news';
import { SITE_NAME, SITE_URL, absoluteUrl, truncate } from '@/lib/site';

export const revalidate = 600;

interface Props {
  params: { slug: string };
}

function paragraphs(text?: string): string[] {
  return (text || '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/^[•\-*]\s*/, '').trim())
    .filter((p) => p.length > 0);
}

/** Old rows stored a canned template in ai_analysis; only show real analysis. */
function realAnalysis(a: ArticleData): string[] {
  if (a.analysis) return paragraphs(a.analysis);
  if (a.ai_analysis && !/^\s*•/.test(a.ai_analysis) && !/Verified Governance Report|Civic Overview/i.test(a.ai_analysis)) {
    return paragraphs(a.ai_analysis);
  }
  return [];
}

function description(a: ArticleData): string {
  return truncate(a.meta_description || a.dek || a.snippet || paragraphs(a.content)[0] || '', 158);
}

/** Licensed photo if we have one, otherwise our generated Voxpolis story card. */
function shareImage(a: ArticleData): string {
  return a.original_image_url && !a.original_image_url.startsWith('data:') ? a.original_image_url : `/card/${encodeURIComponent(a.slug)}`;
}

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

async function load(slug: string) {
  const article = await getArticleBySlug(slug);
  if (article) return article;
  const redirected = get301Redirect(slug);
  if (redirected && redirected !== slug) permanentRedirect(`/news/${redirected}`);
  notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getArticleBySlug(params.slug);
  if (!a) return { title: 'Story not found', robots: { index: false } };
  const country = getCountryByCode(a.country_code);
  const image = shareImage(a);
  const title = a.seo_title || a.title;
  return {
    title,
    description: description(a),
    keywords: a.tags,
    alternates: { canonical: `/news/${a.slug}` },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
    openGraph: {
      type: 'article',
      title: a.title,
      description: description(a),
      url: absoluteUrl(`/news/${a.slug}`),
      siteName: SITE_NAME,
      publishedTime: a.created_at,
      modifiedTime: a.updated_at || a.created_at,
      section: `${country.name} politics`,
      tags: a.tags,
      images: [{ url: absoluteUrl(image), alt: a.title, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: a.title, description: description(a), images: [absoluteUrl(image)] },
  };
}

export default async function ArticlePage({ params }: Props) {
  const a = await load(params.slug);
  const country = getCountryByCode(a.country_code);
  const countryPath = `/${getCountrySlug(country)}`;
  const related = await getRelated(a, 4);

  const body = paragraphs(a.content);
  const analysis = realAnalysis(a);
  const keyPoints = (a.key_points || []).filter(Boolean);
  const mid = Math.min(3, Math.ceil(body.length / 2));
  const words = [a.content, a.analysis, a.background, a.what_next].join(' ').split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  const url = absoluteUrl(`/news/${a.slug}`);
  const image = absoluteUrl(shareImage(a));

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        '@id': `${url}#article`,
        mainEntityOfPage: url,
        headline: truncate(a.title, 110),
        description: description(a),
        image: [image],
        datePublished: a.created_at,
        dateModified: a.updated_at || a.created_at,
        articleSection: `${country.name} politics`,
        keywords: a.tags?.join(', '),
        wordCount: words,
        inLanguage: 'en',
        contentLocation: { '@type': 'Country', name: country.name },
        author: { '@type': 'Organization', name: `${SITE_NAME} Politics Desk`, url: `${SITE_URL}/about` },
        publisher: { '@id': `${SITE_URL}/#org`, '@type': 'NewsMediaOrganization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE_URL}/voxpolis-icon.png` } },
        isBasedOn: a.source_url?.startsWith('http') ? a.source_url : undefined,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: country.name, item: absoluteUrl(countryPath) },
          { '@type': 'ListItem', position: 3, name: truncate(a.title, 80), item: url },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <ArticleChrome countryCode={country.code} />

      <div className="relative flex justify-center w-full max-w-[1360px] mx-auto px-4 sm:px-6">
        <aside className="hidden xl:block shrink-0 w-[160px] mr-6">
          <div className="sticky top-20">
            <AdSlot slotLocation="skyscraper_left" />
          </div>
        </aside>

        <main className="flex-1 max-w-3xl w-full min-w-0 py-8">
          <article className="space-y-6">
            <nav aria-label="Breadcrumb" className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
              <Link href="/" className="hover:underline">Home</Link>
              <span>›</span>
              <Link href={countryPath} className="hover:underline font-semibold text-blue-600 dark:text-blue-400">
                {country.flag} {country.name} politics
              </Link>
            </nav>

            <header className="space-y-3">
              <h1 className="text-2xl sm:text-4xl font-black leading-tight text-gray-900 dark:text-white">{a.title}</h1>
              {(a.dek || a.snippet) && (
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">{a.dek || a.snippet}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 border-y border-gray-200 dark:border-gray-800 py-2.5">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Voxpolis Politics Desk</span>
                <time dateTime={a.created_at}>{formatDate(a.created_at)}</time>
                {a.updated_at && a.updated_at.slice(0, 10) !== a.created_at.slice(0, 10) && (
                  <span>Updated <time dateTime={a.updated_at}>{formatDate(a.updated_at)}</time></span>
                )}
                <span>{minutes} min read</span>
              </div>
            </header>

            <ArticleInteractions part="top" articleId={a.id} slug={a.slug} title={a.title} dek={a.dek || a.snippet} countryCode={a.country_code} />

            {a.original_image_url && (
              <figure className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.original_image_url} alt={a.title} className="w-full max-h-[460px] object-cover object-top" loading="eager" />
                <figcaption className="px-3 py-2 text-[11px] text-gray-500 bg-gray-100 dark:bg-gray-900">
                  {a.image_credit ? <span className="font-semibold">File photo. </span> : <span>Photo: Voxpolis</span>}
                  {a.image_page_url ? (
                    <a href={a.image_page_url} target="_blank" rel="noopener license" className="hover:underline">
                      {a.image_credit}
                    </a>
                  ) : (
                    a.image_credit
                  )}
                </figcaption>
              </figure>
            )}

            {keyPoints.length > 0 && (
              <section aria-labelledby="short-version" className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-5">
                <h2 id="short-version" className="text-sm font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-3">
                  The short version
                </h2>
                <ul className="space-y-2 list-disc pl-5 text-[15px] leading-relaxed text-gray-800 dark:text-gray-200">
                  {keyPoints.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </section>
            )}

            <AdSlot slotLocation="below_dek" />

            <div className="text-base sm:text-[17px] leading-relaxed sm:leading-8 text-gray-800 dark:text-gray-200 space-y-5">
              {body.slice(0, mid).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {body.length > mid && <AdSlot slotLocation="mid_article" />}

            <div className="text-base sm:text-[17px] leading-relaxed sm:leading-8 text-gray-800 dark:text-gray-200 space-y-5">
              {body.slice(mid).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {analysis.length > 0 && (
              <section aria-labelledby="what-it-means" className="space-y-4 pt-2">
                <h2 id="what-it-means" className="text-xl font-black text-gray-900 dark:text-white">What it means</h2>
                <div className="text-base sm:text-[17px] leading-relaxed sm:leading-8 text-gray-800 dark:text-gray-200 space-y-4">
                  {analysis.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            )}

            {a.background && (
              <section aria-labelledby="background" className="space-y-3">
                <h2 id="background" className="text-xl font-black text-gray-900 dark:text-white">Background</h2>
                <p className="text-base sm:text-[17px] leading-relaxed sm:leading-8 text-gray-800 dark:text-gray-200">{a.background}</p>
              </section>
            )}

            {a.what_next && (
              <section aria-labelledby="what-next" className="space-y-3">
                <h2 id="what-next" className="text-xl font-black text-gray-900 dark:text-white">What happens next</h2>
                <p className="text-base sm:text-[17px] leading-relaxed sm:leading-8 text-gray-800 dark:text-gray-200">{a.what_next}</p>
              </section>
            )}

            {a.source_url?.startsWith('http') && (
              <p className="text-xs text-gray-500 border-t border-gray-200 dark:border-gray-800 pt-4">
                Written by the Voxpolis newsroom from original reporting by{' '}
                <a href={a.source_url} target="_blank" rel="noopener" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  {a.source_name}
                </a>
                . Spotted an error? <Link href="/corrections" className="underline">Tell us</Link>.
              </p>
            )}

            {a.tags?.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Topics">
                {a.tags.slice(0, 8).map((t) => (
                  <li key={t} className="px-2.5 py-1 rounded-full bg-gray-200/70 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300">
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <AdSlot slotLocation="below_sources" />

          <div className="mt-8" id="comments">
            <ArticleInteractions
              part="bottom"
              articleId={a.id}
              slug={a.slug}
              title={a.title}
              dek={a.dek || a.snippet}
              countryCode={a.country_code}
              poll={a.poll}
            />
          </div>

          {related.length > 0 && (
            <section aria-labelledby="more" className="mt-10 border-t border-gray-200 dark:border-gray-800 pt-6">
              <h2 id="more" className="text-lg font-black mb-4">
                More from {country.name}
              </h2>
              <ul className="grid sm:grid-cols-2 gap-4">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/news/${r.slug}`}
                      className="block h-full p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-500 transition"
                    >
                      <span className="text-sm font-bold leading-snug text-gray-900 dark:text-white">{r.title}</span>
                      {r.snippet && <span className="block mt-1 text-xs text-gray-500 line-clamp-2">{r.snippet}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={countryPath} className="inline-block mt-4 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
                All {country.name} political news →
              </Link>
            </section>
          )}
        </main>

        <aside className="hidden xl:block shrink-0 w-[160px] ml-6">
          <div className="sticky top-20">
            <AdSlot slotLocation="skyscraper_right" />
          </div>
        </aside>
      </div>

      <Footer />
    </div>
  );
}
