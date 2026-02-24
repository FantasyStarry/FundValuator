import { ArrowRight, Search, Wallet } from "lucide-react";
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

export const FundListSidebar = ({
  funds,
  selectedCode,
  listQuery,
  onListQueryChange,
  onSelectCode,
  onOpenHoldingSheet,
}: FundListSidebarProps) => {
  return (
    <aside className="flex flex-col min-h-0 rounded-xl border border-border/60 bg-card shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 flex justify-between items-center bg-muted/20">
        <span className="font-semibold text-sm tracking-tight">基金列表</span>
        <Badge variant="secondary" className="bg-background border border-border/60 text-foreground font-mono">
          {funds.length}
        </Badge>
      </div>

      <div className="p-4 border-b border-border/40">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9 text-sm bg-muted/30 border-transparent focus:bg-background transition-colors"
            placeholder="筛选..."
            value={listQuery}
            onChange={(e) => onListQueryChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {funds.map((fund) => {
          const estimate = fund.estimate_pct ?? null;
          const isPositive = estimate !== null && estimate >= 0;
          return (
            <div
              key={fund.code}
              className={cn(
                "group p-3 rounded-lg cursor-pointer border transition-all duration-200 relative overflow-hidden",
                selectedCode === fund.code
                  ? "bg-secondary/60 border-l-4 border-l-primary border-y border-r border-primary/10 shadow-sm pl-2.5"
                  : "border-transparent hover:bg-muted/60 hover:border-border/50"
              )}
              onClick={() => onSelectCode(fund.code)}
            >
              {selectedCode === fund.code && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
              <div className="flex justify-between items-center mb-1.5 pl-2">
                <span className={cn("font-medium text-sm truncate pr-2 transition-colors", selectedCode === fund.code ? "text-foreground" : "text-foreground/80")}>
                  {fund.name}
                </span>
                <span
                  className={cn(
                    "text-sm font-bold font-mono tracking-tight",
                    isPositive ? "text-destructive" : "text-primary"
                  )}
                >
                  {estimate !== null ? (isPositive ? "+" : "") + estimate.toFixed(2) + "%" : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center pl-2">
                <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">{fund.code}</span>
                <ArrowRight
                  className={cn(
                    "h-3 w-3 text-muted-foreground/50 transition-transform duration-300",
                    selectedCode === fund.code ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                  )}
                />
              </div>
            </div>
          );
        })}
        {!funds.length && <div className="text-center text-muted-foreground text-sm py-12">暂无数据</div>}
      </div>

      <div className="p-4 border-t border-border/40 bg-muted/10">
        <Button
          variant="outline"
          className="w-full border-border/60 hover:bg-background hover:shadow-sm transition-all"
          onClick={onOpenHoldingSheet}
        >
          <Wallet className="h-4 w-4 mr-2" /> 更新持仓
        </Button>
      </div>
    </aside>
  );
};
