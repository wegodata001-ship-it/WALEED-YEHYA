import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "WALLED YEHYA GROUP ERP",
  description: "מערכת ניהול לחקלאות וקבלנות — נבנתה ע״י WEGO BUSINESS",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Walled Yehya" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${rubik.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
