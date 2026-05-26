/** Small presentation helpers for the CRM UI. */

const SYMBOLS: Record<string, string> = { GEL: "₾", USD: "$", EUR: "€", GBP: "£" };

export function money(
  amount: number | null | undefined,
  currency = "GEL",
): string {
  if (amount == null) return "—";
  const symbol = SYMBOLS[currency] ?? "";
  return `${symbol}${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** A stable, calm avatar color derived from a name. */
export function avatarTint(name: string): { bg: string; fg: string } {
  const palette = [
    { bg: "#eef2ff", fg: "#4338ca" },
    { bg: "#ecfdf5", fg: "#047857" },
    { bg: "#fef3c7", fg: "#b45309" },
    { bg: "#fce7f3", fg: "#be185d" },
    { bg: "#e0f2fe", fg: "#0369a1" },
    { bg: "#f3e8ff", fg: "#7e22ce" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}
