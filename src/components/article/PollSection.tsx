'use client';

import ReaderPoll from '@/components/poll/ReaderPoll';


interface PollSectionProps {
  poll?: {
    id: string;
    question: string;
    agree_count: number;
    disagree_count: number;
  };
  articleSlug?: string;
  articleId?: string;
  articleTitle?: string;
  articleSnippet?: string;
  onRequireAuth?: () => void;
  isLoggedIn?: boolean;
}

/**
 * Validates and resolves an authentic civic poll question.
 * Returns null if the news does not contain a genuine policy controversy or debate.
 * NEVER forces a robotic template or parses numbers/years (e.g. '2027') as speakers.
 */
function getValidatedPollQuestion(rawQuestion?: string, title?: string, snippet?: string): string | null {
  if (rawQuestion && rawQuestion.trim()) {
    const q = rawQuestion.trim();
    const isCorrupted =
      /expressed by \d+/i.test(q) ||
      /expressed by (breaking|just in|report|watch|video|photos?|update|exclusive|opinion|editorial|alert|special|live|court|ndc|apc|pdp|lp|nnpp|inec|fbi|dss|efcc)/i.test(q) ||
      /expressed by (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(q) ||
      /^do you agree with the (stance|position) regarding/i.test(q) ||
      /^do you support the proposed policy measures and governance approach/i.test(q) ||
      /^do you support the policy direction and governance approach proposed in this report/i.test(q);

    if (!isCorrupted && q.endsWith('?') && q.length > 10) {
      return q;
    }
  }

  // Not all news has a debate — return null if no genuine civic question was provided by the publisher
  return null;
}

export default function PollSection({ poll, articleTitle, articleSnippet }: PollSectionProps) {
  const question = getValidatedPollQuestion(poll?.question, articleTitle, articleSnippet);
  // Only a real poll stored for this story (editor-approved question) is shown.
  if (!question || !poll?.id || !/^[0-9a-f-]{36}$/i.test(poll.id)) return null;
  return <ReaderPoll poll={{ id: poll.id, question, agree_count: poll.agree_count || 0, disagree_count: poll.disagree_count || 0 }} />;
}
