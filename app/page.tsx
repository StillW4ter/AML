import { CarrierGrid } from "@/components/carrier-grid";
import { FAQ } from "@/components/faq";
import { Features } from "@/components/features";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { Navbar } from "@/components/navbar";
import { Testimonials } from "@/components/testimonials";
import { TrustBar } from "@/components/trust-bar";

export default function Home() {
  return (
    <main className="min-h-screen font-sans selection:bg-primary/20 selection:text-primary">
      <Navbar />
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <CarrierGrid />
      <Testimonials />
      <FAQ />
      <Footer />
    </main>
  );
}
