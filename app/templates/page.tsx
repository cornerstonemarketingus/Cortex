import TemplatesPanel from '@/components/templates/TemplatesPanel';
import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';

export const metadata = {
  title: 'Templates',
};

export default function TemplatesPage() {
  return (
    <main className="min-h-screen bg-[#070b10] text-slate-100">
      <PublicMarketingNav />
      <div className="py-8">
        <TemplatesPanel />
      </div>
    </main>
  );
}
