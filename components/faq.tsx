"use client";

import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";

const FAQS = [
  {
    q: "How does Gurdena compare offers?",
    a: "Gurdena collects the details insurers need once, then shows side-by-side offers from trusted partners so you can compare price, coverage, limits, and deductibles clearly.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. Your information is handled securely and only used to prepare insurance offers or connect you with a consultant when you ask for help.",
  },
  {
    q: "How long does comparison take?",
    a: "Most flows take under 3 minutes. You choose a category, answer simple questions, and review offers without calling every company separately.",
  },
  {
    q: "Can I talk to a consultant?",
    a: "Yes. You can compare independently or speak with a consultant before choosing the best option for your needs.",
  },
  {
    q: "Which insurance types are supported?",
    a: "Car, travel, home, health, mortgage, pet, and additional categories are designed into the comparison flow.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="resources" className="bg-background px-5 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-4xl">
        <div className="mb-14 text-center lg:mb-20">
          <h2 className="heading-vc mb-6 text-4xl font-bold md:text-6xl">
            Common Questions
          </h2>
          <p className="text-lg font-medium text-muted-foreground sm:text-xl">
            Everything you need to know about comparing insurance with Gurdena.
          </p>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, index) => (
            <article
              key={faq.q}
              className="overflow-hidden rounded-3xl border border-border bg-white transition-all hover:shadow-elevation-one"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between gap-6 px-6 py-6 text-left text-lg font-black sm:px-10 sm:py-8 sm:text-xl"
              >
                <span className={openIndex === index ? "text-primary" : "text-foreground"}>
                  {faq.q}
                </span>
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-full transition-all ${
                    openIndex === index ? "rotate-180 bg-primary text-white" : "bg-muted"
                  }`}
                >
                  {openIndex === index ? <Minus className="size-5" /> : <Plus className="size-5" />}
                </span>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-8 text-base font-medium leading-relaxed text-muted-foreground sm:px-10 sm:pb-10 sm:text-lg">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          ))}
        </div>

        <div id="app" className="mt-16 overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#fb4d19_0%,#7459ff_50%,#0066ff_100%)] p-8 text-center text-white shadow-2xl sm:p-10">
          <div className="mb-4 inline-flex rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest backdrop-blur">
            4.9 on the App Store
          </div>
          <h3 className="mb-4 text-3xl font-black">
            Compare insurance offers without the confusion
          </h3>
          <p className="mx-auto mb-8 max-w-2xl text-lg font-medium text-white/85">
            Pick a category and instantly compare personalized offers from Georgia&apos;s
            leading insurance companies.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#top" className="rounded-2xl bg-white px-7 py-4 text-left text-sm font-black text-foreground transition-all hover:bg-gray-100">
              <span className="block text-[11px] font-bold text-muted-foreground">Get it on</span>
              Google Play
            </a>
            <a href="#top" className="rounded-2xl bg-white px-7 py-4 text-left text-sm font-black text-foreground transition-all hover:bg-gray-100">
              <span className="block text-[11px] font-bold text-muted-foreground">Download on the</span>
              App Store
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
