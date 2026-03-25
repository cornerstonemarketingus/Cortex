import { requireCrmAuth } from '@/src/crm/core/auth';
import { withApiHandler } from '@/src/crm/core/http';
import { CloseService } from '@/src/crm/modules/close';

const closeService = new CloseService();

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(async () => {
    await requireCrmAuth(request);
    const { id } = await params;

    const pdf = await closeService.generateProposalPdf(id);
    const body = new Uint8Array(pdf);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="proposal-${id}.pdf"`,
      },
    });
  });
}
