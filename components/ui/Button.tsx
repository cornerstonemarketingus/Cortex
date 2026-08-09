import Link from 'next/link';
import type { MouseEventHandler, ReactNode } from 'react';
import { BTN_PRIMARY, BTN_PRIMARY_STYLE, BTN_SECONDARY } from '@/lib/ui/theme';

type Variant = 'primary' | 'secondary';

type ButtonProps = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

function classesFor(variant: Variant, className: string) {
  return variant === 'primary' ? `${BTN_PRIMARY} ${className}` : `${BTN_SECONDARY} ${className}`;
}

export default function Button({
  children,
  variant = 'primary',
  className = '',
  href,
  type = 'button',
  onClick,
  disabled,
}: ButtonProps) {
  const classes = classesFor(variant, className);
  const style = variant === 'primary' ? BTN_PRIMARY_STYLE : undefined;

  if (href) {
    return (
      <Link href={href} className={classes} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes} style={style}>
      {children}
    </button>
  );
}
