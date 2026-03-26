import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Skeleton = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl bg-white/[0.06] relative overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer-slide_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  )
);
Skeleton.displayName = "Skeleton";

export { Skeleton };
