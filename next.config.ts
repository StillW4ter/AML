import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optional messaging dependency — loaded at runtime, never bundled.
  serverExternalPackages: ["@whiskeysockets/baileys"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.prod.website-files.com",
      },
      {
        protocol: "https",
        hostname: "framerusercontent.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
    ],
  },
};

export default nextConfig;
