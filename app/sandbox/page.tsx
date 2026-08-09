import SandboxTwoPanel from '@/components/sandbox/SandboxTwoPanel';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

export const metadata = {
  title: 'Sandbox',
};

export default function SandboxPage() {
  return (
    <main className="min-h-screen bg-[#070b10] text-slate-100">
      <PublicMarketingNav />
      <div className="py-8">
        <SandboxTwoPanel />
      </div>
    </main>
  );
}
