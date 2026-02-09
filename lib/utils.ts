/** Merge class names, filtering out falsy values */
export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ");
}

/** Format ISO date string to Indonesian display format: "5/2/2026" */
export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split("-");
  return `${parseInt(day)}/${parseInt(month)}/${year}`;
}

/** Format number with Indonesian locale separators: "5.102" */
export function formatNumber(num: number): string {
  return num.toLocaleString("id-ID");
}

/** Get today as ISO date string: "2026-02-09" */
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Get month string: "2026-02" */
export function getMonthString(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Get display name for a month: "Februari 2026" */
export function formatMonth(monthString: string): string {
  const [year, month] = monthString.split("-");
  const months = [
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
  return `${months[parseInt(month) - 1]} ${year}`;
}

/** Relative time in Indonesian: "2j lalu", "baru saja" */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "baru saja";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}h lalu`;
  const months = Math.floor(days / 30);
  return `${months}bl lalu`;
}
