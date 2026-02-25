import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/20 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <Card className="w-full max-w-md bg-card border-border shadow-[0_8px_40px_rgba(0,0,0,0.12)] animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle>记录交易</CardTitle>
          <CardDescription className="font-mono text-xs mt-1">
            {selectedFund ? `${selectedFund.name} · ${selectedFund.code}` : "请选择基金"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          {/* 交易类型 */}
          <div className="grid grid-cols-2 gap-4 p-1 bg-muted/40 rounded-lg">
            <label className={cn("flex items-center justify-center gap-2 cursor-pointer py-2 rounded-md transition-all", transType === "buy" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}>
              <input type="radio" className="hidden" checked={transType === "buy"} onChange={() => onTransTypeChange("buy")} />
              <span className="text-sm font-medium text-destructive">加仓 (买入)</span>
            </label>
            <label className={cn("flex items-center justify-center gap-2 cursor-pointer py-2 rounded-md transition-all", transType === "sell" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}>
              <input type="radio" className="hidden" checked={transType === "sell"} onChange={() => onTransTypeChange("sell")} />
              <span className="text-sm font-medium text-primary">减仓 (卖出)</span>
            </label>
          </div>

          {/* 交易日期和时间 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> 交易日期
              </label>
              <Input 
                type="date" 
                className="font-mono text-sm" 
                value={transDate} 
                onChange={(e) => onTransDateChange(e.target.value)} 
                max={today}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> 交易时间
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-muted/40 rounded-md">
                <label className={cn("flex items-center justify-center cursor-pointer py-1.5 rounded-sm transition-all text-xs", !isAfter3PM ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}>
                  <input type="radio" className="hidden" checked={!isAfter3PM} onChange={() => onIsAfter3PMChange(false)} />
                  <span>15:00前</span>
                </label>
                <label className={cn("flex items-center justify-center cursor-pointer py-1.5 rounded-sm transition-all text-xs", isAfter3PM ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}>
                  <input type="radio" className="hidden" checked={isAfter3PM} onChange={() => onIsAfter3PMChange(true)} />
                  <span>15:00后</span>
                </label>
              </div>
            </div>
          </div>

          {/* 交易金额/份额 */}
          <div className="space-y-4">
            {selectedFund?.mode === "amount" ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">交易金额</label>
                <Input className="font-mono" value={transAmount} onChange={(e) => onTransAmountChange(e.target.value)} placeholder="请输入交易金额" />
              </div>
            ) : (
              <>
                {transType === "buy" ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">买入金额 (估算份额: {transShares || "0.00"})</label>
                    <Input className="font-mono" value={transAmount} onChange={(e) => onTransAmountChange(e.target.value)} placeholder="请输入买入金额" autoFocus />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium text-muted-foreground">卖出份额</label>
                      <div className="text-[10px] text-muted-foreground flex gap-1">
                        <span>持仓:</span>
                        <span className="font-mono text-foreground">{selectedFund?.shares}</span>
                        <span className="text-primary cursor-pointer hover:underline ml-1" onClick={() => onTransSharesChange(String(selectedFund?.shares))}>
                          全部
                        </span>
                      </div>
                    </div>
                    <Input
                      className={cn(
                        "font-mono",
                        parseFloat(transShares) > (selectedFund?.shares || 0) && "border-destructive focus-visible:ring-destructive"
                      )}
                      value={transShares}
                      onChange={(e) => onTransSharesChange(e.target.value)}
                      placeholder="请输入卖出份额"
                      autoFocus
                    />
                    {parseFloat(transShares) > (selectedFund?.shares || 0) && <p className="text-[10px] text-destructive">输入份额超过当前持仓</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-xs font-medium text-muted-foreground">成交净值</label>
                    <span className="text-[10px] text-muted-foreground opacity-70">
                      {detail?.fund_gz_nav ? "实时估值" : "历史净值"}
                    </span>
                  </div>
                  <Input className="font-mono" value={transPrice} onChange={(e) => onTransPriceChange(e.target.value)} placeholder="请输入净值" />
                </div>
              </>
            )}
          </div>

          {/* 确认说明 */}
          <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3 w-3" />
              <span className="font-medium">交易确认说明</span>
            </div>
            <p>
              {transType === "buy" ? (
                <>
                  份额将在 <span className="text-foreground font-medium">{isAfter3PM ? "T+2日" : "T+1日"}</span> 确认，确认后开始计算收益。
                </>
              ) : (
                <>
                  卖出份额将在 <span className="text-foreground font-medium">{isAfter3PM ? "T+2日" : "T+1日"}</span> 确认，确认后资金到账。
                </>
              )}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button
              onClick={onSubmit}
              disabled={transType === "sell" && selectedFund?.mode === "shares" && parseFloat(transShares) > (selectedFund?.shares || 0)}
            >
              确认提交
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};