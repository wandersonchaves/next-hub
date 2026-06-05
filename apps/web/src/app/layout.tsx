import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/providers/theme-provider";
import { NativeAuthProvider } from "@/providers/auth-provider";
import { Toaster } from "sonner";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Next Hub",
    template: "%s | Next Hub"
  },
  description: "A base definitiva para SaaS B2B agnóstico e de alto desempenho.",
  icons: {
    icon: "/favicon.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={cn(inter.className, "antialiased")}>
        <Suspense fallback={null}>
          <NativeAuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <div className="relative flex min-h-screen flex-col">
                {children}
              </div>
              <Toaster richColors position="top-right" />
            </ThemeProvider>
          </NativeAuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
