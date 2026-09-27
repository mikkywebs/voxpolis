'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Star, X, CheckCircle } from 'lucide-react';

interface EngagementPromptModalProps {
  userId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function EngagementPromptModal({ userId, isOpen, onClose }: EngagementPromptModalProps) {
  const [step, setStep] = useState<'prompt' | 'negative_feedback' | 'submitted'>('prompt');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePositiveSentiment = async () => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sentiment: 'positive',
          storeRatingRedirected: true,
        }),
      });
    } catch (e) {
      console.warn('Feedback tracking error:', e);
    }
    // Redirect to Google Play Store rating URL
    window.open('https://play.google.com/store/apps/details?id=app.vospolis', '_blank');
    onClose();
  };

  const handleNegativeSentiment = () => {
    setStep('negative_feedback');
  };

  const handleNegativeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sentiment: 'negative',
          feedbackText,
          storeRatingRedirected: false,
        }),
      });
    } catch (e) {
      console.warn('Feedback submission error:', e);
    }
    setIsSubmitting(false);
    setStep('submitted');
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'prompt' && (
          <div>
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 fill-blue-600 dark:fill-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">How is your experience with Vospolis?</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-6">
              Your honest feedback helps us deliver accurate, unbiased political news intelligence.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleNegativeSentiment}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-200 text-xs font-semibold transition"
              >
                <ThumbsDown className="w-4 h-4 text-red-500" />
                Needs Work
              </button>
              <button
                onClick={handlePositiveSentiment}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition"
              >
                <ThumbsUp className="w-4 h-4" />
                Loving It!
              </button>
            </div>
          </div>
        )}

        {step === 'negative_feedback' && (
          <form onSubmit={handleNegativeSubmit} className="text-left">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Tell us how we can improve</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Your feedback goes directly to our core editorial and engineering team.
            </p>
            <textarea
              required
              rows={4}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="What could we do better? (Coverage, news sources, app features...)"
              className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow transition"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}

        {step === 'submitted' && (
          <div className="py-4">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Thank You!</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your review has been saved. We appreciate your contribution to Vospolis!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
