"use client";

import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusToastProps = {
  status: string;
};

// Determine status type based on content
const getStatusType = (message: string): "success" | "error" | "warning" | "info" => {
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes("成功") || lowerMsg.includes("已") || lowerMsg.includes("完成")) {
    return "success";
  }
  if (lowerMsg.includes("失败") || lowerMsg.includes("错误") || lowerMsg.includes("不存在")) {
    return "error";
  }
  if (lowerMsg.includes("警告") || lowerMsg.includes("注意")) {
    return "warning";
  }
  return "info";
};

export const StatusToast = ({ status }: StatusToastProps) => {
  if (!status) return null;

  const type = getStatusType(status);

  const config = {
    success: {
      icon: CheckCircle2,
      className: "bg-[var(--gain)] text-[var(--gain-foreground)] shadow-[0_8px_32px_rgba(0,214,125,0.3)]",
      iconClass: "text-[var(--gain-foreground)]",
    },
    error: {
      icon: XCircle,
      className: "bg-[var(--loss)] text-[var(--loss-foreground)] shadow-[0_8px_32px_rgba(255,92,92,0.3)]",
      iconClass: "text-[var(--loss-foreground)]",
    },
    warning: {
      icon: AlertCircle,
      className: "bg-amber-500 text-white shadow-[0_8px_32px_rgba(245,158,11,0.3)]",
      iconClass: "text-white",
    },
    info: {
      icon: Info,
      className: "bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
      iconClass: "text-[var(--primary)]",
    },
  };

  const { icon: Icon, className, iconClass } = config[type];

  return (
    <div className={cn(
      "fixed bottom-6 right-6 px-5 py-3.5 rounded-xl z-50",
      "animate-in fade-in slide-in-from-bottom-4 duration-300",
      "flex items-center gap-3",
      "backdrop-blur-sm",
      className
    )}>
      <Icon className={cn("w-5 h-5", iconClass)} />
      <span className="text-sm font-medium tracking-wide">{status}</span>
    </div>
  );
};