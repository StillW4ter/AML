"use client";

/** Notifications inbox — renewal alerts and other in-app updates. */
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarClock, CheckCheck, Plus } from "lucide-react";
import { useI18n } from "./i18n";
import { relativeTime } from "./format";
import {
  markReadAction,
  markAllReadAction,
} from "@/app/crm/notifications/actions";
import type { NotificationRow } from "@/lib/crm/notifications";

function iconFor(type: string): typeof Bell {
  if (type === "renewal" || type === "renewal-deal") return CalendarClock;
  return Bell;
}

export function NotificationsView({
  notifications,
}: {
  notifications: NotificationRow[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = notifications.filter((n) => !n.readAt).length;

  function open(n: NotificationRow) {
    start(async () => {
      if (!n.readAt) await markReadAction(n.id);
      if (n.link) router.push(n.link);
      else router.refresh();
    });
  }

  function markAll() {
    start(async () => {
      await markAllReadAction();
      router.refresh();
    });
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e6e8ec] bg-white px-5">
        <Bell className="size-5 text-[#4f46e5]" />
        <div className="flex-1">
          <h1 className="text-[15px] font-bold leading-tight text-[#1f2430]">
            {t("notificationsTitle")}
          </h1>
          <p className="text-[11px] leading-tight text-[#9aa1ab]">
            {t("notificationsSubtitle")}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAll}
            disabled={pending}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#e6e8ec] bg-white px-3 text-[12.5px] font-semibold text-[#4b5563] hover:bg-[#f6f7f9] disabled:opacity-50"
          >
            <CheckCheck className="size-4" />
            {t("markAllRead")}
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f7f9] p-5">
        <div className="mx-auto max-w-2xl">
          {notifications.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#e6e8ec] bg-white py-12 text-center text-[13px] text-[#9aa1ab]">
              {t("noNotificationsYet")}
            </p>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const Icon = iconFor(n.type);
                const unreadStyle = !n.readAt
                  ? "border-[#c7cbff] bg-white"
                  : "border-[#e6e8ec] bg-white/60";
                return (
                  <button
                    key={n.id}
                    onClick={() => open(n)}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition hover:border-[#4f46e5] hover:bg-white ${unreadStyle}`}
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                        !n.readAt
                          ? "bg-[#eef2ff] text-[#4f46e5]"
                          : "bg-[#f0f1f4] text-[#9aa1ab]"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-[13px] ${
                            !n.readAt
                              ? "font-bold text-[#1f2430]"
                              : "font-semibold text-[#4b5563]"
                          }`}
                        >
                          {n.title}
                        </p>
                        <span className="shrink-0 text-[11px] text-[#9aa1ab]">
                          {relativeTime(n.createdAt)}
                        </span>
                      </div>
                      {n.body && (
                        <p className="mt-0.5 truncate text-[12px] text-[#6b7280]">
                          {n.body}
                        </p>
                      )}
                    </div>
                    {!n.readAt && (
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-[#4f46e5]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
