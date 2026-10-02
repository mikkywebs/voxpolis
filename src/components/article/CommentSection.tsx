'use client';

import { useState } from 'react';
import { MessageSquare, Send, AlertCircle, Reply } from 'lucide-react';

export interface CommentItem {
  id: string;
  parentId?: string | null;
  user_name: string;
  country_flag: string;
  content: string;
  created_at: string;
  reactions: { agree: number; disagree: number; angry: number; insightful: number };
}

interface CommentInputFormProps {
  userName?: string;
  userCountryFlag?: string;
  onRequireAuth?: () => void;
  isLoggedIn?: boolean;
  onCommentSubmitted?: (comment: CommentItem) => void;
}

export function CommentInputForm({
  userName,
  userCountryFlag = '🌐',
  onRequireAuth,
  isLoggedIn = false,
  onCommentSubmitted,
}: CommentInputFormProps) {
  const [newComment, setNewComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasLink = (text: string) => {
    const urlPattern = /(https?:\/\/|www\.|[a-z0-9-]+\.(com|org|net|gov|edu|app|io|me|co|uk|ng))/i;
    return urlPattern.test(text);
  };

  const handleMainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isLoggedIn && onRequireAuth) {
      onRequireAuth();
      return;
    }

    if (!newComment.trim()) return;

    if (hasLink(newComment)) {
      setErrorMsg('No links allowed in comments to maintain civilized public discourse.');
      return;
    }

    setIsSubmitting(true);
    try {
      const added: CommentItem = {
        id: `c-${Date.now()}`,
        parentId: null,
        user_name: userName || 'Contributor',
        country_flag: userCountryFlag,
        content: newComment.trim(),
        created_at: 'Just now',
        reactions: { agree: 0, disagree: 0, angry: 0, insightful: 0 },
      };

      if (onCommentSubmitted) {
        onCommentSubmitted(added);
      }
      setNewComment('');
    } catch {
      setErrorMsg('Error posting comment. Please try again.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="my-6 p-5 sm:p-6 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
            Join the Discussion
          </h3>
        </div>
      </div>

      <form onSubmit={handleMainSubmit}>
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
            onFocus={() => {
              if (!isLoggedIn && onRequireAuth) onRequireAuth();
            }}
            placeholder={
              isLoggedIn
                ? "Share your perspective on this report..."
                : "Log in or sign up to join the discussion..."
            }
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
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2.5 text-center font-medium">
          No external links or abusive language permitted.
        </p>
      </form>
    </div>
  );
}

interface CommentListProps {
  comments: CommentItem[];
  userName?: string;
  userCountryFlag?: string;
  onRequireAuth?: () => void;
  isLoggedIn?: boolean;
  onAddReply?: (reply: CommentItem) => void;
  onReact?: (commentId: string, type: 'agree' | 'disagree' | 'angry' | 'insightful') => void;
}

export function CommentList({
  comments,
  userName,
  userCountryFlag = '🌐',
  onRequireAuth,
  isLoggedIn = false,
  onAddReply,
  onReact,
}: CommentListProps) {
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const hasLink = (text: string) => {
    const urlPattern = /(https?:\/\/|www\.|[a-z0-9-]+\.(com|org|net|gov|edu|app|io|me|co|uk|ng))/i;
    return urlPattern.test(text);
  };

  const handleReplySubmit = (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isLoggedIn && onRequireAuth) {
      onRequireAuth();
      return;
    }

    if (!replyText.trim()) return;

    if (hasLink(replyText)) {
      setErrorMsg('No links allowed in comments to maintain civilized public discourse.');
      return;
    }

    const added: CommentItem = {
      id: `c-${Date.now()}`,
      parentId,
      user_name: userName || 'Contributor',
      country_flag: userCountryFlag,
      content: replyText.trim(),
      created_at: 'Just now',
      reactions: { agree: 0, disagree: 0, angry: 0, insightful: 0 },
    };

    if (onAddReply) {
      onAddReply(added);
    }
    setReplyText('');
    setReplyingToId(null);
  };

  if (comments.length === 0) {
    return null;
  }

  const parentComments = comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  return (
    <div className="my-8 p-6 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Discussion ({comments.length})
          </h3>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="space-y-6">
          {parentComments.map((c) => {
            const replies = getReplies(c.id);
            return (
              <div key={c.id} className="space-y-3">
                {/* Parent Comment */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <span>{c.user_name}</span>
                      <span className="text-base" title="Member Country">{c.country_flag}</span>
                    </span>
                    <span className="text-[10px] text-gray-400">{c.created_at}</span>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed">{c.content}</p>

                  {/* Comment Actions & Reactions */}
                  <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onReact && onReact(c.id, 'agree')}
                        className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-gray-700 dark:text-gray-300 font-semibold transition"
                      >
                        👍 Agree {c.reactions.agree > 0 && `(${c.reactions.agree})`}
                      </button>
                      <button
                        type="button"
                        onClick={() => onReact && onReact(c.id, 'disagree')}
                        className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-gray-700 dark:text-gray-300 font-semibold transition"
                      >
                        👎 Disagree {c.reactions.disagree > 0 && `(${c.reactions.disagree})`}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!isLoggedIn && onRequireAuth) {
                          onRequireAuth();
                        } else {
                          setReplyingToId(replyingToId === c.id ? null : c.id);
                        }
                      }}
                      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-bold text-[11px]"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>
                  </div>

                  {/* Inline Reply Form */}
                  {replyingToId === c.id && (
                    <form onSubmit={(e) => handleReplySubmit(e, c.id)} className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Reply to ${c.user_name}...`}
                          className="flex-1 text-xs p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        />
                        <button
                          type="submit"
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow"
                        >
                          Post Reply
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Nested Replies */}
                {replies.length > 0 && (
                  <div className="ml-6 pl-4 border-l-2 border-blue-500/40 space-y-3">
                    {replies.map((reply) => (
                      <div key={reply.id} className="p-3.5 rounded-xl bg-gray-100/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <span>{reply.user_name}</span>
                            <span className="text-base">{reply.country_flag}</span>
                          </span>
                          <span className="text-[10px] text-gray-400">{reply.created_at}</span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
    </div>
  );
}

// Default legacy export for backward compatibility
export default function CommentSection(props: {
  articleId: string;
  userCountryFlag?: string;
  userCountryCode?: string;
  onRequireAuth?: () => void;
  isLoggedIn?: boolean;
}) {
  const [comments, setComments] = useState<CommentItem[]>([]);

  const handleAddComment = (newC: CommentItem) => {
    setComments([newC, ...comments]);
  };

  const handleAddReply = (reply: CommentItem) => {
    setComments([...comments, reply]);
  };

  const handleReact = (commentId: string, type: 'agree' | 'disagree' | 'angry' | 'insightful') => {
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
    <div>
      <CommentInputForm
        userCountryFlag={props.userCountryFlag}
        onRequireAuth={props.onRequireAuth}
        isLoggedIn={props.isLoggedIn}
        onCommentSubmitted={handleAddComment}
      />
      <CommentList
        comments={comments}
        userCountryFlag={props.userCountryFlag}
        onRequireAuth={props.onRequireAuth}
        isLoggedIn={props.isLoggedIn}
        onAddReply={handleAddReply}
        onReact={handleReact}
      />
    </div>
  );
}
