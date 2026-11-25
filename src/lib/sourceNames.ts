/**
 * Known outlets and official sites → the name shown under "Sources".
 * Paste a link in the editor and the name fills in by itself. Sites not listed here are
 * learned from earlier stories (see /api/admin/review?sources=known), or use the web address.
 */
export const KNOWN_SOURCES: Record<string, string> = {
  // Nigeria: newspapers, TV and online
  'punchng.com': 'Punch',
  'vanguardngr.com': 'Vanguard',
  'dailypost.ng': 'Daily Post',
  'dailytrust.com': 'Daily Trust',
  'premiumtimesng.com': 'Premium Times',
  'thecable.ng': 'TheCable',
  'channelstv.com': 'Channels TV',
  'guardian.ng': 'The Guardian Nigeria',
  'thisdaylive.com': 'ThisDay',
  'leadership.ng': 'Leadership',
  'tribuneonlineng.com': 'Nigerian Tribune',
  'thenationonlineng.net': 'The Nation',
  'sunnewsonline.com': 'The Sun',
  'thesun.ng': 'The Sun',
  'businessday.ng': 'BusinessDay',
  'saharareporters.com': 'Sahara Reporters',
  'legit.ng': 'Legit.ng',
  'pulse.ng': 'Pulse Nigeria',
  'arise.tv': 'Arise News',
  'tvcnews.tv': 'TVC News',
  'nan.ng': 'News Agency of Nigeria',
  'ripplesnigeria.com': 'Ripples Nigeria',
  'icirnigeria.org': 'The ICIR',
  'newtelegraphng.com': 'New Telegraph',
  'blueprint.ng': 'Blueprint',
  'independent.ng': 'Independent',
  'dailynigerian.com': 'Daily Nigerian',
  'naijanews.com': 'Naija News',
  'nationaldailyng.com': 'National Daily',
  'thewhistler.ng': 'The Whistler',
  'politicsnigeria.com': 'Politics Nigeria',
  'peoplesgazette.com': 'Peoples Gazette',
  'gazettengr.com': 'Peoples Gazette',
  'nta.ng': 'NTA News',
  'aitonline.tv': 'AIT',
  'radionigeria.gov.ng': 'Radio Nigeria',
  // Nigeria: official
  'statehouse.gov.ng': 'State House',
  'nass.gov.ng': 'National Assembly',
  'inecnigeria.org': 'INEC',
  'cbn.gov.ng': 'Central Bank of Nigeria',
  'nigeria.gov.ng': 'Federal Government of Nigeria',
  'efcc.gov.ng': 'EFCC',
  'police.gov.ng': 'Nigeria Police Force',
  'judiciary.gov.ng': 'Judiciary of Nigeria',
  'supremecourt.gov.ng': 'Supreme Court of Nigeria',
  // Africa
  'africanews.com': 'Africanews',
  'theafricareport.com': 'The Africa Report',
  'myjoyonline.com': 'MyJoyOnline',
  'graphic.com.gh': 'Graphic Online',
  'citinewsroom.com': 'Citi Newsroom',
  'ghanaweb.com': 'GhanaWeb',
  'nation.africa': 'Daily Nation',
  'standardmedia.co.ke': 'The Standard',
  'capitalfm.africa': 'Capital FM',
  'dailymaverick.co.za': 'Daily Maverick',
  'news24.com': 'News24',
  'iol.co.za': 'IOL',
  'newzimbabwe.com': 'NewZimbabwe',
  'au.int': 'African Union',
  'ecowas.int': 'ECOWAS',
  // World
  'bbc.com': 'BBC News',
  'bbc.co.uk': 'BBC News',
  'reuters.com': 'Reuters',
  'apnews.com': 'AP News',
  'aljazeera.com': 'Al Jazeera',
  'france24.com': 'France 24',
  'theguardian.com': 'The Guardian',
  'cnn.com': 'CNN',
  'dw.com': 'DW',
  'bloomberg.com': 'Bloomberg',
  'ft.com': 'Financial Times',
  'nytimes.com': 'The New York Times',
  'washingtonpost.com': 'The Washington Post',
  'economist.com': 'The Economist',
  'un.org': 'United Nations',
  // Social and video (official accounts)
  'x.com': 'X',
  'twitter.com': 'X',
  'facebook.com': 'Facebook',
  'instagram.com': 'Instagram',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
};

export function domainOf(url: string): string {
  try {
    return new URL(url.trim()).hostname.toLowerCase().replace(/^www\.|^m\.|^amp\./, '');
  } catch {
    return '';
  }
}

/** Name for a link: known list, then names learned from earlier stories, then the web address itself. */
export function sourceNameFor(url: string, learned: Record<string, string> = {}): string {
  let d = domainOf(url);
  if (!d) return '';
  const full = d;
  // try news.example.com → example.com
  while (d.includes('.')) {
    if (KNOWN_SOURCES[d]) return KNOWN_SOURCES[d];
    if (learned[d]) return learned[d];
    d = d.slice(d.indexOf('.') + 1);
  }
  return full;
}
