"use client";

import type { RefObject } from "react";
import { Clock, Loader2, Plus, Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarketFund } from "@/components/home/types";
import { cn } from "@/lib/utils";

type HeaderBarProps = {
  headerRef: RefObject<HTMLElement | null>;
  marketQuery: string;
  onMarketQueryChange: (value: string) => void;
  marketResults: MarketFund[];
  onAddFundClick: (fund: MarketFund) => void;
  updateTime?: string | null;
  addingFund?: boolean;
};

export const HeaderBar = ({
  headerRef,
  marketQuery,
  onMarketQueryChange,
  marketResults,
  onAddFundClick,
  updateTime,
  addingFund,
}: HeaderBarProps) => {
  return (
    <header 
      ref={headerRef} 
      className="border-b border-[var(--border)] bg-[var(--background)] sticky top-0 z-50"
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold">基金估值</h1>
            <p className="text-[10px] text-[var(--muted-foreground)]">实时监控</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            {addingFund ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
            )}
            <Input
              className="pl-9 h-9 text-sm"
              placeholder="搜索基金..."
              value={marketQuery}
              onChange={(e) => onMarketQueryChange(e.target.value)}
              disabled={addingFund}
            />
            
            {marketQuery && !addingFund && marketResults.length > 0 && (
              <div className="absolute top-10 left-0 right-0 bg-[var(--card)] border border-[var(--border)] rounded-lg p-1 z-50 max-h-60 overflow-y-auto custom-scrollbar">
                {marketResults.slice(0, 6).map((item) => (
                  <div
                    key={item.code}
                    className="flex justify-between items-center p-2 rounded hover:bg-[var(--muted)] cursor-pointer"
                    onClick={() => onAddFundClick(item)}
                  >
                    <div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-[var(--muted-foreground)] font-mono">{item.code}</div>
                    </div>
                    <Button size="sm" className="h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      添加
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono">{updateTime ?? "—"}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
