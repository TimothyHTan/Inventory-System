"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { motion } from "motion/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn, getTodayString } from "@/lib/utils";

interface TransactionFormProps {
  productId: Id<"products">;
  currentStock: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TransactionForm({
  productId,
  currentStock,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const [type, setType] = useState<"in" | "out">("out");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(getTodayString());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const addTransaction = useMutation(api.transactions.add);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      setError("Jumlah harus lebih dari 0");
      return;
    }
    if (!description.trim()) {
      setError("Keterangan harus diisi");
      return;
    }
    if (!date) {
      setError("Tanggal harus diisi");
      return;
    }
    if (type === "out" && qty > currentStock) {
      setError(`Stok tidak cukup. Sisa: ${currentStock}`);
      return;
    }

    setLoading(true);
    try {
      await addTransaction({
        productId,
        type,
        quantity: qty,
        description: description.trim(),
        date,
      });
      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  // Success state with checkmark animation
  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-12 h-12 rounded-full bg-sage/15 border border-sage/30 flex items-center justify-center mb-3"
        >
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="text-sage"
          >
            <motion.path
              d="M5 10l3.5 3.5L15 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            />
          </motion.svg>
        </motion.div>
        <p className="text-sm text-sage font-medium">Tersimpan</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type Toggle — MASUK / KELUAR */}
      <div className="space-y-1.5">
        <label className="block text-xs uppercase tracking-wider text-carbon-300 font-medium">
          Tipe
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("in")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium rounded-sm border transition-all duration-150",
              type === "in"
                ? "bg-sage/12 border-sage/40 text-sage"
                : "bg-carbon-800 border-carbon-600/30 text-carbon-400 hover:text-carbon-200 hover:border-carbon-500/40"
            )}
          >
            <span className="flex items-center justify-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 2v10M2 7h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              MASUK
            </span>
          </button>
          <button
            type="button"
            onClick={() => setType("out")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium rounded-sm border transition-all duration-150",
              type === "out"
                ? "bg-rust/12 border-rust/40 text-rust"
                : "bg-carbon-800 border-carbon-600/30 text-carbon-400 hover:text-carbon-200 hover:border-carbon-500/40"
            )}
          >
            <span className="flex items-center justify-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 7h10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              KELUAR
            </span>
          </button>
        </div>
      </div>

      {/* Quantity */}
      <Input
        label="Jumlah"
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="0"
        autoFocus
      />

      {/* Description / Keterangan */}
      <Input
        label="Keterangan"
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Nama pelanggan / supplier"
      />

      {/* Date */}
      <Input
        label="Tanggal"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-rust bg-rust/8 border border-rust/20 rounded-sm px-3 py-2"
        >
          {error}
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="flex-1"
        >
          Batal
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          Simpan
        </Button>
      </div>
    </form>
  );
}
