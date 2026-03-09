"use client";

import type { RefObject } from "react";
import { Clock3, Loader2, Search, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { MarketFund } from "@/components/home/types";

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
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(236,231,220,0.94)] backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center border border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="section-label">Fund Operations Console</div>
            <h1 className="text-lg font-semibold tracking-[0.02em]">AI 基金监控台</h1>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-4">
          <div className="relative w-[360px] max-w-[46vw]">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
              {addingFund ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </div>
            <Input
              className="pl-9"
              placeholder="搜索基金代码或名称"
              value={marketQuery}
              onChange={(e) => onMarketQueryChange(e.target.value)}
              disabled={addingFund}
            />

            {marketQuery && !addingFund && marketResults.length > 0 && (
              <div className="surface-panel absolute left-0 right-0 top-12 max-h-72 overflow-y-auto p-1 custom-scrollbar">
                {marketResults.slice(0, 6).map((item) => (
                  <div key={item.code} className="flex items-center justify-between border-b border-[rgba(184,174,157,0.45)] px-3 py-3 last:border-b-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{item.name}</div>
                      <div className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">{item.code}</div>
                    </div>
                    <Button size="sm" onClick={() => onAddFundClick(item)}>
                      纳入监控
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="status-strip flex min-w-[180px] items-center gap-2">
            <Clock3 className="h-4 w-4 text-[var(--primary)]" />
            <div>
              <div className="section-label">Portfolio Update</div>
              <div className="font-mono text-sm">{updateTime ?? "--"}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
