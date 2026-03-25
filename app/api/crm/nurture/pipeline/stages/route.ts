import { PipelineStageType } from '@/generated/crm-client';
import { requireCrmAuth } from '@/src/crm/core/auth';
import { jsonResponse, withApiHandler } from '@/src/crm/core/http';

const stagePlaybook: Array<{ id: PipelineStageType; label: string; objective: string }> = [
  { id: PipelineStageType.NEW, label: 'New', objective: 'Capture lead and send first response.' },
  { id: PipelineStageType.CONTACTED, label: 'Contacted', objective: 'Confirm scope and timeline.' },
  { id: PipelineStageType.QUALIFIED, label: 'Qualified', objective: 'Verify budget and decision authority.' },
  { id: PipelineStageType.APPOINTMENT_SET, label: 'Appointment Set', objective: 'Complete discovery and measurement.' },
  { id: PipelineStageType.PROPOSAL_SENT, label: 'Proposal Sent', objective: 'Deliver estimate/proposal and follow-up sequence.' },
  { id: PipelineStageType.NEGOTIATION, label: 'Negotiation', objective: 'Resolve objections and finalize pricing.' },
  { id: PipelineStageType.WON, label: 'Won', objective: 'Collect payment and launch onboarding.' },
  { id: PipelineStageType.LOST, label: 'Lost', objective: 'Tag reason and schedule re-engagement.' },
];

export async function GET(request: Request) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);
    return jsonResponse({ stages: stagePlaybook, count: stagePlaybook.length });
  });
}
