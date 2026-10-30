import { ImageResponse } from 'next/og';
import { getArticleBySlug } from '@/lib/articles';
import { getCountryByCode } from '@/config/countries';

/**
 * Voxpolis story card (1200×630): our own image for any story without a licensed photo.
 * Used in feeds, on social shares and in Google results. 100% owned by Voxpolis.
 */
export const revalidate = 86400;

const ACCENT: Record<string, string> = {
  Africa: '#16a34a',
  Americas: '#2563eb',
  Europe: '#7c3aed',
  Asia: '#dc2626',
  Oceania: '#0891b2',
};

/** Load a bold font from Google Fonts (cached by the platform); fall back to the built-in font. */
let boldFont: ArrayBuffer | null | undefined;
async function loadBoldFont(): Promise<ArrayBuffer | null> {
  if (boldFont !== undefined) return boldFont;
  try {
    const css = await (await fetch('https://fonts.googleapis.com/css2?family=Inter:wght@800&display=swap')).text();
    const url = css.match(/src: url\(([^)]+)\) format\('(?:truetype|opentype)'\)/)?.[1];
    boldFont = url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    boldFont = null;
  }
  return boldFont;
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const [article, font] = await Promise.all([getArticleBySlug(params.slug), loadBoldFont()]);
  const country = getCountryByCode(article?.country_code || 'NG');
  const accent = ACCENT[country.continent] || '#2563eb';
  const title = (article?.title || 'Political news, explained').slice(0, 140);
  const size = title.length > 100 ? 54 : title.length > 70 ? 62 : 70;
  const date = article?.created_at
    ? new Date(article.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0b1220 0%, #111c33 60%, #16233f 100%)',
          padding: '56px 64px',
          color: 'white',
          fontFamily: font ? 'Inter' : undefined,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, fontWeight: 800, letterSpacing: 2 }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: accent, marginRight: 14 }} />
            VOXPOLIS
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 26,
              fontWeight: 700,
              padding: '8px 22px',
              borderRadius: 999,
              border: `2px solid ${accent}`,
              color: '#e5e7eb',
            }}
          >
            {`${country.name.toUpperCase()} · POLITICS`}
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: size, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.5 }}>{title}</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 26, color: '#9ca3af' }}>
          <div style={{ display: 'flex' }}>Political news, explained</div>
          <div style={{ display: 'flex' }}>{date}</div>
        </div>
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: 10, background: accent, display: 'flex' }} />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: font ? [{ name: 'Inter', data: font, weight: 800, style: 'normal' }] : undefined,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' },
    }
  );
}
