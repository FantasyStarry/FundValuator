import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
  {
    variants: {
      variant: {
        default: "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]",
        secondary: "border-[var(--border)] bg-[var(--secondary)] text-[var(--secondary-foreground)]",
        destructive: "border-[var(--destructive)] bg-[var(--destructive)] text-[var(--destructive-foreground)]",
        outline: "border-[var(--border)] bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
