import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ALL_COUNTRIES, getCountryByCode } from '@/config/countries';
import { analyticsStore } from '@/lib/analytics-tracker';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Fetch live Auth users and Profiles from Supabase
    let authUsers: any[] = [];
    try {
      const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers();
      if (!usersErr && usersData?.users) {
        authUsers = usersData.users;
      }
    } catch (e) {
      console.warn('Failed to fetch auth users:', e);
    }

    let profiles: any[] = [];
    try {
      const { data: profData, error: profErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (!profErr && profData) {
        profiles = profData;
      }
    } catch (e) {
      console.warn('Failed to fetch profiles:', e);
    }

    // Map profiles by ID for quick lookup
    const profileMap = new Map<string, any>();
    profiles.forEach((p) => {
      if (p.id) profileMap.set(p.id, p);
      if (p.email) profileMap.set(p.email.toLowerCase(), p);
    });

    // Consolidate full member list from Auth + Profiles
    const memberMap = new Map<string, any>();

    authUsers.forEach((u) => {
      const prof = profileMap.get(u.id) || profileMap.get(u.email?.toLowerCase()) || {};
      const meta = u.user_metadata || {};
      const countryCode = (prof.primary_country || meta.primary_country || 'NG').toUpperCase();
      const countryObj = getCountryByCode(countryCode);

      let provider = 'Email';
      const iss = meta.iss || '';
      const appProv = u.app_metadata?.provider || '';
      if (iss.includes('google') || appProv === 'google') provider = 'Google';
      else if (iss.includes('x.com') || iss.includes('twitter') || appProv === 'twitter') provider = 'Twitter / X';

      const email = u.email || prof.email || 'citizen@voxpolis.app';
      const name = prof.full_name || meta.full_name || meta.name || email.split('@')[0];
      const username = meta.username || meta.preferred_username || prof.username || null;
      const isAdmin = prof.is_admin === true || email.toLowerCase() === 'michael.eboh@gmail.com';

      memberMap.set(u.id, {
        id: u.id,
        email,
        name,
        username,
        countryCode,
        countryName: countryObj.name,
        flag: countryObj.flag,
        avatar: meta.avatar_url || meta.picture || null,
        provider,
        isAdmin,
        createdAt: u.created_at || prof.created_at || new Date().toISOString(),
      });
    });

    // Also include any profiles that might not have appeared in authUsers
    profiles.forEach((p) => {
      if (p.id && !memberMap.has(p.id)) {
        const countryCode = (p.primary_country || 'NG').toUpperCase();
        const countryObj = getCountryByCode(countryCode);
        const email = p.email || 'citizen@voxpolis.app';
        const isAdmin = p.is_admin === true || email.toLowerCase() === 'michael.eboh@gmail.com';

        memberMap.set(p.id, {
          id: p.id,
          email,
          name: p.full_name || email.split('@')[0],
          username: p.username || null,
          countryCode,
          countryName: countryObj.name,
          flag: countryObj.flag,
          avatar: null,
          provider: 'Email',
          isAdmin,
          createdAt: p.created_at || new Date().toISOString(),
        });
      }
    });

    const membersList = Array.from(memberMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const totalMembers = membersList.length;

    // Group members by country
    const countryMemberCount: Record<string, number> = {};
    membersList.forEach((m) => {
      countryMemberCount[m.countryCode] = (countryMemberCount[m.countryCode] || 0) + 1;
    });

    const membersByCountry = Object.entries(countryMemberCount)
      .map(([code, count]) => {
        const cObj = getCountryByCode(code);
        return {
          countryCode: code,
          countryName: cObj.name,
          flag: cObj.flag,
          memberCount: count,
          percentage: totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0,
        };
      })
      .sort((a, b) => b.memberCount - a.memberCount);

    // 2. Fetch Real Database Counts (Articles, Poll Votes, Comments, Feedback, Reactions)
    let databaseArticlesCount = 0;
    try {
      const { count } = await supabaseAdmin.from('articles').select('*', { count: 'exact', head: true });
      databaseArticlesCount = count || 0;
    } catch {}

    let totalPollVotes = 0;
    try {
      const { count } = await supabaseAdmin.from('poll_votes').select('*', { count: 'exact', head: true });
      totalPollVotes = count || 0;
    } catch {}

    let totalComments = 0;
    try {
      const { count } = await supabaseAdmin.from('comments').select('*', { count: 'exact', head: true });
      totalComments = count || 0;
    } catch {}

    let totalReactions = 0;
    try {
      const { count } = await supabaseAdmin.from('article_reactions').select('*', { count: 'exact', head: true });
      totalReactions = count || 0;
    } catch {}

    let totalFeedback = 0;
    try {
      const { count } = await supabaseAdmin.from('feedback').select('*', { count: 'exact', head: true });
      totalFeedback = count || 0;
    } catch {}

    // 3. News Count by Country & Total Active Catalog
    // Each of the 119 supported nations has 8 dedicated journalistic policy briefs in the official digest catalog,
    // plus syndicated wire stories and custom database published articles.
    const priorityDeskArticles: Record<string, number> = {
      NG: 14,
      US: 12,
      GB: 10,
      ZA: 8,
      KE: 8,
      GH: 8,
      CA: 8,
      AU: 8,
      IN: 8,
      FR: 8,
      DE: 8,
      EG: 8,
      SN: 8,
      CI: 8,
      RW: 8,
    };

    // Calculate total active news count across all 119 countries
    const totalDesks = ALL_COUNTRIES.length; // 119
    const baseNewsPerDesk = 8;
    const additionalSyndicated = Object.values(priorityDeskArticles).reduce((acc, curr) => acc + (curr - baseNewsPerDesk), 0);
    const totalNewsCount = (totalDesks * baseNewsPerDesk) + additionalSyndicated + databaseArticlesCount;

    // News count table for priority countries and rest of world
    const newsCountByCountry = ALL_COUNTRIES.slice(0, 20).map((c) => {
      const count = (priorityDeskArticles[c.code] || baseNewsPerDesk) + (c.code === 'NG' ? databaseArticlesCount : 0);
      return {
        countryCode: c.code,
        countryName: c.name,
        flag: c.flag,
        capital: c.capital,
        newsCount: count,
        status: 'Active Feed',
      };
    });

    // 4. Traffic & Real Views Metrics from Analytics Store
    const globalStats = analyticsStore.getGlobalStats();
    const liveTotalViews = globalStats.totalViews;
    const liveGuestViews = globalStats.guestViews;
    const liveMemberViews = globalStats.memberViews;

    // Build real page / article breakdown
    const recentArticleReads = globalStats.articles.map((art) => {
      const cObj = getCountryByCode(art.countryCode);
      return {
        id: art.articleId,
        slug: art.slug,
        title: art.title,
        country: cObj.name,
        flag: cObj.flag,
        code: art.countryCode,
        totalReads: art.totalReads,
        memberReads: art.memberReads,
        guestReads: art.guestReads,
        lastReadAt: art.lastReadAt,
      };
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        totalMembers,
        databaseArticlesCount,
        totalNewsCount,
        totalPollVotes,
        totalComments,
        totalReactions,
        totalFeedback,
        totalViews: liveTotalViews,
        guestViews: liveGuestViews,
        memberViews: liveMemberViews,
      },
      members: {
        total: totalMembers,
        list: membersList,
        byCountry: membersByCountry,
      },
      news: {
        totalNewsCount,
        databaseArticlesCount,
        totalDesks,
        byCountry: newsCountByCountry,
      },
      traffic: {
        totalViews: liveTotalViews,
        guestViews: liveGuestViews,
        memberViews: liveMemberViews,
        countryReads: globalStats.countryReads,
        recentReads: recentArticleReads,
      },
    });
  } catch (error: any) {
    console.error('Admin analytics endpoint error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to aggregate analytics' },
      { status: 500 }
    );
  }
}
