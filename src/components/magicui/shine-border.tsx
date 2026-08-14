import { cn } from "../../lib/utils";

interface ShineBorderProps {
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  color?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * ShineBorder - 闪光边框
 * 纯 CSS conic-gradient 动画
 */
export function ShineBorder({
  borderRadius = 16,
  borderWidth = 1,
  duration = 14,
  color = "oklch(0.52 0.18 250)",
  className,
  children,
}: ShineBorderProps) {
  return (
    <div
      style={
        {
          "--border-radius": `${borderRadius}px`,
          "--border-width": `${borderWidth}px`,
          "--duration": `${duration}s`,
          "--mask-linear-gradient": `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          "--background-radial-gradient": `radial-gradient(transparent,transparent, ${color},transparent,transparent)`,
        } as React.CSSProperties
      }
      className={cn(
        "relative grid w-fit place-items-center border-transparent bg-clip-padding",
        "before:pointer-events-none before:absolute before:inset-0 before:aspect-square before:h-full before:w-full before:rounded-[var(--border-radius)] before:p-[var(--border-width)] before:opacity-50 before:animate-shine-border",
        className,
      )}
    >
      {children}
    </div>
  );
}
