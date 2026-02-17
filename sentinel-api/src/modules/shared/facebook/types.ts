export interface WindsorApiResponse {
  data: WindsorDataRow[];
}

export interface WindsorDataRow {
  date: string;
  campaign: string;
  campaign_id: string;
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
