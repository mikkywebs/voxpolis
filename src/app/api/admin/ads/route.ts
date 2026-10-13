import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  getAdRates,
  saveAdRates,
  getAllCampaigns,
  createOrUpdateCampaign,
  toggleCampaignStatus,
  deleteCampaign,
  AdRateCard,
} from '@/lib/ad-store';

export const dynamic = 'force-dynamic';

async function verifyAdminAuth(request: NextRequest): Promise<{ authorized: boolean; status?: number; error?: string; user?: any }> {
  try {
    const authHeader = request.headers.get('authorization');
    let user = null;

    // 1. Check Bearer token in Authorization header
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      const { data: userData, error: tokenErr } = await supabaseAdmin.auth.getUser(token);
      if (!tokenErr && userData?.user) {
        user = userData.user;
      }
    }

    // 2. Check cookies via Supabase SSR client
    if (!user) {
      try {
        const supabase = await createClient();
        const { data: cookieUserData, error: cookieErr } = await supabase.auth.getUser();
        if (!cookieErr && cookieUserData?.user) {
          user = cookieUserData.user;
        }
      } catch (cookieScopeErr) {
        // Expected when invoked outside Next.js request context or if cookies unavailable
      }
    }

    if (!user) {
      return { authorized: false, status: 401, error: 'Unauthorized: Authentication required' };
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr || !profile || profile.is_admin !== true) {
      return { authorized: false, status: 403, error: 'Forbidden: Administrator privileges required' };
    }

    return { authorized: true, user };
  } catch {
    return { authorized: false, status: 500, error: 'Authentication error' };
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    const [rates, campaigns] = await Promise.all([
      getAdRates(),
      getAllCampaigns(),
    ]);

    return NextResponse.json({
      success: true,
      rates,
      campaigns,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ads data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'save_rates') {
      const rates = body.rates as AdRateCard;
      if (!rates) {
        return NextResponse.json({ success: false, error: 'Rates object required' }, { status: 400 });
      }
      const saved = await saveAdRates(rates);
      return NextResponse.json({ success: true, rates: saved });
    }

    if (action === 'create_campaign') {
      const { campaign } = body;
      if (!campaign || !campaign.sponsor_name || !campaign.target_url || !campaign.desktop_image_url) {
        return NextResponse.json(
          { success: false, error: 'Sponsor name, target URL, and desktop image are required' },
          { status: 400 }
        );
      }
      const created = await createOrUpdateCampaign(campaign);
      return NextResponse.json({ success: true, campaign: created });
    }

    if (action === 'toggle_status') {
      const { id, is_active } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Campaign ID required' }, { status: 400 });
      }
      const updated = await toggleCampaignStatus(id, !!is_active);
      return NextResponse.json({ success: true, updated });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to process ads request' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAdminAuth(req);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Campaign ID required' }, { status: 400 });
    }

    const deleted = await deleteCampaign(id);
    return NextResponse.json({ success: true, deleted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
