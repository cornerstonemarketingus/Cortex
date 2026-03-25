import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ContentProtectionShield from "@/components/security/ContentProtectionShield";
import GlobalAiAssistant from '@/components/ai/GlobalAiAssistant';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cortex | Strategic Marketing and Business Development Executive AI",
  description:
    "Cortex is an executive AI partner for local service businesses in Minnesota and across the U.S., combining pro estimating, CRM automations, lead generation websites, and app builder execution.",
  keywords: [
    'Minnesota local service business marketing',
    'U.S. local service business growth',
    'construction lead generation',
    'AI CRM automation',
    'strategic marketing executive',
    'business development executive',
    'contractor estimator software',
    'gohighlevel style automation',
    'lead generation website builder',
    'service business AI agent',
  ],
  openGraph: {
    title: 'Cortex | Strategic Marketing and Business Development Executive AI',
    description:
      'Executive-grade AI for local service business growth: estimator, CRM automations, and lead-gen builder workflows for Minnesota and nationwide markets.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ContentProtectionShield />
        {children}
        <GlobalAiAssistant />
      </body>
    </html>
  );
}
