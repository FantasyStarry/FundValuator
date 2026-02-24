"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import { DashboardMain } from "@/components/home/DashboardMain";
import { FundListSidebar } from "@/components/home/FundListSidebar";
import { HeaderBar } from "@/components/home/HeaderBar";
import { HoldingSheet } from "@/components/home/HoldingSheet";
import { NewsTimeline } from "@/components/home/NewsTimeline";
import { StatusToast } from "@/components/home/StatusToast";
import { TransactionSheet } from "@/components/home/TransactionSheet";
import type {
  EstimateResponse,
  FundInfo,
  MarketFund,
  NavHistoryResponse,
  NavItem,
  NewsAnalysisResponse,
  NewsFeedResponse,
  NewsItem,
  PortfolioOverview,
} from "@/components/home/types";

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <HeaderBar
        headerRef={headerRef}
        marketQuery={marketQuery}
        onMarketQueryChange={setMarketQuery}
        marketResults={marketResults}
        onAddFund={handleAddFund}
        updateTime={portfolio?.update_time}
      />

      <div className="flex-1 overflow-hidden">
        <div className="mx-auto w-full max-w-[1600px] px-6 py-6 h-[calc(100vh-80px)] grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_340px] gap-8">
          <FundListSidebar
            funds={funds}
            selectedCode={selectedCode}
            listQuery={listQuery}
            onListQueryChange={setListQuery}
            onSelectCode={setSelectedCode}
            onOpenHoldingSheet={() => selectedFund && setShowHoldingSheet(true)}
          />

          <DashboardMain
            portfolio={portfolio}
            selectedFund={selectedFund}
            detail={detail}
            navItems={navItems}
            chartOption={chartOption}
            chartPeriod={chartPeriod}
            onChartPeriodChange={setChartPeriod}
            onRefreshDetail={() => selectedCode && loadDetail(selectedCode)}
            onDeleteFund={handleDeleteFund}
            onOpenHoldingSheet={() => selectedFund && setShowHoldingSheet(true)}
            onOpenTransactionSheet={() => {
              if (!selectedFund) return;
              setTransAmount("");
              setTransShares("");
              setShowTransactionSheet(true);
            }}
          />

          <NewsTimeline
            newsItems={newsItems}
            selectedNewsKey={selectedNewsKey}
            onSelectNewsKey={setSelectedNewsKey}
            analysisCache={analysisCache}
            newsLoading={newsLoading}
          />
        </div>
      </div>

      <StatusToast status={status} />

      <TransactionSheet
        open={showTransactionSheet}
        onClose={() => setShowTransactionSheet(false)}
        selectedFund={selectedFund}
        detail={detail}
        transType={transType}
        onTransTypeChange={setTransType}
        transAmount={transAmount}
        onTransAmountChange={setTransAmount}
        transShares={transShares}
        onTransSharesChange={setTransShares}
        transPrice={transPrice}
        onTransPriceChange={setTransPrice}
        isAfter3PM={isAfter3PM}
        onSubmit={handleTransaction}
      />

      <HoldingSheet
        open={showHoldingSheet}
        onClose={() => setShowHoldingSheet(false)}
        selectedFund={selectedFund}
        editMode={editMode}
        onEditModeChange={setEditMode}
        inputAmount={inputAmount}
        onInputAmountChange={setInputAmount}
        inputShares={inputShares}
        onInputSharesChange={setInputShares}
        inputCost={inputCost}
        onInputCostChange={setInputCost}
        onSubmit={handleUpdateHolding}
      />
    </div>
  );
}
