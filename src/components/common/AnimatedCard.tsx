import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
  hover?: boolean;
}

export function AnimatedCard({ children, className, delay = 0, hover = true, ...props }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hover ? { y: -4 } : undefined}
      className={cn("panel", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
