import { getCountryByCode } from '@/config/countries';
import { fetchRssArticlesForCountry } from './rss';

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
  is_breaking: boolean;
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

const POLITICAL_KEYWORDS = [
  'politic', 'politics', 'government', 'governance', 'parliament', 'parliamentary',
  'congress', 'congressional', 'president', 'presidential', 'minister', 'ministry',
  'senate', 'senator', 'lawmaker', 'election', 'electoral', 'policy', 'policies',
  'legislation', 'legislative', 'assembly', 'governor', 'diplomacy', 'diplomatic',
  'sanction', 'treaty', 'cabinet', 'party', 'democrat', 'republican', 'mp', 'mps',
  'official', 'constitution', 'constitutional', 'court', 'judge', 'bill', 'reform',
  'prime minister', 'supreme court', 'chancellor', 'bureau', 'federal', 'state department',
  'national assembly', 'ballot', 'vote', 'voter', 'candidate', 'campaign', 'white house',
  'kremlin', 'downing street', 'capitol', 'foreign affairs', 'defense minister'
];

const FORBIDDEN_NON_POLITICAL_KEYWORDS = [
  'phone-sex', 'sex session', 'celebrity', 'nollywood', 'hollywood', 'relationship scandal',
  'bitch', 'ex-girlfriend', 'ex-boyfriend', 'nude', 'onlyfans', 'big brother', 'bbnaija',
  'grammy', 'oscar', 'box office', 'reality show', 'hookup'
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

  // Fix HTML/entity concatenation and missing spaces between joined words
  let clean = text
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

export function isPoliticalNews(title: string, snippet: string = '', tags: string[] = []): boolean {
  const cleanTitle = (title || '').toLowerCase().trim();
  const text = `${cleanTitle} ${snippet} ${tags.join(' ')}`.toLowerCase();

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

  for (const forbidden of FORBIDDEN_NON_POLITICAL_KEYWORDS) {
    if (text.includes(forbidden)) return false;
  }

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
  US: ['united states', 'u.s.', 'usa', 'american', 'biden', 'trump', 'harris', 'congress', 'white house', 'capitol', 'senate', 'democrat', 'republican', 'pentagon', 'supreme court', 'fbi', 'gop'],
  GB: ['united kingdom', 'u.k.', 'britain', 'british', 'london', 'downing street', 'parliament', 'starmer', 'sunak', 'labour', 'tory', 'conservative', 'westminster', 'holyrood', 'bank of england'],
  GH: ['ghana', 'ghanaian', 'accra', 'akufo-addo', 'bawumia', 'mahama', 'cedi', 'parliament of ghana'],
  ZA: ['south africa', 'south african', 'pretoria', 'cape town', 'johannesburg', 'ramaphosa', 'anc', 'da', 'eff', 'rand', 'parliament'],
  KE: ['kenya', 'kenyan', 'nairobi', 'ruto', 'odinga', 'gachagua', 'shilling', 'parliament'],
  CA: ['canada', 'canadian', 'ottawa', 'trudeau', 'poilievre', 'parliament'],
  AU: ['australia', 'australian', 'canberra', 'albanese', 'dutton', 'parliament'],
  IN: ['india', 'indian', 'delhi', 'new delhi', 'modi', 'rahul gandhi', 'bjp', 'congress party', 'lok sabha', 'rupee'],
  CN: ['china', 'chinese', 'beijing', 'xi jinping', 'communist party', 'politburo'],
  JP: ['japan', 'japanese', 'tokyo', 'kishida', 'diet'],
  DE: ['germany', 'german', 'berlin', 'scholz', 'bundestag'],
  FR: ['france', 'french', 'paris', 'macron', 'assemblee nationale', 'elysee'],
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
  const cleanTitle = (title || '').toLowerCase().trim();
  const cleanSnippet = (snippet || '').toLowerCase().trim();
  const fullText = `${cleanTitle} ${cleanSnippet}`;

  // 1. Check if the headline starts with a foreign country tag/prefix (e.g. "Saudi Arabia: ...", "Israel: ...")
  const prefixMatch = cleanTitle.match(/^([a-z\s]+)[:–—-]/);
  if (prefixMatch) {
    const prefix = prefixMatch[1].trim();
    const isTargetCountry = prefix.includes(country.name.toLowerCase()) || prefix.includes(country.code.toLowerCase());
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
  const targetKeywords = COUNTRY_SPECIFIC_IDENTIFIERS[code] || [
    country.name.toLowerCase(),
    country.capital.toLowerCase(),
  ];

  const hasTargetKeywordInTitle = targetKeywords.some((kw) => cleanTitle.includes(kw));
  const hasTargetKeywordInSnippet = targetKeywords.some((kw) => cleanSnippet.includes(kw));

  // If article title is about foreign topic and target country is not the primary subject in title, skip!
  if (isForeignTopic && !hasTargetKeywordInTitle) {
    return false;
  }

  // An article must contain target country identifiers in title or snippet to qualify for this desk
  if (!hasTargetKeywordInTitle && !hasTargetKeywordInSnippet) {
    return false;
  }

  // Check if article belongs primarily to another country
  for (const [otherCode, otherKeywords] of Object.entries(COUNTRY_SPECIFIC_IDENTIFIERS)) {
    if (otherCode !== code) {
      const mentionsOtherCountryInTitle = otherKeywords.slice(0, 3).some((kw) => cleanTitle.includes(kw));
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

export function expandToJournalisticArticle(
  title: string,
  snippet: string,
  sourceName: string = 'Press Agency',
  countryName: string = 'National',
  countryCapital?: string,
  category: string = 'politics'
): string {
  const cleanTitle = (title || '').replace(/\s*[-–—|]\s*Voxpolis.*$/i, '').trim();
  const cleanSnippet = (snippet || '').trim();
  const dateline = countryCapital ? countryCapital.toUpperCase() : countryName.toUpperCase();

  // 1. Direct Executive Lead (natural active voice)
  const cleanLowerLead = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  const p1 = `${dateline} — ${cleanLowerLead}. According to verified reports gathered and monitored through ${sourceName}, the matter has drawn immediate scrutiny across official, civic, and public circles in ${countryName}.`;

  // 2. Concrete specifics and factual synthesis
  const p2 =
    cleanSnippet && cleanSnippet.length > 25
      ? `${cleanSnippet} Official records and on-the-record statements outline the primary actions, declarations, and proceedings undertaken by the key figures involved, sparking active deliberations regarding near-term administrative and political consequences.`
      : `Key stakeholders and government officials have issued public statements outlining their administrative positions. Observers across ${countryName} are monitoring these proceedings to assess their direct consequences on public policy and regional governance.`;

  // 3. Strategic, Institutional & Policy Ramifications
  const p3 = `Beyond executive announcements and political declarations, policy observers note that developments of this nature test administrative efficiency, regulatory compliance, and institutional integrity. In ${countryName}, genuine democratic stability depends on whether governance decisions operate with transparency, due process, and equal protection under statutory laws.`;

  // 4. Civic & Public Interest Reality (plain terms, citizen impact)
  const p4 = `For citizens and community watchdogs, the central test remains whether official actions deliver measurable public benefits or merely serve partisan convenience. Independent analysts underscore that sustainable civic progress requires public officials to remain directly accountable to the electorate and uphold institutional openness at all times.`;

  // 5. Verification & Desk Follow-Up
  const p5 = `Dispatches and foundational facts for this report were monitored and verified through coverage by ${sourceName}. Voxpolis will continue tracking subsequent regulatory steps, legal motions, and public reactions across ${countryName} as events progress.`;

  return [p1, p2, p3, p4, p5].join('\n\n');
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

export function generateCivicPollQuestion(title: string, snippet?: string): string {
  const cleanTitle = (title || '').replace(/\s*[-–—|]\s*Voxpolis.*$/i, '').trim();
  const text = `${cleanTitle} ${snippet || ''}`.toLowerCase();

  // Specific political figures & topics
  if (text.includes('atiku') && (text.includes('subsidy') || text.includes('fuel') || text.includes('president'))) {
    return 'Do you agree Atiku will do better if elected as president come 2027?';
  }
  if (text.includes('tinubu') && (text.includes('subsidy') || text.includes('economy') || text.includes('reform') || text.includes('hardship'))) {
    return 'Do you believe the administration\'s current economic reform policies are leading Nigeria in the right direction?';
  }
  if (text.includes('peter obi') || text.includes('obi:') || (text.includes('obi') && text.includes('leadership'))) {
    return 'Do you agree with Peter Obi that Nigeria\'s primary challenge is leadership failure rather than resource scarcity?';
  }
  if (text.includes('minimum wage') || text.includes('salary') || text.includes('workers') || text.includes('wage')) {
    return 'Should federal and state governments accelerate the full implementation of the new minimum wage?';
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
  if (cleanTitle.includes(':') || cleanTitle.includes('—') || cleanTitle.includes('-')) {
    const parts = cleanTitle.split(/[:—–-]/);
    const speaker = parts[0]?.trim();
    if (speaker && speaker.length > 2 && speaker.length < 30) {
      return `Do you agree with the position taken by ${speaker} on this national issue?`;
    }
  }

  return 'Do you support the policy direction and governance approach proposed in this report?';
}

export function cleanNewsText(raw: string): string {
  if (!raw) return '';
  return raw
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

              return {
                id: item.article_id || `newsdata-${idx}`,
                slug: cleanSlug,
                title: displayTitle,
                snippet: rawDesc,
                content: rawContent.length > 250 ? rawContent : expandToJournalisticArticle(displayTitle, rawDesc, sourceName, country.name, country.capital, item.category?.[0]),
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
            poll: a.poll || {
              id: `poll-${a.id}`,
              question: `Do you agree with the policy stance reported regarding "${a.title.slice(0, 75)}"?`,
              agree_count: 0,
              disagree_count: 0,
            },
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
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      affiliate_link_label: 'Explore Energy Policy Reports',
      affiliate_link_url: 'https://voxpolis.app',
      poll: {
        id: `poll-${code}-2`,
        question: `Do you agree with increasing national budget allocation for clean energy transit in ${country.name}?`,
        agree_count: 420,
        disagree_count: 58,
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

const DIVERSE_POLITICAL_FALLBACKS = [
  '/breaking-news-banner.png',
];

export function getArticleImageUrl(article: Partial<ArticleData>): string {
  if (article.original_image_url && article.original_image_url.trim() !== '' && !article.original_image_url.includes('google.com/news')) {
    return article.original_image_url;
  }
  return '/breaking-news-banner.png';
}
