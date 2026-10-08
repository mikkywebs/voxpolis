import fs from 'fs';
import path from 'path';
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

// Local in-memory cache for ultra-fast serving
let memoryRates: AdRateCard = { ...DEFAULT_RATES };
let memoryCampaigns: SponsorCampaign[] = [];
let isInitialized = false;

// File persistence fallback in data directory
const DATA_DIR = path.join(process.cwd(), '.voxpolis_data');
const ADS_FILE = path.join(DATA_DIR, 'ads_data.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

function loadFromFile(): { rates?: AdRateCard; campaigns?: SponsorCampaign[] } | null {
  try {
    ensureDataDir();
    if (fs.existsSync(ADS_FILE)) {
      const content = fs.readFileSync(ADS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch {}
  return null;
}

function saveToFile(rates: AdRateCard, campaigns: SponsorCampaign[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(ADS_FILE, JSON.stringify({ rates, campaigns }, null, 2), 'utf-8');
  } catch {}
}

export async function getAdRates(): Promise<AdRateCard> {
  if (!isInitialized) {
    const fromFile = loadFromFile();
    if (fromFile?.rates) memoryRates = fromFile.rates;
    if (fromFile?.campaigns) memoryCampaigns = fromFile.campaigns;
    isInitialized = true;
  }
  return memoryRates;
}

export async function saveAdRates(rates: AdRateCard): Promise<AdRateCard> {
  memoryRates = { ...rates };
  saveToFile(memoryRates, memoryCampaigns);

  // Try saving to Supabase site_settings metadata
  try {
    const { data: existing } = await supabaseAdmin.from('site_settings').select('id').single();
    if (existing?.id) {
      await supabaseAdmin.from('site_settings').update({
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    }
  } catch {}

  return memoryRates;
}

export async function getAllCampaigns(): Promise<SponsorCampaign[]> {
  if (!isInitialized) {
    const fromFile = loadFromFile();
    if (fromFile?.rates) memoryRates = fromFile.rates;
    if (fromFile?.campaigns) memoryCampaigns = fromFile.campaigns;
    isInitialized = true;
  }
  return memoryCampaigns;
}

export async function createOrUpdateCampaign(campaign: Omit<SponsorCampaign, 'id' | 'impressions_count' | 'clicks_count' | 'created_at'> & { id?: string }): Promise<SponsorCampaign> {
  await getAllCampaigns();

  if (campaign.id) {
    const idx = memoryCampaigns.findIndex((c) => c.id === campaign.id);
    if (idx !== -1) {
      memoryCampaigns[idx] = {
        ...memoryCampaigns[idx],
        ...campaign,
      };
      saveToFile(memoryRates, memoryCampaigns);
      return memoryCampaigns[idx];
    }
  }

  const newCampaign: SponsorCampaign = {
    id: `ad_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
    start_date: campaign.start_date || new Date().toISOString(),
    end_date: campaign.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: campaign.is_active !== undefined ? campaign.is_active : true,
    impressions_count: 0,
    clicks_count: 0,
    created_at: new Date().toISOString(),
  };

  memoryCampaigns.unshift(newCampaign);
  saveToFile(memoryRates, memoryCampaigns);
  return newCampaign;
}

export async function toggleCampaignStatus(id: string, isActive: boolean): Promise<boolean> {
  await getAllCampaigns();
  const campaign = memoryCampaigns.find((c) => c.id === id);
  if (campaign) {
    campaign.is_active = isActive;
    saveToFile(memoryRates, memoryCampaigns);
    return true;
  }
  return false;
}

export async function deleteCampaign(id: string): Promise<boolean> {
  await getAllCampaigns();
  const initLen = memoryCampaigns.length;
  memoryCampaigns = memoryCampaigns.filter((c) => c.id !== id);
  if (memoryCampaigns.length !== initLen) {
    saveToFile(memoryRates, memoryCampaigns);
    return true;
  }
  return false;
}

export async function getActiveCampaignForSlot(slot: 'top_horizontal' | 'square_300' | 'skyscraper', countryCode?: string): Promise<SponsorCampaign | null> {
  await getAllCampaigns();
  const now = new Date();

  const candidates = memoryCampaigns.filter((c) => {
    if (!c.is_active) return false;
    if (c.slot_location !== slot) return false;
    if (new Date(c.end_date) < now) return false;
    if (new Date(c.start_date) > now) return false;
    if (c.target_country && c.target_country !== 'ALL') {
      if (countryCode && c.target_country.toUpperCase() !== countryCode.toUpperCase()) {
        return false;
      }
    }
    return true;
  });

  if (candidates.length === 0) return null;
  // Return random candidate if multiple active
  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  selected.impressions_count = (selected.impressions_count || 0) + 1;
  saveToFile(memoryRates, memoryCampaigns);
  return selected;
}

export async function recordCampaignClick(id: string): Promise<void> {
  await getAllCampaigns();
  const campaign = memoryCampaigns.find((c) => c.id === id);
  if (campaign) {
    campaign.clicks_count = (campaign.clicks_count || 0) + 1;
    saveToFile(memoryRates, memoryCampaigns);
  }
}
