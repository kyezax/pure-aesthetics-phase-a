// Pure Aesthetics admin design tokens (Phase A)
export const COLORS = {
  primary: "#a9c4d7",
  primaryDark: "#7fa3bc",
  secondary: "#4b1a29",
  accent: "#0F6E56",
  bg: "#f9f9f9",
  textPrimary: "#1a1a1a",
  textSecondary: "#666666",
  border: "#e0e0e0",
};

export const CATEGORY_COLOR_PALETTE = [
  { name: "Soft blue", value: "#a9c4d7" },
  { name: "Burgundy", value: "#4b1a29" },
  { name: "Teal", value: "#0F6E56" },
  { name: "Coral", value: "#FF6B6B" },
  { name: "Gold", value: "#FFD700" },
  { name: "Lavender", value: "#C8B6FF" },
  { name: "Mint", value: "#B3E5B1" },
  { name: "Peach", value: "#FFB8A3" },
  { name: "Sky", value: "#87CEEB" },
  { name: "Rose", value: "#E8B4C8" },
  { name: "Grey", value: "#999999" },
  { name: "Slate", value: "#708090" },
];

export const STATUS_STYLES = {
  active: { label: "Active", bg: "#e6f4ef", text: "#0F6E56" },
  hidden: { label: "Hidden", bg: "#f1f1f1", text: "#666666" },
  archived: { label: "Archived", bg: "#ececec", text: "#555555" },
  draft: { label: "Draft", bg: "#f1f1f1", text: "#666666" },
  scheduled: { label: "Scheduled", bg: "#fff4d6", text: "#8a6d00" },
};

export const formatMoney = (cents, currency = "AUD") => {
  if (cents === null || cents === undefined) return "-";
  const symbol = { AUD: "$", USD: "$", NZD: "$", CAD: "$", GBP: "£", EUR: "€" }[currency] || "$";
  return `${symbol}${(cents / 100).toFixed(2)}`;
};

export const timeAgo = (isoString) => {
  if (!isoString) return "";
  const then = new Date(isoString).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
};
