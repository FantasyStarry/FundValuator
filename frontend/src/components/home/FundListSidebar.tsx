"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Search, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FundInfo } from "@/components/home/types";

type FundListSidebarProps = {
  funds: (FundInfo & { computedAmount?: number })[];
  selectedCode: string;
  listQuery: string;
  onListQueryChange: (value: string) => void;
  onSelectCode: (code: string) => void;
  onOpenHoldingSheet: () => void;
};

const AnimatedPercent = ({ value }: { value: number | null }) => {
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

  if (value === null) return <span className="text-sm text-[var(--muted-foreground)]">—</span>;

  const isPositive = value >= 0;
  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs font-semibold",
        flash && "flash-update",
        isPositive 
          ? "text-[var(--gain)]" 
          : "text-[var(--loss)]"
      )}
    >
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      <span>{isPositive ? "+" : ""}{value.toFixed(2)}%</span>
    </div>
  );
};

const FundItem = ({ 
  fund, 
  isSelected, 
  onClick 
}: { 
  fund: FundInfo; 
  isSelected: boolean; 
  onClick: () => void;
}) => {
  return (
    <div
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-colors",
        isSelected 
          ? "bg-[var(--primary)] text-white" 
          : "hover:bg-[var(--muted)]"
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-medium text-sm truncate">
            {fund.name}
          </h3>
        </div>
        <AnimatedPercent value={fund.estimate_pct ?? null} />
      </div>
      
      <div className="flex justify-between items-center">
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px] font-mono",
            isSelected ? "bg-white/20 border-white/30 text-white" : "bg-[var(--muted)] border-transparent"
          )}
        >
          {fund.code}
        </Badge>
        <ChevronRight 
          className={cn(
            "w-4 h-4",
            isSelected ? "text-white/80" : "text-[var(--muted-foreground)]"
          )}
        />
      </div>
      
      {(fund.amount > 0 || fund.shares > 0) && (
        <div className="mt-2 pt-2 border-t border-current/10">
          <div className="flex items-center justify-between text-xs opacity-80">
            <span>持有金额</span>
            <span className="font-mono font-medium">
              ¥{(
                fund.mode === "amount" 
                  ? fund.amount 
                  : (fund as FundInfo & { computedAmount?: number }).computedAmount ?? fund.shares
              ).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export const FundListSidebar = ({
  funds,
  selectedCode,
  listQuery,
  onListQueryChange,
  onSelectCode,
  onOpenHoldingSheet,
}: FundListSidebarProps) => {
  const totalFunds = funds.length;
  const gainCount = funds.filter(f => (f.estimate_pct ?? 0) >= 0).length;
  const lossCount = totalFunds - gainCount;

  return (
    <aside className="flex flex-col min-h-0 rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            <span className="font-medium text-sm">基金</span>
            <Badge variant="outline" className="text-[10px] ml-1">
              {totalFunds}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[var(--gain)]">{gainCount}涨</span>
            <span className="text-[var(--muted-foreground)]">/</span>
            <span className="text-[var(--loss)]">{lossCount}跌</span>
          </div>
        </div>
      </div>

      <div className="p-3 border-b border-[var(--border)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="搜索基金..."
            value={listQuery}
            onChange={(e) => onListQueryChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {funds.map((fund) => (
          <FundItem
            key={fund.code}
            fund={fund}
            isSelected={selectedCode === fund.code}
            onClick={() => onSelectCode(fund.code)}
          />
        ))}
        {!funds.length && (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
            <div className="text-sm">暂无基金</div>
            <div className="text-xs mt-1">搜索添加</div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[var(--border)]">
        <Button
          variant="outline"
          className="w-full h-9 text-sm"
          onClick={onOpenHoldingSheet}
        >
          更新持仓
        </Button>
      </div>
    </aside>
  );
};
