import { getCountryByCode } from '@/config/countries';
import { fetchRssArticlesForCountry, isCurrentMonthArticle } from './rss';
import { decodeAllHtmlEntities } from './news-rewriter';
import { isUsablePhoto } from './site';

export interface ArticleData {
  id: string;
  slug: string;
  legacy_slug?: string;
  title: string;
  snippet: string;
  content: string;
  ai_analysis: string;
  read_also_article_id?: string;
  read_also_title?: string;
  read_also_slug?: string;
  affiliate_link_url?: string;
  affiliate_link_label?: string;
  country_code: string;
  language: string;
  category: string;
  image_mode: 'original' | 'ai_generated' | 'breaking_logo';
  original_image_url?: string;
  ai_image_url?: string;
  source_name: string;
  source_url: string;
  author?: string;
  is_breaking: boolean;
  is_featured?: boolean;
  tags: string[];
  views_count: number;
  total_reading_time_seconds: number;
  created_at: string;
  is_archived?: boolean;
  // Editorial v2 fields (present on articles written by the new newsroom)
  dek?: string;
  key_points?: string[];
  analysis?: string;
  background?: string;
  what_next?: string;
  seo_title?: string;
  meta_description?: string;
  importance?: number;
  updated_at?: string;
  source_published_at?: string;
  image_credit?: string;
  image_license?: string;
  image_page_url?: string;
  review_status?: 'pending' | 'approved' | 'rejected';
  // Flexible structure (editorial v3)
  story_type?: string;
  lead?: string;
  sections?: { heading: string; kind: string; paragraphs: string[] }[];
  what_to_watch?: string;
  sources?: { name: string; url: string }[];
  reviewed_at?: string;
  reviewed_by?: string;
  poll?: {
    id: string;
    question: string;
    agree_count: number;
    disagree_count: number;
  };
}

export function isArticleArchived(createdAt: string): boolean {
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;
  const age = Date.now() - new Date(createdAt).getTime();
  return age > fortyEightHoursMs;
}

export function normalizeForMatching(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`‘]/g, "'")
    .replace(/["“”]/g, '"')
    .toLowerCase()
    .trim();
}

const POLITICAL_KEYWORDS = [
  'politic', 'politics', 'government', 'governance', 'parliament', 'parliamentary',
  'congress', 'congressional', 'president', 'presidential', 'presidency', 'minister', 'ministry',
  'senate', 'senator', 'lawmaker', 'election', 'electoral', 'policy', 'policies',
  'legislation', 'legislative', 'assembly', 'governor', 'governorship', 'gubernatorial', 'diplomacy', 'diplomatic',
  'sanction', 'treaty', 'cabinet', 'democrat', 'republican',
  'constitution', 'constitutional', 'prime minister', 'state department',
  'national assembly', 'ballot', 'vote', 'voter', 'candidate', 'campaign', 'white house',
  'downing street', 'capitol', 'foreign affairs', 'defense minister',
  'inec', 'efcc', 'icpc', 'dss', 'apc', 'pdp', 'lp', 'nnpp', 'fct', 'federal government',
  'state government', 'budget', 'appropriation', 'parliamentarian', 'civil service', 'executive order',
  'impeachment', 'tenure', 'referendum', 'geopolitical', 'public procurement', 'anti-corruption', 'defection',
  'political party', 'ruling party', 'opposition party', 'party primary', 'party primaries', 'party convention', 'party chieftain',
  'polling unit', 'campaign convoy', 'political rally', 'minimum wage', 'new zealand first',
  // Multilingual political terms (French, Spanish, Portuguese, German)
  'politique', 'politiques', 'gouvernement', 'gouvernance', 'parlement', 'assemblee',
  'assemblee nationale', 'depute', 'deputes', 'ministre', 'ministere',
  'presidentielle', 'senat', 'elections', 'electorale',
  'parti politique', 'opposition', 'decret',
  'politica', 'gobierno', 'gobernanza', 'parlamento', 'diputado', 'presidencia',
  'partido politico', 'orçamento', 'governo', 'politik', 'regierung'
];

export function escapeRegExp(str: string): string {
  return (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const FORBIDDEN_NON_POLITICAL_KEYWORDS = [
  // 1. Sports & Athletics (STRICTLY BANNED on Voxpolis)
  'super eagles', 'super falcons', 'akor adams', 'osimhen', 'lookman', 'boniface', 'iwobi', 'chukwueze', 'nwabali',
  'football', 'soccer', 'premier league', 'champions league', 'europa league', 'la liga', 'serie a', 'bundesliga',
  'world cup', 'fifa', 'caf', 'afcon', 'nff', 'npfl', "ballon d'or", 'fa cup',
  'arsenal', 'chelsea', 'manchester united', 'manchester city', 'liverpool', 'real madrid', 'barcelona', 'bayern', 'psg',
  'goal', 'goals', 'scored', 'scoreline', 'penalty', 'penalties', 'half-time', 'halftime', 'full-time',
  'striker', 'midfielder', 'defender', 'goalkeeper', 'coach', 'head coach', 'referee', 'stoppage time', 'fixture', 'fixtures',
  'qualifier', 'qualifiers', 'friendly match', 'rescues super eagles', 'super eagles draw',
  'basketball', 'nba', 'athletics', 'olympics', 'paralympics', 'marathon', 'boxing', 'heavyweight', 'tennis', 'wimbledon', 'golf',

  // 2. Entertainment, Pop Culture & Celebrities (STRICTLY BANNED)
  'nollywood', 'hollywood', 'bollywood', 'celebrity', 'actress', 'actor', 'movie', 'movies', 'cinema', 'film',
  'musician', 'singer', 'song', 'album', 'grammy', 'oscar', 'headies', 'afrobeats',
  'davido', 'wizkid', 'burna boy', 'tiwa savage', 'rema', 'asake', 'olamide',
  'skit maker', 'comedian', 'comedy', 'big brother', 'bbnaija', 'reality show', 'box office',

  // 3. Gossip, Relationships & Adult Content (STRICTLY BANNED)
  'phone-sex', 'sex session', 'celebrity scandal', 'relationship scandal',
  'bitch', 'ex-girlfriend', 'ex-boyfriend', 'nude', 'onlyfans', 'hookup',
  'cheating scandal', 'divorce scandal', 'baby mama', 'side chick'
];

/**
 * Sanitizes and cleans article summaries/snippets:
 * 1. Inserts missing spaces between words merged during HTML stripping (e.g., "onThursdayto" -> "on Thursday to")
 * 2. Prevents mid-word chopping (e.g., never leaves chopped stems like "Independe")
 * 3. Truncates cleanly at the end of the last complete sentence ending in '.', '!', or '?'
 * 4. Strictly guarantees the summary ends with a full stop '.'
 */
export function formatCleanSnippet(text: string, maxLen: number = 280): string {
  if (!text) return '';

  const decoded = decodeAllHtmlEntities(text);

  // Fix HTML/entity concatenation and missing spaces between joined words
  let clean = decoded
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/https?:\/\/[^\s)]+/gi, '')
    .replace(/www\.[^\s)]+/gi, '')
    // Add space between lowercase and uppercase if merged without space (e.g. "conference onThursday" -> "conference on Thursday")
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Add space between letter and digit or digit and letter (e.g. "66thIndepende" -> "66th Independe")
    .replace(/([0-9])([A-Za-z])/g, '$1 $2')
    .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
    // Add space after comma, semicolon, or colon if followed immediately by a letter
    .replace(/([,;:!])([A-Za-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  // If already ends in valid punctuation and is reasonably sized, return
  if (clean.length <= maxLen && /[.!?]$/.test(clean)) {
    return clean;
  }

  // Look for last complete sentence ending in [.!?] within maxLen + 30
  const candidate = clean.slice(0, maxLen + 30);
  const sentenceRegex = /[.!?](?:\s+|$)/g;
  let match: RegExpExecArray | null = null;
  let bestCutoff = -1;

  while ((match = sentenceRegex.exec(candidate)) !== null) {
    const endPos = match.index + 1;
    // As long as the sentence is at least 35 characters and does not exceed maxLen + 25
    if (endPos >= 35 && endPos <= maxLen + 25) {
      bestCutoff = endPos;
    }
  }

  if (bestCutoff > 0) {
    return clean.slice(0, bestCutoff).trim();
  }

  // If no clean sentence boundary, trim at last whole word boundary
  const truncated = clean.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  let wordTrimmed = lastSpace > 35 ? truncated.slice(0, lastSpace) : truncated;

  // Crucial: strip any dangling stop words/articles/prepositions/conjunctions before period
  const danglingPattern = /\s+(and|the|a|an|of|to|in|with|for|on|at|by|from|that|which|as|or|but|is|are|was|were|its|their|his|her|this|these|those)$/i;
  while (danglingPattern.test(wordTrimmed)) {
    wordTrimmed = wordTrimmed.replace(danglingPattern, '');
  }

  return wordTrimmed.replace(/[,;:\s-]+$/, '') + '.';
}

export function isColumnistOrOpinion(
  title: string = '',
  snippet: string = '',
  tags: string[] = [],
  url: string = ''
): boolean {
  const cleanTitle = (title || '').toLowerCase().trim();
  const cleanSnippet = (snippet || '').toLowerCase().trim();
  const cleanUrl = (url || '').toLowerCase().trim();
  const tagsStr = (tags || []).join(' ').toLowerCase();
  const text = `${cleanTitle} ${cleanSnippet} ${tagsStr}`;

  // 1. URL Path markers
  if (
    cleanUrl.includes('/columns/') ||
    cleanUrl.includes('/column/') ||
    cleanUrl.includes('/opinion/') ||
    cleanUrl.includes('/opinions/') ||
    cleanUrl.includes('/editorial/') ||
    cleanUrl.includes('/editorials/') ||
    cleanUrl.includes('/op-ed/') ||
    cleanUrl.includes('/columnists/') ||
    cleanUrl.includes('/columnist/') ||
    cleanUrl.includes('/perspective/') ||
    cleanUrl.includes('/commentary/')
  ) {
    return true;
  }

  // 2. Title indicators
  if (
    cleanTitle.startsWith('column:') ||
    cleanTitle.startsWith('[column]') ||
    cleanTitle.startsWith('(column)') ||
    cleanTitle.startsWith('opinion:') ||
    cleanTitle.startsWith('[opinion]') ||
    cleanTitle.startsWith('(opinion)') ||
    cleanTitle.startsWith('editorial:') ||
    cleanTitle.startsWith('[editorial]') ||
    cleanTitle.startsWith('op-ed:') ||
    cleanTitle.startsWith('[op-ed]') ||
    cleanTitle.startsWith('commentary:') ||
    cleanTitle.includes('column by ') ||
    cleanTitle.includes('column every ') ||
    cleanTitle.includes('saturday column') ||
    cleanTitle.includes('monday column') ||
    cleanTitle.includes('tuesday column') ||
    cleanTitle.includes('wednesday column') ||
    cleanTitle.includes('thursday column') ||
    cleanTitle.includes('friday column') ||
    cleanTitle.includes('sunday column')
  ) {
    return true;
  }

  // 3. Category / Tag indicators
  const columnistKeywords = ['column', 'columns', 'columnist', 'columnists', 'opinion', 'opinions', 'editorial', 'editorials', 'op-ed', 'op-eds', 'commentary'];
  if (tags && tags.some((t) => columnistKeywords.includes(t.toLowerCase().trim()))) {
    return true;
  }

  // 4. Content / Snippet indicators
  if (
    text.includes('columnist every') ||
    text.includes('weekly column') ||
    text.includes('op-ed contributor') ||
    text.includes('is a commentator on national issues') ||
    text.includes('commentator on national issues')
  ) {
    return true;
  }

  return false;
}

export function isPoliticalNews(title: string, snippet: string = '', tags: string[] = [], url: string = ''): boolean {
  const cleanTitle = (title || '').toLowerCase().trim();
  const text = `${cleanTitle} ${snippet} ${tags.join(' ')}`.toLowerCase();

  // Decline columnist / opinion articles for now
  if (isColumnistOrOpinion(title, snippet, tags, url)) {
    return false;
  }

  // Strictly exclude photo-gallery and image-dump posts (e.g. "[PHOTOS] Tinubu Hosts...", "PHOTOS: ...", "[PICTURES]")
  if (
    cleanTitle.startsWith('[photos]') ||
    cleanTitle.startsWith('photos:') ||
    cleanTitle.startsWith('photo:') ||
    cleanTitle.startsWith('[photo]') ||
    cleanTitle.startsWith('[pictures]') ||
    cleanTitle.startsWith('pictures:') ||
    cleanTitle.startsWith('picture:') ||
    cleanTitle.startsWith('[images]') ||
    cleanTitle.startsWith('images:') ||
    cleanTitle.includes('[photos]') ||
    cleanTitle.includes('(photos)') ||
    cleanTitle.includes('[pictures]') ||
    cleanTitle.includes('(pictures)') ||
    cleanTitle.includes('photo gallery') ||
    cleanTitle.includes('in pictures:') ||
    cleanTitle.includes('in photos:') ||
    cleanTitle.includes('photo news:') ||
    cleanTitle.includes('[photo news]')
  ) {
    return false;
  }

  // 3. Strictly exclude sports match scorelines (e.g. "Russia 3-3 Nigeria", "Arsenal 2-1 Chelsea", "3-1 win")
  if (/\b\d+\s*[-–:]\s*\d+\b/.test(cleanTitle) && (
    text.includes('goal') || text.includes('eagles') || text.includes('super eagles') ||
    text.includes('fc') || text.includes('vs') || text.includes('cup') || text.includes('match') ||
    text.includes('draw') || text.includes('win') || text.includes('defeat') || text.includes('russia') ||
    text.includes('league') || text.includes('lead early') || text.includes('second half')
  )) {
    return false;
  }

  // 4. Strictly exclude sports match phrases in title or body
  if (
    text.includes('super eagles') ||
    text.includes('akor adams') ||
    text.includes('rescues super eagles') ||
    text.includes('second half') ||
    text.includes('first half') ||
    text.includes('stoppage time') ||
    text.includes('late goal')
  ) {
    return false;
  }

  // 4b. Comprehensive Sports & Athletics Filter with Governance Shield
  // Blocks routine match previews, rosters, season campaigns, club board votes, and ceremonial photo-ops across all countries
  // Preserves genuine political reporting involving public funding, legislation, corruption, and public accountability
  const SPORTS_DISCIPLINES = /\b(?:rugby|all blacks|black ferns|super rugby|bledisloe|rugby union|rugby league|nrl|warriors|black caps|white ferns|cricket|\bipl\b|\bbcci\b|test match|wicket|innings|the ashes|silver ferns|netball|anz premiership|america'?s cup|sailgp|yachting|supercars|bathurst|formula 1|\bf1\b|motorsport|grand prix|afl|aussie rules|brisbane lions|\bnfl\b|super bowl|quarterback|\bmlb\b|baseball|\bnhl\b|ice hockey|stanley cup|\bufc\b|\bmma\b|a-league|stadium|finals? campaign|qualifying victory)\b/i;

  if (SPORTS_DISCIPLINES.test(text)) {
    const hasPoliticalGovernanceContext = /\b(?:public funds|taxpayer|corruption|bribe|anti-corruption|serious fraud office|\bsfo\b|legislation|parliamentary inquiry|select committee|statutory|ministerial misconduct|sports integrity commission|government funding|appropriation bill|state subsidies|audit office|auditor-general|passes bill|passes law|senate committee|congressional inquiry|state budget|parliament passes|regulatory probe|public inquiry)\b/i.test(text);

    if (!hasPoliticalGovernanceContext) {
      return false;
    }
  }

  // 5. Strictly exclude all items matching the non-political forbidden dictionary
  // Use word-boundary safety for short words (<= 4 chars like 'rema') to avoid false collisions with words like 'remands'
  for (const forbidden of FORBIDDEN_NON_POLITICAL_KEYWORDS) {
    if (forbidden.length <= 4) {
      if (new RegExp(`\\b${escapeRegExp(forbidden)}\\b`, 'i').test(text)) return false;
    } else {
      if (text.includes(forbidden)) return false;
    }
  }

  // 6. Context Check A: Personal social celebrations / lifestyle events of public figures
  // (e.g. "Governor Attends Musician's Birthday Party", "Governor's Daughter Weds in Lavish Ceremony")
  const isSocialLifestyleEvent = /\b(?:birthday party|wedding ceremony|lavish ceremony|burial ceremony|baby shower|marks birthday|celebrates birthday|birthday bash)\b/i.test(text);
  if (isSocialLifestyleEvent) {
    const hasSubstantiveGovernance = /\b(?:policy|legislation|budget|reform|bilateral|impeach|resigns?|executive order|treaty)\b/i.test(text);
    if (!hasSubstantiveGovernance) {
      return false;
    }
  }

  // 7. Context Check B: Routine common street crime vs. Political violence & accountability
  // Routine common crimes without political context should be rejected
  const isRoutineCrime = /\b(?:armed robbery|shop robbery|robbery suspect|burglary|cultist|cultism|petty theft|ordinary theft|theft case|pickpocket|phone theft|defilement|rape suspect|ritual kill|landlord-tenant|tenant disputes?|private property disputes?)\b/i.test(text);
  if (isRoutineCrime) {
    const hasPoliticalViolenceOrOfficeAnchor = /\b(?:campaign|election|rally|convoy|polling unit|ballot|governor|minister|senator|lawmaker|inec|efcc|icpc|public funds|graft|treason|assassination)\b/i.test(text);
    if (!hasPoliticalViolenceOrOfficeAnchor) {
      return false;
    }
  }

  // 8. Context Check C: Judicial / Legal proceedings
  // Isolated legal terms ("court", "judge", "magistrate") do NOT suffice alone for political news.
  const isJudicialCase = /\b(?:court|judge|magistrate|judiciary|tribunal|high court|appeal court|supreme court)\b/i.test(text);
  if (isJudicialCase) {
    if (isRoutineCrime) {
      const hasStrictPoliticalAnchor = /\b(?:election|electoral|governor|minister|senator|president|lawmaker|mp|parliament|congress|inec|efcc|icpc|public funds|graft|treason)\b/i.test(text);
      if (!hasStrictPoliticalAnchor) return false;
    }

    const hasJudicialPoliticalAnchor =
      /\b(?:election|electoral|voting|voter|ballot|voting district|voting rights|redistricting|gerrymander|governor|governorship|gubernatorial|minister|senator|president|presidential|lawmaker|mp|parliament|congress|congressional|constitution|constitutional|unconstitutional|nullif(?:y|ies|ied)|tribunal|impeach(?:ment)?|procurement|efcc|icpc|public funds|treason|bribery|graft|anti-corruption|legislation|executive order|subpoena|defection)\b/i.test(text) ||
      (/\b(?:strikes? down|struck down|nullif(?:y|ies|ied)|overturns?|upholds?|challenges? to)\b/i.test(text) && /\b(?:government|state law|federal law|national law|statute|executive policy|presidential decree)\b/i.test(text)) ||
      /\b(?:sues?|lawsuit against|ruling against|rules against|rules in favou?r of|court orders?)\s+(?:the\s+)?(?:government|ministry|state|federation)\b/i.test(text);

    if (!hasJudicialPoliticalAnchor) {
      return false;
    }
    return true;
  }

  // 9. Context Check D: Ambiguous isolated words checked in context
  // "party": if standalone "party", check if political party context exists
  if (/\bpart(?:y|ies)\b/i.test(text)) {
    const isPoliticalPartyContext = /\b(?:political party|ruling party|opposition party|party primary|party primaries|party convention|party congress|party chairman|party chieftain|party ticket|party secretariat|party caucus|apc|pdp|lp|nnpp|democrat|republican|labour party|conservative)\b/i.test(text);
    if (isPoliticalPartyContext) return true;
  }

  // "bill": if legislative bill context exists
  if (/\bbill\b/i.test(text)) {
    const isLegislativeBill = /\b(?:electoral bill|reform bill|appropriation bill|finance bill|passes bill|passed bill|approves bill|signs bill|rejects bill|legislative bill|senate|parliament|assembly|congress|lawmaker)\b/i.test(text);
    if (isLegislativeBill) return true;
  }

  // "mp" / "mps": match on word boundary
  if (/\bmps?\b/i.test(text)) {
    return true;
  }

  // 10. Context Check E: Macroeconomic policy & statutory regulatory decisions
  // A. Monetary Policy: Central Bank or statutory monetary authority connected to explicit policy action
  const hasMonetaryAuthority = /\b(?:central bank|cbn|federal reserve|the fed|bank of england|european central bank|ecb|monetary policy committee|mpc)\b/i.test(text);
  if (hasMonetaryAuthority) {
    const hasMonetaryPolicyAction = /\b(?:interest rates?|cash reserve|crr|monetary policy|hikes? rates?|cuts? rates?|raises? rates?|monetary easing|monetary tightening|fx guidelines?|foreign exchange directives?|curb inflation|inflation rate|monetary committee)\b/i.test(text);
    if (hasMonetaryPolicyAction) return true;
  }

  // B. Statutory Regulatory Decisions: Identifiable regulatory commission/agency approval or tariff determination
  const hasRegulatoryAuthorityAction = /\b(?:regulatory approval|regulator approves?|tariff approval|utility regulator|regulatory commission|nerc approves?|fcc approves?|ofgem approves?|approved by regulator)\b/i.test(text);
  if (hasRegulatoryAuthorityAction) {
    return true;
  }

  // 10b. Context Check F: Disambiguate geographical place names from political office titles
  if ((text.includes('governor') || text.includes('governo')) && text.includes('governors bay')) {
    const strippedText = text.replace(/governors bay/g, '');
    const hasOtherGov = POLITICAL_KEYWORDS.some((kw) => {
      if (kw === 'governor' || kw === 'governo') return false;
      if (kw.length <= 4) {
        return new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i').test(strippedText);
      }
      return strippedText.includes(kw);
    });
    if (!hasOtherGov) {
      return false;
    }
  }

  // 11. Must contain a genuine political governance term
  // Safely use word boundaries for short words (<= 4 chars like 'lp', 'dss', 'apc') to avoid substring false positives (e.g. 'helps')
  return POLITICAL_KEYWORDS.some((kw) => {
    if (kw.length <= 4) {
      return new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i').test(text);
    }
    return text.includes(kw);
  });
}

const COUNTRY_SPECIFIC_IDENTIFIERS: Record<string, string[]> = {
  NG: [
    'nigeria', 'nigerian', 'abuja', 'lagos', 'tinubu', 'atiku', 'peter obi', 'amaechi',
    'shettima', 'akpabio', 'sanwo-olu', 'sowore', 'buhari', 'wike', 'fubara', 'ganduje',
    'naira', 'inec', 'nass', 'national assembly', 'senate', 'house of reps', 'efcc', 'icpc',
    'dss', 'sss', 'cama', 'cac', 'apc', 'pdp', 'lp', 'nnpp', 'fct', 'asuu', 'nupeng',
    'kano', 'rivers', 'kaduna', 'edo', 'ondo', 'anambra', 'enugu', 'delta', 'oyo', 'ogun',
    'borno', 'plateau', 'taraba', 'benue', 'kwara', 'kogi', 'osun', 'ekiti', 'zamfara',
    'sokoto', 'kebbi', 'katsina', 'jigawa', 'bauchi', 'gombe', 'yobe', 'adamawa', 'nasarawa',
    'cross river', 'akwa ibom', 'bayelsa', 'ebonyi', 'imo', 'abia', 'federal government'
  ],
  US: ['united states', 'u.s.', 'usa', 'america', 'american', 'biden', 'trump', 'harris', 'congress', 'white house', 'capitol', 'senate', 'democrat', 'republican', 'pentagon', 'supreme court', 'fbi', 'gop'],
  GB: ['united kingdom', 'u.k.', 'uk', 'britain', 'british', 'london', 'downing street', 'parliament', 'starmer', 'sunak', 'labour', 'tory', 'conservative', 'westminster', 'holyrood', 'bank of england'],
  GH: ['ghana', 'ghanaian', 'accra', 'akufo-addo', 'bawumia', 'mahama', 'cedi', 'parliament of ghana'],
  ZA: ['south africa', 'south african', 'pretoria', 'cape town', 'johannesburg', 'ramaphosa', 'anc', 'da', 'eff', 'rand', 'parliament'],
  KE: ['kenya', 'kenyan', 'nairobi', 'ruto', 'odinga', 'gachagua', 'shilling', 'parliament'],
  CA: ['canada', 'canadian', 'ottawa', 'trudeau', 'poilievre', 'parliament'],
  AU: ['australia', 'australian', 'canberra', 'albanese', 'dutton'],
  IN: ['india', 'indian', 'delhi', 'new delhi', 'modi', 'rahul gandhi', 'bjp', 'congress party', 'lok sabha', 'rupee'],
  CN: ['china', 'chinese', 'beijing', 'xi jinping', 'communist party', 'politburo'],
  JP: ['japan', 'japanese', 'tokyo', 'kishida', 'ishiba', 'diet'],
  DE: ['germany', 'german', 'berlin', 'scholz', 'bundestag'],
  FR: ['france', 'french', 'paris', 'macron', 'assemblee nationale', 'elysee', 'barnier'],
  // African Nations
  CI: ['cote divoire', "cote d'ivoire", 'ivory coast', 'ivorian', 'abidjan', 'yamoussoukro', 'ouattara', 'gbagbo', 'thiam', 'bedie', 'rhdp', 'ppa-ci'],
  SN: ['senegal', 'senegalese', 'dakar', 'faye', 'sonko', 'macky sall'],
  CM: ['cameroon', 'cameroonian', 'yaounde', 'douala', 'biya'],
  CD: ['dr congo', 'drc', 'democratic republic of congo', 'congolese', 'kinshasa', 'tshisekedi'],
  CG: ['congo', 'congolese', 'brazzaville', 'sassou nguesso'],
  EG: ['egypt', 'egyptian', 'cairo', 'sisi'],
  RW: ['rwanda', 'rwandan', 'kigali', 'kagame'],
  UG: ['uganda', 'ugandan', 'kampala', 'museveni'],
  TZ: ['tanzania', 'tanzanian', 'dodoma', 'dar es salaam', 'samia suluhu'],
  ET: ['ethiopia', 'ethiopian', 'addis ababa', 'abiy ahmed'],
  MA: ['morocco', 'moroccan', 'rabat', 'casablanca', 'mohammed vi'],
  DZ: ['algeria', 'algerian', 'algiers', 'tebboune'],
  TN: ['tunisia', 'tunisian', 'tunis', 'saied'],
  AO: ['angola', 'angolan', 'luanda', 'lourenco'],
  MZ: ['mozambique', 'mozambican', 'maputo', 'nyusi'],
  ZW: ['zimbabwe', 'zimbabwean', 'harare', 'mnangagwa'],
  ZM: ['zambia', 'zambian', 'lusaka', 'hichilema'],
  MW: ['malawi', 'malawian', 'lilongwe', 'chakwera'],
  BW: ['botswana', 'motswana', 'batswana', 'gaborone', 'boko', 'masisi'],
  NA: ['namibia', 'namibian', 'windhoek', 'mbumba'],
  LR: ['liberia', 'liberian', 'monrovia', 'boakai', 'weah'],
  SL: ['sierra leone', 'sierra leonean', 'freetown', 'bio'],
  GN: ['guinea', 'guinean', 'conakry', 'doumbouya'],
  ML: ['mali', 'malian', 'bamako', 'goita'],
  BF: ['burkina faso', 'burkinabe', 'ouagadougou', 'traore'],
  NE: ['niger', 'nigerien', 'niamey', 'tchiani'],
  TD: ['chad', 'chadian', 'ndjamena', 'deby'],
  GA: ['gabon', 'gabonese', 'libreville', 'oligui'],
  BJ: ['benin', 'beninese', 'porto-novo', 'talon'],
  TG: ['togo', 'togolese', 'lome', 'gnassingbe'],
  GM: ['gambia', 'gambian', 'banjul', 'barrow'],
  MR: ['mauritania', 'mauritanian', 'nouakchott', 'ghazouani'],
  SO: ['somalia', 'somali', 'mogadishu', 'hassan sheikh'],
  SD: ['sudan', 'sudanese', 'khartoum', 'burhan'],
  SS: ['south sudan', 'south sudanese', 'juba', 'kiir'],
  // Americas, Europe, Asia, Pacific
  BR: ['brazil', 'brazilian', 'brasilia', 'lula', 'bolsonaro'],
  MX: ['mexico', 'mexican', 'mexico city', 'sheinbaum', 'amlo'],
  AR: ['argentina', 'argentine', 'buenos aires', 'milei'],
  CO: ['colombia', 'colombian', 'bogota', 'petro'],
  CL: ['chile', 'chilean', 'santiago', 'boric'],
  PE: ['peru', 'peruvian', 'lima', 'boluarte'],
  VE: ['venezuela', 'venezuelan', 'caracas', 'maduro'],
  UA: ['ukraine', 'ukrainian', 'kyiv', 'zelensky'],
  RU: ['russia', 'russian', 'moscow', 'putin', 'duma'],
  TR: ['turkey', 'turkiye', 'turkish', 'ankara', 'erdogan'],
  SA: ['saudi arabia', 'saudi', 'riyadh', 'mbs'],
  AE: ['uae', 'emirates', 'emirati', 'abu dhabi', 'dubai'],
  IL: ['israel', 'israeli', 'jerusalem', 'netanyahu', 'knesset'],
  IR: ['iran', 'iranian', 'tehran', 'khamenei', 'pezeshkian'],
  PK: ['pakistan', 'pakistani', 'islamabad', 'shehbaz', 'imran khan'],
  BD: ['bangladesh', 'bangladeshi', 'dhaka', 'yunus', 'hasina'],
  ID: ['indonesia', 'indonesian', 'jakarta', 'prabowo'],
  MY: ['malaysia', 'malaysian', 'kuala lumpur', 'anwar ibrahim'],
  PH: ['philippines', 'filipino', 'manila', 'marcos'],
  SG: ['singapore', 'singaporean', 'wong'],
  TH: ['thailand', 'thai', 'bangkok', 'paetongtarn'],
  VN: ['vietnam', 'vietnamese', 'hanoi', 'to lam'],
  IT: ['italy', 'italian', 'rome', 'meloni'],
  ES: ['spain', 'spanish', 'madrid', 'sanchez'],
  NL: ['netherlands', 'dutch', 'the hague', 'amsterdam', 'schoof'],
  PL: ['poland', 'polish', 'warsaw', 'tusk', 'duda'],
  SE: ['sweden', 'swedish', 'stockholm', 'kristersson'],
  NO: ['norway', 'norwegian', 'oslo', 'store'],
  IE: ['ireland', 'irish', 'dublin', 'harris', 'dail'],
  NZ: [
    'new zealand', 'new zealander', 'new zealanders', 'aotearoa',
    'wellington', 'auckland', 'christchurch', 'dunedin',
    'luxon', 'christopher luxon',
    'hipkins', 'chris hipkins',
    'winston peters',
    'new zealand first', 'nz first',
    'national party', 'the national party', 'nz national', 'national-led',
    'national woos', 'national pledges', 'national promises', 'national vows', 'national unveils', 'national slams', 'national rules out', 'national caucus',
    'labour party', 'the labour party', 'nz labour',
    'act party', 'the act party', 'act new zealand', 'david seymour',
    'green party', 'the green party', 'nz greens',
    'te pati maori', 'maori party',
    'nz'
  ],
};

const FOREIGN_WIRE_PREFIXES = [
  'saudi arabia', 'saudi', 'israel', 'gaza', 'palestine', 'palestinian', 'hamas',
  'hezbollah', 'lebanon', 'beirut', 'ukraine', 'kyiv', 'russia', 'moscow', 'putin',
  'sudan', 'khartoum', 'iran', 'tehran', 'syria', 'damascus', 'north korea', 'yemen',
  'china', 'united states', 'us:', 'u.s.:', 'uk:', 'britain:', 'india:'
];

export function isRelevantToCountry(title: string, snippet: string = '', countryCode: string): boolean {
  const code = countryCode.toUpperCase();
  const country = getCountryByCode(code);
  const cleanTitle = normalizeForMatching(title);
  const cleanSnippet = normalizeForMatching(snippet);
  const fullText = `${cleanTitle} ${cleanSnippet}`;

  // 1. Check if the headline starts with a foreign country tag/prefix (e.g. "Saudi Arabia: ...", "Israel: ...")
  const prefixMatch = cleanTitle.match(/^([a-z\s]+)[:–—-]/);
  if (prefixMatch) {
    const prefix = prefixMatch[1].trim();
    const normCountryName = normalizeForMatching(country.name);
    const isTargetCountry = prefix.includes(normCountryName) || prefix.includes(code.toLowerCase());
    const isForeignWire = FOREIGN_WIRE_PREFIXES.some((f) => prefix.includes(f));
    if (isForeignWire && !isTargetCountry) {
      return false;
    }
  }

  // 2. Reject foreign topics if reported without direct target-country governance substance
  const isForeignTopic = [
    'khashoggi', 'netanyahu', 'tel aviv', 'zelensky', 'vladimir putin', 'ayatollah',
    'kremlin', 'taliban', 'houthi', 'hezbollah', 'gaza strip', 'west bank'
  ].some((foreignKeyword) => cleanTitle.includes(foreignKeyword));

  // 3. Target country identifier requirement
  const baseTargetKeywords = COUNTRY_SPECIFIC_IDENTIFIERS[code] || [];
  const normalizedCountryName = normalizeForMatching(country.name);
  const normalizedCapital = normalizeForMatching(country.capital);
  const nameWithoutPunctuation = normalizedCountryName.replace(/['’\s-]/g, '');

  const targetKeywords = Array.from(new Set([
    ...baseTargetKeywords.map((k) => normalizeForMatching(k)),
    normalizedCountryName,
    normalizedCapital,
    nameWithoutPunctuation,
    `${normalizedCountryName}n`,
    `${normalizedCountryName}an`,
    `${normalizedCountryName}ese`,
    `${normalizedCountryName}i`,
  ])).filter((k) => k.length >= 2);

  const matchesKeyword = (text: string, kw: string): boolean => {
    if (kw.length <= 3) {
      return new RegExp(`\\b${kw}\\b`, 'i').test(text);
    }
    return text.includes(kw);
  };

  const hasTargetKeywordInTitle = targetKeywords.some((kw) => matchesKeyword(cleanTitle, kw));
  const hasTargetKeywordInSnippet = targetKeywords.some((kw) => matchesKeyword(cleanSnippet, kw));

  // If article title is about foreign topic and target country is not the primary subject in title, skip!
  if (isForeignTopic && !hasTargetKeywordInTitle) {
    return false;
  }

  // An article must contain target country identifiers in title or snippet to qualify for this desk
  if (!hasTargetKeywordInTitle && !hasTargetKeywordInSnippet) {
    return false;
  }

  // Check if article belongs primarily to another major country
  for (const [otherCode, otherKeywords] of Object.entries(COUNTRY_SPECIFIC_IDENTIFIERS)) {
    if (otherCode !== code) {
      const mentionsOtherCountryInTitle = otherKeywords.slice(0, 4).some((kw) => {
        const normKw = normalizeForMatching(kw);
        return matchesKeyword(cleanTitle, normKw);
      });
      if (mentionsOtherCountryInTitle && !hasTargetKeywordInTitle) {
        return false;
      }
    }
  }

  return true;
}

const LOCALIZED_NEWS_TEMPLATES: Record<string, (countryName: string, capital: string) => { title: string; snippet: string; content: string; analysis: string; pollQuestion: string }> = {
  fr: (country, capital) => ({
    title: `${country} : Aperçu de la Gouvernance et de l'Architecture Constitutionnelle`,
    snippet: `Un aperçu civique de la structure institutionnelle, des procédures parlementaires et des mécanismes de redevabilité publique à ${country}.`,
    content: `${country} s'appuie sur un cadre constitutionnel établi qui régit l'action publique, l'administration nationale et les délibérations législatives à ${capital}.

L'architecture institutionnelle articule l'action exécutive, le contrôle parlementaire et l'administration territoriale pour assurer des services publics équitables.

Les observateurs de la vie civique soulignent que la transparence statutaire et la participation citoyenne constituent le socle de la vitalité démocratique.

Ce document est établi par Voxpolis Civic Desk à titre de référence institutionnelle générale et ne constitue pas une dépêche d'actualité en temps réel.`,
    analysis: `Contexte du Document Civique :
- Structure Institutionnelle : Synthèse de l'architecture constitutionnelle et des procédures législatives à ${capital}.
- Administration Publique : Vue d'ensemble de la gouvernance nationale et de la transparence publique.
- Portée Éducative : Document préparé par Voxpolis Civic Desk comme référence civique générale; non issu de dépêches d'actualité.`,
    pollQuestion: `Pensez-vous que les institutions de ${country} doivent renforcer la transparence numérique des services publics ?`,
  }),

  es: (country, capital) => ({
    title: `${country}: Panorama de la Gobernanza y Estructura Constitucional`,
    snippet: `Una guía cívica sobre el marco constitucional, las funciones legislativas y los canales de participación ciudadana en ${country}.`,
    content: `${country} se fundamenta en un marco constitucional consolidado que orienta las políticas públicas y las deliberaciones parlamentarias en ${capital}.

La estructura institucional organiza la administración ejecutiva, el control legislativo y los gobiernos locales para atender las necesidades públicas.

Analistas de políticas públicas señalan que la rendición de cuentas y la transparencia administrativa son esenciales para la confianza ciudadana.

Esta síntesis es elaborada por Voxpolis Civic Desk como marco de referencia cívica y no constituye una cobertura de noticias de última hora.`,
    analysis: `Contexto Cívico:
- Estructura Institucional: Resumen del marco constitucional y procedimientos parlamentarios en ${capital}.
- Administración Pública: Síntesis de gobernanza, transparencia y participación ciudadana en ${country}.
- Alcance Educativo: Elaborado por Voxpolis Civic Desk como material de consulta cívica; no es un despacho de última hora.`,
    pollQuestion: `¿Considera prioritario incrementar la transparencia digital en la administración pública de ${country}?`,
  }),

  de: (country, capital) => ({
    title: `${country}: Überblick über Regierungsführung und Verfassungsstrukturen`,
    snippet: `Ein bürgerschaftlicher Überblick über die Verfassungsordnung, parlamentarische Abläufe und Verwaltungsstrukturen in ${country}.`,
    content: `${country} stützt sich auf eine verfassungsrechtliche Ordnung, die Gesetzgebung, öffentliche Verwaltung und demokratische Mitwirkung in ${capital} leitet.

Die institutionellen Mechanismen verbinden parlamentarische Aufsicht und kommunale Verwaltung zur Gewährleistung verlässlicher öffentlicher Dienstleistungen.

Politikbeobachter betonen, dass Transparenz und Bürgerbeteiligung das Fundament einer stabilen demokratischen Ordnung bilden.

Diese Übersicht wurde von der Voxpolis Civic Desk als institutionelle Hintergrundinformation erstellt und stellt keine aktuelle Eilmeldung dar.`,
    analysis: `Hintergrundinformation:
- Verfassungsrahmen: Überblick über Gesetzgebungsprozesse und Institutionen in ${capital}.
- Öffentliche Verwaltung: Struktur staatlicher Aufgaben und Transparenzstandards in ${country}.
- Zweck: Bereitgestellt von Voxpolis Civic Desk als staatsbürgerliche Hintergrundinformation; keine Eilmeldung.`,
    pollQuestion: `Sollten öffentliche Verwaltungsverfahren in ${country} digital transparenter gestaltet werden?`,
  }),

  ja: (country, capital) => ({
    title: `${country}：統治機構と憲法秩序の概要`,
    snippet: `${country}における憲法構造、議会手続き、および公共ガバナンスの枠組みに関する市民向け解説。` ,
    content: `${country}は、${capital}における立法手続きや行政運営を定める確立された憲法秩序に基づいて運営されています。

行政執行、議会による監視、および地方自治の連携により、公共サービスの安定的な提供が図られています。

政策研究者らは、制度の透明性と市民参加の維持が民主的基盤の強化に不可欠であると指摘しています。

本概要はVoxpolis Civic Deskにより、公共制度の理解を支援する背景資料として作成されたものであり、速報報道ではありません。`,
    analysis: `市民解説の文脈：
- 統治構造：${capital}における憲法秩序および立法手続きの概要。
- 公共行政：${country}における政策執行と透明性の枠組み。
- 目的：Voxpolis Civic Deskによる背景解説資料。速報ニュースではありません。`,
    pollQuestion: `${country}において行政手続きのデジタル透明性を高める取り組みを支持しますか？`,
  }),

  en: (country, capital) => ({
    title: `${country}: Overview of Governance & Constitutional Architecture`,
    snippet: `An educational overview of the constitutional governance framework, parliamentary procedures, and civic accountability channels in ${country}.`,
    content: `${country} operates within an established constitutional framework that guides national governance, public administration, and legislative deliberation in ${capital}.

The institutional structure balances executive authority, parliamentary oversight, and municipal administration to ensure responsive public service delivery.

Civic observers and policy analysts emphasize that transparent statutory reporting and active public engagement remain essential for democratic vitality.

This overview is prepared as background civic reference by Voxpolis Civic Desk to support public understanding of national governance institutions.`,
    analysis: `Civic Overview Context:
- Institutional Structure: Summary of constitutional governance architecture and legislative procedures in ${capital}.
- Public Administration: Overview of national policy implementation, public accountability, and civic participation.
- Educational Scope: Prepared by Voxpolis Civic Desk as background civic reference; not breaking news reporting.`,
    pollQuestion: `Should public governance frameworks in ${country} prioritize expanding digital administrative transparency?`,
  }),
};

export function cleanCommercialsAndAdverts(text: string): string {
  if (!text) return '';
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length < 25) return false;
      if (
        line.match(
          /^(read also|also read|click here|source:|copyright|all rights reserved|advertisement|sponsored|promo|follow us|join our|subscribe|download our|share this|tweet|whatsapp|cookie|for advert|contact us|sign up|newsletter|for more details|watch video|photo:|in case you missed)/i
        )
      ) {
        return false;
      }
      if (
        line.match(
          /(whatsapp group|telegram channel|daily newsletter|subscribe now|click the link|advertisement|all rights reserved|may not be reproduced|without prior written permission|punch nigeria|vanguard media)/i
        )
      ) {
        return false;
      }
      return true;
    })
    .join('\n\n');
}

export function synthesize4ParagraphBrief(
  title: string,
  snippet: string,
  rawParagraphs?: string | string[],
  sourceName: string = 'Press Agency',
  countryName: string = 'National',
  countryCapital?: string
): string {
  const dateline = countryCapital ? countryCapital.toUpperCase() : countryName.toUpperCase();
  const cleanTitle = (title || '').replace(/\s*[-–—|]\s*Voxpolis.*$/i, '').trim();

  let candidateParas: string[] = [];
  if (Array.isArray(rawParagraphs)) {
    candidateParas = rawParagraphs;
  } else if (typeof rawParagraphs === 'string' && rawParagraphs.length > 0) {
    candidateParas = rawParagraphs.split(/\n\s*\n/);
  }

  // Aggressively strip ads, commercials, wire boilerplate, and short chopped lines
  const cleanParas = candidateParas
    .map((p) => p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => {
      if (p.length < 35) return false;
      if (
        p.match(
          /^(read also|also read|click here|source:|copyright|all rights reserved|advertisement|sponsored|promo|follow us|join our|subscribe|download our|share this|tweet|whatsapp|cookie|for advert|contact us|sign up|newsletter|for more details|watch video|photo:)/i
        )
      ) {
        return false;
      }
      if (
        p.match(
          /(whatsapp group|telegram channel|daily newsletter|subscribe now|click the link|advertisement|all rights reserved|may not be reproduced)/i
        )
      ) {
        return false;
      }
      return true;
    });

  // If we have at least 4 real reporting paragraphs:
  if (cleanParas.length >= 4) {
    const p1 = cleanParas[0].toUpperCase().startsWith(dateline) ? cleanParas[0] : `${dateline} — ${cleanParas[0]}`;
    return [p1, cleanParas[1], cleanParas[2], cleanParas[3]].join('\n\n');
  }

  // If 1-3 paragraphs exist, split by real sentences to form up to 4 paragraphs without adding fake commentary
  if (cleanParas.length > 0) {
    const allSentences: string[] = [];
    for (const p of cleanParas) {
      const sList = p.match(/[^.!?]+[.!?]+/g) || [p];
      for (const s of sList) {
        const tr = s.trim();
        if (tr.length > 25) allSentences.push(tr);
      }
    }

    if (allSentences.length >= 4) {
      const chunkSize = Math.ceil(allSentences.length / 4);
      const paras: string[] = [];
      for (let i = 0; i < 4; i++) {
        const slice = allSentences.slice(i * chunkSize, (i + 1) * chunkSize);
        if (slice.length > 0) paras.push(slice.join(' '));
      }
      if (paras.length > 0) {
        if (!paras[0].toUpperCase().startsWith(dateline)) {
          paras[0] = `${dateline} — ${paras[0]}`;
        }
        return paras.join('\n\n');
      }
    }

    const res = [...cleanParas];
    if (!res[0].toUpperCase().startsWith(dateline)) {
      res[0] = `${dateline} — ${res[0]}`;
    }
    return res.join('\n\n');
  }

  // Fallback strictly using original title and snippet (zero robotic filler)
  const p1 = `${dateline} — ${cleanTitle}.`;
  const p2 = snippet && snippet.length > 25 ? snippet : `Reported by ${sourceName}.`;
  return [p1, p2].join('\n\n');
}

export function expandToJournalisticArticle(
  title: string,
  snippet: string,
  sourceName: string = 'Press Agency',
  countryName: string = 'National',
  countryCapital?: string,
  category: string = 'politics'
): string {
  return synthesize4ParagraphBrief(title, snippet, undefined, sourceName, countryName, countryCapital);
}

export function generateAiAnalysisSummary(
  title: string,
  snippet: string,
  sourceName: string = 'Press Outlet',
  countryName: string = 'National'
): string {
  const cleanTitle = (title || '').replace(/\s*[-–—|]\s*Voxpolis.*$/i, '').replace(/<[^>]+>/g, '').trim();
  const cleanSnippet = (snippet || '').replace(/<[^>]+>/g, '').trim();
  const lowerText = `${cleanTitle} ${cleanSnippet}`.toLowerCase();

  // 1. Economic Affordability, Fuel Subsidy, Petrol Pricing, Inflation & Living Costs
  if (
    lowerText.includes('petrol') ||
    lowerText.includes('subsidy') ||
    lowerText.includes('n600') ||
    lowerText.includes('pump price') ||
    lowerText.includes('fuel price') ||
    lowerText.includes('inflation') ||
    lowerText.includes('cost of living') ||
    lowerText.includes('minimum wage') ||
    lowerText.includes('tariff') ||
    lowerText.includes('hardship')
  ) {
    return `Independent Review & Core Facts:
• Core Economic Issue: The report addresses high-stakes economic hardship in ${countryName}, where petroleum pricing and public affordability remain the central drivers of national inflation.
• Policy Realities: While political figures propose conditional support or price rollbacks, petroleum pricing in a deregulated market is governed by exchange rates, crude import costs, and local refining volume. Demanding price cuts without direct fiscal subventions or increased domestic refinery output is economically difficult to sustain.
• Real-World Impact: Transport fares, food prices, and everyday household purchasing power across ${countryName} are directly anchored to the price of fuel.

The Verdict:
Fuel pricing is too vital to citizen survival to be used as a political bargaining chip or campaign sweetener. Promising lower pump prices to barter political loyalty sounds attractive to suffering citizens, but without a clear, costed fiscal blueprint and verifiable domestic refining, such pledges remain pure political theater. Citizens must demand structural economic solutions over populist campaign deals.`;
  }

  // 2. 2027 Election Realignment, Running Mates, Defections & Coalitions
  if (
    lowerText.includes('2027') ||
    lowerText.includes('running mate') ||
    lowerText.includes('withdraw') ||
    lowerText.includes('back tinubu') ||
    lowerText.includes('atiku') ||
    lowerText.includes('defection') ||
    lowerText.includes('coalition') ||
    lowerText.includes('endorse') ||
    lowerText.includes('presidential ticket') ||
    lowerText.includes('party chairman') ||
    lowerText.includes('apc') && lowerText.includes('pdp')
  ) {
    return `Independent Review & Core Facts:
• Political Positioning: Contenders and party stakeholders are already maneuvering ahead of upcoming election cycles, testing loyalties, issuing public ultimatums, and trading running-mate endorsements.
• Fragile Party Structures: Major political parties in ${countryName} continue to experience internal friction, where individual figures leverage public declarations to negotiate personal relevance or executive appointments.
• Ideological Reality: Cross-party endorsements and conditional loyalty demonstrate that political alignments remain transactional and fluid rather than driven by shared ideological vision.

The Verdict:
Early campaign ultimatums and cross-party horse-trading reveal that partisan politics remains driven by personal ambition rather than institutional conviction. When prominent politicians barter endorsements under the guise of public interest, voters must look past theatrical declarations. Genuine leadership in ${countryName} requires coherent governance manifestos and policy consistency, not opportunism ahead of election seasons.`;
  }

  // 3. Judiciary, Regulatory Overreach, CAMA, CAC, Court Rulings & Injunctions
  if (
    lowerText.includes('appeal court') ||
    lowerText.includes('supreme court') ||
    lowerText.includes('nullification') ||
    lowerText.includes('cama') ||
    lowerText.includes('cac') ||
    lowerText.includes('tribunal') ||
    lowerText.includes('ruling') ||
    lowerText.includes('judgment') ||
    lowerText.includes('powers over') ||
    lowerText.includes('court affirms') ||
    lowerText.includes('high court')
  ) {
    return `Independent Review & Core Facts:
• Judicial Check on Power: The court has stepped in to affirm constitutional limits on executive and regulatory bodies, striking down provisions that granted administrative agencies excessive unilateral control.
• Institutional Protection: The judgment reinforces that state administrative bodies cannot arbitrarily usurp the leadership, operations, or assets of registered associations and private bodies without strict judicial due process.
• Precedent for Due Process: This legal victory establishes that statutory regulations must operate within constitutional boundaries and respect institutional independence.

The Verdict:
The court's decision to curb excessive regulatory power is a vital triumph for the rule of law. Regulatory bodies exist to ensure lawful registration and statutory standards, not to act as administrative overlords over civic and corporate organizations. Limiting agency overreach protects civil society, businesses, and faith organizations in ${countryName} from politically motivated interference.`;
  }

  // 4. Security Agencies, DSS/SSS, Civil Liberties, Summons & Interrogations
  if (
    lowerText.includes('sowore') ||
    lowerText.includes('sss') ||
    lowerText.includes('dss') ||
    lowerText.includes('summon') ||
    lowerText.includes('police') ||
    lowerText.includes('arrest') ||
    lowerText.includes('detention') ||
    lowerText.includes('testify') ||
    lowerText.includes('interrogat') ||
    lowerText.includes('human rights')
  ) {
    return `Independent Review & Core Facts:
• Institutional Friction: The reported situation underscores persistent tension between civic activists and state security institutions over transparency, constitutional summons, and civil rights.
• Constitutional Supremacy: Demands for top security chiefs to appear in open court or before legal inquiries affirm that state security agencies are not above the judicial process.
• Public Accountability: Reluctance by security agencies to comply with open judicial summons deepens public skepticism regarding democratic policing and the protection of fundamental human rights.

The Verdict:
In a constitutional democracy, state security services must submit to the authority of the courts. No intelligence director, police commissioner, or state agent is above judicial summons. Complying with open legal proceedings is not a favor granted by the state—it is the baseline test of whether public security institutions serve the constitution or operate with impunity.`;
  }

  // 5. Anti-Corruption, Probes, EFCC, ICPC, Public Funds & Misconduct
  if (
    lowerText.includes('corruption') ||
    lowerText.includes('arrest me') ||
    lowerText.includes('efcc') ||
    lowerText.includes('icpc') ||
    lowerText.includes('graft') ||
    lowerText.includes('probe') ||
    lowerText.includes('divert') ||
    lowerText.includes('misappropriat') ||
    lowerText.includes('public funds')
  ) {
    return `Independent Review & Core Facts:
• Anti-Graft Scrutiny: Public attention is focused on official conduct, financial accountability, and investigations into public procurement and treasury management.
• Enforcement Scrutiny: Citizens frequently observe sensational corruption allegations that end in protracted delays, plea deals, or selective prosecution targeting perceived opponents.
• Resource Drain: Financial leakages and systemic diversion of public funds directly starve ${countryName} of needed investment in infrastructure, public health, and basic social security.

The Verdict:
Anti-corruption enforcement must be measured by institutional independence, diligent court prosecution, and recovered stolen assets—not media grandstanding or public dares. True accountability begins when anti-graft agencies investigate and prosecute impartially, regardless of a politician's status, wealth, or proximity to power.`;
  }

  // 6. General Governance & Public Policy Action
  return `Independent Review & Core Facts:
• Reported Development: As reported by ${sourceName}, public interest centers on "${cleanTitle}", prompting active evaluation across policy and civic circles in ${countryName}.
• Key Governance Dimensions: The matter touches on institutional transparency, executive decision-making, and how official actions affect everyday citizens.
• Civic Vigilance: Observers and community leaders are tracking whether official rhetoric and policy statements translate into verifiable delivery and fair administration on the ground.

The Verdict:
Governance must always be evaluated by concrete delivery and constitutional standards rather than symbolic pronouncements. In ${countryName}, sustainable democratic progress requires that leadership actions serve the public interest with openness, accountability, and impartial institutional service to all citizens.`;
}

export function generateCivicPollQuestion(title: string, snippet?: string): string | undefined {
  const cleanTitle = (title || '').replace(/\s*[-–—|]\s*Voxpolis.*$/i, '').trim();
  const text = `${cleanTitle} ${snippet || ''}`.toLowerCase();

  // 1. Petrol / Fuel Pricing & Donald Duke Policy Promise
  if (text.includes('donald duke') && (text.includes('petrol') || text.includes('300') || text.includes('n300'))) {
    return 'Do you agree with Donald Duke that reducing the petrol pump price to N300 per litre is economically viable?';
  }
  if ((text.includes('petrol') || text.includes('fuel')) && (text.includes('300') || text.includes('n300') || text.includes('price down') || text.includes('reduce price'))) {
    return 'Do you believe reducing the national petrol pump price to N300 per litre is economically achievable?';
  }

  // 2. 2027 Presidential Second Term & BTO / Tinubu Re-election
  if ((text.includes('tinubu') || text.includes('pbat')) && (text.includes('second term') || text.includes('2027'))) {
    return 'Do you believe the administration\'s reform record justifies a second term for President Bola Tinubu in 2027?';
  }

  // 3. Seyi Makinde & PVC / Voter Mobilization
  if (text.includes('makinde') && (text.includes('pvc') || text.includes('vote'))) {
    return 'Do you agree with Seyi Makinde that voter mobilization and PVC collection will be the decisive factor in 2027?';
  }

  // 4. Rufai Oseni & Citizen Election Monitoring
  if (text.includes('oseni') && (text.includes('monitor') || text.includes('voting') || text.includes('results'))) {
    return 'Do you agree that citizens and civic groups should independently monitor and collate polling unit results in 2027?';
  }

  // 5. Party Defections & Political Realignments
  if (text.includes('defection') || text.includes('defect') || text.includes('join sdp') || text.includes('join apc') || text.includes('join pdp')) {
    return 'Do continuous political defections weaken democratic opposition and institutional stability?';
  }

  // 6. Campaign Violence & Security
  if (text.includes('gunmen') || text.includes('attack members') || text.includes('campaign violence')) {
    return 'Should electoral authorities disqualify political candidates whose supporters engage in campaign violence?';
  }

  // 7. Core Governance & Economic Debate Topics
  if (text.includes('atiku') && (text.includes('subsidy') || text.includes('fuel') || text.includes('president') || text.includes('2027'))) {
    return 'Do you agree Atiku Abubakar will provide better economic governance if elected president in 2027?';
  }
  if (text.includes('peter obi') || text.includes('obi:') || (text.includes('obi') && text.includes('leadership'))) {
    return 'Do you agree with Peter Obi that Nigeria\'s primary challenge is leadership failure rather than resource scarcity?';
  }
  if (text.includes('minimum wage') || text.includes('salary') || text.includes('workers') || text.includes('wage')) {
    return 'Should federal and state governments accelerate the full, mandatory implementation of the new minimum wage?';
  }
  if (text.includes('state police') || text.includes('policing')) {
    return 'Should individual states be granted constitutional authority to establish and fund their own state police?';
  }
  if (text.includes('local government') && (text.includes('autonomy') || text.includes('allocation'))) {
    return 'Do you support direct financial allocations to local governments without state government control?';
  }
  if (text.includes('inec') || text.includes('election') || text.includes('vote') || text.includes('transmission')) {
    return 'Do you agree that electronic transmission of election results should be made strictly mandatory?';
  }
  if (text.includes('tariff') || text.includes('electricity') || text.includes('power')) {
    return 'Do you agree with the current electricity tariff pricing structure for consumers?';
  }
  if (text.includes('tax') || text.includes('vat') || text.includes('revenue')) {
    return 'Do you support the introduction of new tax reforms under current economic conditions?';
  }
  if (text.includes('oil theft') || text.includes('pipeline') || text.includes('crude')) {
    return 'Do you believe security operations and surveillance measures have effectively curbed crude oil theft?';
  }

  // 8. Genuine Named Speaker Identification (STRICT: never digits, years, or generic tags)
  if (cleanTitle.includes(':') || cleanTitle.includes('—') || cleanTitle.includes('-')) {
    const parts = cleanTitle.split(/[:—–-]/);
    const candidateSpeaker = parts[0]?.trim();
    const isInvalidSpeaker =
      !candidateSpeaker ||
      candidateSpeaker.length < 3 ||
      candidateSpeaker.length > 28 ||
      /^\d+/.test(candidateSpeaker) || // Prevents "2027", "100", etc.
      /^(breaking|just in|report|watch|video|photos?|update|exclusive|opinion|editorial|alert|special|live|court|ndc|apc|pdp|lp|nnpp|inec|fbi|dss|efcc)/i.test(candidateSpeaker) ||
      /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)/i.test(candidateSpeaker);

    if (!isInvalidSpeaker && /[a-zA-Z]{3,}/.test(candidateSpeaker)) {
      return `Do you agree with the position taken by ${candidateSpeaker} on this national issue?`;
    }
  }

  // If there is no specific policy debate or controversy, return undefined (do NOT force a poll)
  return undefined;
}

export function cleanNewsText(raw: string): string {
  if (!raw) return '';
  const decoded = decodeAllHtmlEntities(raw);
  return decoded
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/[^\s)]+/gi, '')
    .replace(/www\.[^\s)]+/gi, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/ONLY AVAILABLE IN PAID PLANS/gi, '')
    .replace(/The post .* appeared first on .*/gi, '')
    .replace(/appeared first on .*/gi, '')
    .replace(/(read more on|also read|click here to read|visit our website|source:)[^.\n]*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchArticlesForCountry(
  countryCode: string,
  language: string = 'en'
): Promise<ArticleData[]> {
  const code = countryCode.toUpperCase();
  const country = getCountryByCode(code);
  const langCode = (language || country.languages[0]?.code || 'en').toLowerCase();

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/api/news?country=${code}&language=${langCode}`);
      if (res.ok) {
        const data = await res.json();
        if (data.articles && data.articles.length > 0) {
          return data.articles;
        }
      }
    } catch (e) {
      console.warn('API news route fetch failed.', e);
    }
    return [];
  }

  // Server-side: read real published articles only (never placeholder text).
  try {
    const { getLatestForCountry } = await import('@/lib/articles');
    return await getLatestForCountry(code);
  } catch (err) {
    console.warn('Server-side article query failed.', err);
    return [];
  }
}

export function getFallbackArticlesForCountry(countryCode: string, language: string = 'en'): ArticleData[] {
  const code = countryCode.toUpperCase();
  const country = getCountryByCode(code);
  const langCode = (language || country.languages[0]?.code || 'en').toLowerCase();
  const templateFn = LOCALIZED_NEWS_TEMPLATES[langCode] || LOCALIZED_NEWS_TEMPLATES.en;
  const localizedData = templateFn(country.name, country.capital);

  return [
    {
      id: `art-${code}-1`,
      slug: `${code.toLowerCase()}-civic-overview-governance-and-constitutional-structure`,
      legacy_slug: `${code.toLowerCase()}-national-parliament-debates-key-policy-reform`,
      title: localizedData.title,
      snippet: localizedData.snippet,
      content: localizedData.content,
      ai_analysis: localizedData.analysis,
      country_code: code,
      language: langCode,
      category: 'civic-overview',
      image_mode: 'breaking_logo',
      source_name: 'Voxpolis Civic Desk',
      source_url: 'https://www.voxpolis.app',
      is_breaking: false,
      is_featured: false,
      tags: [country.name, 'Civic Overview', 'Governance', 'Constitution'],
      views_count: Math.floor(Math.random() * 3000) + 1250,
      total_reading_time_seconds: 190,
      created_at: new Date().toISOString(),
      poll: {
        id: `poll-${code}-1`,
        question: localizedData.pollQuestion,
        agree_count: 512,
        disagree_count: 64,
      },
    },
    {
      id: `art-${code}-2`,
      slug: `${code.toLowerCase()}-civic-overview-public-infrastructure-and-energy-systems`,
      legacy_slug: `${code.toLowerCase()}-infrastructure-and-energy-transition-bill`,
      title: `${country.flag} ${country.name}: Overview of Public Infrastructure & Energy Systems`,
      snippet: `National infrastructure guidelines and energy transition frameworks form central components of long-term economic planning and regional connectivity across ${country.name}.`,
      content: `National infrastructure policy in ${country.name} encompasses transit modernization, power grid reliability, and strategic logistics corridors connecting regional centers with ${country.capital}.

Public capital allocation models prioritize multimodal freight networks, sustainable electricity generation, and municipal utility modernization to support domestic economic resilience.

Civic observers and economic planners emphasize that independent environmental oversight and transparent public procurement remain key requirements for sustainable infrastructure delivery.

Long-term development strategies across the country seek to balance capital investment needs with fiscal sustainability and equitable regional access to essential public utilities.`,
      ai_analysis: `Civic Overview Context:
- Infrastructure Scope: Overview of transport logistics, electrical grids, and public works planning across ${country.name}.
- Regional Connectivity: Priorities connecting municipal economies with the national capital, ${country.capital}.
- Educational Scope: Prepared by Voxpolis Civic Desk as background civic reference; not breaking news reporting.`,
      country_code: code,
      language: langCode,
      category: 'civic-overview',
      image_mode: 'breaking_logo',
      source_name: 'Voxpolis Civic Desk',
      source_url: 'https://www.voxpolis.app',
      is_breaking: false,
      is_featured: false,
      tags: [country.name, 'Civic Overview', 'Infrastructure', 'Energy'],
      views_count: Math.floor(Math.random() * 2000) + 920,
      total_reading_time_seconds: 160,
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      poll: {
        id: `poll-${code}-2`,
        question: `Do you agree with increasing national budget allocation for clean energy transit in ${country.name}?`,
        agree_count: 420,
        disagree_count: 58,
      },
    },
    {
      id: `art-${code}-3`,
      slug: `${code.toLowerCase()}-civic-overview-healthcare-systems-and-public-policy`,
      legacy_slug: `${code.toLowerCase()}-public-healthcare-and-hospital-modernization-package`,
      title: `${country.flag} ${country.name}: Overview of Public Healthcare Systems & Health Policy`,
      snippet: `An educational overview of public healthcare administration, primary medical access, and preventative health services serving communities throughout ${country.name}.`,
      content: `The public healthcare architecture of ${country.name} integrates primary community health centers, secondary referral hospitals, and national public health surveillance.

Healthcare policy focuses on equitable distribution of medical personnel, securing pharmaceutical supply chains, and funding preventative care across both metropolitan centers and rural provinces.

Health system analysts highlight that sustained investment in diagnostic capacity and health workforce retention remains essential for national health security and pandemic preparedness.

Civic discourse surrounding healthcare reform in ${country.name} centers on enhancing patient protections, reducing out-of-pocket costs, and ensuring universal access to essential care.`,
      ai_analysis: `Civic Overview Context:
- System Scope: Structure of primary care, hospital delivery, and health administration in ${country.name}.
- Policy Priorities: Workforce development, medical supply chains, and health equity across provinces.
- Educational Scope: Prepared by Voxpolis Civic Desk as background civic reference; not breaking news reporting.`,
      country_code: code,
      language: langCode,
      category: 'civic-overview',
      image_mode: 'breaking_logo',
      source_name: 'Voxpolis Civic Desk',
      source_url: 'https://www.voxpolis.app',
      is_breaking: false,
      is_featured: false,
      tags: [country.name, 'Civic Overview', 'Healthcare', 'Public Policy'],
      views_count: Math.floor(Math.random() * 1800) + 740,
      total_reading_time_seconds: 175,
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      poll: {
        id: `poll-${code}-3`,
        question: `Should provincial public healthcare facilities receive dedicated statutory funding in ${country.name}?`,
        agree_count: 615,
        disagree_count: 32,
      },
    },
    {
      id: `art-${code}-4`,
      slug: `${code.toLowerCase()}-civic-overview-macroeconomic-policy-and-fiscal-framework`,
      legacy_slug: `${code.toLowerCase()}-fiscal-budget-and-economic-modernization-framework`,
      title: `${country.flag} ${country.name}: Overview of Fiscal Governance & Economic Administration`,
      snippet: `National budgetary guidelines, revenue administration systems, and debt management frameworks define economic governance in ${country.name}.`,
      content: `Economic governance in ${country.name} relies on fiscal policy coordination between the national treasury, monetary authorities, and legislative budget committees.

Key macroeconomic priorities typically include stabilizing currency reserves, managing public debt obligations, and expanding domestic revenue collection without suppressing productive enterprise.

Public finance experts stress that fiscal transparency, timely statutory reporting, and disciplined procurement processes protect public creditworthiness and mitigate inflation.

Policy debates in ${country.capital} frequently address balancing short-term fiscal stabilization measures against long-term investments in social security, education, and economic diversification.`,
      ai_analysis: `Civic Overview Context:
- Governance Scope: Fiscal planning, revenue collection, and public debt oversight in ${country.name}.
- Institutional Roles: Coordination between treasury departments and legislative budget committees in ${country.capital}.
- Educational Scope: Prepared by Voxpolis Civic Desk as background civic reference; not breaking news reporting.`,
      country_code: code,
      language: langCode,
      category: 'civic-overview',
      image_mode: 'breaking_logo',
      source_name: 'Voxpolis Civic Desk',
      source_url: 'https://www.voxpolis.app',
      is_breaking: false,
      is_featured: false,
      tags: [country.name, 'Civic Overview', 'Economy', 'Fiscal Policy'],
      views_count: Math.floor(Math.random() * 2200) + 850,
      total_reading_time_seconds: 185,
      created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
      poll: {
        id: `poll-${code}-4`,
        question: `Do you support prioritizing domestic manufacturing incentives over external public debt in ${country.name}?`,
        agree_count: 489,
        disagree_count: 45,
      },
    },
    {
      id: `art-${code}-5`,
      slug: `${code.toLowerCase()}-civic-overview-regional-trade-and-diplomatic-relations`,
      legacy_slug: `${code.toLowerCase()}-regional-trade-and-diplomatic-cooperation-pact`,
      title: `${country.flag} ${country.name}: Overview of Regional Trade Integration & Foreign Policy`,
      snippet: `Cross-border trade agreements, customs harmonization, and multilateral diplomacy shape ${country.name}'s regional and international cooperation.`,
      content: `Diplomatic and trade policy in ${country.name} focuses on bilateral partnerships, multilateral treaties, and regional economic integration to facilitate cross-border trade.

Key areas of policy alignment include harmonized customs procedures, reduced tariff barriers on essential goods, and cooperative security protocols across transport corridors.

Commercial bodies and regional trade analysts note that streamlined border clearance and standardized regulatory frameworks lower transaction costs for local producers.

As international supply chains evolve, foreign policy leaders in ${country.capital} pursue economic diplomacy aimed at attracting sustainable investment and maintaining regional stability.`,
      ai_analysis: `Civic Overview Context:
- International Scope: Trade treaties, regional customs cooperation, and bilateral diplomacy for ${country.name}.
- Commercial Impact: Cross-border transport facilitation and regulatory harmonization.
- Educational Scope: Prepared by Voxpolis Civic Desk as background civic reference; not breaking news reporting.`,
      country_code: code,
      language: langCode,
      category: 'civic-overview',
      image_mode: 'breaking_logo',
      source_name: 'Voxpolis Civic Desk',
      source_url: 'https://www.voxpolis.app',
      is_breaking: false,
      is_featured: false,
      tags: [country.name, 'Civic Overview', 'Trade', 'Diplomacy'],
      views_count: Math.floor(Math.random() * 1600) + 610,
      total_reading_time_seconds: 165,
      created_at: new Date(Date.now() - 3600000 * 14).toISOString(),
      poll: {
        id: `poll-${code}-5`,
        question: `Will regional customs harmonization benefit local producers and consumers in ${country.name}?`,
        agree_count: 534,
        disagree_count: 71,
      },
    },
    {
      id: `art-${code}-6`,
      slug: `${code.toLowerCase()}-civic-overview-education-system-and-workforce-skills`,
      legacy_slug: `${code.toLowerCase()}-education-and-digital-workforce-skills-program`,
      title: `${country.flag} ${country.name}: Overview of Education Architecture & Workforce Skills`,
      snippet: `Educational infrastructure, curriculum standards, and vocational training initiatives support workforce readiness and youth opportunity across ${country.name}.`,
      content: `The educational framework of ${country.name} spans universal basic schooling, secondary curricula, and technical tertiary institutions designed to align graduate skills with economic demand.

Strategic educational initiatives emphasize expanding digital literacy, updating vocational apprenticeships, and supporting teacher development across all districts.

Academic researchers and industry stakeholders stress that modernizing technical curricula and expanding broadband access across rural campuses are critical for reducing youth unemployment.

Civic discussions in ${country.name} emphasize the necessity of equitable education funding to ensure that young citizens in every region can access quality training and economic mobility.`,
      ai_analysis: `Civic Overview Context:
- Educational Scope: Structure of primary, secondary, and vocational education in ${country.name}.
- Workforce Alignment: Technical apprenticeships, digital literacy, and youth employment priorities.
- Educational Scope: Prepared by Voxpolis Civic Desk as background civic reference; not breaking news reporting.`,
      country_code: code,
      language: langCode,
      category: 'civic-overview',
      image_mode: 'breaking_logo',
      source_name: 'Voxpolis Civic Desk',
      source_url: 'https://www.voxpolis.app',
      is_breaking: false,
      is_featured: false,
      tags: [country.name, 'Civic Overview', 'Education', 'Youth'],
      views_count: Math.floor(Math.random() * 1400) + 530,
      total_reading_time_seconds: 170,
      created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
      poll: {
        id: `poll-${code}-6`,
        question: `Should practical technical apprenticeships receive equal national funding to traditional academic degrees in ${country.name}?`,
        agree_count: 678,
        disagree_count: 39,
      },
    },
    {
      id: `art-${code}-7`,
      slug: `${code.toLowerCase()}-civic-overview-judicial-system-and-constitutional-rule-of-law`,
      legacy_slug: `${code.toLowerCase()}-judicial-reform-and-institutional-transparency-code`,
      title: `${country.flag} ${country.name}: Overview of Judicial Architecture & Constitutional Rule of Law`,
      snippet: `The hierarchy of courts, procedural standards, and judicial independence safeguards form the foundation of constitutional justice in ${country.name}.`,
      content: `The judicial system of ${country.name} is structured around a constitutional hierarchy of courts, ranging from community magistrates to appellate benches and the apex supreme court.

Core procedural codes protect fundamental rights during legal proceedings, mandate public access to court cause lists, and establish statutory benchmarks for dispute resolution.

Legal scholars and civil society advocates highlight that institutional independence and transparent appointment mechanisms are vital for maintaining public trust in the judicial branch.

Ongoing judicial administration reforms in ${country.name} focus on digitizing case filings, reducing remand backlogs, and ensuring equal access to justice for vulnerable citizens.`,
      ai_analysis: `Civic Overview Context:
- Legal Architecture: Court hierarchy and statutory constitutional protections in ${country.name}.
- Judicial Standards: Due process, electronic case management, and institutional independence.
- Educational Scope: Prepared by Voxpolis Civic Desk as background civic reference; not breaking news reporting.`,
      country_code: code,
      language: langCode,
      category: 'civic-overview',
      image_mode: 'breaking_logo',
      source_name: 'Voxpolis Civic Desk',
      source_url: 'https://www.voxpolis.app',
      is_breaking: false,
      is_featured: false,
      tags: [country.name, 'Civic Overview', 'Judiciary', 'Rule of Law'],
      views_count: Math.floor(Math.random() * 1900) + 810,
      total_reading_time_seconds: 180,
      created_at: new Date(Date.now() - 3600000 * 22).toISOString(),
      poll: {
        id: `poll-${code}-7`,
        question: `Do you agree that electronic court systems and strict case deadlines will enhance judicial accountability in ${country.name}?`,
        agree_count: 590,
        disagree_count: 28,
      },
    },
    {
      id: `art-${code}-8`,
      slug: `${code.toLowerCase()}-civic-overview-agricultural-structure-and-food-security`,
      legacy_slug: `${code.toLowerCase()}-agricultural-resilience-and-food-security-plan`,
      title: `${country.flag} ${country.name}: Overview of Agricultural Structure & Food Security Framework`,
      snippet: `Agrarian systems, smallholder farming frameworks, and strategic food reserves underpin rural livelihoods and food security in ${country.name}.`,
      content: `Agriculture forms a foundational pillar of rural employment, domestic food supply, and economic resilience across ${country.name}.

National agricultural frameworks address smallholder cooperative financing, localized grain storage infrastructure, and irrigation development to buffer against climate volatility.

Agrarian economists emphasize that reducing post-harvest losses through regional processing facilities is critical for stabilizing food prices in urban retail markets.

Policy discussions in ${country.capital} focus on expanding farmer access to affordable inputs, sustainable water management, and rural transportation networks to safeguard long-term food sovereignty.`,
      ai_analysis: `Civic Overview Context:
- Agrarian Scope: Structure of agricultural production and rural farming systems in ${country.name}.
- Food Security: Grain reserves, irrigation access, and supply chain logistics.
- Educational Scope: Prepared by Voxpolis Civic Desk as background civic reference; not breaking news reporting.`,
      country_code: code,
      language: langCode,
      category: 'civic-overview',
      image_mode: 'breaking_logo',
      source_name: 'Voxpolis Civic Desk',
      source_url: 'https://www.voxpolis.app',
      is_breaking: false,
      is_featured: false,
      tags: [country.name, 'Civic Overview', 'Agriculture', 'Food Security'],
      views_count: Math.floor(Math.random() * 1750) + 680,
      total_reading_time_seconds: 170,
      created_at: new Date(Date.now() - 3600000 * 26).toISOString(),
      poll: {
        id: `poll-${code}-8`,
        question: `Should the national budget allocate more emergency funding to decentralized grain storage and smallholder irrigation in ${country.name}?`,
        agree_count: 642,
        disagree_count: 41,
      },
    },
  ];
}

export function formatExactTimestamp(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
    return `${timeStr} • ${dateFormatted}`;
  } catch {
    return dateStr || '';
  }
}

export const BREAKING_NEWS_FALLBACK = '/breaking-news-banner.png';
export const STANDARD_NEWS_FALLBACKS = [
  '/voxpolis-fallback-1.png',
  '/voxpolis-fallback-2.png',
];

export function getStandardFallbackImage(seed?: string | number): string {
  if (typeof seed === 'number') {
    return STANDARD_NEWS_FALLBACKS[Math.abs(seed) % STANDARD_NEWS_FALLBACKS.length];
  }
  if (typeof seed === 'string' && seed.length > 0) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return STANDARD_NEWS_FALLBACKS[Math.abs(hash) % STANDARD_NEWS_FALLBACKS.length];
  }
  return STANDARD_NEWS_FALLBACKS[0];
}

export function getArticleFallbackUrl(article: Partial<ArticleData>, seed?: number | string): string {
  if (article.is_breaking) {
    return BREAKING_NEWS_FALLBACK;
  }
  return getStandardFallbackImage(seed !== undefined ? seed : (article.slug || article.id || article.title || ''));
}

/**
 * Image for a story: its licensed photo if it has one (always with a credit),
 * otherwise the generated Voxpolis story card. Publisher photos are never shown.
 */
export function getArticleImageUrl(article: Partial<ArticleData>, seed?: number | string): string {
  if (isUsablePhoto(article.original_image_url, article.image_credit)) {
    return article.original_image_url!.trim();
  }
  if (article.slug) return `/card/${encodeURIComponent(article.slug)}`;
  return getArticleFallbackUrl(article, seed);
}
