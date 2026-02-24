import { Activity, MoreHorizontal, Plus, RefreshCw, TrendingDown, TrendingUp, Trash2, Wallet } from "lucide-react";
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
  return (
    <main className="flex flex-col gap-6 min-h-0 overflow-y-auto custom-scrollbar pr-1">
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
            <div
              className={cn(
                "text-3xl font-semibold tracking-tight font-mono",
                (portfolio?.total_daily_income ?? 0) >= 0 ? "text-destructive" : "text-foreground"
              )}
            >
              {(portfolio?.total_daily_income ?? 0) > 0 ? "+" : ""}
              {formatNumber(portfolio?.total_daily_income)}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="font-mono font-medium text-foreground">
                {(portfolio?.daily_pct ?? 0) > 0 ? "+" : ""}
                {formatPct(portfolio?.daily_pct, 2)}
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
            <div
              className={cn(
                "text-3xl font-semibold tracking-tight font-mono",
                (portfolio?.total_holding_income ?? 0) >= 0 ? "text-destructive" : "text-foreground"
              )}
            >
              {(portfolio?.total_holding_income ?? 0) > 0 ? "+" : ""}
              {formatNumber(portfolio?.total_holding_income)}
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
            {portfolio?.transition_progress !== undefined &&
              portfolio?.transition_progress !== null &&
              portfolio.transition_progress < 1 && (
                <div className="w-full bg-muted/60 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-foreground/70 h-full rounded-full transition-all duration-500" style={{ width: `${portfolio.transition_progress * 100}%` }} />
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
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
            <Button variant="outline" size="sm" onClick={onRefreshDetail} className="h-9 gap-2 shadow-sm">
              <RefreshCw className="h-3.5 w-3.5" /> 刷新
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteFund}
              className="h-9 gap-2 text-destructive hover:text-destructive hover:bg-destructive/5 shadow-sm"
            >
              <Trash2 className="h-3.5 w-3.5" /> 删除
            </Button>
          </div>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    onClick={() => onChartPeriodChange(p)}
                    className={cn(
                      "px-3 py-0.5 text-[10px] font-medium rounded-sm transition-all",
                      chartPeriod === p ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
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
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={onOpenTransactionSheet}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={onOpenHoldingSheet}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 p-5 flex flex-col justify-center">
              {selectedFund ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      {selectedFund.mode === "amount" ? "持有金额" : "持有份额"}
                    </span>
                    <span className="text-lg font-mono font-bold tracking-tight">
                      {formatNumber(selectedFund.mode === "amount" ? selectedFund.amount : selectedFund.shares, 2)}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">持仓成本</span>
                    <span className="text-lg font-mono font-bold tracking-tight text-muted-foreground/80">
                      {formatNumber(selectedFund.cost, 4)}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">累计收益</span>
                    <span
                      className={cn(
                        "text-lg font-mono font-bold tracking-tight",
                        (detail?.total_income ?? 0) >= 0 ? "text-destructive" : "text-primary"
                      )}
                    >
                      {(detail?.total_income ?? 0) > 0 ? "+" : ""}
                      {formatNumber(detail?.total_income)}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">持仓占比</span>
                    <span className="text-lg font-mono font-bold tracking-tight">
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
                <div className="text-center text-muted-foreground py-10 text-sm">请选择基金查看详情</div>
              )}
            </CardContent>
          </Card>
        </div>

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
      <div className="h-6" />
    </main>
  );
};
