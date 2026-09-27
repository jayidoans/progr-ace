import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { THEME_STORAGE_KEY } from "@/src/features/theme/preferences";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProgrACE",
  description: "Train today. Go further.",
  icons: {
    icon: "/prograce-icon.png",
    shortcut: "/prograce-icon.png",
    apple: "/prograce-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-preference" strategy="beforeInteractive">
          {`(() => {
            const theme = document.cookie.split('; ').find((item) => item.startsWith('${THEME_STORAGE_KEY}='))?.split('=')[1];
            if (theme === 'dark') {
              document.documentElement.classList.add('dark');
              document.documentElement.dataset.theme = 'dark';
            }
          })();`}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
