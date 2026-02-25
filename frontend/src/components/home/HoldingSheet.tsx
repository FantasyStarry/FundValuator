import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/20 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <Card className="w-full max-w-md bg-card border-border shadow-[0_8px_40px_rgba(0,0,0,0.12)] animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle>持仓更新</CardTitle>
          <CardDescription className="font-mono text-xs mt-1">{selectedFund ? `${selectedFund.name} · ${selectedFund.code}` : "请选择基金"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-2 gap-4 p-1 bg-muted/40 rounded-lg">
            <label className={cn("flex items-center justify-center gap-2 cursor-pointer py-2 rounded-md transition-all", editMode === "amount" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}>
              <input type="radio" className="hidden" checked={editMode === "amount"} onChange={() => onEditModeChange("amount")} />
              <span className="text-sm font-medium">按金额</span>
            </label>
            <label className={cn("flex items-center justify-center gap-2 cursor-pointer py-2 rounded-md transition-all", editMode === "shares" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}>
              <input type="radio" className="hidden" checked={editMode === "shares"} onChange={() => onEditModeChange("shares")} />
              <span className="text-sm font-medium">按份额</span>
            </label>
          </div>

          <div className="space-y-4">
            {editMode === "amount" ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">持有金额</label>
                <Input className="font-mono" value={inputAmount} onChange={(e) => onInputAmountChange(e.target.value)} placeholder="当前市值" />
                <p className="text-[10px] text-muted-foreground">通过交易记录自动计算成本和收益</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">持有份额</label>
                  <Input className="font-mono" value={inputShares} onChange={(e) => onInputSharesChange(e.target.value)} placeholder="请输入份额" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">持仓成本</label>
                  <Input className="font-mono" value={inputCost} onChange={(e) => onInputCostChange(e.target.value)} placeholder="请输入成本单价" />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button onClick={onSubmit}>确认更新</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
