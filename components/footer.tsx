import { GitBranch, Link2, Mail, Phone, Rss, ShieldCheck, X } from "lucide-react";

const LINK_GROUPS = [
  {
    title: "Insurance",
    links: ["Car", "Travel", "Home", "Health", "Mortgage", "Pet"],
  },
  {
    title: "Company",
    links: ["About", "Partners", "Press", "Careers", "Blogs"],
  },
  {
    title: "Legal",
    links: ["Terms", "Privacy", "Cookies", "Licenses"],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-foreground px-5 pt-24 pb-12 text-white sm:px-6 lg:pt-32">
      <div className="absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(0,102,255,0.2),transparent)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-20 grid grid-cols-2 gap-10 md:grid-cols-4 lg:mb-24 lg:grid-cols-6 lg:gap-12">
          <div className="col-span-2">
            <a
              href="#top"
              className="mb-8 flex items-center gap-2 text-4xl font-black tracking-normal text-primary"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-white">
                <ShieldCheck className="size-5" />
              </span>
              <span>gurdena</span>
            </a>
            <p className="mb-8 max-w-sm text-lg font-medium leading-relaxed text-gray-400">
              The calmest way to compare and buy insurance in Georgia.
            </p>
            <div className="flex gap-3">
              {[X, GitBranch, Link2, Rss].map((Icon, index) => (
                <a
                  key={index}
                  href="#top"
                  aria-label="Social link"
                  className="grid size-12 place-items-center rounded-xl bg-white/5 transition-all hover:bg-primary"
                >
                  <Icon className="size-5 text-gray-400" />
                </a>
              ))}
            </div>
          </div>

          {LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="mb-7 text-lg font-black">{group.title}</h4>
              <ul className="space-y-4 text-sm font-bold text-gray-400">
                {group.links.map((link) => (
                  <li key={link}>
                    <a href="#quotes" className="transition-colors hover:text-primary">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="col-span-2 md:col-span-1">
            <h4 className="mb-7 text-lg font-black">Support</h4>
            <ul className="space-y-6">
              <li className="flex items-center gap-3 text-sm font-bold text-gray-400">
                <Phone className="size-4 text-primary" />
                +995 32 2 00 00 00
              </li>
              <li className="flex items-center gap-3 text-sm font-bold text-gray-400">
                <Mail className="size-4 text-primary" />
                hello@gurdena.ge
              </li>
              <li className="pt-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs font-black text-white">
                    <ShieldCheck className="size-4 text-green-500" />
                    SECURE SITE
                  </div>
                  <div className="text-[10px] font-bold text-gray-500">SSL ENCRYPTED</div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-10 sm:pt-12">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div className="text-xs font-medium leading-relaxed text-gray-500">
              <p className="mb-4">
                Copyright 2026, All Rights Reserved. Gurdena helps customers in Georgia
                compare insurance prices, coverage, and partner information in one guided experience.
              </p>
              <p>
                Insurance offers, prices, and coverage depend on partner underwriting and
                may vary by customer profile.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-4 text-xs font-black uppercase tracking-widest text-gray-400 lg:justify-end">
              {["Privacy Policy", "Terms of Service", "Licenses", "Accessibility"].map((link) => (
                <a key={link} href="#top" className="transition-colors hover:text-white">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
