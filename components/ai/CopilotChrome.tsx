"use client";

import { usePathname } from 'next/navigation';
import GlobalAiAssistant from '@/components/ai/GlobalAiAssistant';
import AskCopilotFullWidth from '@/components/ai/AskCopilotFullWidth';

const HIDDEN_ROUTES = [
  '/automations',
  '/chat',
  '/workspace',
  '/pricing',
  '/website-builder',
  '/construction-solutions',
  '/business-builder',
  '/app-builder',
  '/game-builder',
  '/creatoros',
  '/autoflow',
];

function shouldHideCopilotChrome(pathname: string): boolean {
  return HIDDEN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export default function CopilotChrome() {
  const pathname = usePathname();

  if (shouldHideCopilotChrome(pathname)) {
    return null;
  }

  return (
    <>
      <GlobalAiAssistant />
      <AskCopilotFullWidth />
    </>
  );
}