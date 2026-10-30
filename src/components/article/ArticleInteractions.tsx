'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EmojiReactions from '@/components/article/EmojiReactions';
import SocialShareButtons from '@/components/article/SocialShareButtons';
import PollSection from '@/components/article/PollSection';
import { CommentInputForm, CommentList, CommentItem } from '@/components/article/CommentSection';
import { createClient } from '@/lib/supabase/client';
import { getCountryByCode } from '@/config/countries';
import { articlePath } from '@/lib/paths';

interface Props {
  part: 'top' | 'bottom';
  articleId: string;
  slug: string;
  title: string;
  dek: string;
  countryCode: string;
  poll?: { id: string; question: string; agree_count: number; disagree_count: number };
}

function useMember() {
  const [member, setMember] = useState<{ id: string; name: string; flag: string } | null>(null);
  useEffect(() => {
    const supabase = createClient();
    const apply = (u: any) => {
      if (!u) return setMember(null);
      const meta = u.user_metadata || {};
      const name = meta.username ? `${meta.full_name || 'Member'} (@${meta.username})` : meta.full_name || u.email?.split('@')[0] || 'Member';
      setMember({ id: u.id, name, flag: getCountryByCode(meta.primary_country || 'NG').flag });
    };
    supabase.auth.getSession().then(({ data }) => apply(data?.session?.user));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => apply(s?.user));
    return () => data?.subscription?.unsubscribe();
  }, []);
  return member;
}

/** Interactive bits of an article page. The article text itself is rendered on the server. */
export default function ArticleInteractions({ part, articleId, slug, title, dek, countryCode, poll }: Props) {
  const router = useRouter();
  const member = useMember();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const path = articlePath({ slug, country_code: countryCode });
  const requireAuth = () => router.push(`/login?redirect=${encodeURIComponent(path)}`);

  useEffect(() => {
    if (part !== 'top') return;
    fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, slug, title, countryCode, isMember: !!member }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part, articleId]);

  useEffect(() => {
    if (part !== 'bottom') return;
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}&articleId=${encodeURIComponent(articleId)}`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d?.comments) && setComments(d.comments))
      .catch(() => {});
  }, [part, slug, articleId]);

  const post = (c: CommentItem, parentId: string | null) =>
    fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        articleId,
        articleSlug: slug,
        userId: member?.id,
        userName: c.user_name,
        userCountryFlag: c.country_flag,
        content: c.content,
        parentId,
      }),
    }).catch(() => {});

  if (part === 'top') {
    return (
      <div className="space-y-3">
        <EmojiReactions articleId={articleId} slug={slug} />
        <SocialShareButtons title={title} slug={slug} path={path} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {poll?.question && (
        <PollSection
          poll={poll}
          articleSlug={slug}
          articleId={articleId}
          articleTitle={title}
          articleSnippet={dek}
          onRequireAuth={requireAuth}
          isLoggedIn={!!member}
        />
      )}
      <CommentInputForm
        userName={member?.name}
        userCountryFlag={member?.flag}
        onRequireAuth={requireAuth}
        isLoggedIn={!!member}
        onCommentSubmitted={(c) => {
          setComments((prev) => [c, ...prev]);
          post(c, null);
        }}
      />
      <CommentList
        comments={comments}
        userName={member?.name}
        userCountryFlag={member?.flag}
        onRequireAuth={requireAuth}
        isLoggedIn={!!member}
        onAddReply={(r) => {
          setComments((prev) => [...prev, r]);
          post(r, r.parentId || null);
        }}
        onReact={(id, type) =>
          setComments((prev) => prev.map((c) => (c.id === id ? { ...c, reactions: { ...c.reactions, [type]: c.reactions[type] + 1 } } : c)))
        }
      />
    </div>
  );
}
