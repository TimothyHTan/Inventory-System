"use client";

import { motion, AnimatePresence } from "motion/react";
import { ReactNode } from "react";

interface AnimatedListItemProps {
  children: ReactNode;
  id: string;
  index?: number;
}

export function AnimatedListItem({ children, id, index = 0 }: AnimatedListItemProps) {
  return (
    <motion.div
      key={id}
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{
        duration: 0.2,
        delay: index * 0.03,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedListProps {
  children: ReactNode;
}

export function AnimatedList({ children }: AnimatedListProps) {
  return <AnimatePresence mode="popLayout">{children}</AnimatePresence>;
}
