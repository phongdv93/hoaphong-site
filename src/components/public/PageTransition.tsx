"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

const ease = [0.4, 0, 0.2, 1] as const;

/** Chuyển trang public: fade + scale nhẹ (~500ms) */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.985 }}
        transition={{ duration: 0.5, ease }}
        className="flex flex-col flex-1 min-h-0 w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
