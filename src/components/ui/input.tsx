import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      className={cn(
        "focus-ring flex h-12 w-full rounded-full border border-border bg-card/75 px-5 py-2 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground hover:border-bronze/40",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
