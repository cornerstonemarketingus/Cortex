import TemplatesPanel from '@/components/templates/TemplatesPanel';

export const metadata = {
  title: 'Templates',
};

export default function TemplatesPage() {
  return (
    <main className="min-h-[60vh] py-8">
      <TemplatesPanel />
    </main>
  );
}
