import { motion } from "motion/react";
import { useRef } from "react";
import { cn } from "../../lib/utils";

interface AnimatedBeamProps {
  className?: string;
  duration?: number;
  pathId?: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * AnimatedBeam - 流动光束连接
 * 在两个坐标点之间绘制流动的渐变光束
 */
export function AnimatedBeam({
  className,
  duration = 3,
  pathId,
  x1 = 0,
  y1 = 0,
  x2 = 100,
  y2 = 100,
  color = "oklch(0.52 0.18 250)",
  strokeWidth = 2,
}: AnimatedBeamProps) {
  const id = useRef(pathId || `beam-${Math.random().toString(36).slice(2)}`);
  const gradientId = `${id.current}-gradient`;
  const maskId = `${id.current}-mask`;

  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      fill="none"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="50%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <mask id={maskId}>
          <motion.path
            d={`M ${x1} ${y1} L ${x2} ${y2}`}
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth * 3}
            strokeLinecap="round"
            initial={{ pathLength: 0, pathOffset: 0 }}
            animate={{ pathLength: 1, pathOffset: 1 }}
            transition={{
              duration,
              ease: "linear",
              repeat: Infinity,
            }}
          />
        </mask>
      </defs>
      <path
        d={`M ${x1} ${y1} L ${x2} ${y2}`}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeOpacity={0.15}
        strokeLinecap="round"
      />
      <path
        d={`M ${x1} ${y1} L ${x2} ${y2}`}
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}
