// Shared TypeScript types. These mirror what the FastAPI backend returns.

export type Severity = 'good' | 'warning' | 'critical';

// Branch status is relative to the group's pace (targets are aspirational),
// so it reads as a ranking, not a pass/fail against target.
export type BranchStatus = 'leading' | 'on_pace' | 'behind';

// The bucket a stuck deal falls into — each needs a different response.
export type BottleneckCategory = 'follow_up' | 'delivery' | 'stale';

export type Trend = 'up' | 'down' | 'flat';

// Run-rate forecast: is the branch closing the gap to target, or falling behind?
export interface Forecast {
  monthly_target: number;
  recent_pace: number;
  pace_pct: number;
  trend: Trend;
  last_month: number;
  prev_month: number | null;
}

// Pipeline forecast: how the CURRENT open pipeline is projected to resolve,
// weighting each open deal by the historical delivery rate for its stage.
export interface ForecastStage {
  stage: string;
  rate: number;
  open: number;
  value: number;
  expected: number;
  expected_value: number;
}

export interface PipelineForecast {
  delivered: number;
  open_leads: number;
  expected_additional: number;
  expected_additional_revenue: number;
  projected_total: number;
  best_case: number;
  pipeline_value: number;
  by_stage?: ForecastStage[];
  target_units?: number;
  attainment_now?: number;
  attainment_projected?: number;
  on_track?: boolean;
}

// Compact projection carried on each branch-list card (no by-stage detail).
export interface BranchForecast {
  projected_total: number;
  expected_additional: number;
  expected_additional_revenue: number;
  pipeline_value: number;
  open_leads: number;
  attainment_projected: number;
  on_track: boolean;
}

export interface Momentum {
  current_month: string;
  prev_month: string;
  cars_delivered: number | null;
  revenue_booked: number | null;
  cars_delivered_current: number;
  cars_delivered_prev: number;
}

export interface GroupTarget {
  delivered: number;
  target_units: number;
  attainment: number;
  revenue: number;
  revenue_target: number;
  revenue_attainment: number;
}

export interface CategoryStat {
  count: number;
  value: number;
}
export type CategoryStats = Record<BottleneckCategory, CategoryStat>;

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
  stale_leads: number;
  stale_value: number;
  committed_leads: number;
  committed_value: number;
  avg_delivery_days: number;
  pipeline_value: number;
  attainment?: number;
  target_units?: number;
  revenue_target?: number;
  revenue_attainment?: number;
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
  by_rep?: { rep: string; count: number; revenue: number }[];
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
  revenue_target: number;
  revenue_attainment: number;
  status: BranchStatus;
  forecast: Forecast;
  pipeline_forecast: BranchForecast;
}

export interface PeriodDeltas {
  revenue_booked: number | null;
  cars_delivered: number | null;
}

export interface Overview {
  kpis: KPIs;
  deltas: PeriodDeltas | null;
  momentum: Momentum | null;
  funnel: FunnelStep[];
  speed_to_lead: SpeedToLead;
  monthly: MonthPoint[];
  branch_health: BranchHealth[];
  // Present only when scoped to one branch — that branch's reps, for the
  // "Sales rep performance" table that replaces branch ranking.
  reps: LeaderRow[] | null;
  group_target: GroupTarget;
  forecast: PipelineForecast;
  lost_reasons: LostReason[];
  model_mix: ModelRow[];
  source_quality: SourceQuality[];
  now: string;
}

export interface RepRow {
  id: string;
  name: string;
  role: string;
  leads: number;
  delivered: number;
  conversion: number;
  revenue: number;
  active: number;
  cold: number;
  cold_value: number;
  contact_rate: number;
  avg_response_hours: number;
  needs_coaching: boolean;
}

// One stage transition in a lead's journey (from the lead's status_history).
export interface StatusEvent {
  status: string;
  timestamp: string;
  note?: string | null;
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
  category: BottleneckCategory;
  next_best_action: string;
  severity: Severity;
  // Detail fields, surfaced when a row is expanded.
  phone: string;
  source: string;
  expected_close_date: string | null;
  status_history: StatusEvent[];
}

export interface BranchDetail {
  id: string;
  name: string;
  city: string;
  manager: string;
  kpis: KPIs;
  forecast: Forecast;
  pipeline_forecast: PipelineForecast;
  funnel: FunnelStep[];
  model_mix: ModelRow[];
  source_quality: SourceQuality[];
  reps: RepRow[];
  cold_leads: Bottleneck[];
  cold_categories: CategoryStats;
  group_conversion: number;
}

export interface BottleneckResult {
  rows: Bottleneck[];
  count: number;
  value_at_risk: number;
  urgent: number;
  categories: CategoryStats;
}

export interface LeaderRow {
  id: string;
  name: string;
  branch: string;
  role: string;
  leads: number;
  delivered: number;
  conversion: number;
  revenue: number;
  avg_deal: number;
  active_deals: number;
  cold: number;
  contact_rate: number;
  avg_response_hours: number;
  needs_coaching: boolean;
  overloaded: boolean;
}

export interface RepDetail {
  id: string;
  name: string;
  role: string;
  branch_id: string;
  branch: string;
  joined: string;
  needs_coaching: boolean;
  kpis: {
    leads: number;
    delivered: number;
    conversion: number;
    revenue: number;
    open_deals: number;
    avg_response_hours: number;
    contact_rate: number;
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
  by_rep?: { rep: string; count: number }[];
}

export interface AwaitingOrder {
  id: string;
  customer_name: string;
  model: string;
  branch: string;
  rep: string;
  deal_value: number;
  days_waiting: number;
}

export interface AwaitingOrders {
  rows: AwaitingOrder[];
  count: number;
  value: number;
  over_60_value: number;
  buckets: { under_30: number; '30_59': number; '60_plus': number };
}

export interface DeliveriesResp {
  analysis: DeliveryAnalysis;
  model_mix: ModelRow[];
  awaiting: AwaitingOrders;
  now: string;
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
  by_rep?: { rep: string; count: number }[];
}

// Pretty labels for lead sources (raw values are snake_case). Shared by the
// Overview and the branch drill-down.
export const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  walk_in: 'Walk-in',
  referral: 'Referral',
  social_media: 'Social media',
  phone_enquiry: 'Phone enquiry',
  auto_expo: 'Auto expo',
};

// A prescriptive card: a verdict, one highlighted number, and a next action.
export interface Signal {
  severity: Severity;
  tag: string;
  value: string;
  unit: string;
  verdict: string;
  action: string;
}

// One funnel stage where lost pipeline leaked out.
export interface LeakRow {
  stage: string;
  label: string;
  desc: string;
  count: number;
  value: number;
  share: number;
  top_reason: string | null;
}

export interface RevenueLeak {
  rows: LeakRow[];
  total_value: number;
  total_count: number;
}

export interface InsightsResp {
  signals: Signal[];
  leak: RevenueLeak;
  source_quality: SourceQuality[];
  kpis: KPIs;
  now: string;
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
