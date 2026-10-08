import { NextRequest, NextResponse } from 'next/server';
import { getActiveCampaignForSlot, recordCampaignClick } from '@/lib/ad-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slot = searchParams.get('slot') as 'top_horizontal' | 'square_300' | 'skyscraper' | null;
    const country = searchParams.get('country') || undefined;

    if (!slot || !['top_horizontal', 'square_300', 'skyscraper'].includes(slot)) {
      return NextResponse.json({ success: false, error: 'Invalid ad slot' }, { status: 400 });
    }

    const campaign = await getActiveCampaignForSlot(slot, country);

    return NextResponse.json({
      success: true,
      hasAd: !!campaign,
      ad: campaign ? {
        id: campaign.id,
        sponsor_name: campaign.sponsor_name,
        ad_title: campaign.ad_title,
        tagline: campaign.tagline,
        target_url: campaign.target_url,
        slot_location: campaign.slot_location,
        desktop_image_url: campaign.desktop_image_url,
        mobile_image_url: campaign.mobile_image_url || campaign.desktop_image_url,
      } : null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, hasAd: false, ad: null }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;
    if (id) {
      await recordCampaignClick(id);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: 'Campaign ID required' }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
