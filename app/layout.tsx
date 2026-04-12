import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "F.A.S.T. 会計システム",
  description: "BMX School & Team Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-slate-950 text-white antialiased`}>
        <div className="flex min-h-screen">
          <Sidebar />
          
          {/* メインコンテンツ */}
          <main className="flex-1 md:ml-64 min-h-screen pt-14 md:pt-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}