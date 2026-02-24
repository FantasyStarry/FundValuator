import { Clock } from "lucide-react";
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
  isAfter3PM: boolean;
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
  isAfter3PM,
  onSubmit,
}: TransactionSheetProps) => {
  if (!open) return null;

  const now = new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/20 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <Card className="w-full max-w-md bg-card border-border shadow-[0_8px_40px_rgba(0,0,0,0.12)] animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle>记录交易</CardTitle>
          <CardDescription className="font-mono text-xs mt-1 flex flex-col gap-1">
            <span>{selectedFund ? `${selectedFund.name} · ${selectedFund.code}` : "请选择基金"}</span>
            {selectedFund && (
              <span className={cn("text-[10px]", isAfter3PM ? "text-primary" : "text-muted-foreground")}>
                当前时间 {now.getHours()}:{now.getMinutes().toString().padStart(2, "0")} · {isAfter3PM ? "今日休市 (交易归入下一交易日)" : "交易进行中 (预计今日确认)"}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
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
                    <label className="text-xs font-medium text-muted-foreground">成交净值 (自动获取)</label>
                    <span className="text-[10px] text-muted-foreground opacity-70">
                      {detail?.fund_gz_nav ? "实时估值" : "历史净值"}
                    </span>
                  </div>
                  <Input className="font-mono bg-muted/30" value={transPrice} onChange={(e) => onTransPriceChange(e.target.value)} placeholder="净值" />
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {isAfter3PM ? "已按今日收盘估值填充，实际以明日官方净值为准" : "已按实时估值填充，实际以今晚官方净值为准"}
                  </p>
                </div>
              </>
            )}
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
