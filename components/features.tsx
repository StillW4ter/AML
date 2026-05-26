"use client";

import { motion } from "motion/react";
import { Car, HeartPulse, Home, PawPrint, Plane, ShieldCheck, Umbrella } from "lucide-react";

const FEATURES = [
  {
    title: "Car Insurance",
    desc: "Compare vehicle cover, liability, assistance, and trusted partner offers side by side.",
    icon: Car,
    color: "bg-blue-50 text-blue-600",
  },
  {
    title: "Travel Insurance",
    desc: "Find visa-ready protection, medical support, baggage cover, and trip safeguards.",
    icon: Plane,
    color: "bg-green-50 text-green-600",
  },
  {
    title: "Health Insurance",
    desc: "Match plans by clinic access, medicines, family packages, and annual limits.",
    icon: HeartPulse,
    color: "bg-orange-50 text-orange-600",
  },
  {
    title: "Home Insurance",
    desc: "Protect apartments, houses, repairs, mortgage requirements, and personal property.",
    icon: Home,
    color: "bg-purple-50 text-purple-600",
  },
  {
    title: "Mortgage Cover",
    desc: "Review policy terms for bank requirements with clear limits and deductibles.",
    icon: Umbrella,
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    title: "Pet Insurance",
    desc: "See coverage for vet visits, accidents, emergency care, and everyday support.",
    icon: PawPrint,
    color: "bg-rose-50 text-rose-600",
  },
];

export function Features() {
  return (
    <section className="bg-white px-5 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center lg:mb-20">
          <motion.span
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 block text-sm font-black uppercase tracking-widest text-primary"
          >
            Insurance categories
          </motion.span>
          <h2 className="heading-vc mb-6 text-4xl font-bold md:text-6xl">
            The cover you need, all in one calm place
          </h2>
          <p className="mx-auto max-w-2xl text-lg font-medium text-muted-foreground sm:text-xl">
            Pick a category and we instantly match offers from Georgia&apos;s leading
            insurers, tailored to your needs.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {FEATURES.map((feature, index) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="group relative overflow-hidden rounded-[2rem] border border-border bg-white p-8 transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-elevation-two sm:p-9"
            >
              <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-[4rem] bg-muted/60" />
              <div
                className={`relative mb-8 flex size-16 items-center justify-center rounded-2xl ${feature.color} shadow-sm transition-transform duration-500 group-hover:scale-105`}
              >
                <feature.icon className="size-8" />
              </div>
              <h3 className="relative mb-4 text-2xl font-black">{feature.title}</h3>
              <p className="relative mb-8 font-medium leading-relaxed text-muted-foreground">
                {feature.desc}
              </p>
              <div className="relative flex items-center gap-2 text-sm font-black text-primary">
                <ShieldCheck className="size-4" />
                Compare offers
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
