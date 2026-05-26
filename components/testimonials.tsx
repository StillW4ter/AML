"use client";

import { motion } from "motion/react";
import { Quote, Star } from "lucide-react";

const REVIEWS = [
  {
    name: "Mainul Islam Arafat",
    location: "Car Insurance",
    text: "Compared 6 offers in under 2 minutes and saved ₾420 on my car policy. Beautiful experience.",
    savings: "₾420 saved",
    img: "https://i.pravatar.cc/150?u=mainul",
  },
  {
    name: "MD Azbin Islam",
    location: "Health Insurance",
    text: "Finally an insurance brand that feels human. Clear plans, calm design, instant support.",
    savings: "35% lower",
    img: "https://i.pravatar.cc/150?u=azbin",
  },
  {
    name: "Hridoy Debnath",
    location: "Travel Insurance",
    text: "I booked travel cover for a Europe trip on the way to the airport. Smooth and trustworthy.",
    savings: "2 min issued",
    img: "https://i.pravatar.cc/150?u=hridoy",
  },
];

export function Testimonials() {
  return (
    <section className="relative overflow-hidden bg-foreground px-5 py-24 text-white sm:px-6 lg:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_5%_0%,rgba(251,77,25,0.32),transparent_33%),linear-gradient(135deg,rgba(116,89,255,0.24)_0%,transparent_36%,rgba(0,102,255,0.22)_100%)]" />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-16 flex flex-col justify-between gap-8 md:flex-row md:items-end lg:mb-20">
          <div className="max-w-2xl">
            <h2 className="heading-vc mb-6 text-4xl font-bold md:text-6xl">
              Trusted comparisons & real customer experiences
            </h2>
            <p className="text-lg font-medium text-gray-400 sm:text-xl">
              One simple form. Trusted partners. Instant, side-by-side offers.
            </p>
          </div>
          <div className="flex w-fit items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="text-4xl font-black text-primary">4.9</div>
            <div>
              <div className="mb-1 flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="size-4 fill-primary text-primary" />
                ))}
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
                App Store Rating
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {REVIEWS.map((review, index) => (
            <motion.article
              key={review.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="group relative rounded-[2rem] border border-white/10 bg-white/5 p-8 transition-all hover:bg-white/10 sm:p-10"
            >
              <Quote className="absolute right-8 top-8 size-12 text-white/5 transition-colors group-hover:text-primary/20" />
              <div className="mb-8 flex items-center gap-4">
                <img
                  src={review.img}
                  alt={review.name}
                  className="size-14 rounded-full border-2 border-primary/50 object-cover"
                />
                <div>
                  <div className="text-lg font-black">{review.name}</div>
                  <div className="text-sm font-bold text-gray-400">{review.location}</div>
                </div>
              </div>
              <p className="mb-8 font-medium leading-relaxed text-gray-300">
                &quot;{review.text}&quot;
              </p>
              <div className="flex items-center justify-between border-t border-white/10 pt-8">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Result
                </span>
                <span className="text-xl font-black text-primary">{review.savings}</span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
