const LOGOS = [
  "GPI HOLDING",
  "TBC INSURANCE",
  "ALDAGI",
  "IMEDI L",
  "ARDI",
  "UNISON",
  "IRAO",
  "PSP INSURANCE",
  "GLOBAL BENEFITS",
];

export function TrustBar() {
  return (
    <section className="overflow-hidden border-y border-border bg-[#f8f9f9] py-14 sm:py-16">
      <div className="mx-auto mb-10 max-w-7xl px-5 text-center sm:px-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70">
          We have more than 5000+ trusted partner comparisons
        </p>
      </div>
      <div className="relative flex">
        <div className="flex animate-marquee items-center gap-14 whitespace-nowrap sm:gap-20">
          {[...LOGOS, ...LOGOS].map((logo, index) => (
            <span
              key={`${logo}-${index}`}
              className="select-none text-2xl font-black italic tracking-normal text-muted-foreground/35 transition-colors hover:text-primary/60 md:text-3xl"
            >
              {logo}
            </span>
          ))}
        </div>
        <div className="absolute inset-y-0 left-0 z-10 w-20 bg-linear-to-r from-[#f8f9f9] to-transparent sm:w-32" />
        <div className="absolute inset-y-0 right-0 z-10 w-20 bg-linear-to-l from-[#f8f9f9] to-transparent sm:w-32" />
      </div>
    </section>
  );
}
