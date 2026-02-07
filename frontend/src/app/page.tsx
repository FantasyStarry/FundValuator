"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import { 
  Search, 
  RefreshCw, 
  Trash2, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Activity,
  Clock
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type FundInfo = {
  code: string;
  name: string;
  updated_at?: string | null;
  amount: number;
  mode: "amount" | "shares";
  shares: number;
  cost: number;
  estimate_pct?: number | null;
};

type EstimateComponent = {
  stock_code: string;
  stock_name: string;
  weight: number;
  price: number;
  prev_close: number;
  change_pct: number;
};

type EstimateResponse = {
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

type PortfolioOverview = {
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

type NavItem = {
  date: string;
  nav: number;
  accum_nav?: number | null;
  daily_pct?: number | null;
};

type NavHistoryResponse = {
  code: string;
  name: string;
  items: NavItem[];
};

type MarketFund = {
  code: string;
  name: string;
  type?: string;
};

const API_BASE = "/api";

const fetchJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
};

const listFunds = async (keyword = ""): Promise<FundInfo[]> => {
  const params = new URLSearchParams();
  if (keyword) params.append("keyword", keyword);
  return fetchJson<FundInfo[]>(`/funds?${params.toString()}`);
};

const addFund = (code: string): Promise<FundInfo> =>
  fetchJson<FundInfo>("/funds", {
    method: "POST",
    body: JSON.stringify({ code }),
  });

const deleteFund = (code: string): Promise<void> =>
  fetchJson<void>(`/funds/${code}`, {
    method: "DELETE",
  });

const updateFundAmount = (code: string, payload: { amount: number; mode: "amount" | "shares"; shares: number; cost: number }) =>
  fetchJson<FundInfo>(`/funds/${code}/amount`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

const fetchPortfolioOverview = () => fetchJson<PortfolioOverview>("/portfolio/overview");

const fetchEstimate = (code: string) => fetchJson<EstimateResponse>(`/funds/${code}/estimate`);

const fetchNavHistory = (code: string, limit = 30) =>
  fetchJson<NavHistoryResponse>(`/funds/${code}/nav/history?limit=${limit}`);

const searchMarketFunds = (keyword: string) =>
  fetchJson<MarketFund[]>(`/market/search?keyword=${encodeURIComponent(keyword)}`);

const formatNumber = (value?: number | null, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
};

const formatPct = (value?: number | null, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
};

const sourceMap: Record<string, string> = {
  realtime: "实时估值",
  official: "官方涨跌",
  transition: "官方更新中",
  holdings: "持仓估算",
};

const resolveSourceLabel = (source?: string | null, holiday?: boolean) => {
  if (holiday) return "休市沿用上一交易日";
  if (!source) return "—";
  return sourceMap[source] ?? "—";
};

export default function Home() {
  const [funds, setFunds] = useState<FundInfo[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [detail, setDetail] = useState<EstimateResponse | null>(null);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioOverview | null>(null);
  const [listQuery, setListQuery] = useState("");
  const [marketQuery, setMarketQuery] = useState("");
  const [marketResults, setMarketResults] = useState<MarketFund[]>([]);
  const [status, setStatus] = useState("");
  const [editMode, setEditMode] = useState<"amount" | "shares">("amount");
  const [inputAmount, setInputAmount] = useState("");
  const [inputShares, setInputShares] = useState("");
  const [inputCost, setInputCost] = useState("");
  const [showHoldingSheet, setShowHoldingSheet] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const selectedFund = useMemo(() => funds.find((item) => item.code === selectedCode), [funds, selectedCode]);

  const chartOption = useMemo(() => {
    if (!navItems.length) return null;
    return {
      backgroundColor: "transparent",
      grid: { left: 48, right: 24, top: 24, bottom: 32 },
      xAxis: {
        type: "category",
        data: navItems.map((item) => item.date),
        axisLabel: { color: "rgba(214, 219, 216, 0.7)" },
        axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "rgba(214, 219, 216, 0.7)" },
        splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.08)" } },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        borderColor: "rgba(255, 255, 255, 0.12)",
        textStyle: { color: "#ffffff" },
      },
      series: [
        {
          data: navItems.map((item) => item.nav),
          type: "line",
          smooth: true,
          lineStyle: { color: "#7fa38b", width: 2 },
          areaStyle: { color: "rgba(127, 163, 139, 0.18)" },
          symbol: "none",
        },
      ],
    };
  }, [navItems]);

  const pushStatus = useCallback((message: string) => {
    setStatus(message);
    setTimeout(() => setStatus(""), 3000);
  }, []);

  const syncInputsFromFund = useCallback((fund?: FundInfo) => {
    setEditMode(fund?.mode ?? "amount");
    setInputAmount(fund?.amount ? String(fund.amount) : "");
    setInputShares(fund?.shares ? String(fund.shares) : "");
    setInputCost(fund?.cost ? String(fund.cost) : "");
  }, []);

  const loadFunds = useCallback(async (keyword = "") => {
    const data = await listFunds(keyword);
    setFunds(data);
    setSelectedCode((current) => {
      if (!current && data.length) {
        return data[0].code;
      }
      if (current && !data.find((item) => item.code === current)) {
        return data[0]?.code ?? "";
      }
      return current;
    });
  }, []);

  const loadPortfolio = useCallback(async () => {
    const overview = await fetchPortfolioOverview();
    setPortfolio(overview);
  }, []);

  const loadDetail = useCallback(
    async (code: string) => {
      const [detailRes, navRes] = await Promise.all([fetchEstimate(code), fetchNavHistory(code, 30)]);
      setDetail(detailRes);
      setNavItems(navRes.items ?? []);
      const fund = funds.find((item) => item.code === code);
      syncInputsFromFund(fund);
    },
    [funds, syncInputsFromFund]
  );

  useEffect(() => {
    loadFunds().catch((err) => pushStatus(err.message));
    loadPortfolio().catch((err) => pushStatus(err.message));
  }, [loadFunds, loadPortfolio, pushStatus]);

  useEffect(() => {
    if (!selectedCode) return;
    loadDetail(selectedCode).catch((err) => pushStatus(err.message));
  }, [selectedCode, loadDetail, pushStatus]);

  useEffect(() => {
    if (!selectedFund) return;
    syncInputsFromFund(selectedFund);
  }, [selectedFund, syncInputsFromFund]);


  useEffect(() => {
    const handle = setTimeout(() => {
      loadFunds(listQuery).catch((err) => pushStatus(err.message));
    }, 300);
    return () => clearTimeout(handle);
  }, [listQuery, loadFunds, pushStatus]);

  useEffect(() => {
    if (!marketQuery.trim()) {
      setMarketResults([]);
      return;
    }
    const handle = setTimeout(() => {
      searchMarketFunds(marketQuery.trim())
        .then((data) => setMarketResults(data))
        .catch(() => setMarketResults([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [marketQuery]);

  useEffect(() => {
    if (!chartRef.current || !chartOption) return;
    const chart = echarts.init(chartRef.current);
    chart.setOption(chartOption);
    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [chartOption]);

  const handleAddFund = async (code: string) => {
    try {
      await addFund(code);
      await loadFunds(listQuery);
      await loadPortfolio();
      setMarketQuery("");
      setMarketResults([]);
      pushStatus("基金已加入");
    } catch (err) {
      pushStatus(err instanceof Error ? err.message : "添加失败");
    }
  };

  const handleDeleteFund = async () => {
    if (!selectedCode) return;
    try {
      await deleteFund(selectedCode);
      await loadFunds(listQuery);
      await loadPortfolio();
      setDetail(null);
      setNavItems([]);
      setShowHoldingSheet(false);
      pushStatus("基金已移除");
    } catch (err) {
      pushStatus(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleUpdateHolding = async () => {
    if (!selectedCode) return;
    const amount = Number.parseFloat(inputAmount || "0");
    const shares = Number.parseFloat(inputShares || "0");
    const cost = Number.parseFloat(inputCost || "0");
    if (editMode === "amount" && Number.isNaN(amount)) {
      pushStatus("请输入有效金额");
      return;
    }
    if (editMode === "shares" && (Number.isNaN(shares) || Number.isNaN(cost))) {
      pushStatus("请输入有效份额与成本");
      return;
    }
    try {
      await updateFundAmount(selectedCode, {
        amount: editMode === "amount" ? amount : 0,
        mode: editMode,
        shares: editMode === "shares" ? shares : 0,
        cost: editMode === "shares" ? cost : 0,
      });
      await loadFunds(listQuery);
      await loadPortfolio();
      await loadDetail(selectedCode);
      setShowHoldingSheet(false);
      pushStatus("持仓已更新");
    } catch (err) {
      pushStatus(err instanceof Error ? err.message : "更新失败");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">AI 基金估值平台</h1>
            <p className="text-xs text-muted-foreground">实时估值与官方对账</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 justify-between lg:justify-end">
            <div className="relative w-full max-w-[520px] lg:w-[360px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9"
                placeholder="搜索并添加基金..."
                value={marketQuery}
                onChange={(e) => setMarketQuery(e.target.value)}
              />
              {marketQuery && (
                <div className="absolute top-11 left-0 right-0 bg-popover border border-border rounded-md p-2 flex flex-col gap-2 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  {marketResults.slice(0, 6).map((item) => (
                    <div
                      key={item.code}
                      className="flex justify-between items-center gap-3 p-2 rounded-md transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.code}</div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => handleAddFund(item.code)}>
                        <Plus className="h-4 w-4 mr-1" /> 添加
                      </Button>
                    </div>
                  ))}
                  {!marketResults.length && <div className="p-2 text-sm text-muted-foreground text-center">未找到匹配基金</div>}
                </div>
              )}
            </div>

            <Badge variant="outline" className="gap-1 border-border bg-muted/40 text-foreground">
              <Clock className="h-3 w-3" /> 组合更新：{portfolio?.update_time ?? "—"}
            </Badge>
            {selectedFund && (
              <Badge variant="outline" className="gap-1 border-border bg-muted/40 text-foreground">
                当前：{selectedFund.name}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-6 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 min-h-0">
          <aside className="flex flex-col min-h-0 rounded-md border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex justify-between items-center">
              <span className="font-semibold text-sm">基金列表</span>
              <Badge variant="secondary" className="bg-muted text-foreground">{funds.length}</Badge>
            </div>

            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="筛选列表..."
                  value={listQuery}
                  onChange={(e) => setListQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {funds.map((fund) => {
                const estimate = fund.estimate_pct ?? null;
                const isPositive = estimate !== null && estimate >= 0;
                return (
                  <div
                    key={fund.code}
                    className={cn(
                      "p-3 rounded-md cursor-pointer border transition-colors",
                      selectedCode === fund.code
                        ? "bg-secondary border-primary/50"
                        : "border-transparent hover:border-border hover:bg-muted/40"
                    )}
                    onClick={() => setSelectedCode(fund.code)}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-sm truncate pr-2">{fund.name}</span>
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          isPositive ? "text-[#a06b6b]" : "text-[#7b9b84]"
                        )}
                      >
                        {estimate !== null ? `${estimate.toFixed(2)}%` : "—"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{fund.code}</div>
                  </div>
                );
              })}
              {!funds.length && <div className="text-center text-muted-foreground text-sm py-8">暂无数据</div>}
            </div>

            <div className="p-4 border-t border-border bg-secondary/60">
              <Button variant="outline" className="w-full border-border" onClick={() => selectedFund && setShowHoldingSheet(true)}>
                <Wallet className="h-4 w-4 mr-2" /> 更新持仓
              </Button>
            </div>
          </aside>

          <main className="flex flex-col gap-6 min-h-0">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> 投资组合总览
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-md bg-secondary/60 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">总资产</div>
                    <div className="text-2xl font-bold tracking-tight">{formatNumber(portfolio?.total_amount)}</div>
                  </div>
                  <div className="p-3 rounded-md bg-secondary/60 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">今日收益</div>
                    <div
                      className={cn(
                        "text-2xl font-bold tracking-tight",
                        (portfolio?.total_daily_income ?? 0) >= 0 ? "text-[#a06b6b]" : "text-[#7b9b84]"
                      )}
                    >
                      {formatNumber(portfolio?.total_daily_income)}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-secondary/60 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">持有收益</div>
                    <div
                      className={cn(
                        "text-2xl font-bold tracking-tight",
                        (portfolio?.total_holding_income ?? 0) >= 0 ? "text-[#a06b6b]" : "text-[#7b9b84]"
                      )}
                    >
                      {formatNumber(portfolio?.total_holding_income)}
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-secondary/60 border border-border">
                    <div className="text-xs text-muted-foreground mb-1">今日涨跌</div>
                    <div
                      className={cn(
                        "text-2xl font-bold tracking-tight flex items-center gap-1",
                        (portfolio?.daily_pct ?? 0) >= 0 ? "text-[#a06b6b]" : "text-[#7b9b84]"
                      )}
                    >
                      {(portfolio?.daily_pct ?? 0) >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {formatPct(portfolio?.daily_pct, 2)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-border bg-muted/40 text-foreground">
                    来源：{resolveSourceLabel(portfolio?.used_source, portfolio?.holiday_mode)}
                  </Badge>
                  <Badge variant="outline" className="border-border bg-muted/40 text-foreground">
                    日期：{portfolio?.used_date ?? "—"}
                  </Badge>
                  {portfolio?.official_updated && (
                    <Badge variant="outline" className="border-border bg-secondary/70 text-[#cdd6cd]">
                      官方已更新
                    </Badge>
                  )}
                  {portfolio?.transition_progress !== undefined &&
                    portfolio?.transition_progress !== null &&
                    portfolio.transition_progress < 1 && (
                      <Badge variant="outline" className="border-border bg-muted/60 text-muted-foreground">
                        过渡 {Math.round(portfolio.transition_progress * 100)}%
                      </Badge>
                    )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">{selectedFund ? selectedFund.name : "基金详情"}</CardTitle>
                  {selectedFund && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] h-5 border-border">
                        {selectedFund.code}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {resolveSourceLabel(detail?.estimate_source, detail?.holiday_mode)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => selectedCode && loadDetail(selectedCode)} title="刷新">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDeleteFund}
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: "当日涨跌", value: formatPct(detail?.estimate_pct), positive: (detail?.estimate_pct ?? 0) >= 0 },
                    { label: "估算收益", value: formatNumber(detail?.estimate_income), positive: (detail?.estimate_income ?? 0) >= 0 },
                    { label: "持有收益", value: formatNumber(detail?.total_income), positive: (detail?.total_income ?? 0) >= 0 },
                    { label: "官方估值", value: formatPct(detail?.fund_gz_pct), positive: null },
                    { label: "官方净值", value: formatNumber(detail?.fund_gz_nav), positive: null },
                    { label: "净值日期", value: detail?.real_nav_date ?? "—", positive: null },
                  ].map((item, i) => (
                    <div key={i} className="p-3 rounded-md bg-secondary/60 border border-border">
                      <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                      <div
                        className={cn(
                          "text-lg font-semibold",
                          item.positive === true
                            ? "text-[#a06b6b]"
                            : item.positive === false
                              ? "text-[#7b9b84]"
                              : ""
                        )}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">净值走势（30日）</CardTitle>
                </CardHeader>
                <CardContent>
                  {chartOption ? (
                    <div ref={chartRef} className="h-[280px] w-full rounded-md bg-muted/30 border border-border" />
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground bg-muted/30 rounded-md border border-dashed border-border">
                      暂无净值数据
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium">持仓信息</CardTitle>
                  <Button variant="outline" size="sm" className="h-7 text-xs border-border" onClick={() => selectedFund && setShowHoldingSheet(true)}>
                    编辑
                  </Button>
                </CardHeader>
                <CardContent>
                  {selectedFund ? (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-4 rounded-md bg-secondary/60 border border-border flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">持有方式</span>
                        <Badge variant="secondary" className="bg-muted text-foreground">
                          {selectedFund.mode === "amount" ? "金额" : "份额"}
                        </Badge>
                      </div>
                      {selectedFund.mode === "amount" ? (
                        <div className="p-4 rounded-md bg-secondary/60 border border-border flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">持有金额</span>
                          <span className="text-lg font-semibold font-mono">{formatNumber(selectedFund.amount)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="p-4 rounded-md bg-secondary/60 border border-border flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">持有份额</span>
                            <span className="text-lg font-semibold font-mono">{formatNumber(selectedFund.shares, 2)}</span>
                          </div>
                          <div className="p-4 rounded-md bg-secondary/60 border border-border flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">单位成本</span>
                            <span className="text-lg font-semibold font-mono">{formatNumber(selectedFund.cost, 4)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">请先选择基金</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">重仓明细</CardTitle>
              </CardHeader>
              <CardContent>
                {detail && detail.components.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>股票代码</TableHead>
                        <TableHead>名称</TableHead>
                        <TableHead>权重</TableHead>
                        <TableHead>价格</TableHead>
                        <TableHead className="text-right">涨跌幅</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.components.map((item) => (
                        <TableRow key={item.stock_code}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{item.stock_code}</TableCell>
                          <TableCell className="font-medium">{item.stock_name}</TableCell>
                          <TableCell>{formatPct(item.weight)}</TableCell>
                          <TableCell>{formatNumber(item.price)}</TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-semibold",
                              item.change_pct >= 0 ? "text-[#a06b6b]" : "text-[#7b9b84]"
                            )}
                          >
                            {formatPct(item.change_pct)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">暂无持仓数据</div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      {status && (
        <div className="fixed bottom-6 right-6 bg-card border border-border text-foreground px-4 py-3 rounded-md shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4">
          {status}
        </div>
      )}

      {showHoldingSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200" onClick={() => setShowHoldingSheet(false)}>
          <Card className="w-full max-w-md bg-card border-border shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>持仓更新</CardTitle>
              <CardDescription>{selectedFund ? `${selectedFund.name} · ${selectedFund.code}` : "请选择基金"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" className="accent-primary" checked={editMode === "amount"} onChange={() => setEditMode("amount")} />
                  <span className="text-sm">按金额</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" className="accent-primary" checked={editMode === "shares"} onChange={() => setEditMode("shares")} />
                  <span className="text-sm">按份额</span>
                </label>
              </div>

              <div className="space-y-3">
                {editMode === "amount" ? (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">持有金额</label>
                    <Input value={inputAmount} onChange={(e) => setInputAmount(e.target.value)} placeholder="请输入金额" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">持有份额</label>
                      <Input value={inputShares} onChange={(e) => setInputShares(e.target.value)} placeholder="请输入份额" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">持仓成本</label>
                      <Input value={inputCost} onChange={(e) => setInputCost(e.target.value)} placeholder="请输入成本单价" />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => setShowHoldingSheet(false)}>取消</Button>
                <Button onClick={handleUpdateHolding}>保存更新</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
