"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

interface HamburgerMenuProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function HamburgerMenu({ isOpen, onToggle }: HamburgerMenuProps) {
  return (
    <button
      onClick={onToggle}
      className="relative w-10 h-10 flex items-center justify-center focus:outline-none"
      aria-label="Toggle menu"
      aria-expanded={isOpen}
    >
      <div className="w-6 h-6 flex flex-col justify-center items-center gap-1.5">
        {/* Top bar */}
        <motion.span
          className="block w-full h-0.5 rounded-sm bg-copper shadow-sm"
          animate={{
            rotate: isOpen ? 45 : 0,
            y: isOpen ? 8 : 0,
          }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
          }}
        />

        {/* Middle bar */}
        <motion.span
          className="block w-full h-0.5 rounded-sm bg-copper shadow-sm"
          animate={{
            scale: isOpen ? 0 : 1,
          }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
          }}
        />

        {/* Bottom bar */}
        <motion.span
          className="block w-full h-0.5 rounded-sm shadow-sm"
          animate={{
            rotate: isOpen ? 135 : 0,
            y: isOpen ? -8 : 0,
            backgroundColor: isOpen ? "rgb(199, 92, 92)" : "rgb(212, 145, 92)", // rust : copper
          }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      </div>
    </button>
  );
}

interface MobileMenuDropdownProps {
  isOpen: boolean;
  children: React.ReactNode;
}

export function MobileMenuDropdown({ isOpen, children }: MobileMenuDropdownProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="overflow-hidden"
        >
          <div className="bg-carbon-800/95 backdrop-blur-md border-t border-carbon-700/40">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
