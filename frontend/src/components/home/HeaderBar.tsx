import type { RefObject } from "react";
import { Activity, Clock, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarketFund } from "@/components/home/types";

type HeaderBarProps = {
  headerRef: RefObject<HTMLElement>;
  marketQuery: string;
  onMarketQueryChange: (value: string) => void;
  marketResults: MarketFund[];
  onAddFund: (code: string) => void;
  updateTime?: string | null;
};

export const HeaderBar = ({
  headerRef,
  marketQuery,
  onMarketQueryChange,
  marketResults,
  onAddFund,
  updateTime,
}: HeaderBarProps) => {
  return (
    <header ref={headerRef} className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto w-full max-w-[1600px] px-6 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight">AI 基金估值平台</h1>
            <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">Real-time Valuation System</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 justify-between lg:justify-end">
          <div className="relative w-full max-w-[520px] lg:w-[320px] group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              className="pl-9 h-10 bg-secondary/30 border-transparent focus:bg-background focus:border-primary/20 transition-all duration-300"
              placeholder="搜索代码或名称..."
              value={marketQuery}
              onChange={(e) => onMarketQueryChange(e.target.value)}
            />
            {marketQuery && (
              <div className="absolute top-12 left-0 right-0 bg-popover border border-border rounded-xl p-2 flex flex-col gap-1 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {marketResults.slice(0, 6).map((item) => (
                  <div
                    key={item.code}
                    className="flex justify-between items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{item.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{item.code}</div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => onAddFund(item.code)}>
                      <Plus className="h-4 w-4 mr-1" /> 添加
                    </Button>
                  </div>
                ))}
                {!marketResults.length && <div className="p-4 text-sm text-muted-foreground text-center">未找到匹配基金</div>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/30 px-3 py-2 rounded-full border border-border/50">
            <Clock className="h-3 w-3" />
            <span className="font-mono">{updateTime ?? "—"}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
