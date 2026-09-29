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
  // Main live feeds display fresh daily news published within 48 hours (2 days).
  // Articles older than 48 hours are automatically archived.
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;
  const age = Date.now() - new Date(createdAt).getTime();
  return age > fortyEightHoursMs;
}

// Multi-language template content for localized news reports
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
    pollQuestion: `Approuvez-vous la priorité accordée à la dématérialisation des services publics à ${country} ?`,
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
    pollQuestion: `¿Apoya incrementar la inversión estatal en infraestructuras digitales públicas en ${country}?`,
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
    pollQuestion: `Sollte ${country} die staatlichen Ausgaben für digitale Verwaltung priorisieren?`,
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
    pollQuestion: `${country}における行政手続きの完全デジタル化推進に賛成ですか？`,
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

export async function fetchArticlesForCountry(
  countryCode: string,
  language: string = 'en'
): Promise<ArticleData[]> {
  const code = countryCode.toUpperCase();
  const country = getCountryByCode(code);
  const langCode = (language || country.languages[0]?.code || 'en').toLowerCase();

  // 1. Client-Side Browser Context: Fetch from Server API Route to hide API Key and use Server Cache
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

  // 2. Server-Side Context: Direct RSS + NewsData API Fetching
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
            newsDataArticles = data.results.map((item: any, idx: number) => ({
              id: item.article_id || `newsdata-${idx}`,
              slug:
                (item.title || 'article')
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/(^-|-$)/g, '') + `-${idx}`,
              title: item.title || 'Political Update',
              snippet: item.description || item.snippet || item.title || '',
              content: item.content || item.description || item.title || '',
              ai_analysis: `• Core Fact: ${item.description || item.title}\n• Legislative Directive: Structural reforms and governance guidelines were published for administrative execution.\n• Public Impact: Evaluation procedures are overseen by multi-party legislative committees.`,
              country_code: code,
              language: langCode,
              category: item.category?.[0] || 'politics',
              image_mode: item.image_url ? 'original' : 'breaking_logo',
              original_image_url: item.image_url || undefined,
              source_name: item.source_id || `${country.name} Press`,
              source_url: item.link || 'https://voxpolis.app',
              is_breaking: idx === 0,
              tags: item.keywords || ['Politics', country.name],
              views_count: 0,
              total_reading_time_seconds: 180,
              created_at: item.pubDate || new Date().toISOString(),
              is_archived: isArticleArchived(item.pubDate || new Date().toISOString()),
              poll: {
                id: `poll-${idx}`,
                question: `Do you agree with the policy developments reported in this update?`,
                agree_count: 0,
                disagree_count: 0,
              },
            }));
          }
        }
      } catch (e) {
        console.warn('NewsData API fetch encountered an error on server side.', e);
      }
    }

    const combined = [...newsDataArticles, ...rssArticles];

    if (combined.length > 0) {
      // Deduplicate by title & annotate archiving status
      const seen = new Set<string>();
      const unique: ArticleData[] = [];
      for (const a of combined) {
        const k = a.title.toLowerCase().slice(0, 35);
        if (!seen.has(k)) {
          seen.add(k);
          unique.push({
            ...a,
            is_archived: isArticleArchived(a.created_at),
          });
        }
      }
      
      return unique;
    }
  } catch (err) {
    console.warn('Server-side RSS/NewsData fetch error, using fallback seed.', err);
  }

  // 3. Fallback Seeded Template Content
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
      image_mode: 'ai_generated',
      ai_image_url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80',
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
        question: `Do you support increasing national budget allocation for clean energy transit in ${country.name}?`,
        agree_count: 420,
        disagree_count: 58,
      },
    },
  ];
}
