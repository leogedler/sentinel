import axios from 'axios';
import { logger } from '../utils/logger';
import { WindsorDataRow, WindsorCampaignSummary, CampaignKPIs, DateRange, HistoricalDataPoint } from './types';

const BASE_URL = 'https://connectors.windsor.ai/all';
const FIELDS = 'account_id,account_name,date,campaign,campaign_id,spend,impressions,clicks,ctr,cpc,actions_offsite_conversion_fb_pixel_purchase,conversion_rate,website_purchase_roas_offsite_conversion_fb_pixel_purchase,reach,frequency';
const MAX_RETRIES = 3;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

interface CacheEntry {
  data: WindsorDataRow[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCacheKey(apiKey: string, params: Record<string, string>): string {
  return `${apiKey}:${JSON.stringify(params)}`;
}

function getCached(key: string): WindsorDataRow[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

async function fetchWithRetry(
  apiKey: string,
  params: Record<string, string>,
  retries = MAX_RETRIES
): Promise<WindsorDataRow[]> {
  const cacheKey = getCacheKey(apiKey, params);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(BASE_URL, {
        params: { api_key: apiKey, source: 'facebook', fields: FIELDS, ...params },
      });

      const data: WindsorDataRow[] = response.data.data || [];
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      logger.warn('Windsor.ai request failed', error, { attempt, retries });
      if (attempt === retries) throw error;
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }

  return []; // unreachable but satisfies TS
}

function aggregateKPIs(rows: WindsorDataRow[]): CampaignKPIs {
  if (rows.length === 0) {
    return { spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, conversions: 0, conversionRate: 0, roas: 0, reach: 0, frequency: 0 };
  }

  const totals = rows.reduce(
    (acc, row) => ({
      spend: acc.spend + (row.spend || 0),
      impressions: acc.impressions + (row.impressions || 0),
      clicks: acc.clicks + (row.clicks || 0),
      conversions: acc.conversions + (row.actions_offsite_conversion_fb_pixel_purchase || 0),
      reach: acc.reach + (row.reach || 0),
      roas: acc.roas + (row.website_purchase_roas_offsite_conversion_fb_pixel_purchase || 0),
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0, roas: 0 }
  );

  return {
    ...totals,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    conversionRate: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
    frequency: totals.reach > 0 ? totals.impressions / totals.reach : 0,
  };
}

export async function fetchCampaignData(
  apiKey: string,
  facebookCampaignId: string,
  dateRange?: DateRange
): Promise<CampaignKPIs> {
  const params: Record<string, string> = {};
  if (dateRange) {
    params.date_from = dateRange.start;
    params.date_to = dateRange.end;
  } else {
    params.date_preset = 'last_30d';
  }

  const rows = await fetchWithRetry(apiKey, params);
  const filtered = rows.filter((r) => r.campaign_id === facebookCampaignId);
  return aggregateKPIs(filtered);
}

export async function fetchAllCampaigns(apiKey: string): Promise<WindsorCampaignSummary[]> {
  const rows = await fetchWithRetry(apiKey, { date_preset: 'last_30d' });

  const seen = new Set<string>();
  const summaries: WindsorCampaignSummary[] = [];

  for (const row of rows) {
    if (!row.campaign_id || seen.has(row.campaign_id)) continue;
    seen.add(row.campaign_id);
    summaries.push({
      campaign_id: row.campaign_id,
      campaign_name: row.campaign || row.campaign_id,
      account_id: row.account_id || 'unknown',
      account_name: row.account_name || 'unknown',
    });
  }

  return summaries;
}

export async function fetchCampaignHistory(
  apiKey: string,
  facebookCampaignId: string,
  metric: string,
  dateRange: DateRange
): Promise<HistoricalDataPoint[]> {
  const rows = await fetchWithRetry(apiKey, {
    date_from: dateRange.start,
    date_to: dateRange.end,
  });

  const filtered = rows.filter((r) => r.campaign_id === facebookCampaignId);

  return filtered.map((row) => ({
    date: row.date,
    value: (row as any)[metric] || 0,
  }));
}
