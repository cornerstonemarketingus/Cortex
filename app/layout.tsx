import type { Metadata } from "next";
// Removed Google font imports to avoid network fetch during build.
import ContentProtectionShield from "@/components/security/ContentProtectionShield";
import { BuilderStateProvider } from '@/components/ai/BuilderStateProvider';
import SiteFooter from '@/components/navigation/SiteFooter';
import CopilotChrome from '@/components/ai/CopilotChrome';
import "./globals.css";

// Use system font stack via globals.css instead.

export const metadata: Metadata = {
  title: "TeamBuilderCopilot | AI Estimating, Automations & Page Builder for Contractors",
  description:
    "TeamBuilderCopilot is the all-in-one AI platform for contractors: generate professional estimates instantly, automate follow-up workflows, and build high-converting landing pages.",
  keywords: [
    'contractor estimating software',
    'construction estimate AI',
    'contractor automation',
    'contractor page builder',
    'TeamBuilderCopilot',
    'construction CRM automation',
    'bid estimate generator',
    'contractor lead generation',
    'automated follow-up contractor',
    'Minnesota contractor software',
  ],
  openGraph: {
    title: 'TeamBuilderCopilot | AI for Contractors',
    description:
      'Generate estimates, automate workflows, and build pages — the complete AI platform for contractors.',
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
          <CopilotChrome />
        </BuilderStateProvider>
      </body>
    </html>
  );
}

