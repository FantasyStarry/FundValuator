export type FundInfo = {
  code: string;
  name: string;
  updated_at?: string | null;
  amount: number;
  mode: "amount" | "shares";
  shares: number;
  cost: number;
  invested_amount: number;  // 金额模式下的投入本金
  estimate_pct?: number | null;
};

export type EstimateComponent = {
  stock_code: string;
  stock_name: string;
  weight: number;
  price: number;
  prev_close: number;
  change_pct: number;
};

export type EstimateResponse = {
  code: string;
  name: string;
  estimate_pct: number;
  estimate_source: "realtime" | "official" | "transition" | "holdings";
  used_date?: string | null;
  switch_at?: string | null;
  transition_progress?: number | null;
  official_updated?: boolean;
  holiday_mode?: boolean;
  estimate_income: number;
  total_income: number;
  components: EstimateComponent[];
  fund_gz_pct?: number | null;
  fund_gz_nav?: number | null;
  fund_gz_time?: string | null;
  real_nav_pct?: number | null;
  real_nav_date?: string | null;
  official_pct?: number | null;
  official_date?: string | null;
  realtime_pct?: number | null;
  realtime_time?: string | null;
};

export type PortfolioOverview = {
  total_amount: number;
  total_daily_income: number;
  total_holding_income: number;
  daily_pct: number;
  update_time?: string | null;
  used_source?: "realtime" | "official" | "transition" | "holdings" | null;
  used_date?: string | null;
  switch_at?: string | null;
  transition_progress?: number | null;
  official_updated?: boolean;
  holiday_mode?: boolean;
};

export type NavItem = {
  date: string;
  nav: number;
  accum_nav?: number | null;
  daily_pct?: number | null;
};

export type NavHistoryResponse = {
  code: string;
  name: string;
  items: NavItem[];
};

export type NewsItem = {
  title: string;
  link?: string | null;
  source?: string | null;
  published_at?: string | null;
  summary?: string | null;
  analysis?: NewsAnalysisResponse | null;
};

export type NewsFeedResponse = {
  source: string;
  items: NewsItem[];
};

export type NewsAnalysisResponse = {
  summary: string;
  sentiment: string;
  impacted_assets: string[];
  confidence: number;
  reasoning?: string | null;
  importance_score?: number | null;
};

export type MarketFund = {
  code: string;
  name: string;
  type?: string;
};
