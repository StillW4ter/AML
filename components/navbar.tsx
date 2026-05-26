"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Globe2, Menu, Shield, User, X } from "lucide-react";
import { useEffect, useState } from "react";

const PRODUCTS = [
  { name: "Car Insurance", desc: "Compare trusted Georgian auto offers" },
  { name: "Travel Insurance", desc: "Fast cover for visas, trips, and care" },
  { name: "Health Insurance", desc: "Plans matched to clinics and budgets" },
  { name: "Home Insurance", desc: "Protect property, mortgage, and belongings" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className="fixed top-0 z-50 w-full px-4 py-4 transition-all duration-300 sm:px-6">
      <div
        className={`mx-0 flex w-full max-w-[390px] items-center justify-between rounded-3xl border border-border bg-white px-5 py-3 transition-all duration-300 sm:mx-auto sm:max-w-7xl sm:px-8 ${
          isScrolled
            ? "shadow-elevation-two"
            : "shadow-elevation-one"
        }`}
      >
        <div className="flex items-center gap-8 xl:gap-10">
          <a
            href="#top"
            aria-label="Gurdena home"
            className="flex items-center gap-2 text-3xl font-black tracking-normal text-primary"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-white">
              <Shield className="size-5 fill-white/20" />
            </span>
            <span>gurdena</span>
          </a>

          <div className="hidden items-center gap-8 lg:flex">
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown("insurance")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="flex items-center gap-1 py-2 text-sm font-bold text-foreground transition-colors hover:text-primary">
                Insurance
                <ChevronDown
                  className={`size-4 transition-transform ${
                    activeDropdown === "insurance" ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {activeDropdown === "insurance" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                    className="absolute left-0 top-full mt-2 w-80 rounded-2xl border border-border bg-white p-3 shadow-2xl"
                  >
                    {PRODUCTS.map((product) => (
                      <a
                        key={product.name}
                        href="#quotes"
                        className="block rounded-xl p-4 transition-colors hover:bg-muted"
                      >
                        <span className="block text-sm font-black text-foreground">
                          {product.name}
                        </span>
                        <span className="mt-1 block text-xs font-medium text-muted-foreground">
                          {product.desc}
                        </span>
                      </a>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <a
              href="#how-it-works"
              className="text-sm font-bold text-foreground transition-colors hover:text-primary"
            >
              How it Works
            </a>
            <a
              href="#partners"
              className="text-sm font-bold text-foreground transition-colors hover:text-primary"
            >
              Partners
            </a>
            <a
              href="#app"
              className="text-sm font-bold text-foreground transition-colors hover:text-primary"
            >
              Download App
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-foreground transition-colors hover:text-primary md:flex">
            <Globe2 className="size-4" />
            EN
            <ChevronDown className="size-3.5" />
          </button>
          <button className="hidden items-center gap-2 px-2 py-2 text-sm font-bold text-foreground transition-colors hover:text-primary md:flex">
            <User className="size-4" />
            Sign in
          </button>
          <a
            href="#quotes"
            className="hidden rounded-full bg-primary px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover active:scale-95 sm:inline-flex sm:px-6"
          >
            Compare Offers
          </a>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="grid size-10 place-items-center rounded-xl text-foreground transition-colors hover:bg-muted lg:hidden"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute left-0 top-full w-full overflow-hidden border-t border-border bg-white shadow-2xl lg:hidden"
          >
            <div className="flex flex-col gap-3 p-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                Insurance Products
              </p>
              {PRODUCTS.map((product) => (
                <a
                  key={product.name}
                  href="#quotes"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between border-b border-muted py-3 text-lg font-black last:border-0"
                >
                  {product.name}
                  <ChevronDown className="size-4 -rotate-90 text-muted-foreground" />
                </a>
              ))}
              <button className="mt-2 flex items-center gap-2 py-2 text-lg font-black">
                <User className="size-5" />
                Sign in
              </button>
              <a
                href="#quotes"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-1 rounded-2xl bg-primary py-4 text-center text-lg font-black text-white"
              >
                Compare Offers
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
