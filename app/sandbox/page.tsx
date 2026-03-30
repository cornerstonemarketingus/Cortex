import SandboxTwoPanel from '@/components/sandbox/SandboxTwoPanel';

export const metadata = {
  title: 'Sandbox',
};

export default function SandboxPage() {
  return (
    <main className="min-h-[60vh] py-8">
      <SandboxTwoPanel />
    </main>
  );
}
