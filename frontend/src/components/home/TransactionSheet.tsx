import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EstimateResponse, FundInfo } from "@/components/home/types";

type TransactionSheetProps = {
  open: boolean;
  onClose: () => void;
  selectedFund?: FundInfo;
  detail: EstimateResponse | null;
  transType: "buy" | "sell";
  onTransTypeChange: (value: "buy" | "sell") => void;
  transAmount: string;
  onTransAmountChange: (value: string) => void;
  transShares: string;
  onTransSharesChange: (value: string) => void;
  transPrice: string;
  onTransPriceChange: (value: string) => void;
  transDate: string;
  onTransDateChange: (value: string) => void;
  isAfter3PM: boolean;
  onIsAfter3PMChange: (value: boolean) => void;
  onSubmit: () => void;
};

export const TransactionSheet = ({
  open,
  onClose,
  selectedFund,
  detail,
  transType,
  onTransTypeChange,
  transAmount,
  onTransAmountChange,
  transShares,
  onTransSharesChange,
  transPrice,
  onTransPriceChange,
  transDate,
  onTransDateChange,
  isAfter3PM,
  onIsAfter3PMChange,
  onSubmit,
}: TransactionSheetProps) => {
  if (!open) return null;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">记录交易</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <button
              className={cn(
                "flex-1 py-2 text-sm rounded-md transition-colors",
                transType === "buy" 
                  ? "bg-[var(--primary)] text-white" 
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              )}
              onClick={() => onTransTypeChange("buy")}
            >
              买入
            </button>
            <button
              className={cn(
                "flex-1 py-2 text-sm rounded-md transition-colors",
                transType === "sell" 
                  ? "bg-[var(--primary)] text-white" 
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              )}
              onClick={() => onTransTypeChange("sell")}
            >
              卖出
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[var(--muted-foreground)]">交易日期</label>
              <Input 
                type="date" 
                className="font-mono text-sm" 
                value={transDate} 
                onChange={(e) => onTransDateChange(e.target.value)} 
                max={today}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--muted-foreground)]">交易时间</label>
              <div className="flex gap-1">
                <button
                  className={cn(
                    "flex-1 py-1.5 text-xs rounded-md transition-colors",
                    !isAfter3PM 
                      ? "bg-[var(--primary)] text-white" 
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  )}
                  onClick={() => onIsAfter3PMChange(false)}
                >
                  15:00前
                </button>
                <button
                  className={cn(
                    "flex-1 py-1.5 text-xs rounded-md transition-colors",
                    isAfter3PM 
                      ? "bg-[var(--primary)] text-white" 
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  )}
                  onClick={() => onIsAfter3PMChange(true)}
                >
                  15:00后
                </button>
              </div>
            </div>
          </div>

          {selectedFund?.mode === "amount" ? (
            <div className="space-y-1">
              <label className="text-xs text-[var(--muted-foreground)]">交易金额</label>
              <Input className="font-mono" value={transAmount} onChange={(e) => onTransAmountChange(e.target.value)} placeholder="请输入金额" />
            </div>
          ) : (
            <>
              {transType === "buy" ? (
                <div className="space-y-1">
                  <label className="text-xs text-[var(--muted-foreground)]">买入金额</label>
                  <Input className="font-mono" value={transAmount} onChange={(e) => onTransAmountChange(e.target.value)} placeholder="请输入金额" autoFocus />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs text-[var(--muted-foreground)]">卖出份额</label>
                  <Input
                    className="font-mono"
                    value={transShares}
                    onChange={(e) => onTransSharesChange(e.target.value)}
                    placeholder="请输入份额"
                    autoFocus
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-foreground)]">成交净值</label>
                <Input className="font-mono" value={transPrice} onChange={(e) => onTransPriceChange(e.target.value)} placeholder="请输入净值" />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button size="sm" onClick={onSubmit}>
              确认
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
