import { ArticleData } from '@/lib/news';

/** Licence credit shown on top of a licensed photo (required by CC BY / CC BY-SA). */
export default function PhotoCredit({ article, className = '' }: { article: Partial<ArticleData>; className?: string }) {
  if (!article.image_credit || !article.original_image_url) return null;
  const text = article.image_credit.replace(/^Photo:\s*/, '');
  return (
    <span
      className={`absolute bottom-1.5 right-1.5 max-w-[90%] truncate rounded bg-black/55 px-1.5 py-0.5 text-[9px] leading-tight text-white/90 pointer-events-none ${className}`}
      title={article.image_credit}
    >
      {text}
    </span>
  );
}
