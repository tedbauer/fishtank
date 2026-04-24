import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const isDev = process.env.NEXT_PUBLIC_ENABLE_DEBUG === "true";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  title: isDev ? "My Fishtank [DEV]" : "My Fishtank",
  description: "Keep your home tidy, together. A shared household chore tracker.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: isDev ? "My Fishtank [DEV]" : "My Fishtank",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-dev={isDev ? "true" : undefined}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={inter.variable}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
