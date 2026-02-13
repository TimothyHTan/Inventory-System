"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import ExcelJS from "exceljs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ── R2 Client ────────────────────────────────────────────────────

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

// ── Indonesian month names ───────────────────────────────────────

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatMonthDisplay(month: string): string {
  const [year, m] = month.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} ${year}`;
}

function formatDateDay(dateStr: string): string {
  // "2026-01-15" → "15/1"
  const [, m, d] = dateStr.split("-");
  return `${parseInt(d)}/${parseInt(m)}`;
}

// ── Excel styling constants ──────────────────────────────────────

const CARBON_BG: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF13110E" },
};

const HEADER_BG: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF2C2520" },
};

const SUBHEADER_BG: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1C1915" },
};

const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF3A3530" } },
  left: { style: "thin", color: { argb: "FF3A3530" } },
  bottom: { style: "thin", color: { argb: "FF3A3530" } },
  right: { style: "thin", color: { argb: "FF3A3530" } },
};

const FONT_TITLE: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 14,
  bold: true,
  color: { argb: "FFD4915C" },
};
const FONT_PRODUCT: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 11,
  bold: true,
  color: { argb: "FFF0EDE6" },
};
const FONT_SUBTITLE: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 9,
  italic: true,
  color: { argb: "FF88806F" },
};
const FONT_COL_HEADER: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 10,
  bold: true,
  color: { argb: "FFD4915C" },
};
const FONT_DATA: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 10,
  color: { argb: "FFF0EDE6" },
};
const FONT_MASUK: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 10,
  color: { argb: "FF7B9E6B" },
};
const FONT_KELUAR: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 10,
  color: { argb: "FFC75C5C" },
};
const FONT_SISA: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 10,
  bold: true,
  color: { argb: "FFD4915C" },
};

// ── Helper: apply bg + border to a row range ─────────────────────

function styleRow(
  sheet: ExcelJS.Worksheet,
  rowNum: number,
  fill: ExcelJS.FillPattern,
  cols: number = 5
) {
  const row = sheet.getRow(rowNum);
  for (let i = 1; i <= cols; i++) {
    row.getCell(i).fill = fill;
    row.getCell(i).border = BORDER;
  }
}

// ── Main generate action ─────────────────────────────────────────

export const generateReport = internalAction({
  args: {
    organizationId: v.id("organizations"),
    month: v.string(),
    generatedBy: v.optional(v.id("users")),
    productId: v.optional(v.id("products")),
    productName: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, month, generatedBy, productId, productName }) => {
    // 1. Create "generating" record
    const reportId = await ctx.runMutation(internal.reports.createReport, {
      organizationId,
      month,
      generatedBy,
      productId,
      productName,
    });

    try {
      // 2. Fetch data
      const data = await ctx.runQuery(internal.reports.getExportData, {
        organizationId,
        month,
        productId,
      });

      if (!data?.org) throw new Error("Organisasi tidak ditemukan");

      const orgSlug = data.org.slug;
      const orgName = data.org.name;
      let totalTransactions = 0;

      // 3. Create workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "StockCard";
      workbook.created = new Date();

      if (data.productData.length === 0) {
        const sheet = workbook.addWorksheet("Tidak Ada Data");
        sheet.getCell("A1").value = `Tidak ada transaksi untuk ${formatMonthDisplay(month)}`;
        sheet.getCell("A1").font = FONT_DATA;
      }

      // 4. One sheet per product
      for (const { product, transactions, openingBalance } of data.productData) {
        const sheetName = product.name
          .replace(/[\\/*?[\]:]/g, "")
          .substring(0, 31);

        const sheet = workbook.addWorksheet(sheetName);
        sheet.columns = [
          { key: "tgl", width: 10 },
          { key: "keterangan", width: 36 },
          { key: "masuk", width: 12 },
          { key: "keluar", width: 12 },
          { key: "sisa", width: 12 },
        ];

        let row = 1;

        // ── Row 1: Title "KARTU STOCK" ──
        sheet.mergeCells(`A${row}:E${row}`);
        const titleCell = sheet.getCell(`A${row}`);
        titleCell.value = "KARTU STOCK";
        titleCell.font = FONT_TITLE;
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        titleCell.fill = HEADER_BG;
        sheet.getRow(row).height = 28;
        styleRow(sheet, row, HEADER_BG);
        row++;

        // ── Row 2: Product name ──
        sheet.mergeCells(`A${row}:E${row}`);
        const nameCell = sheet.getCell(`A${row}`);
        nameCell.value = `NAMA BARANG: ${product.name}`;
        nameCell.font = FONT_PRODUCT;
        nameCell.fill = SUBHEADER_BG;
        nameCell.alignment = { vertical: "middle" };
        sheet.getRow(row).height = 22;
        styleRow(sheet, row, SUBHEADER_BG);
        row++;

        // ── Row 3: Month + Org ──
        sheet.mergeCells(`A${row}:E${row}`);
        const monthCell = sheet.getCell(`A${row}`);
        monthCell.value = `${formatMonthDisplay(month)} — ${orgName}`;
        monthCell.font = FONT_SUBTITLE;
        monthCell.fill = SUBHEADER_BG;
        sheet.getRow(row).height = 18;
        styleRow(sheet, row, SUBHEADER_BG);
        row++;

        // ── Row 4: Column headers ──
        const headers = ["TGL", "KETERANGAN", "MASUK", "KELUAR", "SISA"];
        const headerRow = sheet.getRow(row);
        headers.forEach((h, i) => {
          const cell = headerRow.getCell(i + 1);
          cell.value = h;
          cell.font = FONT_COL_HEADER;
          cell.fill = HEADER_BG;
          cell.alignment = {
            horizontal: i >= 2 ? "right" : "left",
            vertical: "middle",
          };
          cell.border = BORDER;
        });
        headerRow.height = 22;
        row++;

        // ── Row 5: Stok Awal ──
        const openRow = sheet.getRow(row);
        openRow.getCell(1).value = "";
        openRow.getCell(2).value = "Stok awal bulan";
        openRow.getCell(2).font = { ...FONT_DATA, italic: true };
        openRow.getCell(3).value = "";
        openRow.getCell(4).value = "";
        openRow.getCell(5).value = openingBalance;
        openRow.getCell(5).font = FONT_SISA;
        openRow.getCell(5).numFmt = "#,##0";
        openRow.getCell(5).alignment = { horizontal: "right" };
        styleRow(sheet, row, CARBON_BG);
        row++;

        // ── Transaction rows ──
        let prevDate = "";
        for (const tx of transactions) {
          const r = sheet.getRow(row);
          totalTransactions++;

          // TGL: only show if different from previous
          const showDate = tx.date !== prevDate;
          r.getCell(1).value = showDate ? formatDateDay(tx.date) : "";
          r.getCell(1).font = FONT_DATA;
          r.getCell(1).alignment = { horizontal: "center" };
          prevDate = tx.date;

          // KETERANGAN
          r.getCell(2).value = tx.description;
          r.getCell(2).font = FONT_DATA;

          // MASUK
          if (tx.type === "in") {
            r.getCell(3).value = tx.quantity;
            r.getCell(3).font = FONT_MASUK;
            r.getCell(3).numFmt = "#,##0";
          }
          r.getCell(3).alignment = { horizontal: "right" };

          // KELUAR
          if (tx.type === "out") {
            r.getCell(4).value = tx.quantity;
            r.getCell(4).font = FONT_KELUAR;
            r.getCell(4).numFmt = "#,##0";
          }
          r.getCell(4).alignment = { horizontal: "right" };

          // SISA
          r.getCell(5).value = tx.runningBalance;
          r.getCell(5).font = FONT_SISA;
          r.getCell(5).numFmt = "#,##0";
          r.getCell(5).alignment = { horizontal: "right" };

          styleRow(sheet, row, CARBON_BG);
          row++;
        }

        // ── TOTAL row ──
        const totalRow = sheet.getRow(row);
        sheet.mergeCells(`A${row}:B${row}`);
        totalRow.getCell(1).value = "TOTAL";
        totalRow.getCell(1).font = FONT_COL_HEADER;
        totalRow.getCell(1).alignment = {
          horizontal: "right",
          vertical: "middle",
        };

        const totalMasuk = transactions
          .filter((t) => t.type === "in")
          .reduce((s, t) => s + t.quantity, 0);
        const totalKeluar = transactions
          .filter((t) => t.type === "out")
          .reduce((s, t) => s + t.quantity, 0);
        const lastBalance =
          transactions.length > 0
            ? transactions[transactions.length - 1].runningBalance
            : openingBalance;

        totalRow.getCell(3).value = totalMasuk || "";
        totalRow.getCell(3).font = FONT_MASUK;
        totalRow.getCell(3).numFmt = "#,##0";
        totalRow.getCell(3).alignment = { horizontal: "right" };

        totalRow.getCell(4).value = totalKeluar || "";
        totalRow.getCell(4).font = FONT_KELUAR;
        totalRow.getCell(4).numFmt = "#,##0";
        totalRow.getCell(4).alignment = { horizontal: "right" };

        totalRow.getCell(5).value = lastBalance;
        totalRow.getCell(5).font = FONT_SISA;
        totalRow.getCell(5).numFmt = "#,##0";
        totalRow.getCell(5).alignment = { horizontal: "right" };

        styleRow(sheet, row, HEADER_BG);

        // Freeze header rows
        sheet.views = [{ state: "frozen", ySplit: 4 }];
      }

      // 5. Write to buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const uint8 = new Uint8Array(buffer);

      // 6. Upload to R2
      const r2 = getR2Client();
      const safeName = productName?.replace(/[\\/*?[\]:]/g, "").replace(/\s+/g, "-") ?? "";
      const fileKey = productId
        ? `${orgSlug}/${month}-${safeName}.xlsx`
        : `${orgSlug}/${month}.xlsx`;
      const downloadName = productName
        ? `Kartu Stock - ${productName} - ${formatMonthDisplay(month)}.xlsx`
        : `Kartu Stock - ${formatMonthDisplay(month)}.xlsx`;

      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: fileKey,
          Body: uint8,
          ContentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ContentDisposition: `attachment; filename="${downloadName}"`,
        })
      );

      const fileUrl = `${process.env.R2_PUBLIC_URL}/${fileKey}`;

      // 7. Mark completed
      await ctx.runMutation(internal.reports.markCompleted, {
        reportId,
        fileKey,
        fileUrl,
        fileSize: uint8.length,
        productCount: data.productData.length,
        transactionCount: totalTransactions,
      });
    } catch (error) {
      await ctx.runMutation(internal.reports.markFailed, {
        reportId,
        error:
          error instanceof Error ? error.message : "Gagal membuat laporan",
      });
      throw error;
    }
  },
});

// ── Delete a report from R2 + database ───────────────────────────

export const deleteReport = internalAction({
  args: {
    reportId: v.id("reports"),
    fileKey: v.optional(v.string()),
  },
  handler: async (ctx, { reportId, fileKey }) => {
    // Delete from R2 if file exists
    if (fileKey) {
      try {
        const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
        const r2 = getR2Client();
        await r2.send(
          new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: fileKey,
          })
        );
      } catch (e) {
        console.error("Failed to delete from R2:", e);
      }
    }

    // Delete DB record
    await ctx.runMutation(internal.reports.deleteRecord, { reportId });
  },
});

// ── Cron entry point: generate for all organizations ─────────────

export const generateAllMonthlyReports = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

    const orgs = await ctx.runQuery(
      internal.reports.listAllOrganizations,
      {}
    );

    for (const org of orgs) {
      try {
        await ctx.runAction(internal.reportActions.generateReport, {
          organizationId: org._id,
          month,
        });
      } catch (e) {
        console.error(`Failed report for org ${org.slug}:`, e);
      }
    }
  },
});
