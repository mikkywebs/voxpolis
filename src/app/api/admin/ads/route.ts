import { NextRequest, NextResponse } from 'next/server';
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

export async function GET() {
  try {
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
      { success: false, error: error?.message || 'Failed to fetch ads data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
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
      { success: false, error: error?.message || 'Failed to process ads request' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Campaign ID required' }, { status: 400 });
    }

    const deleted = await deleteCampaign(id);
    return NextResponse.json({ success: true, deleted });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
