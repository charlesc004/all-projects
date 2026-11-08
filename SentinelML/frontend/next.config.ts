import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.CONTROL_URL || (process.env.NODE_ENV === "production" ? "http://control:3001" : "http://localhost:3001")}/api/:path*`,
      },
    ];
  },
};
export default config;
