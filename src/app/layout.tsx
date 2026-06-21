import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const viewport: Viewport = {
  themeColor: "#8b5cf6",
};

export const metadata: Metadata = {
  title: "Recallio – Inteligentna nauka z fiszkami",
  description:
    "Aplikacja do nauki metodą pytań i odpowiedzi z oceną AI. Wgraj własne zestawy pytań, odpowiadaj i śledź postępy.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Recallio",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
