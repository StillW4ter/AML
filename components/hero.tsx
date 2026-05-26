"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  Car,
  HeartPulse,
  Home,
  Plane,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useState } from "react";

const TABS = [
  { id: "car", label: "Car", icon: Car },
  { id: "travel", label: "Travel", icon: Plane },
  { id: "health", label: "Health", icon: HeartPulse },
];

const QUOTES = [
  { carrier: "GPI", price: "₾42", cover: "Auto Protect", score: "92%" },
  { carrier: "TBC Insurance", price: "₾48", cover: "Family Plus", score: "88%" },
  { carrier: "Aldagi", price: "₾51", cover: "Comfort Plan", score: "84%" },
];

export function Hero() {
  const [activeTab, setActiveTab] = useState("car");

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-background pt-24 pb-14 text-foreground sm:pb-20 lg:pt-36 lg:pb-24"
    >
      <div className="absolute right-0 top-0 hidden h-full w-[42%] bg-[#eef4ff] lg:block" />

      <div className="relative mx-0 grid max-w-[390px] items-center gap-8 px-5 sm:mx-auto sm:max-w-7xl sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 shadow-elevation-one sm:mb-6">
            <ShieldCheck className="size-4 text-primary" />
            <span className="text-xs font-black text-foreground">
              Georgia&apos;s #1 Insurance Comparison
            </span>
          </div>

          <h1 className="max-w-[350px] text-balance text-[2.45rem] font-black leading-[1.04] tracking-normal text-foreground sm:max-w-3xl sm:text-6xl lg:text-[4.8rem]">
            Compare insurance offers in one <span className="text-primary">calm</span> place
          </h1>
          <p className="mt-4 max-w-[350px] text-base font-medium leading-relaxed text-muted-foreground sm:max-w-xl sm:text-xl">
            Choose the insurance you need, answer a few simple questions, and compare
            offers from trusted insurance companies across Georgia.
          </p>

          <div
            id="quotes"
            className="mt-6 grid w-full max-w-[350px] grid-cols-3 gap-1 rounded-2xl border border-border bg-white p-1.5 shadow-elevation-one sm:mt-8 sm:inline-flex sm:w-auto sm:max-w-md"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-2 py-3 text-sm font-black transition-all sm:flex-none sm:px-6 ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-lg shadow-primary/15"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="flex items-center justify-center gap-2 truncate">
                  <tab.icon className="size-4 shrink-0" />
                  {tab.label}
                </span>
              </button>
            ))}
          </div>

          <form className="mt-4 flex max-w-[350px] flex-col gap-3 sm:mt-5 sm:max-w-xl sm:flex-row">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter phone or city"
              aria-label="Phone or city"
              className="h-16 rounded-2xl border border-border bg-white px-6 text-lg font-black text-foreground outline-none transition-all placeholder:text-muted-foreground/55 focus:border-primary sm:flex-1"
            />
            <button className="group flex h-16 items-center justify-center gap-2 rounded-2xl bg-primary px-8 text-lg font-black text-white shadow-elevation-two transition-all hover:bg-primary-hover active:scale-95">
              Compare Offers
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <div className="mt-5 flex max-w-[350px] flex-col items-start gap-3 text-xs min-[431px]:flex-row min-[431px]:flex-wrap min-[431px]:items-center min-[431px]:gap-x-6 sm:mt-6 sm:max-w-xl sm:text-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <ShieldCheck className="size-5 text-primary" />
              9 Trusted Partners
            </div>
            <div className="hidden h-4 w-px bg-border sm:block" />
            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <BadgeCheck className="size-5 text-primary" />
              Offers in Minutes
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.12 }}
          className="relative mx-auto w-full max-w-[350px] sm:max-w-xl lg:block lg:max-w-none"
        >
          <div className="relative z-10 overflow-hidden rounded-[1.5rem] border border-border bg-white p-3 shadow-elevation-two sm:rounded-[2rem] sm:p-5">
            <div className="rounded-[1.1rem] bg-[#fbfcff] p-3 text-foreground sm:rounded-[1.45rem] sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3 sm:mb-5 sm:pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary text-white sm:size-10">
                    <ShieldCheck className="size-4 sm:size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-black sm:text-sm">Gurdena</p>
                    <p className="text-[10px] font-bold text-muted-foreground sm:text-xs">
                      Smart comparison desk
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-2 text-[10px] font-black text-muted-foreground shadow-sm sm:gap-2 sm:px-3 sm:text-xs">
                  <Star className="size-3.5 fill-primary text-primary" />
                  4.9 · 12k reviews
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[0.75fr_1fr] sm:gap-5">
                <div className="rounded-2xl bg-[#f6f8ff] p-3 sm:rounded-3xl sm:p-4">
                  <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground sm:mb-4 sm:text-xs">
                    Coverage flow
                  </p>
                  {["Choose cover", "Answer questions", "Compare offers", "Policy issued"].map(
                    (item, index) => (
                      <div key={item} className="mb-3 flex items-center gap-3 last:mb-0 sm:mb-4">
                        <span className="grid size-7 place-items-center rounded-full bg-white text-[10px] font-black text-primary shadow-sm sm:size-8 sm:text-xs">
                          {index + 1}
                        </span>
                        <span className="text-xs font-black sm:text-sm">{item}</span>
                      </div>
                    )
                  )}
                </div>

                <div className="space-y-2.5 sm:space-y-3">
                  {QUOTES.map((quote) => (
                    <div
                      key={quote.carrier}
                      className="rounded-2xl border border-border bg-white p-3 shadow-elevation-one sm:p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black sm:text-sm">{quote.carrier}</p>
                          <p className="text-[10px] font-bold text-muted-foreground sm:text-xs">
                            {quote.cover}
                          </p>
                        </div>
                        <p className="text-lg font-black text-primary sm:text-xl">{quote.price}</p>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: quote.score }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            className="absolute -bottom-6 left-3 z-20 hidden max-w-64 rounded-3xl border border-border bg-white p-5 text-foreground shadow-elevation-two sm:block lg:-bottom-8 lg:-left-8 lg:p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-green-100">
                <ShieldCheck className="size-6 text-green-600" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Your Policy Issued
              </span>
            </div>
            <div className="mb-1 text-4xl font-black text-primary">80%</div>
            <div className="text-sm font-black leading-tight text-foreground">
              Coverage verified in 2 minutes
            </div>
          </div>

          <div
            className="absolute -right-3 top-8 z-20 hidden rounded-2xl border border-border bg-white p-4 text-foreground shadow-elevation-two sm:block lg:top-10 lg:-right-8 lg:p-5"
          >
            <div className="flex items-center gap-4">
              <div className="grid size-11 place-items-center rounded-full bg-blue-50 text-secondary">
                <Home className="size-5" />
              </div>
              <div>
                <div className="text-sm font-black">120k+ Trusted Users</div>
                <div className="text-xs font-bold text-muted-foreground">Across Georgia</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
