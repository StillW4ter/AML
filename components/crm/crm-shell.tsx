"use client";

/** Shared CRM shell: language provider + sidebar, wrapping every /crm page. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  BarChart3,
  Users,
  UsersRound,
  CalendarClock,
  Bell,
  Activity,
  MessageSquare,
  Settings,
  ShieldCheck,
  Languages,
  LogOut,
} from "lucide-react";
import { LangProvider, useI18n } from "./i18n";
import { signOutAction } from "@/app/login/actions";
import { initials, avatarTint } from "./format";
import { LANGS, LANG_LABEL, LANG_SHORT, type Lang, type TKey } from "@/lib/i18n";

export interface ShellUser {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

export function CrmShell({
  user,
  unread = 0,
  children,
}: {
  user: ShellUser;
  unread?: number;
  children: React.ReactNode;
}) {
  return (
    <LangProvider initial="en">
      <div className="flex h-full font-sans">
        <Sidebar user={user} unread={unread} />
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </LangProvider>
  );
}

interface NavItem {
  href: string;
  icon: typeof LayoutGrid;
  label: TKey;
  enabled: boolean;
  managerOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: "/crm", icon: LayoutGrid, label: "navPipeline", enabled: true },
  { href: "/crm/reports", icon: BarChart3, label: "navReports", enabled: true },
  { href: "/crm/contacts", icon: Users, label: "navContacts", enabled: true },
  {
    href: "/crm/assign",
    icon: UsersRound,
    label: "navAssign",
    enabled: true,
    managerOnly: true,
  },
  { href: "/crm/renewals", icon: CalendarClock, label: "navRenewals", enabled: true },
  { href: "/crm/notifications", icon: Bell, label: "navNotifications", enabled: true },
  { href: "/crm/activity", icon: Activity, label: "navActivity", enabled: false },
  { href: "/crm/messages", icon: MessageSquare, label: "navMessages", enabled: false },
  { href: "/crm/settings", icon: Settings, label: "navSettings", enabled: true },
];

const MANAGER_ROLES = ["manager", "admin", "senior_agent"];

function prettyRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Sidebar({ user, unread }: { user: ShellUser; unread: number }) {
  const { t, lang, setLang } = useI18n();
  const pathname = usePathname();
  const tint = avatarTint(user.name);

  const isActive = (href: string) =>
    href === "/crm" ? pathname === "/crm" : pathname.startsWith(href);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[#e6e8ec] bg-white lg:flex">
      <div className="flex h-14 items-center gap-2.5 border-b border-[#eef0f3] px-4">
        <span className="grid size-8 place-items-center rounded-lg bg-[#4f46e5] text-white">
          <ShieldCheck className="size-4" />
        </span>
        <div>
          <p className="text-[14px] font-bold leading-tight text-[#1f2430]">
            {t("brand")}
          </p>
          <p className="text-[11px] leading-tight text-[#9aa1ab]">
            Insurance {t("crm")}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-2.5">
        {NAV.filter(
          (item) => !item.managerOnly || MANAGER_ROLES.includes(user.role),
        ).map((item) => {
          const active = isActive(item.href);
          const content = (
            <>
              <item.icon className="size-4" />
              {t(item.label)}
              {item.href === "/crm/notifications" && unread > 0 && (
                <span className="ml-auto rounded-full bg-[#4f46e5] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
              {!item.enabled && (
                <span className="ml-auto rounded bg-[#f0f1f4] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#9aa1ab]">
                  {t("soon")}
                </span>
              )}
            </>
          );
          return item.enabled ? (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition ${
                active
                  ? "bg-[#eef2ff] text-[#4f46e5]"
                  : "text-[#6b7280] hover:bg-[#f6f7f9]"
              }`}
            >
              {content}
            </Link>
          ) : (
            <div
              key={item.href}
              className="flex h-9 w-full cursor-default items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-[#c2c6cd]"
            >
              {content}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[#eef0f3] p-2.5">
        <label className="mb-2 flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-[#6b7280] hover:bg-[#f6f7f9]">
          <Languages className="size-4" />
          <span className="flex-1">{LANG_LABEL[lang]}</span>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="cursor-pointer bg-transparent text-[11px] font-semibold text-[#9aa1ab] outline-none hover:text-[#4f46e5]"
          >
            {LANGS.map((code) => (
              <option key={code} value={code}>
                {LANG_SHORT[code]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2.5 rounded-lg bg-[#f6f7f9] p-2">
          <span
            className="grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold"
            style={{ backgroundColor: tint.bg, color: tint.fg }}
          >
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-[#1f2430]">
              {user.name}
            </p>
            <p className="truncate text-[10px] text-[#9aa1ab]">
              {prettyRole(user.role)}
            </p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              title="Sign out"
              className="grid size-7 place-items-center rounded-md text-[#9aa1ab] hover:bg-white hover:text-[#f43f5e]"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
