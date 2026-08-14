import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { BlurFade } from "./blur-fade";

interface BentoGridProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * BentoGrid - 交错入场动画网格容器
 */
export function BentoGrid({ className, children }: BentoGridProps) {
  return (
    <div className={cn("grid w-full auto-rows-[22rem] grid-cols-3 gap-4", className)}>
      {children}
    </div>
  );
}

interface BentoCardProps {
  name: string;
  className?: string;
  background?: React.ReactNode;
  Icon: React.ComponentType<{ className?: string }>;
  description: string;
  href: string;
  cta: string;
  index?: number;
}

/**
 * BentoCard - 单个 Bento 网格卡片
 * 带悬停效果和交错入场动画
 */
export function BentoCard({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  index = 0,
}: BentoCardProps) {
  return (
    <BlurFade delay={0.05 * index} inView inViewMargin="-50px">
      <div
        key={name}
        className={cn(
          "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
          "border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
          "md:col-span-1",
          className,
        )}
      >
        {/* 背景 */}
        <div className="absolute inset-0 -z-10">{background}</div>

        {/* 内容 */}
        <div className="relative z-10">
          <Icon className="h-8 w-8 origin-left transform-gpu text-primary transition-all duration-300 group-hover:scale-110" />
          <h3 className="mt-4 font-semibold">{name}</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-[90%]">{description}</p>
        </div>

        {/* CTA */}
        <motion.a
          href={href}
          className="relative z-10 mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-all duration-300 group-hover:opacity-100"
          whileHover={{ x: 2 }}
        >
          {cta} →
        </motion.a>

        {/* 悬停渐变遮罩 */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-primary-soft/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>
    </BlurFade>
  );
}
