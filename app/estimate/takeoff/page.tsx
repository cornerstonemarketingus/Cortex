import Link from 'next/link';
import PageShell from '@/components/ui/PageShell';
import PageHero from '@/components/ui/PageHero';
import PlanTakeoffUploader from '@/components/estimator/PlanTakeoffUploader';

export const metadata = {
  title: 'AI Plan Takeoff | TeamBuilderCopilot',
  description: 'Upload floor plans, blueprints, or job-site photos and get a full AI takeoff estimate with quantities and line items.',
};

export default function PlanTakeoffPage() {
  return (
    <PageShell>
      <PageHero
        kicker="AI Plan Takeoff"
        title="Upload plans. Get a full takeoff in seconds."
        subtitle={
          <>
            Drop in floor plans, blueprints, sketches, or job-site photos and AI reads the drawing to build a complete
            quantity takeoff — materials, labor, and line-item costs — the way you&rsquo;d mark one up in Bluebeam, minus the manual tracing.{' '}
            <Link href="/estimate" className="text-[#C69C6D] underline underline-offset-2">
              Prefer to describe the job instead? Use the chat estimator →
            </Link>
          </>
        }
      />
      <PlanTakeoffUploader />
    </PageShell>
  );
}
