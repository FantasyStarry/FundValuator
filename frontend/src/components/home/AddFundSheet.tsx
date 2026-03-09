import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MarketFund } from "@/components/home/types";

type HoldingMode = "none" | "amount" | "shares";

type AddFundSheetProps = {
  open: boolean;
  onClose: () => void;
  selectedFund?: MarketFund;
  currentNav?: number | null;
  onAddFundWithHolding: (code: string, holding: {
    mode: "amount" | "shares";
    amount: number;
    shares: number;
    cost: number;
  } | null, transaction?: {
    type: "buy" | "sell";
    amount: number;
    shares: number;
    price: number;
    trans_date: string;
    is_after_3pm: boolean;
  } | null) => void;
};

export const AddFundSheet = ({
  open,
  onClose,
  selectedFund,
  currentNav,
  onAddFundWithHolding,
}: AddFundSheetProps) => {
  const [holdingMode, setHoldingMode] = useState<HoldingMode>("none");
  const [inputAmount, setInputAmount] = useState("");
  const [inputShares, setInputShares] = useState("");
  const [inputCost, setInputCost] = useState("");
  const [recordTransaction, setRecordTransaction] = useState(false);
  const [transType, setTransType] = useState<"buy" | "sell">("buy");
  const [transAmount, setTransAmount] = useState("");
  const [transShares, setTransShares] = useState("");
  const [transPrice, setTransPrice] = useState("");
  const [transDate, setTransDate] = useState("");
  const [isAfter3PM, setIsAfter3PM] = useState(false);

  useEffect(() => {
    if (open) {
      setHoldingMode("none");
      setInputAmount("");
      setInputShares("");
      setInputCost("");
      setRecordTransaction(false);
      setTransType("buy");
      setTransAmount("");
      setTransShares("");
      setTransPrice(currentNav ? String(currentNav) : "");
      
      const now = new Date();
      setTransDate(now.toISOString().split("T")[0]);
      setIsAfter3PM(now.getHours() >= 15);
    }
  }, [open, currentNav]);

  useEffect(() => {
    if (recordTransaction && currentNav) {
      setTransPrice(String(currentNav));
    }
  }, [recordTransaction, currentNav]);

  useEffect(() => {
    if (!recordTransaction) return;
    const amount = parseFloat(transAmount);
    const price = parseFloat(transPrice);
    const shares = parseFloat(transShares);
    
    if (transType === "buy" && amount > 0 && price > 0) {
      setTransShares((amount / price).toFixed(2));
    } else if (transType === "sell" && shares > 0 && price > 0) {
      setTransAmount((shares * price).toFixed(2));
    }
  }, [transAmount, transPrice, transShares, transType, recordTransaction]);

  const handleSubmit = () => {
    let holding: {
      mode: "amount" | "shares";
      amount: number;
      shares: number;
      cost: number;
    } | null = null;

    if (holdingMode === "amount") {
      const amount = parseFloat(inputAmount) || 0;
      if (amount > 0) {
        holding = {
          mode: "amount",
          amount,
          shares: 0,
          cost: 0,
        };
      }
    } else if (holdingMode === "shares") {
      const shares = parseFloat(inputShares) || 0;
      const cost = parseFloat(inputCost) || 0;
      if (shares > 0) {
        holding = {
          mode: "shares",
          amount: 0,
          shares,
          cost,
        };
      }
    }

    let transaction: {
      type: "buy" | "sell";
      amount: number;
      shares: number;
      price: number;
      trans_date: string;
      is_after_3pm: boolean;
    } | null = null;

    if (recordTransaction) {
      const tAmount = parseFloat(transAmount) || 0;
      const tShares = parseFloat(transShares) || 0;
      const tPrice = parseFloat(transPrice) || 0;
      
      if (tAmount > 0 && tPrice > 0) {
        transaction = {
          type: transType,
          amount: tAmount,
          shares: tShares,
          price: tPrice,
          trans_date: transDate,
          is_after_3pm: isAfter3PM,
        };
      }
    }

    if (selectedFund) {
      onAddFundWithHolding(selectedFund.code, holding, transaction);
    }
    onClose();
  };

  if (!open || !selectedFund) return null;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">添加基金</CardTitle>
          <div className="text-sm font-medium text-[var(--foreground)]">{selectedFund.name}</div>
          <div className="text-xs text-[var(--muted-foreground)] font-mono">{selectedFund.code}</div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs text-[var(--muted-foreground)]">设置持仓（可选）</div>
            <div className="flex gap-2">
              <button
                className={cn(
                  "flex-1 py-2 text-xs rounded-md transition-colors",
                  holdingMode === "none"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                )}
                onClick={() => setHoldingMode("none")}
              >
                暂不设置
              </button>
              <button
                className={cn(
                  "flex-1 py-2 text-xs rounded-md transition-colors",
                  holdingMode === "amount"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                )}
                onClick={() => setHoldingMode("amount")}
              >
                按金额
              </button>
              <button
                className={cn(
                  "flex-1 py-2 text-xs rounded-md transition-colors",
                  holdingMode === "shares"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                )}
                onClick={() => setHoldingMode("shares")}
              >
                按份额
              </button>
            </div>
          </div>

          {holdingMode === "amount" && (
            <div className="space-y-1">
              <label className="text-xs text-[var(--muted-foreground)]">持有金额</label>
              <Input
                className="font-mono text-sm"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                placeholder="请输入金额"
              />
            </div>
          )}

          {holdingMode === "shares" && (
            <>
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-foreground)]">持有份额</label>
                <Input
                  className="font-mono text-sm"
                  value={inputShares}
                  onChange={(e) => setInputShares(e.target.value)}
                  placeholder="请输入份额"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-foreground)]">持仓成本</label>
                <Input
                  className="font-mono text-sm"
                  value={inputCost}
                  onChange={(e) => setInputCost(e.target.value)}
                  placeholder="请输入成本"
                />
              </div>
            </>
          )}

          <div className="space-y-2 pt-2 border-t border-[var(--border)]">
            <button
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                recordTransaction
                  ? "bg-[var(--primary)]/10 border border-[var(--primary)]"
                  : "bg-[var(--muted)] hover:bg-[var(--muted)]/80"
              )}
              onClick={() => setRecordTransaction(!recordTransaction)}
            >
              <span className={recordTransaction ? "text-[var(--primary)]" : ""}>记录首笔交易</span>
              <div
                className={cn(
                  "w-4 h-4 rounded border transition-colors flex items-center justify-center",
                  recordTransaction
                    ? "bg-[var(--primary)] border-[var(--primary)]"
                    : "border-[var(--muted-foreground)]"
                )}
              >
                {recordTransaction && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          </div>

          {recordTransaction && (
            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                <button
                  className={cn(
                    "flex-1 py-1.5 text-xs rounded-md transition-colors",
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
                    "flex-1 py-1.5 text-xs rounded-md transition-colors",
                    transType === "sell"
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  )}
                  onClick={() => setTransType("sell")}
                >
                  卖出/减仓
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-[var(--muted-foreground)]">交易日期</label>
                  <Input
                    type="date"
                    className="font-mono text-xs"
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
                        "flex-1 py-1 text-xs rounded-md transition-colors",
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
                        "flex-1 py-1 text-xs rounded-md transition-colors",
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

              {transType === "buy" ? (
                <div className="space-y-1">
                  <label className="text-xs text-[var(--muted-foreground)]">买入金额</label>
                  <Input
                    className="font-mono text-sm"
                    value={transAmount}
                    onChange={(e) => setTransAmount(e.target.value)}
                    placeholder="请输入金额"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs text-[var(--muted-foreground)]">卖出份额</label>
                  <Input
                    className="font-mono text-sm"
                    value={transShares}
                    onChange={(e) => setTransShares(e.target.value)}
                    placeholder="请输入份额"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-foreground)]">成交净值</label>
                <Input
                  className="font-mono text-sm"
                  value={transPrice}
                  onChange={(e) => setTransPrice(e.target.value)}
                  placeholder="请输入净值"
                />
              </div>

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
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button size="sm" onClick={handleSubmit}>
              确认添加
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
