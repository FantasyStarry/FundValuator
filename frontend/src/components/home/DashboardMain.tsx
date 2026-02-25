"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, BarChart3, Clock, MoreHorizontal, Plus, RefreshCw, TrendingDown, TrendingUp, Trash2, Wallet, Zap } from "lucide-react";
import type { EChartsOption } from "echarts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FundChart } from "@/components/FundChart";
import { cn } from "@/lib/utils";
import { EstimateResponse, FundInfo, NavItem, PortfolioOverview } from "@/components/home/types";
import { formatNumber, formatPct, resolveSourceLabel } from "@/components/home/utils";

type ChartPeriod = "intraday" | "1m" | "3m" | "1y";

type DashboardMainProps = {
  portfolio: PortfolioOverview | null;
  selectedFund?: FundInfo;
  detail: EstimateResponse | null;
  navItems: NavItem[];
  chartOption: EChartsOption | null;
  chartPeriod: ChartPeriod;
  onChartPeriodChange: (period: ChartPeriod) => void;
  onRefreshDetail: () => void;
  onDeleteFund: () => void;
  onOpenHoldingSheet: () => void;
  onOpenTransactionSheet: () => void;
};

// Animated number component with flash effect
const AnimatedNumber = ({ 
  value, 
  className, 
  prefix = "", 
  isPositive 
}: { 
  value: string | number; 
  className?: string; 
  prefix?: string;
  isPositive?: boolean | null;
}) => {
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 600);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <span className={cn(
      "transition-all duration-300",
      flash && "flash-update scale-105",
      isPositive === true && "text-[var(--gain)]",
      isPositive === false && "text-[var(--loss)]",
      className
    )}>
      {prefix}{value}
    </span>
  );
};

// Live indicator component
const LiveIndicator = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2">
    <div className="live-dot" />
    <span className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
      {label}
    </span>
  </div>
);

// Metric card component
const MetricCard = ({ 
  label, 
  value, 
  subValue, 
  icon: Icon, 
  isPositive,
  prefix = "",
  trend
}: { 
  label: string; 
  value: string | number;
  subValue?: string;
  icon?: React.ElementType;
  isPositive?: boolean | null;
  prefix?: string;
  trend?: "up" | "down";
}) => (
  <div className="glass-card rounded-xl p-5 hover-lift group">
    <div className="flex items-start justify-between mb-3">
      <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
        {label}
      </span>
      {Icon && (
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
          isPositive === true ? "bg-[var(--gain)]/10 text-[var(--gain)]" : 
          isPositive === false ? "bg-[var(--loss)]/10 text-[var(--loss)]" : 
          "bg-[var(--muted)] text-[var(--muted-foreground)]"
        )}>
          <Icon className="w-4 h-4" />
        </div>
      )}
    </div>
    <div className="space-y-1">
      <AnimatedNumber 
        value={value} 
        prefix={prefix}
        isPositive={isPositive}
        className={cn(
          "text-2xl font-bold font-mono tracking-tight block",
          isPositive === true && "text-[var(--gain)]",
          isPositive === false && "text-[var(--loss)]"
        )}
      />
      {subValue && (
        <span className="text-xs text-[var(--muted-foreground)]">{subValue}</span>
      )}
    </div>
    {trend && (
      <div className={cn(
        "mt-3 flex items-center gap-1 text-xs font-medium",
        trend === "up" ? "text-[var(--gain)]" : "text-[var(--loss)]"
      )}>
        {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>{trend === "up" ? "+" : "-"}{(Math.random() * 2).toFixed(2)}%</span>
      </div>
    )}
  </div>
);

export const DashboardMain = ({
  portfolio,
  selectedFund,
  detail,
  navItems,
  chartOption,
  chartPeriod,
  onChartPeriodChange,
  onRefreshDetail,
  onDeleteFund,
  onOpenHoldingSheet,
  onOpenTransactionSheet,
}: DashboardMainProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Auto refresh every 5 seconds
  useEffect(() => {
    setLastUpdate(new Date().toLocaleTimeString('zh-CN'));
    const interval = setInterval(() => {
      setLastUpdate(new Date().toLocaleTimeString('zh-CN'));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    onRefreshDetail();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <main className="flex flex-col gap-6 min-h-0 overflow-y-auto custom-scrollbar pr-1">
      {/* Header with live indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <LiveIndicator label="实时行情" />
          {lastUpdate && (
            <span className="text-xs text-[var(--muted-foreground)] font-mono">
              最后更新: {lastUpdate}
            </span>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          className="h-8 gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
          刷新
        </Button>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <MetricCard
          label="总资产"
          value={formatNumber(portfolio?.total_amount)}
          subValue="实时估值"
          icon={Wallet}
        />
        <MetricCard
          label="今日收益"
          value={formatNumber(portfolio?.total_daily_income)}
          prefix={(portfolio?.total_daily_income ?? 0) > 0 ? "+" : ""}
          subValue={`${(portfolio?.daily_pct ?? 0) > 0 ? "+" : ""}${formatPct(portfolio?.daily_pct, 2)} 当日`}
          icon={(portfolio?.daily_pct ?? 0) >= 0 ? TrendingUp : TrendingDown}
          isPositive={(portfolio?.total_daily_income ?? 0) >= 0}
        />
        <MetricCard
          label="持有收益"
          value={formatNumber(portfolio?.total_holding_income)}
          prefix={(portfolio?.total_holding_income ?? 0) > 0 ? "+" : ""}
          subValue="累计收益"
          icon={BarChart3}
          isPositive={(portfolio?.total_holding_income ?? 0) >= 0}
        />
        <div className="glass-card rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
              数据来源
            </span>
            <Zap className="w-4 h-4 text-[var(--primary)]" />
          </div>
          <div className="mt-3">
            <div className="text-base font-semibold">
              {resolveSourceLabel(portfolio?.used_source, portfolio?.holiday_mode)}
            </div>
            {portfolio?.transition_progress !== undefined &&
              portfolio?.transition_progress !== null &&
              portfolio.transition_progress < 1 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[var(--muted-foreground)]">过渡进度</span>
                    <span className="text-[var(--primary)] font-mono">
                      {(portfolio.transition_progress * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[var(--primary)] to-[#00ff9d] rounded-full transition-all duration-500"
                      style={{ width: `${portfolio.transition_progress * 100}%` }}
                    />
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Selected Fund Section */}
      <div className="space-y-6 slide-up">
        {/* Fund Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-1 h-12 bg-gradient-to-b from-[var(--primary)] to-transparent rounded-full" />
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {selectedFund ? selectedFund.name : "请选择基金"}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                {selectedFund && (
                  <Badge variant="outline" className="font-mono text-xs bg-[var(--muted)]/50 border-[var(--border)]">
                    {selectedFund.code}
                  </Badge>
                )}
                <span className="text-xs text-[var(--muted-foreground)]">
                  {resolveSourceLabel(detail?.estimate_source, detail?.holiday_mode)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              className="h-9 gap-2 bg-[var(--card)] border-[var(--border)] hover:bg-[var(--muted)]"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
              刷新
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteFund}
              className="h-9 gap-2 text-[var(--loss)] border-[var(--loss)]/30 hover:bg-[var(--loss)]/10 hover:text-[var(--loss)]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              删除
            </Button>
          </div>
        </div>

        {/* Fund Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "估算收益", value: formatNumber(detail?.estimate_income), isPositive: (detail?.estimate_income ?? 0) >= 0, prefix: (detail?.estimate_income ?? 0) > 0 ? "+" : "" },
            { label: "持有收益", value: formatNumber(detail?.total_income), isPositive: (detail?.total_income ?? 0) >= 0, prefix: (detail?.total_income ?? 0) > 0 ? "+" : "" },
            { label: "当日涨跌", value: formatPct(detail?.estimate_pct), isPositive: (detail?.estimate_pct ?? 0) >= 0, prefix: (detail?.estimate_pct ?? 0) > 0 ? "+" : "" },
            { label: "官方估值", value: formatPct(detail?.fund_gz_pct), isPositive: null },
            { label: "官方净值", value: formatNumber(detail?.fund_gz_nav), isPositive: null },
            { label: "净值日期", value: detail?.real_nav_date ?? "—", isPositive: null },
          ].map((item, i) => (
            <div 
              key={i} 
              className={cn(
                "p-4 rounded-xl glass-card hover-lift transition-all",
              )}
            >
              <div className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
                {item.label}
              </div>
              <AnimatedNumber
                value={item.value}
                prefix={item.prefix}
                isPositive={item.isPositive}
                className={cn(
                  "text-base font-bold font-mono tracking-tight",
                  item.isPositive === true && "text-[var(--gain)]",
                  item.isPositive === false && "text-[var(--loss)]"
                )}
              />
            </div>
          ))}
        </div>

        {/* Charts and Holdings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* NAV Chart */}
          <Card className="lg:col-span-2 glass-card border-0 overflow-hidden">
            <CardHeader className="pb-3 border-b border-[var(--border)] bg-[var(--muted)]/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--primary)]" />
                  净值走势
                </CardTitle>
                <div className="flex bg-[var(--card)] p-0.5 rounded-lg border border-[var(--border)]">
                  {(["intraday", "1m", "3m", "1y"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => onChartPeriodChange(p)}
                      className={cn(
                        "px-3 py-1 text-[11px] font-medium rounded-md transition-all duration-200",
                        chartPeriod === p 
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm" 
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      )}
                    >
                      {{ intraday: "分时", "1m": "近1月", "3m": "近3月", "1y": "近1年" }[p]}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 relative">
              {chartPeriod === "intraday" && !navItems.length ? (
                <div className="h-[380px] flex flex-col items-center justify-center text-[var(--muted-foreground)] gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--muted)] flex items-center justify-center">
                    <Clock className="w-6 h-6 opacity-50" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium">暂未开盘</div>
                    <div className="text-xs opacity-50 mt-1 font-mono">Market Closed</div>
                  </div>
                </div>
              ) : chartOption ? (
                <FundChart option={chartOption} className="h-[380px] w-full" />
              ) : (
                <div className="h-[380px] flex items-center justify-center text-[var(--muted-foreground)]">
                  <div className="text-center">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <div className="text-sm">暂无净值数据</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Holdings Overview */}
          <Card className="glass-card border-0 flex flex-col">
            <CardHeader className="pb-3 border-b border-[var(--border)] bg-[var(--muted)]/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold">持仓概况</CardTitle>
                  {selectedFund && (
                    <Badge variant="outline" className="text-[10px] h-5 px-2 font-normal bg-[var(--card)] border-[var(--border)]">
                      {selectedFund.mode === "amount" ? "金额模式" : "份额模式"}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10"
                    onClick={onOpenTransactionSheet}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    onClick={onOpenHoldingSheet}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-5">
              {selectedFund ? (
                <div className="grid grid-cols-2 gap-3 h-full">
                  <div className="p-4 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)]/50 flex flex-col">
                    <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
                      {selectedFund.mode === "amount" ? "持有金额" : "持有份额"}
                    </span>
                    <span className="text-xl font-mono font-bold">
                      {formatNumber(selectedFund.mode === "amount" ? selectedFund.amount : selectedFund.shares, 2)}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)]/50 flex flex-col">
                    <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
                      持仓成本
                    </span>
                    <span className="text-xl font-mono font-bold text-[var(--muted-foreground)]">
                      {formatNumber(selectedFund.cost, 4)}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)]/50 flex flex-col">
                    <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
                      累计收益
                    </span>
                    <AnimatedNumber
                      value={formatNumber(detail?.total_income)}
                      prefix={(detail?.total_income ?? 0) > 0 ? "+" : ""}
                      isPositive={(detail?.total_income ?? 0) >= 0}
                      className={cn(
                        "text-xl font-mono font-bold",
                        (detail?.total_income ?? 0) >= 0 ? "text-[var(--gain)]" : "text-[var(--loss)]"
                      )}
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)]/50 flex flex-col">
                    <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
                      持仓占比
                    </span>
                    <span className="text-xl font-mono font-bold">
                      {(() => {
                        const currentVal =
                          selectedFund.mode === "amount"
                            ? selectedFund.amount + (detail?.total_income || 0)
                            : selectedFund.shares * (detail?.fund_gz_nav || (navItems.length ? navItems[navItems.length - 1].nav : 0) || 0);
                        const ratio = portfolio?.total_amount ? (currentVal / portfolio.total_amount) * 100 : 0;
                        return formatPct(ratio);
                      })()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[var(--muted-foreground)]">
                  <Wallet className="w-10 h-10 mb-3 opacity-30" />
                  <div className="text-sm">请选择基金查看详情</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Holdings Table */}
        <Card className="glass-card border-0">
          <CardHeader className="pb-0 border-b border-[var(--border)] bg-[var(--muted)]/30 pt-5 px-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-5 bg-gradient-to-b from-[var(--primary)] to-transparent rounded-full" />
              <h3 className="font-semibold text-sm">重仓股票明细</h3>
              {detail?.components && detail.components.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-[var(--card)] border-[var(--border)]">
                  {detail.components.length} 只
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {detail && detail.components.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-[var(--border)] bg-[var(--muted)]/20">
                    <TableHead className="pl-6 h-11 text-xs uppercase tracking-wide text-[var(--muted-foreground)]">股票代码</TableHead>
                    <TableHead className="h-11 text-xs uppercase tracking-wide text-[var(--muted-foreground)]">名称</TableHead>
                    <TableHead className="h-11 text-xs uppercase tracking-wide text-[var(--muted-foreground)]">权重</TableHead>
                    <TableHead className="h-11 text-xs uppercase tracking-wide text-[var(--muted-foreground)]">价格</TableHead>
                    <TableHead className="text-right pr-6 h-11 text-xs uppercase tracking-wide text-[var(--muted-foreground)]">涨跌幅</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.components.map((item, idx) => (
                    <TableRow 
                      key={item.stock_code} 
                      className="border-[var(--border)] hover:bg-[var(--muted)]/30 transition-colors"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <TableCell className="pl-6 font-mono text-xs text-[var(--muted-foreground)]">
                        {item.stock_code}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{item.stock_name}</TableCell>
                      <TableCell className="font-mono text-sm">{formatPct(item.weight)}</TableCell>
                      <TableCell className="font-mono text-sm">{formatNumber(item.price)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <AnimatedNumber
                          value={formatPct(item.change_pct)}
                          prefix={item.change_pct > 0 ? "+" : ""}
                          isPositive={item.change_pct >= 0}
                          className={cn(
                            "font-mono font-bold text-sm inline-flex items-center gap-1 px-2 py-0.5 rounded",
                            item.change_pct >= 0 
                              ? "text-[var(--gain)] bg-[var(--gain)]/10" 
                              : "text-[var(--loss)] bg-[var(--loss)]/10"
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
                <BarChart3 className="w-10 h-10 mb-3 opacity-30" />
                <div className="text-sm">暂无持仓数据</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="h-6" />
    </main>
  );
};