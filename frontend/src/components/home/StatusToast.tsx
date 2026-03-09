"use client";

import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusToastProps = {
  status: string;
};

const getStatusType = (message: string): "success" | "error" | "warning" | "info" => {
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes("成功") || lowerMsg.includes("已") || lowerMsg.includes("完成")) return "success";
  if (lowerMsg.includes("失败") || lowerMsg.includes("错误") || lowerMsg.includes("无效")) return "error";
  if (lowerMsg.includes("警告") || lowerMsg.includes("注意")) return "warning";
  return "info";
};

export const StatusToast = ({ status }: StatusToastProps) => {
  if (!status) return null;

  const type = getStatusType(status);
  const config = {
    success: { icon: CheckCircle2, className: "border-[var(--gain)] bg-[var(--gain)] text-[var(--gain-foreground)]" },
    error: { icon: XCircle, className: "border-[var(--loss)] bg-[var(--loss)] text-[var(--loss-foreground)]" },
    warning: { icon: AlertCircle, className: "border-[#7b5b1e] bg-[#7b5b1e] text-[#f7f3eb]" },
    info: { icon: Info, className: "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]" },
  };

  const { icon: Icon, className } = config[type];

  return (
    <div className={cn("fixed bottom-6 right-6 z-50 flex items-center gap-3 border px-4 py-3 shadow-[var(--panel-shadow)]", className)}>
      <Icon className="h-4 w-4" />
      <span className="text-sm">{status}</span>
    </div>
  );
};
