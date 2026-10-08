import { supabaseAdmin } from '@/lib/supabase/admin';

export interface ViewEvent {
  articleId: string;
  slug?: string;
  title?: string;
  countryCode?: string;
  isMember?: boolean;
}

export interface TrackedArticleStats {
  articleId: string;
  slug: string;
  title: string;
  countryCode: string;
  totalReads: number;
  memberReads: number;
  guestReads: number;
  lastReadAt: string;
}

// In-memory global analytics cache (persists during server lifetime)
class AnalyticsStore {
  private totalViews = 0;
  private guestViews = 0;
  private memberViews = 0;
  private articleStats: Map<string, TrackedArticleStats> = new Map();
  private countryReads: Map<string, number> = new Map();

  constructor() {
    // Initialize with live baseline
    this.totalViews = 0;
  }

  public recordView(event: ViewEvent): number {
    this.totalViews += 1;
    if (event.isMember) {
      this.memberViews += 1;
    } else {
      this.guestViews += 1;
    }

    const cCode = (event.countryCode || 'NG').toUpperCase();
    this.countryReads.set(cCode, (this.countryReads.get(cCode) || 0) + 1);

    const key = event.articleId || event.slug || 'unknown';
    const existing = this.articleStats.get(key) || {
      articleId: event.articleId,
      slug: event.slug || event.articleId,
      title: event.title || event.slug || 'Political News Report',
      countryCode: cCode,
      totalReads: 0,
      memberReads: 0,
      guestReads: 0,
      lastReadAt: new Date().toISOString(),
    };

    existing.totalReads += 1;
    if (event.isMember) {
      existing.memberReads += 1;
    } else {
      existing.guestReads += 1;
    }
    existing.lastReadAt = new Date().toISOString();
    if (event.title && existing.title === 'Political News Report') {
      existing.title = event.title;
    }
    this.articleStats.set(key, existing);

    // Asynchronously update Supabase articles table if article exists
    if (event.articleId) {
      this.syncToSupabase(event.articleId).catch(() => {});
    }

    return existing.totalReads;
  }

  private async syncToSupabase(articleId: string) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(articleId);
      if (isUuid) {
        const { data } = await supabaseAdmin
          .from('articles')
          .select('views_count')
          .eq('id', articleId)
          .maybeSingle();

        if (data) {
          const newViews = (data.views_count || 0) + 1;
          await supabaseAdmin
            .from('articles')
            .update({ views_count: newViews, updated_at: new Date().toISOString() })
            .eq('id', articleId);
        }
      }
    } catch {}
  }

  public getViewsForArticle(key: string): number {
    return this.articleStats.get(key)?.totalReads || 0;
  }

  public getGlobalStats() {
    return {
      totalViews: this.totalViews,
      guestViews: this.guestViews,
      memberViews: this.memberViews,
      countryReads: Object.fromEntries(this.countryReads.entries()),
      articles: Array.from(this.articleStats.values())
        .sort((a, b) => b.totalReads - a.totalReads)
        .slice(0, 50),
    };
  }
}

// Global singleton across serverless invocations
declare global {
  // eslint-disable-next-line no-var
  var __voxpolis_analytics__: AnalyticsStore | undefined;
}

export const analyticsStore = global.__voxpolis_analytics__ || new AnalyticsStore();
if (process.env.NODE_ENV !== 'production') {
  global.__voxpolis_analytics__ = analyticsStore;
}
