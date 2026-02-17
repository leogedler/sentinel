import { ISkillParameter } from '../db/models';

interface DefaultSkillDefinition {
  name: string;
  description: string;
  promptTemplate: string;
  parameters: ISkillParameter[];
  category: 'reporting' | 'analysis' | 'optimization' | 'alerting';
}

export const DEFAULT_SKILLS: DefaultSkillDefinition[] = [
  {
    name: 'Daily Performance Summary',
    description: 'Summarizes key KPIs for the previous day with day-over-day comparison.',
    category: 'reporting',
    parameters: [
      { name: 'campaignId', type: 'string', required: true, description: 'The campaign to analyze' },
      {
        name: 'comparisonPeriod',
        type: 'enum',
        required: false,
        default: 'day',
        options: ['day', 'week'],
        description: 'Period to compare against',
      },
    ],
    promptTemplate: `You are a marketing analyst. Analyze the following campaign data and provide a Daily Performance Summary.

Campaign: {{campaignName}}
Date: {{date}}

Current Period KPIs:
{{currentKPIs}}

Previous Period KPIs ({{comparisonPeriod}}-over-{{comparisonPeriod}}):
{{previousKPIs}}

Provide:
1. A brief executive summary of yesterday's performance
2. Key metrics with {{comparisonPeriod}}-over-{{comparisonPeriod}} changes (with percentage)
3. Notable highlights or concerns
4. One actionable recommendation

Keep the tone professional but concise. Use bullet points where appropriate.`,
  },
  {
    name: 'Weekly Trend Analysis',
    description: 'Analyzes 7-day trends, identifies patterns and anomalies, provides recommendations.',
    category: 'analysis',
    parameters: [
      { name: 'campaignId', type: 'string', required: true, description: 'The campaign to analyze' },
      {
        name: 'focusMetric',
        type: 'enum',
        required: false,
        default: 'roas',
        options: ['spend', 'ctr', 'conversions', 'roas'],
        description: 'Primary metric to focus the analysis on',
      },
    ],
    promptTemplate: `You are a marketing analyst. Perform a Weekly Trend Analysis for the following campaign.

Campaign: {{campaignName}}
Focus Metric: {{focusMetric}}
Period: Last 7 days

Daily Data:
{{historicalData}}

Provide:
1. Overall trend direction for {{focusMetric}} (improving, declining, stable)
2. Day-by-day analysis of key metrics
3. Anomaly detection (any sudden spikes or drops)
4. Pattern identification (e.g., weekday vs weekend performance)
5. Three actionable recommendations based on the trends

Use data-driven insights and be specific with numbers.`,
  },
  {
    name: 'Campaign Comparison',
    description: 'Side-by-side comparison of campaigns with strengths/weaknesses analysis.',
    category: 'analysis',
    parameters: [
      { name: 'campaignIds', type: 'string', required: true, description: 'Comma-separated campaign IDs to compare' },
      { name: 'dateRange', type: 'date', required: false, default: 'last_7d', description: 'Date range for comparison' },
    ],
    promptTemplate: `You are a marketing analyst. Compare the following campaigns side by side.

Campaigns:
{{campaignData}}

Date Range: {{dateRange}}

Provide:
1. Side-by-side KPI comparison table
2. Strengths and weaknesses of each campaign
3. Efficiency ranking (best to worst by ROAS)
4. Budget allocation recommendation
5. Key takeaways for optimization

Be specific with numbers and percentages. Highlight the best and worst performers clearly.`,
  },
  {
    name: 'Budget Efficiency Report',
    description: 'Evaluates spend efficiency and suggests budget reallocation.',
    category: 'optimization',
    parameters: [
      { name: 'campaignId', type: 'string', required: true, description: 'The campaign to analyze' },
      { name: 'targetRoas', type: 'number', required: false, description: 'Target ROAS threshold' },
    ],
    promptTemplate: `You are a marketing optimization specialist. Evaluate the budget efficiency for the following campaign.

Campaign: {{campaignName}}
Target ROAS: {{targetRoas}}

Current KPIs:
{{currentKPIs}}

Historical Performance (7 days):
{{historicalData}}

Provide:
1. Current spend efficiency rating (Excellent/Good/Fair/Poor)
2. ROAS analysis vs target
3. Cost per conversion trend
4. Identification of underperforming periods or segments
5. Specific budget reallocation recommendations
6. Projected impact of recommended changes

Be quantitative and provide specific dollar amounts where possible.`,
  },
  {
    name: 'Performance Alert',
    description: 'Checks KPIs against thresholds and generates alerts with severity levels.',
    category: 'alerting',
    parameters: [
      { name: 'campaignId', type: 'string', required: true, description: 'The campaign to monitor' },
      { name: 'thresholds', type: 'string', required: false, description: 'JSON string of metric:value threshold pairs' },
    ],
    promptTemplate: `You are a marketing monitoring system. Check the following campaign data against performance thresholds.

Campaign: {{campaignName}}

Current KPIs:
{{currentKPIs}}

Thresholds:
{{thresholds}}

Default thresholds (if not specified):
- CTR below 1% = Warning
- CPC above $5 = Warning
- ROAS below 1.0 = Critical
- Conversion rate below 2% = Warning
- Daily spend variance > 30% from average = Info

For each threshold breach:
1. Severity level (Critical / Warning / Info)
2. Current value vs threshold
3. How long the metric has been in this state (if historical data available)
4. Recommended immediate action

Format as a clear alert report with severity indicators.`,
  },
];
