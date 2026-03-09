"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TooltipComponentFormatterCallbackParams } from "echarts";
import { AddFundSheet } from "@/components/home/AddFundSheet";
import { DashboardMain } from "@/components/home/DashboardMain";
import { FundListSidebar } from "@/components/home/FundListSidebar";
import { HeaderBar } from "@/components/home/HeaderBar";
import { HoldingSheet } from "@/components/home/HoldingSheet";
import { NewsTimeline } from "@/components/home/NewsTimeline";
import { QuickTradeSheet } from "@/components/home/QuickTradeSheet";
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
  TransactionInfo,
} from "@/components/home/types";
import { useWebSocket } from "@/lib/useWebSocket";

interface WSEstimateUpdate {
  type: "estimate_update";
  code: string;
  name: string;
  estimate_pct: number | null;
  estimate_nav: number | null;
  update_time: string | null;
}

interface WSPortfolioUpdate {
  type: "portfolio_update";
  total_amount: number;
  total_daily_income: number;
  total_holding_income: number;
  daily_pct: number;
  update_time: string | null;
  used_source: string;
  used_date: string | null;
}

interface WSNewsUpdate {
  type: "news_update";
  title: string;
  link: string | null;
  published_at: string | null;
  summary: string | null;
  source: string | null;
}

const API_BASE = "/api";
const NEWS_REFRESH_INTERVAL_MS = 15 * 1000;
const NEWS_MAX_ITEMS = 200;
const NEWS_CLEAN_INTERVAL_MS = 10 * 60 * 1000;

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

const updateFundAmount = (
  code: string,
  payload: { amount: number; mode: "amount" | "shares"; shares: number; cost: number }
) =>
  fetchJson<FundInfo>(`/funds/${code}/amount`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

const addTransaction = (payload: {
  fund_code: string;
  type: "buy" | "sell";
  amount: number;
  shares: number;
  price: number;
  trans_date: string;
  is_after_3pm: boolean;
  mode: string;
}) =>
  fetchJson<TransactionInfo>("/transactions", {
    method: "POST",
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

export default function Home() {
  const [funds, setFunds] = useState<FundInfo[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
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
  const [selectedNewsKey, setSelectedNewsKey] = useState("");
  const [, setAnalysisCache] = useState<Record<string, NewsAnalysisResponse>>({});
  const [, setNewsLoading] = useState(false);
  const [addingFund, setAddingFund] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const [showAddFundSheet, setShowAddFundSheet] = useState(false);
  const [selectedMarketFund, setSelectedMarketFund] = useState<MarketFund | null>(null);
  const [showQuickTradeSheet, setShowQuickTradeSheet] = useState(false);
  const [quickTradeCode, setQuickTradeCode] = useState("");
  const [showTransactionSheet, setShowTransactionSheet] = useState(false);
  const [transType, setTransType] = useState<"buy" | "sell">("buy");
  const [transAmount, setTransAmount] = useState("");
  const [transShares, setTransShares] = useState("");
  const [transPrice, setTransPrice] = useState("");
  const [transDate, setTransDate] = useState("");
  const [isAfter3PM, setIsAfter3PM] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<"intraday" | "1m" | "3m" | "1y">("1m");
  const newsSource = "rss";

  const selectedFund = useMemo(() => funds.find((item) => item.code === selectedCode), [funds, selectedCode]);

  const fundsWithComputed = useMemo(
    () =>
      funds.map((fund) => ({
        ...fund,
        computedAmount: fund.mode === "amount" ? fund.amount : fund.shares * (fund.nav ?? 0),
      })),
    [funds]
  );

  useWebSocket<WSEstimateUpdate>(selectedCode ? `/ws/estimate/${selectedCode}` : "", {
    onMessage: (data) => {
      if (data.type !== "estimate_update") return;
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              estimate_pct: data.estimate_pct ?? prev.estimate_pct,
              fund_gz_pct: data.estimate_pct ?? prev.fund_gz_pct,
              fund_gz_nav: data.estimate_nav ?? prev.fund_gz_nav,
              fund_gz_time: data.update_time ?? prev.fund_gz_time,
            }
          : null
      );
    },
  });

  useWebSocket<WSPortfolioUpdate>("/ws/portfolio", {
    onMessage: (data) => {
      if (data.type !== "portfolio_update") return;
      const validSources = ["realtime", "official", "transition", "holdings"] as const;
      const source = validSources.includes(data.used_source as (typeof validSources)[number])
        ? (data.used_source as (typeof validSources)[number])
        : "holdings";
      setPortfolio({
        total_amount: data.total_amount,
        total_daily_income: data.total_daily_income,
        total_holding_income: data.total_holding_income,
        daily_pct: data.daily_pct,
        update_time: data.update_time,
        used_source: source,
        used_date: data.used_date,
        switch_at: null,
        transition_progress: null,
        official_updated: false,
        holiday_mode: false,
      });
    },
  });

  useWebSocket<WSNewsUpdate>("/ws/news", {
    onMessage: (data) => {
      if (data.type !== "news_update") return;
      const newItem: NewsItem = {
        title: data.title,
        link: data.link ?? undefined,
        published_at: data.published_at ?? undefined,
        summary: data.summary ?? undefined,
        source: data.source ?? undefined,
      };
      setNewsItems((prev) => {
        const exists = prev.some((item) => (item.link || item.title) === (newItem.link || newItem.title));
        if (exists) return prev;
        return [newItem, ...prev].slice(0, NEWS_MAX_ITEMS);
      });
    },
  });

  useEffect(() => {
    if (!showTransactionSheet) return;
    const now = new Date();
    setTransDate(now.toISOString().split("T")[0]);
    setIsAfter3PM(now.getHours() >= 15);

    const estimateNav = detail?.fund_gz_nav;
    const historyNav = navItems.length ? navItems[navItems.length - 1].nav : 0;
    const bestPrice = estimateNav || historyNav;
    if (bestPrice) setTransPrice(String(bestPrice));
  }, [showTransactionSheet, detail, navItems]);

  useEffect(() => {
    if (showTransactionSheet && transType === "buy" && selectedFund?.mode !== "amount") {
      const amount = parseFloat(transAmount);
      const price = parseFloat(transPrice);
      if (amount > 0 && price > 0) {
        setTransShares((amount / price).toFixed(2));
      }
    }
  }, [transAmount, transPrice, transType, showTransactionSheet, selectedFund]);

  const chartOption = useMemo(() => {
    if (!navItems.length) return null;
    if (chartPeriod === "intraday" && !navItems.length) return null;

    const chartData = [...navItems].reverse();

    return {
      backgroundColor: "transparent",
      grid: { left: 40, right: 20, top: 20, bottom: 20, containLabel: true },
      xAxis: {
        type: "category" as const,
        data: chartData.map((item) => item.date),
        axisLabel: { color: "#6e675d", fontFamily: "Consolas", fontSize: 10 },
        axisLine: { show: false },
        axisTick: { show: false },
        boundaryGap: false,
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { color: "#6e675d", fontFamily: "Consolas", fontSize: 10 },
        splitLine: { lineStyle: { color: "#c9beae", type: "dashed" as const } },
        scale: true,
      },
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: "rgba(23, 21, 18, 0.96)",
        borderColor: "#6e675d",
        textStyle: { color: "#f6f1e7", fontSize: 12 },
        padding: [8, 12],
        axisPointer: {
          type: "cross" as const,
          label: {
            backgroundColor: "#274438",
          },
        },
        formatter: (params: TooltipComponentFormatterCallbackParams) => {
          const item = Array.isArray(params) ? params[0] : params;
          if (!item) return "";
          const value = item.value;
          const valueStr = typeof value === "number" ? value.toFixed(4) : String(value ?? "0");
          return `<div class="font-mono"><div style="font-size:10px;margin-bottom:4px;opacity:.72">${String(
            item.name ?? ""
          )}</div><div style="font-weight:700;font-size:16px">${valueStr}</div></div>`;
        },
      },
      series: [
        {
          data: chartData.map((item) => item.nav),
          type: "line" as const,
          smooth: false,
          showSymbol: false,
          lineStyle: { color: "#274438", width: 2 },
          areaStyle: { color: "rgba(39, 68, 56, 0.08)" },
          markLine:
            selectedFund?.cost && selectedFund.cost > 0
              ? {
                  symbol: "none" as const,
                  data: [
                    {
                      yAxis: selectedFund.cost,
                      label: {
                        formatter: "持仓成本",
                        position: "start" as const,
                        color: "#6c2f2a",
                        fontSize: 10,
                      },
                      lineStyle: {
                        color: "#6c2f2a",
                        type: "dashed" as const,
                        width: 1,
                      },
                    },
                  ],
                }
              : undefined,
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
      if (!current && data.length) return data[0].code;
      if (current && !data.find((item) => item.code === current)) return data[0]?.code ?? "";
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
        chartPeriod !== "intraday" ? fetchNavHistory(code, limit) : fetchNavHistory(code, 0),
      ]);

      setDetail(detailRes);
      setNavItems(navRes.items ?? []);
      syncInputsFromFund(funds.find((item) => item.code === code));
    },
    [chartPeriod, funds, syncInputsFromFund]
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
        return first ? first.link || first.title : "";
      });
      setAnalysisCache(() => {
        const next: Record<string, NewsAnalysisResponse> = {};
        items.forEach((item) => {
          const key = item.link || item.title;
          if (key && item.analysis) next[key] = item.analysis;
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
        if (err instanceof Error) pushStatus(err.message);
      }
    };

    void run();
    const handle = setInterval(run, NEWS_REFRESH_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [loadNews, pushStatus]);

  useEffect(() => {
    const handle = setInterval(() => {
      setNewsItems((prev) => prev.slice(0, NEWS_MAX_ITEMS));
      setAnalysisCache((prev) => {
        const keys = new Set(newsItems.map((item) => item.link || item.title).filter(Boolean));
        const next: Record<string, NewsAnalysisResponse> = {};
        Object.keys(prev).forEach((key) => {
          if (keys.has(key)) next[key] = prev[key];
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

  const handleAddFund = async (
    code: string,
    holding: { mode: "amount" | "shares"; amount: number; shares: number; cost: number } | null,
    transaction?: {
      type: "buy" | "sell";
      amount: number;
      shares: number;
      price: number;
      trans_date: string;
      is_after_3pm: boolean;
    } | null
  ) => {
    setMarketQuery("");
    setMarketResults([]);
    setAddingFund(true);

    try {
      const newFund = await addFund(code);

      setFunds((prev) => {
        if (prev.some((fund) => fund.code === code)) return prev;
        return [...prev, newFund];
      });

      setSelectedCode(code);

      if (holding && holding.mode === "amount" && holding.amount > 0) {
        await updateFundAmount(code, { amount: holding.amount, mode: "amount", shares: 0, cost: 0 });
      } else if (holding && holding.mode === "shares" && holding.shares > 0) {
        await updateFundAmount(code, { amount: 0, mode: "shares", shares: holding.shares, cost: holding.cost });
      }

      if (transaction && transaction.amount > 0 && transaction.price > 0) {
        const mode = holding?.mode ?? "amount";
        await addTransaction({
          fund_code: code,
          type: transaction.type,
          amount: mode === "amount" ? transaction.amount : transaction.shares * transaction.price,
          shares: mode === "shares" ? transaction.shares : transaction.amount / transaction.price,
          price: transaction.price,
          trans_date: transaction.trans_date,
          is_after_3pm: transaction.is_after_3pm,
          mode,
        });
      }

      pushStatus(holding || transaction ? "基金已加入并完成初始化" : "基金已加入监控");

      await Promise.all([loadFunds(listQuery), loadPortfolio()]);
      if (code) await loadDetail(code);
    } catch (err) {
      pushStatus(err instanceof Error ? err.message : "基金加入失败");
    } finally {
      setAddingFund(false);
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
      pushStatus(err instanceof Error ? err.message : "基金移除失败");
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
      pushStatus("请输入有效份额和成本");
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
      pushStatus(err instanceof Error ? err.message : "持仓更新失败");
    }
  };

  const handleTransaction = async () => {
    if (!selectedFund) return;

    const tAmount = parseFloat(transAmount) || 0;
    const tShares = parseFloat(transShares) || 0;
    const tPrice = parseFloat(transPrice) || 0;
    const mode = selectedFund.mode;

    if (mode === "amount" && tAmount <= 0) {
      pushStatus("请输入有效金额");
      return;
    }
    if (mode === "shares" && (tShares <= 0 || tPrice <= 0)) {
      pushStatus("请输入有效份额和价格");
      return;
    }
    if (!transDate) {
      pushStatus("请选择交易日期");
      return;
    }

    try {
      await addTransaction({
        fund_code: selectedFund.code,
        type: transType,
        amount: mode === "amount" ? tAmount : tShares * tPrice,
        shares: mode === "shares" ? tShares : tPrice > 0 ? tAmount / tPrice : 0,
        price: tPrice,
        trans_date: transDate,
        is_after_3pm: isAfter3PM,
        mode,
      });

      await loadFunds(listQuery);
      await loadPortfolio();
      await loadDetail(selectedFund.code);
      setShowTransactionSheet(false);
      pushStatus("交易已记录");
      setTransAmount("");
      setTransShares("");
      setTransPrice("");
      setTransDate("");
    } catch (err) {
      pushStatus(err instanceof Error ? err.message : "交易记录失败");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <HeaderBar
        headerRef={headerRef}
        marketQuery={marketQuery}
        onMarketQueryChange={setMarketQuery}
        marketResults={marketResults}
        onAddFundClick={(fund) => {
          setSelectedMarketFund(fund);
          setShowAddFundSheet(true);
        }}
        updateTime={portfolio?.update_time}
        addingFund={addingFund}
      />

      <div className="flex-1 overflow-hidden">
        <div className="mx-auto grid h-[calc(100vh-84px)] w-full max-w-[1680px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[320px_minmax(0,1fr)_360px]">
          <FundListSidebar
            funds={fundsWithComputed}
            selectedCode={selectedCode}
            listQuery={listQuery}
            onListQueryChange={setListQuery}
            onSelectCode={setSelectedCode}
            onOpenHoldingSheet={() => selectedFund && setShowHoldingSheet(true)}
            onQuickTrade={(code) => {
              setQuickTradeCode(code);
              setShowQuickTradeSheet(true);
            }}
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

          <NewsTimeline newsItems={newsItems} selectedNewsKey={selectedNewsKey} onSelectNewsKey={setSelectedNewsKey} />
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
        transDate={transDate}
        onTransDateChange={setTransDate}
        isAfter3PM={isAfter3PM}
        onIsAfter3PMChange={setIsAfter3PM}
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

      <AddFundSheet
        open={showAddFundSheet}
        onClose={() => {
          setShowAddFundSheet(false);
          setSelectedMarketFund(null);
        }}
        selectedFund={selectedMarketFund ?? undefined}
        currentNav={detail?.fund_gz_nav}
        onAddFundWithHolding={handleAddFund}
      />

      <QuickTradeSheet
        open={showQuickTradeSheet}
        onClose={() => {
          setShowQuickTradeSheet(false);
          setQuickTradeCode("");
        }}
        selectedFund={funds.find((fund) => fund.code === quickTradeCode)}
        detail={quickTradeCode === selectedCode ? detail : null}
        onQuickTrade={async (fundCode, transaction) => {
          const fund = funds.find((item) => item.code === fundCode);
          if (!fund) return;

          try {
            await addTransaction({
              fund_code: fundCode,
              type: transaction.type,
              amount: transaction.amount,
              shares: transaction.shares,
              price: transaction.price,
              trans_date: transaction.trans_date,
              is_after_3pm: transaction.is_after_3pm,
              mode: transaction.mode,
            });

            await loadFunds(listQuery);
            await loadPortfolio();
            await loadDetail(fundCode);
            pushStatus("交易已记录");
          } catch (err) {
            pushStatus(err instanceof Error ? err.message : "交易记录失败");
          }
        }}
      />
    </div>
  );
}
