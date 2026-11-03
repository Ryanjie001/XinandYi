import type { Metadata } from "next";
import { StoreProvider } from "@/lib/store";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "新&怡 · 我们的小世界", template: "%s · 新&怡" },
  description: "新与怡的生活记录。",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
