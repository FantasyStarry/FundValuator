import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FundInfo } from "@/components/home/types";

type HoldingSheetProps = {
  open: boolean;
  onClose: () => void;
  selectedFund?: FundInfo;
  editMode: "amount" | "shares";
  onEditModeChange: (value: "amount" | "shares") => void;
  inputAmount: string;
  onInputAmountChange: (value: string) => void;
  inputShares: string;
  onInputSharesChange: (value: string) => void;
  inputCost: string;
  onInputCostChange: (value: string) => void;
  onSubmit: () => void;
};

export const HoldingSheet = ({
  open,
  onClose,
  selectedFund,
  editMode,
  onEditModeChange,
  inputAmount,
  onInputAmountChange,
  inputShares,
  onInputSharesChange,
  inputCost,
  onInputCostChange,
  onSubmit,
}: HoldingSheetProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">更新持仓</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <button
              className={cn(
                "flex-1 py-2 text-sm rounded-md transition-colors",
                editMode === "amount" 
                  ? "bg-[var(--primary)] text-white" 
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              )}
              onClick={() => onEditModeChange("amount")}
            >
              按金额
            </button>
            <button
              className={cn(
                "flex-1 py-2 text-sm rounded-md transition-colors",
                editMode === "shares" 
                  ? "bg-[var(--primary)] text-white" 
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              )}
              onClick={() => onEditModeChange("shares")}
            >
              按份额
            </button>
          </div>

          {editMode === "amount" ? (
            <div className="space-y-1">
              <label className="text-xs text-[var(--muted-foreground)]">持有金额</label>
              <Input className="font-mono" value={inputAmount} onChange={(e) => onInputAmountChange(e.target.value)} placeholder="请输入金额" />
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-foreground)]">持有份额</label>
                <Input className="font-mono" value={inputShares} onChange={(e) => onInputSharesChange(e.target.value)} placeholder="请输入份额" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-foreground)]">持仓成本</label>
                <Input className="font-mono" value={inputCost} onChange={(e) => onInputCostChange(e.target.value)} placeholder="请输入成本" />
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
