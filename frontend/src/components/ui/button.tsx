import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[#1f382d]",
        destructive: "border-[var(--destructive)] bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[#5d2824]",
        outline: "border-input bg-transparent text-foreground hover:bg-[var(--accent)]",
        secondary: "border-[var(--border)] bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[#cfc4b3]",
        ghost: "border-transparent bg-transparent text-foreground hover:bg-[var(--accent)]",
        link: "border-transparent bg-transparent px-0 text-[var(--primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
