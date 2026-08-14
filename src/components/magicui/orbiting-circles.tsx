import { motion } from "motion/react";
import { cn } from "../../lib/utils";

interface OrbitingCirclesProps {
  className?: string;
  children?: React.ReactNode;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
}

/**
 * OrbitingCircles - 环绕轨道动画
 * 子元素围绕中心点旋转
 */
export function OrbitingCircles({
  className,
  children,
  reverse = false,
  duration = 20,
  delay = 0,
  radius = 160,
  path = true,
}: OrbitingCirclesProps) {
  return (
    <>
      {path && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <circle
            className="stroke-border/40 stroke-1 fill-none"
            cx="50%"
            cy="50%"
            r={radius}
          />
        </svg>
      )}
      <motion.div
        style={
          {
            "--duration": `${duration}s`,
            "--radius": `${radius}px`,
          } as React.CSSProperties
        }
        className={cn(
          "absolute flex size-full transform-gpu items-center justify-center",
          className,
        )}
        animate={{ rotate: reverse ? -360 : 360 }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
          delay,
        }}
      >
        <div
          className="absolute"
          style={{
            transform: `translateY(calc(var(--radius) * -1))`,
          }}
        >
          {children}
        </div>
      </motion.div>
    </>
  );
}
