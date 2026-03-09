"use client";

import { useState } from "react";
import { Activity, BarChart3, Clock3, RefreshCw, Trash2, Wallet } from "lucide-react";
import type { EChartsOption } from "echarts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FundChart } from "@/components/FundChart";
import { cn } from "@/lib/utils";
import type { EstimateResponse, FundInfo, NavItem, PortfolioOverview } from "@/components/home/types";
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

const NumberField = ({
  label,
  value,
  prefix = "",
  positive,
}: {
  label: string;
  value: string;
  prefix?: string;
  positive?: boolean | null;
}) => (
  <div className="stat-card">
    <div className="section-label">{label}</div>
    <div
      className={cn(
        "mt-3 font-mono text-[22px] font-semibold",
        positive === true && "text-[var(--gain)]",
        positive === false && "text-[var(--loss)]"
      )}
    >
      {prefix}
      {value}
    </div>
  </div>
);

const HoldingValueCard = ({ label, value }: { label: string; value: string }) => (
  <div className="data-tile">
    <div className="section-label">{label}</div>
    <div className="mt-2 font-mono text-base font-semibold">{value}</div>
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

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefreshDetail();
    window.setTimeout(() => setIsRefreshing(false), 500);
  };

  const currentHoldingValue = (() => {
    if (!selectedFund) return 0;
    if (selectedFund.mode === "amount") return selectedFund.amount;
    const currentNav = selectedFund.nav ?? detail?.fund_gz_nav ?? navItems.at(-1)?.nav ?? 0;
    return selectedFund.shares * currentNav;
  })();

  const holdingCost = (() => {
    if (!selectedFund) return 0;
    return selectedFund.mode === "amount" ? selectedFund.cost : selectedFund.cost * selectedFund.shares;
  })();

  const holdingRatio = portfolio?.total_amount ? (currentHoldingValue / portfolio.total_amount) * 100 : 0;

  return (
    <main className="custom-scrollbar flex min-h-0 flex-col gap-5 overflow-y-auto pr-1">
      <section className="surface-panel px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-label">Portfolio Overview</div>
            <h2 className="mt-1 text-lg font-semibold">组合运行概览</h2>
            <div className="mt-2 text-sm text-[var(--muted-foreground)]">
              数据来源 {resolveSourceLabel(portfolio?.used_source, portfolio?.holiday_mode)}
            </div>
          </div>
          <div className="status-strip flex items-center gap-3">
            <Clock3 className="h-4 w-4 text-[var(--primary)]" />
            <div>
              <div className="section-label">Last Update</div>
              <div className="font-mono text-sm">{portfolio?.update_time ?? "--"}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <NumberField label="总资产" value={formatNumber(portfolio?.total_amount)} />
          <NumberField
            label="当日盈亏"
            value={formatNumber(portfolio?.total_daily_income)}
            prefix={(portfolio?.total_daily_income ?? 0) > 0 ? "+" : ""}
            positive={(portfolio?.total_daily_income ?? 0) >= 0}
          />
          <NumberField
            label="累计盈亏"
            value={formatNumber(portfolio?.total_holding_income)}
            prefix={(portfolio?.total_holding_income ?? 0) > 0 ? "+" : ""}
            positive={(portfolio?.total_holding_income ?? 0) >= 0}
          />
          <NumberField
            label="当日收益率"
            value={formatPct(portfolio?.daily_pct)}
            prefix={(portfolio?.daily_pct ?? 0) > 0 ? "+" : ""}
            positive={(portfolio?.daily_pct ?? 0) >= 0}
          />
        </div>
      </section>

      <section className="surface-panel px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-label">Active Fund</div>
            <h2 className="mt-1 text-lg font-semibold">{selectedFund?.name ?? "请选择左侧基金"}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <span className="font-mono">{selectedFund?.code ?? "--"}</span>
              <span>{resolveSourceLabel(detail?.estimate_source, detail?.holiday_mode)}</span>
              {detail?.fund_gz_time && <span>更新时间 {detail.fund_gz_time}</span>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
              刷新数据
            </Button>
            <Button variant="outline" onClick={onOpenHoldingSheet} disabled={!selectedFund}>
              调整持仓
            </Button>
            <Button onClick={onOpenTransactionSheet} disabled={!selectedFund}>
              录入交易
            </Button>
            <Button variant="destructive" onClick={onDeleteFund} disabled={!selectedFund}>
              <Trash2 className="mr-2 h-4 w-4" />
              移除基金
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <NumberField
            label="估算收益"
            value={formatNumber(detail?.estimate_income)}
            prefix={(detail?.estimate_income ?? 0) > 0 ? "+" : ""}
            positive={(detail?.estimate_income ?? 0) >= 0}
          />
          <NumberField
            label="累计收益"
            value={formatNumber(detail?.total_income)}
            prefix={(detail?.total_income ?? 0) > 0 ? "+" : ""}
            positive={(detail?.total_income ?? 0) >= 0}
          />
          <NumberField
            label="估算涨跌"
            value={formatPct(detail?.estimate_pct)}
            prefix={(detail?.estimate_pct ?? 0) > 0 ? "+" : ""}
            positive={(detail?.estimate_pct ?? 0) >= 0}
          />
          <NumberField label="官方涨跌" value={formatPct(detail?.fund_gz_pct)} />
          <NumberField label="官方净值" value={formatNumber(detail?.fund_gz_nav, 4)} />
          <NumberField label="净值日期" value={detail?.real_nav_date ?? "--"} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader className="border-b border-[var(--border)] pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-[var(--primary)]" />
                <div>
                  <div className="section-label">Trend</div>
                  <CardTitle>净值轨迹</CardTitle>
                </div>
              </div>
              <div className="flex gap-2">
                {(["intraday", "1m", "3m", "1y"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => onChartPeriodChange(period)}
                    className={cn(
                      "border px-3 py-1 text-xs",
                      chartPeriod === period
                        ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "border-[var(--border)] bg-transparent text-[var(--muted-foreground)]"
                    )}
                  >
                    {{ intraday: "分时", "1m": "近 1 月", "3m": "近 3 月", "1y": "近 1 年" }[period]}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {chartPeriod === "intraday" && !navItems.length ? (
              <div className="flex h-[340px] flex-col items-center justify-center text-sm text-[var(--muted-foreground)]">
                <Clock3 className="mb-3 h-8 w-8" />
                当前分时数据未开盘或暂不可用
              </div>
            ) : chartOption ? (
              <FundChart option={chartOption} className="h-[340px] w-full" />
            ) : (
              <div className="flex h-[340px] items-center justify-center text-sm text-[var(--muted-foreground)]">暂无净值走势数据</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-[var(--border)] pb-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-4 w-4 text-[var(--primary)]" />
              <div>
                <div className="section-label">Position</div>
                <CardTitle>持仓结构</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 p-5">
            <HoldingValueCard label={selectedFund?.mode === "shares" ? "持有份额" : "持仓规模"} value={formatNumber(currentHoldingValue)} />
            <HoldingValueCard label="持仓成本" value={formatNumber(holdingCost)} />
            <HoldingValueCard label="累计盈亏" value={`${(detail?.total_income ?? 0) > 0 ? "+" : ""}${formatNumber(detail?.total_income)}`} />
            <HoldingValueCard label="仓位占比" value={formatPct(holdingRatio)} />
            <div className="status-strip">
              <div className="section-label">Record Mode</div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline">{selectedFund?.mode === "shares" ? "份额模式" : "金额模式"}</Badge>
                {!selectedFund && <span className="text-sm text-[var(--muted-foreground)]">请选择基金后查看。</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-4 w-4 text-[var(--primary)]" />
            <div>
              <div className="section-label">Components</div>
              <CardTitle>重仓股票明细</CardTitle>
            </div>
            {detail?.components?.length ? <Badge variant="outline">{detail.components.length}</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {detail?.components?.length ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-[rgba(217,208,193,0.25)] hover:bg-[rgba(217,208,193,0.25)]">
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
                    <TableCell className="font-mono text-xs text-[var(--muted-foreground)]">{item.stock_code}</TableCell>
                    <TableCell>{item.stock_name}</TableCell>
                    <TableCell className="font-mono">{formatPct(item.weight)}</TableCell>
                    <TableCell className="font-mono">{formatNumber(item.price)}</TableCell>
                    <TableCell className={cn("text-right font-mono font-semibold", item.change_pct >= 0 ? "text-[var(--gain)]" : "text-[var(--loss)]")}>
                      {item.change_pct > 0 ? "+" : ""}
                      {formatPct(item.change_pct)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-5 py-16 text-center text-sm text-[var(--muted-foreground)]">当前基金暂无重仓股明细。</div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};
