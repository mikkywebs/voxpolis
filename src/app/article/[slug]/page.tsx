'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import ArticleImageHeader from '@/components/article/ArticleImageHeader';
import EmojiReactions from '@/components/article/EmojiReactions';
import AIAnalysisSection from '@/components/article/AIAnalysisSection';
import AffiliateSection from '@/components/article/AffiliateSection';
import PollSection from '@/components/article/PollSection';
import RelatedArticlesSection from '@/components/article/RelatedArticlesSection';
import CommentSection from '@/components/article/CommentSection';
import OriginalSourceLink from '@/components/article/OriginalSourceLink';
import EngagementPromptModal from '@/components/retention/EngagementPromptModal';
import { SUPPORTED_COUNTRIES, getCountryByCode } from '@/config/countries';
import { fetchArticlesForCountry, ArticleData } from '@/lib/news';
import { X, Sparkles, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [selectedCountry, setSelectedCountry] = useState(SUPPORTED_COUNTRIES[0]);
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<ArticleData[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showInterstitialAd, setShowInterstitialAd] = useState(false);
  const [showEngagementModal, setShowEngagementModal] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [realViews, setRealViews] = useState(0);

  useEffect(() => {
    async function loadArticle() {
      setLoading(true);
      const list = await fetchArticlesForCountry(selectedCountry.code);
      const found = list.find((a) => a.slug === slug) || list[0];
      setArticle(found);
      setRelatedArticles(list.filter((a) => a.slug !== found?.slug));

      // Track real view count locally
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
  }, [slug, selectedCountry]);

  // Check Supabase auth session
  useEffect(() => {
    async function checkUser() {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data?.session?.user);
    }
    checkUser();
  }, []);

  // Interstitial Ad Logic: Capped to appear once every 4 article views (Requirement 11)
  useEffect(() => {
    const views = parseInt(sessionStorage.getItem('voxpolis_article_views') || '0', 10) + 1;
    sessionStorage.setItem('voxpolis_article_views', views.toString());

    if (views % 4 === 1 && views > 1) {
      setShowInterstitialAd(true);
    }

    // Engagement feedback prompt trigger: Native mobile app builds only (hidden for browser users)
    const isNativeApp = typeof window !== 'undefined' && (
      Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
      Boolean((window as any).ReactNativeWebView)
    );
    const hasFeedback = localStorage.getItem('voxpolis_feedback_submitted');
    if (isNativeApp && !hasFeedback && views >= 3 && views % 3 === 0) {
      setTimeout(() => {
        setShowEngagementModal(true);
      }, 5000);
    }
  }, [slug]);

  if (loading || !article) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-200">
      <Header selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Archived Report Badge */}
        {article.is_archived && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2">
            <span className="text-base">🏛</span>
            <span>
              <strong>Archived Report:</strong> Originally published on{' '}
              {new Date(article.created_at).toLocaleDateString()}. Preserved in the Voxpolis Political Archive for historical research & permanent URL access.
            </span>
          </div>
        )}

        {/* 1. Headline, Snippet & Header (Views count hidden if < 100) */}
        <ArticleImageHeader
          title={article.title}
          snippet={article.snippet}
          imageMode={article.image_mode}
          originalImageUrl={article.original_image_url}
          aiImageUrl={article.ai_image_url}
          sourceName={article.source_name}
          sourceUrl={article.source_url}
          isBreaking={article.is_breaking}
          viewsCount={realViews}
        />

        {/* 2. Emoji Reaction Buttons (Real-time for both visitors & members) */}
        <EmojiReactions
          articleId={article.id}
          onRequireAuth={() => setShowAuthModal(true)}
          isLoggedIn={isLoggedIn}
        />

        {/* Executive Article Summary Block before detailed body */}
        <div className="my-6 p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border-l-4 border-blue-600 text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
          <span className="font-bold text-blue-700 dark:text-blue-400 block uppercase tracking-wider text-[10px] mb-1">
            EXECUTIVE REPORT SUMMARY
          </span>
          <p>{article.snippet || article.content.slice(0, 220) + '...'}</p>
        </div>

        {/* Article Body Content */}
        <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed space-y-4 my-6">
          {article.content.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {/* 3. Executive Fact Analysis Section (Page-blended styling) */}
        <AIAnalysisSection
          analysisText={article.ai_analysis}
          readAlsoArticle={
            relatedArticles[0]
              ? { title: relatedArticles[0].title, slug: relatedArticles[0].slug }
              : undefined
          }
        />

        {/* 5. Sponsored/Affiliate Section */}
        <AffiliateSection label={article.affiliate_link_label} url={article.affiliate_link_url} />

        {/* 6. Poll Section (Members Only - empty initial counts) */}
        <PollSection
          poll={article.poll}
          onRequireAuth={() => setShowAuthModal(true)}
          isLoggedIn={isLoggedIn}
        />

        {/* 7. "Related Articles" Section */}
        <RelatedArticlesSection articles={relatedArticles} />

        {/* 8. Comment Section (Disqus style, members only) */}
        <CommentSection
          articleId={article.id}
          onRequireAuth={() => setShowAuthModal(true)}
          isLoggedIn={isLoggedIn}
        />

        {/* 9. Small, Quiet Credited Link to Original Source at Very Bottom */}
        <OriginalSourceLink sourceName={article.source_name} sourceUrl={article.source_url} />
      </main>

      {/* Guest Login Required Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 max-w-sm w-full text-center relative shadow-2xl">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <LogIn className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-base text-gray-900 dark:text-white">Account Required</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-6">
              Guests can read all articles freely. Sign in to comment, react, or vote in polls.
            </p>

            <div className="space-y-2">
              <Link
                href="/login"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow block transition"
              >
                Sign In / Sign Up
              </Link>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                Continue Reading as Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Capped Interstitial Ad Modal (Requirement 11) */}
      {showInterstitialAd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-md w-full text-center text-white relative shadow-2xl">
            <button
              onClick={() => setShowInterstitialAd(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 p-1.5 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-2">
              <Sparkles className="w-3.5 h-3.5 inline mr-1" /> SPONSORED INTERSTITIAL
            </span>

            <h3 className="text-lg font-bold text-white mb-2">Voxpolis Global Policy Report 2026</h3>
            <p className="text-xs text-gray-300 mb-6">
              Access in-depth policy whitepapers, trade flow data, and regional political risk assessments.
            </p>

            <div className="space-y-2">
              <a
                href="https://voxpolis.app"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowInterstitialAd(false)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-bold text-xs rounded-xl shadow block transition"
              >
                Explore Report
              </a>
              <button
                onClick={() => setShowInterstitialAd(false)}
                className="text-xs text-gray-400 hover:text-white pt-1"
              >
                Skip Advertisement →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Engagement Rating Prompt Modal */}
      <EngagementPromptModal
        isOpen={showEngagementModal}
        onClose={() => setShowEngagementModal(false)}
      />
    </div>
  );
}
