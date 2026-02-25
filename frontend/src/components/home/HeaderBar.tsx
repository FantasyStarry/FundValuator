"use client";

import type { RefObject } from "react";
import { Activity, Clock, Loader2, Plus, Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarketFund } from "@/components/home/types";
import { cn } from "@/lib/utils";

type HeaderBarProps = {
  headerRef: RefObject<HTMLElement | null>;
  marketQuery: string;
  onMarketQueryChange: (value: string) => void;
  marketResults: MarketFund[];
  onAddFund: (code: string) => void;
  updateTime?: string | null;
  addingFund?: boolean;
};

export const HeaderBar = ({
  headerRef,
  marketQuery,
  onMarketQueryChange,
  marketResults,
  onAddFund,
  updateTime,
  addingFund,
}: HeaderBarProps) => {
  return (
    <header 
      ref={headerRef} 
      className="border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl sticky top-0 z-50"
    >
      <div className="mx-auto w-full max-w-[1600px] px-6 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[#00ff9d] flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
              <TrendingUp className="h-5 w-5 text-[var(--primary-foreground)]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[var(--primary)] rounded-full border-2 border-[var(--background)] animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-[var(--foreground)] to-[var(--muted-foreground)] bg-clip-text text-transparent">
              AI 基金估值平台
            </h1>
            <p className="text-[10px] text-[var(--muted-foreground)] font-medium tracking-widest uppercase">
              Real-time Valuation System
            </p>
          </div>
        </div>

        {/* Search and Status */}
        <div className="flex flex-wrap items-center gap-4 justify-between lg:justify-end">
          {/* Search */}
          <div className="relative w-full max-w-[520px] lg:w-[360px] group">
            {addingFund ? (
              <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] animate-spin" />
            ) : (
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors" />
            )}
            <Input
              className={cn(
                "pl-11 h-11 bg-[var(--muted)]/50 border-[var(--border)] rounded-xl",
                "focus:bg-[var(--card)] focus:border-[var(--primary)]/30 focus:ring-2 focus:ring-[var(--primary)]/10",
                "transition-all duration-300 placeholder:text-[var(--muted-foreground)]/60"
              )}
              placeholder={addingFund ? "正在添加基金..." : "搜索代码或名称..."}
              value={marketQuery}
              onChange={(e) => onMarketQueryChange(e.target.value)}
              disabled={addingFund}
            />
            
            {/* Dropdown */}
            {marketQuery && !addingFund && (
              <div className="absolute top-14 left-0 right-0 glass-card rounded-xl p-2 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-200 max-h-80 overflow-y-auto custom-scrollbar">
                {marketResults.slice(0, 8).map((item, idx) => (
                  <div
                    key={item.code}
                    className="flex justify-between items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:bg-[var(--muted)]/50 cursor-pointer group/item"
                    onClick={() => onAddFund(item.code)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate group-hover/item:text-[var(--primary)] transition-colors">
                        {item.name}
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)] font-mono mt-0.5">
                        {item.code}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="h-8 px-3 text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddFund(item.code);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> 
                      <span className="text-xs">添加</span>
                    </Button>
                  </div>
                ))}
                {!marketResults.length && (
                  <div className="p-6 text-center">
                    <Search className="w-8 h-8 mx-auto mb-2 text-[var(--muted-foreground)]/30" />
                    <div className="text-sm text-[var(--muted-foreground)]">未找到匹配基金</div>
                    <div className="text-xs text-[var(--muted-foreground)]/60 mt-1">尝试其他关键词</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Time Status */}
          <div className="flex items-center gap-2.5 text-xs font-medium text-[var(--muted-foreground)] bg-[var(--muted)]/50 px-4 py-2.5 rounded-xl border border-[var(--border)]/50">
            <div className="relative">
              <Clock className="h-3.5 w-3.5" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-pulse" />
            </div>
            <span className="font-mono tracking-wide">{updateTime ?? "—"}</span>
          </div>
        </div>
      </div>
    </header>
  );
};