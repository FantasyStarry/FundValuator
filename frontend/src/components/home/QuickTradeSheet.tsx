import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FundInfo, EstimateResponse } from "@/components/home/types";

type QuickTradeSheetProps = {
  open: boolean;
  onClose: () => void;
  selectedFund?: FundInfo;
  detail?: EstimateResponse | null;
  onQuickTrade: (fundCode: string, transaction: {
    type: "buy" | "sell";
    amount: number;
    shares: number;
    price: number;
    trans_date: string;
    is_after_3pm: boolean;
    mode: string;
  }) => void;
};

export const QuickTradeSheet = ({
  open,
  onClose,
  selectedFund,
  detail,
  onQuickTrade,
}: QuickTradeSheetProps) => {
  const [transType, setTransType] = useState<"buy" | "sell">("buy");
  const [transAmount, setTransAmount] = useState("");
  const [transShares, setTransShares] = useState("");
  const [transPrice, setTransPrice] = useState("");
  const [transDate, setTransDate] = useState("");
  const [isAfter3PM, setIsAfter3PM] = useState(false);

  useEffect(() => {
    if (open) {
      setTransType("buy");
      setTransAmount("");
      setTransShares("");
      setTransPrice("");
      
      const now = new Date();
      setTransDate(now.toISOString().split("T")[0]);
      setIsAfter3PM(now.getHours() >= 15);
      
      const bestPrice = detail?.fund_gz_nav;
      if (bestPrice) {
        setTransPrice(String(bestPrice));
      }
    }
  }, [open, detail]);

  useEffect(() => {
    if (!open || !selectedFund) return;
    
    const amount = parseFloat(transAmount);
    const price = parseFloat(transPrice);
    const shares = parseFloat(transShares);
    
    if (transType === "buy" && amount > 0 && price > 0) {
      setTransShares((amount / price).toFixed(2));
    } else if (transType === "sell" && shares > 0 && price > 0) {
      setTransAmount((shares * price).toFixed(2));
    }
  }, [transAmount, transPrice, transShares, transType, open, selectedFund]);

  const handleSubmit = () => {
    if (!selectedFund) return;
    
    const tAmount = parseFloat(transAmount) || 0;
    const tShares = parseFloat(transShares) || 0;
    const tPrice = parseFloat(transPrice) || 0;
    
    if (tAmount <= 0 || tPrice <= 0) return;
    if (!transDate) return;

    onQuickTrade(selectedFund.code, {
      type: transType,
      amount: tAmount,
      shares: tShares,
      price: tPrice,
      trans_date: transDate,
      is_after_3pm: isAfter3PM,
      mode: selectedFund.mode,
    });
    
    onClose();
  };

  if (!open || !selectedFund) return null;

  const today = new Date().toISOString().split("T")[0];
  const canSubmit = (parseFloat(transAmount) > 0 && parseFloat(transPrice) > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">快捷交易</CardTitle>
          <div className="text-sm font-medium text-[var(--foreground)]">{selectedFund.name}</div>
          <div className="text-xs text-[var(--muted-foreground)] font-mono">{selectedFund.code}</div>
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
              onClick={() => setTransType("buy")}
            >
              买入/加仓
            </button>
            <button
              className={cn(
                "flex-1 py-2 text-sm rounded-md transition-colors",
                transType === "sell"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              )}
              onClick={() => setTransType("sell")}
            >
              卖出/减仓
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[var(--muted-foreground)]">交易日期</label>
              <Input
                type="date"
                className="font-mono text-sm"
                value={transDate}
                onChange={(e) => setTransDate(e.target.value)}
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
                  onClick={() => setIsAfter3PM(false)}
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
                  onClick={() => setIsAfter3PM(true)}
                >
                  15:00后
                </button>
              </div>
            </div>
          </div>

          {selectedFund.mode === "amount" ? (
            <div className="space-y-1">
              <label className="text-xs text-[var(--muted-foreground)]">交易金额</label>
              <Input
                className="font-mono"
                value={transAmount}
                onChange={(e) => setTransAmount(e.target.value)}
                placeholder="请输入金额"
                autoFocus
              />
            </div>
          ) : (
            <>
              {transType === "buy" ? (
                <div className="space-y-1">
                  <label className="text-xs text-[var(--muted-foreground)]">买入金额</label>
                  <Input
                    className="font-mono"
                    value={transAmount}
                    onChange={(e) => setTransAmount(e.target.value)}
                    placeholder="请输入金额"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs text-[var(--muted-foreground)]">卖出份额</label>
                  <Input
                    className="font-mono"
                    value={transShares}
                    onChange={(e) => setTransShares(e.target.value)}
                    placeholder="请输入份额"
                    autoFocus
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-foreground)]">成交净值</label>
                <Input
                  className="font-mono"
                  value={transPrice}
                  onChange={(e) => setTransPrice(e.target.value)}
                  placeholder="请输入净值"
                />
              </div>
            </>
          )}

          {transType === "buy" && parseFloat(transAmount) > 0 && parseFloat(transPrice) > 0 && (
            <div className="text-xs text-[var(--muted-foreground)]">
              买入份额: <span className="font-mono">{(parseFloat(transAmount) / parseFloat(transPrice)).toFixed(2)}</span>
            </div>
          )}
          {transType === "sell" && parseFloat(transShares) > 0 && parseFloat(transPrice) > 0 && (
            <div className="text-xs text-[var(--muted-foreground)]">
              卖出金额: <span className="font-mono">{(parseFloat(transShares) * parseFloat(transPrice)).toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={!canSubmit}>
              确认
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
