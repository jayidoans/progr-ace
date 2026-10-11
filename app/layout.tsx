import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { THEME_STORAGE_KEY } from "@/src/features/theme/preferences";
import { PwaExperienceProvider } from "@/src/features/pwa/pwa-experience";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "ProgrACE",
  title: "ProgrACE",
  description: "ProgrACE helps athletes and coaches plan, track, and review structured training online.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/prograce-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/prograce-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icons/prograce-192.png",
    apple: [{ url: "/icons/prograce-apple-touch-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ProgrACE",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // The app preference, rather than the OS preference, owns the browser UI
  // color scheme. The beforeInteractive script switches this to dark first
  // when the user has explicitly selected it.
  colorScheme: "light",
  themeColor: "#ffffff",
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
            const selectedTheme = theme === 'dark' ? 'dark' : 'light';
            document.documentElement.classList.toggle('dark', selectedTheme === 'dark');
            document.documentElement.dataset.theme = selectedTheme;
            document.documentElement.style.colorScheme = selectedTheme;
            document.querySelector('meta[name="theme-color"]')?.setAttribute('content', selectedTheme === 'dark' ? '#080d1b' : '#ffffff');
          })();`}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PwaExperienceProvider>{children}</PwaExperienceProvider>
      </body>
    </html>
  );
}
