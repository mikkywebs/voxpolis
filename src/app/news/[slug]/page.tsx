'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ArticleImageHeader from '@/components/article/ArticleImageHeader';
import EmojiReactions from '@/components/article/EmojiReactions';
import AffiliateSection from '@/components/article/AffiliateSection';
import PollSection from '@/components/article/PollSection';
import RelatedArticlesSection from '@/components/article/RelatedArticlesSection';
import { CommentInputForm, CommentList, CommentItem } from '@/components/article/CommentSection';
import OriginalSourceLink from '@/components/article/OriginalSourceLink';
import AdSlot from '@/components/article/AdSlot';
import DesktopVignetteAd from '@/components/ads/DesktopVignetteAd';
import { SUPPORTED_COUNTRIES, getCountryByCode, getCountrySlug } from '@/config/countries';
import {
  fetchArticlesForCountry,
  ArticleData,
  expandToJournalisticArticle,
  formatCleanSnippet,
  isColumnistOrOpinion,
  getArticleImageUrl,
  getArticleFallbackUrl,
} from '@/lib/news';
import { getPipelineArticleBySlug } from '@/lib/pipeline';
import { get301Redirect } from '@/lib/pipeline/redirects';
import { PipelineArticleRecord } from '@/lib/pipeline/types';
import { Lock, LogIn, ExternalLink, ShieldAlert, CheckCircle2, HelpCircle, FileText, Globe, ArrowRight } from 'lucide-react';
import SocialShareButtons from '@/components/article/SocialShareButtons';

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [selectedCountry, setSelectedCountry] = useState(SUPPORTED_COUNTRIES[0]);
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [pipelineArticle, setPipelineArticle] = useState<PipelineArticleRecord | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth & Geo Gate State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [realViews, setRealViews] = useState(0);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [userNameDisplay, setUserNameDisplay] = useState<string | undefined>(undefined);
  const [isColumnist, setIsColumnist] = useState(false);
  const [requiresReview, setRequiresReview] = useState(false);
  const [extractedAuthor, setExtractedAuthor] = useState<string | undefined>(undefined);

  // Active ads check
  const hasActiveAds = !!(
    process.env.NEXT_PUBLIC_ADSENSE_PUB_ID &&
    process.env.NEXT_PUBLIC_ADSENSE_PUB_ID !== 'ca-pub-0000000000000000' &&
    process.env.NEXT_PUBLIC_ADSENSE_PUB_ID.startsWith('ca-pub-')
  );

  // 1. Check 301 Redirect for legacy/backfilled URLs
  useEffect(() => {
    if (slug) {
      const redirectedSlug = get301Redirect(slug);
      if (redirectedSlug) {
        router.replace(`/news/${redirectedSlug}`);
      }
    }
  }, [slug, router]);

  // Check auth session & load member display name and username with real-time sync
  useEffect(() => {
    let authListener: any = null;

    async function checkUser() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;

        const localName = localStorage.getItem('voxpolis_user_name');
        const localUname = localStorage.getItem('voxpolis_username');
        const localActive = localStorage.getItem('voxpolis_session_active') === 'true';

        const loggedIn = !!user || localActive || !!localName;
        setIsLoggedIn(loggedIn);

        if (user) {
          const name = user.user_metadata?.full_name || localName || user.email?.split('@')[0] || 'Citizen';
          const uname = user.user_metadata?.username || localUname || '';
          setCurrentUser({
            id: user.id,
            email: user.email,
            fullName: name,
            primaryCountry: user.user_metadata?.primary_country || 'NG',
          });
          setUserNameDisplay(uname ? `${name} (@${uname})` : name);
        } else if (localName) {
          setCurrentUser({
            id: 'local-member',
            fullName: localName,
            primaryCountry: localStorage.getItem('voxpolis_primary_country') || 'NG',
          });
          setUserNameDisplay(localUname ? `${localName} (@${localUname})` : localName);
        }

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          const sessionUser = session?.user;
          if (sessionUser) {
            setIsLoggedIn(true);
            localStorage.setItem('voxpolis_session_active', 'true');
            const name = sessionUser.user_metadata?.full_name || localStorage.getItem('voxpolis_user_name') || sessionUser.email?.split('@')[0] || 'Citizen';
            const uname = sessionUser.user_metadata?.username || localStorage.getItem('voxpolis_username') || '';
            setCurrentUser({
              id: sessionUser.id,
              email: sessionUser.email,
              fullName: name,
              primaryCountry: sessionUser.user_metadata?.primary_country || 'NG',
            });
            setUserNameDisplay(uname ? `${name} (@${uname})` : name);
          }
        });
        authListener = sub?.subscription;
      } catch (e) {
        const localName = localStorage.getItem('voxpolis_user_name');
        if (localName) {
          setIsLoggedIn(true);
          setUserNameDisplay(localName);
        }
      }
    }
    checkUser();

    return () => {
      if (authListener) authListener.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function loadArticle() {
      setLoading(true);

      let found: ArticleData | null = null;

      // 1. FAST LOCAL STORAGE CHECK: If article was previously viewed or loaded, restore immediately!
      try {
        const cachedArticleJson = localStorage.getItem(`voxpolis_article_${slug}`);
        if (cachedArticleJson) {
          const parsed = JSON.parse(cachedArticleJson);
          if (parsed && (parsed.slug === slug || parsed.id)) {
            found = parsed;
            setArticle(parsed);
            const artCountry = getCountryByCode(parsed.country_code || 'NG');
            if (artCountry) setSelectedCountry(artCountry);
          }
        }
      } catch {}

      // 2. Check Pipeline article
      const pipeArt = getPipelineArticleBySlug(slug);
      if (pipeArt && pipeArt.status === 'published') {
        setPipelineArticle(pipeArt);
        const pipeCountry = getCountryByCode(pipeArt.country_code);
        if (pipeCountry) setSelectedCountry(pipeCountry);
        const storedKey = `voxpolis_views_${pipeArt.id}`;
        const prevViews = parseInt(localStorage.getItem(storedKey) || '0', 10);
        const nextViews = prevViews + 1;
        localStorage.setItem(storedKey, nextViews.toString());
        setRealViews(nextViews);
        fetch('/api/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId: pipeArt.id }),
        }).catch(() => {});
      }

      // 3. Determine target search country (check URL query ?country= first)
      let searchCode = selectedCountry.code;
      if (typeof window !== 'undefined') {
        const queryCountry = new URLSearchParams(window.location.search).get('country');
        if (queryCountry) {
          searchCode = queryCountry.toUpperCase();
          const targetC = getCountryByCode(searchCode);
          if (targetC) setSelectedCountry(targetC);
        }
      }

      // Fetch from target country feed
      let list = await fetchArticlesForCountry(searchCode);
      let feedFound = list.find((a) => a.slug === slug);
      if (feedFound) {
        found = feedFound;
      }

      // If not found in target country feed, search across other active country feeds
      if (!found && !pipeArt) {
        const otherCountries = ['US', 'GB', 'ZA', 'GH', 'KE', 'CA', 'AU', 'IN', 'NG'].filter((c) => c !== searchCode);
        for (const cCode of otherCountries) {
          try {
            const otherList = await fetchArticlesForCountry(cCode);
            const otherFound = otherList.find((a) => a.slug === slug);
            if (otherFound) {
              found = otherFound;
              list = otherList;
              const matchedC = getCountryByCode(cCode);
              if (matchedC) setSelectedCountry(matchedC);
              break;
            }
          } catch {}
        }
      }

      // 4. If still not found, query backend /api/news?slug=...&country=...
      if (!found && !pipeArt) {
        try {
          const res = await fetch(`/api/news?slug=${encodeURIComponent(slug)}&country=${searchCode}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.article) {
              found = data.article;
              if (found?.country_code) {
                const cObj = getCountryByCode(found.country_code);
                if (cObj) setSelectedCountry(cObj);
              }
            }
          }
        } catch {}
      }

      if (found) {
        setArticle(found);
        try {
          localStorage.setItem(`voxpolis_article_${slug}`, JSON.stringify(found));
        } catch {}
        const artCountry = getCountryByCode(found.country_code);
        if (artCountry) setSelectedCountry(artCountry);
        setRelatedArticles(list.filter((a) => a.slug !== found!.slug));
        const storedKey = `voxpolis_views_${found.id}`;
        const prevViews = parseInt(localStorage.getItem(storedKey) || '0', 10);
        const nextViews = prevViews + 1;
        localStorage.setItem(storedKey, nextViews.toString());
        setRealViews(nextViews);

        // Sync view with views API
        fetch('/api/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId: found.id }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d?.views && d.views > nextViews) {
              setRealViews(d.views);
              localStorage.setItem(storedKey, d.views.toString());
            }
          })
          .catch(() => {});

        // Purge legacy verbatim & v2 cache so duplicate or robotic text is removed immediately
        try {
          localStorage.removeItem(`voxpolis_content_${found.id}`);
          localStorage.removeItem(`voxpolis_content_v2_${found.id}`);
        } catch {}

        // Check if article is flagged as columnist/opinion from metadata/url
        const flaggedAsColumnist = isColumnistOrOpinion(found.title, found.snippet, found.tags, found.source_url);
        if (flaggedAsColumnist) {
          setIsColumnist(true);
        }

        const canonicalArtKey = found.slug || found.id;
        const cachedMetaStr =
          localStorage.getItem(`voxpolis_content_v3_${canonicalArtKey}`) ||
          localStorage.getItem(`voxpolis_content_v3_${found.id}`);

        let isAlreadyAiRewritten = false;

        if (cachedMetaStr) {
          try {
            const cachedMeta = JSON.parse(cachedMetaStr);
            if (cachedMeta.isColumnist) {
              setIsColumnist(true);
              isAlreadyAiRewritten = true;
            }
            if (cachedMeta.author) {
              setExtractedAuthor(cachedMeta.author);
            }
            if (cachedMeta.content && cachedMeta.content.length > 200) {
              setArticle((prev) =>
                prev && (prev.id === found!.id || prev.slug === found!.slug)
                  ? {
                      ...prev,
                      content: cachedMeta.content,
                      author: cachedMeta.author || prev.author,
                      title: cachedMeta.headline ? `${cachedMeta.headline} - Voxpolis` : prev.title,
                    }
                  : prev
              );
            }
            if (cachedMeta.isAiRewritten) {
              isAlreadyAiRewritten = true;
            }
          } catch {
            if (cachedMetaStr.length > 200) {
              setArticle((prev) =>
                prev && (prev.id === found!.id || prev.slug === found!.slug)
                  ? { ...prev, content: cachedMetaStr }
                  : prev
              );
            }
          }
        }

        // If not yet AI-rewritten, trigger Multi-AI extraction (Gemini / Kimi / DeepSeek)
        if (
          !isAlreadyAiRewritten &&
          found.source_url &&
          found.source_url.startsWith('http') &&
          !found.source_url.includes('voxpolis.app')
        ) {
          fetch(`/api/news/extract?url=${encodeURIComponent(found.source_url)}`)
            .then((r) => r.json())
            .then((extracted) => {
              if (extracted?.success) {
                if (extracted.isColumnist) {
                  setIsColumnist(true);
                  try {
                    const colJson = JSON.stringify({
                      isColumnist: true,
                      author: extracted.author,
                      sourceName: extracted.sourceName,
                      sourceUrl: extracted.sourceUrl,
                    });
                    localStorage.setItem(`voxpolis_content_v3_${found!.id}`, colJson);
                    localStorage.setItem(`voxpolis_content_v3_${canonicalArtKey}`, colJson);
                  } catch {}
                  return;
                }
                if (extracted.author) {
                  setExtractedAuthor(extracted.author);
                }
                if (extracted.content && extracted.content.length > 200) {
                  const metaPayload = JSON.stringify({
                    content: extracted.content,
                    author: extracted.author,
                    isColumnist: false,
                    isAiRewritten: Boolean(extracted.isAiRewritten),
                    headline: extracted.headline,
                    provider: extracted.provider,
                  });
                  try {
                    localStorage.setItem(`voxpolis_content_v3_${found!.id}`, metaPayload);
                    localStorage.setItem(`voxpolis_content_v3_${canonicalArtKey}`, metaPayload);
                  } catch {}
                  setArticle((prev) => {
                    if (prev && (prev.id === found!.id || prev.slug === found!.slug)) {
                      const updated = {
                        ...prev,
                        content: extracted.content,
                        author: extracted.author || prev.author,
                        title: extracted.headline ? `${extracted.headline} - Voxpolis` : prev.title,
                      };
                      try {
                        localStorage.setItem(`voxpolis_article_${slug}`, JSON.stringify(updated));
                      } catch {}
                      return updated;
                    }
                    return prev;
                  });
                }
              } else if (extracted?.requiresReview) {
                setRequiresReview(true);
              }
            })
            .catch(() => {});
        }
      } else if (pipeArt) {
        setRelatedArticles(list.slice(0, 6));
      } else {
        setArticle(null);
        setRelatedArticles(list.slice(0, 6));
      }

      setLoading(false);
    }
    loadArticle();
  }, [slug, selectedCountry.code]);

  // Load comments with dual persistence (localStorage + API)
  useEffect(() => {
    if (!slug) return;
    const commentStorageKey = `voxpolis_comments_${slug}`;

    // 1. Immediately restore local comments from localStorage
    try {
      const localCommentsStr = localStorage.getItem(commentStorageKey);
      if (localCommentsStr) {
        const parsed = JSON.parse(localCommentsStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setComments(parsed);
        }
      }
    } catch {}

    // 2. Fetch from backend API and merge
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}${article?.id ? `&articleId=${encodeURIComponent(article.id)}` : ''}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.comments && Array.isArray(data.comments) && data.comments.length > 0) {
          setComments((prev) => {
            const seen = new Set(prev.map((c) => c.id));
            const newFromApi = data.comments.filter((c: CommentItem) => !seen.has(c.id));
            const merged = [...prev, ...newFromApi];
            try {
              localStorage.setItem(commentStorageKey, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {});
  }, [slug, article?.id]);

  const handleAddComment = (newC: CommentItem) => {
    setComments((prev) => {
      const updated = [newC, ...prev];
      if (typeof window !== 'undefined' && slug) {
        try {
          localStorage.setItem(`voxpolis_comments_${slug}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    // Background POST to API
    fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleId: article?.id,
        articleSlug: slug,
        userId: currentUser?.id,
        userName: newC.user_name,
        userCountryFlag: newC.country_flag,
        content: newC.content,
        parentId: null,
      }),
    }).catch(() => {});
  };

  const handleAddReply = (reply: CommentItem) => {
    setComments((prev) => {
      const updated = [...prev, reply];
      if (typeof window !== 'undefined' && slug) {
        try {
          localStorage.setItem(`voxpolis_comments_${slug}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    // Background POST to API
    fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleId: article?.id,
        articleSlug: slug,
        userId: currentUser?.id,
        userName: reply.user_name,
        userCountryFlag: reply.country_flag,
        content: reply.content,
        parentId: reply.parentId,
      }),
    }).catch(() => {});
  };

  const handleReact = (commentId: string, type: 'agree' | 'disagree' | 'angry' | 'insightful') => {
    setComments((prev) => {
      const updated = prev.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            reactions: {
              ...c.reactions,
              [type]: c.reactions[type] + 1,
            },
          };
        }
        return c;
      });
      if (typeof window !== 'undefined' && slug) {
        try {
          localStorage.setItem(`voxpolis_comments_${slug}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeArticleCountryCode = (pipelineArticle?.country_code || article?.country_code || 'NG').toUpperCase();
  const isCrossCountryGuest = !isLoggedIn && activeArticleCountryCode !== selectedCountry.code.toUpperCase();

  // -------------------------------------------------------------
  // GEO ACCESS GATE: 401 Paywall for Cross-Country Guest Users
  // -------------------------------------------------------------
  if (isCrossCountryGuest) {
    const targetCountryObj = getCountryByCode(activeArticleCountryCode);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
        <head>
          <meta name="robots" content="noindex, follow" />
          <title>Member Access Required | Voxpolis</title>
        </head>

        <Header user={currentUser} selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />

        <main className="flex-1 max-w-xl mx-auto w-full px-4 py-16 text-center space-y-6 my-auto">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center shadow-lg">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-xs font-bold rounded-full uppercase tracking-wider">
              401 Cross-Country Access Restricted
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              International Political Briefing
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              As a guest visitor, you are currently viewing localized news for <strong>{selectedCountry.name} ({selectedCountry.flag})</strong>. This report covers <strong>{targetCountryObj?.name || activeArticleCountryCode} ({targetCountryObj?.flag})</strong> political developments.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
              <Globe className="w-4 h-4 text-blue-500" />
              <span>Sign in to unlock global multi-country coverage</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push(`/login?redirect=/news/${slug}`)}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Continue Reading</span>
              </button>
              <button
                onClick={() => {
                  if (targetCountryObj) setSelectedCountry(targetCountryObj);
                }}
                className="py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs rounded-xl transition"
              >
                Switch to {targetCountryObj?.flag || ''} {targetCountryObj?.name || activeArticleCountryCode}
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // -------------------------------------------------------------
  // PIPELINE ARTICLE DISPLAY
  // -------------------------------------------------------------
  if (pipelineArticle) {
    const rawPipe = (pipelineArticle.body_markdown && pipelineArticle.body_markdown.length > 250)
      ? pipelineArticle.body_markdown
      : expandToJournalisticArticle(
          pipelineArticle.headline,
          pipelineArticle.dek || '',
          pipelineArticle.source_name,
          selectedCountry.name,
          selectedCountry.capital,
          pipelineArticle.content_type
        );

    const cleanPipeBody = rawPipe
      .replace(/https?:\/\/[^\s)]+/gi, '')
      .replace(/www\.[^\s)]+/gi, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/(read more on|also read|click here to read|visit our website|source:)[^.\n]*/gi, '')
      .trim();

    const paragraphs = cleanPipeBody.split('\n\n').filter(Boolean);
    const midPoint = Math.min(2, Math.floor(paragraphs.length / 2));

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-200">
        <Header user={currentUser} selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />

        <div className="relative flex justify-center w-full max-w-[1360px] mx-auto px-4 sm:px-6">
          {/* Left Wide Skyscraper (160x600 px) - strictly desktop when ads active */}
          {hasActiveAds && (
            <aside className="hidden xl:block shrink-0 w-[160px] mr-6">
              <div className="sticky top-20 w-[160px] min-h-[600px] flex flex-col items-center">
                <AdSlot slotLocation="skyscraper_left" isAllowed={true} />
              </div>
            </aside>
          )}

          <main className="flex-1 max-w-3xl w-full min-w-0 py-8 space-y-6">
            {/* Headline & Dek */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-600 text-white font-extrabold text-[11px] rounded-full uppercase tracking-wider">
                  VOXPOLIS BRIEF | {pipelineArticle.content_type.toUpperCase()}
                </span>
                <span className="text-xs font-bold text-gray-500">
                  {selectedCountry.flag} {selectedCountry.name}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white leading-tight">
                {pipelineArticle.headline}
              </h1>

              {pipelineArticle.dek && (
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                  {formatCleanSnippet(pipelineArticle.dek)}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 border-y border-gray-200 dark:border-gray-800 py-2.5">
                <span>Source: <strong>{pipelineArticle.source_name}</strong></span>
                <span>{pipelineArticle.read_minutes} min read ({paragraphs.join(' ').split(' ').length} words)</span>
              </div>
            </div>

            {/* Community Pulse immediately after header (guests and members can react) */}
            <EmojiReactions articleId={pipelineArticle.id} />

            <SocialShareButtons title={pipelineArticle.headline} slug={pipelineArticle.slug} />

            <AdSlot slotLocation="below_dek" isAllowed={true} />

            {/* Featured Image */}
            {pipelineArticle.original_image_url && (
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-md">
                <img
                  src={pipelineArticle.original_image_url}
                  alt={pipelineArticle.headline}
                  className="w-full h-64 sm:h-80 object-cover"
                />
                <div className="p-2.5 bg-gray-100 dark:bg-gray-900 text-[11px] text-gray-500 flex items-center justify-between">
                  <span>Source Credit: {pipelineArticle.source_name}</span>
                  <a
                    href={pipelineArticle.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>View Original</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Fact Analysis Cards */}
            {pipelineArticle.fact_analysis && pipelineArticle.fact_analysis.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-xs font-black uppercase tracking-wider text-gray-500 block">
                  REPORTED FACTS & ATTRIBUTIONS
                </span>
                <div className="space-y-2.5">
                  {pipelineArticle.fact_analysis.map((fa, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs space-y-1.5 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                            fa.status === 'confirmed'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : fa.status === 'claimed'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {fa.status === 'confirmed' && <CheckCircle2 className="w-3 h-3" />}
                          {fa.status === 'claimed' && <HelpCircle className="w-3 h-3" />}
                          {fa.status === 'unverified' && <ShieldAlert className="w-3 h-3" />}
                          <span>{fa.status}</span>
                        </span>
                        {fa.who_said && (
                          <span className="text-gray-400 italic">Attributed: {fa.who_said}</span>
                        )}
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 font-medium leading-relaxed">{fa.fact}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Listicle Items */}
            {pipelineArticle.content_type === 'listicle' && pipelineArticle.items.length > 0 && (
              <div className="space-y-4 pt-2">
                <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  KEY BRIEFING ITEMS ({pipelineArticle.items.length})
                </span>
                <div className="space-y-4">
                  {pipelineArticle.items.map((item) => (
                    <div
                      key={item.position}
                      className="p-4 rounded-2xl bg-gray-100/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {item.position}
                        </span>
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">{item.title}</h3>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed pl-8">
                        {item.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Body Content (neat, professional editorial font size) */}
            <div className="prose dark:prose-invert max-w-none text-base sm:text-[17px] leading-relaxed sm:leading-8 text-gray-800 dark:text-gray-200 space-y-5 pt-4 border-t border-gray-200 dark:border-gray-800">
              {paragraphs.slice(0, midPoint).map((para, i) => (
                <p key={i}>{para}</p>
              ))}

              <AdSlot slotLocation="mid_article" isAllowed={true} />

              {paragraphs.slice(midPoint).map((para, i) => (
                <p key={i + midPoint}>{para}</p>
              ))}
            </div>

            <OriginalSourceLink sourceName={pipelineArticle.source_name} sourceUrl={pipelineArticle.source_url} />

            <AdSlot slotLocation="below_sources" isAllowed={true} />

            <PollSection
              poll={(pipelineArticle as any).poll}
              articleTitle={pipelineArticle.headline}
              articleSnippet={pipelineArticle.dek}
              onRequireAuth={() => router.push(`/login?redirect=/news/${slug}`)}
              isLoggedIn={isLoggedIn}
            />
            <CommentInputForm
              userName={userNameDisplay}
              userCountryFlag={selectedCountry.flag}
              onRequireAuth={() => router.push(`/login?redirect=/news/${slug}`)}
              isLoggedIn={isLoggedIn}
              onCommentSubmitted={handleAddComment}
            />
            <CommentList
              comments={comments}
              userName={userNameDisplay}
              userCountryFlag={selectedCountry.flag}
              onRequireAuth={() => router.push(`/login?redirect=/news/${slug}`)}
              isLoggedIn={isLoggedIn}
              onAddReply={handleAddReply}
              onReact={handleReact}
            />
          </main>

          {/* Right Wide Skyscraper (160x600 px) - strictly desktop when ads active */}
          {hasActiveAds && (
            <aside className="hidden xl:block shrink-0 w-[160px] ml-6">
              <div className="sticky top-20 w-[160px] min-h-[600px] flex flex-col items-center">
                <AdSlot slotLocation="skyscraper_right" isAllowed={true} />
              </div>
            </aside>
          )}
        </div>

        <Footer />
      </div>
    );
  }

  // Not Found State
  if (!pipelineArticle && !article) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 flex flex-col justify-between">
        <head>
          <meta name="robots" content="noindex, follow" />
          <title>Report Not Found | Voxpolis</title>
        </head>
        <Header user={currentUser} selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-16 text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white">
            News Report Not Found
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            This political story may have been archived, renamed, or is unavailable in our active feeds.
          </p>
          <div className="pt-2">
            <Link
              href={`/${getCountrySlug(selectedCountry)}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
            >
              <span>Explore {selectedCountry.flag} {selectedCountry.name} News Desk</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {relatedArticles.length > 0 && (
            <div className="pt-10 border-t border-gray-200 dark:border-gray-800 text-left space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Trending Stories in {selectedCountry.name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedArticles.slice(0, 4).map((art, idx) => {
                  const img = getArticleImageUrl(art, idx);
                  const fb = getArticleFallbackUrl(art, idx);
                  return (
                    <Link
                      key={art.id}
                      href={`/news/${art.slug}${art.country_code ? `?country=${art.country_code}` : ''}`}
                      className="group p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 hover:border-blue-500 shadow-sm hover:shadow-md transition flex gap-3.5 items-center"
                    >
                      <div className="w-24 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800 relative">
                        {/* eslint-disable-next-html-element-suppression */}
                        <img
                          src={img}
                          alt={art.title}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.endsWith(fb)) {
                              target.src = fb;
                            }
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider block">
                          {art.source_name}
                        </span>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-500 transition leading-snug">
                          {art.title.replace(/\s*[-–—|]\s*Voxpolis.*$/i, '')}
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                          {art.snippet}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  // -------------------------------------------------------------
  // FALLBACK STANDARD ARTICLE DISPLAY (Full 350-500+ words)
  // -------------------------------------------------------------
  const rawStandardContent = (article?.content && article.content.length > 250)
    ? article.content
    : expandToJournalisticArticle(
        article?.title || 'Political Update',
        article?.snippet || '',
        article?.source_name || 'Voxpolis Desk',
        selectedCountry.name,
        selectedCountry.capital,
        article?.category || 'politics'
      );

  const cleanStandardBody = rawStandardContent
    .replace(/https?:\/\/[^\s)]+/gi, '')
    .replace(/www\.[^\s)]+/gi, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(read more on|also read|click here to read|visit our website|source:)[^.\n]*/gi, '')
    .trim();

  let fallbackParagraphs = cleanStandardBody.split('\n\n').filter(Boolean);
  if (fallbackParagraphs.length < 3) {
    const regenerated = expandToJournalisticArticle(
      article?.title || 'Political Update',
      article?.snippet || '',
      article?.source_name || 'Voxpolis Desk',
      selectedCountry.name,
      selectedCountry.capital,
      article?.category || 'politics'
    );
    fallbackParagraphs = regenerated.split('\n\n').filter(Boolean);
  }

  const fbMidPoint = Math.min(2, Math.floor(fallbackParagraphs.length / 2));

  const userCountryCode = (currentUser?.primaryCountry || (typeof window !== 'undefined' ? localStorage.getItem('voxpolis_primary_country') : null) || selectedCountry.code).toUpperCase();
  const userCountryFlag = getCountryByCode(userCountryCode)?.flag || selectedCountry.flag;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-200">
      <Header user={currentUser} selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />

      <div className="relative flex justify-center w-full max-w-[1360px] mx-auto px-4 sm:px-6">
        {/* Left Wide Skyscraper (160x600 px) - strictly desktop when ads active */}
        {hasActiveAds && (
          <aside className="hidden xl:block shrink-0 w-[160px] mr-6">
            <div className="sticky top-20 w-[160px] min-h-[600px] flex flex-col items-center">
              <AdSlot slotLocation="skyscraper_left" isAllowed={true} />
            </div>
          </aside>
        )}

        <main className="flex-1 max-w-3xl w-full min-w-0 py-8">
          <ArticleImageHeader
            title={article!.title}
            snippet={article!.snippet}
            imageMode={article!.image_mode === 'original' ? 'original' : 'breaking_logo'}
            originalImageUrl={article!.original_image_url}
            sourceName={article!.source_name}
            sourceUrl={article!.source_url}
            isBreaking={article!.is_breaking}
            viewsCount={realViews}
            createdAt={article!.created_at}
            author={extractedAuthor || article!.author}
          />

          {/* Community Pulse immediately after header (guests and members can react) */}
          <EmojiReactions articleId={article!.id} slug={article!.slug || slug} />

          <SocialShareButtons title={article!.title} slug={article!.slug} />

          <AdSlot slotLocation="below_dek" isAllowed={true} />

          {/* Content Rendering: Columnist Card OR Review Card OR Authentic Story */}
          {isColumnist ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-4 my-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[11px] font-extrabold rounded-full uppercase tracking-wider">
                  Independent Column / Op-Ed
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white pt-1">
                  Columnist Perspective
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-lg mx-auto leading-relaxed">
                  This piece is an independent opinion or columnist contribution{extractedAuthor ? ` by ${extractedAuthor}` : ''} originally published by <strong>{article!.source_name}</strong>. Voxpolis automated feeds focus strictly on verified news dispatches and governance facts. You can read the original column directly on {article!.source_name}.
                </p>
              </div>
              <div className="pt-2">
                <a
                  href={article!.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow transition"
                >
                  <span>Read Full Column on {article!.source_name}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ) : requiresReview && fallbackParagraphs.length < 2 ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-center space-y-4 my-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-[11px] font-extrabold rounded-full uppercase tracking-wider">
                  Source Dispatch Awaiting Review
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white pt-1">
                  Primary Reporting Available on Source
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-lg mx-auto leading-relaxed">
                  This briefing was reported by <strong>{article!.source_name}</strong>. The primary source report cannot be directly rendered at this moment. You can review the full reporting directly on the publisher&apos;s website.
                </p>
              </div>
              <div className="pt-2">
                <a
                  href={article!.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow transition"
                >
                  <span>Read Primary Reporting on {article!.source_name}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ) : (
            <div className="prose dark:prose-invert max-w-none text-base sm:text-[17px] leading-relaxed sm:leading-8 text-gray-800 dark:text-gray-200 space-y-5 my-6">
              {fallbackParagraphs.slice(0, fbMidPoint).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}

              <AdSlot slotLocation="mid_article" isAllowed={true} />

              {fallbackParagraphs.slice(fbMidPoint).map((paragraph, i) => (
                <p key={i + fbMidPoint}>{paragraph}</p>
              ))}
            </div>
          )}

          <AffiliateSection label={article!.affiliate_link_label} url={article!.affiliate_link_url} />

          <PollSection
            poll={article!.poll}
            articleSlug={article!.slug || slug}
            articleId={article!.id}
            articleTitle={article!.title}
            articleSnippet={article!.snippet}
            onRequireAuth={() => router.push(`/login?redirect=/news/${slug}`)}
            isLoggedIn={isLoggedIn}
          />

          <CommentInputForm
            userName={userNameDisplay}
            userCountryFlag={userCountryFlag}
            onRequireAuth={() => router.push(`/login?redirect=/news/${slug}`)}
            isLoggedIn={isLoggedIn}
            onCommentSubmitted={handleAddComment}
          />

          <RelatedArticlesSection articles={relatedArticles} />

          <CommentList
            comments={comments}
            userName={userNameDisplay}
            userCountryFlag={userCountryFlag}
            onRequireAuth={() => router.push(`/login?redirect=/news/${slug}`)}
            isLoggedIn={isLoggedIn}
            onAddReply={handleAddReply}
            onReact={handleReact}
          />

          {/* Tiny original source link at footer with no button as originally designed */}
          <OriginalSourceLink sourceName={article!.source_name} sourceUrl={article!.source_url} />

          <AdSlot slotLocation="below_sources" isAllowed={true} />
        </main>

        {/* Right Wide Skyscraper (160x600 px) - strictly desktop when ads active */}
        {hasActiveAds && (
          <aside className="hidden xl:block shrink-0 w-[160px] ml-6">
            <div className="sticky top-20 w-[160px] min-h-[600px] flex flex-col items-center">
              <AdSlot slotLocation="skyscraper_right" isAllowed={true} />
            </div>
          </aside>
        )}
      </div>

      {/* Desktop Interstitial / Vignette Ad provision (strictly desktop & dormant until active) */}
      <DesktopVignetteAd isAllowed={hasActiveAds} />

      <Footer />
    </div>
  );
}
