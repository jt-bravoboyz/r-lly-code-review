import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-[transform,box-shadow,border-color,filter,background] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden hover:-translate-y-[1px] active:scale-[0.96]",
  {
    variants: {
      variant: {
        default: "btn-gradient-primary text-white shadow-[0_4px_20px_hsl(22_90%_52%/0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_8px_30px_hsl(22_90%_52%/0.4),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-110 border border-white/20",
        destructive: "bg-gradient-to-b from-destructive/90 to-destructive/75 backdrop-blur-sm text-destructive-foreground shadow-[0_4px_20px_hsl(0_84%_50%/0.3),inset_0_1px_0_rgba(255,255,255,0.15)] hover:shadow-[0_8px_28px_hsl(0_84%_50%/0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-110 border border-white/15",
        outline: "btn-glass text-foreground hover:border-primary/30",
        secondary: "bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.10] hover:shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]",
        ghost: "hover:bg-white/[0.06] hover:text-foreground text-foreground/80",
        link: "text-primary underline-offset-4 hover:underline hover:translate-y-0",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-xl px-8",
        icon: "h-10 w-10",
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
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
