// Shared TypeScript types. These mirror what the FastAPI backend returns.

export type Severity = 'good' | 'warning' | 'critical';

// Branch status is relative to the group's pace (targets are aspirational),
// so it reads as a ranking, not a pass/fail against target.
export type BranchStatus = 'leading' | 'on_pace' | 'behind';

export interface Health {
  status: string;
  branches: number;
  sales_reps: number;
  leads: number;
  deliveries: number;
  date_range: string;
  now_anchor?: string;
}

export interface KPIs {
  revenue_booked: number;
  cars_delivered: number;
  total_leads: number;
  won_leads: number;
  conversion: number;
  win_rate: number;
  lost: number;
  lost_value: number;
  open_leads: number;
  cold_leads: number;
  cold_value: number;
  awaiting_leads: number;
  awaiting_value: number;
  committed_leads: number;
  committed_value: number;
  avg_delivery_days: number;
  pipeline_value: number;
  attainment?: number;
  target_units?: number;
}

export interface FunnelStep {
  stage: string;
  count: number;
  drop: number | null;
  by_branch?: { branch: string; count: number }[];
  by_rep?: { rep: string; count: number }[];
}

export interface SpeedToLead {
  median_hours: number;
  within_24h: number;
  over_72h: number;
  count: number;
}

export interface MonthPoint {
  month: string;
  delivered: number;
  revenue: number;
  by_branch?: { branch: string; count: number; revenue: number }[];
}

export interface BranchHealth {
  id: string;
  name: string;
  city: string;
  manager: string;
  delivered: number;
  target_units: number;
  attainment: number;
  conversion: number;
  cold_leads: number;
  revenue: number;
  status: BranchStatus;
}

export interface PeriodDeltas {
  revenue_booked: number | null;
  cars_delivered: number | null;
}

export interface Overview {
  kpis: KPIs;
  deltas: PeriodDeltas | null;
  funnel: FunnelStep[];
  speed_to_lead: SpeedToLead;
  monthly: MonthPoint[];
  branch_health: BranchHealth[];
  lost_reasons: LostReason[];
  model_mix: ModelRow[];
  source_quality: SourceQuality[];
}

export interface RepRow {
  id: string;
  name: string;
  role: string;
  leads: number;
  delivered: number;
  conversion: number;
  revenue: number;
}

export interface Bottleneck {
  id: string;
  customer_name: string;
  model: string;
  status: string;
  deal_value: number;
  rep: string;
  branch: string;
  idle_days: number;
  health: number;
  next_best_action: string;
  severity: Severity;
}

export interface BranchDetail {
  id: string;
  name: string;
  city: string;
  manager: string;
  kpis: KPIs;
  funnel: FunnelStep[];
  reps: RepRow[];
  cold_leads: Bottleneck[];
  group_conversion: number;
}

export interface BottleneckResult {
  rows: Bottleneck[];
  count: number;
  value_at_risk: number;
  urgent: number;
}

export interface LeaderRow {
  id: string;
  name: string;
  branch: string;
  role: string;
  leads: number;
  delivered: number;
  revenue: number;
  avg_deal: number;
  active_deals: number;
  overloaded: boolean;
}

export interface RepDetail {
  id: string;
  name: string;
  role: string;
  branch_id: string;
  branch: string;
  joined: string;
  kpis: {
    leads: number;
    delivered: number;
    conversion: number;
    revenue: number;
    open_deals: number;
    avg_response_hours: number;
  };
  funnel: FunnelStep[];
  pipeline: Bottleneck[];
  branch_conversion: number;
  group_conversion: number;
}

export interface DeliveryAnalysis {
  total: number;
  on_time: number;
  delayed: number;
  on_time_rate: number;
  avg_days_on_time: number;
  avg_days_delayed: number;
  delay_reasons: { reason: string; count: number }[];
}

export interface ModelRow {
  model: string;
  leads: number;
  delivered: number;
  avg_price: number;
  revenue: number;
  by_branch?: { branch: string; count: number }[];
}

export interface DeliveriesResp {
  analysis: DeliveryAnalysis;
  model_mix: ModelRow[];
}

export interface LostReason {
  reason: string;
  count: number;
}

export interface SourceQuality {
  source: string;
  leads: number;
  delivered: number;
  rate: number;
  by_branch?: { branch: string; count: number }[];
}

export interface InsightsResp {
  summary: { paragraphs: string[]; kpis: KPIs };
  lost_reasons: LostReason[];
  source_quality: SourceQuality[];
}

export interface WhatIf {
  lift_pct: number;
  test_drives: number;
  current_rate: number;
  projected_rate: number;
  avg_deal_value: number;
  additional_orders: number;
  additional_revenue: number;
  current_revenue: number;
  projected_revenue: number;
}

export const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  test_drive: 'Test drive',
  negotiation: 'Negotiation',
  order_placed: 'Order placed',
  delivered: 'Delivered',
};
