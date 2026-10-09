import { getCountryByCode } from '@/config/countries';
import { fetchRssArticlesForCountry } from './rss';
import { decodeAllHtmlEntities } from './news-rewriter';

export interface ArticleData {
  id: string;
  slug: string;
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
  'polling unit', 'campaign convoy', 'political rally',
  // Multilingual political terms (French, Spanish, Portuguese, German)
  'politique', 'politiques', 'gouvernement', 'gouvernance', 'parlement', 'assemblee',
  'assemblee nationale', 'depute', 'deputes', 'ministre', 'ministere',
  'presidentielle', 'senat', 'elections', 'electorale',
  'parti politique', 'opposition', 'decret',
  'politica', 'gobierno', 'gobernanza', 'parlamento', 'diputado', 'presidencia',
  'partido politico', 'orçamento', 'governo', 'politik', 'regierung'
];

const FORBIDDEN_NON_POLITICAL_KEYWORDS = [
  // 1. Sports & Athletics (STRICTLY BANNED on Voxpolis)
  'super eagles', 'super falcons', 'akor adams', 'osimhen', 'lookman', 'boniface', 'iwobi', 'chukwueze', 'nwabali',
  'football', 'soccer', 'premier league', 'champions league', 'europa league', 'la liga', 'serie a', 'bundesliga',
  'world cup', 'fifa', 'caf', 'afcon', 'nff', 'npfl', "ballon d'or", 'fa cup',
  'arsenal', 'chelsea', 'manchester united', 'manchester city', 'liverpool', 'real madrid', 'barcelona', 'bayern', 'psg',
  'goal', 'goals', 'scored', 'scoreline', 'penalty', 'penalties', 'half-time', 'halftime', 'full-time',
  'striker', 'midfielder', 'defender', 'goalkeeper', 'coach', 'head coach', 'referee', 'stoppage time', 'fixture', 'fixtures',
  'qualifier', 'qualifiers', 'friendly match', 'stadium', 'rescues super eagles', 'super eagles draw',
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

  // 5. Strictly exclude all items matching the non-political forbidden dictionary
  // Use word-boundary safety for short words (<= 4 chars like 'rema') to avoid false collisions with words like 'remands'
  for (const forbidden of FORBIDDEN_NON_POLITICAL_KEYWORDS) {
    if (forbidden.length <= 4) {
      if (new RegExp(`\\b${forbidden}\\b`, 'i').test(text)) return false;
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

  // 11. Must contain a genuine political governance term
  return POLITICAL_KEYWORDS.some((kw) => text.includes(kw));
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
    title: `🇫🇷 ${country} : Le Parlement Ouvre les Débats sur la Grande Réforme Governance et Numérique`,
    snippet: `Les députés réunis à ${capital} ont présenté aujourd'hui une synthèse législative majeure visant à moderniser les services publics, la santé et l'économie résiliente.`,
    content: `CAPITALE (${capital.toUpperCase()}) — Les représentants parlementaires ont officiellement ouvert aujourd'hui une session ministérielle dédiée au projet de loi de modernisation de la gouvernance publique à ${country}.
    
Le rapport déposé devant l'Assemblée comprend quatre piliers majeurs : la dématérialisation accélérée des démarches administratives, le renforcement de la résilience énergétique régionale, la réallocation stratégique des budgets de santé publique et la protection renforcée des infrastructures numériques critiques.

Les membres du comité ministériel ont souligné que ce texte de loi bénéficie d'un soutien transpartisan significatif et fera l'objet d'examens détaillés en commission avant son vote final prévu le mois prochain.

"Cette réforme répond directement aux attentes des citoyens en matière de transparence, de rapidité administrative et de souveraineté numérique," a déclaré le rapporteur de la commission lors d'un point presse à ${capital}.`,
    analysis: `Analyse Factuelle de l'Article :
• Fait 1 : Le Parlement à ${capital} a engagé les débats sur le projet de modernisation administrative et numérique de ${country}.
• Fait 2 : Les dispositions clés couvrent la dématérialisation des démarches, l'efficacité budgétaire de la santé et la sécurité des données publiques.
• Fait 3 : Le texte dispose d'un soutien multi-parti et passe en révision de commission avant le vote final.`,
    pollQuestion: `Êtes-vous d'accord avec la priorité accordée à la dématérialisation des services publics à ${country} ?`,
  }),

  es: (country, capital) => ({
    title: `🇪🇸 ${country}: El Congreso Inicia el Debate sobre la Ley de Modernización Digital y Eficiencia`,
    snippet: `Los parlamentarios reunidos en ${capital} presentaron hoy un paquete legislativo integral para fortalecer la infraestructura pública y los servicios de salud.`,
    content: `SEDE PARLAMENTARIA (${capital.toUpperCase()}) — Representantes legislativos introdujeron oficialmente hoy una amplia agenda de reforma gubernamental destinada a optimizar los servicios públicos, mejorar la financiación sanitaria y consolidar la ciberseguridad en ${country}.

El paquete normativo aborda proyectos prioritarios como la modernización de redes de transporte, subvenciones regionales para la transición energética y auditorías de transparencia en la administración pública.

Fuentes oficiales confirmaron que las propuestas pasarán a la comisión parlamentaria para su evaluación detallada antes de la votación definitiva programada para las próximas semanas.`,
    analysis: `Análisis Factual del Artículo:
• Hecho 1: El Congreso en ${capital} inició la discusión sobre la reforma de gobernanza digital de ${country}.
• Hecho 2: La iniciativa abarca infraestructura de transporte, sanidad pública e inspecciones de ciberseguridad.
• Hecho 3: El proyecto cuenta con amplio respaldo institucional y avanza a dictamen de comisión.`,
    pollQuestion: `¿Está de acuerdo con incrementar la inversión estatal en infraestructuras digitales públicas en ${country}?`,
  }),

  de: (country, capital) => ({
    title: `🇩🇪 ${country}: Gesetzgeber Beraten über Umfassendes Paket zur Verwaltungserneuerung`,
    snippet: `Abgeordnete in ${capital} haben heute neue Gesetzesinitiativen zur Stärkung der digitalen Infrastruktur und der wirtschaftlichen Resilienz vorgestellt.`,
    content: `PARLAMENTSVIERTEL (${capital.toUpperCase()}) — Die Abgeordneten haben heute offiziell einen Gesetzentwurf zur Modernisierung der öffentlichen Verwaltung in ${country} eingebracht.

Der Entwurf umfasst verbindliche Standards für Cybersicherheit, Fördermittel für Kommunen zur digitalen Transformation sowie Leitlinien für nachhaltige Energienetze.

Die Gesetzesinitiative wird nun in den zuständigen Ausschüssen detailliert geprüft, bevor die abschließende Abstimmung im Parlament ansteht.`,
    analysis: `Faktenbasierte Analyse:
• Fakt 1: Das Parlament in ${capital} berät über ein Gesetzpaket zur Verwaltungsmodernisierung in ${country}.
• Fakt 2: Die Schwerpunkte liegen auf Cybersicherheitsstandards, Kommunalförderung und Netzstabilität.
• Fakt 3: Der Entwurf befindet sich in der Ausschussberatung vor der Schlussabstimmung.`,
    pollQuestion: `Stimmen Sie der Priorisierung digitaler Verwaltungsleistungen in ${country} zu?`,
  }),

  ja: (country, capital) => ({
    title: `🇯🇵 ${country}国会：デジタル行政改革と経済安全保障に関する包括法案を審議`,
    snippet: `${capital}の国会議事堂にて、公共サービスのデジタル化推進と医療基盤の効率化を目指す主要法案が提出されました。`,
    content: `首都（${capital.toUpperCase()}）— ${country}の国会にて本日、行政手続きの効率化、地域医療支援の最適化、ならびにデジタルインフラのセキュリティ強化を目的とした包括的改革法案が正式に上程されました。

本法案には、主要なサイバーインシデント報告の義務化、地方自治体へのデジタル移行補助金の交付、および独立したリスク監査システムの導入が含まれています。

超党派による調整が進められており、各専門委員会での審議を経て、来月にも最終採決が行われる見通しです。`,
    analysis: `記事の事実分析：
・事実 1：${capital}の国会にて、${country}の行政・デジタル基盤改革法案の審議が開始されました。
・事実 2：主要項目には、サイバーセキュリティ監査、地方自治体支援、および行政手続きのデジタル化が含まれます。
・事実 3：超党派の合意に基づき、委員会審議を経て最終採決へ進みます。`,
    pollQuestion: `${country}における行政手続きのデジタル化推進方針に賛成ですか？`,
  }),

  en: (country, capital) => ({
    title: `${country} National Parliament Opens Debate on Governance & Digital Administration Reform`,
    snippet: `Lawmakers in ${capital} gathered today to introduce a comprehensive multi-year legislative summary aimed at improving public health efficiency, transit resilience, and digital oversight.`,
    content: `PARLIAMENT BUILDING (${capital.toUpperCase()}) — Parliamentary representatives officially introduced a major governance reform package today designed to streamline public administration, expand healthcare funding protocols, and solidify cybersecurity protections across ${country}.

The legislative agenda includes detailed provisions for 72-hour mandatory reporting on critical infrastructure cyber incidents, grants for municipal digital service upgrades, and independent risk audits for public sector algorithms.

Committee sponsors underscored that the reform package enjoys broad multi-party backing and will undergo rigorous committee evaluation before coming to a final vote next month.

"This legislation establishes clear, enforceable standards to ensure our public institutions remain resilient, transparent, and responsive to citizens," remarked the committee chair during a briefing outside parliament in ${capital}.`,
    analysis: `Analysis of Reported Facts:
- Fact 1: Parliamentary representatives in ${capital} introduced a comprehensive governance reform proposal for ${country}.
- Fact 2: Key provisions address public administration efficiency, healthcare funding, transit resilience, and cybersecurity audits.
- Fact 3: The bill has multi-party backing and moves to detailed committee review prior to a final vote.`,
    pollQuestion: `Do you agree with prioritizing digital governance and cybersecurity standards in ${country}?`,
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
      console.warn('API news route fetch failed, falling back to local RSS or seeded content.', e);
    }
  }

  try {
    const rssArticles = await fetchRssArticlesForCountry(code, langCode);
    
    let newsDataArticles: ArticleData[] = [];
    const apiKey = process.env.NEWSDATA_API_KEY;

    if (apiKey && apiKey !== 'pub_demo_key' && apiKey.trim() !== '') {
      try {
        const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&country=${code.toLowerCase()}&category=politics&language=${langCode}`;
        const res = await fetch(url, { next: { revalidate: 7200 } });
        if (res.ok) {
          const data = await res.json();
          if (data.results && Array.isArray(data.results)) {
            newsDataArticles = data.results.map((item: any, idx: number) => {
              const cleanTitle = cleanNewsText(item.title || 'Political Update');
              const rawDesc = cleanNewsText(item.description || item.snippet || item.title || '');
              const rawContent = cleanNewsText(item.content || item.description || item.title || '');
              const sourceName = item.source_id || `${country.name} Press`;

              const displayTitle = cleanTitle.endsWith(' - Voxpolis') ? cleanTitle : `${cleanTitle} - Voxpolis`;
              const cleanSlug = cleanTitle
                .toLowerCase()
                .replace(/ - voxpolis$/i, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
                .slice(0, 80);

              const briefContent = synthesize4ParagraphBrief(
                displayTitle,
                rawDesc,
                rawContent,
                sourceName,
                country.name,
                country.capital
              );

              return {
                id: item.article_id || `newsdata-${idx}`,
                slug: cleanSlug,
                title: displayTitle,
                snippet: rawDesc,
                content: briefContent,
                ai_analysis: generateAiAnalysisSummary(displayTitle, rawDesc, sourceName, country.name),
                country_code: code,
                language: langCode,
                category: item.category?.[0] || 'politics',
                image_mode: item.image_url ? 'original' : 'breaking_logo',
                original_image_url: item.image_url || undefined,
                source_name: sourceName,
                source_url: item.link || 'https://voxpolis.app',
                is_breaking: idx === 0,
                tags: item.keywords || ['Politics', country.name],
                views_count: 0,
                total_reading_time_seconds: 180,
                created_at: item.pubDate || new Date().toISOString(),
                is_archived: isArticleArchived(item.pubDate || new Date().toISOString()),
                poll: {
                  id: `poll-${idx}`,
                  question: generateCivicPollQuestion(displayTitle, rawDesc),
                  agree_count: 0,
                  disagree_count: 0,
                },
              };
            });
          }
        }
      } catch (e) {
        console.warn('NewsData API fetch encountered an error on server side.', e);
      }
    }

    const combined = [...newsDataArticles, ...rssArticles];

    if (combined.length > 0) {
      const seen = new Set<string>();
      const unique: ArticleData[] = [];
      for (const a of combined) {
        if (!isPoliticalNews(a.title, a.snippet, a.tags)) continue;
        if (!isRelevantToCountry(a.title, a.snippet, code)) continue;

        const k = a.title.toLowerCase().slice(0, 35);
        if (!seen.has(k)) {
          seen.add(k);
          unique.push({
            ...a,
            is_archived: isArticleArchived(a.created_at),
            poll: a.poll,
          });
        }
      }
      
      if (unique.length > 0) {
        return unique;
      }
    }
  } catch (err) {
    console.warn('Server-side RSS/NewsData fetch error, using fallback seed.', err);
  }

  const templateFn = LOCALIZED_NEWS_TEMPLATES[langCode] || LOCALIZED_NEWS_TEMPLATES.en;
  const localizedData = templateFn(country.name, country.capital);

  return [
    {
      id: `art-${code}-1`,
      slug: `${code.toLowerCase()}-national-parliament-debates-key-policy-reform`,
      title: localizedData.title,
      snippet: localizedData.snippet,
      content: localizedData.content,
      ai_analysis: localizedData.analysis,
      country_code: code,
      language: langCode,
      category: 'politics',
      image_mode: 'breaking_logo',
      source_name: `${country.name} Official Digest`,
      source_url: 'https://voxpolis.app',
      is_breaking: true,
      tags: [country.name, 'Governance', 'Parliament'],
      views_count: Math.floor(Math.random() * 3000) + 1250,
      total_reading_time_seconds: 190,
      created_at: new Date().toISOString(),
      affiliate_link_label: 'Official Voxpolis Partner Digest',
      affiliate_link_url: 'https://voxpolis.app',
      poll: {
        id: `poll-${code}-1`,
        question: localizedData.pollQuestion,
        agree_count: 512,
        disagree_count: 64,
      },
    },
    {
      id: `art-${code}-2`,
      slug: `${code.toLowerCase()}-infrastructure-and-energy-transition-bill`,
      title: `${country.flag} ${country.name}: Multi-Billion Transit & Clean Energy Blueprint Approved`,
      snippet: `Government ministry presents full technical guidelines to modernize rail networks, upgrade regional ports, and integrate grid-scale storage systems in ${country.name}.`,
      content: `CAPITAL CITY (${country.capital.toUpperCase()}) — Government ministers officially introduced a multi-billion national infrastructure blueprint today aimed at modernizing regional transit networks, expanding clean power grids, and reinforcing trade infrastructure across ${country.name}.

The comprehensive strategy outlines three primary implementation phases: immediate grid upgrades to absorb renewable power generation, modernization of cargo transport facilities to reduce logistics bottlenecks, and state grants for municipal clean energy adoption.

Addressing press representatives in ${country.capital}, government officials confirmed that independent environmental and economic impact assessments will be published prior to project execution.

"This long-term investment ensures sustainable economic growth and transport reliability for decades to come," stated the Ministry spokesperson.`,
      ai_analysis: `Analysis of Reported Facts:
- Fact 1: Government ministers unveiled a multi-billion national infrastructure plan for ${country.name}.
- Fact 2: Key pillars include regional transit modernization, clean grid integration, and port upgrades.
- Fact 3: Environmental and economic impact assessments will be published before implementation.`,
      country_code: code,
      language: langCode,
      category: 'infrastructure',
      image_mode: 'breaking_logo',
      source_name: `${country.name} Press Agency`,
      source_url: 'https://voxpolis.app',
      is_breaking: false,
      tags: [country.name, 'Infrastructure', 'Energy'],
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
      slug: `${code.toLowerCase()}-public-healthcare-and-hospital-modernization-package`,
      title: `${country.flag} ${country.name} Cabinet Approves Major Healthcare Resilience Budget`,
      snippet: `Public health officials announce direct capital grants to expand regional clinics, upgrade diagnostics, and reinforce pharmaceutical supply chains nationwide.`,
      content: `MINISTRY OF HEALTH (${country.capital.toUpperCase()}) — Health authorities in ${country.name} have confirmed the official rollout of a national healthcare revitalization initiative focused on modernizing secondary hospital facilities and expanding primary care access.

The program establishes targeted funding for decentralized emergency clinics, cold-chain medical storage, and specialized clinician retention incentives across both urban centers and rural provinces.

A joint parliamentary monitoring panel will oversee procurement processes to guarantee full transparency, competitive bidding, and prompt equipment deployment.

"Ensuring affordable, resilient healthcare for every family is the cornerstone of our national stability," noted the Director of Public Health during a press briefing today.`,
      ai_analysis: `Analysis of Reported Facts:
- Fact 1: Ministry of Health approved a comprehensive public healthcare revitalization grant across ${country.name}.
- Fact 2: Key priorities include regional clinic upgrades, supply chain security, and medical staff retention.
- Fact 3: Parliamentary oversight committee established to monitor equipment procurement.`,
      country_code: code,
      language: langCode,
      category: 'health',
      image_mode: 'breaking_logo',
      source_name: `${country.name} National Monitor`,
      source_url: 'https://voxpolis.app',
      is_breaking: false,
      tags: [country.name, 'Healthcare', 'Public Policy'],
      views_count: Math.floor(Math.random() * 1800) + 740,
      total_reading_time_seconds: 175,
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      poll: {
        id: `poll-${code}-3`,
        question: `Should the government mandate higher baseline spending on provincial public hospitals in ${country.name}?`,
        agree_count: 615,
        disagree_count: 32,
      },
    },
    {
      id: `art-${code}-4`,
      slug: `${code.toLowerCase()}-fiscal-budget-and-economic-modernization-framework`,
      title: `${country.flag} ${country.name} Treasury Unveils Comprehensive Fiscal Alignment Strategy`,
      snippet: `Finance authorities introduce measures to curb inflationary pressures, streamline public debt servicing, and broaden domestic revenue collection without burdening small businesses.`,
      content: `TREASURY HEADQUARTERS (${country.capital.toUpperCase()}) — Economic policymakers have released ${country.name}'s updated macroeconomic guideline, introducing fiscal consolidation measures designed to stabilize currency reserves and improve revenue administration.

The framework proposes automated tax assessment portals for commercial entities, a reduction in non-essential executive recurrent expenditures, and dedicated credit guarantees for domestic manufacturers.

Financial analysts noted that the strategy strikes a calculated balance between controlling inflation and sustaining capital investments required for long-term job creation.

"Fiscal discipline combined with targeted support for local enterprise will safeguard our national economic resilience," emphasized the Treasury Secretary during the presentation.`,
      ai_analysis: `Analysis of Reported Facts:
- Fact 1: Finance officials presented an updated fiscal strategy aimed at debt sustainability in ${country.name}.
- Fact 2: Policy measures focus on automated tax collection, spending efficiency, and manufacturing credits.
- Fact 3: Economic targets prioritize currency stabilization and inflation management.`,
      country_code: code,
      language: langCode,
      category: 'economy',
      image_mode: 'breaking_logo',
      source_name: `${country.name} Financial Dispatch`,
      source_url: 'https://voxpolis.app',
      is_breaking: false,
      tags: [country.name, 'Economy', 'Fiscal Policy'],
      views_count: Math.floor(Math.random() * 2200) + 850,
      total_reading_time_seconds: 185,
      created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
      poll: {
        id: `poll-${code}-4`,
        question: `Do you support prioritizing domestic manufacturing tax credits over public borrowing in ${country.name}?`,
        agree_count: 489,
        disagree_count: 45,
      },
    },
    {
      id: `art-${code}-5`,
      slug: `${code.toLowerCase()}-regional-trade-and-diplomatic-cooperation-pact`,
      title: `${country.flag} ${country.name} Ratifies Regional Economic and Border Trade Agreement`,
      snippet: `Foreign affairs delegation concludes bilateral protocol lowering cross-border tariffs, harmonizing customs inspections, and establishing joint transport corridors.`,
      content: `MINISTRY OF FOREIGN AFFAIRS (${country.capital.toUpperCase()}) — Diplomatic envoys from ${country.name} successfully concluded high-level multilateral trade talks today, agreeing on reciprocal border customs protocols to accelerate regional commerce.

The ratified accord eliminates duplicate inspection procedures at critical border crossings, harmonizes phytosanitary certifications for agricultural exports, and implements integrated cargo tracking systems.

Trade chambers and transport unions welcomed the milestone, citing significant projected reductions in cross-border transit times and clearing costs.

"This partnership solidifies ${country.name}'s standing as an active proponent of regional economic integration and shared prosperity," affirmed the lead diplomatic envoy.`,
      ai_analysis: `Analysis of Reported Facts:
- Fact 1: ${country.name} ratified a regional trade protocol to streamline cross-border customs procedures.
- Fact 2: Accord addresses tariff reduction, cargo inspection harmonization, and transport corridors.
- Fact 3: Commercial transport operators anticipate reduced freight transit delays and lower operating costs.`,
      country_code: code,
      language: langCode,
      category: 'diplomacy',
      image_mode: 'breaking_logo',
      source_name: `${country.name} Diplomatic Review`,
      source_url: 'https://voxpolis.app',
      is_breaking: false,
      tags: [country.name, 'Trade', 'Diplomacy'],
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
      slug: `${code.toLowerCase()}-education-and-digital-workforce-skills-program`,
      title: `${country.flag} ${country.name} Launches National Technical & Digital Education Initiative`,
      snippet: `Education ministry rolls out nationwide curriculum enhancements and high-speed campus connectivity to equip young graduates with competitive vocational skills.`,
      content: `DEPARTMENT OF EDUCATION (${country.capital.toUpperCase()}) — Education authorities today launched an ambitious national skill development framework aimed at aligning vocational curricula with emerging digital and engineering industries in ${country.name}.

The program funds fiber-optic broadband installations across tertiary institutions, establishes accredited apprenticeship partnerships with private sector employers, and creates subsidized teacher training institutes.

Industry leaders commended the initiative as a pragmatic response to graduate employment demands and rapidly expanding technological sectors across the continent.

"Equipping our youth with verified practical competencies ensures long-term industrial self-reliance and civic vitality," the Education Minister stated during the inaugurating ceremony.`,
      ai_analysis: `Analysis of Reported Facts:
- Fact 1: Department of Education unveiled a nationwide technical training framework for ${country.name}.
- Fact 2: Key provisions fund university digital connectivity, vocational standards, and apprenticeships.
- Fact 3: Program involves direct collaboration between educational boards and private industrial partners.`,
      country_code: code,
      language: langCode,
      category: 'education',
      image_mode: 'breaking_logo',
      source_name: `${country.name} Education Gazette`,
      source_url: 'https://voxpolis.app',
      is_breaking: false,
      tags: [country.name, 'Education', 'Youth'],
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
      slug: `${code.toLowerCase()}-judicial-reform-and-institutional-transparency-code`,
      title: `${country.flag} ${country.name} Judiciary Adopts New Case Tracking & Public Transparency Code`,
      snippet: `Chief Justice and legal councils approve digital court filing standards and mandatory timelines to eliminate trial backlogs and enforce constitutional accountability.`,
      content: `SUPREME COURT BENCH (${country.capital.toUpperCase()}) — Senior judicial officers in ${country.name} have formally instituted an updated procedural code mandating electronic case filing, public cause list access, and strict trial duration benchmarks.

The judicial reforms are designed to eliminate prolonged commercial litigation backlogs, protect fundamental rights during pretrial custody, and publish all appellate verdicts within fourteen days of pronouncement.

Civil liberties organizations and the National Bar Association welcomed the transparency code as an essential structural step toward public confidence in the judicial branch.

"An expeditious, transparent justice system is the highest guarantee of civic liberty and constitutional democracy," remarked the presiding judicial authority.`,
      ai_analysis: `Analysis of Reported Facts:
- Fact 1: Judicial council in ${country.name} established updated case tracking and public filing guidelines.
- Fact 2: Measures require electronic court records and strict statutory duration limits for pending cases.
- Fact 3: Legal community leaders expressed support for increased transparency in appellate rulings.`,
      country_code: code,
      language: langCode,
      category: 'judiciary',
      image_mode: 'breaking_logo',
      source_name: `${country.name} Legal Chronicle`,
      source_url: 'https://voxpolis.app',
      is_breaking: false,
      tags: [country.name, 'Judiciary', 'Rule of Law'],
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
      slug: `${code.toLowerCase()}-agricultural-resilience-and-food-security-plan`,
      title: `${country.flag} ${country.name} Ministry Outlines Strategic Food Reserve & Farmer Support Plan`,
      snippet: `Agricultural stakeholders introduce nationwide dry-season irrigation grants, subsidized organic inputs, and localized storage silos to protect consumer food affordability.`,
      content: `MINISTRY OF AGRICULTURE (${country.capital.toUpperCase()}) — Agricultural planners have unveiled a multi-province food security strategy aimed at insulating ${country.name} from global commodity price volatility and weather disruptions.

Key pillars of the program include zero-interest machinery financing for farming cooperatives, the construction of decentralized grain storage silos, and rehabilitated solar irrigation channels in key breadbasket regions.

Farmers' federations emphasized that localized processing facilities will dramatically cut post-harvest food waste and stabilize market food prices for urban households.

"Empowering our agricultural workforce with modern logistics and reliable irrigation ensures food sovereignty for all citizens," declared the Agriculture Director.`,
      ai_analysis: `Analysis of Reported Facts:
- Fact 1: Agriculture ministry in ${country.name} presented a national food reserve and irrigation program.
- Fact 2: Strategy targets cooperative machinery financing, solar irrigation canals, and localized grain silos.
- Fact 3: Farm federations project notable reductions in post-harvest losses and retail consumer food costs.`,
      country_code: code,
      language: langCode,
      category: 'agriculture',
      image_mode: 'breaking_logo',
      source_name: `${country.name} Agrarian Herald`,
      source_url: 'https://voxpolis.app',
      is_breaking: false,
      tags: [country.name, 'Agriculture', 'Food Security'],
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

export function getArticleImageUrl(article: Partial<ArticleData>, seed?: number | string): string {
  if (
    article.original_image_url &&
    article.original_image_url.trim() !== '' &&
    !article.original_image_url.includes('google.com/news')
  ) {
    return article.original_image_url.trim();
  }
  return getArticleFallbackUrl(article, seed);
}
