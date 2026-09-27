import { getCountryByCode } from '@/config/countries';

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
  poll?: {
    id: string;
    question: string;
    agree_count: number;
    disagree_count: number;
  };
}

// Seed articles generator for high-quality fallback & demo
const SEED_ARTICLES: Record<string, Partial<ArticleData>[]> = {
  US: [
    {
      slug: 'us-congress-passes-landmark-bipartisan-tech-regulation-bill',
      title: 'US Congress Passes Landmark Bipartisan Tech & Security Bill',
      snippet: 'The House and Senate have reached a historic consensus on new digital infrastructure standards and cyber security guidelines.',
      content: `WASHINGTON — In a rare moment of bipartisan unity, both chambers of the United States Congress voted overwhelmingly today to approve the National Digital Infrastructure and Cyber Resilience Act.

The legislation establishes strict standards for data privacy, critical infrastructure protection, and AI safety oversight across federal agencies and government contractors.

Key provisions include mandatory 72-hour reporting for major cyber incidents, federal grants for local government cybersecurity upgrades, and independent risk assessments for autonomous public service algorithms.

"Today we demonstrate that protecting American digital infrastructure transcends political parties," stated the lead senate sponsor during a press conference outside the Capitol building.`,
      ai_analysis: `Analysis of Article Facts:
- Congress passed the National Digital Infrastructure and Cyber Resilience Act with bipartisan support.
- The bill focuses on data privacy, critical infrastructure protection, and AI safety oversight.
- Key requirements include 72-hour incident reporting, local security grants, and algorithmic risk audits.

Fact-Based Impact: The policy standardizes cyber risk management protocols across federal contractors and municipal infrastructure networks.`,
      affiliate_link_label: 'Recommended VPN for Secure Browsing',
      affiliate_link_url: 'https://vospolis.app/sponsored/secure-net',
      country_code: 'US',
      language: 'en',
      category: 'politics',
      image_mode: 'breaking_logo',
      original_image_url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80',
      source_name: 'Washington Political Digest',
      source_url: 'https://washingtonpost.com',
      is_breaking: true,
      tags: ['Congress', 'Cybersecurity', 'Bipartisan'],
      views_count: 1420,
      total_reading_time_seconds: 180,
      poll: {
        id: 'poll-us-1',
        question: 'Do you support mandatory federal cybersecurity audits for public infrastructure?',
        agree_count: 412,
        disagree_count: 58,
      },
    },
    {
      slug: 'federal-reserve-signals-monetary-policy-shift-amid-stable-growth',
      title: 'Federal Reserve Signals Monetary Policy Shift Amid Stable Growth',
      snippet: 'Central bank officials hint at benchmark interest rate recalibration following recent economic indicators.',
      content: `NEW YORK — Central bank leadership indicated today that the Federal Reserve will consider adjusting interest rates at its upcoming FOMC meeting as inflation figures align with targets.

Economic analysts note that job creation remains steady while consumer price indices reflect moderate stabilization across energy and housing sectors.

Markets reacted favorably to the announcement, with national indices showing modest gains during morning trading sessions.`,
      ai_analysis: `Analysis of Article Facts:
- Federal Reserve officials signaled potential interest rate adjustments at the next FOMC meeting.
- Inflation data has moved closer to central bank target levels.
- Economic indicators reflect steady employment growth and stabilized consumer price metrics.`,
      affiliate_link_label: 'Explore Political Economy Books on Amazon',
      affiliate_link_url: 'https://vospolis.app/sponsored/books',
      country_code: 'US',
      language: 'en',
      category: 'economy',
      image_mode: 'original',
      original_image_url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80',
      source_name: 'Financial Reuters',
      source_url: 'https://reuters.com',
      is_breaking: false,
      tags: ['Economy', 'Federal Reserve', 'Inflation'],
      views_count: 980,
      total_reading_time_seconds: 140,
      poll: {
        id: 'poll-us-2',
        question: 'Should the Federal Reserve prioritize rate cuts over inflation containment?',
        agree_count: 230,
        disagree_count: 180,
      },
    },
  ],
  JP: [
    {
      slug: 'japan-diet-approves-renewable-energy-investment-framework',
      title: 'Japan National Diet Approves Expanded Renewable Energy Framework',
      snippet: 'Lawmakers approve new incentives for offshore wind and solar storage initiatives to boost energy resilience.',
      content: `TOKYO — The National Diet of Japan has officially passed the 2026 Energy Transition and Security Act, approving a landmark funding package aimed at accelerating renewable energy adoption.

The plan targets a 45% reduction in carbon emissions by 2035 through heavy investments in offshore wind farms, next-generation solar cells, and grid-scale storage systems across regional prefectures.`,
      ai_analysis: `Analysis of Article Facts:
- The National Diet passed the 2026 Energy Transition and Security Act.
- Target set for 45% emissions reduction by 2035 via offshore wind and solar storage projects.`,
      country_code: 'JP',
      language: 'en',
      category: 'environment',
      image_mode: 'ai_generated',
      ai_image_url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
      source_name: 'Japan Times Wire',
      source_url: 'https://japantimes.co.jp',
      is_breaking: false,
      tags: ['Japan', 'Energy', 'Diet'],
      views_count: 650,
      total_reading_time_seconds: 120,
      poll: {
        id: 'poll-jp-1',
        question: 'Should Japan increase subsidies for residential solar power systems?',
        agree_count: 310,
        disagree_count: 45,
      },
    }
  ]
};

export async function fetchArticlesForCountry(countryCode: string, language: string = 'en'): Promise<ArticleData[]> {
  const code = countryCode.toUpperCase();
  const country = getCountryByCode(code);
  const apiKey = process.env.NEWSDATA_API_KEY;

  if (apiKey && apiKey !== 'pub_demo_key') {
    try {
      const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&country=${code.toLowerCase()}&category=politics&language=${language}`;
      const res = await fetch(url, { next: { revalidate: 900 } });
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          return data.results.map((item: any, idx: number) => ({
            id: item.article_id || `newsdata-${idx}`,
            slug: (item.title || 'article').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + `-${idx}`,
            title: item.title || 'Political Update',
            snippet: item.description || item.snippet || item.title || '',
            content: item.content || item.description || item.title || '',
            ai_analysis: `Analysis of Article Facts:\n- Summary: ${item.description || item.title}\n- Source: ${item.source_id || 'NewsData'}\n- Published: ${item.pubDate}`,
            country_code: code,
            language: language,
            category: item.category?.[0] || 'politics',
            image_mode: item.image_url ? 'original' : 'breaking_logo',
            original_image_url: item.image_url || undefined,
            source_name: item.source_id || 'Global News Network',
            source_url: item.link || 'https://vospolis.app',
            is_breaking: idx === 0,
            tags: item.keywords || ['Politics', country.name],
            views_count: Math.floor(Math.random() * 500) + 100,
            total_reading_time_seconds: 150,
            created_at: item.pubDate || new Date().toISOString(),
            poll: {
              id: `poll-${idx}`,
              question: `Do you agree with the key policy statements presented in this update?`,
              agree_count: 140,
              disagree_count: 35,
            }
          }));
        }
      }
    } catch (e) {
      console.warn('NewsData API fetch failed, using internal seeded database.', e);
    }
  }

  // Fallback / Seed articles for all 23 countries
  const countryArticles = SEED_ARTICLES[code] || [
    {
      slug: `${code.toLowerCase()}-national-parliament-debates-key-policy-reform`,
      title: `${country.flag} ${country.name} Parliament Opens Debate on National Governance Reform`,
      snippet: `Lawmakers in ${country.capital} gathered today to present new legislative proposals addressing economic resilience and digital administration.`,
      content: `LAWMAKERS IN ${country.capital.toUpperCase()} — Member representatives officially introduced a comprehensive legislative agenda today aimed at streamlining public administration, improving healthcare funding efficiency, and expanding digital governance services across ${country.name}.

The reform package enjoys multi-party sponsorship and is expected to undergo committee review over the coming weeks before a final vote in parliament.`,
      ai_analysis: `Analysis of Article Facts:
- Parliamentary representatives in ${country.capital} introduced a national governance reform proposal.
- The initiative addresses public administration efficiency, healthcare funding, and digital governance in ${country.name}.
- The bill has multi-party support and moves to committee review.`,
      country_code: code,
      language: language,
      category: 'politics',
      image_mode: 'breaking_logo',
      source_name: `${country.name} National Digest`,
      source_url: 'https://vospolis.app',
      is_breaking: true,
      tags: [country.name, 'Governance', 'Parliament'],
      views_count: 520,
      total_reading_time_seconds: 120,
      poll: {
        id: `poll-${code}-gen`,
        question: `Should ${country.name} prioritize digital governance over traditional administrative processes?`,
        agree_count: 380,
        disagree_count: 42,
      },
    },
    {
      slug: `${code.toLowerCase()}-infrastructure-investment-plan-announced`,
      title: `${country.flag} ${country.name} Announces Major Infrastructure & Transportation Plan`,
      snippet: `Government ministry outlines a multi-year investment project to modernize transit links and renewable energy grids in ${country.name}.`,
      content: `CAPITAL CITY (${country.capital.toUpperCase()}) — Government ministers today unveiled a multi-billion national infrastructure blueprint designed to modernize rail transport, upgrade regional ports, and expand renewable power integration.

"This investment will drive economic productivity for decades to come," said the Minister of Transport during the press briefing.`,
      ai_analysis: `Analysis of Article Facts:
- Government ministers announced a multi-billion national infrastructure investment plan for ${country.name}.
- Targets include upgrading rail transport, regional ports, and renewable energy integration.`,
      country_code: code,
      language: language,
      category: 'infrastructure',
      image_mode: 'ai_generated',
      ai_image_url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80',
      source_name: `${country.name} Press Agency`,
      source_url: 'https://vospolis.app',
      is_breaking: false,
      tags: [country.name, 'Infrastructure', 'Transit'],
      views_count: 310,
      total_reading_time_seconds: 110,
      poll: {
        id: `poll-${code}-infra`,
        question: `Do you support increasing national budget allocation for clean energy transit?`,
        agree_count: 290,
        disagree_count: 30,
      },
    }
  ];

  return countryArticles.map((art, i) => ({
    id: art.id || `seed-${code}-${i}`,
    slug: art.slug || `${code.toLowerCase()}-article-${i}`,
    title: art.title || 'Political Report',
    snippet: art.snippet || '',
    content: art.content || '',
    ai_analysis: art.ai_analysis || '',
    country_code: code,
    language: language,
    category: art.category || 'politics',
    image_mode: art.image_mode || 'breaking_logo',
    original_image_url: art.original_image_url,
    ai_image_url: art.ai_image_url,
    source_name: art.source_name || 'Vospolis News',
    source_url: art.source_url || 'https://vospolis.app',
    is_breaking: art.is_breaking || false,
    tags: art.tags || [country.name],
    views_count: art.views_count || 100,
    total_reading_time_seconds: art.total_reading_time_seconds || 120,
    created_at: new Date().toISOString(),
    affiliate_link_label: art.affiliate_link_label || 'Official Vospolis Partner Digest',
    affiliate_link_url: art.affiliate_link_url || 'https://vospolis.app',
    poll: art.poll,
  }));
}
