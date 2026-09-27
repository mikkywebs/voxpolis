'use client';

import { useState } from 'react';
import { MessageSquare, Send, Sparkles, AlertCircle } from 'lucide-react';

interface Comment {
  id: string;
  user_name: string;
  content: string;
  created_at: string;
  reactions: { agree: number; disagree: number; angry: number; insightful: number };
}

interface CommentSectionProps {
  articleId: string;
  onRequireAuth?: () => void;
  isLoggedIn?: boolean;
}

export default function CommentSection({ articleId, onRequireAuth, isLoggedIn = true }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: 'c1',
      user_name: 'Dr. Evelyn Vance',
      content: 'Clear legislative oversight is critical for maintaining public trust in digital governance systems.',
      created_at: '2 hours ago',
      reactions: { agree: 18, disagree: 2, angry: 0, insightful: 12 },
    },
    {
      id: 'c2',
      user_name: 'Markus Lindqvist',
      content: 'The 72-hour incident reporting window strikes a pragmatic balance for infrastructure contractors.',
      created_at: '4 hours ago',
      reactions: { agree: 14, disagree: 1, angry: 0, insightful: 9 },
    },
    {
      id: 'c3',
      user_name: 'Sarah O’Connor',
      content: 'Bipartisan cooperation on tech infrastructure is long overdue. Excellent step forward.',
      created_at: '5 hours ago',
      reactions: { agree: 25, disagree: 3, angry: 1, insightful: 15 },
    },
    {
      id: 'c4',
      user_name: 'Kenji Takahashi',
      content: 'Looking forward to seeing how regional municipalities implement these guidelines effectively.',
      created_at: '6 hours ago',
      reactions: { agree: 9, disagree: 0, angry: 0, insightful: 7 },
    },
  ]);

  const [newComment, setNewComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isLoggedIn && onRequireAuth) {
      onRequireAuth();
      return;
    }

    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          content: newComment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to post comment due to moderation rules.');
        setIsSubmitting(false);
        return;
      }

      const added: Comment = {
        id: data.id || `c-${Date.now()}`,
        user_name: data.user_name || 'You',
        content: data.content,
        created_at: 'Just now',
        reactions: { agree: 0, disagree: 0, angry: 0, insightful: 0 },
      };

      setComments([added, ...comments]);
      setNewComment('');
    } catch (e: any) {
      setErrorMsg('Error posting comment. Please check your connection.');
    }
    setIsSubmitting(false);
  };

  const handleCommentReaction = (commentId: string, type: 'agree' | 'disagree' | 'angry' | 'insightful') => {
    if (!isLoggedIn && onRequireAuth) {
      onRequireAuth();
      return;
    }

    setComments(
      comments.map((c) => {
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

  return (
    <div className="my-8 p-6 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-base font-bold text-gray-900 dark:text-white">Analysis & Reader Comments ({comments.length})</h3>
      </div>

      {/* Moderated Comment Input */}
      <form onSubmit={handleSubmit} className="mb-8">
        {errorMsg && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        <div className="relative">
          <textarea
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={isLoggedIn ? "Add your perspective... (Links are prohibited, profanity is filtered)" : "Log in to join the conversation..."}
            className="w-full text-xs p-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="absolute right-3 bottom-3 p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg shadow transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          Automated Moderation Active: Mild profanity is auto-censored (`****`). Links (`http`, `www`) and slurs are blocked outright.
        </p>
      </form>

      {/* Comment List with Ad Unit inserted every 3 comments */}
      <div className="space-y-6">
        {comments.map((c, idx) => (
          <div key={c.id}>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-900 dark:text-white">{c.user_name}</span>
                <span className="text-[10px] text-gray-400">{c.created_at}</span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed">{c.content}</p>

              {/* Comment Reactions */}
              <div className="pt-2 flex items-center gap-2 text-[11px]">
                <button
                  onClick={() => handleCommentReaction(c.id, 'agree')}
                  className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-gray-700 dark:text-gray-300 font-semibold transition"
                >
                  👍 Agree {c.reactions.agree > 0 && `(${c.reactions.agree})`}
                </button>
                <button
                  onClick={() => handleCommentReaction(c.id, 'disagree')}
                  className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-gray-700 dark:text-gray-300 font-semibold transition"
                >
                  👎 Disagree {c.reactions.disagree > 0 && `(${c.reactions.disagree})`}
                </button>
                <button
                  onClick={() => handleCommentReaction(c.id, 'angry')}
                  className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-gray-700 dark:text-gray-300 font-semibold transition"
                >
                  😡 Angry {c.reactions.angry > 0 && `(${c.reactions.angry})`}
                </button>
                <button
                  onClick={() => handleCommentReaction(c.id, 'insightful')}
                  className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-gray-700 dark:text-gray-300 font-semibold transition"
                >
                  💡 Insightful {c.reactions.insightful > 0 && `(${c.reactions.insightful})`}
                </button>
              </div>
            </div>

            {/* AD BANNER INSERTED EVERY 3 COMMENTS (Requirement 4 & 11) */}
            {(idx + 1) % 3 === 0 && (
              <div className="my-4 p-3 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-xl border border-gray-300 dark:border-gray-600 text-center">
                <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">
                  <Sparkles className="w-3 h-3 inline mr-1 text-amber-500" />
                  SPONSORED ADVERTISEMENT
                </span>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                  Upgrade to Vospolis Pro for Ad-Free Political Intelligence & Real-Time Alerts
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
