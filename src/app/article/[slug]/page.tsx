'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ArticleImageHeader from '@/components/article/ArticleImageHeader';
import EmojiReactions from '@/components/article/EmojiReactions';
import AIAnalysisSection from '@/components/article/AIAnalysisSection';
import AffiliateSection from '@/components/article/AffiliateSection';
import PollSection from '@/components/article/PollSection';
import RelatedArticlesSection from '@/components/article/RelatedArticlesSection';
import { CommentInputForm, CommentList, CommentItem } from '@/components/article/CommentSection';
import OriginalSourceLink from '@/components/article/OriginalSourceLink';
import AdSlot from '@/components/article/AdSlot';
import { SUPPORTED_COUNTRIES, getCountryByCode } from '@/config/countries';
import { fetchArticlesForCountry, ArticleData } from '@/lib/news';
import { getPipelineArticleBySlug } from '@/lib/pipeline';
import { get301Redirect } from '@/lib/pipeline/redirects';
import { PipelineArticleRecord } from '@/lib/pipeline/types';
import { Lock, LogIn, ExternalLink, ShieldAlert, CheckCircle2, HelpCircle, FileText, Globe } from 'lucide-react';
import SocialShareButtons from '@/components/article/SocialShareButtons';

export default function ArticleDetailPage() {
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
  const [realViews, setRealViews] = useState(0);
  const [comments, setComments] = useState<CommentItem[]>([]);

  // 1. Check 301 Redirect for legacy/backfilled URLs
  useEffect(() => {
    if (slug) {
      const redirectedSlug = get301Redirect(slug);
      if (redirectedSlug) {
        router.replace(`/article/${redirectedSlug}`);
      }
    }
  }, [slug, router]);

  // Check user session
  useEffect(() => {
    async function checkUser() {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        setIsLoggedIn(!!data?.session?.user);
      } catch (e) {
        setIsLoggedIn(false);
      }
    }
    checkUser();
  }, []);

  useEffect(() => {
    async function loadArticle() {
      setLoading(true);

      const pipeArt = getPipelineArticleBySlug(slug);
      if (pipeArt && pipeArt.status === 'published') {
        setPipelineArticle(pipeArt);
        const pipeCountry = getCountryByCode(pipeArt.country_code);
        if (pipeCountry) setSelectedCountry(pipeCountry);
      }

      const list = await fetchArticlesForCountry(selectedCountry.code);
      const found = list.find((a) => a.slug === slug);
      if (found) {
        setArticle(found);
        const artCountry = getCountryByCode(found.country_code);
        if (artCountry) setSelectedCountry(artCountry);
      } else if (!pipeArt) {
        setArticle(list[0] || null);
      }
      setRelatedArticles(list.filter((a) => a.slug !== (found?.slug || list[0]?.slug)));

      if (found) {
        const storedKey = `voxpolis_views_${found.id}`;
        const prevViews = parseInt(localStorage.getItem(storedKey) || '0', 10);
        const nextViews = prevViews + 1;
        localStorage.setItem(storedKey, nextViews.toString());
        setRealViews(nextViews);
      }

      setLoading(false);
    }
    loadArticle();
  }, [slug, selectedCountry.code]);

  const handleAddComment = (newC: CommentItem) => {
    setComments((prev) => [newC, ...prev]);
  };

  const handleAddReply = (reply: CommentItem) => {
    setComments((prev) => [...prev, reply]);
  };

  const handleReact = (commentId: string, type: 'agree' | 'disagree' | 'angry' | 'insightful') => {
    setComments((prev) =>
      prev.map((c) => {
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
      })
    );
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
  // 8. GEO ACCESS GATE: 401 Paywall for Cross-Country Guest Users
  // -------------------------------------------------------------
  if (isCrossCountryGuest) {
    const targetCountryObj = getCountryByCode(activeArticleCountryCode);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
        {/* Noindex header meta for guest-walled page without body */}
        <head>
          <meta name="robots" content="noindex, follow" />
          <title>Member Access Required | Voxpolis</title>
        </head>

        <Header selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />

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
                onClick={() => router.push(`/login?redirect=/article/${slug}`)}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In to Unlock</span>
              </button>
              <button
                onClick={() => router.push(`/signup?redirect=/article/${slug}`)}
                className="flex-1 py-3 px-4 bg-gray-900 dark:bg-gray-800 hover:bg-gray-800 border border-gray-700 text-white font-bold text-xs rounded-xl transition"
              >
                <span>Create Free Account</span>
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // -------------------------------------------------------------
  // PIPELINE ARTICLE DISPLAY (Distinct Fields, Zero Duplicate Modules)
  // -------------------------------------------------------------
  if (pipelineArticle) {
    const paragraphs = pipelineArticle.body_markdown.split('\n\n').filter(Boolean);
    const midPoint = Math.min(2, Math.floor(paragraphs.length / 2));

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-200">
        <Header selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
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
                {pipelineArticle.dek}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500 border-y border-gray-200 dark:border-gray-800 py-2.5">
              <span>Source: <strong>{pipelineArticle.source_name}</strong></span>
              <span>{pipelineArticle.read_minutes} min read ({pipelineArticle.word_count} words)</span>
            </div>
          </div>

          <SocialShareButtons title={pipelineArticle.headline} slug={pipelineArticle.slug} />

          {/* Ad Slot 1: Below Dek */}
          <AdSlot slotLocation="below_dek" isAllowed={true} />

          {/* Featured Image (Source image or site default breaking news asset) */}
          {pipelineArticle.original_image_url && (
            <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-md">
              {/* eslint-disable-next-html-element-suppression */}
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

          {/* Executive Summary */}
          {pipelineArticle.executive_summary && (
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                EXECUTIVE BRIEF SUMMARY
              </span>
              <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 leading-relaxed">
                {pipelineArticle.executive_summary}
              </p>
            </div>
          )}

          {/* Why It Matters */}
          {pipelineArticle.why_it_matters && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                WHY THIS MATTERS
              </span>
              <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                {pipelineArticle.why_it_matters}
              </p>
            </div>
          )}

          {/* Legislative Scope (Omitted when null) */}
          {pipelineArticle.legislative_scope && (
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300 block flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                <span>LEGISLATIVE & REGULATORY DIRECTIVE</span>
              </span>
              <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-100 font-medium leading-relaxed">
                {pipelineArticle.legislative_scope}
              </p>
            </div>
          )}

          {/* Fact Analysis Cards */}
          {pipelineArticle.fact_analysis && pipelineArticle.fact_analysis.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-xs font-black uppercase tracking-wider text-gray-500 block">
                FACT & ALLEGATION ANALYSIS
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

          {/* Main Body Markdown Content with Mid-Article Ad */}
          <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            {paragraphs.slice(0, midPoint).map((para, i) => (
              <p key={i}>{para}</p>
            ))}

            {/* Ad Slot 2: Mid-Article */}
            <AdSlot slotLocation="mid_article" isAllowed={true} />

            {paragraphs.slice(midPoint).map((para, i) => (
              <p key={i + midPoint}>{para}</p>
            ))}
          </div>

          <OriginalSourceLink sourceName={pipelineArticle.source_name} sourceUrl={pipelineArticle.source_url} />

          {/* Ad Slot 3: Below Sources */}
          <AdSlot slotLocation="below_sources" isAllowed={true} />

          {/* Poll & Comments */}
          <PollSection onRequireAuth={() => router.push('/login')} isLoggedIn={isLoggedIn} />
          <CommentInputForm
            userCountryFlag={selectedCountry.flag}
            onRequireAuth={() => router.push('/login')}
            isLoggedIn={isLoggedIn}
            onCommentSubmitted={handleAddComment}
          />
          <CommentList
            comments={comments}
            userCountryFlag={selectedCountry.flag}
            onRequireAuth={() => router.push('/login')}
            isLoggedIn={isLoggedIn}
            onAddReply={handleAddReply}
            onReact={handleReact}
          />
        </main>

        <Footer />
      </div>
    );
  }

  // -------------------------------------------------------------
  // FALLBACK STANDARD ARTICLE DISPLAY
  // -------------------------------------------------------------
  const fallbackParagraphs = (article?.content || '').split('\n\n').filter(Boolean);
  const fbMidPoint = Math.min(2, Math.floor(fallbackParagraphs.length / 2));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-200">
      <Header selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        <ArticleImageHeader
          title={article!.title}
          snippet={article!.snippet}
          imageMode={article!.image_mode === 'original' ? 'original' : 'breaking_logo'}
          originalImageUrl={article!.original_image_url || '/breaking-news-banner.png'}
          sourceName={article!.source_name}
          sourceUrl={article!.source_url}
          isBreaking={article!.is_breaking}
          viewsCount={realViews}
          createdAt={article!.created_at}
        />

        <SocialShareButtons title={article!.title} slug={article!.slug} />

        <AdSlot slotLocation="below_dek" isAllowed={true} />

        <EmojiReactions
          articleId={article!.id}
          onRequireAuth={() => router.push('/login')}
          isLoggedIn={isLoggedIn}
        />

        <div className="my-6 pt-2 text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
          <span className="font-bold text-blue-600 dark:text-blue-400 block uppercase tracking-wider text-[11px] mb-1">
            EXECUTIVE REPORT SUMMARY
          </span>
          <p className="text-gray-800 dark:text-gray-200 font-semibold leading-relaxed">
            {article!.snippet || article!.content.slice(0, 220)}
          </p>
        </div>

        <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed space-y-4 my-6">
          {fallbackParagraphs.slice(0, fbMidPoint).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}

          <AdSlot slotLocation="mid_article" isAllowed={true} />

          {fallbackParagraphs.slice(fbMidPoint).map((paragraph, i) => (
            <p key={i + fbMidPoint}>{paragraph}</p>
          ))}
        </div>

        <AIAnalysisSection
          analysisText={article!.ai_analysis}
          readAlsoArticle={
            relatedArticles[0]
              ? { title: relatedArticles[0].title, slug: relatedArticles[0].slug }
              : undefined
          }
        />

        <AffiliateSection label={article!.affiliate_link_label} url={article!.affiliate_link_url} />

        <PollSection
          poll={article!.poll}
          onRequireAuth={() => router.push('/login')}
          isLoggedIn={isLoggedIn}
        />

        <CommentInputForm
          userCountryFlag={selectedCountry.flag}
          onRequireAuth={() => router.push('/login')}
          isLoggedIn={isLoggedIn}
          onCommentSubmitted={handleAddComment}
        />

        <RelatedArticlesSection articles={relatedArticles} />

        <CommentList
          comments={comments}
          userCountryFlag={selectedCountry.flag}
          onRequireAuth={() => router.push('/login')}
          isLoggedIn={isLoggedIn}
          onAddReply={handleAddReply}
          onReact={handleReact}
        />

        <OriginalSourceLink sourceName={article!.source_name} sourceUrl={article!.source_url} />

        <AdSlot slotLocation="below_sources" isAllowed={true} />
      </main>

      <Footer />
    </div>
  );
}
