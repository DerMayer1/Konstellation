import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Constellation Forecast",
  description: "AI-native revenue forecasting for B2B sales pipelines."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
