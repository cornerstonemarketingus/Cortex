"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  if (target.isContentEditable) return true;
  if (target.closest('[contenteditable="true"]')) return true;

  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

function shouldProtectPath(pathname: string): boolean {
  // Keep admin and builder work areas unblocked for operator workflows.
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/devboard') ||
    pathname.startsWith('/builder') ||
    pathname.startsWith('/chat')
  ) {
    return false;
  }

  return true;
}

export default function ContentProtectionShield() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_CONTENT_SHIELD === 'false') {
      return;
    }

    if (!shouldProtectPath(pathname)) {
      return;
    }

    const onContextMenu = (event: MouseEvent) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };

    const onCopy = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };

    const onCut = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };

    const onSelectStart = (event: Event) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };

    const onDragStart = (event: DragEvent) => {
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isMetaCombo = (event.ctrlKey || event.metaKey) && ['c', 'x', 'u', 's', 'p'].includes(key);
      if (!isMetaCombo) return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('selectstart', onSelectStart);
    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('selectstart', onSelectStart);
      document.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [pathname]);

  return null;
}
