import { cn } from "../../lib/utils";

interface AutoPlayVideoProps {
  src: string;
  poster?: string;
  className?: string;
  rounded?: string;
}

/**
 * AutoPlayVideo - 自动播放循环静音视频
 * 用于功能演示，无需用户点击
 * muted + playsInline 确保移动端也能自动播放
 */
export function AutoPlayVideo({ src, poster, className, rounded = "rounded-xl" }: AutoPlayVideoProps) {
  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      poster={poster}
      src={src}
      className={cn("w-full border border-border", rounded, className)}
    />
  );
}
