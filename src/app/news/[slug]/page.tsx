import { notFound, permanentRedirect } from 'next/navigation';
import { getArticleBySlug, getArticleByPreviousSlug } from '@/lib/articles';
import { get301Redirect } from '@/lib/pipeline/redirects';
import { articlePath } from '@/lib/paths';

/**
 * Old address format /news/<slug>. Every story now lives at /<country>/<short-title>;
 * this permanently (301) redirects so old links and Google keep working.
 */
export default async function OldNewsAddress({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug);
  const target =
    (await getArticleBySlug(slug)) ||
    (await getArticleByPreviousSlug(slug)) ||
    (get301Redirect(slug) ? await getArticleBySlug(get301Redirect(slug)!) : null);
  if (target) permanentRedirect(articlePath(target));
  notFound();
}
