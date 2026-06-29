import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["imapflow", "mailparser"],
  // Tránh lỗi dev "SegmentViewNode ... React Client Manifest" / chunk .next lệch trên Windows khi HMR nhiều.
  experimental: {
    devtoolSegmentExplorer: false,
  },
  async redirects() {
    return [
      { source: "/admin", destination: "/erp/admin", permanent: true },
      { source: "/admin/:path*", destination: "/erp/admin/:path*", permanent: true },
      { source: "/admin/login", destination: "/erp/login", permanent: true },
      { source: "/kho-go", destination: "/erp/kho-go", permanent: true },
      { source: "/kho-go/:path*", destination: "/erp/kho-go/:path*", permanent: true },
      { source: "/kho-go/kiem/:id", destination: "/erp/kho-go/kien/:id", permanent: true },
      { source: "/erp/san-pham/bom", destination: "/erp/san-pham/san-pham", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
    ],
  },
};

export default nextConfig;
