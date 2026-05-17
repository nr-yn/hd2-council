import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@react-pdf/renderer"],
  transpilePackages: ["@nryn/documents"],
};
export default nextConfig;
