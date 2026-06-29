import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition duration-500 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "relative overflow-hidden bg-primary text-primary-foreground shadow-[0_18px_46px_rgba(55,52,48,0.18)] before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.18),transparent)] before:transition before:duration-700 hover:-translate-y-0.5 hover:bg-primary/92 hover:before:translate-x-full",
        secondary:
          "border border-border bg-card/70 text-foreground shadow-sm backdrop-blur-xl hover:-translate-y-0.5 hover:border-bronze/40 hover:bg-secondary/80 hover:shadow-[0_14px_38px_rgba(75,67,56,0.12)]",
        ghost: "text-foreground hover:bg-secondary/70",
        bronze:
          "relative overflow-hidden bg-bronze text-white shadow-[0_18px_46px_rgba(155,132,101,0.24)] before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.22),transparent)] before:transition before:duration-700 hover:-translate-y-0.5 hover:bg-bronze/90 hover:before:translate-x-full",
        icon: "h-11 w-11 rounded-full border border-border bg-card/70 p-0 shadow-sm backdrop-blur-xl hover:-translate-y-0.5 hover:border-bronze/50 hover:bg-secondary/80",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-[52px] px-7 text-base",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
