"use client";

import { motion, AnimatePresence } from "motion/react";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="w-full max-w-md pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-carbon-800 border-2 border-carbon-700/60 rounded-sm shadow-2xl overflow-hidden">
                {/* Warning stripe */}
                <div className={`h-1 ${
                  variant === "danger"
                    ? "bg-gradient-to-r from-rust via-rust/80 to-transparent"
                    : "bg-gradient-to-r from-copper via-copper/80 to-transparent"
                }`} />

                {/* Content */}
                <div className="p-6">
                  {/* Icon */}
                  <div className="flex items-center justify-center mb-4">
                    <div className={`w-12 h-12 rounded-sm flex items-center justify-center ${
                      variant === "danger"
                        ? "bg-rust/10 border-2 border-rust/30"
                        : "bg-copper/10 border-2 border-copper/30"
                    }`}>
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        className={variant === "danger" ? "text-rust" : "text-copper"}
                      >
                        <path
                          d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-display text-xl text-center text-carbon-50 mb-2">
                    {title}
                  </h3>

                  {/* Message */}
                  <p className="text-sm text-center text-carbon-300 mb-6 leading-relaxed">
                    {message}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={onClose}
                      disabled={loading}
                      className="flex-1"
                    >
                      {cancelText}
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      onClick={onConfirm}
                      loading={loading}
                      className="flex-1"
                    >
                      {confirmText}
                    </Button>
                  </div>
                </div>

                {/* Bottom accent line */}
                <div className="h-px bg-gradient-to-r from-transparent via-carbon-600/30 to-transparent" />
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
