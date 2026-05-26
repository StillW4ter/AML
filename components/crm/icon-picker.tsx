"use client";

/**
 * Lucide icon picker for the flow builder.
 *
 * Lucide-react ships hundreds of icons; surfacing them all is overwhelming
 * and slow. This picker exposes a curated, insurance-relevant set in a
 * searchable grid. Adding a new icon is a one-line addition to ICONS.
 *
 * When `value` is null/empty the picker shows a placeholder so the manager
 * can also leave a step iconless.
 */
import { useMemo, useState } from "react";
import {
  Car,
  Truck,
  Bus,
  Bike,
  Plane,
  Ship,
  Home,
  Building2,
  Hotel,
  Briefcase,
  ShieldCheck,
  Shield,
  Heart,
  HeartPulse,
  Stethoscope,
  Pill,
  Hospital,
  Activity,
  User,
  Users,
  UserPlus,
  Baby,
  Dog,
  Cat,
  PawPrint,
  Calendar,
  Clock,
  MapPin,
  Globe,
  Phone,
  Mail,
  MessageCircle,
  DollarSign,
  CreditCard,
  Wallet,
  PiggyBank,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Info,
  HelpCircle,
  Search,
  X,
  ImageIcon,
} from "lucide-react";

type LucideIcon = typeof Car;

export const ICONS: Record<string, LucideIcon> = {
  Car,
  Truck,
  Bus,
  Bike,
  Plane,
  Ship,
  Home,
  Building2,
  Hotel,
  Briefcase,
  ShieldCheck,
  Shield,
  Heart,
  HeartPulse,
  Stethoscope,
  Pill,
  Hospital,
  Activity,
  User,
  Users,
  UserPlus,
  Baby,
  Dog,
  Cat,
  PawPrint,
  Calendar,
  Clock,
  MapPin,
  Globe,
  Phone,
  Mail,
  MessageCircle,
  DollarSign,
  CreditCard,
  Wallet,
  PiggyBank,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Info,
  HelpCircle,
};

const ICON_NAMES = Object.keys(ICONS).sort();

/** Render a known icon by name; safe fallback if the name doesn't match. */
export function renderIcon(
  name: string | null | undefined,
  className?: string,
) {
  if (!name) return null;
  const Icon = ICONS[name];
  if (!Icon) return null;
  return <Icon className={className ?? "size-4"} />;
}

interface IconPickerProps {
  value: string | null;
  onChange: (next: string | null) => void;
  /** Show a compact button rather than the inline grid. */
  compact?: boolean;
}

export function IconPicker({ value, onChange, compact = true }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return ICON_NAMES;
    const needle = q.toLowerCase();
    return ICON_NAMES.filter((n) => n.toLowerCase().includes(needle));
  }, [q]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-[#e6e8ec] bg-white px-2.5 text-[12.5px] font-medium text-[#4b5563] hover:border-[#4f46e5] hover:text-[#4f46e5]"
      >
        {value && ICONS[value] ? (
          renderIcon(value, "size-4")
        ) : (
          <ImageIcon className="size-4 text-[#9aa1ab]" />
        )}
        {!compact && (
          <span className="text-[12px]">{value ?? "Pick icon"}</span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close icon picker"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default bg-black/10"
          />
          <div className="absolute left-0 top-full z-40 mt-1 w-64 rounded-xl border border-[#e6e8ec] bg-white p-2 shadow-lg">
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[#9aa1ab]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search icons"
                className="h-8 w-full rounded-md border border-[#e6e8ec] bg-white pl-7 pr-2 text-[12px] outline-none focus:border-[#4f46e5]"
              />
            </div>
            <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className={`grid size-8 place-items-center rounded-md text-[#9aa1ab] hover:bg-[#fef2f2] hover:text-[#f43f5e] ${
                  !value ? "bg-[#fef2f2] text-[#f43f5e]" : ""
                }`}
                title="No icon"
              >
                <X className="size-3.5" />
              </button>
              {filtered.map((name) => {
                const Icon = ICONS[name];
                const active = value === name;
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                    }}
                    className={`grid size-8 place-items-center rounded-md transition ${
                      active
                        ? "bg-[#eef2ff] text-[#4f46e5]"
                        : "text-[#4b5563] hover:bg-[#f6f7f9]"
                    }`}
                  >
                    <Icon className="size-4" />
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="col-span-6 py-4 text-center text-[11.5px] text-[#9aa1ab]">
                  No matches
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
