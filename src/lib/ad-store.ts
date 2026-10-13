import { supabaseAdmin } from '@/lib/supabase/admin';

export interface AdRateCard {
  currency: string;
  top_horizontal: {
    desktop_size: string; // "728x90"
    desktop_price: number; // e.g. 250
    mobile_size: string; // "320x100"
    mobile_price: number; // e.g. 150
    billing_period: string; // "per week" | "per month"
  };
  square_300: {
    desktop_size: string; // "300x300"
    desktop_price: number; // e.g. 200
    mobile_size: string; // "300x300"
    mobile_price: number; // e.g. 120
    billing_period: string;
  };
  skyscraper: {
    desktop_size: string; // "160x600"
    desktop_price: number; // e.g. 180
    mobile_size: string; // "N/A"
    mobile_price: number;
    billing_period: string;
  };
}

export interface SponsorCampaign {
  id: string;
  sponsor_name: string;
  ad_title: string;
  tagline?: string;
  target_url: string;
  slot_location: 'top_horizontal' | 'square_300' | 'skyscraper';
  desktop_image_url: string;
  mobile_image_url?: string;
  price_paid: number;
  currency: string;
  target_country?: string; // 'ALL' or specific country code
  start_date: string;
  end_date: string;
  is_active: boolean;
  impressions_count: number;
  clicks_count: number;
  created_at: string;
}

const DEFAULT_RATES: AdRateCard = {
  currency: 'USD',
  top_horizontal: {
    desktop_size: '728x90',
    desktop_price: 250,
    mobile_size: '320x100',
    mobile_price: 150,
    billing_period: 'per week',
  },
  square_300: {
    desktop_size: '300x300',
    desktop_price: 200,
    mobile_size: '300x300',
    mobile_price: 120,
    billing_period: 'per week',
  },
  skyscraper: {
    desktop_size: '160x600',
    desktop_price: 180,
    mobile_size: 'N/A',
    mobile_price: 0,
    billing_period: 'per week',
  },
};

export async function getAdRates(): Promise<AdRateCard> {
  try {
    const { data, error } = await supabaseAdmin
      .from('ad_rates')
      .select('rates')
      .eq('id', 'default')
      .maybeSingle();

    if (!error && data?.rates && typeof data.rates === 'object') {
      return data.rates as AdRateCard;
    }
  } catch (err) {
    console.warn('[AdStore] Error loading ad rates from Supabase:', err);
  }
  return DEFAULT_RATES;
}

export async function saveAdRates(rates: AdRateCard): Promise<AdRateCard> {
  try {
    const { error } = await supabaseAdmin
      .from('ad_rates')
      .upsert(
        {
          id: 'default',
          rates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.error('[AdStore] Error saving ad rates to Supabase:', error.message);
    }
  } catch (err) {
    console.error('[AdStore] Error saving ad rates:', err);
  }
  return rates;
}

export async function getAllCampaigns(): Promise<SponsorCampaign[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('ads')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data as SponsorCampaign[];
    }
    if (error) {
      console.warn('[AdStore] Error loading campaigns from Supabase:', error.message);
    }
  } catch (err) {
    console.warn('[AdStore] Error loading campaigns:', err);
  }
  return [];
}

export async function createOrUpdateCampaign(
  campaign: Omit<SponsorCampaign, 'id' | 'impressions_count' | 'clicks_count' | 'created_at'> & { id?: string }
): Promise<SponsorCampaign> {
  const now = new Date().toISOString();
  const campaignId = campaign.id || `ad_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (campaign.id) {
    try {
      const { data, error } = await supabaseAdmin
        .from('ads')
        .update({
          sponsor_name: campaign.sponsor_name,
          ad_title: campaign.ad_title,
          tagline: campaign.tagline || '',
          target_url: campaign.target_url,
          slot_location: campaign.slot_location,
          desktop_image_url: campaign.desktop_image_url,
          mobile_image_url: campaign.mobile_image_url || campaign.desktop_image_url,
          price_paid: campaign.price_paid || 0,
          currency: campaign.currency || 'USD',
          target_country: campaign.target_country || 'ALL',
          start_date: campaign.start_date || now,
          end_date: campaign.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: campaign.is_active !== undefined ? campaign.is_active : true,
        })
        .eq('id', campaign.id)
        .select()
        .single();

      if (!error && data) {
        return data as SponsorCampaign;
      }
    } catch (err) {
      console.error('[AdStore] Error updating campaign in Supabase:', err);
    }
  }

  const newRecord: SponsorCampaign = {
    id: campaignId,
    sponsor_name: campaign.sponsor_name,
    ad_title: campaign.ad_title,
    tagline: campaign.tagline || '',
    target_url: campaign.target_url,
    slot_location: campaign.slot_location,
    desktop_image_url: campaign.desktop_image_url,
    mobile_image_url: campaign.mobile_image_url || campaign.desktop_image_url,
    price_paid: campaign.price_paid || 0,
    currency: campaign.currency || 'USD',
    target_country: campaign.target_country || 'ALL',
    start_date: campaign.start_date || now,
    end_date: campaign.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: campaign.is_active !== undefined ? campaign.is_active : true,
    impressions_count: 0,
    clicks_count: 0,
    created_at: now,
  };

  try {
    const { data, error } = await supabaseAdmin
      .from('ads')
      .insert([newRecord])
      .select()
      .single();

    if (!error && data) {
      return data as SponsorCampaign;
    }
  } catch (err) {
    console.error('[AdStore] Error inserting campaign into Supabase:', err);
  }

  return newRecord;
}

export async function toggleCampaignStatus(id: string, isActive: boolean): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('ads')
      .update({ is_active: isActive })
      .eq('id', id);

    return !error;
  } catch {
    return false;
  }
}

export async function deleteCampaign(id: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('ads')
      .delete()
      .eq('id', id);

    return !error;
  } catch {
    return false;
  }
}

export async function getActiveCampaignForSlot(
  slot: 'top_horizontal' | 'square_300' | 'skyscraper',
  countryCode?: string
): Promise<SponsorCampaign | null> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('ads')
      .select('*')
      .eq('is_active', true)
      .eq('slot_location', slot)
      .gte('end_date', now)
      .lte('start_date', now);

    if (error || !data || data.length === 0) {
      return null;
    }

    const candidates = (data as SponsorCampaign[]).filter((c) => {
      if (!c.target_country || c.target_country === 'ALL') return true;
      if (countryCode && c.target_country.toUpperCase() === countryCode.toUpperCase()) {
        return true;
      }
      return false;
    });

    if (candidates.length === 0) return null;
    const selected = candidates[Math.floor(Math.random() * candidates.length)];

    // Asynchronously record impression count in database
    supabaseAdmin
      .from('ads')
      .update({ impressions_count: (selected.impressions_count || 0) + 1 })
      .eq('id', selected.id)
      .then();

    return selected;
  } catch {
    return null;
  }
}

export async function recordCampaignClick(id: string): Promise<void> {
  try {
    const { data } = await supabaseAdmin
      .from('ads')
      .select('clicks_count')
      .eq('id', id)
      .maybeSingle();

    if (data) {
      await supabaseAdmin
        .from('ads')
        .update({ clicks_count: (data.clicks_count || 0) + 1 })
        .eq('id', id);
    }
  } catch {}
}
