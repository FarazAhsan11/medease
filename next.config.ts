import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Doctor sign-up uploads a photo (2 MB) and a degree PDF (5 MB).
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
