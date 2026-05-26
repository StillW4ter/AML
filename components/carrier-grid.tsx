"use client";

import { motion } from "motion/react";

const CARRIERS = [
  { name: "GPI", rating: "Auto · Health" },
  { name: "TBC Insurance", rating: "Home · Travel" },
  { name: "Aldagi", rating: "Health · Property" },
  { name: "Imedi L", rating: "Life · Medical" },
  { name: "Ardi", rating: "Travel · Auto" },
  { name: "Unison", rating: "Property · Pet" },
  { name: "IRAO", rating: "Auto · Mortgage" },
  { name: "PSP Insurance", rating: "Health · Family" },
];

export function CarrierGrid() {
  return (
    <section id="partners" className="relative overflow-hidden bg-white px-5 py-24 sm:px-6 lg:py-32">
      <div className="absolute left-1/2 top-1/2 size-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/70" />
      <div className="absolute left-1/2 top-1/2 size-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/70" />
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center lg:mb-20">
          <div className="mb-4 inline-flex rounded-full border border-border bg-white px-5 py-2 text-xs font-black uppercase tracking-widest text-primary shadow-elevation-one">
            Our partner network
          </div>
          <h2 className="heading-vc mx-auto mb-6 max-w-4xl text-4xl font-bold md:text-5xl">
            Connected to Georgia&apos;s most trusted insurers
          </h2>
          <p className="mx-auto max-w-2xl text-lg font-medium text-muted-foreground">
            One simple form. Eight leading partners. Instant, side-by-side offers.
          </p>
        </div>

        <div className="relative z-10 mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:gap-6">
          {CARRIERS.map((carrier, index) => (
            <motion.article
              key={carrier.name}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.03 }}
              className="group rounded-3xl border border-border bg-white/90 p-7 text-center shadow-elevation-one backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevation-two"
            >
              <h3 className="mb-2 text-xl font-black italic tracking-normal transition-colors group-hover:text-primary">
                {carrier.name.toUpperCase()}
              </h3>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <span className="text-green-600">{carrier.rating}</span>
              </p>
            </motion.article>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="mb-8 font-medium text-muted-foreground">
            And more regional and specialty insurance partners coming online.
          </p>
          <a href="#quotes" className="font-black text-primary hover:underline">
            View all partners
          </a>
        </div>
      </div>
    </section>
  );
}
