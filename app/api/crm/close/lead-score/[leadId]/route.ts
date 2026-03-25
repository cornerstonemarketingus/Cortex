import { requireCrmAuth } from '@/src/crm/core/auth';
import { jsonResponse, withApiHandler } from '@/src/crm/core/http';
import { LeadScoringService } from '@/src/crm/modules/close';

const scoringService = new LeadScoringService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);
    const { leadId } = await params;

    const score = await scoringService.calculateLeadScore(leadId);
    return jsonResponse({ leadId, score, updated: false });
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);
    const { leadId } = await params;

    const score = await scoringService.updateLeadScore(leadId);
    return jsonResponse({ leadId, score, updated: true });
  });
}
