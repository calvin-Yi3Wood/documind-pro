import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocuFusion - AI文档智能处理平台",
  description: "AI驱动的文档智能处理平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Font Awesome 图标库 */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
