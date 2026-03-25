import { jsonResponse, parseOptionalString, withApiHandler } from '@/src/crm/core/http';
import { LeadCaptureService } from '@/src/crm/modules/capture';

const captureService = new LeadCaptureService();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  return withApiHandler(async () => {
    const { slug } = await params;
    const normalizedSlug = parseOptionalString(slug);

    if (!normalizedSlug) {
      return jsonResponse({ error: 'slug is required' }, 400);
    }

    const form = await captureService.getActiveCaptureFormBySlug(normalizedSlug);
    if (!form) {
      return jsonResponse({ error: 'Capture form not found' }, 404);
    }

    return jsonResponse({ form });
  });
}
