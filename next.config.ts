import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 基础配置 */
  reactStrictMode: true,

  /* 类型化路由 */
  typedRoutes: true,

  /* TypeScript 配置 */
  typescript: {
    ignoreBuildErrors: false,
  },

  /* 环境变量 */
  env: {
    NEXT_PUBLIC_APP_NAME: "DocuMind Pro",
  },
};

export default nextConfig;
