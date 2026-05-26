"use client";

/** Contacts — a searchable directory of every person in the CRM. */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Search } from "lucide-react";
import { useI18n } from "./i18n";
import { initials, avatarTint } from "./format";
import type { ContactDTO } from "@/lib/crm/queries";

export function ContactsView({ contacts }: { contacts: ContactDTO[] }) {
  const { t, loc } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      `${c.name} ${c.nameKa ?? ""} ${c.email ?? ""} ${c.phone ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [contacts, query]);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e6e8ec] bg-white px-5">
        <Users className="size-5 text-[#4f46e5]" />
        <div>
          <h1 className="text-[15px] font-bold leading-tight text-[#1f2430]">
            {t("contactsTitle")}
          </h1>
          <p className="text-[11px] leading-tight text-[#9aa1ab]">
            {contacts.length} · {t("contactsSubtitle")}
          </p>
        </div>
        <div className="ml-auto flex h-9 w-64 items-center gap-2 rounded-lg border border-[#e6e8ec] bg-[#f6f7f9] px-3 focus-within:border-[#4f46e5]">
          <Search className="size-4 text-[#9aa1ab]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchContacts")}
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#9aa1ab]"
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f6f7f9] p-5">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-[#e6e8ec] bg-white">
          <table className="w-full border-separate border-spacing-0 text-[13px]">
            <thead className="bg-[#fafbfc] text-[11px] uppercase tracking-wide text-[#9aa1ab]">
              <tr>
                <Th>{t("name")}</Th>
                <Th>{t("phone")}</Th>
                <Th>{t("email")}</Th>
                <Th>{t("city")}</Th>
                <Th>{t("source")}</Th>
                <Th align="right">{t("totalDeals")}</Th>
                <Th align="right">{t("openLabel")}</Th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-10 text-center text-[12px] text-[#9aa1ab]"
                  >
                    {t("noContacts")}
                  </td>
                </tr>
              )}
              {visible.map((c) => {
                const tint = avatarTint(c.name);
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/crm/contacts/${c.id}`)}
                    className="cursor-pointer border-t border-[#f1f2f4] hover:bg-[#fafbfc]"
                  >
                    <td className="border-t border-[#f1f2f4] px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold"
                          style={{ backgroundColor: tint.bg, color: tint.fg }}
                        >
                          {initials(c.name)}
                        </span>
                        <span className="font-semibold text-[#1f2430]">
                          {loc(c.name, c.nameKa)}
                        </span>
                      </div>
                    </td>
                    <td className="border-t border-[#f1f2f4] px-3 py-2.5 text-[#6b7280]">
                      {c.phone ?? "—"}
                    </td>
                    <td className="border-t border-[#f1f2f4] px-3 py-2.5 text-[#6b7280]">
                      {c.email ?? "—"}
                    </td>
                    <td className="border-t border-[#f1f2f4] px-3 py-2.5 text-[#6b7280]">
                      {loc(c.city, c.cityKa) || "—"}
                    </td>
                    <td className="border-t border-[#f1f2f4] px-3 py-2.5">
                      {c.source ? (
                        <span className="rounded border border-[#e6e8ec] px-1.5 py-0.5 text-[11px] text-[#9aa1ab]">
                          {c.source}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="border-t border-[#f1f2f4] px-3 py-2.5 text-right font-semibold text-[#1f2430]">
                      {c.dealCount}
                    </td>
                    <td className="border-t border-[#f1f2f4] px-3 py-2.5 text-right">
                      {c.openCount > 0 ? (
                        <span className="rounded-md bg-[#eef2ff] px-1.5 py-0.5 text-[11px] font-semibold text-[#4f46e5]">
                          {c.openCount}
                        </span>
                      ) : (
                        <span className="text-[#9aa1ab]">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-3 py-2.5 font-semibold ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
