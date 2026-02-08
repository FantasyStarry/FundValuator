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
  Clock,
  ArrowRight,
  MoreHorizontal,
  Calendar
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

import { FundChart } from "@/components/FundChart";

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

type NewsItem = {
  title: string;
  link?: string | null;
  source?: string | null;
  published_at?: string | null;
  summary?: string | null;
  analysis?: NewsAnalysisResponse | null;
};

type NewsFeedResponse = {
  source: string;
  items: NewsItem[];
};

type NewsAnalysisResponse = {
  summary: string;
  sentiment: string;
  impacted_assets: string[];
  confidence: number;
  reasoning?: string | null;
  importance_score?: number | null;
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

const fetchNewsFeed = (source = "rss", limit = 200) =>
  fetchJson<NewsFeedResponse>(`/news/feed?source=${encodeURIComponent(source)}&limit=${limit}`);

const NEWS_REFRESH_INTERVAL_MS = 15 * 1000;
const NEWS_MAX_ITEMS = 200;
const NEWS_CLEAN_INTERVAL_MS = 10 * 60 * 1000;

const formatNumber = (value?: number | null, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  // Format as MM-DD HH:mm
  const month = (parsed.getMonth() + 1).toString().padStart(2, '0');
  const date = parsed.getDate().toString().padStart(2, '0');
  const hours = parsed.getHours().toString().padStart(2, '0');
  const minutes = parsed.getMinutes().toString().padStart(2, '0');
  return `${month}-${date} ${hours}:${minutes}`;
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
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const newsSource = "rss";
  const [selectedNewsKey, setSelectedNewsKey] = useState<string>("");
  const [analysisCache, setAnalysisCache] = useState<Record<string, NewsAnalysisResponse>>({});
  const [newsLoading, setNewsLoading] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLElement>(null);

  const selectedFund = useMemo(() => funds.find((item) => item.code === selectedCode), [funds, selectedCode]);

  const [showTransactionSheet, setShowTransactionSheet] = useState(false);
  const [transType, setTransType] = useState<"buy" | "sell">("buy");
  const [transAmount, setTransAmount] = useState("");
  const [transShares, setTransShares] = useState("");
  const [transPrice, setTransPrice] = useState("");
  const [isAfter3PM, setIsAfter3PM] = useState(false);
  
  useEffect(() => {
    if (showTransactionSheet) {
      const now = new Date();
      // Check if after 15:00
      const after3 = now.getHours() >= 15;
      setIsAfter3PM(after3);
      
      // Auto-fill price based on best available data
      // If < 15:00, use real-time estimate (gsz) if available
      // If >= 15:00, usually market is closed, real-time estimate is the closing estimate
      // Or if we have today's official NAV (rarely before night), use it
      
      // Priority: Real-time Estimate (gsz) > Latest History NAV
      const estimateNav = detail?.fund_gz_nav;
      const historyNav = navItems.length ? navItems[navItems.length-1].nav : 0;
      
      const bestPrice = estimateNav || historyNav;
      if (bestPrice) {
        setTransPrice(String(bestPrice));
      }
    }
  }, [showTransactionSheet, detail, navItems]);

  // Auto-calculate Shares when Amount changes (Buy)
  useEffect(() => {
    if (showTransactionSheet && transType === "buy" && selectedFund?.mode !== "amount") {
       const amount = parseFloat(transAmount);
       const price = parseFloat(transPrice);
       if (amount > 0 && price > 0) {
         // Fee is ignored for simplicity or could be added later
         setTransShares((amount / price).toFixed(2));
       }
    }
  }, [transAmount, transPrice, transType, showTransactionSheet, selectedFund]);

  // Auto-calculate Amount when Shares changes (Sell)
  // Actually usually we sell shares, and get amount. 
  // But for "Reduce Position", user might input Shares.
  
  // chartRef is no longer needed in page.tsx as it is moved to FundChart component
  // const chartRef = useRef<HTMLDivElement>(null);

  const [chartPeriod, setChartPeriod] = useState<"intraday" | "1m" | "3m" | "1y">("1m");

  const chartOption = useMemo(() => {
    // If intraday and no items, return null to show "Coming Soon" placeholder
    if (chartPeriod === "intraday" && !navItems.length) return null;
    
    if (!navItems.length) return null;

    // Ensure chronological order (oldest to newest) for the chart
    const chartData = [...navItems].reverse();

    return {
      backgroundColor: "transparent",
      grid: { left: 40, right: 20, top: 20, bottom: 20, containLabel: true },
      xAxis: {
        type: "category",
        data: chartData.map((item) => item.date),
        axisLabel: { color: "#6b6258", fontFamily: "monospace", fontSize: 10 },
        axisLine: { show: false },
        axisTick: { show: false },
        boundaryGap: false,
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#6b6258", fontFamily: "monospace", fontSize: 10 },
        splitLine: { lineStyle: { color: "#ded6c8", type: "dashed" } },
        scale: true,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(31, 31, 28, 0.95)",
        borderColor: "transparent",
        textStyle: { color: "#f6f1e7", fontSize: 12 },
        padding: [8, 12],
        axisPointer: {
          type: "cross",
          label: {
            backgroundColor: "#2f5b43"
          }
        },
        formatter: (params: any) => {
          const item = params[0];
          if (!item) return "";
          return `
            <div class="font-mono">
              <div class="text-[10px] text-muted-foreground mb-1">${item.name}</div>
              <div class="font-bold text-base">${parseFloat(item.value).toFixed(4)}</div>
            </div>
          `;
        }
      },
      series: [
        {
          data: chartData.map((item) => item.nav),
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: { color: "#1f4d3a", width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(31, 77, 58, 0.2)" },
              { offset: 1, color: "rgba(31, 77, 58, 0)" }
            ])
          },
          markLine: selectedFund?.cost && selectedFund.cost > 0 ? {
            symbol: "none",
            data: [{
              yAxis: selectedFund.cost,
              label: {
                formatter: "持仓成本",
                position: "start",
                color: "#f59e0b",
                fontSize: 10
              },
              lineStyle: {
                color: "#f59e0b",
                type: "dashed",
                width: 1
              }
            }]
          } : undefined
        },
      ],
    };
  }, [navItems, chartPeriod, selectedFund]);

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
      let limit = 30;
      if (chartPeriod === "3m") limit = 90;
      if (chartPeriod === "1y") limit = 365;

      const [detailRes, navRes] = await Promise.all([
        fetchEstimate(code),
        chartPeriod !== "intraday" 
          ? fetchNavHistory(code, limit) 
          : fetchNavHistory(code, 0) // Use 0 for intraday convention
      ]);
      setDetail(detailRes);
      setNavItems(navRes.items ?? []);
      const fund = funds.find((item) => item.code === code);
      syncInputsFromFund(fund);
    },
    [funds, syncInputsFromFund, chartPeriod]
  );

  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const res = await fetchNewsFeed(newsSource, NEWS_MAX_ITEMS);
      const items = (res.items ?? []).slice(0, NEWS_MAX_ITEMS);
      setNewsItems(items);
      setSelectedNewsKey((current) => {
        if (current) return current;
        const first = items[0];
        if (!first) return "";
        return first.link || first.title;
      });
      setAnalysisCache(() => {
        const next: Record<string, NewsAnalysisResponse> = {};
        items.forEach((item) => {
          const key = item.link || item.title;
          if (key && item.analysis) {
            next[key] = item.analysis;
          }
        });
        return next;
      });
      return items;
    } finally {
      setNewsLoading(false);
    }
  }, [newsSource]);


  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;
    const update = () => {
      setHeaderHeight(node.getBoundingClientRect().height);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      loadFunds(listQuery).catch((err) => pushStatus(err.message));
    }, 300);
    return () => clearTimeout(handle);
  }, [listQuery, loadFunds, pushStatus]);

  useEffect(() => {
    loadPortfolio().catch((err) => pushStatus(err.message));
  }, [loadPortfolio, pushStatus]);

  useEffect(() => {
    if (!selectedCode) return;
    loadDetail(selectedCode).catch((err) => pushStatus(err.message));
  }, [selectedCode, loadDetail, pushStatus]);

  useEffect(() => {
    if (!selectedFund) return;
    syncInputsFromFund(selectedFund);
  }, [selectedFund, syncInputsFromFund]);

  useEffect(() => {
    const run = async () => {
      try {
        await loadNews();
      } catch (err) {
        if (err instanceof Error) {
          pushStatus(err.message);
        }
      }
    };
    run();
    const handle = setInterval(run, NEWS_REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(handle);
    };
  }, [loadNews, pushStatus]);

  useEffect(() => {
    const handle = setInterval(() => {
      setNewsItems((prev) => prev.slice(0, NEWS_MAX_ITEMS));
      setAnalysisCache((prev) => {
        const keys = new Set(newsItems.map((item) => item.link || item.title).filter(Boolean));
        const next: Record<string, NewsAnalysisResponse> = {};
        Object.keys(prev).forEach((key) => {
          if (keys.has(key)) {
            next[key] = prev[key];
          }
        });
        return next;
      });
    }, NEWS_CLEAN_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [newsItems]);

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
    // chartRef logic removed from page.tsx
    /*
    if (!chartRef.current || !chartOption) return;
    const chart = echarts.init(chartRef.current);
    chart.setOption(chartOption);
    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
    */
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

  const handleTransaction = async () => {
    if (!selectedFund) return;
    
    let finalAmount = selectedFund.amount;
    let finalShares = selectedFund.shares;
    let finalCost = selectedFund.cost;
    const mode = selectedFund.mode;

    const tAmount = parseFloat(transAmount) || 0;
    const tShares = parseFloat(transShares) || 0;
    const tPrice = parseFloat(transPrice) || 0;

    if (mode === "amount") {
       if (transType === "buy") {
         finalAmount += tAmount;
       } else {
         finalAmount -= tAmount;
       }
       if (finalAmount < 0) finalAmount = 0;
    } else {
       // shares mode
       if (transType === "buy") {
          // New Shares = Old Shares + Transaction Shares
          // New Cost = ((Old Shares * Old Cost) + (Transaction Shares * Transaction Price)) / New Shares
          const costToAdd = tShares * tPrice;
          const oldTotalCost = finalShares * finalCost;
          const newTotalCost = oldTotalCost + costToAdd;
          finalShares += tShares;
          if (finalShares > 0) {
             finalCost = newTotalCost / finalShares;
          }
       } else {
          // Sell
          // Shares decrease
          // Cost per share remains same (FIFO/Average Cost assumption)
          finalShares -= tShares;
          if (finalShares < 0) finalShares = 0;
          if (finalShares === 0) finalCost = 0;
       }
    }

    try {
      await updateFundAmount(selectedFund.code, {
        amount: mode === "amount" ? finalAmount : 0,
        mode: mode,
        shares: mode === "shares" ? finalShares : 0,
        cost: mode === "shares" ? finalCost : 0,
      });
      await loadFunds(listQuery);
      await loadPortfolio();
      await loadDetail(selectedFund.code);
      setShowTransactionSheet(false);
      pushStatus("交易已记录");
      // Reset inputs
      setTransAmount("");
      setTransShares("");
      setTransPrice("");
    } catch (err) {
      pushStatus(err instanceof Error ? err.message : "交易失败");
    }
  };

  const listMaxHeight = headerHeight
    ? `calc(100vh - ${Math.ceil(headerHeight)}px)`
    : "calc(100vh - 120px)";

  const selectedNews = useMemo(() => {
    if (!selectedNewsKey) return null;
    return newsItems.find((item) => (item.link || item.title) === selectedNewsKey) || null;
  }, [newsItems, selectedNewsKey]);

  const selectedAnalysis = useMemo(() => {
    if (!selectedNewsKey) return null;
    return analysisCache[selectedNewsKey] || null;
  }, [analysisCache, selectedNewsKey]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header ref={headerRef} className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto w-full max-w-[1600px] px-6 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-tight">AI 基金估值平台</h1>
              <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">Real-time Valuation System</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 justify-between lg:justify-end">
            <div className="relative w-full max-w-[520px] lg:w-[320px] group">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                className="pl-9 h-10 bg-secondary/30 border-transparent focus:bg-background focus:border-primary/20 transition-all duration-300"
                placeholder="搜索代码或名称..."
                value={marketQuery}
                onChange={(e) => setMarketQuery(e.target.value)}
              />
              {marketQuery && (
                <div className="absolute top-12 left-0 right-0 bg-popover border border-border rounded-xl p-2 flex flex-col gap-1 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  {marketResults.slice(0, 6).map((item) => (
                    <div
                      key={item.code}
                      className="flex justify-between items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{item.code}</div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => handleAddFund(item.code)}>
                        <Plus className="h-4 w-4 mr-1" /> 添加
                      </Button>
                    </div>
                  ))}
                  {!marketResults.length && <div className="p-4 text-sm text-muted-foreground text-center">未找到匹配基金</div>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/30 px-3 py-2 rounded-full border border-border/50">
              <Clock className="h-3 w-3" /> 
              <span className="font-mono">{portfolio?.update_time ?? "—"}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="mx-auto w-full max-w-[1600px] px-6 py-6 h-[calc(100vh-80px)] grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_340px] gap-8">
          {/* Left Sidebar: Fund List */}
          <aside className="flex flex-col min-h-0 rounded-xl border border-border/60 bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40 flex justify-between items-center bg-muted/20">
              <span className="font-semibold text-sm tracking-tight">基金列表</span>
              <Badge variant="secondary" className="bg-background border border-border/60 text-foreground font-mono">{funds.length}</Badge>
            </div>

            <div className="p-4 border-b border-border/40">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 text-sm bg-muted/30 border-transparent focus:bg-background transition-colors"
                  placeholder="筛选..."
                  value={listQuery}
                  onChange={(e) => setListQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
              {funds.map((fund) => {
                const estimate = fund.estimate_pct ?? null;
                const isPositive = estimate !== null && estimate >= 0;
                return (
                  <div
                    key={fund.code}
                    className={cn(
                      "group p-3 rounded-lg cursor-pointer border transition-all duration-200 relative overflow-hidden",
                      selectedCode === fund.code
                        ? "bg-secondary/60 border-l-4 border-l-primary border-y border-r border-primary/10 shadow-sm pl-2.5"
                        : "border-transparent hover:bg-muted/60 hover:border-border/50"
                    )}
                    onClick={() => setSelectedCode(fund.code)}
                  >
                     {selectedCode === fund.code && (
                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                     )}
                    <div className="flex justify-between items-center mb-1.5 pl-2">
                      <span className={cn("font-medium text-sm truncate pr-2 transition-colors", selectedCode === fund.code ? "text-foreground" : "text-foreground/80")}>
                        {fund.name}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-bold font-mono tracking-tight",
                          isPositive ? "text-destructive" : "text-primary"
                        )}
                      >
                        {estimate !== null ? (isPositive ? "+" : "") + estimate.toFixed(2) + "%" : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pl-2">
                       <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">{fund.code}</span>
                       <ArrowRight className={cn("h-3 w-3 text-muted-foreground/50 transition-transform duration-300", selectedCode === fund.code ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100")} />
                    </div>
                  </div>
                );
              })}
              {!funds.length && <div className="text-center text-muted-foreground text-sm py-12">暂无数据</div>}
            </div>

            <div className="p-4 border-t border-border/40 bg-muted/10">
              <Button variant="outline" className="w-full border-border/60 hover:bg-background hover:shadow-sm transition-all" onClick={() => selectedFund && setShowHoldingSheet(true)}>
                <Wallet className="h-4 w-4 mr-2" /> 更新持仓
              </Button>
            </div>
          </aside>

          {/* Main Content: Dashboard */}
          <main className="flex flex-col gap-6 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            {/* Overview Bento Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <Card className="border-border/60 bg-card/80 shadow-sm transition-all duration-300 hover:shadow-[0_10px_28px_rgba(0,0,0,0.08)] hover:border-border">
                 <CardContent className="p-5 flex flex-col gap-3">
                   <div className="flex items-center justify-between">
                     <div className="text-[11px] font-medium text-muted-foreground">总资产</div>
                     <div className="h-7 w-7 rounded-md bg-muted/40 border border-border/50 flex items-center justify-center text-muted-foreground">
                       <Wallet className="h-3.5 w-3.5" />
                     </div>
                   </div>
                   <div className="text-3xl font-semibold tracking-tight font-mono text-foreground">
                     {formatNumber(portfolio?.total_amount)}
                   </div>
                   <div className="text-[11px] text-muted-foreground">实时估值</div>
                 </CardContent>
               </Card>

               <Card className="border-border/60 bg-card/80 shadow-sm transition-all duration-300 hover:shadow-[0_10px_28px_rgba(0,0,0,0.08)] hover:border-border">
                 <CardContent className="p-5 flex flex-col gap-3">
                   <div className="flex items-center justify-between">
                     <div className="text-[11px] font-medium text-muted-foreground">今日收益</div>
                     <div className="h-7 w-7 rounded-md bg-muted/40 border border-border/50 flex items-center justify-center text-muted-foreground">
                       {(portfolio?.daily_pct ?? 0) >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                     </div>
                   </div>
                   <div className={cn(
                     "text-3xl font-semibold tracking-tight font-mono",
                     (portfolio?.total_daily_income ?? 0) >= 0 ? "text-destructive" : "text-foreground"
                   )}>
                     {(portfolio?.total_daily_income ?? 0) > 0 ? "+" : ""}{formatNumber(portfolio?.total_daily_income)}
                   </div>
                   <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                     <span className="font-mono font-medium text-foreground">
                       {(portfolio?.daily_pct ?? 0) > 0 ? "+" : ""}{formatPct(portfolio?.daily_pct, 2)}
                     </span>
                     <span className="text-muted-foreground">当日涨跌</span>
                   </div>
                 </CardContent>
               </Card>

               <Card className="border-border/60 bg-card/80 shadow-sm transition-all duration-300 hover:shadow-[0_10px_28px_rgba(0,0,0,0.08)] hover:border-border">
                 <CardContent className="p-5 flex flex-col gap-3">
                   <div className="flex items-center justify-between">
                     <div className="text-[11px] font-medium text-muted-foreground">持有收益</div>
                     <div className="h-7 w-7 rounded-md bg-muted/40 border border-border/50 flex items-center justify-center text-muted-foreground">
                       <Wallet className="h-3.5 w-3.5" />
                     </div>
                   </div>
                   <div className={cn(
                     "text-3xl font-semibold tracking-tight font-mono",
                     (portfolio?.total_holding_income ?? 0) >= 0 ? "text-destructive" : "text-foreground"
                   )}>
                     {(portfolio?.total_holding_income ?? 0) > 0 ? "+" : ""}{formatNumber(portfolio?.total_holding_income)}
                   </div>
                   <div className="flex gap-1.5">
                     {portfolio?.official_updated && (
                       <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-border/60 text-muted-foreground bg-muted/30">
                         已更新
                       </Badge>
                     )}
                   </div>
                 </CardContent>
               </Card>

               <Card className="border-border/60 bg-muted/20 shadow-sm transition-all duration-300 hover:shadow-[0_10px_28px_rgba(0,0,0,0.08)] hover:border-border">
                 <CardContent className="p-5 flex flex-col justify-between h-full gap-3">
                    <div className="flex flex-col gap-2">
                       <div className="text-[11px] font-medium text-muted-foreground">数据来源</div>
                       <div className="font-medium text-sm text-foreground">{resolveSourceLabel(portfolio?.used_source, portfolio?.holiday_mode)}</div>
                    </div>
                    {portfolio?.transition_progress !== undefined && portfolio?.transition_progress !== null && portfolio.transition_progress < 1 && (
                      <div className="w-full bg-muted/60 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div className="bg-foreground/70 h-full rounded-full transition-all duration-500" style={{ width: `${portfolio.transition_progress * 100}%` }} />
                      </div>
                    )}
                 </CardContent>
               </Card>
            </div>

            {/* Fund Detail Section */}
            <div className="space-y-6">
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-1 bg-primary rounded-full" />
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">{selectedFund ? selectedFund.name : "请选择基金"}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      {selectedFund && <span className="font-mono text-xs text-muted-foreground bg-muted/50 px-1.5 rounded">{selectedFund.code}</span>}
                      <span className="text-xs text-muted-foreground">{resolveSourceLabel(detail?.estimate_source, detail?.holiday_mode)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => selectedCode && loadDetail(selectedCode)} className="h-9 gap-2 shadow-sm">
                    <RefreshCw className="h-3.5 w-3.5" /> 刷新
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeleteFund} className="h-9 gap-2 text-destructive hover:text-destructive hover:bg-destructive/5 shadow-sm">
                    <Trash2 className="h-3.5 w-3.5" /> 删除
                  </Button>
                </div>
              </div>

              {/* Detail Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: "估算收益", value: formatNumber(detail?.estimate_income), positive: (detail?.estimate_income ?? 0) >= 0, mono: true },
                  { label: "持有收益", value: formatNumber(detail?.total_income), positive: (detail?.total_income ?? 0) >= 0, mono: true },
                  { label: "当日涨跌", value: formatPct(detail?.estimate_pct), positive: (detail?.estimate_pct ?? 0) >= 0, mono: true },
                  { label: "官方估值", value: formatPct(detail?.fund_gz_pct), positive: null, mono: true },
                  { label: "官方净值", value: formatNumber(detail?.fund_gz_nav), positive: null, mono: true },
                  { label: "净值日期", value: detail?.real_nav_date ?? "—", positive: null, mono: true },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl bg-card border border-border/60 shadow-sm flex flex-col justify-center transition-all hover:border-primary/30">
                    <div className="text-xs text-muted-foreground mb-1.5">{item.label}</div>
                    <div
                      className={cn(
                        "text-lg font-bold tracking-tight",
                        item.mono && "font-mono",
                        item.positive === true ? "text-destructive" : item.positive === false ? "text-primary" : "text-foreground"
                      )}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart & Holdings Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart */}
                <Card className="lg:col-span-2 border-border/60 shadow-sm overflow-hidden">
                  <CardHeader className="pb-2 border-b border-border/40 bg-muted/10 flex flex-row items-center justify-between h-[52px]">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" /> 
                      净值走势
                    </CardTitle>
                    <div className="flex bg-background/50 p-1 rounded-md border border-border/40">
                      {(["intraday", "1m", "3m", "1y"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setChartPeriod(p)}
                          className={cn(
                            "px-3 py-0.5 text-[10px] font-medium rounded-sm transition-all",
                            chartPeriod === p
                              ? "bg-white shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {{ intraday: "分时", "1m": "近1月", "3m": "近3月", "1y": "近1年" }[p]}
                        </button>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 relative">
                     {chartPeriod === "intraday" && !navItems.length ? (
                  <div className="h-[380px] flex flex-col items-center justify-center text-muted-foreground bg-muted/5 gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center animate-pulse">
                      <Activity className="h-5 w-5 opacity-30" />
                    </div>
                    <div className="text-sm font-medium">暂未开盘</div>
                    <div className="text-xs opacity-50 font-mono">Market Not Open</div>
                  </div>
                     ) : chartOption ? (
                       <FundChart option={chartOption} className="h-[380px] w-full" />
                     ) : (
                       <div className="h-[380px] flex items-center justify-center text-muted-foreground bg-muted/5">
                         暂无净值数据
                       </div>
                     )}
                   </CardContent>
                </Card>

                {/* Holdings Info */}
                <Card className="border-border/60 shadow-sm flex flex-col">
                  <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between bg-muted/10 h-[52px]">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-medium">持仓概况</CardTitle>
                      {selectedFund && (
                         <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal bg-background/50 text-muted-foreground border-border/50">
                            {selectedFund.mode === "amount" ? "金额持有" : "份额持有"}
                         </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => {
                      if (selectedFund) {
                         // Reset and Open
                         setTransAmount("");
                         setTransShares("");
                         setShowTransactionSheet(true);
                      }
                    }}>
                       <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => selectedFund && setShowHoldingSheet(true)}>
                       <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="flex-1 p-5 flex flex-col justify-center">
                    {selectedFund ? (
                      <div className="grid grid-cols-2 gap-4">
                        {/* Cell 1: Holding Asset */}
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex flex-col gap-1">
                           <span className="text-[10px] text-muted-foreground">
                             {selectedFund.mode === "amount" ? "持有金额" : "持有份额"}
                           </span>
                           <span className="text-lg font-mono font-bold tracking-tight">
                             {formatNumber(selectedFund.mode === "amount" ? selectedFund.amount : selectedFund.shares, selectedFund.mode === "amount" ? 2 : 2)}
                           </span>
                        </div>
                        
                        {/* Cell 2: Cost */}
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex flex-col gap-1">
                           <span className="text-[10px] text-muted-foreground">持仓成本</span>
                           <span className="text-lg font-mono font-bold tracking-tight text-muted-foreground/80">
                             {formatNumber(selectedFund.cost, 4)}
                           </span>
                        </div>

                        {/* Cell 3: Total Return */}
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex flex-col gap-1">
                           <span className="text-[10px] text-muted-foreground">累计收益</span>
                           <span className={cn(
                             "text-lg font-mono font-bold tracking-tight",
                             (detail?.total_income ?? 0) >= 0 ? "text-destructive" : "text-primary"
                           )}>
                             {(detail?.total_income ?? 0) > 0 ? "+" : ""}{formatNumber(detail?.total_income)}
                           </span>
                        </div>

                        {/* Cell 4: Ratio */}
                        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex flex-col gap-1">
                           <span className="text-[10px] text-muted-foreground">持仓占比</span>
                           <span className="text-lg font-mono font-bold tracking-tight">
                             {(() => {
                               const currentVal = selectedFund.mode === "amount" 
                                 ? selectedFund.amount + (detail?.total_income || 0)
                                 : selectedFund.shares * (detail?.fund_gz_nav || (navItems.length ? navItems[navItems.length-1].nav : 0) || 0);
                               const ratio = portfolio?.total_amount ? (currentVal / portfolio.total_amount * 100) : 0;
                               return formatPct(ratio);
                             })()}
                           </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-10 text-sm">请选择基金查看详情</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Stock Components Table */}
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-0 border-b border-border/40 bg-muted/10 pt-4 px-6">
                   <div className="flex items-center gap-2 mb-4">
                     <div className="h-4 w-1 bg-secondary-foreground/50 rounded-full" />
                     <h3 className="font-semibold text-sm">重仓股票明细</h3>
                   </div>
                </CardHeader>
                <CardContent className="p-0">
                  {detail && detail.components.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-border/40 bg-muted/5">
                          <TableHead className="pl-6 h-10 text-xs">股票代码</TableHead>
                          <TableHead className="h-10 text-xs">名称</TableHead>
                          <TableHead className="h-10 text-xs">权重</TableHead>
                          <TableHead className="h-10 text-xs">价格</TableHead>
                          <TableHead className="text-right pr-6 h-10 text-xs">涨跌幅</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.components.map((item) => (
                          <TableRow key={item.stock_code} className="border-border/40 hover:bg-muted/20">
                            <TableCell className="pl-6 font-mono text-xs text-muted-foreground">{item.stock_code}</TableCell>
                            <TableCell className="font-medium text-sm">{item.stock_name}</TableCell>
                            <TableCell className="font-mono text-sm">{formatPct(item.weight)}</TableCell>
                            <TableCell className="font-mono text-sm">{formatNumber(item.price)}</TableCell>
                            <TableCell
                              className={cn(
                                "text-right pr-6 font-mono font-bold text-sm",
                                item.change_pct >= 0 ? "text-destructive" : "text-primary"
                              )}
                            >
                              {(item.change_pct > 0 ? "+" : "") + formatPct(item.change_pct)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground text-sm">暂无持仓数据</div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="h-6" /> {/* Bottom spacer */}
          </main>

          {/* Right Sidebar: News Timeline */}
          <aside className="flex flex-col gap-6 min-h-0">
             <div className="bg-card border border-border/60 rounded-xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] flex flex-col h-full overflow-hidden">
                <div className="px-5 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <Calendar className="h-4 w-4 text-muted-foreground" />
                     <span className="text-sm font-semibold">市场资讯</span>
                   </div>
                   {newsLoading && <span className="text-[10px] animate-pulse text-muted-foreground">更新中...</span>}
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                   <div className="relative pl-2 border-l border-border/60 space-y-8">
                      {newsItems.map((item, idx) => {
                         const key = item.link || item.title;
                         const isActive = key === selectedNewsKey;
                         const analysis = key ? analysisCache[key] : null;
                         const rawScore = analysis?.importance_score;
                         const normalizedScore = typeof rawScore === "number" ? rawScore : rawScore ? Number(rawScore) : null;
                         
                         return (
                           <div key={idx} className="relative group pl-6">
                              {/* Timeline Dot */}
                              <div className={cn(
                                "absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 transition-colors duration-300 z-10",
                                isActive ? "bg-background border-primary scale-125" : "bg-border border-background group-hover:border-primary/50"
                              )} />
                              
                              <button
                                className={cn(
                                  "w-full text-left transition-all duration-200 rounded-lg p-3 -mt-2 -ml-3",
                                  isActive ? "bg-muted/50" : "hover:bg-muted/30"
                                )}
                                onClick={() => key && setSelectedNewsKey(key)}
                              >
                                <div className="text-[10px] font-mono text-muted-foreground mb-1">
                                  {formatDateTime(item.published_at)}
                                </div>
                                <h4 className={cn("text-sm font-medium leading-snug mb-2", isActive ? "text-foreground" : "text-foreground/90")}>
                                  {item.title}
                                </h4>
                                
                                <div className="flex flex-wrap gap-1.5">
                                   {analysis && (
                                     <>
                                       <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-background border border-border/60 text-muted-foreground">
                                          {analysis.sentiment}
                                       </Badge>
                                       {normalizedScore !== null && !Number.isNaN(normalizedScore) && (
                                         <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5 font-normal border font-mono", 
                                            normalizedScore >= 9 ? "bg-destructive/10 text-destructive border-destructive/20" :
                                            normalizedScore >= 7 ? "bg-emerald-900/10 text-emerald-900 border-emerald-900/20" :
                                            "bg-muted/30 text-muted-foreground border-border/60"
                                         )}>
                                            评分 {normalizedScore.toFixed(1)}
                                         </Badge>
                                       )}
                                       {analysis.impacted_assets.slice(0, 1).map(asset => (
                                          <Badge key={asset} variant="secondary" className="text-[10px] h-5 px-1.5 font-normal bg-background border border-border/60 text-muted-foreground">
                                             {asset}
                                          </Badge>
                                       ))}
                                     </>
                                   )}
                                </div>

                                {isActive && (
                                   <div className="mt-3 text-xs text-muted-foreground/90 bg-background/50 p-3 rounded border border-border/40 animate-in fade-in slide-in-from-top-1 duration-200">
                                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-border/40">
                                         <span className="font-semibold text-foreground">AI 摘要</span>
                                         {normalizedScore !== null && !Number.isNaN(normalizedScore) && (
                                             <span className="font-mono text-[10px] text-muted-foreground">
                                                评分 {normalizedScore.toFixed(1)}/10
                                             </span>
                                         )}
                                      </div>
                                      {analysis?.summary || item.summary || "暂无详细分析"}
                                   </div>
                                )}
                              </button>
                           </div>
                         );
                      })}
                      {!newsItems.length && (
                        <div className="py-10 text-center text-xs text-muted-foreground">暂无资讯</div>
                      )}
                   </div>
                </div>
             </div>
          </aside>
        </div>
      </div>

      {status && (
        <div className="fixed bottom-6 right-6 bg-foreground text-background px-4 py-3 rounded-lg shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 flex items-center gap-2">
           <div className="h-2 w-2 rounded-full bg-primary" />
           <span className="text-sm font-medium">{status}</span>
        </div>
      )}

      {showTransactionSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/20 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowTransactionSheet(false)}>
          <Card className="w-full max-w-md bg-card border-border shadow-[0_8px_40px_rgba(0,0,0,0.12)] animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle>记录交易</CardTitle>
              <CardDescription className="font-mono text-xs mt-1 flex flex-col gap-1">
                <span>{selectedFund ? `${selectedFund.name} · ${selectedFund.code}` : "请选择基金"}</span>
                {selectedFund && (
                  <span className={cn("text-[10px]", isAfter3PM ? "text-primary" : "text-muted-foreground")}>
                     当前时间 {new Date().getHours()}:{new Date().getMinutes().toString().padStart(2, '0')} · {isAfter3PM ? "今日休市 (交易归入下一交易日)" : "交易进行中 (预计今日确认)"}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-2 gap-4 p-1 bg-muted/40 rounded-lg">
                <label className={cn("flex items-center justify-center gap-2 cursor-pointer py-2 rounded-md transition-all", transType === "buy" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}>
                  <input type="radio" className="hidden" checked={transType === "buy"} onChange={() => setTransType("buy")} />
                  <span className="text-sm font-medium text-destructive">加仓 (买入)</span>
                </label>
                <label className={cn("flex items-center justify-center gap-2 cursor-pointer py-2 rounded-md transition-all", transType === "sell" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}>
                  <input type="radio" className="hidden" checked={transType === "sell"} onChange={() => setTransType("sell")} />
                  <span className="text-sm font-medium text-primary">减仓 (卖出)</span>
                </label>
              </div>

              <div className="space-y-4">
                {selectedFund?.mode === "amount" ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">交易金额</label>
                    <Input className="font-mono" value={transAmount} onChange={(e) => setTransAmount(e.target.value)} placeholder="请输入交易金额" />
                  </div>
                ) : (
                  <>
                    {transType === "buy" ? (
                      // Buy Mode: Input Amount -> Auto Shares
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">买入金额 (估算份额: {transShares || "0.00"})</label>
                        <Input className="font-mono" value={transAmount} onChange={(e) => setTransAmount(e.target.value)} placeholder="请输入买入金额" autoFocus />
                      </div>
                    ) : (
                      // Sell Mode: Input Shares
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-medium text-muted-foreground">卖出份额</label>
                          <div className="text-[10px] text-muted-foreground flex gap-1">
                            <span>持仓:</span>
                            <span className="font-mono text-foreground">{selectedFund?.shares}</span>
                            <span 
                              className="text-primary cursor-pointer hover:underline ml-1"
                              onClick={() => setTransShares(String(selectedFund?.shares))}
                            >
                              全部
                            </span>
                          </div>
                        </div>
                        <Input 
                          className={cn("font-mono", 
                            parseFloat(transShares) > (selectedFund?.shares || 0) && "border-destructive focus-visible:ring-destructive"
                          )} 
                          value={transShares} 
                          onChange={(e) => setTransShares(e.target.value)} 
                          placeholder="请输入卖出份额" 
                          autoFocus 
                        />
                        {parseFloat(transShares) > (selectedFund?.shares || 0) && (
                          <p className="text-[10px] text-destructive">输入份额超过当前持仓</p>
                        )}
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                         <label className="text-xs font-medium text-muted-foreground">成交净值 (自动获取)</label>
                         <span className="text-[10px] text-muted-foreground opacity-70">
                           {detail?.fund_gz_nav ? "实时估值" : "历史净值"}
                         </span>
                      </div>
                      <Input className="font-mono bg-muted/30" value={transPrice} onChange={(e) => setTransPrice(e.target.value)} placeholder="净值" />
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {isAfter3PM ? "已按今日收盘估值填充，实际以明日官方净值为准" : "已按实时估值填充，实际以今晚官方净值为准"}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowTransactionSheet(false)}>取消</Button>
                <Button 
                  onClick={handleTransaction}
                  disabled={transType === "sell" && selectedFund?.mode === "shares" && parseFloat(transShares) > (selectedFund?.shares || 0)}
                >
                  确认提交
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showHoldingSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/20 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowHoldingSheet(false)}>
          <Card className="w-full max-w-md bg-card border-border shadow-[0_8px_40px_rgba(0,0,0,0.12)] animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle>持仓更新</CardTitle>
              <CardDescription className="font-mono text-xs mt-1">{selectedFund ? `${selectedFund.name} · ${selectedFund.code}` : "请选择基金"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-2 gap-4 p-1 bg-muted/40 rounded-lg">
                <label className={cn("flex items-center justify-center gap-2 cursor-pointer py-2 rounded-md transition-all", editMode === "amount" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}>
                  <input type="radio" className="hidden" checked={editMode === "amount"} onChange={() => setEditMode("amount")} />
                  <span className="text-sm font-medium">按金额</span>
                </label>
                <label className={cn("flex items-center justify-center gap-2 cursor-pointer py-2 rounded-md transition-all", editMode === "shares" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}>
                  <input type="radio" className="hidden" checked={editMode === "shares"} onChange={() => setEditMode("shares")} />
                  <span className="text-sm font-medium">按份额</span>
                </label>
              </div>

              <div className="space-y-4">
                {editMode === "amount" ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">持有金额</label>
                    <Input className="font-mono" value={inputAmount} onChange={(e) => setInputAmount(e.target.value)} placeholder="请输入金额" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">持有份额</label>
                      <Input className="font-mono" value={inputShares} onChange={(e) => setInputShares(e.target.value)} placeholder="请输入份额" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">持仓成本</label>
                      <Input className="font-mono" value={inputCost} onChange={(e) => setInputCost(e.target.value)} placeholder="请输入成本单价" />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowHoldingSheet(false)}>取消</Button>
                <Button onClick={handleUpdateHolding}>确认更新</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
