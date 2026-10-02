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

export function isPoliticalNews(title: string, snippet: string = '', tags: string[] = []): boolean {
  const text = `${title} ${snippet} ${tags.join(' ')}`.toLowerCase();

  for (const forbidden of FORBIDDEN_NON_POLITICAL_KEYWORDS) {
    if (text.includes(forbidden)) return false;
  }

  return POLITICAL_KEYWORDS.some((kw) => text.includes(kw));
}

export function isRelevantToCountry(title: string, snippet: string = '', countryCode: string): boolean {
  const country = getCountryByCode(countryCode);
  const text = `${title} ${snippet}`.toLowerCase();

  const cName = country.name.toLowerCase();
  const cCapital = country.capital.toLowerCase();

  const DEMONYM_MAP: Record<string, string[]> = {
    NG: ['nigeria', 'nigerian', 'abuja', 'tinubu', 'naira', 'nass', 'inec', 'fct'],
    US: ['united states', 'us', 'usa', 'american', 'biden', 'trump', 'congress', 'white house', 'washington', 'capitol', 'senate'],
    GB: ['united kingdom', 'uk', 'britain', 'british', 'london', 'downing street', 'parliament', 'starmer', 'sunak'],
    GH: ['ghana', 'ghanaian', 'accra', 'cedi'],
    ZA: ['south africa', 'south african', 'pretoria', 'johannesburg', 'ramaphosa', 'rand'],
    KE: ['kenya', 'kenyan', 'nairobi', 'ruto', 'shilling'],
    CA: ['canada', 'canadian', 'ottawa', 'trudeau'],
    AU: ['australia', 'australian', 'canberra', 'albanese'],
    IN: ['india', 'indian', 'delhi', 'new delhi', 'modi', 'rupee'],
    CN: ['china', 'chinese', 'beijing', 'xi jinping'],
    JP: ['japan', 'japanese', 'tokyo', 'kishida'],
    DE: ['germany', 'german', 'berlin', 'scholz'],
    FR: ['france', 'french', 'paris', 'macron'],
  };

  const keywords = DEMONYM_MAP[country.code] || [cName, cCapital];

  if (keywords.some((kw) => text.includes(kw))) {
    return true;
  }

  const OTHER_COUNTRIES: Record<string, string[]> = {
    US: ['united states', 'white house', 'joe biden', 'donald trump', 'washington d.c.'],
    GB: ['united kingdom', 'downing street', 'keir starmer', 'rishi sunak'],
    NG: ['nigeria', 'president tinubu', 'fct abuja'],
    FR: ['france', 'emmanuel macron', 'elysee palace'],
    DE: ['germany', 'olaf scholz', 'bundestag'],
    CN: ['china', 'xi jinping', 'beijing politburo'],
    RU: ['russia', 'vladimir putin', 'kremlin'],
  };

  for (const [otherCode, otherKeywords] of Object.entries(OTHER_COUNTRIES)) {
    if (otherCode !== country.code) {
      if (otherKeywords.some((kw) => text.includes(kw))) {
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
  const cleanTitle = (title || '').replace(/ - Voxpolis$/i, '').trim();
  const cleanSnippet = (snippet || '').trim();
  const dateline = countryCapital ? countryCapital.toUpperCase() : countryName.toUpperCase();

  // Topic classification for domain-specific journalistic context
  const text = `${cleanTitle} ${cleanSnippet}`.toLowerCase();
  let policyDomain = 'public policy and constitutional governance';
  let civicPerspective = 'citizens, legal observers, and civic advocacy groups';
  let oversightBody = 'relevant ministries, statutory commissions, and legislative committees';

  if (text.includes('econ') || text.includes('budget') || text.includes('tax') || text.includes('finance') || text.includes('naira') || text.includes('dollar') || text.includes('trade') || text.includes('bank')) {
    policyDomain = 'fiscal discipline, economic stabilization, and monetary oversight';
    civicPerspective = 'market participants, commercial stakeholders, and economic analysts';
    oversightBody = 'fiscal authorities, monetary policy regulators, and parliamentary finance committees';
  } else if (text.includes('court') || text.includes('law') || text.includes('judge') || text.includes('police') || text.includes('justice') || text.includes('human rights') || text.includes('nhrc')) {
    policyDomain = 'judicial integrity, human rights safeguards, and the rule of law';
    civicPerspective = 'constitutional attorneys, human rights defenders, and civil liberties organizations';
    oversightBody = 'the judiciary, statutory human rights bodies, and justice reform panels';
  } else if (text.includes('elect') || text.includes('vote') || text.includes('ballot') || text.includes('inec') || text.includes('party') || text.includes('campaign') || text.includes('poll')) {
    policyDomain = 'electoral accountability, voter franchise, and democratic governance';
    civicPerspective = 'electoral watchdogs, political commentators, and democratic institutions';
    oversightBody = 'electoral oversight commissions and multiparty consultative assemblies';
  } else if (text.includes('oil') || text.includes('gas') || text.includes('energy') || text.includes('power') || text.includes('theft') || text.includes('pipeline')) {
    policyDomain = 'resource management, energy infrastructure security, and revenue transparency';
    civicPerspective = 'energy sector analysts, host community representatives, and environmental observers';
    oversightBody = 'energy regulatory commissions and national infrastructure task forces';
  } else if (text.includes('health') || text.includes('hospital') || text.includes('medical') || text.includes('disease')) {
    policyDomain = 'public healthcare administration, emergency preparedness, and social safety nets';
    civicPerspective = 'public health professionals, patient advocacy networks, and civic researchers';
    oversightBody = 'healthcare authorities and intergovernmental public wellness panels';
  }

  const p1 = `${dateline} — In an essential political development carrying significant implications for ${countryName}, state leadership and administrative stakeholders have prioritized action regarding ${cleanTitle.toLowerCase()}. As confirmed through official press dispatches monitored by ${sourceName}, the initiative centers directly on critical benchmarks in ${policyDomain}.`;

  const p2 = cleanSnippet && cleanSnippet.length > 30
    ? `${cleanSnippet} The briefing highlights pivotal administrative decisions and institutional directives that address ongoing systemic considerations across the jurisdiction.`
    : `Official proceedings emphasize a concerted effort by administrative authorities in ${countryName} to address structural challenges and enhance public service delivery. Government spokespersons indicated that the strategic focus is aligned with established statutory mandates and broader socioeconomic stability goals.`;

  const p3 = `The development has generated active engagement among ${civicPerspective}. Analysts note that sustainable progress will hinge upon consistent regulatory enforcement, transparent execution mechanisms, and cross-sector institutional coordination. Civic groups have maintained that policy implementation must remain responsive to public needs and institutional accountability standards.`;

  const p4 = `According to administrative sources, ${oversightBody} are slated to conduct routine reviews to evaluate implementation benchmarks. Stakeholder consultations and procedural notifications will be published through official gazettes as implementation advances.`;

  const p5 = `Voxpolis will continue to monitor policy outcomes, legislative debates, and citizen sentiment surrounding this issue, providing regular verified dispatches as further official statements are released in ${countryName}.`;

  return [p1, p2, p3, p4, p5].join('\n\n');
}

export function generateAiAnalysisSummary(
  title: string,
  snippet: string,
  sourceName: string = 'Press Outlet',
  countryName: string = 'National'
): string {
  const cleanTitle = (title || '').replace(/<[^>]+>/g, '').trim();
  const cleanSnippet = (snippet || '').replace(/<[^>]+>/g, '').trim();

  const text = `${cleanTitle} ${cleanSnippet}`.toLowerCase();

  let impactArea = 'policy and public governance priorities';
  if (text.includes('econ') || text.includes('budget') || text.includes('tax') || text.includes('finance') || text.includes('naira') || text.includes('dollar') || text.includes('trade')) {
    impactArea = 'economic resilience and fiscal oversight';
  } else if (text.includes('health') || text.includes('hospital') || text.includes('disease') || text.includes('medical')) {
    impactArea = 'public healthcare administration and safety infrastructure';
  } else if (text.includes('elect') || text.includes('vote') || text.includes('ballot') || text.includes('party') || text.includes('campaign')) {
    impactArea = 'electoral oversight and democratic accountability';
  } else if (text.includes('court') || text.includes('law') || text.includes('judge') || text.includes('police') || text.includes('security')) {
    impactArea = 'judicial proceedings and institutional standards';
  } else if (text.includes('energy') || text.includes('power') || text.includes('oil') || text.includes('gas') || text.includes('climate')) {
    impactArea = 'energy security and critical infrastructure governance';
  }

  return `This reporting relates directly to ${impactArea} within ${countryName}. Independent press coverage and institutional dispatches by ${sourceName} continue to observe regulatory benchmarks as administrative directives unfold.`;
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
                  question: `Do you agree with the stance reported regarding "${cleanTitle.slice(0, 75)}"?`,
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
