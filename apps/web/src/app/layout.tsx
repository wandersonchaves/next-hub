import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/providers/theme-provider";
import { NativeAuthProvider } from "@/providers/auth-provider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Enterprise SaaS Starter Kit",
    template: "%s | Enterprise SaaS"
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
    <NativeAuthProvider>
      <html lang="pt-BR" suppressHydrationWarning>
        <body className={cn(inter.className, "antialiased")}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
              {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </body>
      </html>
    </NativeAuthProvider>
  );
}

