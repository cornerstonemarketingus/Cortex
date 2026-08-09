import type { ReactNode } from 'react';
import { KICKER, SECTION } from '@/lib/ui/theme';

type PageHeroProps = {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
};

export default function PageHero({ kicker, title, subtitle, actions, align = 'center', className = '' }: PageHeroProps) {
  const alignment = align === 'center' ? 'text-center items-center' : 'text-left items-start';

  return (
    <section className={`${SECTION} pt-16 pb-8 flex flex-col ${alignment} ${className}`}>
      {kicker ? <p className={`${KICKER} mb-4`}>{kicker}</p> : null}
      <h1 className="text-3xl font-bold leading-tight text-white md:text-5xl max-w-3xl">{title}</h1>
      {subtitle ? (
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-400">{subtitle}</p>
      ) : null}
      {actions ? <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div> : null}
    </section>
  );
}
