"use client";

import { motion } from "motion/react";
import { CheckCircle, ClipboardList, MessageCircle, Search } from "lucide-react";

const STEPS = [
  {
    title: "Choose Insurance Type",
    desc: "Pick the cover that fits your life: car, travel, home, health, mortgage, or pet.",
    icon: ClipboardList,
  },
  {
    title: "Answer A Few Questions",
    desc: "Quick, simple questions with no jargon and no paperwork.",
    icon: MessageCircle,
  },
  {
    title: "Compare Trusted Offers",
    desc: "See offers from Georgia's top insurers side by side with limits and deductibles.",
    icon: Search,
  },
  {
    title: "Select Best Option",
    desc: "Buy in a few taps. Your policy is issued instantly.",
    icon: CheckCircle,
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-background px-5 py-24 sm:px-6 lg:py-32"
    >
      <div className="absolute -left-40 top-16 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -right-40 bottom-16 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <div className="mb-4 inline-flex rounded-full border border-border bg-white px-5 py-2 text-xs font-black uppercase tracking-widest text-primary shadow-elevation-one">
            How it works
          </div>
          <h2 className="heading-vc mb-6 text-4xl font-bold md:text-6xl">
            Smart insurance starts with a few simple steps
          </h2>
          <p className="text-lg font-medium leading-relaxed text-muted-foreground sm:text-xl">
            Finding the right insurance should not feel complicated. Gurdena helps you
            compare trusted offers step by step in just a few minutes.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-4">
          {STEPS.map((step, index) => (
            <motion.article
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="relative rounded-[2rem] border border-border bg-white p-7 text-center shadow-elevation-one"
            >
              <div className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-[#f1f6ff] text-primary shadow-elevation-one">
                <step.icon className="size-8" />
              </div>
              <span className="absolute right-7 top-7 grid size-7 place-items-center rounded-full bg-primary text-xs font-black text-white">
                {index + 1}
              </span>
              <h3 className="mb-3 text-xl font-black">{step.title}</h3>
              <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                {step.desc}
              </p>
            </motion.article>
          ))}
        </div>

        <div className="mt-14 text-center">
          <a
            href="#quotes"
            className="inline-flex rounded-full bg-primary px-8 py-4 text-lg font-black text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary-hover active:scale-95"
          >
            Compare Offers
          </a>
        </div>
      </div>
    </section>
  );
}
