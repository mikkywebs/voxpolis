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

  useEffect(() => {
    async function loadArticle() {
      setLoading(true);
      const list = await fetchArticlesForCountry(selectedCountry.code);
      const found = list.find((a) => a.slug === slug) || list[0];
      setArticle(found);
      setRelatedArticles(list.filter((a) => a.slug !== found?.slug));
      setLoading(false);
    }
    loadArticle();
  }, [slug, selectedCountry]);

  // Interstitial Ad Logic: Capped to appear once every 4 article views (Requirement 11)
  useEffect(() => {
    const views = parseInt(sessionStorage.getItem('voxpolis_article_views') || '0', 10) + 1;
    sessionStorage.setItem('voxpolis_article_views', views.toString());

    if (views % 4 === 1 && views > 1) {
      setShowInterstitialAd(true);
    }

    // Engagement feedback prompt trigger after reading 3 articles
    const hasFeedback = localStorage.getItem('voxpolis_feedback_submitted');
    if (!hasFeedback && views >= 3 && views % 3 === 0) {
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
        {/* Exact Top-to-Bottom Layout Sequence (Requirement 4) */}

        {/* 1. Breaking Headline, Snippet & Image Mode Treatment */}
        <ArticleImageHeader
          title={article.title}
          snippet={article.snippet}
          imageMode={article.image_mode}
          originalImageUrl={article.original_image_url}
          aiImageUrl={article.ai_image_url}
          sourceName={article.source_name}
          sourceUrl={article.source_url}
          isBreaking={article.is_breaking}
        />

        {/* 2. Emoji Reaction Buttons Directly Under Snippet */}
        <EmojiReactions
          articleId={article.id}
          onRequireAuth={() => setShowAuthModal(true)}
          isLoggedIn={true}
        />

        {/* Article Body Content */}
        <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed space-y-4 my-6">
          {article.content.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {/* 3. Claude-Generated Analysis Section & 4. Embedded "Read Also" Link */}
        <AIAnalysisSection
          analysisText={article.ai_analysis}
          readAlsoArticle={
            relatedArticles[0]
              ? { title: relatedArticles[0].title, slug: relatedArticles[0].slug }
              : undefined
          }
        />

        {/* 5. Admin-Manageable Affiliate Link Section ("Sponsored/Affiliate") */}
        <AffiliateSection label={article.affiliate_link_label} url={article.affiliate_link_url} />

        {/* 6. Poll Section (Agree/Disagree style) */}
        <PollSection
          poll={article.poll}
          onRequireAuth={() => setShowAuthModal(true)}
          isLoggedIn={true}
        />

        {/* 7. "Related Articles" Section */}
        <RelatedArticlesSection articles={relatedArticles} />

        {/* 8. Comment Section with Reactions & Ad Banners Every 3 Comments */}
        <CommentSection
          articleId={article.id}
          onRequireAuth={() => setShowAuthModal(true)}
          isLoggedIn={true}
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
