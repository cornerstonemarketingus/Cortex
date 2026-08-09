import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
};

export default function Card({ children, className = '', hover = false }: CardProps) {
  const hoverClass = hover ? 'hover:border-[#C69C6D]/40 transition-all' : '';
  return (
    <div className={`rounded-2xl border border-white/10 bg-[#0d1826] p-6 ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}
