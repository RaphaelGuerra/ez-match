import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 bg-white/85 p-4 shadow-sm backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}
