import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@react-pdf/renderer"],
  transpilePackages: ["@nr-yn/documents"],
};
export default nextConfig;
