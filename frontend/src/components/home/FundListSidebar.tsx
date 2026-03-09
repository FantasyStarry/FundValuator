"use client";

import { Search, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FundInfo } from "@/components/home/types";

type FundListSidebarProps = {
  funds: (FundInfo & { computedAmount?: number })[];
  selectedCode: string;
  listQuery: string;
  onListQueryChange: (value: string) => void;
  onSelectCode: (code: string) => void;
  onOpenHoldingSheet: () => void;
  onQuickTrade: (code: string) => void;
};

const PercentBadge = ({ value }: { value: number | null }) => {
  if (value === null || value === undefined) {
    return <span className="font-mono text-xs text-[var(--muted-foreground)]">--</span>;
  }

  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-2 py-1 font-mono text-xs font-semibold",
        positive
          ? "border-[rgba(39,68,56,0.28)] bg-[rgba(39,68,56,0.08)] text-[var(--gain)]"
          : "border-[rgba(108,47,42,0.28)] bg-[rgba(108,47,42,0.08)] text-[var(--loss)]"
      )}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
};

const computeHoldingAmount = (fund: FundInfo & { computedAmount?: number }) => {
  if (fund.mode === "amount") return fund.amount;
  return fund.computedAmount ?? fund.shares;
};

export const FundListSidebar = ({
  funds,
  selectedCode,
  listQuery,
  onListQueryChange,
  onSelectCode,
  onOpenHoldingSheet,
  onQuickTrade,
}: FundListSidebarProps) => {
  const gainCount = funds.filter((fund) => (fund.estimate_pct ?? 0) >= 0).length;
  const lossCount = funds.length - gainCount;

  return (
    <aside className="surface-panel flex min-h-0 flex-col overflow-hidden">
      <div className="border-b border-[var(--border)] px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="h-4 w-4 text-[var(--primary)]" />
            <div>
              <div className="section-label">Scope</div>
              <div className="text-sm font-semibold">监控基金池</div>
            </div>
          </div>
          <Badge variant="outline">{funds.length}</Badge>
        </div>
        <div className="mt-3 flex gap-3 text-xs">
          <span className="text-[var(--gain)]">上涨 {gainCount}</span>
          <span className="text-[var(--muted-foreground)]">下跌 {lossCount}</span>
        </div>
      </div>

      <div className="border-b border-[var(--border)] p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            className="pl-9"
            placeholder="筛选已监控基金"
            value={listQuery}
            onChange={(e) => onListQueryChange(e.target.value)}
          />
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-2">
          {funds.map((fund) => {
            const isSelected = selectedCode === fund.code;
            return (
              <button
                key={fund.code}
                type="button"
                className={cn("fund-item w-full text-left", isSelected && "selected")}
                onClick={() => onSelectCode(fund.code)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{fund.name}</div>
                    <div className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">{fund.code}</div>
                  </div>
                  <PercentBadge value={fund.estimate_pct ?? null} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="data-tile">
                    <div className="text-[var(--muted-foreground)]">持仓规模</div>
                    <div className="mt-1 font-mono text-sm">{computeHoldingAmount(fund).toFixed(2)}</div>
                  </div>
                  <div className="data-tile">
                    <div className="text-[var(--muted-foreground)]">记录方式</div>
                    <div className="mt-1 text-sm">{fund.mode === "amount" ? "金额" : "份额"}</div>
                  </div>
                </div>
              </button>
            );
          })}

          {!funds.length && (
            <div className="px-2 py-10 text-center text-sm text-[var(--muted-foreground)]">
              当前没有监控中的基金，请在上方搜索并纳入监控。
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-[var(--border)] p-4">
        <Button variant="outline" onClick={onOpenHoldingSheet}>
          调整持仓
        </Button>
        <Button onClick={() => selectedCode && onQuickTrade(selectedCode)} disabled={!selectedCode}>
          快速交易
        </Button>
      </div>
    </aside>
  );
};
