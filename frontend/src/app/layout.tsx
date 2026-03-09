import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 基金监控台",
  description: "基金估值、持仓分析与新闻联动工作台",
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
