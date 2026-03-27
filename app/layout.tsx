import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/nav";

export const metadata: Metadata = {
  title: "Kyoto — Gestão de Tráfego",
  description: "Painel de gestão de tráfego para Meta Ads",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex min-h-screen">
          <Nav />
          <main className="flex-1 ml-[220px] p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
