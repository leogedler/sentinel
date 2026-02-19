export interface WindsorApiResponse {
  data: WindsorDataRow[];
}

export interface WindsorDataRow {
  date: string;
  campaign: string;
  campaign_id: string;
  account_id?: string;
  account_name?: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  actions_offsite_conversion_fb_pixel_purchase: number;
  conversion_rate: number;
  website_purchase_roas_offsite_conversion_fb_pixel_purchase: number;
  reach: number;
  frequency: number;
}

export interface WindsorCampaignSummary {
  campaign_id: string;
  campaign_name: string;
  account_id: string;
  account_name: string;
}

export interface CampaignKPIs {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  conversionRate: number;
  roas: number;
  reach: number;
  frequency: number;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface HistoricalDataPoint {
  date: string;
  value: number;
}
