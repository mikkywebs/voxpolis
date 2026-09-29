function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function simpleHashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash).toString(36);
  return positive.slice(0, 4).padStart(4, 'k');
}

export function generateUniqueSlug(
  keywordsOrHeadline: string,
  sourceUrl: string,
  dateIso?: string
): string {
  const cleanBase = slugifyText(keywordsOrHeadline || 'political-brief').slice(0, 70);
  const dateStr = (dateIso ? new Date(dateIso) : new Date()).toISOString().split('T')[0];
  const shortId = simpleHashString(sourceUrl);

  return `${cleanBase}-${dateStr}-${shortId}`;
}
