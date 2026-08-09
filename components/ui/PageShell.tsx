import type { ReactNode } from 'react';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import { PAGE_BG } from '@/lib/ui/theme';

type PageShellProps = {
  children: ReactNode;
  /** Set false for pages that render their own nav/header (e.g. product sub-brands). */
  withNav?: boolean;
  className?: string;
};

export default function PageShell({ children, withNav = true, className = '' }: PageShellProps) {
  return (
    <main className={`${PAGE_BG} flex flex-col ${className}`}>
      {withNav ? <PublicMarketingNav /> : null}
      <div className="flex-1">{children}</div>
    </main>
  );
}
