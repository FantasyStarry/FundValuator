"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronRight, Search, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FundInfo } from "@/components/home/types";

type FundListSidebarProps = {
  funds: FundInfo[];
  selectedCode: string;
  listQuery: string;
  onListQueryChange: (value: string) => void;
  onSelectCode: (code: string) => void;
  onOpenHoldingSheet: () => void;
};

// Animated percentage component
const AnimatedPercent = ({ value }: { value: number | null }) => {
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 500);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  if (value === null) return <span className="text-sm text-[var(--muted-foreground)]">—</span>;

  const isPositive = value >= 0;
  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-sm font-bold transition-all duration-300",
        flash && "scale-110",
        isPositive 
          ? "text-[var(--gain)] bg-[var(--gain)]/10" 
          : "text-[var(--loss)] bg-[var(--loss)]/10"
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

// Fund item component
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
        "group relative p-3 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden",
        isSelected 
          ? "glass-card" 
          : "hover:bg-[var(--muted)]/50"
      )}
      onClick={onClick}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--primary)] to-[var(--primary)]/30 rounded-r-full" />
      )}
      
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className={cn(
            "font-medium text-sm truncate transition-colors",
            isSelected ? "text-[var(--foreground)]" : "text-[var(--foreground)]/80"
          )}>
            {fund.name}
          </h3>
        </div>
        <AnimatedPercent value={fund.estimate_pct ?? null} />
      </div>
      
      <div className="flex justify-between items-center">
        <Badge 
          variant="outline" 
          className="text-[10px] font-mono bg-[var(--muted)]/30 border-[var(--border)]/50 text-[var(--muted-foreground)]"
        >
          {fund.code}
        </Badge>
        <ChevronRight 
          className={cn(
            "w-4 h-4 text-[var(--muted-foreground)] transition-all duration-300",
            isSelected 
              ? "opacity-100 translate-x-0 text-[var(--primary)]" 
              : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
          )}
        />
      </div>
      
      {/* Holding info */}
      {(fund.amount > 0 || fund.shares > 0) && (
        <div className="mt-2 pt-2 border-t border-[var(--border)]/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--muted-foreground)]">
              {fund.mode === "amount" ? "持有金额" : "持有份额"}
            </span>
            <span className="font-mono font-medium">
              {fund.mode === "amount" 
                ? `¥${fund.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
                : fund.shares.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
              }
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
  // Calculate total stats
  const totalFunds = funds.length;
  const gainCount = funds.filter(f => (f.estimate_pct ?? 0) >= 0).length;
  const lossCount = totalFunds - gainCount;

  return (
    <aside className="flex flex-col min-h-0 rounded-2xl glass-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--muted)]/30">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[var(--primary)]" />
            <span className="font-semibold text-sm tracking-tight">基金列表</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge 
              variant="outline" 
              className="bg-[var(--gain)]/10 text-[var(--gain)] border-[var(--gain)]/20 font-mono text-[10px]"
            >
              {gainCount} 涨
            </Badge>
            <Badge 
              variant="outline" 
              className="bg-[var(--loss)]/10 text-[var(--loss)] border-[var(--loss)]/20 font-mono text-[10px]"
            >
              {lossCount} 跌
            </Badge>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-[var(--border)]/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            className="pl-10 h-10 text-sm bg-[var(--muted)]/50 border-[var(--border)] focus:bg-[var(--card)] focus:border-[var(--primary)]/50 transition-all rounded-xl"
            placeholder="搜索基金..."
            value={listQuery}
            onChange={(e) => onListQueryChange(e.target.value)}
          />
        </div>
      </div>

      {/* Fund List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {funds.map((fund, idx) => (
          <FundItem
            key={fund.code}
            fund={fund}
            isSelected={selectedCode === fund.code}
            onClick={() => onSelectCode(fund.code)}
          />
        ))}
        {!funds.length && (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
            <Wallet className="w-10 h-10 mb-3 opacity-30" />
            <div className="text-sm font-medium">暂无基金</div>
            <div className="text-xs mt-1 opacity-60">点击上方搜索添加</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/20">
        <Button
          variant="outline"
          className="w-full h-10 bg-[var(--card)] border-[var(--border)] hover:bg-[var(--muted)] hover:border-[var(--primary)]/30 transition-all rounded-xl font-medium"
          onClick={onOpenHoldingSheet}
        >
          <Wallet className="h-4 w-4 mr-2" />
          更新持仓
        </Button>
      </div>
    </aside>
  );
};