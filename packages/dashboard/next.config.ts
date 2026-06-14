import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Kumo + base-ui call React.createContext at module eval. Next's SSR/RSC
  // condition resolution must process these packages so the right React
  // runtime is used (otherwise "createContext is not a function").
  transpilePackages: ["@cloudflare/kumo", "@base-ui/react", "@phosphor-icons/react", "echarts"],
};

export default nextConfig;
