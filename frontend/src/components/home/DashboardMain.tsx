"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, BarChart3, Clock, Plus, RefreshCw, Trash2, Wallet } from "lucide-react";
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
      const timer = setTimeout(() => setFlash(false), 400);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <span className={cn(
      "transition-all duration-200",
      flash && "flash-update",
      className
    )}>
      {prefix}{value}
    </span>
  );
};

const LiveIndicator = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2">
    <div className="live-dot" />
    <span className="text-xs text-[var(--muted-foreground)]">
      {label}
    </span>
  </div>
);

const StatCard = ({ 
  label, 
  value, 
  subValue, 
  isPositive,
  prefix = ""
}: { 
  label: string; 
  value: string | number;
  subValue?: string;
  isPositive?: boolean | null;
  prefix?: string;
}) => (
  <div className="stat-card">
    <div className="text-xs text-[var(--muted-foreground)] mb-1">{label}</div>
    <AnimatedNumber 
      value={value} 
      prefix={prefix}
      isPositive={isPositive}
      className={cn(
        "text-lg font-semibold font-mono block",
        isPositive === true && "text-[var(--gain)]",
        isPositive === false && "text-[var(--loss)]"
      )}
    />
    {subValue && (
      <div className="text-xs text-[var(--muted-foreground)] mt-1">{subValue}</div>
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    onRefreshDetail();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <main className="flex flex-col gap-5 min-h-0 overflow-y-auto custom-scrollbar pr-1">
      <div className="flex items-center justify-between">
        <LiveIndicator label="实时" />
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          className="h-8 gap-1.5 text-[var(--muted-foreground)]"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
          刷新
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="总资产"
          value={formatNumber(portfolio?.total_amount)}
          subValue="实时估值"
        />
        <StatCard
          label="今日收益"
          value={formatNumber(portfolio?.total_daily_income)}
          prefix={(portfolio?.total_daily_income ?? 0) > 0 ? "+" : ""}
          subValue={`${(portfolio?.daily_pct ?? 0) > 0 ? "+" : ""}${formatPct(portfolio?.daily_pct, 2)}`}
          isPositive={(portfolio?.total_daily_income ?? 0) >= 0}
        />
        <StatCard
          label="持有收益"
          value={formatNumber(portfolio?.total_holding_income)}
          prefix={(portfolio?.total_holding_income ?? 0) > 0 ? "+" : ""}
          subValue="累计"
          isPositive={(portfolio?.total_holding_income ?? 0) >= 0}
        />
        <StatCard
          label="数据来源"
          value={resolveSourceLabel(portfolio?.used_source, portfolio?.holiday_mode)}
        />
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {selectedFund ? selectedFund.name : "请选择基金"}
            </h2>
            {selectedFund && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[var(--muted-foreground)] font-mono">{selectedFund.code}</span>
                <span className="text-xs text-[var(--muted-foreground)]">•</span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {resolveSourceLabel(detail?.estimate_source, detail?.holiday_mode)}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              className="h-8"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1", isRefreshing && "animate-spin")} />
              刷新
            </Button>
            {selectedFund && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDeleteFund}
                className="h-8 text-[var(--loss)] border-[var(--loss)]/30 hover:bg-[var(--loss)]/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "估算收益", value: formatNumber(detail?.estimate_income), isPositive: (detail?.estimate_income ?? 0) >= 0, prefix: (detail?.estimate_income ?? 0) > 0 ? "+" : "" },
            { label: "持有收益", value: formatNumber(detail?.total_income), isPositive: (detail?.total_income ?? 0) >= 0, prefix: (detail?.total_income ?? 0) > 0 ? "+" : "" },
            { label: "当日涨跌", value: formatPct(detail?.estimate_pct), isPositive: (detail?.estimate_pct ?? 0) >= 0, prefix: (detail?.estimate_pct ?? 0) > 0 ? "+" : "" },
            { label: "官方估值", value: formatPct(detail?.fund_gz_pct), isPositive: null },
            { label: "官方净值", value: formatNumber(detail?.fund_gz_nav), isPositive: null },
            { label: "净值日期", value: detail?.real_nav_date ?? "—", isPositive: null },
          ].map((item, i) => (
            <div key={i} className="stat-card">
              <div className="text-xs text-[var(--muted-foreground)] mb-1">{item.label}</div>
              <AnimatedNumber
                value={item.value}
                prefix={item.prefix}
                isPositive={item.isPositive}
                className={cn(
                  "text-base font-semibold font-mono",
                  item.isPositive === true && "text-[var(--gain)]",
                  item.isPositive === false && "text-[var(--loss)]"
                )}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-[var(--border)]">
            <CardHeader className="pb-2 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  净值走势
                </CardTitle>
                <div className="flex gap-1">
                  {(["intraday", "1m", "3m", "1y"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => onChartPeriodChange(p)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-md transition-colors",
                        chartPeriod === p 
                          ? "bg-[var(--primary)] text-white" 
                          : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                      )}
                    >
                      {{ intraday: "分时", "1m": "1月", "3m": "3月", "1y": "1年" }[p]}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {chartPeriod === "intraday" && !navItems.length ? (
                <div className="h-[320px] flex flex-col items-center justify-center text-[var(--muted-foreground)]">
                  <Clock className="w-8 h-8 mb-2 opacity-30" />
                  <div className="text-sm">暂未开盘</div>
                </div>
              ) : chartOption ? (
                <FundChart option={chartOption} className="h-[320px] w-full" />
              ) : (
                <div className="h-[320px] flex items-center justify-center text-[var(--muted-foreground)]">
                  <div className="text-sm">暂无数据</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-[var(--border)]">
            <CardHeader className="pb-2 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  持仓概况
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {selectedFund ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[var(--muted)]">
                    <div className="text-[10px] text-[var(--muted-foreground)]">
                      持有金额
                    </div>
                    <div className="text-lg font-semibold font-mono mt-1">
                      {formatNumber(
                        selectedFund.mode === "amount" 
                          ? selectedFund.amount 
                          : selectedFund.shares * (selectedFund.nav ?? detail?.fund_gz_nav ?? (navItems.length ? navItems[navItems.length - 1].nav : 0)),
                        2
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--muted)]">
                    <div className="text-[10px] text-[var(--muted-foreground)]">持仓成本</div>
                    <div className="text-lg font-semibold font-mono mt-1">
                      {formatNumber(selectedFund.mode === "amount" ? selectedFund.cost : selectedFund.cost * selectedFund.shares, 2)}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--muted)]">
                    <div className="text-[10px] text-[var(--muted-foreground)]">累计收益</div>
                    <AnimatedNumber
                      value={formatNumber(detail?.total_income)}
                      prefix={(detail?.total_income ?? 0) > 0 ? "+" : ""}
                      isPositive={(detail?.total_income ?? 0) >= 0}
                      className={cn(
                        "text-lg font-semibold font-mono mt-1",
                        (detail?.total_income ?? 0) >= 0 ? "text-[var(--gain)]" : "text-[var(--loss)]"
                      )}
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--muted)]">
                    <div className="text-[10px] text-[var(--muted-foreground)]">持仓占比</div>
                    <div className="text-lg font-semibold font-mono mt-1">
                      {(() => {
                        const currentVal =
                          selectedFund.mode === "amount"
                            ? selectedFund.amount + (detail?.total_income || 0)
                            : selectedFund.shares * (selectedFund.nav ?? detail?.fund_gz_nav ?? (navItems.length ? navItems[navItems.length - 1].nav : 0));
                        const ratio = portfolio?.total_amount ? (currentVal / portfolio.total_amount) * 100 : 0;
                        return formatPct(ratio);
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-[var(--muted-foreground)]">
                  <div className="text-sm">请选择基金</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-[var(--border)]">
          <CardHeader className="pb-2 px-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <h3 className="font-medium text-sm">重仓股票</h3>
              {detail?.components && detail.components.length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {detail.components.length} 只
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {detail && detail.components.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-[var(--border)] bg-[var(--muted)]/30">
                    <TableHead className="pl-4 h-10 text-xs text-[var(--muted-foreground)]">代码</TableHead>
                    <TableHead className="h-10 text-xs text-[var(--muted-foreground)]">名称</TableHead>
                    <TableHead className="h-10 text-xs text-[var(--muted-foreground)]">权重</TableHead>
                    <TableHead className="h-10 text-xs text-[var(--muted-foreground)]">价格</TableHead>
                    <TableHead className="text-right pr-4 h-10 text-xs text-[var(--muted-foreground)]">涨跌幅</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.components.map((item) => (
                    <TableRow key={item.stock_code} className="border-[var(--border)] hover:bg-[var(--muted)]/30">
                      <TableCell className="pl-4 font-mono text-xs text-[var(--muted-foreground)]">
                        {item.stock_code}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{item.stock_name}</TableCell>
                      <TableCell className="font-mono text-sm">{formatPct(item.weight)}</TableCell>
                      <TableCell className="font-mono text-sm">{formatNumber(item.price)}</TableCell>
                      <TableCell className="text-right pr-4">
                        <AnimatedNumber
                          value={formatPct(item.change_pct)}
                          prefix={item.change_pct > 0 ? "+" : ""}
                          isPositive={item.change_pct >= 0}
                          className={cn(
                            "font-mono font-semibold text-sm",
                            item.change_pct >= 0 ? "text-[var(--gain)]" : "text-[var(--loss)]"
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
                <div className="text-sm">暂无持仓数据</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};
