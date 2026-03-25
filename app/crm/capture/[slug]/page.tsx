import DynamicLeadCaptureForm from '@/components/crm/DynamicLeadCaptureForm';
import { notFound } from 'next/navigation';
import { LeadCaptureService } from '@/src/crm/modules/capture';

const captureService = new LeadCaptureService();

export default async function CaptureFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const form = await captureService.getActiveCaptureFormBySlug(slug);

  if (!form) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <DynamicLeadCaptureForm
        form={{
          id: form.id,
          name: form.name,
          slug: form.slug,
          schemaJson: form.schemaJson,
        }}
      />
    </main>
  );
}
