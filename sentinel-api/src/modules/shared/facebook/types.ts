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
  conversions: number;
  conversion_rate: number;
  roas: number;
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
