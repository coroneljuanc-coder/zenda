import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // El paquete de contratos se comparte como código TypeScript y Next.js lo compila.
  transpilePackages: ["@zenda/contratos"],
};

export default nextConfig;
