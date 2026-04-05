"use client";

import { usePathname } from 'next/navigation';
import GlobalAiAssistant from '@/components/ai/GlobalAiAssistant';

const HIDDEN_ROUTES = [
  '/automations',
  '/chat',
  '/copilot',
  '/workspace',
  '/pricing',
  '/website-builder',
  '/construction-solutions',
  '/business-builder',
  '/app-builder',
  '/game-builder',
  '/creatoros',
  '/autoflow',
  '/json-builder',
  '/builder',
  '/devboard',
];

function shouldHideCopilotChrome(pathname: string): boolean {
  return HIDDEN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default function CopilotChrome() {
  const pathname = usePathname();

  if (shouldHideCopilotChrome(pathname)) {
    return null;
  }

  return <GlobalAiAssistant />;
}