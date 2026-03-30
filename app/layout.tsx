import type { Metadata } from "next";
// Removed Google font imports to avoid network fetch during build.
import ContentProtectionShield from "@/components/security/ContentProtectionShield";
import GlobalAiAssistant from '@/components/ai/GlobalAiAssistant';
import { BuilderStateProvider } from '@/components/ai/BuilderStateProvider';
import SiteFooter from '@/components/navigation/SiteFooter';
import "./globals.css";
import AskCopilotFullWidth from '@/components/ai/AskCopilotFullWidth';

// Use system font stack via globals.css instead.

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
      <body className={`antialiased`}>
        <ContentProtectionShield />
        <BuilderStateProvider>
          {children}
          <SiteFooter />
          <GlobalAiAssistant />
          <AskCopilotFullWidth />
        </BuilderStateProvider>
      </body>
    </html>
  );
}

