import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AnswearChecker AI – Inteligentna nauka z fiszkami",
  description:
    "Aplikacja do nauki metodą pytań i odpowiedzi z oceną AI. Wgraj własne zestawy pytań, odpowiadaj i śledź postępy.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body>
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
