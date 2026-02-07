import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 基金估值平台",
  description: "基金估值与持仓分析看板",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
