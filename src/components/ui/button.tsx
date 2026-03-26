import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "btn-gradient-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:brightness-110 border border-primary/30",
        destructive: "bg-gradient-to-b from-destructive to-destructive/80 text-destructive-foreground shadow-lg shadow-destructive/20 hover:shadow-xl hover:brightness-110 border border-destructive/30",
        outline: "border border-white/[0.12] bg-white/[0.04] backdrop-blur-xl hover:bg-white/[0.08] hover:border-primary/30 text-foreground shadow-sm hover:shadow-md",
        secondary: "bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] text-foreground shadow-sm hover:bg-white/[0.10] hover:shadow-md",
        ghost: "hover:bg-white/[0.06] hover:text-foreground text-foreground/80",
        link: "text-primary underline-offset-4 hover:underline",
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
