import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',        // Static HTML สำหรับ Firebase Hosting
  trailingSlash: true,     // ทำให้ routing ทำงานถูกต้องบน static host
  images: {
    unoptimized: true,     // Firebase Hosting ไม่รองรับ Next.js Image Optimization
  },
};

export default nextConfig;
