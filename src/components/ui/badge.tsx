import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition",
  {
    variants: {
      variant: {
        default: "border-border bg-card/75 text-foreground",
        bronze: "border-bronze/30 bg-bronze/10 text-bronze dark:text-sand",
        graphite: "border-graphite/20 bg-graphite/10 text-graphite dark:text-ivory",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
