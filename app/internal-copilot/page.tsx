import { redirect } from 'next/navigation';

// Internal copilot has been moved to /admin/portal (admin-only)
export default function InternalCopilotRedirectPage() {
  redirect('/admin/login');
}
