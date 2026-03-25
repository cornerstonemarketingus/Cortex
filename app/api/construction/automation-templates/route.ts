import { NextRequest } from 'next/server';
import { ApiError, readJson } from '@/src/crm/core/api';
import { jsonResponse, parseRecord, withApiHandler } from '@/src/crm/core/http';
import {
  getAutomationTemplates,
  saveAutomationTemplates,
  type AutomationTemplateMap,
} from '@/src/construction/automation-templates.service';
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from '@/lib/adminAuth';

type TemplateUpdateBody = {
  templates?: unknown;
};

export async function GET() {
  return withApiHandler(async () => {
    const templates = await getAutomationTemplates();
    return jsonResponse({ templates });
  });
}

export async function POST(request: NextRequest) {
  return withApiHandler(async () => {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!isValidAdminSessionToken(token)) {
      throw new ApiError(401, 'Admin authentication required to update templates.', 'ADMIN_AUTH_REQUIRED');
    }

    const body = await readJson<TemplateUpdateBody>(request);
    const templatesRaw = parseRecord(body.templates);

    const updates: Partial<AutomationTemplateMap> = {};
    const keys: Array<keyof AutomationTemplateMap> = [
      'instantLeadReply',
      'missedCallTextBack',
      'stageFollowup',
      'reviewRequest',
      'reengagement',
    ];

    for (const key of keys) {
      const value = templatesRaw[key];
      if (typeof value === 'string') {
        updates[key] = value;
      }
    }

    const templates = await saveAutomationTemplates(updates);
    return jsonResponse({ templates });
  });
}
