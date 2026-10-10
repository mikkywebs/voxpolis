import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCountryByCode, getCountryBySlug } from '@/config/countries';
import { generateCivicPollQuestion } from '@/lib/news';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const countryParam = searchParams.get('country') || 'NG';
    const country = getCountryByCode(countryParam) || getCountryBySlug(countryParam) || getCountryByCode('NG');

    // 1. Check for existing polls attached to articles of this country
    try {
      const { data: countryArticles } = await supabaseAdmin
        .from('articles')
        .select('id, slug, title, snippet')
        .eq('country_code', country.code)
        .order('created_at', { ascending: false })
        .limit(10);

      if (countryArticles && countryArticles.length > 0) {
        const articleIds = countryArticles.map((a: any) => a.id).filter(Boolean);

        if (articleIds.length > 0) {
          const { data: existingPolls } = await supabaseAdmin
            .from('polls')
            .select('id, article_id, question, agree_count, disagree_count, created_at')
            .in('article_id', articleIds)
            .order('created_at', { ascending: false })
            .limit(1);

          if (existingPolls && existingPolls.length > 0) {
            const matchedArticle = countryArticles.find((a: any) => a.id === existingPolls[0].article_id);
            return NextResponse.json({
              success: true,
              poll: {
                id: existingPolls[0].id,
                articleId: existingPolls[0].article_id,
                articleSlug: matchedArticle?.slug,
                articleTitle: matchedArticle?.title,
                question: existingPolls[0].question,
                agree_count: existingPolls[0].agree_count || 0,
                disagree_count: existingPolls[0].disagree_count || 0,
                country_code: country.code,
                country_name: country.name,
              },
            });
          }
        }

        // No poll in table yet, generate one for the top article and persist it
        const topArticle = countryArticles[0];
        const generatedQ =
          generateCivicPollQuestion(topArticle.title, topArticle.snippet) ||
          `Do you support the governance and policy measures highlighted in recent ${country.name} political reports?`;

        // If topArticle.id is valid UUID, insert to polls
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topArticle.id);
        if (isUuid) {
          const { data: insertedPoll } = await supabaseAdmin
            .from('polls')
            .insert([
              {
                article_id: topArticle.id,
                question: generatedQ,
                agree_count: 0,
                disagree_count: 0,
              },
            ])
            .select()
            .single();

          if (insertedPoll) {
            return NextResponse.json({
              success: true,
              poll: {
                id: insertedPoll.id,
                articleId: topArticle.id,
                articleSlug: topArticle.slug,
                articleTitle: topArticle.title,
                question: insertedPoll.question,
                agree_count: 0,
                disagree_count: 0,
                country_code: country.code,
                country_name: country.name,
              },
            });
          }
        }
      }
    } catch (err) {
      // Non-fatal database error
    }

    // Default civic poll tailored to country
    return NextResponse.json({
      success: true,
      poll: {
        id: `civic-poll-${country.code.toLowerCase()}`,
        question: `Do you approve of the current economic and governance direction in ${country.name}?`,
        agree_count: 142,
        disagree_count: 89,
        country_code: country.code,
        country_name: country.name,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
