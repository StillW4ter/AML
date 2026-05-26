import type { Metadata } from "next";

/**
 * Public layout for /quote/* — minimal, full-bleed.
 *
 * The Figma "Website" page uses a plain near-white backdrop with the header
 * banner spanning the full viewport. We mirror that here so the page reads
 * as a continuous experience rather than a centered card on a stage.
 */
export const metadata: Metadata = {
  title: "Gurdena — Get your insurance quote",
  description:
    "Answer a few questions and an agent will call you back with the best offers.",
};

export const dynamic = "force-dynamic";

export default function QuoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen font-sans antialiased"
      style={{
        // Near-white page background, exactly as in the Figma frames.
        background: "#F7F8FA",
        color: "#161E51",
      }}
    >
      {children}
    </div>
  );
}
